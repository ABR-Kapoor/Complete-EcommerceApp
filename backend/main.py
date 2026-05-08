from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from app.db import get_supabase_client
from app.models import Product

# Import basic routers
from app.routes import products, cart, wishlist, reviews, users, admin

load_dotenv()

app = FastAPI(title="ABR Ecommerce API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://abrcom-done.vercel.app",
        "https://complete-ecommerce-app-3ytm.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health():
    return {"status": "alive"}



# ── ORDERS ──
@app.post("/api/orders/create")
def create_order_final(data: dict):
    try:
        from app.db import get_supabase_admin
        client = get_supabase_admin()
        uid = data.get("user_id")
        if not uid: raise Exception("Missing user_id")
        
        # Force user
        email = data.get("email", "unknown@email.com")
        try:
            client.table("users").upsert({"id": uid, "email": email, "name": email.split("@")[0]}).execute()
        except: pass
        
        # Save Address
        addr = data.get("address")
        if addr:
            try: client.table("addresses").upsert({**addr, "user_id": uid}).execute()
            except: pass

        # Order
        res = client.table("orders").insert({
            "user_id": uid,
            "total_price": data.get("total_price"),
            "payment_method": data.get("payment_method"),
            "status": data.get("status", "pending_payment")
        }).execute()
        
        if not res.data: raise Exception("Order insert failed")
        oid = res.data[0]["id"]
        
        items = data.get("items", [])
        if items:
            # 3.1 CHECK STOCK
            for i in items:
                pid = i["product_id"]
                qty = i.get("quantity", 1)
                p_res = client.table("products").select("stock, title").eq("id", pid).single().execute()
                if not p_res.data: raise Exception(f"Product {pid} not found")
                current_stock = p_res.data.get("stock", 0)
                if current_stock < qty:
                    raise Exception(f"Insufficient stock for {p_res.data['title']}. Only {current_stock} left.")

            # 3.2 INSERT ITEMS & DECREMENT STOCK
            formatted = []
            for i in items:
                pid = i["product_id"]
                qty = i.get("quantity", 1)
                formatted.append({
                    "order_id": oid,
                    "product_id": pid,
                    "quantity": qty,
                    "price": i.get("price")
                })
                # Decrement stock (using direct update for simplicity)
                new_stock = current_stock - qty
                client.table("products").update({"stock": new_stock}).eq("id", pid).execute()
            
            client.table("order_items").insert(formatted).execute()
            
        return {"status": "ok", "order_id": oid}
    except Exception as e:
        print(f"Order Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/orders/user/{user_id}")
def user_orders(user_id: str):
    client = get_supabase_client()
    res = client.table("orders").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return res.data or []

@app.post("/api/users/sync")
def sync_user(data: dict):
    try:
        from app.db import get_supabase_admin
        client = get_supabase_admin()
        uid = data.get("id")
        email = data.get("email")
        name = data.get("name", email.split("@")[0] if email else "User")
        avatar = data.get("avatar_url")
        
        res = client.table("users").upsert({
            "id": uid,
            "email": email,
            "name": name,
            "avatar_url": avatar
        }).execute()
        return {"status": "synced", "user": res.data[0]}
    except Exception as e:
        print(f"Sync Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# Routers
app.include_router(admin.router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(wishlist.router)
app.include_router(reviews.router)
app.include_router(users.router)
