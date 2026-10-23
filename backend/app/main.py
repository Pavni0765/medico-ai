import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db, SessionLocal
from app.routers import (
    events_router,
    recommendations_router,
    preferences_router,
    briefings_router,
    sources_router
)
from app.services.pipeline import pipeline

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("globalpulse.main")

async def background_scheduler():
    """Periodically fetches and ingests fresh events according to REFRESH_INTERVAL_MINUTES."""
    while True:
        try:
            await asyncio.sleep(settings.REFRESH_INTERVAL_MINUTES * 60)
            logger.info("Periodic news refresh triggered by background scheduler.")
            with SessionLocal() as db:
                await pipeline.run_ingestion(db)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in background scheduler: {e}")
            await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting GlobalPulse AI Backend...")
    init_db()

    # Check if events exist; if empty, kick off initial news ingestion
    async def initial_ingest():
        try:
            with SessionLocal() as db:
                from app.models import Event
                count = db.query(Event).count()
                if count == 0:
                    logger.info("Database has 0 events. Executing initial news collection...")
                    await pipeline.run_ingestion(db)
        except Exception as e:
            logger.error(f"Initial ingestion exception: {e}")

    # Run initial ingestion and launch scheduler
    asyncio.create_task(initial_ingest())
    scheduler_task = asyncio.create_task(background_scheduler())

    yield

    # Shutdown
    scheduler_task.cancel()
    logger.info("GlobalPulse AI Backend stopped.")

app = FastAPI(
    title="GlobalPulse AI API",
    description="Global Events Tracking, Analysis & Recommendation Agent Backend",
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Include Routers
app.include_router(events_router)
app.include_router(recommendations_router)
app.include_router(preferences_router)
app.include_router(briefings_router)
app.include_router(sources_router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
