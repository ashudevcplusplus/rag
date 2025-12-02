# Project Structure

This document describes the professional, organized structure of the MVP repository.

## Root Directory

```
rag-main/
├── api/              # Main API service (Node.js/TypeScript)
├── embed/            # Embedding service (Python/FastAPI)
├── frontend/          # Simple web UI
├── docs/             # Project documentation
├── scripts/          # Root-level utility scripts
├── data/             # Runtime data (uploads)
├── docker-compose.yml
├── README.md
├── STRUCTURE.md
├── POSTMAN_SETUP.md
└── clean.sh
```

## API Service (`api/`)

```
api/
├── src/              # Source code
│   ├── config/       # Configuration files
│   │   └── database.ts
│   ├── config.ts     # Main configuration
│   ├── server.ts     # Application entry point
│   ├── consumers/    # BullMQ workers
│   │   ├── indexing/
│   │   └── consistency-check/
│   ├── controllers/  # Route handlers
│   ├── middleware/   # Express middleware
│   ├── models/       # Mongoose models
│   ├── queue/        # BullMQ queue clients
│   ├── repositories/ # Data access layer
│   ├── routes/       # Express route definitions
│   ├── schemas/      # TypeScript interfaces & Zod schemas
│   ├── scripts/      # Utility scripts (seed, clean-data)
│   ├── services/     # Business logic
│   ├── types/        # TypeScript type definitions
│   ├── utils/        # Utility functions
│   └── validators/   # Input validation
├── test/             # All test-related files
│   ├── unit/         # Unit tests
│   ├── integration/  # Integration tests
│   ├── e2e/          # End-to-end tests
│   ├── lib/          # Test utilities
│   ├── data/         # Test data files
│   └── docs/         # Test documentation
├── reports/          # Test reports and metrics
├── data/             # Runtime data (uploads, etc.)
├── logs/             # Application logs
├── dist/             # Compiled JavaScript (build output)
├── package.json
├── tsconfig.json
├── jest.config.js
└── jest.e2e.config.js
```

## Test Structure

- **Unit Tests**: `api/test/unit/` - Jest unit tests
- **E2E Tests**: `api/test/test-unified.ts` - End-to-end test suite
- **Test Utilities**: `api/test/lib/` - Shared test helpers
- **Test Data**: `api/test/data/` - Test data files
- **Test Docs**: `api/test/docs/` - Test documentation

## Documentation

- **Project Docs**: `docs/` - Application documentation and reports
- **Test Docs**: `api/test/docs/` - Testing guides and documentation

## Key Principles

1. **Separation of Concerns**: Source code, tests, and documentation are clearly separated
2. **Consolidation**: No duplicate files or utilities
3. **Consistency**: Standard naming and organization patterns
4. **Professional**: Industry-standard project structure

