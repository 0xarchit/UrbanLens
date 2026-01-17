from fastapi import APIRouter
from sqlalchemy import text

from Backend.database.connection import async_session_factory

router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "city-issue-agent"}


@router.get("/health/db")
async def db_health_check():
    try:
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}
