import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Boolean, Float, Integer, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class Event(Base):
    __tablename__ = "events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    cluster_id = Column(String(36), index=True, nullable=True)
    title = Column(String(500), nullable=False, index=True)
    
    # AI Structured Analysis
    summary = Column(Text, nullable=False) # What happened
    why_it_matters = Column(Text, nullable=False) # Why it matters
    who_is_affected = Column(Text, nullable=False) # Who is affected
    what_to_watch = Column(Text, nullable=False) # What to watch next (explicit analysis)
    
    # Classification & Geo
    category = Column(String(100), nullable=False, index=True)
    secondary_categories = Column(JSON, default=list)
    country = Column(String(100), nullable=True, index=True)
    region = Column(String(100), nullable=True, index=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Assessment
    importance_level = Column(String(20), default="Medium", index=True) # Critical, High, Medium, Low
    importance_score = Column(Float, default=0.5, index=True) # 0.0 to 1.0
    confidence_status = Column(String(30), default="Single-source") # Corroborated, Developing, Single-source, Disputed
    is_breaking = Column(Boolean, default=False, index=True)
    
    # Sources & Timestamps
    primary_source = Column(String(150), nullable=False)
    primary_url = Column(String(1000), nullable=False)
    article_count = Column(Integer, default=1)
    
    # Additional Context
    key_facts = Column(JSON, default=list) # List of confirmed key bullet points
    timeline = Column(JSON, default=list) # List of {"time": str, "detail": str}
    sentiment = Column(String(50), default="neutral")
    
    # Dates
    published_at = Column(DateTime, nullable=False, index=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    created_at = Column(DateTime, default=utc_now)

    # Relationships
    articles = relationship("Article", back_populates="event", cascade="all, delete-orphan")
    interactions = relationship("UserInteraction", back_populates="event", cascade="all, delete-orphan")

class Article(Base):
    __tablename__ = "articles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    url = Column(String(1000), nullable=False, unique=True, index=True)
    source_name = Column(String(150), nullable=False)
    snippet = Column(Text, nullable=True)
    author = Column(String(200), nullable=True)
    published_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    event = relationship("Event", back_populates="articles")

class UserPreference(Base):
    __tablename__ = "user_preferences"

    id = Column(String(50), primary_key=True, default="default_user")
    preferred_topics = Column(JSON, default=lambda: [
        "Politics & Geopolitics",
        "Technology & AI",
        "Economy & Business",
        "International Conflicts"
    ])
    preferred_regions = Column(JSON, default=lambda: [
        "Global",
        "North America",
        "Europe",
        "Asia-Pacific"
    ])
    briefing_style = Column(String(20), default="detailed") # concise vs detailed
    recommendation_limit = Column(Integer, default=10)
    time_window_hours = Column(Integer, default=24) # 6, 24, 72, 168
    custom_weights = Column(JSON, default=lambda: {
        "recency": 0.25,
        "interest": 0.35,
        "importance": 0.25,
        "corroboration": 0.15
    })
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

class UserInteraction(Base):
    __tablename__ = "user_interactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(50), default="default_user", index=True)
    event_id = Column(String(36), ForeignKey("events.id"), nullable=False, index=True)
    is_saved = Column(Boolean, default=False, index=True)
    is_dismissed = Column(Boolean, default=False, index=True)
    is_read = Column(Boolean, default=False, index=True)
    saved_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    event = relationship("Event", back_populates="interactions")

class DailyBriefing(Base):
    __tablename__ = "daily_briefings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    briefing_date = Column(String(20), nullable=False, index=True) # e.g. "2026-10-23"
    time_window_hours = Column(Integer, default=24)
    title = Column(String(300), nullable=False)
    executive_summary = Column(Text, nullable=False)
    sections = Column(JSON, nullable=False) # categorized digest items
    watch_list = Column(JSON, default=list) # what to watch next
    created_at = Column(DateTime, default=utc_now)

class IngestionLog(Base):
    __tablename__ = "ingestion_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_name = Column(String(150), nullable=False)
    status = Column(String(50), nullable=False) # success, error, empty
    articles_fetched = Column(Integer, default=0)
    new_events_created = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=utc_now, index=True)
