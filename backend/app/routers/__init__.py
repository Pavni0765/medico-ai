from app.routers.events import router as events_router
from app.routers.recommendations import router as recommendations_router
from app.routers.preferences import router as preferences_router
from app.routers.briefings import router as briefings_router
from app.routers.sources import router as sources_router

__all__ = [
    "events_router",
    "recommendations_router",
    "preferences_router",
    "briefings_router",
    "sources_router"
]
