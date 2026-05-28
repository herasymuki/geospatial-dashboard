import httpx

BASE = "https://api.reliefweb.int/v1/disasters"

async def fetch_reliefweb_crises(limit: int) -> list:
    payload = {
        "appname": "gcas-dashboard",
        "limit":   min(limit, 200),
        "fields":  {"include": ["name", "status", "country", "date", "type", "glide"]},
        "filter":  {"field": "status", "value": ["ongoing", "alert"]},
        "sort":    ["date.created:desc"]
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(BASE, json=payload)
            r.raise_for_status()
            data = r.json()
            return data.get("data", [])
    except Exception:
        return []
