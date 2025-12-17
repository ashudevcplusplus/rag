# AWS Deployment Guide with SST (Serverless Stack)

This guide provides step-by-step instructions for deploying the RAG system to AWS using SST (Serverless Stack) and AWS Lambda.

## 📋 Prerequisites

1. **AWS Account** with appropriate permissions
2. **Node.js 20.x** or later
3. **AWS CLI** configured with credentials
4. **Docker** (for local testing, optional)

## 🚀 Step-by-Step Deployment Process

### Step 1: Install SST

```bash
# Install SST CLI globally
npm install -g sst

# Or use npx (recommended)
npx sst@latest --version
```

### Step 2: Install Dependencies

```bash
# Install root dependencies
npm install

# Install API dependencies
cd api
npm install

# Install serverless-express adapter
npm install @vendia/serverless-express
npm install --save-dev @types/aws-lambda

cd ..
```

### Step 3: Configure AWS Credentials

```bash
# Configure AWS CLI
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=us-east-1
```

### Step 4: Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# MongoDB Configuration
# Option 1: Use MongoDB Atlas (recommended for production)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rag_db?retryWrites=true&w=majority

# Option 2: Use AWS DocumentDB (requires additional setup)
# MONGODB_URI=mongodb://username:password@docdb-cluster.region.docdb.amazonaws.com:27017/rag_db?ssl=true&replicaSet=rs0&readPreference=secondaryPreferred

# Qdrant Configuration
# Option 1: Use Qdrant Cloud (recommended)
QDRANT_URL=https://your-cluster.qdrant.io

# Option 2: Deploy Qdrant on ECS/Fargate (see Step 8)
# QDRANT_URL=http://qdrant-service.ecs-cluster.local:6333

# Embedding Service Configuration
# Option 1: Use external embedding service
EMBED_URL=https://your-embedding-service.com/embed

# Option 2: Deploy Python service on Lambda or ECS (see Step 9)
# EMBED_URL=http://embed-service.ecs-cluster.local:5001/embed

# Embedding Provider
EMBEDDING_PROVIDER=inhouse  # or 'openai' or 'gemini'

# OpenAI Configuration (if using OpenAI embeddings)
OPENAI_API_KEY=sk-your-openai-key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Gemini Configuration (if using Gemini embeddings)
GEMINI_API_KEY=your-gemini-key
GEMINI_EMBEDDING_MODEL=text-embedding-004

# LLM Configuration
LLM_PROVIDER=openai
OPENAI_CHAT_MODEL=gpt-4o-mini
GEMINI_CHAT_MODEL=gemini-1.5-flash
```

### Step 5: Initialize SST Project

```bash
# Initialize SST (creates .sst directory and type definitions)
npx sst@latest init

# Note: sst.config.ts is already created in this repo
# The init command will generate the necessary type definitions
```

### Step 6: Review SST Configuration

The `sst.config.ts` file defines:
- **VPC**: For ElastiCache Redis (required for private subnets)
- **ElastiCache Redis**: For BullMQ queues and caching
- **S3 Bucket**: For file uploads
- **Lambda Functions**: API and worker functions
- **API Gateway**: REST API endpoint

**Note**: Type errors in `sst.config.ts` are expected until you run `npx sst init`. The types are auto-generated.

### Step 7: Deploy to AWS

```bash
# Deploy to development stage
npx sst deploy

# Deploy to production stage
npx sst deploy --stage production

# Deploy with specific region
npx sst deploy --region us-west-2
```

**Expected Output:**
```
✓  Deployed rag-system-dev

  Outputs:
    ApiUrl: https://abc123.execute-api.us-east-1.amazonaws.com
    CacheEndpoint: rag-system-dev-redis-cache.xxxxx.cache.amazonaws.com
    CachePort: 6379
    UploadsBucket: rag-system-dev-uploads-bucket
    IndexingWorkerArn: arn:aws:lambda:us-east-1:123456789:function:rag-system-dev-indexing-worker
```

### Step 8: Set Up External Services

#### 8.1 MongoDB Setup

**Option A: MongoDB Atlas (Recommended)**
1. Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

**Option B: AWS DocumentDB**
1. Create DocumentDB cluster in AWS Console
2. Configure security groups
3. Update `MONGODB_URI` in `.env`

#### 8.2 Qdrant Setup

**Option A: Qdrant Cloud (Recommended)**
1. Sign up at [Qdrant Cloud](https://cloud.qdrant.io)
2. Create cluster
3. Get API endpoint
4. Update `QDRANT_URL` in `.env`

**Option B: Deploy on ECS/Fargate**
See `docs/QDRANT_ECS_DEPLOYMENT.md` for instructions

#### 8.3 Embedding Service Setup

**Option A: Use OpenAI/Gemini (Recommended)**
- Set `EMBEDDING_PROVIDER=openai` or `EMBEDDING_PROVIDER=gemini`
- Provide API keys in `.env`

**Option B: Deploy Python Service on Lambda/ECS**
See `docs/EMBED_SERVICE_DEPLOYMENT.md` for instructions

### Step 9: Update Lambda Environment Variables

After setting up external services, update Lambda environment variables:

```bash
# Update environment variables
npx sst deploy --stage production

