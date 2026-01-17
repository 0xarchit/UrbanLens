from fastapi import APIRouter

from .health import router as health_router
from .issues import router as issues_router
from .admin import router as admin_router
from .flow import router as flow_router
from .worker import router as worker_router

api_router = APIRouter()

api_router.include_router(health_router, prefix="/health", tags=["Health"])
api_router.include_router(issues_router, prefix="/issues", tags=["Issues"])
api_router.include_router(admin_router, prefix="/admin", tags=["Admin"])
api_router.include_router(flow_router, prefix="/flow", tags=["Agent Flow"])
api_router.include_router(worker_router, prefix="/worker", tags=["Worker"])

