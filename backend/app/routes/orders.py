from fastapi import APIRouter, HTTPException, Body
from app.db import get_supabase_admin
from typing import Dict, Any
import traceback
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
        
        # 1. Sync User Profile
        try:
            name = data.get("name") or email.split("@")[0]
            client.table("users").upsert({
                "id": uid,
                "email": email,
                "name": name,
                "role": "admin" if email == os.getenv("ADMIN_EMAIL") else "user",
                "phone": data.get("phone")
            }, on_conflict="id").execute()
        except Exception as ue:
            print(f"User upsert failed (non-critical): {ue}")
            
        # 2. Save Address
        address = data.get("address")
        if address:
            try:
                addr_data = {**address, "user_id": uid}
                client.table("addresses").upsert(addr_data, on_conflict="user_id").execute()
            except Exception as ae:
                print(f"Address save failed (non-critical): {ae}")
        
        # 3. Create Main Order Record
        order_payload = {
            "user_id": uid,
            "total_price": data.get("total_price", 0),
            "payment_method": data.get("payment_method", "COD"),
            "status": "confirmed" if data.get("payment_method") == "COD" else "pending_payment"
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
        return {"status": "ok", "order_id": oid}
        
    except Exception as e:
        print(f"ORDER CRITICAL FAIL: {traceback.format_exc()}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/api/orders/user/{user_id}")
def get_user_orders(user_id: str):
    """Personalised order tracking for a specific user"""
    try:
        client = get_supabase_admin()
        # Fetch orders for this specific user ONLY
        res = client.table("orders").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        orders_data = res.data or []
        
        for order in orders_data:
            # Join items and products
            items_res = client.table("order_items").select("*, products(title, image_url)").eq("order_id", order["id"]).execute()
            order["order_items"] = items_res.data or []
            
            # Get address
            addr_res = client.table("addresses").select("*").eq("user_id", user_id).maybe_single().execute()
            order["address"] = addr_res.data
            
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
