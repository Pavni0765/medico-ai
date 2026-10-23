import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import DailyBriefingResponse
from app.services.briefing_service import briefing_service

logger = logging.getLogger("globalpulse.routers.briefings")
router = APIRouter(prefix="/api/briefings", tags=["Briefings"])

@router.get("/latest", response_model=DailyBriefingResponse)
def get_latest_briefing(
    time_window_hours: int = Query(24, description="Time window in hours (6, 24, 72, 168)"),
    db: Session = Depends(get_db)
):
    """Retrieves current daily global intelligence briefing."""
    briefing = briefing_service.generate_daily_briefing(
        db=db,
        time_window_hours=time_window_hours,
        force_regenerate=False
    )
    return briefing

@router.post("/generate", response_model=DailyBriefingResponse)
def generate_new_briefing(
    time_window_hours: int = Query(24, description="Time window in hours"),
    db: Session = Depends(get_db)
):
    """Forces manual regeneration of global briefing."""
    briefing = briefing_service.generate_daily_briefing(
        db=db,
        time_window_hours=time_window_hours,
        force_regenerate=True
    )
    return briefing
