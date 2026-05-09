from fastapi import APIRouter
from app.db import get_supabase_admin

router = APIRouter(prefix="/api/wishlist", tags=["wishlist"])

@router.get("/{user_id}")
def get_wishlist(user_id: str):
    client = get_supabase_admin()
    data = client.table("wishlists").select("product_id").eq("user_id", user_id).execute()
    return [item["product_id"] for item in data.data or []]

@router.post("/{user_id}/{product_id}")
def add_to_wishlist(user_id: str, product_id: int):
    client = get_supabase_client()
    existing = client.table("wishlists").select("*").eq("user_id", user_id).eq("product_id", product_id).execute()
    if not existing.data:
        client.table("wishlists").insert({"user_id": user_id, "product_id": product_id}).execute()
    return {"status": "ok"}

@router.delete("/{user_id}/{product_id}")
def remove_from_wishlist(user_id: str, product_id: int):
    client = get_supabase_client()
    client.table("wishlists").delete().eq("user_id", user_id).eq("product_id", product_id).execute()
    return {"status": "ok"}
