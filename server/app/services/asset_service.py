import re
import httpx
from app.config import settings


def extract_topic_keywords(query: str, project=None) -> list[str]:
    """
    Builds clean, topic-focused search queries anchored on the film's title, genre, logline, and core story nouns.
    Ignores command noise ("fetch 3 more", "sourced 3 royalty-free", etc.).
    """
    system_command_words = {
        "fetch", "more", "visual", "assets", "sourced", "royalty", "free", "matching", "script",
        "casting", "location", "context", "via", "pixabay", "working", "prompt", "batch", "node",
        "follow", "up", "load", "additional", "images", "photos", "find", "get", "search", "showing",
        "poster", "text", "breakdown", "roster", "audition", "posting", "report", "scout", "setting"
    }

    topics = []

    # 1. Project Title is the primary anchor (e.g. "Blue Dragon")
    if project and getattr(project, "title", None):
        title = project.title.strip()
        title_words = [w for w in re.findall(r'\b[a-zA-Z]{3,}\b', title) if w.lower() not in system_command_words]
        if title_words:
            topics.append(" ".join(title_words))  # e.g. "Blue Dragon"

    # 2. Extract story subject nouns from prompt & logline
    combined_raw = f"{query} {getattr(project, 'logline', '') or ''}"
    raw_words = [w for w in re.findall(r'\b[a-zA-Z]{3,}\b', combined_raw) if w.lower() not in system_command_words]

    # Pick story-specific keywords not already in title
    story_words = [w for w in raw_words if not (topics and w.lower() in topics[0].lower())]

    if topics and story_words:
        topics.append(f"{topics[0]} {story_words[0]}")

    if story_words:
        topics.append(" ".join(story_words[:2]))

    if not topics:
        topics.append("cinema")

    return topics


def _clean_title(tags_str: str | None, query: str) -> str:
    """Formats clean short title from Pixabay tags."""
    if not tags_str:
        return query.title()[:120]
    tags = [t.strip() for t in tags_str.split(",") if t.strip()]
    clean_name = ", ".join(tags[:3]).title()
    return clean_name[:120] if clean_name else query.title()[:120]


async def search_assets(query: str, asset_type: str, limit: int, project=None, page: int = 1) -> list[dict]:
    """Search Pixabay (and Pexels fallback) for images/videos anchored strictly to the film's story topic."""
    pixabay_key = getattr(settings, "pixabay_api_key", "")
    pexels_key = getattr(settings, "pexels_api_key", "")
    topic_queries = extract_topic_keywords(query, project)

    results = []

    # 1. Try Pixabay API with topic-anchored queries
    if pixabay_key:
        for q in topic_queries:
            try:
                pixabay_results = await _search_pixabay(pixabay_key, q, asset_type, limit, page)
                if pixabay_results:
                    results.extend(pixabay_results)
                    break
            except Exception:
                pass

        # If primary topic queries yielded 0 results, try single topic word
        if not results and topic_queries:
            single_word = topic_queries[0].split()[-1] if topic_queries[0].split() else "dragon"
            try:
                pixabay_results = await _search_pixabay(pixabay_key, single_word, asset_type, limit, page)
                if pixabay_results:
                    results.extend(pixabay_results)
            except Exception:
                pass

    # 2. Try Pexels API if results are below limit and key exists
    if len(results) < limit and pexels_key:
        primary_q = topic_queries[0] if topic_queries else "cinema"
        try:
            pexels_results = await _search_pexels(pexels_key, primary_q, asset_type, limit - len(results), page)
            if pexels_results:
                results.extend(pexels_results)
        except Exception:
            pass

    # 3. Fallback to mock cinematic assets if no external API returns results
    if not results:
        primary_q = topic_queries[0] if topic_queries else "film"
        results = _mock_assets(primary_q, asset_type, limit)

    return results[:limit]


async def _search_pixabay(api_key: str, query: str, asset_type: str, limit: int, page: int = 1) -> list[dict]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        if asset_type == "video":
            url = "https://pixabay.com/api/videos/"
            params = {
                "key": api_key,
                "q": query,
                "per_page": max(3, limit),
                "page": max(1, page),
                "safesearch": "true",
            }
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

            results = []
            for item in data.get("hits", []):
                videos = item.get("videos", {})
                video_data = videos.get("medium") or videos.get("small") or {}
                video_url = video_data.get("url") or item.get("pageURL")
                thumb_url = video_data.get("thumbnail") or item.get("userImageURL") or (f"https://i.vimeocdn.com/video/{item.get('picture_id')}_640.jpg" if item.get("picture_id") else None)
                results.append({
                    "asset_type": "video",
                    "title": _clean_title(item.get("tags"), query),
                    "source_url": video_url or item.get("pageURL"),
                    "thumbnail_url": thumb_url or item.get("pageURL"),
                    "license_type": "Pixabay License",
                    "source_provider": "Pixabay",
                    "tags": (item.get("tags") or query)[:300],
                })
            return results
        else:
            url = "https://pixabay.com/api/"
            params = {
                "key": api_key,
                "q": query,
                "image_type": "photo",
                "per_page": max(3, limit),
                "page": max(1, page),
                "safesearch": "true",
            }
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

            results = []
            for item in data.get("hits", []):
                thumb = item.get("previewURL") or item.get("webformatURL")
                large = item.get("largeImageURL") or item.get("webformatURL") or item.get("pageURL")
                results.append({
                    "asset_type": "image",
                    "title": _clean_title(item.get("tags"), query),
                    "source_url": large,
                    "thumbnail_url": thumb,
                    "license_type": "Pixabay License",
                    "source_provider": "Pixabay",
                    "tags": (item.get("tags") or query)[:300],
                })
            return results


async def _search_pexels(api_key: str, query: str, asset_type: str, limit: int, page: int = 1) -> list[dict]:
    headers = {"Authorization": api_key}
    async with httpx.AsyncClient(timeout=10.0) as client:
        if asset_type == "video":
            url = "https://api.pexels.com/videos/search"
        else:
            url = "https://api.pexels.com/v1/search"

        resp = await client.get(url, headers=headers, params={"query": query, "per_page": limit, "page": page})
        resp.raise_for_status()
        data = resp.json()

    results = []
    if asset_type == "video":
        for item in data.get("videos", []):
            results.append({
                "asset_type": "video",
                "title": query.title()[:120],
                "source_url": item["url"],
                "thumbnail_url": item.get("image"),
                "license_type": "Pexels License",
                "source_provider": "Pexels",
                "tags": query[:300],
            })
    else:
        for item in data.get("photos", []):
            results.append({
                "asset_type": "image",
                "title": (item.get("alt") or query).title()[:120],
                "source_url": item["url"],
                "thumbnail_url": item.get("src", {}).get("medium"),
                "license_type": "Pexels License",
                "source_provider": "Pexels",
                "tags": query[:300],
            })
    return results


def _mock_assets(query: str, asset_type: str, limit: int) -> list[dict]:
    """Fallback sample images when APIs are unreachable or return no hits."""
    sample_images = [
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&auto=format&fit=crop",
    ]
    results = []
    for i in range(min(limit, 3)):
        results.append({
            "asset_type": asset_type,
            "title": f"{query.title()} Sample {i + 1}",
            "source_url": f"https://pixabay.com/images/search/{query}/",
            "thumbnail_url": sample_images[i % len(sample_images)],
            "license_type": "Royalty Free",
            "source_provider": "Pixabay",
            "tags": query,
        })
    return results
