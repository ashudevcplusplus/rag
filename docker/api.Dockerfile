# =============================================================================
# API Development Dockerfile
# =============================================================================
# Supports hot-reload with tsx watch and pnpm workspaces
# =============================================================================

FROM node:20-alpine

# Install pnpm and curl for healthchecks
RUN corepack enable && corepack prepare pnpm@latest --activate \
    && apk add --no-cache curl

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./

# Copy package.json files for all workspace packages
COPY api/package.json ./api/
COPY api/tsconfig.json ./api/
COPY packages/text-utils/package.json ./packages/text-utils/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/ui/package.json ./packages/ui/

# Install dependencies (skip lifecycle scripts like husky which need .git)
RUN pnpm install --ignore-scripts

# Copy source files
COPY api/src/ ./api/src/
COPY packages/ ./packages/

# Build types package (required - exports from ./dist/index.js)
WORKDIR /app/packages/types
RUN pnpm run build

# Build text-utils package (required - exports from ./dist/index.js)
WORKDIR /app/packages/text-utils
RUN pnpm run build

WORKDIR /app/api

EXPOSE 8000

# Development command with tsx watch for hot-reload
CMD ["pnpm", "run", "dev"]

