import logging
from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Event, UserPreference, UserInteraction
from app.schemas import EventResponse, UserInteractionUpdate
from app.services.recommender import recommender
from app.routers.events import format_event_response

logger = logging.getLogger("globalpulse.routers.recommendations")
router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])

def get_or_create_preferences(db: Session, user_id: str = "default_user") -> UserPreference:
    pref = db.query(UserPreference).filter(UserPreference.id == user_id).first()
    if not pref:
        pref = UserPreference(id=user_id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref

@router.get("", response_model=List[EventResponse])
def get_recommendations(
    limit: int = Query(10, ge=1, le=50),
    user_id: str = "default_user",
    db: Session = Depends(get_db)
):
    """
    Produces personalized recommendations with transparent plain English explanations.
    """
    pref = get_or_create_preferences(db, user_id)

    # Exclude dismissed events
    dismissed_ids = {
        row[0] for row in db.query(UserInteraction.event_id).filter(
            UserInteraction.user_id == user_id,
            UserInteraction.is_dismissed == True
        ).all()
    }

    # Fetch candidate events (recent 7 days)
    events = db.query(Event).filter(Event.id.not_in(dismissed_ids)).order_by(
        Event.published_at.desc()
    ).limit(100).all()

    if not events:
        return []

    ranked = recommender.rank_events_for_user(events, pref, limit=pref.recommendation_limit or limit)

    response_items = []
    for ev, score, reason in ranked:
        formatted = format_event_response(ev, db, user_id)
        formatted.recommendation_score = score
        formatted.recommendation_reason = reason
        response_items.append(formatted)

    return response_items

@router.post("/{event_id}/dismiss")
def dismiss_event(
    event_id: str,
    user_id: str = "default_user",
    db: Session = Depends(get_db)
):
    """Dismisses an event from the user's feed."""
    interaction = db.query(UserInteraction).filter(
        UserInteraction.event_id == event_id,
        UserInteraction.user_id == user_id
    ).first()

    if not interaction:
        interaction = UserInteraction(event_id=event_id, user_id=user_id)
        db.add(interaction)

    interaction.is_dismissed = True
    db.commit()
    return {"status": "success", "message": "Event dismissed"}

@router.post("/{event_id}/save")
def toggle_save_event(
    event_id: str,
    user_id: str = "default_user",
    db: Session = Depends(get_db)
):
    """Toggles bookmark/saved status on an event."""
    interaction = db.query(UserInteraction).filter(
        UserInteraction.event_id == event_id,
        UserInteraction.user_id == user_id
    ).first()

    if not interaction:
        interaction = UserInteraction(
            event_id=event_id,
            user_id=user_id,
            is_saved=True,
            saved_at=datetime.now(timezone.utc)
        )
        db.add(interaction)
    else:
        interaction.is_saved = not interaction.is_saved
        interaction.saved_at = datetime.now(timezone.utc) if interaction.is_saved else None

    db.commit()
    db.refresh(interaction)
    return {"status": "success", "is_saved": interaction.is_saved}

@router.post("/{event_id}/read")
def mark_event_read(
    event_id: str,
    user_id: str = "default_user",
    db: Session = Depends(get_db)
):
    """Marks an event as read."""
    interaction = db.query(UserInteraction).filter(
        UserInteraction.event_id == event_id,
        UserInteraction.user_id == user_id
    ).first()

    if not interaction:
        interaction = UserInteraction(
            event_id=event_id,
            user_id=user_id,
            is_read=True,
            read_at=datetime.now(timezone.utc)
        )
        db.add(interaction)
    else:
        interaction.is_read = True
        interaction.read_at = datetime.now(timezone.utc)

    db.commit()
    return {"status": "success", "is_read": True}
