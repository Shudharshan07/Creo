import httpx
from app.config import settings


PEXELS_API_KEY = settings.pexels_api_key if hasattr(settings, "pexels_api_key") else ""


async def search_assets(query: str, asset_type: str, limit: int) -> list[dict]:
    """Search Pexels for images/videos. Falls back to empty list if no API key."""
    if not PEXELS_API_KEY:
        return _mock_assets(query, asset_type, limit)

    headers = {"Authorization": PEXELS_API_KEY}
    async with httpx.AsyncClient() as client:
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
                "title": query,
                "source_url": item["url"],
                "thumbnail_url": item.get("image"),
                "license_type": "Pexels License",
                "source_provider": "pexels",
                "tags": query,
            })
    else:
        for item in data.get("photos", []):
            results.append({
                "asset_type": "image",
                "title": item.get("alt") or query,
                "source_url": item["url"],
                "thumbnail_url": item["src"]["medium"],
                "license_type": "Pexels License",
                "source_provider": "pexels",
                "tags": query,
            })
    return results


def _mock_assets(query: str, asset_type: str, limit: int) -> list[dict]:
    """Returns placeholder assets when no API key is configured."""
    return [
        {
            "asset_type": asset_type,
            "title": f"{query} - sample {i + 1}",
            "source_url": f"https://www.pexels.com/search/{query}/",
            "thumbnail_url": None,
            "license_type": "Pexels License",
            "source_provider": "pexels",
            "tags": query,
        }
        for i in range(min(limit, 3))
    ]
