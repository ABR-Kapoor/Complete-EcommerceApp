from fastapi import APIRouter
from app.db import get_supabase_admin
from app.models import Review

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

@router.post("/")
def create_review(user_id: str, review: Review):
    try:
        client = get_supabase_admin()
        print(f"DEBUG: Processing review for user {user_id}, product {review.product_id}")
        
        # 1. Ensure user exists in DB (Handshake)
        user_check = client.table("users").select("id").eq("id", user_id).maybe_single().execute()
        if not user_check.data:
            print(f"DEBUG: Creating missing user profile for {user_id}")
            client.table("users").insert({"id": user_id, "name": "Authentic User"}).execute()

        order_id = review.order_id
        
        # 2. Ghost Order Logic
        if not order_id or order_id == 0:
            print("DEBUG: No order_id, attempting ghost order fallback")
            existing_orders = client.table("orders").select("id").eq("user_id", user_id).limit(1).execute()
            if existing_orders.data:
                order_id = existing_orders.data[0]["id"]
            else:
                print("DEBUG: Creating verification order")
                dummy_order = {
                    "user_id": user_id,
                    "total_price": 0,
                    "payment_method": "Verification",
                    "status": "completed"
                }
                new_order = client.table("orders").insert(dummy_order).execute()
                if new_order.data:
                    order_id = new_order.data[0]["id"]
                else:
                    return {"error": "Could not create verification order"}

        # 3. Check/Update/Insert Review
        existing = client.table("reviews").select("*").eq("order_id", order_id).eq("user_id", user_id).execute()
        
        data = {
            "order_id": order_id,
            "product_id": review.product_id,
            "user_id": user_id,
            "rating": review.rating,
            "text": review.text,
        }

        if existing.data:
            print(f"DEBUG: Updating existing review {existing.data[0]['id']}")
            client.table("reviews").update(data).eq("id", existing.data[0]["id"]).execute()
            return {"status": "updated"}
        
        print("DEBUG: Inserting new review")
        client.table("reviews").insert(data).execute()
        return {"status": "created"}

    except Exception as e:
        print(f"CRITICAL ERROR in create_review: {str(e)}")
        return {"error": str(e), "details": "Check backend terminal for traceback"}

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
