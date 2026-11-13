# ==============================================================================
# SprintDUO — Unified Production Dockerfile (Multi-Stage)
# ==============================================================================
# Builds one container image containing the Express API + Prisma + built React
# SPA served on port 3000 (used by CI verification and Google Cloud Run).
# Local Docker Compose uses server/Dockerfile and client/Dockerfile separately.
# ==============================================================================

# --- Stage 1: Build Frontend (React + TypeScript + Vite) ----------------------
FROM node:24-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
ENV VITE_API_URL=""
RUN npm run build

# --- Stage 2: Build Backend (Express + TypeScript + Prisma) -------------------
FROM node:24-alpine AS server-builder
WORKDIR /app/server

RUN apk add --no-cache openssl

COPY server/package*.json ./
RUN npm ci

COPY server/ ./
RUN npx prisma generate && npm run build

# --- Stage 3: Unified Production Runtime --------------------------------------
FROM node:24-alpine AS production
WORKDIR /app/server

RUN apk add --no-cache openssl

COPY --from=server-builder /app/server/package*.json ./
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/src ./src
COPY --from=server-builder /app/server/prisma ./prisma
COPY --from=server-builder /app/server/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=client-builder /app/client/dist /app/client/dist

RUN chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
ENV TZ=Asia/Bangkok
ENV PORT=3000
EXPOSE 3000

USER node

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
