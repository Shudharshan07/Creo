import re
import httpx
from app.config import settings


def _extract_keywords(query: str, project=None) -> list[str]:
    """Extract clean topic and genre keywords for Jamendo API queries."""
    system_words = {
        "fetch", "more", "visual", "assets", "music", "song", "soundtrack", "audio", "track",
        "sourced", "royalty", "free", "matching", "script", "casting", "location", "context",
        "via", "planner", "breakdown", "roster", "audition", "posting", "report", "scout", "setting",
        "working", "prompt", "batch", "node", "follow", "up", "load", "additional", "images", "photos"
    }

    words = []

    # 1. Project Title
    if project and getattr(project, "title", None):
        t_words = [w.lower() for w in re.findall(r'\b[a-zA-Z]{3,}\b', project.title) if w.lower() not in system_words]
        words.extend(t_words)

    # 2. Project Genre
    if project and getattr(project, "genre", None):
        g_words = [w.lower() for w in re.findall(r'\b[a-zA-Z]{3,}\b', project.genre) if w.lower() not in system_words]
        words.extend(g_words)

    # 3. User Prompt
    p_words = [w.lower() for w in re.findall(r'\b[a-zA-Z]{3,}\b', query) if w.lower() not in system_words]
    words.extend(p_words)

    # Deduplicate preserving order
    unique_keywords = []
    for w in words:
        if w not in unique_keywords:
            unique_keywords.append(w)

    if not unique_keywords:
        unique_keywords = ["cinematic", "soundtrack", "film"]

    return unique_keywords


async def search_jamendo_music(query: str, limit: int = 3, page: int = 1, project=None) -> list[dict]:
    """Query Jamendo API for distinct, non-duplicate royalty-free soundtrack tracks."""
    client_id = getattr(settings, "jamendo_client_id", "56d30c4d") or "56d30c4d"
    keywords = _extract_keywords(query, project)
    offset = max(0, (page - 1) * limit)

    results = []
    seen_identifiers = set()

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Search via fuzzytags, namesearch, and tags for rich variety
        for search_mode in ["fuzzytags", "namesearch", "tags"]:
            if len(results) >= limit:
                break
            for kw in keywords:
                if len(results) >= limit:
                    break
                try:
                    url = "https://api.jamendo.com/v3.0/tracks/"
                    params = {
                        "client_id": client_id,
                        "format": "json",
                        "limit": 10,
                        "offset": offset,
                        "audioformat": "mp32",
                        "order": "popularity_total_desc",
                        search_mode: kw,
                    }
                    resp = await client.get(url, params=params)
                    if resp.status_code == 200:
                        data = resp.json()
                        hits = data.get("results", [])
                        for item in hits:
                            audio = item.get("audio") or item.get("audiodownload")
                            title = (item.get("name") or "Cinematic Track").strip()
                            track_id = str(item.get("id") or "")
                            
                            # Ensure strict deduplication by ID, title, and audio URL
                            if audio and track_id not in seen_identifiers and title.lower() not in seen_identifiers and audio not in seen_identifiers:
                                seen_identifiers.add(track_id)
                                seen_identifiers.add(title.lower())
                                seen_identifiers.add(audio)
                                
                                results.append({
                                    "title": title,
                                    "artist": item.get("artist_name") or "Jamendo Artist",
                                    "album": item.get("album_name") or "Film Score Soundtrack",
                                    "preview_url": audio,
                                    "deezer_url": item.get("shareurl") or item.get("shorturl") or item.get("prcurl") or "https://www.jamendo.com",
                                    "cover_url": item.get("image") or item.get("album_image") or "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop",
                                    "duration": item.get("duration") or 120,
                                })
                                if len(results) >= limit:
                                    break
                except Exception:
                    continue

    if not results:
        results = _mock_jamendo_tracks(query, limit)

    return results[:limit]


# Backward compatibility alias
search_deezer_music = search_jamendo_music


def _mock_jamendo_tracks(query: str, limit: int) -> list[dict]:
    """Fallback sample soundtrack tracks with distinct Jamendo audio streams and titles."""
    samples = [
        {
            "title": f"{query.title()} Epic Cinematic Theme",
            "artist": "Alexander Nakarada",
            "album": "Original Film Score Vol 1",
            "preview_url": "https://prod-1.storage.jamendo.com/download/track/1884321/mp32/",
            "deezer_url": "https://www.jamendo.com",
            "cover_url": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop",
            "duration": 145,
        },
        {
            "title": "Dramatic Orchestral Overture",
            "artist": "Kevin MacLeod",
            "album": "Cinematic Soundtracks",
            "preview_url": "https://prod-1.storage.jamendo.com/download/track/1884322/mp32/",
            "deezer_url": "https://www.jamendo.com",
            "cover_url": "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop",
            "duration": 180,
        },
        {
            "title": "Ambient Score & Soundscape",
            "artist": "Kai Engel",
            "album": "Atmospheric Film Scores",
            "preview_url": "https://prod-1.storage.jamendo.com/download/track/1884323/mp32/",
            "deezer_url": "https://www.jamendo.com",
            "cover_url": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&auto=format&fit=crop",
            "duration": 210,
        }
    ]
    return samples[:limit]
