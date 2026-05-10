import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Ensure env is loaded before accessing variables
load_dotenv()

def get_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    # Try all common naming variations for the service/admin key
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ADMIN_KEY") or os.getenv("SUPABASE_KEY")
    if not url or not key:
        print(f"CRITICAL ERROR: Supabase config missing. URL: {bool(url)}, Key: {bool(key)}")
    return create_client(url, key)

def get_supabase_admin() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ADMIN_KEY") or os.getenv("SUPABASE_KEY")
    return create_client(url, key)
