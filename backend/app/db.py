import os
from supabase import create_client, Client

def get_supabase_client() -> Client:
    """Get Supabase client with SERVICE role (admin access for backend)"""
    url = os.getenv("SUPABASE_URL")
    # Use SERVICE_KEY instead of anon key for backend to bypass RLS
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
    return create_client(url, key)

def get_supabase_admin() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    return create_client(url, key)
