from fastapi import APIRouter
from app.db import get_supabase_admin
from app.models import CartItem
from typing import List

router = APIRouter(prefix="/api/cart", tags=["cart"])

@router.get("/{user_id}")
def get_cart(user_id: str):
    try:
        client = get_supabase_admin()
        
        # Ensure user exists (Handshake)
        user_check = client.table("users").select("id").eq("id", user_id).maybe_single().execute()
        if not user_check or not getattr(user_check, "data", None):
            try:
                client.table("users").insert({"id": user_id, "name": "Authentic User"}).execute()
            except Exception as ue:
                print(f"User handshake notice: {ue}")

        # Use maybe_single to avoid errors if cart doesn't exist yet
        cart_res = client.table("carts").select("id").eq("user_id", user_id).maybe_single().execute()
        cart_data = getattr(cart_res, "data", None) if cart_res else None
        
        if cart_data:
            # Join with products table to get title, price, image_url
            items = client.table("cart_items").select("*, products(title, price, image_url)").eq("cart_id", cart_data["id"]).execute()
            return (items.data if items and hasattr(items, "data") else []) or []
        return []
    except Exception as e:
        print(f"ERROR in get_cart: {str(e)}")
        return []

@router.post("/{user_id}/add")
def add_to_cart(user_id: str, item: CartItem):
    try:
        client = get_supabase_admin()
        print(f"DEBUG: Atomic add to cart for user {user_id}, product {item.product_id}")
        
        # 1. Ensure user exists in DB (Handshake)
        user_check = client.table("users").select("id").eq("id", user_id).maybe_single().execute()
        if not user_check or not getattr(user_check, "data", None):
            try:
                client.table("users").insert({"id": user_id, "name": "Authentic User"}).execute()
            except Exception as ue:
                print(f"User handshake notice: {ue}")

        # 2. Get or Create UNIQUE Cart
        cart_res = client.table("carts").select("id").eq("user_id", user_id).maybe_single().execute()
        cart_data = getattr(cart_res, "data", None) if cart_res else None
        
        if not cart_data:
            print("DEBUG: Initializing new unique cart")
            try:
                new_cart = client.table("carts").insert({"user_id": user_id}).execute()
                if new_cart and getattr(new_cart, "data", None):
                    cart_id = new_cart.data[0]["id"]
                else:
                    c_fetch = client.table("carts").select("id").eq("user_id", user_id).execute()
                    cart_id = c_fetch.data[0]["id"]
            except Exception:
                c_fetch = client.table("carts").select("id").eq("user_id", user_id).execute()
                cart_id = c_fetch.data[0]["id"]
        else:
            cart_id = cart_data["id"]
        
        # 3. Upsert item in cart
        existing = client.table("cart_items").select("id, quantity").eq("cart_id", cart_id).eq("product_id", item.product_id).maybe_single().execute()
        existing_data = getattr(existing, "data", None) if existing else None
        
        if existing_data:
            new_qty = existing_data["quantity"] + item.quantity
            client.table("cart_items").update({"quantity": new_qty}).eq("id", existing_data["id"]).execute()
        else:
            client.table("cart_items").insert({
                "cart_id": cart_id,
                "product_id": item.product_id,
                "quantity": item.quantity
            }).execute()
        
        return {"status": "ok", "cart_id": cart_id}
    except Exception as e:
        print(f"CRITICAL ERROR in add_to_cart: {str(e)}")
        return {"error": str(e)}

@router.put("/{user_id}/update/{cart_item_id}")
def update_cart_item(user_id: str, cart_item_id: int, quantity: int):
    try:
        client = get_supabase_admin()
        if quantity > 0:
            client.table("cart_items").update({"quantity": quantity}).eq("id", cart_item_id).execute()
        else:
            client.table("cart_items").delete().eq("id", cart_item_id).execute()
        return {"status": "ok"}
    except Exception as e:
        return {"error": str(e)}

@router.delete("/{user_id}/remove/{cart_item_id}")
def remove_from_cart(user_id: str, cart_item_id: int):
    try:
        client = get_supabase_admin()
        client.table("cart_items").delete().eq("id", cart_item_id).execute()
        return {"status": "ok"}
    except Exception as e:
        return {"error": str(e)}

@router.delete("/{user_id}/clear")
def clear_user_cart(user_id: str):
    try:
        client = get_supabase_admin()
        cart_res = client.table("carts").select("id").eq("user_id", user_id).maybe_single().execute()
        cart_data = getattr(cart_res, "data", None) if cart_res else None
        if cart_data:
            client.table("cart_items").delete().eq("cart_id", cart_data["id"]).execute()
        return {"status": "ok"}
    except Exception as e:
        print(f"Error clearing user cart: {e}")
        return {"error": str(e)}

