from fastapi import APIRouter, HTTPException, Body
from app.db import get_supabase_client, get_supabase_admin
from typing import Dict, Any
import traceback
import os

router = APIRouter(prefix="/api/users", tags=["users"])

@router.post("/profile")
def create_or_update_user(data: Dict[str, Any] = Body(...)):
    """Create or update user profile after login"""
    client = get_supabase_admin()
    user_id = data.get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    try:
        existing = client.table("users").select("*").eq("id", user_id).maybe_single().execute()
        email = data.get("email", "")
        role = "admin" if email == os.getenv("ADMIN_EMAIL") else "user"
        payload = {
            "name": data.get("name"),
            "email": email,
            "phone": data.get("phone"),
            "avatar_url": data.get("avatar_url"),
            "role": role
        }
        if existing.data:
            client.table("users").update(payload).eq("id", user_id).execute()
        else:
            payload["id"] = user_id
            client.table("users").insert(payload).execute()
        return {"status": "ok", "user_id": user_id}
    except Exception as e:
        print(f"Profile Sync Error: {traceback.format_exc()}")
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
        print(f"GET USER ERROR: {traceback.format_exc()}")
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

@router.put("/{user_id}")
def update_user(user_id: str, updates: Dict[str, Any] = Body(...)):
    """Update user profile"""
    client = get_supabase_admin()
    allowed = {k: v for k, v in updates.items() if k in ("name", "phone", "avatar_url", "email")}
    if allowed:
        client.table("users").update(allowed).eq("id", user_id).execute()
    return {"status": "ok"}

@router.put("/{user_id}/avatar")
def upload_avatar(user_id: str, body: Dict[str, Any] = Body(...)):
    """Update user avatar URL"""
    client = get_supabase_admin()
    avatar_url = body.get("avatar_url")
    if avatar_url:
        client.table("users").update({"avatar_url": avatar_url}).eq("id", user_id).execute()
    return {"status": "ok"}
