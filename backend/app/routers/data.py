from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from app.services.acled     import fetch_acled_events
from app.services.ucdp      import fetch_ucdp_events
from app.services.gdelt     import fetch_gdelt_events
from app.services.reliefweb import fetch_reliefweb_crises
import httpx

router = APIRouter()

@router.get('/acled')
async def acled(
    date_from: str = Query('2023-01-01'),
    date_to:   str = Query(''),
    countries: str = Query(''),
    limit:     int = Query(2000)
):
    events = await fetch_acled_events(date_from, date_to, countries, limit)
    return {'events': events, 'count': len(events)}

@router.get('/ucdp')
async def ucdp(
    date_from: str = Query('2023-01-01'),
    date_to:   str = Query(''),
    limit:     int = Query(1000)
):
    events = await fetch_ucdp_events(date_from, date_to, limit)
    return {'events': events, 'count': len(events)}

@router.get('/gdelt')
async def gdelt(
    date_from: str = Query('2024-01-01'),
    date_to:   str = Query(''),
    limit:     int = Query(500)
):
    events = await fetch_gdelt_events(date_from, date_to, limit)
    return {'events': events, 'count': len(events)}

@router.get('/reliefweb')
async def reliefweb(limit: int = Query(200)):
    crises = await fetch_reliefweb_crises(limit)
    return {'crises': crises, 'count': len(crises)}

@router.get('/geojson/countries')
async def countries_geojson():
    url = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson'
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(url)
            r.raise_for_status()
            return JSONResponse(content=r.json())
    except Exception:
        return JSONResponse(content={'type': 'FeatureCollection', 'features': []})
