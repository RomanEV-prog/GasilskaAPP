# GasilApp backend â€” produkcijska slika (multi-stage).
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
# Mapa za naloĹľene datoteke (logotipi, dokumenti) â€” priklopi volume.
RUN mkdir -p /app/uploads
EXPOSE 4000
CMD ["node", "dist/main.js"]

