# =============================================================================
# Company Portal Development Dockerfile
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

# Copy package.json files for company-portal and its dependencies
COPY apps/company-portal/package.json ./apps/company-portal/
COPY apps/company-portal/tsconfig.json ./apps/company-portal/
COPY apps/company-portal/tsconfig.node.json ./apps/company-portal/
COPY apps/company-portal/vite.config.ts ./apps/company-portal/
COPY apps/company-portal/tailwind.config.js ./apps/company-portal/
COPY apps/company-portal/postcss.config.js ./apps/company-portal/

# Copy workspace packages that company-portal depends on
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/api-client/package.json ./packages/api-client/
COPY packages/ui/package.json ./packages/ui/

# Install dependencies
RUN pnpm install

# Copy source files
COPY apps/company-portal/src/ ./apps/company-portal/src/
COPY apps/company-portal/index.html ./apps/company-portal/
COPY apps/company-portal/public/ ./apps/company-portal/public/
COPY packages/ ./packages/

WORKDIR /app/apps/company-portal

EXPOSE 3000

# Development command - Vite with host flag for Docker
CMD ["pnpm", "run", "dev", "--host", "0.0.0.0", "--port", "3000"]

