import json
import logging
import re
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from app.config import settings

logger = logging.getLogger("globalpulse.ai_analyzer")

# Geographic coordinates database for major countries, regions, and geopolitical centers
GEO_LOCATIONS: Dict[str, Dict[str, Any]] = {
    # North America
    "united states": {"country": "United States", "region": "North America", "lat": 38.8951, "lon": -77.0364},
    "us": {"country": "United States", "region": "North America", "lat": 38.8951, "lon": -77.0364},
    "usa": {"country": "United States", "region": "North America", "lat": 38.8951, "lon": -77.0364},
    "washington": {"country": "United States", "region": "North America", "lat": 38.8951, "lon": -77.0364},
    "new york": {"country": "United States", "region": "North America", "lat": 40.7128, "lon": -74.0060},
    "california": {"country": "United States", "region": "North America", "lat": 36.7783, "lon": -119.4179},
    "canada": {"country": "Canada", "region": "North America", "lat": 45.4215, "lon": -75.6972},
    "ottawa": {"country": "Canada", "region": "North America", "lat": 45.4215, "lon": -75.6972},
    "mexico": {"country": "Mexico", "region": "Latin America", "lat": 19.4326, "lon": -99.1332},
    
    # Europe
    "united kingdom": {"country": "United Kingdom", "region": "Europe", "lat": 51.5074, "lon": -0.1278},
    "uk": {"country": "United Kingdom", "region": "Europe", "lat": 51.5074, "lon": -0.1278},
    "britain": {"country": "United Kingdom", "region": "Europe", "lat": 51.5074, "lon": -0.1278},
    "london": {"country": "United Kingdom", "region": "Europe", "lat": 51.5074, "lon": -0.1278},
    "france": {"country": "France", "region": "Europe", "lat": 48.8566, "lon": 2.3522},
    "paris": {"country": "France", "region": "Europe", "lat": 48.8566, "lon": 2.3522},
    "germany": {"country": "Germany", "region": "Europe", "lat": 52.5200, "lon": 13.4050},
    "berlin": {"country": "Germany", "region": "Europe", "lat": 52.5200, "lon": 13.4050},
    "brussels": {"country": "Belgium", "region": "Europe", "lat": 50.8503, "lon": 4.3517},
    "european union": {"country": "European Union", "region": "Europe", "lat": 50.8503, "lon": 4.3517},
    "eu": {"country": "European Union", "region": "Europe", "lat": 50.8503, "lon": 4.3517},
    "ukraine": {"country": "Ukraine", "region": "Europe", "lat": 50.4501, "lon": 30.5234},
    "kyiv": {"country": "Ukraine", "region": "Europe", "lat": 50.4501, "lon": 30.5234},
    "russia": {"country": "Russia", "region": "Eurasia", "lat": 55.7558, "lon": 37.6173},
    "moscow": {"country": "Russia", "region": "Eurasia", "lat": 55.7558, "lon": 37.6173},
    "geneva": {"country": "Switzerland", "region": "Europe", "lat": 46.2044, "lon": 6.1432},
    "switzerland": {"country": "Switzerland", "region": "Europe", "lat": 46.8182, "lon": 8.2275},
    "italy": {"country": "Italy", "region": "Europe", "lat": 41.9028, "lon": 12.4964},
    "rome": {"country": "Italy", "region": "Europe", "lat": 41.9028, "lon": 12.4964},
    "spain": {"country": "Spain", "region": "Europe", "lat": 40.4168, "lon": -3.7038},
    "poland": {"country": "Poland", "region": "Europe", "lat": 52.2297, "lon": 21.0122},
    "warsaw": {"country": "Poland", "region": "Europe", "lat": 52.2297, "lon": 21.0122},

    # Asia & Pacific
    "china": {"country": "China", "region": "Asia-Pacific", "lat": 39.9042, "lon": 116.4074},
    "beijing": {"country": "China", "region": "Asia-Pacific", "lat": 39.9042, "lon": 116.4074},
    "taiwan": {"country": "Taiwan", "region": "Asia-Pacific", "lat": 25.0330, "lon": 121.5654},
    "taipei": {"country": "Taiwan", "region": "Asia-Pacific", "lat": 25.0330, "lon": 121.5654},
    "japan": {"country": "Japan", "region": "Asia-Pacific", "lat": 35.6762, "lon": 139.6503},
    "tokyo": {"country": "Japan", "region": "Asia-Pacific", "lat": 35.6762, "lon": 139.6503},
    "south korea": {"country": "South Korea", "region": "Asia-Pacific", "lat": 37.5665, "lon": 126.9780},
    "seoul": {"country": "South Korea", "region": "Asia-Pacific", "lat": 37.5665, "lon": 126.9780},
    "north korea": {"country": "North Korea", "region": "Asia-Pacific", "lat": 39.0392, "lon": 125.7625},
    "pyongyang": {"country": "North Korea", "region": "Asia-Pacific", "lat": 39.0392, "lon": 125.7625},
    "india": {"country": "India", "region": "South Asia", "lat": 28.6139, "lon": 77.2090},
    "delhi": {"country": "India", "region": "South Asia", "lat": 28.6139, "lon": 77.2090},
    "australia": {"country": "Australia", "region": "Oceania", "lat": -35.2809, "lon": 149.1300},
    "canberra": {"country": "Australia", "region": "Oceania", "lat": -35.2809, "lon": 149.1300},
    "singapore": {"country": "Singapore", "region": "Southeast Asia", "lat": 1.3521, "lon": 103.8198},

    # Middle East
    "israel": {"country": "Israel", "region": "Middle East", "lat": 31.7683, "lon": 35.2137},
    "jerusalem": {"country": "Israel", "region": "Middle East", "lat": 31.7683, "lon": 35.2137},
    "tel aviv": {"country": "Israel", "region": "Middle East", "lat": 32.0853, "lon": 34.7818},
    "gaza": {"country": "Palestine", "region": "Middle East", "lat": 31.5017, "lon": 34.4668},
    "palestine": {"country": "Palestine", "region": "Middle East", "lat": 31.9038, "lon": 35.2034},
    "lebanon": {"country": "Lebanon", "region": "Middle East", "lat": 33.8938, "lon": 35.5018},
    "beirut": {"country": "Lebanon", "region": "Middle East", "lat": 33.8938, "lon": 35.5018},
    "iran": {"country": "Iran", "region": "Middle East", "lat": 35.6892, "lon": 51.3890},
    "tehran": {"country": "Iran", "region": "Middle East", "lat": 35.6892, "lon": 51.3890},
    "saudi arabia": {"country": "Saudi Arabia", "region": "Middle East", "lat": 24.7136, "lon": 46.6753},
    "riyadh": {"country": "Saudi Arabia", "region": "Middle East", "lat": 24.7136, "lon": 46.6753},
    "uae": {"country": "United Arab Emirates", "region": "Middle East", "lat": 25.2048, "lon": 55.2708},
    "dubai": {"country": "United Arab Emirates", "region": "Middle East", "lat": 25.2048, "lon": 55.2708},
    "qatar": {"country": "Qatar", "region": "Middle East", "lat": 25.2854, "lon": 51.5310},
    "yemen": {"country": "Yemen", "region": "Middle East", "lat": 15.3694, "lon": 44.1910},
    "syria": {"country": "Syria", "region": "Middle East", "lat": 33.5138, "lon": 36.2765},
    "iraq": {"country": "Iraq", "region": "Middle East", "lat": 33.3152, "lon": 44.3661},

    # Africa & Latin America
    "egypt": {"country": "Egypt", "region": "Africa", "lat": 30.0444, "lon": 31.2357},
    "cairo": {"country": "Egypt", "region": "Africa", "lat": 30.0444, "lon": 31.2357},
    "sudan": {"country": "Sudan", "region": "Africa", "lat": 15.5007, "lon": 32.5599},
    "south africa": {"country": "South Africa", "region": "Africa", "lat": -25.7479, "lon": 28.2293},
    "nigeria": {"country": "Nigeria", "region": "Africa", "lat": 9.0765, "lon": 7.3986},
    "kenya": {"country": "Kenya", "region": "Africa", "lat": -1.2921, "lon": 36.8219},
    "brazil": {"country": "Brazil", "region": "Latin America", "lat": -15.8267, "lon": -47.9218},
    "argentina": {"country": "Argentina", "region": "Latin America", "lat": -34.6037, "lon": -58.3816},

    # Global & Space
    "space": {"country": "Outer Space", "region": "Space / Global Orbit", "lat": 0.0, "lon": 0.0},
    "orbit": {"country": "Outer Space", "region": "Space / Global Orbit", "lat": 0.0, "lon": 0.0},
    "moon": {"country": "Lunar Orbit", "region": "Space", "lat": 0.0, "lon": 0.0},
    "mars": {"country": "Mars", "region": "Deep Space", "lat": 0.0, "lon": 0.0}
}

