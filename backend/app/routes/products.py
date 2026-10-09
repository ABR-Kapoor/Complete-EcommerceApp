from fastapi import APIRouter, Depends
from app.db import get_supabase_client

router = APIRouter(prefix="/api/products", tags=["products"])

@router.get("/categories")
def get_categories():
    try:
        client = get_supabase_client()
        data = client.table("categories").select("*").execute()
        return data.data or []
    except Exception as e:
        print(f"Error fetching categories: {e}")
        return []

@router.get("/most-bought")
def get_most_bought():
    try:
        client = get_supabase_client()
        data = client.table("order_items").select("product_id, sum(quantity)").group_by("product_id").order_by("sum(quantity)", desc=True).limit(10).execute()
        return data.data or []
    except Exception as e:
        print(f"Error fetching most bought: {e}")
        return []

@router.get("/")
def get_products(category: str = None, min_price: float = None, max_price: float = None, search: str = None):
    try:
        client = get_supabase_client()
        query = client.table("products").select("*, reviews(rating)")
        
        if category:
            query = query.eq("category", category)
        if min_price is not None:
            query = query.gte("price", min_price)
        if max_price is not None:
            query = query.lte("price", max_price)
        if search:
            query = query.ilike("title", f"%{search}%")
        
        data = query.execute()
        raw_products = data.data or []

        for p in raw_products:
            revs = p.pop("reviews", []) or []
            ratings = [r["rating"] for r in revs if isinstance(r, dict) and r.get("rating") is not None]
            if ratings:
                p["avg_rating"] = round(sum(ratings) / len(ratings), 1)
                p["review_count"] = len(ratings)
            else:
                p["avg_rating"] = None
                p["review_count"] = 0

        return raw_products
    except Exception as e:
        print(f"Error fetching products: {e}")
        import traceback
        traceback.print_exc()
        return []

@router.get("/{product_id}")
def get_product(product_id: int):
    try:
        client = get_supabase_client()
        data = client.table("products").select("*, reviews(rating)").eq("id", product_id).single().execute()
        prod = data.data or {}
        if prod:
            revs = prod.pop("reviews", []) or []
            ratings = [r["rating"] for r in revs if isinstance(r, dict) and r.get("rating") is not None]
            if ratings:
                prod["avg_rating"] = round(sum(ratings) / len(ratings), 1)
                prod["review_count"] = len(ratings)
            else:
                prod["avg_rating"] = None
                prod["review_count"] = 0
        return prod
    except Exception as e:
        print(f"Error fetching product {product_id}: {e}")
        return {}
