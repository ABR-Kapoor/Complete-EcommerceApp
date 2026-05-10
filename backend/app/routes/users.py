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
        payload = {
            "id": user_id,
            "name": data.get("name"),
            "email": data.get("email", ""),
            "avatar_url": data.get("avatar_url")
        }
        if data.get("phone"):
            payload["phone"] = data.get("phone")
            
        res_existing = client.table("users").select("role").eq("id", user_id).maybe_single().execute()
        if not res_existing or not hasattr(res_existing, 'data') or not res_existing.data:
            payload["role"] = "user"
        else:
            payload["role"] = res_existing.data.get("role", "user")
            
        client.table("users").upsert(payload, on_conflict="id").execute()
        final = client.table("users").select("*").eq("id", user_id).single().execute()
        return final.data
    except Exception as e:
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
        # Preparation: Only include columns that EXIST in the addresses table
        # We verified columns are: ['user_id', 'street', 'city', 'state', 'zip_code']
        payload = {
            "user_id": user_id,
            "street": address.get("street"),
            "city": address.get("city"),
            "state": address.get("state"),
            "zip_code": str(address.get("zip_code") or "")
        }
        
        # Robust Save: Check if exists using user_id as PK
        res_existing = client.table("addresses").select("user_id").eq("user_id", user_id).maybe_single().execute()
        
        if res_existing and hasattr(res_existing, 'data') and res_existing.data:
            # Update existing record
            client.table("addresses").update(payload).eq("user_id", user_id).execute()
        else:
            # Create new record
            client.table("addresses").insert(payload).execute()
            
        return {"status": "ok"}
    except Exception as e:
        print(f"Address Save Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{user_id}")
def update_user(user_id: str, updates: Dict[str, Any] = Body(...)):
    """Update user profile with real-time persistence"""
    client = get_supabase_admin()
    try:
        allowed = {k: v for k, v in updates.items() if k in ("name", "phone", "avatar_url", "email") and v}
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
