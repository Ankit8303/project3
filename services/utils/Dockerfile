FROM node:22.20.0-alpine3.22 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --global npm@11.6.2 && npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:22.20.0-alpine3.22 AS runtime

ENV NODE_ENV=production
ENV PORT=5002
WORKDIR /app

COPY package*.json ./
RUN npm install --global npm@11.6.2 && npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node
STOPSIGNAL SIGTERM
EXPOSE 5002
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1

CMD ["node", "dist/index.js"]
