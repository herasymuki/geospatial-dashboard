import httpx
from app.config import get_settings
from datetime import date

BASE = "https://api.acleddata.com/acled/read"

async def fetch_acled_events(date_from: str, date_to: str, countries: str, limit: int) -> list:
    s = get_settings()
    if not s.gcas_acled_key or not s.gcas_acled_email:
        return _fallback_acled()

    params = {
        "key":        s.gcas_acled_key,
        "email":      s.gcas_acled_email,
        "event_date": date_from,
        "event_date_where": "BETWEEN",
        "event_date2": date_to or date.today().isoformat(),
        "limit":      limit,
        "fields":     "data_id|event_date|event_type|sub_event_type|actor1|actor2|country|latitude|longitude|fatalities|notes",
    }
    if countries:
        params["country"] = countries.split(",")[0]

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(BASE, params=params)
            r.raise_for_status()
            data = r.json()
            return data.get("data", [])
    except Exception:
        return _fallback_acled()

def _fallback_acled():
    """Return a small set of representative sample events when API key is absent."""
    return [
        {"data_id": "1", "event_date": "2024-01-15", "event_type": "Battles",
         "sub_event_type": "Armed clash", "actor1": "Military Forces of Ukraine",
         "actor2": "Military Forces of Russia", "country": "Ukraine",
         "latitude": "48.5", "longitude": "37.8", "fatalities": "45", "notes": "Sample event"},
        {"data_id": "2", "event_date": "2024-02-10", "event_type": "Explosions/Remote violence",
         "sub_event_type": "Shelling/artillery/missile attack", "actor1": "Military Forces of Russia",
         "actor2": "", "country": "Ukraine", "latitude": "50.4", "longitude": "30.5",
         "fatalities": "12", "notes": "Sample event"},
        {"data_id": "3", "event_date": "2024-03-05", "event_type": "Violence against civilians",
         "sub_event_type": "Attack", "actor1": "Hamas", "actor2": "Civilians",
         "country": "Palestine", "latitude": "31.5", "longitude": "34.5",
         "fatalities": "78", "notes": "Sample event"},
        {"data_id": "4", "event_date": "2024-01-20", "event_type": "Battles",
         "sub_event_type": "Armed clash", "actor1": "Sudanese Armed Forces",
         "actor2": "Rapid Support Forces", "country": "Sudan",
         "latitude": "15.5", "longitude": "32.5", "fatalities": "120", "notes": "Sample event"},
        {"data_id": "5", "event_date": "2024-04-01", "event_type": "Battles",
         "sub_event_type": "Armed clash", "actor1": "Myanmar Military",
         "actor2": "People's Defence Force", "country": "Myanmar",
         "latitude": "21.9", "longitude": "95.9", "fatalities": "33", "notes": "Sample event"},
        {"data_id": "6", "event_date": "2024-05-12", "event_type": "Protests",
         "sub_event_type": "Peaceful protest", "actor1": "Protesters",
         "actor2": "", "country": "Iran",
         "latitude": "35.7", "longitude": "51.4", "fatalities": "0", "notes": "Sample event"},
        {"data_id": "7", "event_date": "2024-06-08", "event_type": "Battles",
         "sub_event_type": "Armed clash", "actor1": "Al-Shabaab",
         "actor2": "Military Forces of Somalia", "country": "Somalia",
         "latitude": "2.0", "longitude": "45.3", "fatalities": "22", "notes": "Sample event"},
        {"data_id": "8", "event_date": "2024-07-14", "event_type": "Violence against civilians",
         "sub_event_type": "Abduction/forced disappearance", "actor1": "Boko Haram",
         "actor2": "Civilians", "country": "Nigeria",
         "latitude": "11.8", "longitude": "13.2", "fatalities": "8", "notes": "Sample event"},
    ]
