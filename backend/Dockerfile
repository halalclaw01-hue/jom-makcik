# Build stage
FROM node:22-slim AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make gcc g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Runtime stage
FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy production node_modules and source
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/

# Create persistent data directory
RUN mkdir -p /app/data && chown -R node:node /app

USER node

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_PATH=/app/data/jom-makcik.sqlite

EXPOSE 4000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]
