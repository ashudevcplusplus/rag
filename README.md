# RAG System - Production-Ready Document Indexing

A production-grade Retrieval-Augmented Generation (RAG) system with async processing, intelligent chunking, Redis caching, and real-time monitoring.

## 📋 Overview

This system provides document indexing and semantic search capabilities with:
- **Async Processing**: Non-blocking uploads with queue-based indexing
- **Smart Chunking**: Context-preserving text splitting for optimal search quality
- **Fast Search**: Redis-cached results with 12x speedup (7ms vs 84ms)
- **Monitoring**: Real-time queue dashboard and comprehensive logging
- **Production-Ready**: Authentication, rate limiting, retry logic, and error handling
- **Modern Frontend**: React-based company portal with TailwindCSS

## 🏗️ Architecture

```
┌──────────────┐    ┌─────────┐    ┌──────────────────┐
│  Company     │───▶│   API   │───▶│  Queue Manager   │
│  Portal      │    │ Express │    │    (BullMQ)      │
└──────────────┘    └────┬────┘    └─────────┬────────┘
                         │                   │
                         │         ┌─────────┴────────────────┐
                         │         │                          │
                         ▼         ▼                          ▼
                  ┌──────────┐  ┌──────────┐        ┌───────────────┐
                  │  Redis   │  │ Indexing │        │  Async Tasks  │
                  │  Cache + │  │  Worker  │        │  Workers (×10)│
                  │  Queues  │  │  (×1)    │        │  (×10 each)   │
                  └────┬─────┘  └────┬─────┘        └───────┬───────┘
                       │             │                      │
                       │             ▼                      │
                       │        ┌─────────┐                │
                       │        │ MongoDB │                │
                       │        │  Docs   │                │
                       │        └────┬────┘                │
                       │             │                     │
                       │             ▼                     │
                       │        ┌─────────┐               │
                       │        │  Embed  │◄──────────────┘
                       │        │ FastAPI │
                       │        └────┬────┘
                       │             │
                       │             ▼
                       │        ┌─────────┐
                       └───────▶│ Qdrant  │
                                │ Vector  │
                                └─────────┘
```

### Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Company Portal** | React + TypeScript | Web UI for document management |
| **API** | Express.js (TypeScript) | REST endpoints, auth, rate limiting |
| **Workers** | BullMQ (TypeScript) | 12 specialized workers for async tasks |
| **Embed** | FastAPI (Python) | Text embedding generation (384d) |
| **Qdrant** | Vector DB | Semantic search storage |
| **MongoDB** | NoSQL DB | Companies, users, projects, file metadata |
| **Redis** | Cache + Queue | 12 job queues + search result caching |
| **Bull Board** | Web UI | Queue monitoring dashboard |

## 🚀 Quick Start

### Prerequisites
- Docker Desktop (recommended) or Docker Engine
- Node.js 18+ and pnpm
- 8GB RAM minimum

### Installation

1. **Clone & Install Dependencies**
```bash
git clone <repository>
cd rag-main
pnpm install
```

2. **Start Backend Services**
```bash
docker-compose up -d
```

3. **Seed Database (Optional)**
```bash
cd api
npm run seed
```
This creates sample companies, users, and projects with API keys for testing.

4. **Start Company Portal**
```bash
# From repo root
pnpm dev:portal
```

5. **Verify Services**
```bash
# Check all services are running
docker-compose ps

# Health check
curl http://localhost:8000/health

# Open Company Portal
open http://localhost:3000
```

### Quick Commands

| Command | Description |
|---------|-------------|
| `pnpm dev:portal` | Start company portal development server |
| `pnpm dev:all` | Start all services (Docker + portal) |
| `pnpm build:portal` | Build company portal for production |
| `pnpm stop:all` | Stop all services |
| `pnpm restart:all` | Restart all services |

## 📁 Project Structure

This is a **pnpm monorepo** with the following structure:

