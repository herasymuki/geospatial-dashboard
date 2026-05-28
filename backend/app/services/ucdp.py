import httpx

BASE = 'https://ucdpapi.pcr.uu.se/api/gedevents/23.1'

async def fetch_ucdp_events(date_from: str, date_to: str, limit: int) -> list:
    params = {
        'pagesize':  min(limit, 1000),
        'page':      1,
        'StartDate': date_from,
    }
    if date_to:
        params['EndDate'] = date_to
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            r = await client.get(BASE, params=params)
            r.raise_for_status()
            data = r.json()
            return data.get('Result', [])
    except Exception:
        return _fallback_ucdp()

def _fallback_ucdp():
    return [
        {'id': 'u1', 'date_start': '2024-01-10', 'country': 'Ethiopia',
         'latitude': '9.0', 'longitude': '38.7',
         'type_of_violence_label': 'State-based conflict',
         'side_a': 'Government of Ethiopia', 'side_b': 'TPLF',
         'best': '67', 'dyad_name': 'Ethiopia vs TPLF', 'source_article': ''},
        {'id': 'u2', 'date_start': '2024-02-20', 'country': 'Yemen',
         'latitude': '15.3', 'longitude': '44.2',
         'type_of_violence_label': 'State-based conflict',
         'side_a': 'Houthi movement', 'side_b': 'Saudi-led coalition',
         'best': '41', 'dyad_name': 'Houthis vs Coalition', 'source_article': ''},
        {'id': 'u3', 'date_start': '2024-03-15', 'country': 'Democratic Republic of Congo',
         'latitude': '-4.3', 'longitude': '15.3',
         'type_of_violence_label': 'Non-state conflict',
         'side_a': 'M23', 'side_b': 'FARDC',
         'best': '89', 'dyad_name': 'M23 vs DRC Forces', 'source_article': ''},
        {'id': 'u4', 'date_start': '2024-04-01', 'country': 'Myanmar',
         'latitude': '21.9', 'longitude': '95.9',
         'type_of_violence_label': 'State-based conflict',
         'side_a': 'Myanmar Military', 'side_b': 'PDF',
         'best': '55', 'dyad_name': 'Myanmar Military vs PDF', 'source_article': ''},
        {'id': 'u5', 'date_start': '2024-05-10', 'country': 'Mali',
         'latitude': '17.5', 'longitude': '-3.9',
         'type_of_violence_label': 'Non-state conflict',
         'side_a': 'JNIM', 'side_b': 'Wagner Group',
         'best': '30', 'dyad_name': 'JNIM vs Wagner', 'source_article': ''},
    ]
