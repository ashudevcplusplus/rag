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

---

# MongoDB Database Schema - Implementation Guide

## Overview

This RAG system now includes a comprehensive MongoDB database with a clean repository pattern architecture for managing companies, users, projects, and file metadata.

## Architecture

### Three-Layer Pattern

1. **Schemas Layer** (`src/schemas/`) - TypeScript interfaces and Zod validation
2. **Models Layer** (`src/models/`) - Mongoose schemas and model definitions
3. **Repositories Layer** (`src/repositories/`) - Data access operations (CRUD)

## Database Schema

### Collections

#### 1. Companies
Stores company information, API keys, and subscription details.

**Key Fields:**
- `name`, `slug`, `email`
- `subscriptionTier`: FREE, STARTER, PROFESSIONAL, ENTERPRISE
- `storageLimit`, `storageUsed`, `maxUsers`, `maxProjects`
- `apiKey`, `apiKeyHash` (bcrypt hashed)
- `status`: ACTIVE, SUSPENDED, TRIAL, CANCELLED
- `settings`: Flexible JSON for notifications and features

**Indexes:**
- `slug` (unique)
- `email` (unique)
- `apiKey` (unique)
- `status`

#### 2. Users
User accounts with authentication and role-based access control.

**Key Fields:**
- `companyId` (ref: Company)
- `email`, `passwordHash` (bcrypt)
- `firstName`, `lastName`, `fullName` (virtual)
- `role`: OWNER, ADMIN, MEMBER, VIEWER
- `permissions`: Granular permissions object
- `isActive`, `lastLoginAt`, `failedLoginAttempts`, `lockedUntil`

**Indexes:**
- `companyId`
- `email` (unique)
- `role`
- `isActive`

**Security Features:**
- Account locking after 5 failed login attempts (30 min)
- Password hashing with bcrypt
- Soft delete support

#### 3. Projects
Organizational units for grouping files.

**Key Fields:**
- `companyId` (ref: Company)
- `ownerId` (ref: User)
- `name`, `slug`, `description`, `color`, `icon`
- `tags`: Array of strings
- `status`: ACTIVE, ARCHIVED, DELETED
- `visibility`: PRIVATE, TEAM, COMPANY
- `fileCount`, `totalSize`, `vectorCount` (stats)
- `settings`: Auto-indexing, chunk size configuration
- `metadata`: Custom department/category fields

**Indexes:**
- `(companyId, slug)` (compound unique)
- `companyId`
- `ownerId`
- `status`
- `tags`

#### 4. ProjectMembers
Many-to-many relationship between projects and users.

**Key Fields:**
- `projectId` (ref: Project)
- `userId` (ref: User)
- `role`: ADMIN, EDITOR, VIEWER
- `permissions`: Project-specific permissions
- `addedAt`, `addedBy`

**Indexes:**
- `(projectId, userId)` (compound unique)
- `projectId`
- `userId`

#### 5. FileMetadata
Comprehensive file tracking and processing status.

**Key Fields:**
- `projectId` (ref: Project)
- `uploadedBy` (ref: User)
- `filename`, `originalFilename`, `filepath`, `mimetype`, `size`, `hash`
- `uploadStatus`: UPLOADING, UPLOADED, FAILED
- `processingStatus`: PENDING, PROCESSING, COMPLETED, FAILED, RETRYING
- `indexingJobId`: BullMQ job ID
- `textExtracted`, `textLength`, `chunkCount`
- `vectorIndexed`, `vectorCollection`, `vectorIndexedAt`
- `errorMessage`, `retryCount`, `lastRetryAt`
- `tags`, `metadata`: Flexible document metadata

**Indexes:**
- `projectId`
- `uploadedBy`
- `processingStatus`
- `hash` (for deduplication)
- `uploadedAt` (descending)
- `tags`

#### 6. ApiLogs
Audit trail for API requests (with TTL auto-expiry).

**Key Fields:**
- `companyId` (ref: Company)
- `method`, `endpoint`, `statusCode`, `responseTime`
- `ipAddress`, `userAgent`, `apiKey`
- `requestSize`, `responseSize`, `errorMessage`
- `timestamp`

