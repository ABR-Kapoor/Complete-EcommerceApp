from fastapi import APIRouter, HTTPException, Body
from app.db import get_supabase_client, get_supabase_admin
from typing import Dict, Any
import os

router = APIRouter(prefix="/api/users", tags=["users"])

@router.post("/profile")
@router.post("/sync")
def create_or_update_user(data: Dict[str, Any] = Body(...)):
    """Create or update user profile after login"""
    client = get_supabase_admin()
    user_id = data.get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    try:
        existing = client.table("users").select("*").eq("id", user_id).maybe_single().execute()
        email = data.get("email", "")
        payload = {
            "name": data.get("name"),
            "email": email,
            "phone": data.get("phone"), # Capture phone from Clerk sync if available
            "avatar_url": data.get("avatar_url")
        }
        
        if existing.data:
            # Update existing user but DON'T overwrite the role
            client.table("users").update(payload).eq("id", user_id).execute()
        else:
            # New user: set default role to 'user'
            payload["id"] = user_id
            payload["role"] = "user"
            client.table("users").insert(payload).execute()
        
        return {"status": "ok", "user_id": user_id}
    except Exception as e:
        print(f"Profile Sync Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{user_id}")
def get_user(user_id: str):
    """Get user profile"""
    client = get_supabase_admin()
    try:
        data = client.table("users").select("*").eq("id", user_id).maybe_single().execute()
        if not data.data:
            raise HTTPException(status_code=404, detail="User not found")
        return data.data
    except HTTPException:
        raise
    except Exception as e:
        print(f"GET USER ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}/address")
def get_user_address(user_id: str):
    """Get saved address for user"""
    client = get_supabase_admin()
    try:
        data = client.table("addresses").select("*").eq("user_id", user_id).maybe_single().execute()
        return data.data or {}
    except Exception:
        return {}

@router.post("/{user_id}/address")
def save_user_address(user_id: str, address: Dict[str, Any] = Body(...)):
    """Save or update user shipping address"""
    client = get_supabase_admin()
    try:
        # Cleanup irrelevant data before saving
        payload = {
            "user_id": user_id,
            "street": address.get("street"),
            "city": address.get("city"),
            "state": address.get("state"),
            "zip_code": address.get("zip_code")
        }
        client.table("addresses").upsert(payload, on_conflict="user_id").execute()
        return {"status": "ok"}
    except Exception as e:
        print(f"Address Save Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{user_id}")
def update_user(user_id: str, updates: Dict[str, Any] = Body(...)):
    """Update user profile with real-time persistence"""
    client = get_supabase_admin()
    try:
        allowed = {k: v for k, v in updates.items() if k in ("name", "phone", "avatar_url", "email")}
        if allowed:
            client.table("users").update(allowed).eq("id", user_id).execute()
        return {"status": "ok"}
    except Exception as e:
        print(f"User Update Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{user_id}/avatar")
def upload_avatar(user_id: str, body: Dict[str, Any] = Body(...)):
    """Update user avatar URL"""
    client = get_supabase_admin()
    avatar_url = body.get("avatar_url")
    if avatar_url:
        client.table("users").update({"avatar_url": avatar_url}).eq("id", user_id).execute()
    return {"status": "ok"}
