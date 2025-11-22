# Unified Test Suite

A single, unified test file that combines all test scenarios with 5 difficulty levels.

## Usage

Run tests with a specific difficulty level (1-5):

```bash
# Level 1: Basic E2E Tests
npm run test:unified -- --difficulty=1
# or
npm run test:unified -- -d=1
# or simply
npm run test:unified -- 1

# Level 2: Cache & Chunking Tests
npm run test:unified -- --difficulty=2

# Level 3: Production-Grade Features
npm run test:unified -- --difficulty=3

# Level 4: Large Data Tests
npm run test:unified -- --difficulty=4

# Level 5: Extreme Scale Tests
npm run test:unified -- --difficulty=5
```

## Difficulty Levels

### Level 1: Basic E2E Tests
- Small file upload and search
- API health check
- **Duration**: ~30 seconds
- **Requirements**: None

### Level 2: Cache & Chunking Tests
- Cache performance (MISS/HIT)
- Intelligent chunking quality
- Bull Board dashboard check
- **Duration**: ~2 minutes
- **Requirements**: `test-data-2000.txt`

### Level 3: Production-Grade Features
- Metadata filtering
- Rate limiting
- Graceful shutdown check
- **Duration**: ~3-5 minutes
- **Requirements**: `test-data-2000.txt`, `test-data-3000.txt`

### Level 4: Large Data Tests
- Multiple file uploads
- Performance metrics collection
- Search with large collections
- **Duration**: ~5-10 minutes
- **Requirements**: Test data directory with `1mb.txt`, `5mb.txt` (run `npm run generate:test-data`)

### Level 5: Extreme Scale Tests
- Large file uploads (30MB+)
- Concurrent uploads
- Stress test with multiple large files
- **Duration**: ~10-20 minutes
- **Requirements**: Test data directory with `15mb.txt`, `30mb.txt`, `45mb.txt`

## Test Reports

Test results are automatically saved to `api/reports/test-report-level{N}-{timestamp}.json`

## Environment Variables

- `API_URL`: API endpoint (default: `http://localhost:8000`)
- `API_KEY`: API key for authentication (default: `dev-key-123`)

## Examples

```bash
# Quick smoke test
npm run test:unified -- 1

# Full production-grade validation
npm run test:unified -- 3

# Performance and scale testing
npm run test:unified -- 5
```

## Migration from Old Test Files

The unified test suite replaces:
- `test-e2e.ts` → Level 1
- `test-improvements.ts` → Level 2
- `test-production-grade.ts` → Level 3
- `test-large-data.ts` → Level 4 & 5

Old test files are still available but deprecated. Use `test:unified` for all testing needs.

