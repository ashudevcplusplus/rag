# Test Suite

This directory contains all test-related files for the MVP API.

## Structure

```
test/
├── test-unified.ts          # Unified test suite with difficulty levels 1-5
├── generate-test-data.ts    # Script to generate test data files
├── lib/                     # Test utilities
│   ├── uploader.ts          # File upload helpers
│   ├── index-wait.ts        # Indexing wait utilities
│   └── metrics.ts           # Performance metrics collection
├── data/                    # Test data files
│   ├── 1mb.txt
│   ├── 5mb.txt
│   └── ... (generated files)
├── docs/                    # Test documentation
│   ├── README_UNIFIED_TESTS.md
│   ├── TICKET_LARGE_DATA_TESTING.md
│   └── PHASE_A_README.md
├── test-data-2000.txt       # Legacy test files
├── test-data-3000.txt
└── test-sample-small.txt
```

## Usage

### Run Unified Tests

```bash
# Run with difficulty level 1-5
npm run test:unified -- --difficulty=1
npm run test:unified -- --difficulty=2
npm run test:unified -- --difficulty=3
npm run test:unified -- --difficulty=4
npm run test:unified -- --difficulty=5
```

### Generate Test Data

```bash
npm run generate:test-data
```

This will generate test data files in the `data/` directory.

## Test Reports

Test reports are saved to `api/reports/test-report-level{N}-{timestamp}.json`

## Difficulty Levels

- **Level 1**: Basic E2E tests (small files, health checks)
- **Level 2**: Cache & chunking tests (performance, quality)
- **Level 3**: Production-grade features (metadata filtering, rate limiting)
- **Level 4**: Large data tests (multiple files, performance metrics)
- **Level 5**: Extreme scale tests (large files, concurrent uploads, stress tests)

See `docs/README_UNIFIED_TESTS.md` for detailed documentation.

