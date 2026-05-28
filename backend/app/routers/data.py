from fastapi import APIRouter, Query
from app.services.acled    import fetch_acled_events
from app.services.ucdp     import fetch_ucdp_events
from app.services.gdelt    import fetch_gdelt_events
from app.services.reliefweb import fetch_reliefweb_crises

router = APIRouter()

@router.get("/acled")
async def acled(
    date_from: str = Query("2020-01-01"),
    date_to:   str = Query(""),
    countries: str = Query(""),
    limit:     int = Query(2000)
):
    events = await fetch_acled_events(date_from, date_to, countries, limit)
    return {"events": events, "count": len(events)}

@router.get("/ucdp")
async def ucdp(
    date_from: str = Query("2020-01-01"),
    date_to:   str = Query(""),
    limit:     int = Query(1000)
):
    events = await fetch_ucdp_events(date_from, date_to, limit)
    return {"events": events, "count": len(events)}

@router.get("/gdelt")
async def gdelt(
    date_from: str = Query("2023-01-01"),
    date_to:   str = Query(""),
    limit:     int = Query(500)
):
    events = await fetch_gdelt_events(date_from, date_to, limit)
    return {"events": events, "count": len(events)}

@router.get("/reliefweb")
async def reliefweb(limit: int = Query(200)):
    crises = await fetch_reliefweb_crises(limit)
    return {"crises": crises, "count": len(crises)}
