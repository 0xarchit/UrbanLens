import asyncio
import logging
from sqlalchemy.ext.asyncio import create_async_engine
from Backend.core.config import settings
from Backend.database.models import Base
from Backend.database.seed import seed_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_models():
    """Drops and recreates all tables, then seeds initial data."""
    logger.info("Initializing database...")
    
    
    database_url = settings.database_url.replace("port=6543", "port=5432").replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(
        database_url, 
        echo=True,
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
        }
    )
    
    async with engine.begin() as conn:
        logger.info("Dropping existing tables...")
        
        
        
        
        logger.info("Creating new tables...")
        await conn.run_sync(Base.metadata.create_all)
    
    logger.info("Schema initialized. Seeding data...")
    try:
        await seed_data(engine)
        logger.info("Seeding completed successfully!")
    except Exception as e:
        logger.error(f"Seeding failed: {e}")
    
    await engine.dispose()
    logger.info("Database initialization finished.")

if __name__ == "__main__":
    asyncio.run(init_models())
