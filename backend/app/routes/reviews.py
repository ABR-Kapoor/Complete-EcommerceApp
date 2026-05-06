from fastapi import APIRouter
from app.db import get_supabase_client
from app.models import Review

router = APIRouter(prefix="/api/reviews", tags=["reviews"])

@router.post("/")
def create_review(user_id: str, review: Review):
    client = get_supabase_client()
    
    existing = client.table("reviews").select("*").eq("order_id", review.order_id).eq("user_id", user_id).execute()
    if existing.data:
        return {"error": "Review already exists for this order"}
    
    data = {
        "order_id": review.order_id,
        "user_id": user_id,
        "rating": review.rating,
        "text": review.text,
    }
    
    client.table("reviews").insert(data).execute()
    return {"status": "created"}

@router.get("/product/{product_id}")
def get_product_reviews(product_id: int):
    client = get_supabase_client()
    data = client.table("reviews").select("*, orders(product_id)").filter("orders.product_id", "eq", product_id).execute()
    return data.data or []

@router.get("/order/{order_id}")
def get_order_reviews(order_id: int):
    client = get_supabase_client()
    data = client.table("reviews").select("*").eq("order_id", order_id).execute()
    return data.data or []
