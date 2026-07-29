import re
import httpx
from app.config import settings


def _clean_search_keywords(prompt: str) -> str:
    """Extract 2-3 clean visual keywords from prompt for stock API searches."""
    ignore_words = {
        "a", "an", "the", "in", "on", "at", "to", "for", "of", "and", "or", "is", "are",
        "with", "by", "this", "that", "movie", "film", "setting", "character", "location",
        "scout", "report", "script", "scene", "ext", "int", "day", "night", "working",
        "sourced", "royalty", "free", "assets", "visual", "matching", "context", "via", "planner",
        "breakdown", "roster", "audition", "posting"
    }
    words = [w for w in re.findall(r'\b[a-zA-Z]{3,}\b', prompt) if w.lower() not in ignore_words]
    # Pick top 2-3 key visual nouns/adjectives
    selected = words[:3] if words else ["cinema"]
    return " ".join(selected)[:80]


def _clean_title(tags_str: str | None, query: str) -> str:
    """Formats clean short title from Pixabay tags."""
    if not tags_str:
        return query.title()[:120]
    tags = [t.strip() for t in tags_str.split(",") if t.strip()]
    clean_name = ", ".join(tags[:3]).title()
    return clean_name[:120] if clean_name else query.title()[:120]


async def search_assets(query: str, asset_type: str, limit: int) -> list[dict]:
    """Search Pixabay (and Pexels fallback) for images/videos."""
    pixabay_key = getattr(settings, "pixabay_api_key", "")
    pexels_key = getattr(settings, "pexels_api_key", "")
    clean_query = _clean_search_keywords(query)

    results = []

    # 1. Try Pixabay API with multi-stage relaxed queries
    if pixabay_key:
        try:
            pixabay_results = await _search_pixabay(pixabay_key, clean_query, asset_type, limit)
            if not pixabay_results and " " in clean_query:
                # Try 2-word query
                relaxed_query = " ".join(clean_query.split()[:2])
                pixabay_results = await _search_pixabay(pixabay_key, relaxed_query, asset_type, limit)
            if not pixabay_results:
                # Try single strongest word
                single_query = clean_query.split()[0] if clean_query else "cinema"
                pixabay_results = await _search_pixabay(pixabay_key, single_query, asset_type, limit)
            if pixabay_results:
                results.extend(pixabay_results)
        except Exception:
            pass

    # 2. Try Pexels API if results are below limit and key exists
    if len(results) < limit and pexels_key:
        try:
            pexels_results = await _search_pexels(pexels_key, clean_query, asset_type, limit - len(results))
            if pexels_results:
                results.extend(pexels_results)
        except Exception:
            pass

    # 3. Fallback to mock cinematic assets if no external API returns results
    if not results:
        results = _mock_assets(query, asset_type, limit)

    return results[:limit]


async def _search_pixabay(api_key: str, query: str, asset_type: str, limit: int) -> list[dict]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        if asset_type == "video":
            url = "https://pixabay.com/api/videos/"
            params = {
                "key": api_key,
                "q": query,
                "per_page": max(3, limit),
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
                "safesearch": "true",
            }
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()

            results = []
            for item in data.get("hits", []):
                # webformatURL (640px max) & previewURL (150px) as thumbnails, largeImageURL (1280px) as source_url
                thumb = item.get("webformatURL") or item.get("previewURL")
                large = item.get("largeImageURL") or item.get("webformatURL") or item.get("previewURL")
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


async def _search_pexels(api_key: str, query: str, asset_type: str, limit: int) -> list[dict]:
    headers = {"Authorization": api_key}
    async with httpx.AsyncClient(timeout=10.0) as client:
        if asset_type == "video":
            url = "https://api.pexels.com/videos/search"
        else:
            url = "https://api.pexels.com/v1/search"

        resp = await client.get(url, headers=headers, params={"query": query, "per_page": limit})
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
