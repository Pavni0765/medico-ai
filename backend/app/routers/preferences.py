import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import UserPreference, UserInteraction, Event
from app.schemas import UserPreferenceSchema, UserPreferenceUpdate, EventResponse
from app.routers.events import format_event_response
from app.routers.recommendations import get_or_create_preferences

logger = logging.getLogger("globalpulse.routers.preferences")
router = APIRouter(prefix="/api/preferences", tags=["Preferences"])

@router.get("", response_model=UserPreferenceSchema)
def get_preferences(user_id: str = "default_user", db: Session = Depends(get_db)):
    """Retrieves current user personalization preferences."""
    pref = get_or_create_preferences(db, user_id)
    return pref

@router.put("", response_model=UserPreferenceSchema)
def update_preferences(
    update_data: UserPreferenceUpdate,
    user_id: str = "default_user",
    db: Session = Depends(get_db)
):
    """Updates user interests, monitored regions, and algorithm weights."""
    pref = get_or_create_preferences(db, user_id)

    if update_data.preferred_topics is not None:
        pref.preferred_topics = update_data.preferred_topics
    if update_data.preferred_regions is not None:
        pref.preferred_regions = update_data.preferred_regions
    if update_data.briefing_style is not None:
        pref.briefing_style = update_data.briefing_style
    if update_data.recommendation_limit is not None:
        pref.recommendation_limit = update_data.recommendation_limit
    if update_data.time_window_hours is not None:
        pref.time_window_hours = update_data.time_window_hours
    if update_data.custom_weights is not None:
        pref.custom_weights = update_data.custom_weights

    db.commit()
    db.refresh(pref)
    return pref

@router.post("/reset", response_model=UserPreferenceSchema)
def reset_preferences(user_id: str = "default_user", db: Session = Depends(get_db)):
    """Resets preferences back to system defaults."""
    pref = get_or_create_preferences(db, user_id)
    pref.preferred_topics = [
        "Politics & Geopolitics",
        "Technology & AI",
        "Economy & Business",
        "International Conflicts"
    ]
    pref.preferred_regions = [
        "Global",
        "North America",
        "Europe",
        "Asia-Pacific"
    ]
    pref.briefing_style = "detailed"
    pref.recommendation_limit = 10
    pref.time_window_hours = 24
    pref.custom_weights = {
        "recency": 0.25,
        "interest": 0.35,
        "importance": 0.25,
        "corroboration": 0.15
    }

    db.commit()
    db.refresh(pref)
    return pref

@router.get("/saved", response_model=List[EventResponse])
def get_saved_events(user_id: str = "default_user", db: Session = Depends(get_db)):
    """Retrieves all bookmarked events saved by the user."""
    saved_interactions = db.query(UserInteraction).filter(
        UserInteraction.user_id == user_id,
        UserInteraction.is_saved == True
    ).order_by(UserInteraction.saved_at.desc()).all()

    saved_event_ids = [i.event_id for i in saved_interactions]
    events = db.query(Event).filter(Event.id.in_(saved_event_ids)).all()
    
    # Preserve saved_at order
    event_map = {ev.id: ev for ev in events}
    ordered_events = [event_map[eid] for eid in saved_event_ids if eid in event_map]

    return [format_event_response(ev, db, user_id) for ev in ordered_events]
