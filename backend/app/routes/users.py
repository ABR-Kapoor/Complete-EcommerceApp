from fastapi import APIRouter, HTTPException, Body, UploadFile, File
from app.db import get_supabase_client, get_supabase_admin
from typing import Dict, Any
import os
import time

router = APIRouter(prefix="/api/users", tags=["users"])

@router.post("/profile")
@router.post("/sync")
def create_or_update_user(data: Dict[str, Any] = Body(...)):
    """Sync user profile without overwriting existing custom info"""
    client = get_supabase_admin()
    user_id = data.get("id")
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID is required")

    try:
        email = data.get("email", "")
        
        # Check existing user in database
        existing_res = client.table("users").select("*").eq("id", user_id).maybe_single().execute()
        existing = existing_res.data if existing_res and hasattr(existing_res, "data") else None
        
        if existing:
            # ONLY patch fields that are missing in database.
            # Never overwrite existing custom avatar_url, name, or phone!
            updates = {}
            if email and not existing.get("email"):
                updates["email"] = email
            if data.get("name") and not existing.get("name"):
                updates["name"] = data.get("name")
            if data.get("avatar_url") and not existing.get("avatar_url"):
                updates["avatar_url"] = data.get("avatar_url")
            if data.get("phone") and not existing.get("phone"):
                updates["phone"] = data.get("phone")
                
            if updates:
                client.table("users").update(updates).eq("id", user_id).execute()
                
            final = client.table("users").select("*").eq("id", user_id).single().execute()
            return final.data
        else:
            # Check if user existed under this email to bridge profiles
            if email:
                existing_by_email = client.table("users").select("*").eq("email", email).maybe_single().execute()
                if existing_by_email and hasattr(existing_by_email, 'data') and existing_by_email.data:
                    client.table("users").update({"id": user_id}).eq("email", email).execute()
                    final = client.table("users").select("*").eq("id", user_id).single().execute()
                    return final.data

            payload = {
                "id": user_id,
                "name": data.get("name") or "User",
                "email": email,
                "avatar_url": data.get("avatar_url"),
                "role": "user"
            }
            if data.get("phone"):
                payload["phone"] = data.get("phone")
            client.table("users").insert(payload).execute()
            final = client.table("users").select("*").eq("id", user_id).single().execute()
            return final.data
    except Exception as e:
        import traceback
        print(f"CRITICAL: User Sync Error: {e}")
        traceback.print_exc()
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
        import traceback
        print(f"CRITICAL: User Profile Fetch Error: {e}")
        traceback.print_exc()
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
    """Only patch the specific info that was updated by user, rest is not altered"""
    client = get_supabase_admin()
    try:
        allowed = {}
        for k in ("name", "phone", "avatar_url"):
            if k in updates and updates[k] is not None and str(updates[k]).strip() != "":
                allowed[k] = updates[k]
        if allowed:
            client.table("users").update(allowed).eq("id", user_id).execute()
        final = client.table("users").select("*").eq("id", user_id).maybe_single().execute()
        return final.data or {"status": "ok"}
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

@router.post("/{user_id}/avatar-upload")
def upload_avatar_file(user_id: str, file: UploadFile = File(...)):
    """Upload user avatar directly to Supabase Storage ('ecommerce' bucket)"""
    try:
        client = get_supabase_admin()
        content = file.file.read()
        
        # Determine extension
        ext = "jpg"
        if file.filename and "." in file.filename:
            ext = file.filename.rsplit(".", 1)[-1].lower()
            if ext not in ["jpg", "jpeg", "png", "webp"]:
                ext = "jpg"
        
        path = f"avatars/{user_id}_{int(time.time())}.{ext}"
        content_type = file.content_type or f"image/{ext}"
        
        # Upload to Supabase bucket 'ecommerce'
        try:
            client.storage.from_("ecommerce").upload(path, content, {"content-type": content_type})
        except Exception:
            client.storage.from_("ecommerce").update(path, content, {"content-type": content_type})
            
        url_res = client.storage.from_("ecommerce").get_public_url(path)
        public_url = (
            url_res.public_url if hasattr(url_res, "public_url")
            else (url_res if isinstance(url_res, str) else url_res.get("publicUrl", ""))
        )
        
        if not public_url:
            raise HTTPException(status_code=500, detail="Failed to retrieve public URL from Supabase storage")
            
        # Update user in database
        client.table("users").update({"avatar_url": public_url}).eq("id", user_id).execute()
        return {"status": "ok", "url": public_url}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Avatar upload to bucket failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

