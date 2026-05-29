# ─── Stage 1: Build Vue frontend ──────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files first for layer caching
COPY frontend/package.json frontend/.npmrc ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy rest of frontend source
COPY frontend/ ./

# Build with enough memory for large bundles
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

# ─── Stage 2: Python backend + static assets ──────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

# Vue build output -> static/
COPY --from=frontend-builder /app/frontend/dist ./static

ENV PORT=8080
EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
