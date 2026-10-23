import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models import Event, DailyBriefing

logger = logging.getLogger("globalpulse.briefing_service")

class BriefingService:
    """Generates structured daily briefings from ingested and analyzed events."""

    def generate_daily_briefing(
        self,
        db: Session,
        time_window_hours: int = 24,
        force_regenerate: bool = False
    ) -> DailyBriefing:
        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")

        # Check existing briefing for today with same time window if not forced
        if not force_regenerate:
            existing = db.query(DailyBriefing).filter(
                DailyBriefing.briefing_date == today_str,
                DailyBriefing.time_window_hours == time_window_hours
            ).first()
            if existing:
                return existing

        # Query events within time window
        cutoff = now - timedelta(hours=time_window_hours)
        events = db.query(Event).filter(Event.published_at >= cutoff).order_by(
            Event.importance_score.desc(),
            Event.published_at.desc()
        ).all()

        # If few events in window, widen cutoff slightly to ensure meaningful briefing
        if len(events) < 5:
            events = db.query(Event).order_by(
                Event.importance_score.desc(),
                Event.published_at.desc()
            ).limit(25).all()

        # Organize into the 5 core sections
        top_developments = []
        politics_intl = []
        tech_ai = []
        economy_biz = []
        science_climate = []
        watch_list = []

        for ev in events:
            item = {
                "event_id": ev.id,
                "headline": ev.title,
                "summary": ev.summary,
                "why_it_matters": ev.why_it_matters,
                "source_name": ev.primary_source,
                "source_url": ev.primary_url,
                "category": ev.category,
                "importance_level": ev.importance_level
            }

            # Top global developments (Critical / High score items)
            if (ev.importance_level == "Critical" or ev.is_breaking) and len(top_developments) < 4:
                top_developments.append(item)

            # Categorized sections
            if ev.category in ["Politics & Geopolitics", "International Conflicts"] and len(politics_intl) < 5:
                politics_intl.append(item)
            elif ev.category == "Technology & AI" and len(tech_ai) < 4:
                tech_ai.append(item)
            elif ev.category == "Economy & Business" and len(economy_biz) < 4:
                economy_biz.append(item)
            elif ev.category in ["Science & Space", "Climate & Environment", "Society & Culture"] and len(science_climate) < 4:
                science_climate.append(item)

            # Collect forward-looking watchpoints
            if ev.what_to_watch and len(watch_list) < 6:
                watch_bullet = f"[{ev.category}] {ev.what_to_watch}"
                if watch_bullet not in watch_list:
                    watch_list.append(watch_bullet)

        # If top_developments is empty, fill with top 3 overall
        if not top_developments and events:
            top_developments = [
                {
                    "event_id": ev.id,
                    "headline": ev.title,
                    "summary": ev.summary,
                    "why_it_matters": ev.why_it_matters,
                    "source_name": ev.primary_source,
                    "source_url": ev.primary_url,
                    "category": ev.category,
                    "importance_level": ev.importance_level
                }
                for ev in events[:3]
            ]

        sections = [
            {"category_title": "Top Global Developments", "items": top_developments},
            {"category_title": "Politics & International Relations", "items": politics_intl},
            {"category_title": "Technology & AI", "items": tech_ai},
            {"category_title": "Economy & Business", "items": economy_biz},
            {"category_title": "Science, Climate & Society", "items": science_climate}
        ]

        # Generate cohesive executive summary
        exec_summary = (
            f"GlobalPulse Intelligence Briefing for {now.strftime('%B %d, %Y')}. "
            f"Over the last {time_window_hours} hours, our real-time monitoring ingested and evaluated coverage across international sources. "
            f"High-priority monitoring focuses on {len(top_developments)} critical situations, alongside major policy, economic, and technological milestones."
        )

        briefing = DailyBriefing(
            briefing_date=today_str,
            time_window_hours=time_window_hours,
            title=f"Global Briefing — {now.strftime('%A, %b %d, %Y')}",
            executive_summary=exec_summary,
            sections=sections,
            watch_list=watch_list
        )

        db.add(briefing)
        db.commit()
        db.refresh(briefing)
        return briefing

briefing_service = BriefingService()
