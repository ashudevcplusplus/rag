# RAG Frontend Applications

This directory contains the frontend applications for the RAG system.

## Applications

### company-portal

A modern React-based company portal for document management and AI-powered search.

**Features:**
- Company-specific authentication
- Project management
- Document upload with progress tracking
- AI-powered semantic search
- User and team management
- Settings and configuration

**Tech Stack:**
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- React Query (server state)
- Zustand (client state)
- React Router (navigation)

**Quick Start:**
```bash
# From repo root
pnpm dev:portal    # Start development server
pnpm build:portal  # Build for production
```

## Adding New Applications

To add a new frontend application:

1. Create a new directory under `apps/`
2. Add a `package.json` with workspace dependencies
3. Configure to use shared packages from `packages/`
4. Update root `package.json` scripts if needed
