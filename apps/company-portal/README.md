# RAG Company Portal

A modern React frontend application for company-specific document management and AI-powered search.

## Features

- **Company Authentication** - Secure login with API key authentication
- **Dashboard** - Overview of projects, files, and activity
- **Projects** - Create and manage document projects
- **Document Upload** - Drag-and-drop file uploads with progress tracking
- **AI-Powered Search** - Semantic search across all documents
- **User Management** - Manage team members and permissions
- **Settings** - Configure API connection and preferences

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **React Query** - Server state management
- **Zustand** - Client state management
- **React Router** - Navigation
- **React Hot Toast** - Notifications

## Monorepo Packages

This app uses shared packages from the monorepo:

- `@rag/types` - Shared TypeScript types and interfaces
- `@rag/utils` - Utility functions (formatting, validation, etc.)
- `@rag/api-client` - API client for backend communication
- `@rag/ui` - Shared UI components (Button, Card, Modal, etc.)

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

From the repository root:

```bash
# Install all dependencies
pnpm install

# Start the development server
pnpm dev:portal
```

The app will be available at http://localhost:3000

### Building

```bash
# Build the portal
pnpm build:portal

# Preview the build
pnpm --filter @rag/company-portal preview
```

## Configuration

The app connects to the RAG API backend. Configure the API URL during login or in Settings.

Default API URL: `http://localhost:8000`

## Project Structure

```
src/
├── App.tsx              # Main app with routing
├── main.tsx             # Entry point
├── index.css            # Global styles
├── layouts/             # Layout components
│   ├── AuthLayout.tsx   # Login page layout
│   └── DashboardLayout.tsx # Main app layout
├── pages/               # Page components
│   ├── auth/            # Authentication pages
│   ├── dashboard/       # Dashboard page
│   ├── projects/        # Project management
│   ├── upload/          # File upload
│   ├── search/          # Document search
│   ├── users/           # User management
│   └── settings/        # Settings page
└── store/               # Zustand stores
    ├── auth.store.ts    # Authentication state
    └── app.store.ts     # Application state
```

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint

## License

MIT
