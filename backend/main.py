from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from app.db import get_supabase_client
from app.models import Product

# Import basic routers
from app.routes import products, cart, wishlist, reviews, users, admin, orders

load_dotenv()

# Vercel-specific fix for Supabase/httpx proxy error
os.environ.pop("HTTP_PROXY", None)
os.environ.pop("HTTPS_PROXY", None)
os.environ.pop("http_proxy", None)
os.environ.pop("https_proxy", None)

app = FastAPI(title="ABR Ecommerce API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://abrcom-done.vercel.app",
        "https://abrecom-done.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health():
    return {"status": "alive"}

# Routers
app.include_router(admin.router)
app.include_router(products.router)
app.include_router(cart.router)
app.include_router(wishlist.router)
app.include_router(reviews.router)
app.include_router(users.router)
app.include_router(orders.router)
