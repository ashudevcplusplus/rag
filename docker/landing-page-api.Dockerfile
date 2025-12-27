# =============================================================================
# Landing Page API Development Dockerfile
# =============================================================================
# Supports hot-reload with ts-node-dev
# =============================================================================

FROM node:20-alpine

# Install curl for healthchecks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files
COPY apps/landing-page-api/package.json ./
COPY apps/landing-page-api/tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source files (will be overwritten by volume mount)
COPY apps/landing-page-api/src/ ./src/

EXPOSE 8001

# Development command with ts-node-dev for hot-reload
CMD ["npm", "run", "dev"]

