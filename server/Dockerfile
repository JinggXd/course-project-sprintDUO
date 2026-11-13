# ==============================================================================
# SprintDUO — Backend Dockerfile for Local Docker Compose (server + migrate)
# ==============================================================================
FROM node:24-alpine
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src/
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN npm run build && chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
ENV TZ=Asia/Bangkok
ENV PORT=3000
EXPOSE 3000

USER node

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
