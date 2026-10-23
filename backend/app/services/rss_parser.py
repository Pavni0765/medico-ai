import logging
import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import feedparser
import httpx
from bs4 import BeautifulSoup
from dateutil import parser as date_parser
from app.config import settings

logger = logging.getLogger("globalpulse.rss_parser")

def clean_html(text: Optional[str]) -> str:
    """Strips HTML tags and normalizes whitespace."""
    if not text:
        return ""
    try:
        soup = BeautifulSoup(text, "html.parser")
        # Remove script and style tags
        for element in soup(["script", "style", "figure", "img"]):
            element.decompose()
        cleaned = soup.get_text(separator=" ")
        # Clean extra spaces
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned
    except Exception:
        # Fallback to regex if bs4 fails
        cleaned = re.sub(r"<[^>]+>", " ", text)
        return re.sub(r"\s+", " ", cleaned).strip()

# Timezone abbreviations mapping for robust date parsing
TZ_INFOS = {
    "EST": -5 * 3600,
    "EDT": -4 * 3600,
    "CST": -6 * 3600,
    "CDT": -5 * 3600,
    "MST": -7 * 3600,
    "MDT": -6 * 3600,
    "PST": -8 * 3600,
    "PDT": -7 * 3600,
    "GMT": 0,
    "UTC": 0,
    "BST": 1 * 3600,
    "CET": 1 * 3600,
    "CEST": 2 * 3600
}

def parse_published_date(entry: Dict[str, Any]) -> datetime:
    """Extracts and normalizes publication date to UTC datetime."""
    # Check common feedparser date fields
    for field in ["published", "updated", "created", "pubDate"]:
        val = entry.get(field)
        if val:
            try:
                parsed_dt = date_parser.parse(val, tzinfos=TZ_INFOS)
                if parsed_dt.tzinfo is None:
                    parsed_dt = parsed_dt.replace(tzinfo=timezone.utc)
                else:
                    parsed_dt = parsed_dt.astimezone(timezone.utc)
                return parsed_dt
            except Exception:
                continue

    # Check parsed struct_time if available
    for field in ["published_parsed", "updated_parsed"]:
        time_struct = entry.get(field)
        if time_struct:
            try:
                dt = datetime(*time_struct[:6], tzinfo=timezone.utc)
                return dt
            except Exception:
                continue

    # Default to current UTC time if unavailable
    return datetime.now(timezone.utc)

class RSSIngestionService:
    def __init__(self):
        self.headers = {
            "User-Agent": settings.USER_AGENT,
            "Accept": "application/rss+xml, application/xml, text/xml, application/atom+xml, */*"
        }

    async def fetch_feed(self, feed_meta: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Fetches and parses a single RSS feed."""
        name = feed_meta["name"]
        url = feed_meta["url"]
        default_cat = feed_meta.get("default_category", "Politics & Geopolitics")
        reputation = feed_meta.get("reputation", 0.90)

        articles = []
        try:
            async with httpx.AsyncClient(
                headers=self.headers,
                timeout=settings.REQUEST_TIMEOUT_SECONDS,
                follow_redirects=True,
                verify=False # avoid SSL certificate failures on diverse public RSS feeds
            ) as client:
                response = await client.get(url)
                if response.status_code != 200:
                    logger.warning(f"Feed {name} returned status {response.status_code}")
                    return []
                content = response.text

            # Parse with feedparser
            feed = feedparser.parse(content)
            if not feed.entries:
                logger.info(f"Feed {name} returned 0 entries.")
                return []

            for entry in feed.entries[:settings.MAX_ARTICLES_PER_FEED]:
                title = clean_html(entry.get("title", ""))
                link = entry.get("link", "")
                if not title or not link:
                    continue

                # Get description or content snippet
                snippet = clean_html(
                    entry.get("summary") or 
                    entry.get("description") or 
                    (entry.get("content") and entry["content"][0].get("value")) or 
                    ""
                )
                
                # Truncate overly long snippets
                if len(snippet) > 1000:
                    snippet = snippet[:997] + "..."

                author = entry.get("author") or name
                pub_date = parse_published_date(entry)

                articles.append({
                    "title": title,
                    "url": link,
                    "source_name": name,
                    "snippet": snippet,
                    "author": author,
                    "published_at": pub_date,
                    "feed_category": default_cat,
                    "reputation": reputation
                })

            logger.info(f"Fetched {len(articles)} articles from {name}")
            return articles

        except Exception as e:
            logger.error(f"Error fetching feed {name} ({url}): {str(e)}")
            return []

    async def fetch_all_feeds(self, custom_feeds: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
        """Fetches articles from all configured RSS feeds concurrently."""
        feeds = custom_feeds or settings.RSS_FEEDS
        import asyncio

        tasks = [self.fetch_feed(f) for f in feeds]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_articles = []
        for r in results:
            if isinstance(r, list):
                all_articles.extend(r)
            elif isinstance(r, Exception):
                logger.error(f"Task raised exception: {r}")

        logger.info(f"Total articles fetched across {len(feeds)} feeds: {len(all_articles)}")
        return all_articles

rss_service = RSSIngestionService()
