# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json .npmrc ./
RUN npm install --legacy-peer-deps

COPY . .

ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# ── Stage 2: Serve via Express (server.js) ───────────────────────
FROM node:20-slim
WORKDIR /app

# Copy only production server deps
COPY package.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Copy built frontend and server
COPY --from=builder /app/dist ./dist
COPY server.js ./

EXPOSE 8080
CMD ["node", "server.js"]
