from typing import Optional
from dataclasses import dataclass
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt.exceptions import InvalidTokenError

from Backend.core.config import settings
from Backend.core.logging import get_logger

logger = get_logger(__name__)

security = HTTPBearer(auto_error=False)


@dataclass
class AuthenticatedUser:
    id: str
    email: Optional[str] = None
    role: str = "user"


def verify_jwt_token(token: str) -> dict:
    try:
        decoded = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return decoded
    except InvalidTokenError as e:
        logger.warning(f"JWT verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthenticatedUser:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = verify_jwt_token(token)
    
    return AuthenticatedUser(
        id=payload.get("sub", ""),
        email=payload.get("email"),
        role=payload.get("role", "user"),
    )


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Optional[AuthenticatedUser]:
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        payload = verify_jwt_token(token)
        return AuthenticatedUser(
            id=payload.get("sub", ""),
            email=payload.get("email"),
            role=payload.get("role", "user"),
        )
    except HTTPException:
        return None


def get_user_id_from_form_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload.get("sub")
    except InvalidTokenError:
        return None