```
rag-main/
├── api/                          # Express API (TypeScript)
│   ├── src/
│   │   ├── config/               # Configuration
│   │   ├── consumers/            # BullMQ workers
│   │   ├── controllers/          # Route handlers
│   │   ├── middleware/           # Auth, rate limiting
│   │   ├── models/               # Mongoose models
│   │   ├── queue/                # BullMQ queue clients
│   │   ├── repositories/         # Data access layer
│   │   ├── routes/               # Express routes
│   │   ├── schemas/              # TypeScript interfaces & Zod
│   │   ├── services/             # Business logic
│   │   ├── types/                # Enums & event types
│   │   ├── utils/                # Utilities
│   │   └── server.ts             # Entry point
│   └── test/                     # Test suite
│
├── apps/                         # Frontend applications
│   ├── company-portal/           # Main web UI (React + Vite)
│   │   ├── src/
│   │   │   ├── layouts/          # Auth & Dashboard layouts
│   │   │   ├── pages/            # Route pages
│   │   │   └── store/            # Zustand state
│   │   └── package.json
│   └── landing-page/             # Marketing site
│
├── packages/                     # Shared packages
│   ├── api-client/               # API client library
│   ├── types/                    # Shared TypeScript types
│   ├── ui/                       # React UI components
│   └── utils/                    # Utility functions
│
├── embed/                        # FastAPI embedding service (Python)
├── frontend/                     # Legacy simple web UI
├── docs/                         # Documentation
├── docker-compose.yml            # Service orchestration
├── pnpm-workspace.yaml           # Monorepo config
└── package.json                  # Root package.json
```

## 🎨 Frontend Applications

### Company Portal (`apps/company-portal`)

A modern React-based portal for document management and AI-powered search.

**Features:**
- Company-specific authentication
- Project management with file organization
- Document upload with progress tracking
- AI-powered semantic search
- User and team management
- Settings and configuration

**Tech Stack:**
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- React Query (server state)
- Zustand (client state)
- React Router (navigation)

### Shared Packages

| Package | Description |
|---------|-------------|
| `@rag/types` | Shared TypeScript types and interfaces |
| `@rag/utils` | Utility functions (formatting, validation) |
| `@rag/api-client` | API client for backend communication |
| `@rag/ui` | Reusable React UI components |

**Usage:**
```typescript
import { User, Project } from '@rag/types';
import { formatBytes, cn } from '@rag/utils';
import { api, configureApiClient } from '@rag/api-client';
import { Button, Card, Modal } from '@rag/ui';
```

## ⚡ Key Features

### Core Functionality
- ✅ Async file uploads (HTTP 202) with job tracking
- ✅ Intelligent text chunking (recursive splitter, context-aware)
- ✅ Batch embedding generation (50 chunks/batch)
- ✅ Semantic vector search with metadata filtering
- ✅ Hybrid search with reranking support
- ✅ Idempotent operations (deterministic IDs)
- ✅ MongoDB database with repository pattern
- ✅ Company, User, and Project management
- ✅ Consistency checking between MongoDB and Qdrant

### Production Features
- ✅ Redis caching (12x faster repeat searches)
- ✅ Database-backed API key authentication
- ✅ Multi-tier rate limiting (per-IP, per-company, global)
- ✅ Retry logic with exponential backoff
- ✅ Real-time queue monitoring (Bull Board)
- ✅ Comprehensive error handling
- ✅ Structured logging with Winston
- ✅ Soft delete for data preservation
- ✅ Storage limit enforcement
- ✅ File deduplication by hash

## 📊 Performance

| Metric | Value | Notes |
|--------|-------|-------|
| Upload latency | 20-70ms | API response time |
| Indexing (2000 words) | ~1s | Full pipeline |
| Search (first) | 84ms | Embedding + vector search |
| Search (cached) | 7ms | **12x faster** 🚀 |
| Cache hit rate | 92% | Typical workload |
| Context preservation | 100% | Intelligent chunking |

## 🔌 API Reference

