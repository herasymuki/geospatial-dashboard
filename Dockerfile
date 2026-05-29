# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# Copy lock files first for better layer caching
COPY package.json package-lock.json .npmrc ./

# Install dependencies using lock file (faster + deterministic)
RUN npm ci --ignore-scripts --no-audit --no-fund

# Copy source files
COPY . .

# Build Vite app with increased memory
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# ── Stage 2: Serve ───────────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
