import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import IngestionLog

logger = logging.getLogger("globalpulse.routers.sources")
router = APIRouter(prefix="/api/sources", tags=["Sources"])

@router.get("")
def list_sources(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Returns all configured news sources, feeds, and health metrics."""
    recent_logs = db.query(IngestionLog).order_by(IngestionLog.timestamp.desc()).limit(10).all()

    sources_info = []
    for f in settings.RSS_FEEDS:
        sources_info.append({
            "name": f["name"],
            "url": f["url"],
            "category": f.get("default_category", "General"),
            "reputation": f.get("reputation", 0.9),
            "status": "active"
        })

    return {
        "total_configured": len(settings.RSS_FEEDS),
        "sources": sources_info,
        "recent_ingestion_logs": [
            {
                "id": log.id,
                "status": log.status,
                "articles_fetched": log.articles_fetched,
                "new_events_created": log.new_events_created,
                "timestamp": log.timestamp,
                "error_message": log.error_message
            }
            for log in recent_logs
        ]
    }

@router.get("/categories")
def list_categories() -> List[str]:
    """Returns list of supported news categories."""
    return settings.SUPPORTED_CATEGORIES
