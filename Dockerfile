# Rokesh (frontend + backend) in one image.
# Build:  docker build -t rokesh .
# Run:    docker run -p 4000:4000 --env-file backend/.env -e NODE_ENV=production -e TRUST_PROXY=1 rokesh
# NODE_ENV=production makes the session cookie Secure, so serve it over HTTPS (behind your platform's proxy).

FROM node:24-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app/backend
COPY backend/package*.json ./
# bcrypt ships prebuilt binaries for Alpine; build tools are only a fallback.
RUN apk add --no-cache --virtual .build python3 make g++ \
 && npm ci --omit=dev \
 && apk del .build
COPY backend/ ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist
USER node
EXPOSE 4000
# Apply any pending database migrations, then start the server.
CMD ["sh", "-c", "node scripts/migrate.js && node src/index.js"]
