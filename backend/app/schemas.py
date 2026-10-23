from typing import List, Dict, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field

class ArticleSchema(BaseModel):
    id: str
    event_id: str
    title: str
    url: str
    source_name: str
    snippet: Optional[str] = None
    author: Optional[str] = None
    published_at: datetime

    class Config:
        from_attributes = True

class UserInteractionSchema(BaseModel):
    is_saved: bool = False
    is_dismissed: bool = False
    is_read: bool = False
    saved_at: Optional[datetime] = None
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class EventResponse(BaseModel):
    id: str
    cluster_id: Optional[str] = None
    title: str
    summary: str
    why_it_matters: str
    who_is_affected: str
    what_to_watch: str
    category: str
    secondary_categories: List[str] = []
    country: Optional[str] = None
    region: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    importance_level: str
    importance_score: float
    confidence_status: str
    is_breaking: bool
    primary_source: str
    primary_url: str
    article_count: int = 1
    key_facts: List[str] = []
    timeline: List[Dict[str, str]] = []
    sentiment: str = "neutral"
    published_at: datetime
    updated_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    articles: List[ArticleSchema] = []
    user_interaction: Optional[UserInteractionSchema] = None
    
    # Recommendation dynamic fields
    recommendation_score: Optional[float] = None
    recommendation_reason: Optional[str] = None

    class Config:
        from_attributes = True

class EventListResponse(BaseModel):
    total: int
    page: int
    limit: int
    events: List[EventResponse]

class UserPreferenceSchema(BaseModel):
    id: str = "default_user"
    preferred_topics: List[str]
    preferred_regions: List[str]
    briefing_style: str = "detailed"
    recommendation_limit: int = 10
    time_window_hours: int = 24
    custom_weights: Dict[str, float]
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserPreferenceUpdate(BaseModel):
    preferred_topics: Optional[List[str]] = None
    preferred_regions: Optional[List[str]] = None
    briefing_style: Optional[str] = None
    recommendation_limit: Optional[int] = None
    time_window_hours: Optional[int] = None
    custom_weights: Optional[Dict[str, float]] = None

class UserInteractionUpdate(BaseModel):
    is_saved: Optional[bool] = None
    is_dismissed: Optional[bool] = None
    is_read: Optional[bool] = None

class BriefingSectionItem(BaseModel):
    event_id: str
    headline: str
    summary: str
    why_it_matters: str
    source_name: str
    source_url: str
    category: str
    importance_level: str

class BriefingSection(BaseModel):
    category_title: str
    items: List[BriefingSectionItem]

class DailyBriefingResponse(BaseModel):
    id: str
    briefing_date: str
    time_window_hours: int
    title: str
    executive_summary: str
    sections: List[BriefingSection]
    watch_list: List[str]
    created_at: datetime

    class Config:
        from_attributes = True

class OverviewStats(BaseModel):
    total_events: int
    active_sources_count: int
    countries_count: int
    breaking_count: int
    critical_count: int
    category_breakdown: Dict[str, int]
    last_refreshed_at: Optional[datetime] = None

class RefreshStatusResponse(BaseModel):
    status: str
    message: str
    articles_fetched: int
    events_created: int
    events_updated: int
    errors: List[str] = []
    timestamp: datetime
