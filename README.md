# MVP - Production-Grade RAG System

A production-ready document indexing system with intelligent chunking, Redis caching, async processing, and queue observability.

## Architecture

- **API**: Express.js service with authentication and rate limiting
- **Worker**: BullMQ worker with intelligent text processing
- **Qdrant**: Vector database for storing embeddings
- **Embed Service**: FastAPI service for generating embeddings
- **Redis**: Job queue + search result caching
- **Bull Board**: Real-time queue dashboard

## Key Features

### Core Features
✅ **Async Queue**: Non-blocking file uploads with HTTP 202 responses  
✅ **Batching**: Processes embeddings in batches of 50 for efficiency  
✅ **Idempotency**: Deterministic point IDs prevent duplicate indexing  
✅ **Retry Logic**: Automatic retries with exponential backoff  
✅ **Progress Tracking**: Real-time job status via `/v1/jobs/:jobId`

### Production-Grade Improvements ⚡
✅ **Intelligent Chunking**: Recursive text splitter preserves context (100% quality)  
✅ **Redis Caching**: 12x faster search for repeated queries (92% latency reduction)  
✅ **Queue Dashboard**: Visual monitoring at `/admin/queues`  
✅ **Authentication**: API key validation on all endpoints  
✅ **Rate Limiting**: Protects against abuse  
✅ **Error Handling**: Graceful degradation and detailed logging

## Prerequisites

### Docker Installation

This project requires Docker to run all services. The recommended approach is to use Docker Desktop for Linux, which provides a user-friendly GUI for managing containers, images, and services.

#### Installing Docker Desktop on Ubuntu

**System Requirements:**
- Ubuntu 22.04 or later (recommended)
- System up-to-date and meeting Docker Desktop system requirements

**Quick Installation (Automated):**

Run the provided installation script:
```bash
./scripts/install-docker-desktop.sh
```

**Manual Installation Steps:**

1. **Download the DEB package:**
   Download the official Docker Desktop `.deb` installation file from the [Docker website](https://www.docker.com/products/docker-desktop/).

2. **Install the package:**
   Open a terminal and run the following commands, replacing `docker-desktop-*-amd64.deb` with the actual filename:
   ```bash
   sudo apt update
   sudo apt install ./docker-desktop-*-amd64.deb
   ```

3. **Start Docker Desktop:**
   Once installed, launch Docker Desktop from your applications menu. You will need to accept the Subscription Service Agreement on the first run.

**Alternative:** If you prefer command-line Docker management, you can install Docker Engine directly. See the [Docker documentation](https://docs.docker.com/engine/install/ubuntu/) for instructions.

## Quick Start

1. **Start all services:**
```bash
docker-compose up -d
```

2. **Upload a file:**
```bash
curl -X POST http://localhost:8000/v1/companies/company-123/uploads \
  -H "x-api-key: dev-key-123" \
  -F "file=@document.pdf"
```

Response:
```json
{
  "message": "File queued for indexing",
  "jobId": "123",
  "fileId": "uuid-here",
  "statusUrl": "/v1/jobs/123"
}
```

3. **Check job status:**
```bash
curl http://localhost:8000/v1/jobs/123 \
  -H "x-api-key: dev-key-123"
```

4. **Search (with cache):**
```bash
curl -X POST http://localhost:8000/v1/companies/company-123/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key-123" \
  -d '{"query": "your search query", "limit": 5}'
```

Response includes `X-Cache: HIT` or `X-Cache: MISS` header.

5. **Monitor queue:**
Open http://localhost:8000/admin/queues in your browser to see:
- Active jobs
- Completed jobs
- Failed jobs
- Job payloads
- Performance metrics

## API Endpoints

- `POST /v1/companies/:companyId/uploads` - Upload file (returns jobId)
- `GET /v1/jobs/:jobId` - Get job status and progress
- `POST /v1/companies/:companyId/search` - Search company documents
- `GET /health` - Health check
- `GET /admin/queues` - Bull Board dashboard (⚡ NEW)

## Configuration

Environment variables (set in `docker-compose.yml`):
- `QDRANT_URL` - Qdrant service URL
- `EMBED_URL` - Embedding service URL
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port

## Development

```bash
cd api
npm install
npm run dev
```

## Testing

### Unit Tests

Run unit tests with Jest (uses mocks, no Docker required):

```bash
cd api
npm test
```

Watch mode:
```bash
npm run test:watch
```

### End-to-End Tests

E2E tests require the full Docker stack to be running:

```bash
# Start services
docker-compose up -d

# Run E2E test (tests with 2000-3000 word documents)
cd api
npm run test:e2e
```

The E2E test validates the complete workflow:
1. Uploads files of varying sizes (small, 2000 words, 3000 words)
2. Polls for job completion
3. Searches for the indexed content
4. Reports performance metrics

### Improvements Test (⚡ NEW)

Test the production-grade improvements:

```bash
cd api
npm run test:improvements
```

This test validates:
1. **Intelligent Chunking**: 100% context preservation
2. **Redis Caching**: 12x speed improvement
3. **Bull Board**: Dashboard accessibility

Expected results:
- First search: ~84ms (cache MISS)
- Cached search: ~7ms (cache HIT)
- Speedup: 12x faster

### CI/CD

GitHub Actions automatically runs all tests on every push and pull request.

## Production Considerations

### Performance
- **Search Latency**: 
  - First query: ~80-90ms (embedding + vector search)
  - Cached query: ~7ms (92% faster) ⚡
- **Chunking Quality**: 100% context preservation
- **Batch Size**: 50 chunks per batch (configurable in worker)
- **Concurrency**: 2 parallel jobs (configurable in worker)

### Limits
- **File Size**: 50MB per file (configurable in controller)
- **Cache TTL**: 1 hour (3600 seconds, configurable)
- **Rate Limits**: 
  - Upload: 10 requests/minute
  - Search: 30 requests/minute
  - General: 100 requests/15 minutes

### Storage & Memory
- **Files**: Deleted after processing to save disk space
- **Qdrant**: Only text previews (200 chars) stored in payloads
- **Redis Cache**: ~1-2MB per 1000 cached queries

### Monitoring
- **Queue Dashboard**: http://localhost:8000/admin/queues
- **Logs**: `docker-compose logs api -f`
- **Cache Stats**: Available via CacheService.getStats()
- **Health Check**: `curl http://localhost:8000/health`

## Performance Benchmarks

| Metric | Value |
|--------|-------|
| Upload Time | 20-70ms |
| Indexing Time (2000 words) | ~1 second |
| Search (first query) | 84ms |
| Search (cached) | 7ms ⚡ |
| Cache speedup | 12x |
| Context preservation | 100% |

## Architecture Diagrams

### Data Flow
```
Client → API → [Check Redis Cache]
              ├─ HIT: Return (7ms) ⚡
              └─ MISS: 
                  → Embed Service (generate vectors)
                  → Qdrant (vector search)
                  → Cache results
                  → Return (84ms)
```

### Processing Pipeline
```
Upload → Queue → Worker
                  ├─ Extract text
                  ├─ Recursive chunk (preserves context)
                  ├─ Batch process (50 chunks)
                  ├─ Generate embeddings
                  └─ Upsert to Qdrant
```

## What's Next?

See `IMPROVEMENTS_REPORT.txt` for detailed implementation notes.

Recommended next steps:
1. Load testing with concurrent users
2. ML-based chunk optimization
3. Semantic caching for similar queries
4. Document update tracking
5. Multi-tenancy isolation

## Documentation

- `docs/` - Project documentation and reports
- `api/test/docs/` - Test documentation and guides
- `api/test/README.md` - Test suite overview

