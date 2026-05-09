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
    try:
        client = get_supabase_admin()
        
        # 1. Ensure user exists (Handshake)
        user_check = client.table("users").select("id").eq("id", user_id).maybe_single().execute()
        if not user_check or not user_check.data:
            client.table("users").insert({"id": user_id, "name": "Authentic User"}).execute()

        # 2. Add to Wishlist
        existing = client.table("wishlists").select("*").eq("user_id", user_id).eq("product_id", product_id).execute()
        if not existing.data:
            client.table("wishlists").insert({"user_id": user_id, "product_id": product_id}).execute()
        return {"status": "ok"}
    except Exception as e:
        return {"error": str(e)}

@router.delete("/{user_id}/{product_id}")
def remove_from_wishlist(user_id: str, product_id: int):
    try:
        client = get_supabase_admin()
        client.table("wishlists").delete().eq("user_id", user_id).eq("product_id", product_id).execute()
        return {"status": "ok"}
    except Exception as e:
        return {"error": str(e)}
