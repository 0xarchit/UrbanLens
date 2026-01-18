from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from Backend.core.config import settings
from Backend.core.events import event_bus
from Backend.core.logging import setup_logging, get_logger
from Backend.core.security import SecurityHeadersMiddleware, RateLimitMiddleware, RequestValidationMiddleware
from Backend.database.connection import init_db, close_db
from Backend.api.routes import api_router

logger = get_logger(__name__)

STATIC_DIR = Path("static")

@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(debug=settings.debug)
    logger.info("Starting City Issue Resolution Agent")
    
    await init_db()
    logger.info("Database initialized")
    
    await event_bus.start()
    logger.info("Event bus started")
    
    
    from Backend.agents.vision import VisionAgent
    try:
        VisionAgent.load_model()
        logger.info("Vision model loaded")
    except Exception as e:
        logger.warning(f"Vision model failed to load: {e}. Running in mock mode.")
    
    
    import asyncio
    from Backend.database.connection import get_db_context
    from Backend.agents.escalation.agent import EscalationAgent
    from Backend.agents.sla.agent import SLAAgent
    
    async def run_periodic_checks():
        while True:
            try:
                logger.info("Running periodic SLA and Escalation checks...")
                async with get_db_context() as db:
                    
                    esc_agent = EscalationAgent(db)
                    await esc_agent.check_all_pending()
                    
                    
                    sla_agent = SLAAgent(db)
                    await sla_agent.check_all_active()
            except Exception as e:
                logger.error(f"Error in background task: {e}")
            
            
            await asyncio.sleep(900)
            
    task = asyncio.create_task(run_periodic_checks())
    
    yield
    
    task.cancel()
    await event_bus.stop()
    await close_db()
    logger.info("Shutdown complete")


def create_app() -> FastAPI:
    app = FastAPI(
        title="City Issue Resolution Agent",
        description="Autonomous urban issue detection and resolution platform",
        version="1.0.0",
        lifespan=lifespan,
    )
    
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RateLimitMiddleware, requests_per_minute=120, burst_limit=20)
    app.add_middleware(RequestValidationMiddleware)
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    
    settings.local_temp_dir.mkdir(parents=True, exist_ok=True)
    STATIC_DIR.mkdir(parents=True, exist_ok=True)
    
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
    
    app.include_router(api_router)
    
    @app.get("/")
    async def root():
        return FileResponse(STATIC_DIR / "flow.html")
    
    @app.get("/dashboard")
    async def dashboard():
        return FileResponse(STATIC_DIR / "flow.html")
    
    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError):
        return JSONResponse(
            status_code=400,
            content={"detail": str(exc)}
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )
    
    return app
