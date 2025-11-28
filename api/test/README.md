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
├── generate-test-data.ts    # Script to generate test data files
├── lib/                     # Test utilities (shared)
└── data/                    # Test data files
```

## Usage

### Run E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- 01-basic
```

### Generate Test Data

```bash
npm run generate:test-data
```

## Test Levels

The E2E tests are split into levels:

- **01-basic**: Basic E2E tests (small files, health checks)
- **02-cache**: Cache & chunking tests
- **03-production**: Production-grade features (metadata filtering, rate limiting)
- **04-large-data**: Large data tests
- **05-scale**: Extreme scale tests
