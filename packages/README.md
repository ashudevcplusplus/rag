# RAG Shared Packages

This directory contains shared packages used across the RAG monorepo.

## Packages

### @rag/types

Shared TypeScript types and interfaces for the entire application.

**Exports:**
- Enums (UserRole, ProjectStatus, ProcessingStatus, etc.)
- Entity types (User, Company, Project, File, etc.)
- API request/response types
- DTO types for create/update operations

### @rag/utils

Utility functions for common operations.

**Exports:**
- String utilities (escapeHtml, truncate, slugify)
- Format utilities (formatBytes, formatRelativeTime, formatDate)
- Validation utilities (isValidEmail, isStrongPassword, isValidSlug)
- Storage utilities (getStorageItem, setStorageItem, removeStorageItem)
- Async utilities (debounce, sleep)
- Class name utilities (cn for Tailwind CSS)

### @rag/api-client

API client for communicating with the RAG backend.

**Exports:**
- `configureApiClient` - Configure the API client
- `api.auth` - Authentication endpoints
- `api.company` - Company management
- `api.projects` - Project CRUD operations
- `api.files` - File management and uploads
- `api.search` - Document search
- `api.jobs` - Job status tracking
- `api.users` - User management
- `api.vectors` - Vector database operations

### @rag/ui

Shared React UI components with TailwindCSS styling.

**Components:**
- Button - Configurable button with variants and loading state
- Input / Textarea - Form inputs with labels and error states
- Card - Container component with header, content, footer
- Badge - Status and label badges
- Modal - Modal dialog with customizable content
- Spinner / LoadingOverlay - Loading indicators
- Avatar - User avatar with initials fallback
- EmptyState - Empty state placeholder
- StatusBadge - Processing/project status badges
- ProgressBar - Progress indicator

## Usage

All packages are linked via pnpm workspaces. Import them in any app:

```typescript
import { User, Project } from '@rag/types';
import { formatBytes, cn } from '@rag/utils';
import { api, configureApiClient } from '@rag/api-client';
import { Button, Card, Modal } from '@rag/ui';
```

## Development

Packages use TypeScript source directly (no build step required for development).

For type checking:
```bash
pnpm -r typecheck
```
