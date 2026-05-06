from fastapi import APIRouter, Depends
from app.db import get_supabase_client

router = APIRouter(prefix="/api/products", tags=["products"])

@router.get("/")
def get_products(category: str = None, min_price: float = None, max_price: float = None, search: str = None):
    client = get_supabase_client()
    query = client.table("products").select("*")
    
    if category:
        query = query.eq("category", category)
    if min_price is not None:
        query = query.gte("price", min_price)
    if max_price is not None:
        query = query.lte("price", max_price)
    if search:
        query = query.ilike("title", f"%{search}%")
    
    data = query.execute()
    return data.data or []

@router.get("/{product_id}")
def get_product(product_id: int):
    client = get_supabase_client()
    data = client.table("products").select("*").eq("id", product_id).single().execute()
    return data.data

@router.get("/categories")
def get_categories():
    client = get_supabase_client()
    data = client.table("categories").select("*").execute()
    return data.data or []

@router.get("/most-bought")
def get_most_bought():
    client = get_supabase_client()
    data = client.table("order_items").select("product_id, sum(quantity)").group_by("product_id").order_by("sum(quantity)", desc=True).limit(10).execute()
    return data.data or []
