import logging
import traceback
from typing import Dict, Any, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.config import settings
from app.models import Event, Article, IngestionLog
from app.services.rss_parser import rss_service
from app.services.deduplication import are_articles_similar
from app.services.ai_analyzer import ai_analyzer

logger = logging.getLogger("globalpulse.pipeline")

class IngestionPipeline:
    """Coordinates fetching, deduplication, AI analysis, clustering, and storage."""

    async def run_ingestion(self, db: Session) -> Dict[str, Any]:
        logger.info("Starting live news ingestion pipeline...")
        articles_raw = await rss_service.fetch_all_feeds()

        total_fetched = len(articles_raw)
        created_count = 0
        updated_count = 0
        errors = []

        # Get existing URLs to avoid duplicate processing
        existing_urls = {
            url[0] for url in db.query(Article.url).all()
        }

        # Query recent events for clustering comparison (past 48 hours)
        recent_events = db.query(Event).order_by(Event.published_at.desc()).limit(150).all()

        for art in articles_raw:
            url = art["url"]
            if url in existing_urls:
                continue

            try:
                title = art["title"]
                snippet = art["snippet"]
                source_name = art["source_name"]
                published_at = art["published_at"]
                default_cat = art["feed_category"]

                # 1. Deduplication / Event clustering check against recent events
                matched_event: Event = None
                for candidate in recent_events:
                    is_match, score = are_articles_similar(
                        title1=title,
                        snippet1=snippet,
                        date1=published_at,
                        title2=candidate.title,
                        snippet2=candidate.summary,
                        date2=candidate.published_at
                    )
                    if is_match:
                        matched_event = candidate
                        break

                if matched_event:
                    # Group this report into the existing event
                    new_article = Article(
                        event_id=matched_event.id,
                        title=title,
                        url=url,
                        source_name=source_name,
                        snippet=snippet,
                        author=art.get("author"),
                        published_at=published_at
                    )
                    db.add(new_article)
                    existing_urls.add(url)

                    # Update event stats
                    matched_event.article_count = (matched_event.article_count or 1) + 1
                    matched_event.confidence_status = "Corroborated"
                    if published_at > (matched_event.updated_at or matched_event.published_at):
                        matched_event.updated_at = published_at

                    # If not already present, append corroborating source link to key facts
                    fact_note = f"Also reported by {source_name}."
                    if matched_event.key_facts and fact_note not in matched_event.key_facts:
                        matched_event.key_facts.append(fact_note)

                    updated_count += 1
                else:
                    # 2. AI Analysis for new unique event
                    analysis = await ai_analyzer.analyze_event(
                        title=title,
                        snippet=snippet,
                        source_name=source_name,
                        default_cat=default_cat
                    )

                    new_event = Event(
                        title=analysis["headline"] or title,
                        summary=analysis["summary"],
                        why_it_matters=analysis["why_it_matters"],
                        who_is_affected=analysis["who_is_affected"],
                        what_to_watch=analysis["what_to_watch"],
                        category=analysis["category"],
                        secondary_categories=analysis["secondary_categories"],
                        country=analysis["country"],
                        region=analysis["region"],
                        latitude=analysis["latitude"],
                        longitude=analysis["longitude"],
                        importance_level=analysis["importance_level"],
                        importance_score=analysis["importance_score"],
                        confidence_status=analysis["confidence_status"],
                        is_breaking=analysis["is_breaking"],
                        primary_source=source_name,
                        primary_url=url,
                        article_count=1,
                        key_facts=analysis["key_facts"],
                        timeline=[{
                            "time": published_at.strftime("%H:%M UTC"),
                            "detail": f"Initial report published by {source_name}"
                        }],
                        sentiment=analysis["sentiment"],
                        published_at=published_at,
                        updated_at=published_at
                    )
                    db.add(new_event)
                    db.flush() # obtain new_event.id

                    new_article = Article(
                        event_id=new_event.id,
                        title=title,
                        url=url,
                        source_name=source_name,
                        snippet=snippet,
                        author=art.get("author"),
                        published_at=published_at
                    )
                    db.add(new_article)
                    existing_urls.add(url)
                    recent_events.insert(0, new_event)
                    created_count += 1

            except Exception as e:
                err_msg = f"Failed processing article '{art.get('title')}': {str(e)}"
                logger.error(err_msg)
                errors.append(err_msg)

        try:
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Database commit failed: {e}")
            errors.append(f"DB commit error: {e}")

        # Record ingestion log
        log_entry = IngestionLog(
            source_name="Multi-Source Pipeline",
            status="success" if not errors else "partial",
            articles_fetched=total_fetched,
            new_events_created=created_count,
            error_message="; ".join(errors[:5]) if errors else None,
            timestamp=datetime.now(timezone.utc)
        )
        db.add(log_entry)
        db.commit()

        logger.info(
            f"Ingestion completed. Fetched: {total_fetched}, Created: {created_count}, Grouped: {updated_count}"
        )

        return {
            "status": "success" if not errors else "partial",
            "articles_fetched": total_fetched,
            "events_created": created_count,
            "events_updated": updated_count,
            "errors": errors[:5],
            "timestamp": datetime.now(timezone.utc)
        }

pipeline = IngestionPipeline()