**Indexes:**
- `(companyId, timestamp)` (compound)
- `endpoint`
- `timestamp` with TTL (90 days auto-delete)

## Setup Instructions

### 1. Install Dependencies

```bash
cd api
npm install
```

New dependencies added:
- `mongoose` - MongoDB ODM
- `bcryptjs` - Password hashing
- `@types/bcryptjs` - TypeScript types

### 2. Start MongoDB

MongoDB is included in `docker-compose.yml`:

```bash
docker-compose up mongodb -d
```

Connection details:
- Host: `localhost:27017`
- Database: `rag_db`
- Username: `admin`
- Password: `admin123`

### 3. Seed Database

Populate the database with sample data:

```bash
npm run seed
```

This creates:
- 2 companies with API keys
- 4 users (password: `password123`)
- 4 projects across both companies

The seed script will output API keys - save these for testing!

### 4. Start Services

```bash
docker-compose up
```

## Repository Pattern Usage

### Example: Creating a User

```typescript
import { userRepository } from './repositories/user.repository';
import { UserRole } from './schemas/user.schema';

const user = await userRepository.create({
  companyId: 'company-id-here',
  email: 'user@example.com',
  passwordHash: await userRepository.hashPassword('password123'),
  firstName: 'John',
  lastName: 'Doe',
  role: UserRole.MEMBER,
});
```

### Example: Finding Users

```typescript
// Find by ID
const user = await userRepository.findById('user-id');

// Find by email
const user = await userRepository.findByEmail('user@example.com');

// List with pagination
const result = await userRepository.list(companyId, page, limit, {
  role: 'ADMIN',
  isActive: true,
});
```

### Example: Working with Projects

```typescript
import { projectRepository } from './repositories/project.repository';

// Create project
const project = await projectRepository.create({
  companyId: 'company-id',
  ownerId: 'user-id',
  name: 'My Project',
  slug: 'my-project',
  tags: ['important', 'customer-facing'],
  visibility: Visibility.COMPANY,
});

// Update project stats
await projectRepository.updateStats(projectId, {
  fileCount: 1,
  totalSize: 1024000,
  vectorCount: 50,
});

// Search projects
const results = await projectRepository.search(companyId, 'documentation', 1, 10);
```

## API Integration

### Authentication Flow

1. Client sends API key in header: `x-api-key: ck_xxxxxxxxxxxxx`
2. `auth.middleware.ts` validates key using `companyRepository.validateApiKey()`
3. Company details attached to request context
4. API key last-used timestamp updated

### File Upload Flow

1. File uploaded to `/v1/companies/:companyId/uploads`
2. Storage limit checked via `companyRepository.hasReachedStorageLimit()`
3. File metadata created in database with `PENDING` status
4. Job queued in BullMQ with file metadata ID
5. Worker processes file:
   - Status updated to `PROCESSING`
   - Text extracted and chunked
   - Vectors generated and stored in Qdrant
   - Status updated to `COMPLETED`
   - Storage usage incremented in company record

### Processing Status Tracking

```typescript
import { fileMetadataRepository } from './repositories/file-metadata.repository';

// Get file status
const file = await fileMetadataRepository.findById(fileId);
console.log(file.processingStatus); // PENDING, PROCESSING, COMPLETED, FAILED

// Get pending files
const pending = await fileMetadataRepository.getPendingFiles(10);

// Get failed files for retry
const failed = await fileMetadataRepository.getRetryableFiles(3, 10);
```

## Available Controllers

### User Controller (`user.controller.ts`)
- `POST /v1/companies/:companyId/users` - Create user
- `GET /v1/users/:userId` - Get user
- `GET /v1/companies/:companyId/users` - List users
- `PUT /v1/users/:userId` - Update user
- `DELETE /v1/users/:userId` - Delete user
- `PATCH /v1/users/:userId/active` - Activate/deactivate

### Project Controller (`project.controller.ts`)
- `POST /v1/companies/:companyId/projects` - Create project
- `GET /v1/projects/:projectId` - Get project
- `GET /v1/companies/:companyId/projects` - List projects
- `PUT /v1/projects/:projectId` - Update project
- `DELETE /v1/projects/:projectId` - Delete project
- `PATCH /v1/projects/:projectId/archive` - Archive/unarchive
- `GET /v1/projects/:projectId/stats` - Get stats
- `GET /v1/projects/search?q=term` - Search projects

