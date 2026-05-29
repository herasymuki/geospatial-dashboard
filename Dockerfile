# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests + lockfile
COPY package.json package-lock.json .npmrc ./

# Clean install from lockfile — postinstall scripts run normally in Docker
RUN npm ci --legacy-peer-deps

# Copy source
COPY . .

# Build
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# ── Stage 2: Serve ───────────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
