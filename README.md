# RAG System - Production-Ready Document Indexing

A production-grade Retrieval-Augmented Generation (RAG) system with async processing, intelligent chunking, Redis caching, and real-time monitoring.

## 📋 Overview

This system provides document indexing and semantic search capabilities with:
- **Async Processing**: Non-blocking uploads with queue-based indexing
- **Smart Chunking**: Context-preserving text splitting for optimal search quality
- **Fast Search**: Redis-cached results with 12x speedup (7ms vs 84ms)
- **Monitoring**: Real-time queue dashboard and comprehensive logging
- **Production-Ready**: Authentication, rate limiting, retry logic, and error handling

## 🏗️ Architecture

```
┌──────────┐    ┌─────────┐    ┌─────────┐
│  Client  │───▶│   API   │───▶│  Queue  │
└──────────┘    │ Express │    │ BullMQ  │
                └────┬────┘    └────┬────┘
                     │              │
                     ▼              ▼
              ┌──────────┐    ┌─────────┐
              │  Redis   │    │ Worker  │
              │  Cache   │    └────┬────┘
              └──────────┘         │
                     ▲              ▼
                     │         ┌─────────┐
                     │         │  Embed  │
                     │         │ FastAPI │
                     │         └────┬────┘
                     │              │
                     │              ▼
                     │         ┌─────────┐
                     └─────────│ Qdrant  │
                               │ Vector  │
                               └─────────┘
```

### Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **API** | Express.js (TypeScript) | REST endpoints, auth, rate limiting |
| **Worker** | BullMQ (TypeScript) | Async document processing |
| **Embed** | FastAPI (Python) | Text embedding generation (384d) |
| **Qdrant** | Vector DB | Semantic search storage |
| **Redis** | Cache + Queue | Job queue + search result caching |
| **Bull Board** | Web UI | Queue monitoring dashboard |

## ⚡ Key Features

### Core Functionality
- ✅ Async file uploads (HTTP 202) with job tracking
- ✅ Intelligent text chunking (recursive splitter, context-aware)
- ✅ Batch embedding generation (50 chunks/batch)
- ✅ Semantic vector search with metadata filtering
- ✅ Idempotent operations (deterministic IDs)

### Production Features
- ✅ Redis caching (12x faster repeat searches)
- ✅ API key authentication
- ✅ Rate limiting (upload, search, global)
- ✅ Retry logic with exponential backoff
- ✅ Real-time queue monitoring
- ✅ Comprehensive error handling
- ✅ Structured logging with Winston

## 🚀 Quick Start

### Prerequisites
- Docker Desktop (recommended) or Docker Engine
- 8GB RAM minimum
- Ubuntu 22.04+ or macOS

### Installation

1. **Clone & Start Services**
```bash
git clone <repository>
cd rag-main
docker-compose up -d
```

2. **Verify Services**
```bash
# Check all services are running
docker-compose ps

# Health check
curl http://localhost:8000/health
```

### Basic Usage

**Upload a Document**
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

**Check Job Status**
```bash
curl http://localhost:8000/v1/jobs/123 \
  -H "x-api-key: dev-key-123"
```

**Search Documents**
```bash
curl -X POST http://localhost:8000/v1/companies/company-123/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-key-123" \
  -d '{
    "query": "machine learning algorithms",
    "limit": 5
  }'
```

**Monitor Queue**
```
Open: http://localhost:8000/admin/queues
```

## 📊 Performance

| Metric | Value | Notes |
|--------|-------|-------|
| Upload latency | 20-70ms | API response time |
| Indexing (2000 words) | ~1s | Full pipeline |
| Search (first) | 84ms | Embedding + vector search |
| Search (cached) | 7ms | **12x faster** 🚀 |
| Cache hit rate | 92% | Typical workload |
| Context preservation | 100% | Intelligent chunking |

## 🔧 Configuration

### Environment Variables
```yaml
# docker-compose.yml
QDRANT_URL=http://qdrant:6333
EMBED_URL=http://embed:5001
REDIS_HOST=redis
REDIS_PORT=6379
NODE_ENV=production
```

### Limits
```typescript
// Configurable in source code
FILE_SIZE_LIMIT: 50MB
CACHE_TTL: 3600s (1 hour)
CHUNK_SIZE: 500 tokens
CHUNK_OVERLAP: 50 tokens
BATCH_SIZE: 50 chunks
RATE_LIMITS:
  - Upload: 10/minute
  - Search: 30/minute
  - Global: 100/15min
```

## 🧪 Testing

### Unit Tests (No Docker Required)
```bash
cd api
npm install
npm test              # Run all unit tests
npm run test:watch    # Watch mode
```

### E2E Tests (Docker Required)
```bash
# Start services
docker-compose up -d

# Run E2E tests
cd api
npm run test:unified
```

