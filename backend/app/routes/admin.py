from fastapi import APIRouter, HTTPException, UploadFile, File, Body
from app.db import get_supabase_admin
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import time
import os
import requests

router = APIRouter(tags=["admin"])

class Product(BaseModel):
    title: str
    description: str
    price: float
    category: str
    image_url: str
    is_sale: bool
    sold: bool
    stock: int = 10

@router.get("/api/admin/orders")
def get_all_orders():
    try:
      client = get_supabase_admin()
      # Join with users to get names/emails
      try:
        data = client.table("orders").select("*, users(name, email, phone)").order("created_at", desc=True).execute()
        print(f"DEBUG: All orders fetched: {len(data.data or [])} records")
        if data.data:
          print(f"DEBUG: Sample Order User ID: {data.data[0].get('user_id')}")
      except Exception as e:
        print(f"DEBUG: Orders table join failed, trying simple select: {e}")
        data = client.table("orders").select("*").order("created_at", desc=True).execute()
      return data.data or []
    except Exception as e:
        print(f"Orders Error: {e}")
        return []

@router.get("/api/admin/orders/{order_id}")
def get_order_detail(order_id: int):
    try:
        client = get_supabase_admin()
        order_res = client.table("orders").select("*, users(name, email, phone)").eq("id", order_id).maybe_single().execute()
        if not order_res.data:
            raise HTTPException(status_code=404, detail="Order not found")
        
        items = client.table("order_items").select("*, products(title, image_url)").eq("order_id", order_id).execute()
        
        # Get address
        uid = order_res.data.get("user_id")
        addr_res = client.table("addresses").select("*").eq("user_id", uid).maybe_single().execute()
        
        return {
            "order": order_res.data,
            "items": items.data or [],
            "address": addr_res.data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/api/admin/orders/{order_id}/status")
def update_order_status(order_id: int, status: str):
    try:
        client = get_supabase_admin()
        res = client.table("orders").update({"status": status}).eq("id", order_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Order not found")
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/api/admin/users")
def get_all_users():
    try:
        client = get_supabase_admin()
        # Fetch users with their primary addresses
        data = client.table("users").select("*, addresses(*)").order("created_at", desc=True).execute()
        return data.data or []
    except Exception as e:
        print(f"Users Fetch Error: {e}")
        return []

@router.get("/api/admin/stats")
def get_admin_stats():
    """Calculates real-time business metrics for the dashboard"""
    try:
        client = get_supabase_admin()
        
        # 1. Total Revenue (Confirmed/Delivered orders)
        revenue_res = client.table("orders").select("total_price").neq("status", "cancelled").execute()
        total_revenue = sum(o.get("total_price", 0) for o in (revenue_res.data or []))
        
        # 2. Total Orders
        orders_res = client.table("orders").select("id", count="exact").execute()
        total_orders = orders_res.count if hasattr(orders_res, 'count') else len(orders_res.data or [])
        
        # 3. Pending Orders
        pending_res = client.table("orders").select("id").in_("status", ["pending_payment", "confirmed", "processing"]).execute()
        pending_orders = len(pending_res.data or [])
        
        # 4. Total Products
        prod_res = client.table("products").select("id").execute()
        total_products = len(prod_res.data or [])
        
        # 5. Total Customers (Unique Users)
        user_res = client.table("users").select("id").execute()
        total_users = len(user_res.data or [])
        
        return {
            "total_revenue": total_revenue,
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "total_products": total_products,
            "total_users": total_users
        }
    except Exception as e:
        print(f"Stats Error: {e}")
        return {
            "total_revenue": 0,
            "total_orders": 0,
            "pending_orders": 0,
            "total_products": 0,
            "total_users": 0
        }

@router.post("/api/admin/upload/product-image/{product_id}")
def upload_image(product_id: int, file: UploadFile = File(...)):
    try:
        client = get_supabase_admin()
        content = file.file.read()
        path = f"products/{product_id}/{file.filename}"
        try:
            client.storage.from_("ecommerce").upload(path, content, {"content-type": file.content_type})
        except:
            client.storage.from_("ecommerce").update(path, content, {"content-type": file.content_type})
        url_res = client.storage.from_("ecommerce").get_public_url(path)
        public_url = url_res.public_url if hasattr(url_res, 'public_url') else (url_res if isinstance(url_res, str) else url_res.get("publicUrl", ""))
        client.table("products").update({"image_url": public_url}).eq("id", product_id).execute()
        return {"url": public_url}
    except Exception as e:
        print(f"Upload Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/admin/upload/temp")
def upload_temp_image(file: UploadFile = File(...)):
    try:
        client = get_supabase_admin()
        content = file.file.read()
        path = f"temp/{int(time.time())}_{file.filename}"
        client.storage.from_("ecommerce").upload(path, content, {"content-type": file.content_type})
        url_res = client.storage.from_("ecommerce").get_public_url(path)
        public_url = url_res.public_url if hasattr(url_res, 'public_url') else (url_res if isinstance(url_res, str) else url_res.get("publicUrl", ""))
        return {"url": public_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/api/admin/products/{id}/stock")
def update_stock(id: int, data: Dict[str, int] = Body(...)):
    client = get_supabase_admin()
    stock = data.get("stock", 0)
    client.table("products").update({"stock": stock}).eq("id", id).execute()
    return {"status": "ok"}

@router.post("/api/admin/products")
def create_product(product: Product):
    client = get_supabase_admin()
    res = client.table("products").insert(product.model_dump()).execute()
    return res.data[0]

@router.put("/api/admin/products/{id}")
def update_product(id: int, product: Product):
    client = get_supabase_admin()
    res = client.table("products").update(product.model_dump()).eq("id", id).execute()
    return res.data[0]

@router.delete("/api/admin/products/{id}")
def delete_product(id: int):
    client = get_supabase_admin()
    client.table("products").delete().eq("id", id).execute()
    return {"status": "ok"}

@router.post("/api/admin/sync-clerk-users")
def sync_clerk_users():
    """Bulk import all users from Clerk to Supabase"""
    secret_key = os.getenv("CLERK_SECRET_KEY")
    if not secret_key:
        raise HTTPException(status_code=500, detail="CLERK_SECRET_KEY not set in environment")
    
    try:
        headers = {"Authorization": f"Bearer {secret_key}"}
        # Clerk allows up to 500 users per request (pagination ignored for now for simplicity)
        res = requests.get("https://api.clerk.com/v1/users?limit=500", headers=headers)
        res.raise_for_status()
        clerk_users = res.json()
        
        client = get_supabase_admin()
        synced = 0
        
        for u in clerk_users:
            uid = u.get("id")
            email = u.get("email_addresses")[0].get("email_address") if u.get("email_addresses") else "unknown@email.com"
            name = f"{u.get('first_name') or ''} {u.get('last_name') or ''}".strip() or email.split("@")[0]
            avatar = u.get("image_url")
            
            payload = {
                "id": uid,
                "email": email,
                "name": name,
                "avatar_url": avatar
            }
            
            # Check if user exists to avoid overwriting roles (like admin)
            existing = client.table("users").select("role").eq("id", uid).maybe_single().execute()
            if not existing.data:
                payload["role"] = "user"
            
            client.table("users").upsert(payload, on_conflict="id").execute()
            synced += 1
            
        return {"status": "ok", "synced": synced}
    except Exception as e:
        print(f"BULK SYNC ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))
