from fastapi import APIRouter
from app.db import get_supabase_client
from app.models import CartItem
from typing import List

router = APIRouter(prefix="/api/cart", tags=["cart"])

@router.get("/{user_id}")
def get_cart(user_id: str):
    client = get_supabase_client()
    data = client.table("carts").select("*").eq("user_id", user_id).single().execute()
    if data.data:
        items = client.table("cart_items").select("*").eq("cart_id", data.data["id"]).execute()
        return items.data or []
    return []

@router.post("/{user_id}/add")
def add_to_cart(user_id: str, item: CartItem):
    client = get_supabase_client()
    cart = client.table("carts").select("id").eq("user_id", user_id).single().execute()
    
    if not cart.data:
        cart_res = client.table("carts").insert({"user_id": user_id}).execute()
        cart_id = cart_res.data[0]["id"]
    else:
        cart_id = cart.data["id"]
    
    existing = client.table("cart_items").select("*").eq("cart_id", cart_id).eq("product_id", item.product_id).execute()
    if existing.data:
        client.table("cart_items").update({"quantity": existing.data[0]["quantity"] + item.quantity}).eq("id", existing.data[0]["id"]).execute()
    else:
        client.table("cart_items").insert({"cart_id": cart_id, "product_id": item.product_id, "quantity": item.quantity}).execute()
    
    return {"status": "ok"}

@router.put("/{user_id}/update/{cart_item_id}")
def update_cart_item(user_id: str, cart_item_id: int, quantity: int):
    client = get_supabase_client()
    if quantity > 0:
        client.table("cart_items").update({"quantity": quantity}).eq("id", cart_item_id).execute()
    else:
        client.table("cart_items").delete().eq("id", cart_item_id).execute()
    return {"status": "ok"}

@router.delete("/{user_id}/remove/{cart_item_id}")
def remove_from_cart(user_id: str, cart_item_id: int):
    client = get_supabase_client()
    client.table("cart_items").delete().eq("id", cart_item_id).execute()
    return {"status": "ok"}
