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
        if not user_check.data:
            client.table("users").insert({"id": user_id, "name": "Authentic User"}).execute()

        # Use maybe_single to avoid errors if cart doesn't exist yet
        cart_res = client.table("carts").select("id").eq("user_id", user_id).maybe_single().execute()
        
        if cart_res and cart_res.data:
            # Join with products table to get title, price, image_url
            items = client.table("cart_items").select("*, products(title, price, image_url)").eq("cart_id", cart_res.data["id"]).execute()
            return items.data or []
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
        if not user_check or not user_check.data:
            client.table("users").insert({"id": user_id, "name": "Authentic User"}).execute()

        # 2. Get or Create UNIQUE Cart
        # We use a try-except or check to handle the unique constraint
        cart_res = client.table("carts").select("id").eq("user_id", user_id).maybe_single().execute()
        
        if not cart_res or not cart_res.data:
            print("DEBUG: Initializing new unique cart")
            # Try to insert; if it fails due to unique constraint, we just fetch it again
            try:
                new_cart = client.table("carts").insert({"user_id": user_id}).execute()
                if new_cart and new_cart.data:
                    cart_id = new_cart.data[0]["id"]
                else:
                    # Fallback fetch in case of race condition
                    cart_res = client.table("carts").select("id").eq("user_id", user_id).single().execute()
                    cart_id = cart_res.data["id"]
            except:
                cart_res = client.table("carts").select("id").eq("user_id", user_id).single().execute()
                cart_id = cart_res.data["id"]
        else:
            cart_id = cart_res.data["id"]
        
        # 3. Upsert item in cart
        existing = client.table("cart_items").select("id, quantity").eq("cart_id", cart_id).eq("product_id", item.product_id).maybe_single().execute()
        
        if existing and existing.data:
            new_qty = existing.data["quantity"] + item.quantity
            client.table("cart_items").update({"quantity": new_qty}).eq("id", existing.data["id"]).execute()
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
