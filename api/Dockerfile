# =============================================================================
# API Production Dockerfile
# =============================================================================
# Multi-stage build with pnpm workspace support
# =============================================================================

FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./

# Copy package.json and tsconfig files for all workspace packages
COPY api/package.json ./api/
COPY api/tsconfig.json ./api/
COPY packages/text-utils/package.json ./packages/text-utils/
COPY packages/text-utils/tsconfig.json ./packages/text-utils/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/ui/package.json ./packages/ui/

# Install dependencies (skip husky prepare script in Docker)
RUN HUSKY=0 pnpm install --frozen-lockfile

# Copy source files
COPY api/src/ ./api/src/
COPY packages/ ./packages/

# Build workspace packages first (text-utils exports TypeScript, needs compilation)
WORKDIR /app/packages/text-utils
RUN pnpm run build

# Build the API
WORKDIR /app/api
RUN pnpm run build

# =============================================================================
# Production stage
# =============================================================================
FROM node:20-alpine AS production

# Install pnpm and curl for healthchecks
RUN corepack enable && corepack prepare pnpm@latest --activate \
    && apk add --no-cache curl

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./

# Copy package.json files
COPY api/package.json ./api/
COPY packages/text-utils/package.json ./packages/text-utils/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/ui/package.json ./packages/ui/

# Install production dependencies only (skip lifecycle scripts like husky)
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy built files from builder
COPY --from=builder /app/api/dist ./api/dist
COPY --from=builder /app/packages/text-utils/dist ./packages/text-utils/dist
COPY --from=builder /app/packages/text-utils/package.json ./packages/text-utils/package.json
# Copy other packages source (they don't need compilation or are type-only)
COPY --from=builder /app/packages/types ./packages/types
COPY --from=builder /app/packages/utils ./packages/utils
COPY --from=builder /app/packages/api-client ./packages/api-client
COPY --from=builder /app/packages/ui ./packages/ui

WORKDIR /app/api

EXPOSE 8000

CMD ["node", "dist/src/server.js"]
