from __future__ import annotations
import os
from typing import Optional
from supabase import create_client, Client
from dotenv import load_dotenv

# Ensure env is loaded before accessing variables
load_dotenv()

# Module-level singleton — prevents Errno 16 "Device or resource busy"
# in Vercel serverless where creating multiple httpx clients causes socket conflicts
_supabase_client: Optional[Client] = None
_supabase_admin_client: Optional[Client] = None


def get_supabase_client() -> Client:
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL")
        # Try all common naming variations for the service/admin key
        key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ADMIN_KEY") or os.getenv("SUPABASE_KEY")
        if not url or not key:
            print(f"CRITICAL ERROR: Supabase config missing. URL: {bool(url)}, Key: {bool(key)}")
        _supabase_client = create_client(url, key)
    return _supabase_client

def get_supabase_admin() -> Client:
    global _supabase_admin_client
    if _supabase_admin_client is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ADMIN_KEY") or os.getenv("SUPABASE_KEY")
        if not url or not key:
            print(f"CRITICAL ERROR: Supabase admin config missing. URL: {bool(url)}, Key: {bool(key)}")
        _supabase_admin_client = create_client(url, key)
    return _supabase_admin_client
