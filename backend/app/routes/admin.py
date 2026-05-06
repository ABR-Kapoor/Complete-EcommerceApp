from fastapi import APIRouter, File, UploadFile
from app.db import get_supabase_client
from app.models import Product, UserProfile
import os

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.post("/products")
def create_product(product: Product):
    client = get_supabase_client()
    data = client.table("products").insert(product.dict()).execute()
    return data.data[0]

@router.put("/products/{product_id}")
def update_product(product_id: int, product: Product):
    client = get_supabase_client()
    data = client.table("products").update(product.dict()).eq("id", product_id).execute()
    return data.data[0]

@router.delete("/products/{product_id}")
def delete_product(product_id: int):
    client = get_supabase_client()
    client.table("products").delete().eq("id", product_id).execute()
    return {"status": "deleted"}

@router.post("/upload/product-image/{product_id}")
def upload_product_image(product_id: int, file: UploadFile = File(...)):
    client = get_supabase_client()
    file_content = file.file.read()
    path = f"products/{product_id}/{file.filename}"
    client.storage.from_("ecommerce").upload(path, file_content)
    url = client.storage.from_("ecommerce").get_public_url(path)
    return {"url": url.get("publicUrl")}

@router.post("/upload/avatar/{user_id}")
def upload_avatar(user_id: str, file: UploadFile = File(...)):
    client = get_supabase_client()
    file_content = file.file.read()
    path = f"avatars/{user_id}/{file.filename}"
    client.storage.from_("ecommerce").upload(path, file_content)
    url = client.storage.from_("ecommerce").get_public_url(path)
    client.table("avatars").upsert({"user_id": user_id, "url": url.get("publicUrl")}).execute()
    return {"url": url.get("publicUrl")}

@router.get("/orders")
def get_all_orders(status: str = None):
    client = get_supabase_client()
    query = client.table("orders").select("*")
    if status:
        query = query.eq("status", status)
    data = query.order_by("created_at", desc=True).execute()
    return data.data or []
