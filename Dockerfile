
# ========= Build stage =========
FROM node:22 AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .

RUN npm run build
RUN npm prune --omit=dev

# ========= Runtime stage =========
FROM node:22-alpine

ENV NODE_ENV=production
ENV STATUS_PAGE_REFRESH_INTERVAL=30
ENV INCIDENT_UPDATED_BY=TMMonitorTool

ENV AWS_REGION=us-east-1
ENV AWS_SECRETS_MANAGER_SECRET_ID=TM_Monitor

ENV AWS_SECRETS_MANAGER_REQUIRED=1
ENV AWS_SECRETS_MANAGER_OVERWRITE_DB_CONFIG=1

WORKDIR /app

# Create data dir and set perms BEFORE switching user
# (helps even when a volume is not mounted)
RUN mkdir -p /app/data && chown -R node:node /app

# Drop root
USER node

# Copy runtime bits, owned by node
COPY --from=builder --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/server ./server
COPY --from=builder --chown=node:node /app/dist   ./dist
# Keep only if server imports from src at runtime:
COPY --from=builder --chown=node:node /app/src    ./src
# Copy database schema and migration files into the image
COPY --from=builder --chown=node:node /app/db     ./db

RUN ls

# Declare where data will live (optional but helpful for clarity)
VOLUME ["/app/data"]

EXPOSE 3001
CMD ["node", "server/server.js"]