## Environment Variables

Add to `.env` or `docker-compose.yml`:

```env
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/rag_db?authSource=admin
```

## Migrations

MongoDB is schema-less, but we use Mongoose schemas for validation. To modify schema:

1. Update TypeScript interface in `src/schemas/`
2. Update Zod validation schema
3. Update Mongoose model in `src/models/`
4. Update repository methods if needed
5. Existing documents will be validated on next save

## Performance Considerations

### Indexes
All critical queries have supporting indexes. Monitor slow queries with:

```typescript
mongoose.set('debug', true); // Development only
```

### Pagination
All list methods support pagination:

```typescript
const result = await repository.list(companyId, page, limit, filters);
// Returns: { items, total, page, totalPages }
```

### Aggregations
Use repositories for complex queries:

```typescript
// Get company stats
const stats = await companyRepository.getStats(companyId);
// Returns: { userCount, projectCount, fileCount, storageUsed, storageLimit }
```

## Security Features

### API Key Management
- Keys prefixed with `ck_` for identification
- Hashed with bcrypt before storage
- Last-used timestamp tracked
- Company status checked on every request

### Password Security
- Bcrypt hashing with salt rounds
- Account locking after failed attempts
- Password never returned in API responses

### Soft Deletes
All entities support **ONLY soft delete** (deletedAt field) to preserve data integrity and audit trail. Hard deletes are not implemented to ensure:
- Complete audit history
- Data recovery capabilities
- Referential integrity preservation
- Compliance with data retention policies

Deleted records are filtered out in queries using `.where({ deletedAt: null })` conditions.

## Troubleshooting

### Connection Issues
```bash
# Check MongoDB is running
docker ps | grep mongo

# Check connection string
echo $MONGODB_URI
```

### Seed Script Fails
```bash
# Clear database and re-seed
docker-compose down -v
docker-compose up mongodb -d
npm run seed
```

### Schema Validation Errors
Check Zod schemas match Mongoose models. Validation happens at:
1. API request (Zod)
2. Database save (Mongoose)

## Next Steps

1. Add API routes for new controllers in `server.ts`
2. Implement project member management endpoints
3. Add file listing endpoints for projects
4. Implement user authentication (login/logout)
5. Add API logging middleware
6. Create admin dashboard endpoints
7. Implement webhooks for processing status updates

## Useful Commands

```bash
# Seed database
npm run seed

# Start in development mode (with MongoDB)
docker-compose up

# View MongoDB data
docker exec -it rag-main-mongodb-1 mongosh -u admin -p admin123 --authenticationDatabase admin

# Clear all data
docker-compose down -v
```

## Schema Diagram

```
┌─────────────┐
│   Company   │
├─────────────┤
│ _id         │◄──────┐
│ name        │       │
│ apiKey      │       │
│ storageUsed │       │ 1:M
└─────────────┘       │
                      │
       ┌──────────────┤
       │              │
┌──────▼──────┐ ┌────▼─────┐
│    User     │ │  Project │
├─────────────┤ ├──────────┤
│ _id         │ │ _id      │
│ companyId   │ │ companyId│
│ email       │ │ ownerId  │◄──────┐
│ role        │ │ fileCount│       │
└─────────────┘ └──────────┘       │
       │              │             │ 1:M
       │              │             │
       │  M:M    ┌────▼──────────┐  │
       └────────►│ProjectMember  │  │
                 ├───────────────┤  │
                 │ projectId     │  │
                 │ userId        │  │
                 │ role          │  │
                 └───────────────┘  │
                                    │
                        ┌───────────┤
                        │
                 ┌──────▼────────┐
                 │ FileMetadata  │
                 ├───────────────┤
                 │ _id           │
                 │ projectId     │
                 │ uploadedBy    │
                 │ processingStatus
                 │ vectorIndexed │
                 └───────────────┘
```

## Support

For issues or questions:
1. Check MongoDB connection with `docker ps`
2. Review logs with `docker-compose logs api`
3. Verify seed data with `npm run seed`
4. Check API authentication with provided API keys
