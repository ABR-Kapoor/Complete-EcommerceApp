from fastapi import APIRouter
from app.db import get_supabase_admin
from app.models import Review

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

@router.post("/")
def create_review(user_id: str, review: Review):
    try:
        client = get_supabase_admin()
        
        # 1. Ensure user exists
        user_check = client.table("users").select("id").eq("id", user_id).maybe_single().execute()
        if not user_check.data:
            client.table("users").insert({"id": user_id, "name": "Verified User"}).execute()

        # 2. Logic: Link to Order if Purchase exists
        # Check order_items for this user/product
        order_id = None
        purchase_check = client.table("orders").select("id").eq("user_id", user_id).execute()
        if purchase_check.data:
            order_ids = [o["id"] for o in purchase_check.data]
            item_check = client.table("order_items").select("order_id").in_("order_id", order_ids).eq("product_id", review.product_id).limit(1).execute()
            if item_check.data:
                order_id = item_check.data[0]["order_id"]

        # Always Create New Independent Review
        data = {
            "product_id": review.product_id,
            "user_id": user_id,
            "rating": review.rating,
            "text": review.text,
            "order_id": order_id
        }

        print(f"DEBUG: Inserting independent review for user {user_id}")
        client.table("reviews").insert(data).execute()
        return {"status": "created"}

        print(f"DEBUG: Inserting unique review for user {user_id}")
        client.table("reviews").insert(data).execute()
        return {"status": "created"}

    except Exception as e:
        print(f"CRITICAL ERROR in create_review: {str(e)}")
        return {"error": str(e)}

@router.get("/product/{product_id}")
def get_product_reviews(product_id: int):
    try:
        client = get_supabase_admin()
        data = client.table("reviews").select("*, users(name, avatar_url)").eq("product_id", product_id).execute()
        return data.data or []
    except: return []

@router.get("/order/{order_id}")
def get_order_reviews(order_id: int):
    client = get_supabase_admin()
    data = client.table("reviews").select("*").eq("order_id", order_id).execute()
    return data.data or []

@router.delete("/{review_id}")
def delete_review(review_id: int):
    try:
        client = get_supabase_admin()
        client.table("reviews").delete().eq("id", review_id).execute()
        return {"status": "deleted"}
    except Exception as e:
        return {"error": str(e)}

@router.put("/{review_id}")
def update_review(review_id: int, review: Review):
    try:
        client = get_supabase_admin()
        data = {
            "rating": review.rating,
            "text": review.text
        }
        client.table("reviews").update(data).eq("id", review_id).execute()
        return {"status": "updated"}
    except Exception as e:
        return {"error": str(e)}
