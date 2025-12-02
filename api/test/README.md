# Test Suite

This directory contains all test-related files for the MVP API.

## Structure

```
test/
├── e2e/                     # Jest-based E2E tests
│   ├── 01-basic.e2e.test.ts
│   ├── 02-cache.e2e.test.ts
│   ├── 03-production.e2e.test.ts
│   ├── 04-large-data.e2e.test.ts
│   ├── 05-scale.e2e.test.ts
│   ├── config.ts
│   └── utils.ts
├── unit/                    # Unit tests
├── integration/             # Integration tests
├── lib/                     # Test utilities (shared)
└── data/                    # Test data files
```

## Usage

### Run E2E Tests

```bash
# Run all E2E tests (SLOW - ~15-20 minutes)
npm run test:e2e

# Run fast tests only (~2-3 minutes) - Recommended for quick validation
npm run test:e2e:fast

# Run only basic tests (~1 minute) - Fastest option
npm run test:e2e:basic

# Run specific test file by name pattern
npm run test:e2e -- 01-basic
npm run test:e2e -- 02-cache

# Run large/scale tests (~10-15 minutes)
npm run test:e2e:large

# Run search quality tests (~5-8 minutes)
npm run test:e2e:quality
```

### Test Speed Guide

| Command | Tests Included | Est. Time | Use Case |
|---------|---------------|-----------|----------|
| `test:e2e:basic` | 01-basic only | ~1 min | Quick smoke test |
| `test:e2e:fast` | 01, 02, 06 | ~2-3 min | Fast validation |
| `test:e2e:quality` | 07, 08, 09 | ~5-8 min | Search quality |
| `test:e2e:large` | 04, 05 | ~10-15 min | Performance testing |
| `test:e2e` | All tests | ~15-20 min | Full suite |

## Test Levels

The E2E tests are split into levels:

- **01-basic**: Basic E2E tests (small files, health checks)
- **02-cache**: Cache & chunking tests
- **03-production**: Production-grade features (metadata filtering, rate limiting)
- **04-large-data**: Large data tests
- **05-scale**: Extreme scale tests

## Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run database integration tests
npm run test:db

# Run file metadata integration tests
npm run test:file
```

Integration tests validate:
- Repository pattern CRUD operations
- MongoDB schema validation
- Data integrity and relationships
- Soft delete functionality
- Business logic (API key validation, storage limits, etc.)
