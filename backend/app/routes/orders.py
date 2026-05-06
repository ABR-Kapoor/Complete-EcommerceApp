from fastapi import APIRouter
from app.db import get_supabase_client
from app.models import Order, Address

router = APIRouter(prefix="/api/orders", tags=["orders"])

@router.post("/")
def create_order(user_id: str, order: Order, address: Address):
    client = get_supabase_client()
    
    order_data = {
        "user_id": user_id,
        "total_price": order.total_price,
        "payment_method": order.payment_method,
        "status": order.status,
    }
    
    order_res = client.table("orders").insert(order_data).execute()
    order_id = order_res.data[0]["id"]
    
    address_data = {
        "user_id": user_id,
        "street": address.street,
        "city": address.city,
        "state": address.state,
        "zip_code": address.zip_code,
        "phone": address.phone,
    }
    client.table("addresses").upsert(address_data).execute()
    
    return {"order_id": order_id, "status": "created"}

@router.get("/{user_id}")
def get_user_orders(user_id: str):
    client = get_supabase_client()
    data = client.table("orders").select("*").eq("user_id", user_id).order_by("created_at", desc=True).execute()
    return data.data or []

@router.get("/detail/{order_id}")
def get_order(order_id: int):
    client = get_supabase_client()
    order = client.table("orders").select("*").eq("id", order_id).single().execute()
    items = client.table("order_items").select("*").eq("order_id", order_id).execute()
    return {"order": order.data, "items": items.data or []}

@router.put("/{order_id}/cancel")
def cancel_order(order_id: int):
    client = get_supabase_client()
    order = client.table("orders").select("status").eq("id", order_id).single().execute()
    
    if order.data["status"] in ["pending_payment", "confirmed", "processing"]:
        client.table("orders").update({"status": "cancelled"}).eq("id", order_id).execute()
        return {"status": "cancelled"}
    
    return {"error": "Cannot cancel shipped or delivered orders"}

@router.put("/{order_id}/status")
def update_order_status(order_id: int, status: str):
    client = get_supabase_client()
    client.table("orders").update({"status": status}).eq("id", order_id).execute()
    return {"status": "updated"}
