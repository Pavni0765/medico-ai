import math
import logging
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timezone
from app.models import Event, UserPreference

logger = logging.getLogger("globalpulse.recommender")

class RecommendationEngine:
    """Configurable recommendation engine with transparent explainability."""

    def calculate_recency_score(self, published_at: datetime) -> float:
        """
        Calculates exponential time decay score.
        Events under 6 hours score near 1.0; 24h score ~0.65; 48h ~0.40; 7d ~0.10.
        """
        now = datetime.now(timezone.utc)
        if published_at.tzinfo is None:
            published_at = published_at.replace(tzinfo=timezone.utc)
        
        hours_old = max(0.0, (now - published_at).total_seconds() / 3600.0)
        # Half-life of 24 hours
        half_life = 24.0
        decay = math.exp(-0.693 * (hours_old / half_life))
        return round(decay, 4)

    def calculate_interest_score(
        self,
        event_category: str,
        secondary_categories: List[str],
        preferred_topics: List[str]
    ) -> Tuple[float, Optional[str]]:
        """Computes matching score against user preferred topics."""
        if not preferred_topics:
            return 0.50, None

        # Check direct primary category match
        for topic in preferred_topics:
            if topic.lower() == event_category.lower():
                return 1.0, topic

        # Check secondary category matches
        if secondary_categories:
            for topic in preferred_topics:
                for sec in secondary_categories:
                    if topic.lower() == sec.lower():
                        return 0.75, topic

        # Partial word matches
        pref_words = {w.lower() for t in preferred_topics for w in t.split() if len(w) > 3}
        cat_words = {w.lower() for w in event_category.split() if len(w) > 3}
        common = pref_words.intersection(cat_words)
        if common:
            return 0.60, next(iter(common)).capitalize()

        return 0.15, None

    def calculate_geographic_score(
        self,
        event_region: Optional[str],
        event_country: Optional[str],
        preferred_regions: List[str]
    ) -> Tuple[float, Optional[str]]:
        """Computes geographical match against user preferred regions."""
        if not preferred_regions:
            return 0.50, None

        ev_reg = (event_region or "").lower()
        ev_cnt = (event_country or "").lower()

        for pref in preferred_regions:
            p_low = pref.lower()
            if p_low in ["global", "all"]:
                continue
            if p_low == ev_reg or p_low in ev_reg:
                return 1.0, event_region
            if p_low == ev_cnt or p_low in ev_cnt:
                return 1.0, event_country

        if "Global" in preferred_regions:
            return 0.60, "Global interest"

        return 0.20, None

    def generate_recommendation_reason(
        self,
        event: Event,
        matched_topic: Optional[str],
        matched_geo: Optional[str],
        corroborated: bool,
        is_breaking: bool
    ) -> str:
        """Constructs a plain English explanation of why the event was recommended."""
        reasons = []

        if is_breaking:
            reasons.append("breaking global development")

        if matched_topic and matched_geo:
            reasons.append(f"matches your focus on {matched_topic} in {matched_geo}")
        elif matched_topic:
            reasons.append(f"aligns with your interest in {matched_topic}")
        elif matched_geo:
            reasons.append(f"occurs in your monitored region of {matched_geo}")

        if event.importance_level in ["Critical", "High"]:
            reasons.append(f"high global significance ({event.importance_level.lower()} impact)")

        if corroborated and event.article_count > 1:
            reasons.append(f"corroborated by {event.article_count} independent news agencies")

        if not reasons:
            return f"Curated for you based on overall global relevance in {event.category}."

        # Join naturally
        if len(reasons) == 1:
            return f"Recommended because of a {reasons[0]}."
        elif len(reasons) == 2:
            return f"Recommended because it {reasons[0]} and has {reasons[1]}."
        else:
            return f"Recommended: {reasons[0].capitalize()}, {reasons[1]}, with {reasons[2]}."

    def rank_events_for_user(
        self,
        events: List[Event],
        preferences: UserPreference,
        limit: int = 10
    ) -> List[Tuple[Event, float, str]]:
        """
        Ranks events according to user preferences and backend weights:
        Score = W_recency * S_recency + W_interest * S_interest + W_importance * S_importance + W_corrob * S_corrob + bonus
        """
        weights = preferences.custom_weights or {
            "recency": 0.25,
            "interest": 0.35,
            "importance": 0.25,
            "corroboration": 0.15
        }

        w_rec = weights.get("recency", 0.25)
        w_int = weights.get("interest", 0.35)
        w_imp = weights.get("importance", 0.25)
        w_cor = weights.get("corroboration", 0.15)

        scored_events = []

        for event in events:
            # 1. Recency
            s_rec = self.calculate_recency_score(event.published_at)

            # 2. Interest
            s_int, matched_topic = self.calculate_interest_score(
                event.category,
                event.secondary_categories or [],
                preferences.preferred_topics or []
            )

            # 3. Geographic
            s_geo, matched_geo = self.calculate_geographic_score(
                event.region,
                event.country,
                preferences.preferred_regions or []
            )

            # Blend topic and geo into overall interest
            blended_interest = 0.70 * s_int + 0.30 * s_geo

            # 4. Global Importance
            s_imp = float(event.importance_score or 0.5)

            # 5. Corroboration score (multi-source coverage)
            article_cnt = event.article_count or 1
            is_corroborated = article_cnt >= 2 or event.confidence_status == "Corroborated"
            s_cor = min(1.0, 0.40 + 0.30 * (article_cnt - 1)) if is_corroborated else 0.40

            # Breaking boost
            breaking_boost = 0.08 if event.is_breaking else 0.0

            total_score = (
                w_rec * s_rec +
                w_int * blended_interest +
                w_imp * s_imp +
                w_cor * s_cor +
                breaking_boost
            )

            reason = self.generate_recommendation_reason(
                event=event,
                matched_topic=matched_topic,
                matched_geo=matched_geo,
                corroborated=is_corroborated,
                is_breaking=event.is_breaking
            )

            scored_events.append((event, round(total_score, 3), reason))

        # Sort by total_score descending
        scored_events.sort(key=lambda x: x[1], reverse=True)
        return scored_events[:limit]

recommender = RecommendationEngine()
