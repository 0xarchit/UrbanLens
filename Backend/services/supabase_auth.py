import aiohttp
from typing import Optional
from Backend.core.config import settings
from Backend.core.logging import get_logger

logger = get_logger(__name__)


class SupabaseAuthService:
    def __init__(self):
        self.url = settings.supabase_url
        self.service_key = settings.supabase_key
        self.headers = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Content-Type": "application/json",
        }
    
    async def invite_user(self, email: str, redirect_to: Optional[str] = None) -> dict:
        invite_url = f"{self.url}/auth/v1/invite"
        
        payload = {
            "email": email,
        }
        
        if redirect_to:
            payload["options"] = {"redirectTo": redirect_to}
        
        async with aiohttp.ClientSession() as session:
            async with session.post(invite_url, json=payload, headers=self.headers) as response:
                result = await response.json()
                
                if response.status == 200:
                    logger.info(f"Invite sent to {email}")
                    return {
                        "success": True,
                        "message": f"Invitation email sent to {email}",
                        "user_id": result.get("id"),
                        "email": email,
                    }
                else:
                    error_msg = result.get("msg") or result.get("message") or str(result)
                    logger.error(f"Failed to invite {email}: {error_msg}")
                    return {
                        "success": False,
                        "message": error_msg,
                        "email": email,
                    }
    
    async def create_user(self, email: str, password: str, user_metadata: Optional[dict] = None) -> dict:
        create_url = f"{self.url}/auth/v1/admin/users"
        
        payload = {
            "email": email,
            "password": password,
            "email_confirm": True,
        }
        
        if user_metadata:
            payload["user_metadata"] = user_metadata
        
        async with aiohttp.ClientSession() as session:
            async with session.post(create_url, json=payload, headers=self.headers) as response:
                result = await response.json()
                
                if response.status in [200, 201]:
                    logger.info(f"User created: {email}")
                    return {
                        "success": True,
                        "user_id": result.get("id"),
                        "email": email,
                    }
                else:
                    error_msg = result.get("msg") or result.get("message") or str(result)
                    return {
                        "success": False,
                        "message": error_msg,
                    }
    
    async def send_magic_link(self, email: str, redirect_to: Optional[str] = None) -> dict:
        magic_url = f"{self.url}/auth/v1/magiclink"
        
        payload = {"email": email}
        
        if redirect_to:
            payload["options"] = {"redirectTo": redirect_to}
        
        async with aiohttp.ClientSession() as session:
            async with session.post(magic_url, json=payload, headers=self.headers) as response:
                if response.status == 200:
                    return {
                        "success": True,
                        "message": f"Magic link sent to {email}",
                    }
                else:
                    result = await response.json()
                    return {
                        "success": False,
                        "message": result.get("msg") or str(result),
                    }
    
    async def get_user(self, user_id: str) -> Optional[dict]:
        user_url = f"{self.url}/auth/v1/admin/users/{user_id}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(user_url, headers=self.headers) as response:
                if response.status == 200:
                    return await response.json()
                return None
    
    async def delete_user(self, user_id: str) -> bool:
        delete_url = f"{self.url}/auth/v1/admin/users/{user_id}"
        
        async with aiohttp.ClientSession() as session:
            async with session.delete(delete_url, headers=self.headers) as response:
                return response.status == 200


supabase_auth = SupabaseAuthService()