class AIAnalyzer:
    """Intelligent analysis pipeline combining LLM API integration with robust NLP fallbacks."""

    def __init__(self):
        self.gemini_key = settings.GEMINI_API_KEY
        self.openai_key = settings.OPENAI_API_KEY

    def detect_geography(self, text: str) -> Tuple[Optional[str], Optional[str], Optional[float], Optional[float]]:
        """Identifies country, region, and coordinates from text."""
        lower = text.lower()
        # Sort locations by descending name length to match "south korea" before "korea"
        sorted_locs = sorted(GEO_LOCATIONS.items(), key=lambda x: len(x[0]), reverse=True)
        for keyword, data in sorted_locs:
            # Match whole words
            pattern = rf"\b{re.escape(keyword)}\b"
            if re.search(pattern, lower):
                return data["country"], data["region"], data["lat"], data["lon"]

        return "International", "Global", None, None

    def assess_importance(self, title: str, snippet: str, category: str) -> Tuple[str, float, bool]:
        """
        Calculates transparent importance score (0.0 to 1.0) and level based on objective criteria:
        - Scale of human impact (casualties, displaced, widespread emergency)
        - Global geopolitical stakes (summit, treaty, sanctions, military conflict)
        - Market/economic impact (interest rates, default, inflation shock, major tech milestone)
        """
        combined = f"{title} {snippet}".lower()
        score = 0.50
        is_breaking = False

        # Critical indicators (+0.30 to +0.40)
        critical_keywords = [
            "war", "invade", "invasion", "air strike", "missile strike", "state of emergency",
            "nuclear", "martial law", "coup", "earthquake", "catastrophic", "tsunami",
            "massive explosion", "major sanctions", "cyberattack on infrastructure", "breaking:"
        ]
        # High importance indicators (+0.15 to +0.25)
        high_keywords = [
            "treaty", "summit", "ceasefire", "assassination", "indicted", "federal reserve",
            "interest rate", "inflation", "gdp", "breakthrough", "deepfake", "antitrust",
            "un security council", "icc", "climate agreement", "spacex launch", "fda approved"
        ]
        # Routine or low importance (-0.15)
        low_keywords = [
            "opinion", "editorial", "preview", "rumor", "celebrity", "red carpet",
            "box office", "power rankings", "match preview"
        ]

        for kw in critical_keywords:
            if kw in combined:
                score += 0.35
                is_breaking = True
                break

        for kw in high_keywords:
            if kw in combined:
                score += 0.20
                break

        for kw in low_keywords:
            if kw in combined:
                score -= 0.20
                break

        if "breaking" in combined or "just in:" in combined:
            is_breaking = True
            score = max(score, 0.75)

        # Category baseline adjustments
        if category in ["International Conflicts", "Politics & Geopolitics"]:
            score += 0.05
        elif category in ["Sports", "Society & Culture"]:
            score -= 0.05

        score = max(0.1, min(0.98, score))

        if score >= 0.80:
            level = "Critical"
        elif score >= 0.60:
            level = "High"
        elif score >= 0.40:
            level = "Medium"
        else:
            level = "Low"

        return level, round(score, 2), is_breaking

    def infer_category(self, title: str, snippet: str, default_cat: str) -> Tuple[str, List[str]]:
        """Refines category and secondary categories based on text semantics."""
        text = f"{title} {snippet}".lower()
        
        category_signatures = {
            "International Conflicts": ["war", "conflict", "missile", "drone strike", "ceasefire", "military", "troops", "gaza", "lebanon", "ukraine", "houthi", "defense"],
            "Technology & AI": ["ai", "artificial intelligence", "chip", "semiconductor", "model", "nvidia", "openai", "google", "apple", "microsoft", "quantum", "software", "cyber"],
            "Economy & Business": ["economy", "inflation", "market", "stocks", "wall street", "federal reserve", "central bank", "trade", "tariffs", "jobs", "gdp", "revenue", "bank"],
            "Climate & Environment": ["climate", "emissions", "carbon", "renewable", "wildfire", "flood", "cop29", "cop30", "drought", "warming", "fossil fuel", "clean energy"],
            "Science & Space": ["nasa", "space", "orbit", "telescope", "astronomy", "physics", "mars", "moon", "satellite", "gene", "biology", "species"],
            "Sports": ["football", "soccer", "nba", "champions league", "premier league", "tennis", "olympics", "grand prix", "f1", "coach", "trophy"],
            "Politics & Geopolitics": ["election", "parliament", "congress", "senate", "president", "prime minister", "diplomat", "treaty", "summit", "legislation", "policy"]
        }

        matched_scores = {}
        for cat, keywords in category_signatures.items():
            count = sum(1 for kw in keywords if re.search(rf"\b{re.escape(kw)}\b", text))
            if count > 0:
                matched_scores[cat] = count

        if matched_scores:
            sorted_cats = sorted(matched_scores.items(), key=lambda x: x[1], reverse=True)
            primary = sorted_cats[0][0]
            secondary = [c[0] for c in sorted_cats[1:3]]
            return primary, secondary

        return default_cat, []

    def extract_nlp_structured_analysis(
        self,
        title: str,
        snippet: str,
        source_name: str,
        category: str,
        country: Optional[str],
        region: Optional[str]
    ) -> Dict[str, Any]:
        """
        Sophisticated rule-based NLP extraction when no LLM API is available.
        Extracts verified factual statements, global importance explanation,
        affected parties, and actionable 'what to watch' analysis.
        """
        # Clean headline
        headline = title.strip()
        headline = re.sub(r"^(live updates|breaking news|watch|analysis):?\s*", "", headline, flags=re.IGNORECASE).strip()

        # Build "What happened" summary
        sentences = re.split(r"(?<=[.!?])\s+", snippet.strip())
        if len(sentences) >= 2:
            what_happened = " ".join(sentences[:3]).strip()
        elif snippet.strip():
            what_happened = snippet.strip()
        else:
            what_happened = f"Reports confirm significant developments regarding {headline} as reported by {source_name}."

        # Generate "Why it matters" in simple understandable language
        country_str = country or "international"
        if category == "International Conflicts":
            why_it_matters = (
                f"This conflict development directly impacts regional security in {region or 'the region'} and tests diplomatic channels. "
                "Escalations or ceasefire negotiations hold immediate implications for humanitarian conditions and geopolitical stability."
            )
            who_is_affected = f"Civilian populations in {country_str}, defense institutions, humanitarian agencies, and international allies."
            what_to_watch = "Watch for official statements from the UN Security Council, potential border troop movements, and diplomatic peace initiatives."
        elif category == "Politics & Geopolitics":
            why_it_matters = (
                f"Policy shifts and leadership actions in {country_str} alter bilateral alliances and international diplomatic consensus. "
                "These political decisions often set precedents for regional governance and international law."
            )
            who_is_affected = f"Citizens of {country_str}, foreign ministries, international trading partners, and legislative bodies."
            what_to_watch = "Monitor legislative ratification votes, counter-statements from opposition coalitions, and upcoming diplomatic summits."
        elif category == "Technology & AI":
            why_it_matters = (
                "Technological breakthroughs and regulatory mandates shape the global digital economy, workforce productivity, and cybersecurity standards. "
                "Key platform moves create competitive ripple effects across global semiconductor and software ecosystems."
            )
            who_is_affected = "Tech enterprises, enterprise software users, data privacy regulators, and software developers worldwide."
            what_to_watch = "Watch for commercial rollout timelines, independent benchmark evaluations, and regulatory inquiries from antitrust authorities."
        elif category == "Economy & Business":
            why_it_matters = (
                f"Macroeconomic indicators and market trends in {country_str or 'major markets'} drive currency valuations, borrowing costs, and corporate capital spending. "
                "Shifts in financial policy directly influence consumer purchasing power and global supply chains."
            )
            who_is_affected = "Global financial markets, institutional investors, consumer households, and import/export businesses."
            what_to_watch = "Observe central bank interest rate meetings, upcoming quarterly earnings reports, and inflation print releases."
        elif category == "Science & Space":
            why_it_matters = (
                "Scientific exploration expands humanity's technological capabilities and deepens our understanding of planetary systems. "
                "Space missions test new engineering paradigms that frequently yield terrestrial innovations."
            )
            who_is_affected = "The international scientific community, aerospace contractors, and satellite communication networks."
            what_to_watch = "Track telemetry verification, secondary mission milestone dates, and publication of peer-reviewed findings."
        elif category == "Climate & Environment":
            why_it_matters = (
                "Environmental shifts and extreme weather events present direct risks to food security, public health infrastructure, and insurance solvency. "
                "Climate adaptation policies determine long-term sustainability and energy transition costs."
            )
            who_is_affected = "Coastal communities, agricultural sectors, energy providers, and emergency disaster response agencies."
            what_to_watch = "Monitor meteorological forecast tracking, international climate pledge compliance, and emergency resource deployments."
        else:
            why_it_matters = f"This notable development reflects changing societal dynamics and broader public interest trends across {region or 'the globe'}."
            who_is_affected = f"Communities, industry stakeholders, and the broader public in {country_str}."
            what_to_watch = "Follow follow-up reporting, community reactions, and formal review outcomes."

        # Extract key facts (bullets)
        key_facts = []
        if len(sentences) >= 1 and len(sentences[0]) > 20:
            key_facts.append(sentences[0])
        if len(sentences) >= 2 and len(sentences[1]) > 20:
            key_facts.append(sentences[1])
        key_facts.append(f"Reported originally by {source_name} with ongoing verification.")

        # Sentiment estimation
        tense_words = ["strike", "casualty", "attack", "crisis", "plunge", "clash", "threat", "warning"]
        positive_words = ["breakthrough", "agreement", "success", "milestone", "record", "peace", "growth"]
        combined_text = f"{title} {snippet}".lower()
        if any(w in combined_text for w in tense_words):
            sentiment = "tense"
        elif any(w in combined_text for w in positive_words):
            sentiment = "constructive"
        else:
            sentiment = "neutral"

        return {
            "headline": headline,
            "summary": what_happened,
            "why_it_matters": why_it_matters,
            "who_is_affected": who_is_affected,
            "what_to_watch": what_to_watch,
            "key_facts": key_facts,
            "sentiment": sentiment
        }

    async def analyze_event(
        self,
        title: str,
        snippet: str,
        source_name: str,
        default_cat: str
    ) -> Dict[str, Any]:
        """
        Executes complete AI analysis pipeline:
        1. Categorization & Geography
        2. Importance & Breaking Assessment
        3. Structured Explanations (What happened, Why it matters, Who is affected, What to watch next)
        """
        # Determine category & geography
        category, secondary = self.infer_category(title, snippet, default_cat)
        country, region, lat, lon = self.detect_geography(f"{title} {snippet}")
        importance_level, importance_score, is_breaking = self.assess_importance(title, snippet, category)

        # Try LLM if API key is present
        llm_result = None
        if self.gemini_key or self.openai_key:
            try:
                llm_result = await self._call_llm_api(title, snippet, source_name, category, country)
            except Exception as e:
                logger.warning(f"LLM API call failed, falling back to NLP engine: {e}")

        # Fallback to intelligent local NLP
        if not llm_result:
            llm_result = self.extract_nlp_structured_analysis(
                title=title,
                snippet=snippet,
                source_name=source_name,
                category=category,
                country=country,
                region=region
            )

        return {
            "headline": llm_result["headline"],
            "summary": llm_result["summary"],
            "why_it_matters": llm_result["why_it_matters"],
            "who_is_affected": llm_result["who_is_affected"],
            "what_to_watch": llm_result["what_to_watch"],
            "key_facts": llm_result.get("key_facts", []),
            "sentiment": llm_result.get("sentiment", "neutral"),
            "category": category,
            "secondary_categories": secondary,
            "country": country,
            "region": region,
            "latitude": lat,
            "longitude": lon,
            "importance_level": importance_level,
            "importance_score": importance_score,
            "is_breaking": is_breaking,
            "confidence_status": "Developing" if is_breaking else "Single-source"
        }

    async def _call_llm_api(
        self,
        title: str,
        snippet: str,
        source: str,
        category: str,
        country: Optional[str]
    ) -> Optional[Dict[str, Any]]:
        """Optional LLM integration for external summarization."""
        # Structured system prompt
        prompt = f"""
You are an expert global intelligence analyst for GlobalPulse AI.
Analyze the following news report objectively:
Title: {title}
Source: {source}
Snippet: {snippet}
Category: {category}
Country: {country or 'International'}

Return a valid JSON object ONLY with the following exact keys:
{{
  "headline": "concise, informative title",
  "summary": "2-3 sentences explaining exactly what happened with confirmed facts",
  "why_it_matters": "1-2 sentences explaining global significance in plain English",
  "who_is_affected": "specific nations, industries, communities, or institutions",
  "what_to_watch": "potential upcoming developments labeled as analysis",
  "key_facts": ["fact 1", "fact 2"],
  "sentiment": "neutral | constructive | tense | crisis"
}}
"""
        import httpx
        if self.gemini_key:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.gemini_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.2, "response_mime_type": "application/json"}
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    return json.loads(text)

        elif self.openai_key:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {self.openai_key}", "Content-Type": "application/json"}
            payload = {
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": "You are a neutral news analyst. Output JSON only."},
                    {"role": "user", "content": prompt}
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.2
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    return json.loads(content)

        return None

ai_analyzer = AIAnalyzer()
