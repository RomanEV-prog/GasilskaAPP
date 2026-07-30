# GasilApp web portal — build + Caddy (statika + HTTPS + reverse proxy na backend).
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Produkcijske VITE_* vrednosti pridejo iz .env.production (commitan — vse je javno).
# Sentry DSN pride kot build arg (VITE_ je build-time; vrednost je v .env.prod).
ARG VITE_SENTRY_DSN=
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
RUN npm run build

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
