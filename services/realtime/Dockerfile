FROM node:22.22.3-alpine3.24 AS builder

RUN apk update && apk upgrade --no-cache

WORKDIR /app

COPY package*.json ./
RUN npm install --global npm@12.2.0 && npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:22.22.3-alpine3.24 AS runtime

ENV NODE_ENV=production
ENV PORT=5004
RUN apk update && apk upgrade --no-cache

WORKDIR /app

COPY package*.json ./
RUN npm install --global npm@12.2.0 && npm ci --omit=dev && npm cache clean --force && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /usr/local/bin/npm /usr/local/bin/npx

COPY --from=builder /app/dist ./dist

USER node
STOPSIGNAL SIGTERM
EXPOSE 5004
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1

CMD ["node", "dist/index.js"]
