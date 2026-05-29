# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy npmrc first
COPY .npmrc ./

# Install dependencies first (layer caching)
COPY package.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Copy source
COPY . .

# Build with increased memory for large bundles
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
