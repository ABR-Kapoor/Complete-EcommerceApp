from fastapi import APIRouter, HTTPException, Body
from app.db import get_supabase_admin
from typing import Dict, Any
import os

router = APIRouter(tags=["orders"])

@router.post("/api/orders/create")
def create_order(data: dict = Body(...)):
    """Robust order creation with stock management and user syncing"""
    try:
        client = get_supabase_admin()
        uid = data.get("user_id")
        if not uid: raise HTTPException(status_code=400, detail="Missing user_id")
        
        email = data.get("email", "unknown@email.com")
        
        # 1. Sync User Profile (Safety)
        try:
            name = data.get("name") or email.split("@")[0]
            user_payload = {
                "id": uid,
                "email": email,
                "name": name
            }
            # Only include phone if it's provided in the order data
            if data.get("phone"):
                user_payload["phone"] = data.get("phone")
                
            client.table("users").upsert(user_payload, on_conflict="id").execute()
        except Exception as ue:
            print(f"User upsert failed (non-critical): {ue}")
            
        # 2. Save Address (Robustly)
        address = data.get("address")
        if address:
            try:
                # Filter for columns that actually exist in 'addresses'
                addr_payload = { "user_id": uid }
                for key in ["street", "city", "state", "zip_code"]:
                    if address.get(key):
                        addr_payload[key] = str(address.get(key))
                
                # Check for existing address
                res_addr = client.table("addresses").select("user_id").eq("user_id", uid).maybe_single().execute()
                if res_addr and hasattr(res_addr, "data") and res_addr.data:
                    client.table("addresses").update(addr_payload).eq("user_id", uid).execute()
                else:
                    client.table("addresses").insert(addr_payload).execute()
            except Exception as ae:
                print(f"Address save failed: {ae}")
        
        # 3. Create Main Order Record
        status = data.get("status")
        if not status:
            status = "confirmed" if data.get("payment_method") == "COD" else "pending_payment"

        # verified columns: ['id', 'user_id', 'total_price', 'payment_method', 'status']
        order_payload = {
            "user_id": uid,
            "total_price": data.get("total_price", 0),
            "payment_method": data.get("payment_method", "COD"),
            "status": status
        }
        order_res = client.table("orders").insert(order_payload).execute()
        if not order_res.data:
            raise Exception("Failed to insert order record")
        
        oid = order_res.data[0]["id"]
        
        # 4. Create Order Items & Decrement Stock
        items = data.get("items", [])
        formatted_items = []
        for i in items:
            pid = i.get("product_id")
            qty = i.get("quantity", 1)
            price = i.get("price", 0)
            
            formatted_items.append({
                "order_id": oid,
                "product_id": pid,
                "quantity": qty,
                "price": price
            })
            
            # Stock management
            try:
                prod_row = client.table("products").select("stock").eq("id", pid).maybe_single().execute()
                if prod_row.data:
                    curr_stock = int(prod_row.data.get("stock") or 0)
                    new_stock = max(0, curr_stock - qty)
                    client.table("products").update({"stock": new_stock}).eq("id", pid).execute()
            except Exception as se:
                print(f"Stock sync failed for product {pid}: {se}")

        client.table("order_items").insert(formatted_items).execute()

        # 5. Create Payment Record (Normalization)
        if data.get("payment_method") == "Razorpay":
            try:
                payment_payload = {
                    "order_id": oid,
                    "amount": data.get("total_price", 0),
                    "status": "completed",
                    "razorpay_id": data.get("razorpay_payment_id", "N/A") # You should pass this from frontend
                }
                client.table("payments").insert(payment_payload).execute()
            except Exception as pe:
                print(f"Payment record creation failed: {pe}")

        return {"status": "ok", "order_id": oid}
        
    except Exception as e:
        print(f"Order Placement Failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/api/orders/user/{user_id}")
def get_user_orders(user_id: str, email: str = None):
    """Personalised order tracking for a specific user"""
    try:
        client = get_supabase_admin()
        # Fetch orders sorted by newest first
        res = client.table("orders").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        orders_data = res.data or []
        
        for order in orders_data:
            # Join items and products safely
            items_res = client.table("order_items").select("*, products(title, image_url)").eq("order_id", order["id"]).execute()
            order["order_items"] = items_res.data if items_res and hasattr(items_res, "data") else []
            
            # Get address safely
            addr_res = client.table("addresses").select("*").eq("user_id", user_id).maybe_single().execute()
            order["address"] = addr_res.data if addr_res and hasattr(addr_res, "data") else None
            
        return orders_data
    except Exception as e:
        print(f"Fetch Orders Error: {e}")
        return []

@router.put("/api/orders/{order_id}/cancel")
def cancel_user_order(order_id: int):
    try:
        client = get_supabase_admin()
        order = client.table("orders").select("status").eq("id", order_id).maybe_single().execute()
        if not order.data: raise HTTPException(status_code=404, detail="Order not found")
        
        if order.data["status"] not in ["pending_payment", "confirmed", "processing"]:
            raise HTTPException(status_code=400, detail=f"Cannot cancel in {order.data['status']} state")
            
        client.table("orders").update({"status": "cancelled"}).eq("id", order_id).execute()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/api/orders/repair")
def repair_orders(data: dict = Body(...)):
    """Recovery route to link orders using users table as a bridge"""
    uid = data.get("user_id")
    email = data.get("email")
    if not uid or not email:
        raise HTTPException(status_code=400, detail="Missing user_id or email")
    
    try:
        client = get_supabase_admin()
        print(f"DEBUG: Repairing orders for {email} -> {uid}")
        
        # 1. Find all user IDs in 'users' table that have this email
        user_ids_res = client.table("users").select("id").eq("email", email).execute()
        potential_ids = [u["id"] for u in (user_ids_res.data or [])]
        
        if not potential_ids:
            print(f"DEBUG: No users found with email {email}")
            return {"status": "ok", "count": 0}
            
        print(f"DEBUG: Potential IDs to fix: {potential_ids}")
        
        # 2. Update orders that match these IDs OR match the email directly (if column exists)
        fixed_count = 0
        try:
            # Try updating by ID bridge
            res = client.table("orders").update({"user_id": uid}).in_("user_id", potential_ids).neq("user_id", uid).execute()
            fixed_count += len(res.data or [])
        except Exception as e1:
            print(f"DEBUG: Repair step 1 failed: {e1}")
            
        try:
            # Try updating by email directly
            res2 = client.table("orders").update({"user_id": uid}).eq("email", email).neq("user_id", uid).execute()
            fixed_count += len(res2.data or [])
        except Exception as e2:
            print(f"DEBUG: Repair step 2 failed (email column missing?): {e2}")
            
        return {"status": "ok", "count": fixed_count}
    except Exception as e:
        print(f"Repair Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
