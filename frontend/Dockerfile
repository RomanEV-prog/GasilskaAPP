# GasilApp web portal — build + Caddy (statika + HTTPS + reverse proxy na backend).
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Produkcijske VITE_* vrednosti pridejo iz .env.production (commitan — vse je javno).
RUN npm run build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