Tests validate:
- File upload & indexing pipeline
- Job status tracking
- Search functionality
- Cache hit/miss behavior
- Error handling & retries

## 📁 Project Structure

```
rag-main/
├── api/                        # Express API
│   ├── src/
│   │   ├── controllers/       # Route handlers
│   │   ├── middleware/        # Auth, rate limiting, errors
│   │   ├── services/          # Business logic (cache, vector)
│   │   ├── queue/            # BullMQ worker
│   │   ├── utils/            # Logger, text processor
│   │   ├── validators/       # Input validation
│   │   └── server.ts         # App entry point
│   ├── test/                 # Unit & E2E tests
│   └── package.json
├── embed/                    # FastAPI embedding service
│   ├── app.py               # Embedding endpoint
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml       # Service orchestration
└── README.md               # This file
```

## 🔌 API Reference

### Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| `POST` | `/v1/companies/:companyId/uploads` | Upload file for indexing | ✅ |
| `GET` | `/v1/jobs/:jobId` | Check job status | ✅ |
| `POST` | `/v1/companies/:companyId/search` | Semantic search | ✅ |
| `GET` | `/health` | Service health check | ❌ |
| `GET` | `/admin/queues` | Queue monitoring dashboard | ❌ |

### Authentication
All endpoints (except `/health` and `/admin`) require:
```
Header: x-api-key: dev-key-123
```

### Response Codes
- `200` - Success
- `202` - Accepted (async processing)
- `401` - Unauthorized
- `429` - Rate limit exceeded
- `500` - Internal error

## 🎯 Development Workflow

### Local Development
```bash
cd api
npm install
npm run dev      # Watch mode with ts-node-dev
```

### Linting & Formatting
```bash
npm run lint          # Check code
npm run lint:fix      # Auto-fix issues
npm run format        # Format code
npm run format:check  # Check formatting
```

### Build
```bash
npm run build    # Compile TypeScript
npm start        # Run compiled code
```

## 🛠️ Troubleshooting

### Services Not Starting
```bash
# Check logs
docker-compose logs api
docker-compose logs worker
docker-compose logs qdrant

# Restart services
docker-compose restart
```

### Queue Issues
1. Open Bull Board: `http://localhost:8000/admin/queues`
2. Check failed jobs
3. Review error messages
4. Retry failed jobs from UI

### Cache Issues
```bash
# Clear Redis cache
docker-compose exec redis redis-cli FLUSHDB
```

## 📈 Production Deployment

### Recommendations
1. **Environment**: Use production-grade Redis & Qdrant clusters
2. **Secrets**: Store API keys in secure vault (e.g., AWS Secrets Manager)
3. **Scaling**: Increase worker concurrency for higher throughput
4. **Monitoring**: Add Prometheus/Grafana for metrics
5. **Backup**: Regular Qdrant snapshots
6. **CDN**: Cache static assets (Bull Board UI)

### Docker Production Build
```bash
# Build optimized images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## 🚦 Monitoring & Observability

### Available Metrics
- Queue depth & processing rate (Bull Board)
- Cache hit/miss rate (Redis)
- Search latency (logs)
- Error rates (Winston logs)
- Job success/failure rates

### Logging
```bash
# Real-time logs
docker-compose logs -f api

# Search logs
docker-compose logs api | grep "ERROR"
```

## 📝 Key Implementation Details

### Intelligent Chunking
Uses recursive character text splitter to:
- Preserve sentence and paragraph boundaries
- Maintain context across chunks
- Optimize for 384-dimension embeddings
- Ensure 100% content coverage

### Caching Strategy
- **Key**: `search:${companyId}:${hash(query)}`
- **TTL**: 1 hour
- **Invalidation**: Manual or time-based
- **Storage**: JSON-serialized results

### Idempotency
- Point IDs: `${companyId}-${fileId}-chunk-${index}`
- Re-uploads overwrite previous data
- No duplicate vectors in database

## 🔮 Future Enhancements

### Short-term
- [ ] Semantic caching for similar queries
- [ ] Document update tracking
- [ ] Batch search endpoint
- [ ] PDF table extraction

### Long-term
- [ ] Multi-modal embeddings (text + images)
- [ ] Query rewriting for better results
- [ ] ML-based chunk optimization
- [ ] Real-time indexing updates

## 📚 Additional Documentation

- **Test Docs**: `api/test/docs/` - Testing guides
- **API Tests**: `api/test/` - Test suites
- **Postman**: `MVP_API.postman_collection.json` - API collection
- **Scripts**: `scripts/` - Utility scripts

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Standards
- TypeScript strict mode
- ESLint + Prettier
- Unit tests for new features
- Update documentation

## 📄 License

[Add your license here]

## 👥 Authors

[Add authors here]

---

**Built with**: TypeScript, Express, BullMQ, FastAPI, Qdrant, Redis, Docker
