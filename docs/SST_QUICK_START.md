# SST Quick Start Guide

## Prerequisites

1. **AWS Account** with credentials configured
2. **Node.js 20.x** or later
3. **AWS CLI** installed and configured

## Quick Setup (5 minutes)

### Step 1: Install Dependencies

```bash
# Install root dependencies (includes SST)
npm install

# Install API dependencies
cd api
npm install
cd ..
```

### Step 2: Initialize SST

```bash
# Initialize SST (creates .sst directory and types)
npx sst@latest init

# This will create the necessary type definitions
```

### Step 3: Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Required: MongoDB connection string
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/rag_db

# Required: Qdrant URL (use Qdrant Cloud or deploy separately)
QDRANT_URL=https://your-cluster.qdrant.io

# Required: Embedding service URL
EMBED_URL=https://your-embedding-service.com/embed

# Optional: OpenAI/Gemini API keys
OPENAI_API_KEY=sk-your-key
GEMINI_API_KEY=your-key
```

### Step 4: Deploy

```bash
# Deploy to AWS
npx sst deploy

# Or deploy to a specific stage
npx sst deploy --stage production
```

### Step 5: Get Your API URL

After deployment, SST will output your API URL:

```
✓  Deployed rag-system-dev

  Outputs:
    apiUrl: https://abc123.execute-api.us-east-1.amazonaws.com
    cacheEndpoint: rag-system-dev-redis-cache.xxxxx.cache.amazonaws.com
    uploadsBucket: rag-system-dev-uploads-bucket
```

## Testing Your Deployment

```bash
# Get the API URL
API_URL=$(npx sst output apiUrl)

# Health check
curl $API_URL/health

# Test search (replace with your API key)
curl -X POST $API_URL/v1/companies/{companyId}/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"query": "test", "limit": 5}'
```

## Development Mode

```bash
# Start SST dev mode (live Lambda development)
npx sst dev

# This will:
# - Deploy your app to AWS
# - Set up local development environment
# - Enable hot reloading
```

## Common Commands

```bash
# Deploy
npx sst deploy

# Remove all resources
npx sst remove

# View logs
npx sst logs

# View outputs
npx sst output

# Check status
npx sst status
```

## Troubleshooting

### SST Not Found
```bash
# Install SST globally
npm install -g sst

# Or use npx
npx sst@latest deploy
```

### Type Errors in sst.config.ts
These are expected until you run `npx sst init`. The types are generated automatically.

### AWS Credentials Not Configured
```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, and region
```

### Deployment Fails
1. Check AWS credentials: `aws sts get-caller-identity`
2. Check IAM permissions (need Lambda, API Gateway, VPC, ElastiCache permissions)
3. Review deployment logs: `npx sst logs`

## Next Steps

1. Set up MongoDB Atlas or DocumentDB
2. Deploy Qdrant (Cloud or ECS)
3. Deploy embedding service (Lambda or ECS)
4. Configure custom domain
5. Set up monitoring and alerts

See `AWS_DEPLOYMENT_SST.md` for detailed instructions.

