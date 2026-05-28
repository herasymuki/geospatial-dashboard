# Global Conflicts — Athena Intelligence Dashboard

A full-stack geospatial dashboard visualising live global conflict data.

## Stack
- **Frontend:** Vue 3 + Vite + Pinia + Tailwind CSS
- **Visualisation:** globe.gl (NASA Blue Marble) · deck.gl · Chart.js · Leaflet
- **Backend:** FastAPI (Python 3.11)
- **Deployment:** Google Cloud Run (Docker, multi-stage)

## Data Sources
| Source | Description |
|--------|-------------|
| ACLED | Armed Conflict Location & Event Data |
| UCDP | Uppsala Conflict Data Program |
| GDELT | Global Database of Events, Language, and Tone |
| ReliefWeb | OCHA humanitarian crises |

## AI Providers
Supports Anthropic, OpenAI, Gemini, and Athena (custom endpoint).
Default: `claude-sonnet-4-6` via Anthropic.

## Secrets (GCP Secret Manager)
All secrets are prefixed `gcas_`:
- `gcas_acled_key` / `gcas_acled_email`
- `gcas_anthropic_key`
- `gcas_openai_key`
- `gcas_gemini_key`
- `gcas_athena_key`

## Local Development
```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend && npm install && npm run dev
```

## Deploy
```bash
chmod +x deploy.sh && ./deploy.sh
```
