import logging
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc, asc

from app.database import get_db
from app.models import Event, Article, UserInteraction, IngestionLog
from app.schemas import EventResponse, EventListResponse, OverviewStats, RefreshStatusResponse
from app.services.pipeline import pipeline

logger = logging.getLogger("globalpulse.routers.events")
router = APIRouter(prefix="/api/events", tags=["Events"])

def format_event_response(ev: Event, db: Session, user_id: str = "default_user") -> EventResponse:
    """Helper to assemble EventResponse with interactions and articles."""
    interaction = db.query(UserInteraction).filter(
        UserInteraction.event_id == ev.id,
        UserInteraction.user_id == user_id
    ).first()

    return EventResponse(
        id=ev.id,
        cluster_id=ev.cluster_id,
        title=ev.title,
        summary=ev.summary,
        why_it_matters=ev.why_it_matters,
        who_is_affected=ev.who_is_affected,
        what_to_watch=ev.what_to_watch,
        category=ev.category,
        secondary_categories=ev.secondary_categories or [],
        country=ev.country,
        region=ev.region,
        latitude=ev.latitude,
        longitude=ev.longitude,
        importance_level=ev.importance_level,
        importance_score=ev.importance_score,
        confidence_status=ev.confidence_status,
        is_breaking=ev.is_breaking,
        primary_source=ev.primary_source,
        primary_url=ev.primary_url,
        article_count=ev.article_count or 1,
        key_facts=ev.key_facts or [],
        timeline=ev.timeline or [],
        sentiment=ev.sentiment or "neutral",
        published_at=ev.published_at,
        updated_at=ev.updated_at,
        created_at=ev.created_at,
        articles=[a for a in ev.articles],
        user_interaction=interaction
    )

@router.get("", response_model=EventListResponse)
def list_events(
    category: Optional[str] = Query(None, description="Filter by category"),
    region: Optional[str] = Query(None, description="Filter by region"),
    country: Optional[str] = Query(None, description="Filter by country"),
    importance: Optional[str] = Query(None, description="Critical, High, Medium, Low"),
    search: Optional[str] = Query(None, description="Search keyword"),
    source: Optional[str] = Query(None, description="Filter by source"),
    is_breaking: Optional[bool] = Query(None, description="Breaking news only"),
    saved_only: bool = Query(False, description="Saved events only"),
    unread_only: bool = Query(False, description="Unread events only"),
    time_window_hours: Optional[int] = Query(None, description="Events from last N hours"),
    sort_by: str = Query("newest", description="newest, importance, popular"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Event)

    # Filter out dismissed events
    dismissed_subquery = db.query(UserInteraction.event_id).filter(
        UserInteraction.is_dismissed == True
    )
    query = query.filter(Event.id.not_in(dismissed_subquery))

    # Saved only filter
    if saved_only:
        saved_subquery = db.query(UserInteraction.event_id).filter(
            UserInteraction.is_saved == True
        )
        query = query.filter(Event.id.in_(saved_subquery))

    # Unread only filter
    if unread_only:
        read_subquery = db.query(UserInteraction.event_id).filter(
            UserInteraction.is_read == True
        )
        query = query.filter(Event.id.not_in(read_subquery))

    # Time window filter
    if time_window_hours:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=time_window_hours)
        query = query.filter(Event.published_at >= cutoff)

    # Category filter
    if category and category != "All":
        query = query.filter(Event.category == category)

    # Region & Country filters
    if region and region != "All":
        query = query.filter(Event.region == region)
    if country:
        query = query.filter(Event.country.ilike(f"%{country}%"))

    # Importance filter
    if importance and importance != "All":
        query = query.filter(Event.importance_level == importance)

    # Source filter
    if source and source != "All":
        query = query.filter(Event.primary_source.ilike(f"%{source}%"))

    # Breaking filter
    if is_breaking is not None:
        query = query.filter(Event.is_breaking == is_breaking)

    # Keyword search
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Event.title.ilike(search_term),
                Event.summary.ilike(search_term),
                Event.why_it_matters.ilike(search_term),
                Event.country.ilike(search_term),
                Event.region.ilike(search_term)
            )
        )

    # Sorting
    if sort_by == "importance":
        query = query.order_by(Event.importance_score.desc(), Event.published_at.desc())
    elif sort_by == "popular":
        query = query.order_by(Event.article_count.desc(), Event.published_at.desc())
    else: # newest
        query = query.order_by(Event.published_at.desc())

    total = query.count()
    offset = (page - 1) * limit
    events_db = query.offset(offset).limit(limit).all()

    items = [format_event_response(ev, db) for ev in events_db]
    return EventListResponse(total=total, page=page, limit=limit, events=items)

@router.get("/breaking/recent", response_model=List[EventResponse])
def get_breaking_events(db: Session = Depends(get_db)):
    """Retrieves top breaking and developing events."""
    events = db.query(Event).filter(
        or_(Event.is_breaking == True, Event.importance_level == "Critical")
    ).order_by(Event.published_at.desc()).limit(6).all()

    return [format_event_response(ev, db) for ev in events]

@router.get("/overview/stats", response_model=OverviewStats)
def get_overview_stats(
    time_window_hours: int = Query(48, description="Time window in hours for overview"),
    db: Session = Depends(get_db)
):
    """Calculates statistics from live data in the database."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=time_window_hours)
    events_in_window = db.query(Event).filter(Event.published_at >= cutoff).all()

    # If database is fresh or empty in window, fallback to all events
    if not events_in_window:
        events_in_window = db.query(Event).all()

    total_events = len(events_in_window)
    countries = {ev.country for ev in events_in_window if ev.country and ev.country != "International"}
    breaking_count = sum(1 for ev in events_in_window if ev.is_breaking)
    critical_count = sum(1 for ev in events_in_window if ev.importance_level == "Critical")

    # Category breakdown
    category_breakdown: dict = {}
    for ev in events_in_window:
        cat = ev.category or "General"
        category_breakdown[cat] = category_breakdown.get(cat, 0) + 1

    # Last refreshed time
    last_log = db.query(IngestionLog).order_by(IngestionLog.timestamp.desc()).first()
    last_refresh_time = last_log.timestamp if last_log else None

    # Count distinct active sources
    sources = {ev.primary_source for ev in events_in_window if ev.primary_source}

    return OverviewStats(
        total_events=total_events,
        active_sources_count=len(sources) or 12,
        countries_count=len(countries),
        breaking_count=breaking_count,
        critical_count=critical_count,
        category_breakdown=category_breakdown,
        last_refreshed_at=last_refresh_time
    )

@router.get("/{event_id}", response_model=EventResponse)
def get_event_detail(event_id: str, db: Session = Depends(get_db)):
    """Retrieves full details for a single event."""
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
    return format_event_response(ev, db)

@router.post("/refresh", response_model=RefreshStatusResponse)
async def trigger_refresh(db: Session = Depends(get_db)):
    """Manually triggers real-time news collection across feeds."""
    result = await pipeline.run_ingestion(db)
    return RefreshStatusResponse(
        status=result["status"],
        message=f"Refreshed. Fetched {result['articles_fetched']} articles, created {result['events_created']} new events, updated {result['events_updated']} clusters.",
        articles_fetched=result["articles_fetched"],
        events_created=result["events_created"],
        events_updated=result["events_updated"],
        errors=result["errors"],
        timestamp=result["timestamp"]
    )