### Authentication
All endpoints (except `/health`, `/`, and `/admin`) require:
```
Header: x-api-key: {your-api-key}
```

**API Keys:**
- Keys are stored in MongoDB and prefixed with `ck_`
- Keys are hashed with bcrypt for security
- Get your API key from the seed script output

### Key Endpoints

#### File Operations
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/companies/:companyId/uploads` | Upload file for indexing |
| `GET` | `/v1/jobs/:jobId` | Check indexing job status |

#### Search
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/companies/:companyId/search` | Semantic search |
| `GET` | `/v1/companies/:companyId/vectors` | Get company vectors |

#### Projects
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/companies/:companyId/projects` | Create project |
| `GET` | `/v1/companies/:companyId/projects` | List projects |
| `GET` | `/v1/companies/:companyId/projects/:projectId` | Get project |
| `PATCH` | `/v1/companies/:companyId/projects/:projectId` | Update project |
| `DELETE` | `/v1/companies/:companyId/projects/:projectId` | Delete project |

#### Users
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/companies/:companyId/users` | Create user |
| `GET` | `/v1/companies/:companyId/users` | List users |
| `PATCH` | `/v1/companies/:companyId/users/:userId` | Update user |

### Response Codes
- `200` - Success
- `202` - Accepted (async processing)
- `401` - Unauthorized
- `429` - Rate limit exceeded
- `500` - Internal error

## 🧪 Testing

### Unit Tests (No Docker Required)
```bash
cd api
npm install
npm test              # Run all unit tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

### E2E Tests (Docker Required)
```bash
docker-compose up -d
cd api
npm run test:e2e              # Run all E2E tests
npm run test:e2e:basic        # Basic tests only (~1 min)
npm run test:e2e:fast         # Fast tests (~2-3 min)
```

## 🔧 Configuration

### Environment Variables
```yaml
# docker-compose.yml
QDRANT_URL=http://qdrant:6333
EMBED_URL=http://embed:5001/embed
REDIS_HOST=redis
REDIS_PORT=6379
MONGODB_URI=mongodb://admin:admin123@mongodb:27017/rag_db?authSource=admin
PORT=8000
NODE_ENV=production
```

### Rate Limits
```typescript
RATE_LIMITS:
  - Upload: 100/minute per IP
  - Search: 100/minute per IP
  - Company: 100/minute per company
  - Global: 1000/minute per IP
```

## 🎯 Development Workflow

### API Development
```bash
cd api
npm install
npm run dev      # Watch mode with ts-node-dev
```

### Frontend Development
```bash
pnpm dev:portal  # Start portal at http://localhost:3000
```

### Linting & Formatting
```bash
# API
cd api
npm run lint          # Check code
npm run lint:fix      # Auto-fix issues
npm run format        # Format code

# Portal
pnpm lint:portal      # Lint portal

# Type checking
pnpm typecheck        # Check all packages
```

## 🛠️ Troubleshooting

### Services Not Starting
```bash
docker-compose logs api
docker-compose logs worker
docker-compose restart
```

### Queue Issues
1. Open Bull Board: `http://localhost:8000/admin/queues`
2. Check failed jobs and retry from UI

### MongoDB Issues
```bash
# Check MongoDB is running
docker ps | grep mongo

# Re-seed database if needed
cd api && npm run seed
```

## 📈 Production Deployment

### Recommendations
1. Use production-grade Redis, Qdrant, and MongoDB clusters
2. Store API keys in secure vault (e.g., AWS Secrets Manager)
3. Increase worker concurrency for higher throughput
4. Add Prometheus/Grafana for metrics
5. Enable MongoDB replica sets for high availability

## 📚 Additional Documentation

- **API Collection**: `MVP_API.postman_collection.json`
- **Architecture Docs**: `docs/` directory
- **Test Docs**: `api/test/docs/`

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

---

**Built with**: TypeScript, React, Express, BullMQ, FastAPI, Qdrant, Redis, MongoDB, Docker
