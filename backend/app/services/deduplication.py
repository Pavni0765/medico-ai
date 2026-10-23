import re
from typing import List, Set, Tuple, Optional
from datetime import datetime, timezone, timedelta

# Common English stopwords to ignore in title similarity
STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", 
    "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", 
    "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", 
    "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", 
    "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", 
    "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", 
    "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", 
    "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", 
    "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", 
    "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", 
    "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", 
    "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", 
    "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", 
    "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", 
    "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", 
    "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", 
    "yours", "yourself", "yourselves", "says", "said", "new", "report", "news", "first",
    "exclusive", "live", "updates", "breaking", "watch", "video"
}

def tokenize(text: str) -> Set[str]:
    """Extracts cleaned normalized word stems/tokens excluding stopwords."""
    if not text:
        return set()
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    words = cleaned.split()
    tokens = {w for w in words if len(w) > 2 and w not in STOP_WORDS and not w.isdigit()}
    return tokens

def calculate_jaccard_similarity(set1: Set[str], set2: Set[str]) -> float:
    """Calculates Jaccard index between two token sets."""
    if not set1 or not set2:
        return 0.0
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    return intersection / union if union > 0 else 0.0

def are_articles_similar(
    title1: str, 
    snippet1: str, 
    date1: datetime, 
    title2: str, 
    snippet2: str, 
    date2: datetime,
    threshold: float = 0.38,
    max_hour_diff: int = 48
) -> Tuple[bool, float]:
    """
    Determines if two articles are reporting on the same event based on:
    1. Publication date within max_hour_diff (default 48 hours)
    2. Headline and snippet token overlap
    """
    # Ensure UTC timezone awareness
    if date1.tzinfo is None:
        date1 = date1.replace(tzinfo=timezone.utc)
    if date2.tzinfo is None:
        date2 = date2.replace(tzinfo=timezone.utc)

    # Check temporal proximity
    hour_diff = abs((date1 - date2).total_seconds()) / 3600.0
    if hour_diff > max_hour_diff:
        return False, 0.0

    # Tokenize titles
    tokens_title1 = tokenize(title1)
    tokens_title2 = tokenize(title2)
    
    title_sim = calculate_jaccard_similarity(tokens_title1, tokens_title2)

    # If titles have high token overlap, they are definitely covering the same story
    if title_sim >= threshold:
        return True, title_sim

    # Substring check for exact phrasing of key named events
    lower1 = title1.lower()
    lower2 = title2.lower()
    # Check if a 5+ word continuous segment matches
    words1 = [w for w in lower1.split() if w not in STOP_WORDS]
    if len(words1) >= 4:
        phrase = " ".join(words1[:4])
        if phrase in lower2:
            return True, 0.75

    # Check combined title + snippet similarity
    combined_tokens1 = tokens_title1.union(tokenize(snippet1[:200]))
    combined_tokens2 = tokens_title2.union(tokenize(snippet2[:200]))
    combined_sim = calculate_jaccard_similarity(combined_tokens1, combined_tokens2)

    # Require higher threshold for snippet combined to avoid general topic false positives
    if combined_sim >= 0.45:
        return True, combined_sim

    return False, max(title_sim, combined_sim)
