from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
import time
import asyncio

from Backend.core.logging import get_logger

logger = get_logger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(self), camera=(self)"
        
        if request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 60, burst_limit: int = 10):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.burst_limit = burst_limit
        self.requests = defaultdict(list)
        self.lock = asyncio.Lock()
    
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        current_time = time.time()
        
        async with self.lock:
            self.requests[client_ip] = [
                t for t in self.requests[client_ip] 
                if current_time - t < 60
            ]
            
            if len(self.requests[client_ip]) >= self.requests_per_minute:
                logger.warning(f"Rate limit exceeded for {client_ip}")
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please slow down."},
                    headers={"Retry-After": "60"}
                )
            
            recent_requests = [t for t in self.requests[client_ip] if current_time - t < 1]
            if len(recent_requests) >= self.burst_limit:
                logger.warning(f"Burst limit exceeded for {client_ip}")
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please slow down."},
                    headers={"Retry-After": "1"}
                )
            
            self.requests[client_ip].append(current_time)
        
        return await call_next(request)


class RequestValidationMiddleware(BaseHTTPMiddleware):
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024
    
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.MAX_CONTENT_LENGTH:
            return JSONResponse(
                status_code=413,
                content={"detail": "Request entity too large"}
            )
        
        return await call_next(request)