# Or update via AWS Console:
# 1. Go to Lambda Console
# 2. Select your function
# 3. Configuration > Environment variables
# 4. Edit and save
```

### Step 10: Configure File Uploads

The S3 bucket is automatically created. To configure CORS:

```bash
# Update CORS in sst.config.ts if needed
# Then redeploy
npx sst deploy
```

### Step 11: Set Up Workers (Optional)

BullMQ workers are long-running processes. For production, consider:

**Option A: ECS Fargate (Recommended)**
- Deploy workers as ECS tasks
- See `docs/WORKERS_ECS_DEPLOYMENT.md`

**Option B: Lambda (Limited)**
- Lambda has 15-minute timeout limit
- Suitable for short-running tasks only

### Step 12: Test Deployment

```bash
# Get API URL from SST output
API_URL=$(npx sst output ApiUrl --stage production)

# Health check
curl $API_URL/health

# Test with API key (from seed script)
curl -X POST $API_URL/v1/companies/{companyId}/search \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{"query": "test", "limit": 5}'
```

## 🔧 Configuration Details

### Lambda Function Settings

- **Runtime**: Node.js 20.x
- **Memory**: 1024 MB (API), 2048 MB (Workers)
- **Timeout**: 30 seconds (API), 15 minutes (Workers)
- **VPC**: Required for ElastiCache access

### ElastiCache Redis

- **Engine**: Redis 7.0
- **Node Type**: cache.t3.micro (adjust based on needs)
- **VPC**: Private subnets only
- **Security**: Accessible only from Lambda functions in same VPC

### S3 Bucket

- **Purpose**: File uploads storage
- **CORS**: Configured for API access
- **Lifecycle**: Configure retention policies as needed

## 📊 Monitoring & Debugging

### View Logs

```bash
# View Lambda logs
npx sst logs --function RagApiFunction

# View all logs
npx sst logs

# Follow logs in real-time
npx sst logs --follow
```

### CloudWatch Metrics

- Lambda invocations, errors, duration
- ElastiCache cache hits/misses
- API Gateway request counts
- S3 bucket metrics

### Debug Locally

```bash
# Start SST dev environment
npx sst dev

# This creates a local development environment
# with live Lambda function updates
```

## 🔒 Security Considerations

1. **API Keys**: Store in AWS Secrets Manager
2. **VPC**: Use private subnets for databases
3. **IAM Roles**: Follow least privilege principle
4. **CORS**: Restrict origins in production
5. **Encryption**: Enable S3 encryption at rest
6. **Secrets**: Use AWS Secrets Manager for sensitive data

## 💰 Cost Optimization

1. **ElastiCache**: Use appropriate instance size
2. **Lambda**: Right-size memory allocation
3. **S3**: Configure lifecycle policies
4. **API Gateway**: Use caching where possible
5. **Reserved Capacity**: Consider for predictable workloads

## 🚨 Troubleshooting

### Common Issues

**1. Lambda Timeout**
- Increase timeout in `sst.config.ts`
- Optimize code or split into smaller functions

**2. VPC Connection Issues**
- Check security groups
- Verify subnet configuration
- Test ElastiCache connectivity

**3. Environment Variables Not Set**
- Redeploy after updating `.env`
- Check Lambda function configuration

**4. CORS Errors**
- Update CORS configuration in `sst.config.ts`
- Verify allowed origins

**5. Redis Connection Failed**
- Check VPC configuration
- Verify security group rules
- Test from Lambda function logs

### Debug Commands

```bash
# Check SST version
npx sst --version

# Validate configuration
npx sst build

# Remove all resources
npx sst remove

# Check AWS credentials
aws sts get-caller-identity
```

## 📚 Additional Resources

- [SST Documentation](https://sst.dev)
- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [ElastiCache Redis Guide](https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/)
- [API Gateway CORS](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html)

## 🎯 Next Steps

1. Set up CI/CD pipeline
2. Configure custom domain
3. Set up monitoring alerts
4. Implement backup strategies
5. Configure auto-scaling
6. Set up staging environment

---

**Note**: This deployment uses AWS Lambda for the API. For long-running workers (BullMQ), consider deploying to ECS Fargate for better performance and cost efficiency.

