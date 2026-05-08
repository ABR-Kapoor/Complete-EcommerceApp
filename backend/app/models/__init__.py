from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Product(BaseModel):
    title: str
    price: float
    description: str
    category: str
    image_url: str
    sold: bool = False
    is_sale: bool = False

class CartItem(BaseModel):
    product_id: int
    quantity: int

class Address(BaseModel):
    street: str
    city: str
    state: str
    zip_code: str
    phone: str

class Order(BaseModel):
    total_price: float
    payment_method: str
    status: str = "pending_payment"

class Review(BaseModel):
    order_id: int
    rating: int
    text: str

class UserProfile(BaseModel):
    name: str
    email: str
    phone: str
    avatar_url: Optional[str] = None

__all__ = [
    "Product",
    "CartItem", 
    "Address",
    "Order",
    "Review",
    "UserProfile"
]
