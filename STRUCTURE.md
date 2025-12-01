# Project Structure

This document describes the professional, organized structure of the MVP repository.

## Root Directory

```
mvp/
├── api/              # Main API service (Node.js/TypeScript)
├── embed/            # Embedding service (Python/FastAPI)
├── docs/             # Project documentation
├── scripts/          # Root-level utility scripts
├── docker-compose.yml
├── README.md
├── clean.sh
└── STRUCTURE.md
```

## API Service (`api/`)

```
api/
├── src/              # Source code
│   ├── config.ts
│   ├── server.ts
│   ├── controllers/
│   ├── middleware/
│   ├── queue/
│   ├── services/
│   ├── types/
│   ├── utils/
│   └── validators/
├── test/             # All test-related files
│   ├── unit/         # Unit tests
│   ├── lib/          # Test utilities
│   ├── data/         # Test data files
│   ├── docs/         # Test documentation
│   └── test-unified.ts
├── reports/          # Test reports and metrics
├── data/             # Runtime data (uploads, etc.)
├── logs/             # Application logs
├── dist/             # Compiled JavaScript (build output)
├── package.json
├── tsconfig.json
└── jest.config.js
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

