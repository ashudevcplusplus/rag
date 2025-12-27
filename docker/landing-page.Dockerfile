# =============================================================================
# Landing Page Development Dockerfile
# =============================================================================
# Vite dev server with hot-reload (HMR)
# =============================================================================

FROM node:20-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace configuration
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./

# Copy package.json files for landing-page
COPY apps/landing-page/package.json ./apps/landing-page/
COPY apps/landing-page/tsconfig.json ./apps/landing-page/
COPY apps/landing-page/tsconfig.node.json ./apps/landing-page/
COPY apps/landing-page/vite.config.ts ./apps/landing-page/
COPY apps/landing-page/tailwind.config.js ./apps/landing-page/
COPY apps/landing-page/postcss.config.js ./apps/landing-page/

# Copy workspace packages (landing page may use shared packages)
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/

# Install dependencies
RUN pnpm install

# Copy source files
COPY apps/landing-page/src/ ./apps/landing-page/src/
COPY apps/landing-page/index.html ./apps/landing-page/
COPY apps/landing-page/public/ ./apps/landing-page/public/
COPY packages/ ./packages/

WORKDIR /app/apps/landing-page

EXPOSE 3001

# Development command - Vite with host flag for Docker
CMD ["pnpm", "run", "dev", "--host", "0.0.0.0", "--port", "3001"]

