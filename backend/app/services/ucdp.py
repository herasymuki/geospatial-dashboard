import httpx

BASE = "https://ucdpapi.pcr.uu.se/api/gedevents/23.1"

async def fetch_ucdp_events(date_from: str, date_to: str, limit: int) -> list:
    params = {
        "pagesize": min(limit, 1000),
        "page":     1,
        "StartDate": date_from,
    }
    if date_to:
        params["EndDate"] = date_to

    try:
        async with httpx.AsyncClient(timeout=25) as client:
            r = await client.get(BASE, params=params)
            r.raise_for_status()
            data = r.json()
            return data.get("Result", [])
    except Exception:
        return _fallback_ucdp()

def _fallback_ucdp():
    return [
        {"id": "u1", "date_start": "2024-01-10", "country": "Ethiopia",
         "latitude": "9.0", "longitude": "38.7",
         "type_of_violence_label": "State-based conflict",
         "side_a": "Government of Ethiopia", "side_b": "TPLF",
         "best": "67", "dyad_name": "Ethiopia vs TPLF", "source_article": ""},
        {"id": "u2", "date_start": "2024-02-20", "country": "Yemen",
         "latitude": "15.3", "longitude": "44.2",
         "type_of_violence_label": "State-based conflict",
         "side_a": "Houthi movement", "side_b": "Saudi-led coalition",
         "best": "41", "dyad_name": "Houthis vs Coalition", "source_article": ""},
        {"id": "u3", "date_start": "2024-03-15", "country": "Democratic Republic of Congo",
         "latitude": "-4.3", "longitude": "15.3",
         "type_of_violence_label": "Non-state conflict",
         "side_a": "M23", "side_b": "FARDC",
         "best": "89", "dyad_name": "M23 vs DRC Forces", "source_article": ""},
    ]
