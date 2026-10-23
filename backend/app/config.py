import os
from typing import List, Dict, Any
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "GlobalPulse AI"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "sqlite:///./globalpulse.db"
    
    # News Ingestion Settings
    REFRESH_INTERVAL_MINUTES: int = 20
    MAX_ARTICLES_PER_FEED: int = 15
    REQUEST_TIMEOUT_SECONDS: int = 12
    USER_AGENT: str = "GlobalPulseAI/1.0 (+https://globalpulse.ai; news-aggregator)"
    
    # AI LLM Keys (Optional)
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    LLM_MODEL: str = "gemini-1.5-flash"
    
    # Default Recommendation Weights (Normalized sum = 1.0)
    WEIGHT_RECENCY: float = 0.25
    WEIGHT_INTEREST: float = 0.35
    WEIGHT_IMPORTANCE: float = 0.25
    WEIGHT_CORROBORATION: float = 0.15

    # Categories supported
    SUPPORTED_CATEGORIES: List[str] = [
        "Politics & Geopolitics",
        "International Conflicts",
        "Technology & AI",
        "Economy & Business",
        "Science & Space",
        "Climate & Environment",
        "Sports",
        "Society & Culture"
    ]
    
    # Curated reliable feeds across all categories
    RSS_FEEDS: List[Dict[str, Any]] = [
        # Politics & World
        {
            "name": "BBC News - World",
            "url": "https://feeds.bbci.co.uk/news/world/rss.xml",
            "default_category": "Politics & Geopolitics",
            "reputation": 0.95
        },
        {
            "name": "Al Jazeera English",
            "url": "https://www.aljazeera.com/xml/rss/all.xml",
            "default_category": "Politics & Geopolitics",
            "reputation": 0.90
        },
        {
            "name": "NPR World",
            "url": "https://feeds.npr.org/1004/rss.xml",
            "default_category": "Politics & Geopolitics",
            "reputation": 0.92
        },
        {
            "name": "Deutsche Welle (DW) World",
            "url": "https://rss.dw.com/rdf/rss-en-world",
            "default_category": "Politics & Geopolitics",
            "reputation": 0.90
        },
        # International Conflicts & Geopolitics
        {
            "name": "The Guardian - World",
            "url": "https://www.theguardian.com/world/rss",
            "default_category": "International Conflicts",
            "reputation": 0.94
        },
        # Technology & AI
        {
            "name": "Ars Technica",
            "url": "https://feeds.arstechnica.com/arstechnica/index",
            "default_category": "Technology & AI",
            "reputation": 0.92
        },
        {
            "name": "TechCrunch",
            "url": "https://techcrunch.com/feed/",
            "default_category": "Technology & AI",
            "reputation": 0.90
        },
        {
            "name": "The Verge",
            "url": "https://www.theverge.com/rss/index.xml",
            "default_category": "Technology & AI",
            "reputation": 0.88
        },
        # Economy & Business
        {
            "name": "CNBC World",
            "url": "https://www.cnbc.com/id/100727362/device/rss/rss.html",
            "default_category": "Economy & Business",
            "reputation": 0.92
        },
        {
            "name": "CNBC Top News",
            "url": "https://www.cnbc.com/id/100003114/device/rss/rss.html",
            "default_category": "Economy & Business",
            "reputation": 0.92
        },
        # Science & Space
        {
            "name": "NASA Breaking News",
            "url": "https://www.nasa.gov/news-release/feed/",
            "default_category": "Science & Space",
            "reputation": 0.98
        },
        {
            "name": "Phys.org Science",
            "url": "https://phys.org/rss-feed/",
            "default_category": "Science & Space",
            "reputation": 0.90
        },
        # Climate & Environment
        {
            "name": "The Guardian - Environment",
            "url": "https://www.theguardian.com/environment/rss",
            "default_category": "Climate & Environment",
            "reputation": 0.94
        },
        # Sports
        {
            "name": "BBC Sport",
            "url": "https://feeds.bbci.co.uk/sport/rss.xml",
            "default_category": "Sports",
            "reputation": 0.92
        },
        {
            "name": "ESPN Top News",
            "url": "https://www.espn.com/espn/rss/news",
            "default_category": "Sports",
            "reputation": 0.90
        }
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
