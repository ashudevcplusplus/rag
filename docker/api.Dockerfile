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
COPY .npmrc ./

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

# Copy package source files (not entire directory to preserve node_modules symlinks)
COPY packages/text-utils/src/ ./packages/text-utils/src/
COPY packages/text-utils/tsconfig.json ./packages/text-utils/
COPY packages/types/src/ ./packages/types/src/
COPY packages/types/tsconfig.json ./packages/types/
COPY packages/utils/src/ ./packages/utils/src/
COPY packages/utils/tsconfig.json ./packages/utils/
COPY packages/api-client/src/ ./packages/api-client/src/
COPY packages/api-client/tsconfig.json ./packages/api-client/
COPY packages/ui/src/ ./packages/ui/src/
COPY packages/ui/tsconfig.json ./packages/ui/

# Build text-utils package (required - exports from ./dist/index.js)
WORKDIR /app/packages/text-utils
RUN pnpm run build

WORKDIR /app/api

EXPOSE 8000

# Development command with tsx watch for hot-reload
CMD ["pnpm", "run", "dev"]

