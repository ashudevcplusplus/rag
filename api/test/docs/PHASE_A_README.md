# Phase A: Large Data Testing Framework

## Overview

Complete testing framework for validating system performance with large file uploads (1MB - 45MB).

## Components

### 1. Test Data Generator (`generate-test-data.ts`)
- Generates realistic, seedable test files
- Avoids compression artifacts with entropy injection
- Supports smoke (1MB) and full (5MB-45MB) modes

### 2. Main Test Runner (`test-large-data.ts`)
- Orchestrates upload → indexing → metrics pipeline
- Supports `--mode=smoke` and `--mode=full` flags
- Generates JSON reports in `reports/` directory

### 3. Helper Libraries

#### `lib/uploader.ts`
- Multipart file upload with timing
- Batch upload support
- Error handling and retry logic

#### `lib/index-wait.ts`
- Job status polling with progress tracking
- Configurable timeout (default 10 min)
- Batch job waiting support

#### `lib/metrics.ts`
- System metrics collection (memory, CPU)
- Search latency measurement (P95, avg, min, max)
- Report generation and formatting

## Usage

### Quick Start (Smoke Test)

```bash
# 1. Generate 1MB test file
npm run generate:test-data

# 2. Run smoke test (fast validation)
npm run test:large -- --mode=smoke
```

### Full Performance Test

```bash
# 1. Generate all test files (5MB, 15MB, 30MB, 45MB)
npm run generate:test-data -- --full

# 2. Run full test suite (takes ~10-15 minutes)
npm run test:large -- --mode=full
```

### Alternative CLI

```bash
# Using ts-node directly
npx ts-node test/generate-test-data.ts --full
npx ts-node test/test-unified.ts --difficulty=4
```

## Environment Variables

```bash
API_URL=http://localhost:8000  # API endpoint
API_KEY=dev-key-123            # Authentication key
```

## Expected Output

### Console Output
```
🚀 Large Data Performance Test
======================================================================
Mode:       SMOKE
Company ID: perf_test_1732225678901
API URL:    http://localhost:8000
======================================================================

──────────────────────────────────────────────────────────────────────
Test 1/1: 1mb.txt
──────────────────────────────────────────────────────────────────────
📄 File size: 1.00 MB

1️⃣  Upload Phase
   📤 Uploading 1mb.txt (1.00 MB)...
   ✅ Upload completed in 0.45s
   Job ID: 123

2️⃣  Indexing Phase
   ⏳ Waiting for indexing to complete (Job: 123)...
      Progress: 30%
      Progress: 100%
   ✅ Indexing completed in 2.34s
      Chunks: 5
   Throughput: 2.14 chunks/sec

3️⃣  Metrics Collection
   📊 Gathering system metrics...
   ✅ Metrics collected
      Search P95:  45ms
      Memory RSS:  120 MB
      Heap Used:   85 MB

📄 Report written to: reports/perf-report-smoke-1732225678901.json

======================================================================
📊 PERFORMANCE TEST SUMMARY
======================================================================

Mode: SMOKE
Company ID: perf_test_1732225678901
Tests Run: 1

----------------------------------------------------------------------
Per-File Results:
----------------------------------------------------------------------

1. 1mb.txt
   Upload Time:    0.45s
   Indexing Time:  2.34s
   Total Time:     2.79s
   Chunks:         5
   Search P95:     45ms
   Memory RSS:     120 MB

----------------------------------------------------------------------
Aggregate Statistics:
----------------------------------------------------------------------
Total Upload Time:   0.45s
Total Indexing Time: 2.34s
Total Chunks:        5
Avg Throughput:      2.14 chunks/sec

======================================================================

✅ All tests passed!
```

### JSON Report Format

Reports are saved to `api/reports/perf-report-{mode}-{timestamp}.json`:

```json
{
  "mode": "smoke",
  "companyId": "perf_test_1732225678901",
  "startTime": "2025-11-21T22:30:00.000Z",
  "results": [
    {
      "file": "1mb.txt",
      "fileSize": 1048576,
      "uploadTimeMs": 450,
      "indexTimeMs": 2340,
      "chunks": 5,
      "success": true,
      "metrics": {
        "timestamp": "2025-11-21T22:30:05.000Z",
        "memory": {
          "rssMB": 120,
          "heapUsedMB": 85,
          "heapTotalMB": 110,
          "externalMB": 2
        },
        "search": {
          "avgLatencyMs": 38,
          "minLatencyMs": 32,
          "maxLatencyMs": 52,
          "p95LatencyMs": 45,
          "successRate": 1
        },
        "process": {
          "uptimeSec": 45,
          "cpuUsage": 2.5
        }
      }
    }
  ],
  "summary": {
    "totalTests": 1,
    "successfulTests": 1,
    "failedTests": 0,
    "totalUploadTimeMs": 450,
    "totalIndexTimeMs": 2340,
    "totalChunks": 5,
    "endTime": "2025-11-21T22:30:10.000Z"
  }
}
```

## Test Files

Generated in `api/test-data/`:

| Mode  | Files                                     | Total Size |
|-------|-------------------------------------------|------------|
| Smoke | 1mb.txt                                   | ~1 MB      |
| Full  | 1mb.txt, 5mb.txt, 15mb.txt, 30mb.txt, 45mb.txt | ~96 MB |

## Success Criteria

✅ Upload completes within 30s per file  
✅ Indexing completes within 10 minutes  
✅ Search P95 latency < 200ms  
✅ Memory RSS < 500MB  
✅ No job failures  

## Troubleshooting

### "Missing file" error
```bash
# Re-generate test data
npm run generate:test-data -- --full
```

### "Job timeout" error
- Increase timeout in `lib/index-wait.ts`
- Check worker logs: `docker-compose logs api`
- Verify Redis and Qdrant are running

### "Connection refused"
```bash
# Ensure API is running
curl http://localhost:8000/health

# Check Docker services
docker-compose ps
```

## Next Steps

After Phase A completes successfully:
- Phase B: Stress testing (concurrent uploads)
- Phase C: Resource monitoring (Prometheus metrics)
- Phase D: Production deployment validation

