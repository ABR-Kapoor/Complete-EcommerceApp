import os
import jwt
import requests
from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from fastapi import Depends
from functools import lru_cache

CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL")
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")

security = HTTPBearer()

@lru_cache(maxsize=1)
def get_jwks():
    """Fetch Clerk JWKS"""
    try:
        response = requests.get(CLERK_JWKS_URL, timeout=5)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching JWKS: {e}")
        raise HTTPException(status_code=500, detail="JWKS fetch failed")

async def verify_clerk_token(credentials: HTTPAuthCredentials = Depends(security)):
    """Verify Clerk JWT token"""
    token = credentials.credentials
    
    try:
        # Get JWKS
        jwks = get_jwks()
        
        # Decode and verify JWT
        unverified = jwt.decode(token, options={"verify_signature": False})
        kid = unverified.get("kid")
        
        # Find matching key
        key = None
        for k in jwks.get("keys", []):
            if k.get("kid") == kid:
                key = jwt.algorithms.RSAAlgorithm.from_jwk(k)
                break
        
        if not key:
            raise HTTPException(status_code=401, detail="Invalid key")
        
        # Verify with public key
        decoded = jwt.decode(token, key, algorithms=["RS256"])
        
        if "sub" not in decoded:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return decoded
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth failed: {str(e)}")

async def get_user_id(token_data = Depends(verify_clerk_token)):
    """Extract user ID from verified token"""
    return token_data.get("sub")
