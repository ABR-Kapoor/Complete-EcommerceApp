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
        print(f"DEBUG: Fetching products with filters - category={category}, min_price={min_price}, max_price={max_price}, search={search}")
        client = get_supabase_client()
        print("DEBUG: Client initialized")
        query = client.table("products").select("*")
        print("DEBUG: Query object created")
        
        if category:
            query = query.eq("category", category)
        if min_price is not None:
            query = query.gte("price", min_price)
        if max_price is not None:
            query = query.lte("price", max_price)
        if search:
            query = query.ilike("title", f"%{search}%")
        
        print("DEBUG: About to execute query...")
        data = query.execute()
        print(f"DEBUG: Query executed. Returned {len(data.data) if data.data else 0} products")
        return data.data or []
    except Exception as e:
        print(f"Error fetching products: {e}")
        import traceback
        traceback.print_exc()
        return []

@router.get("/{product_id}")
def get_product(product_id: int):
    try:
        client = get_supabase_client()
        data = client.table("products").select("*").eq("id", product_id).single().execute()
        return data.data or {}
    except Exception as e:
        print(f"Error fetching product {product_id}: {e}")
        return {}
