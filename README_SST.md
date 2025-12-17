# AWS Deployment with SST

This repository includes configuration for deploying the RAG system to AWS using SST (Serverless Stack) and AWS Lambda.

## 📁 Files Added

- `sst.config.ts` - SST infrastructure configuration
- `api/src/handler.lambda.ts` - Lambda handler for Express API
- `docs/AWS_DEPLOYMENT_SST.md` - Detailed deployment guide
- `docs/SST_QUICK_START.md` - Quick start guide
- `.sstignore` - Files to ignore during SST deployment

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install
cd api && npm install && cd ..

# 2. Initialize SST
npx sst@latest init

# 3. Configure environment variables
# Create .env file with MongoDB, Qdrant, and embedding service URLs

# 4. Deploy
npx sst deploy
```

See `docs/SST_QUICK_START.md` for detailed instructions.

## 📚 Documentation

- **Quick Start**: `docs/SST_QUICK_START.md`
- **Full Guide**: `docs/AWS_DEPLOYMENT_SST.md`

## ⚠️ Important Notes

1. **Workers**: BullMQ workers are long-running. For production, consider deploying to ECS Fargate instead of Lambda (15-minute timeout limit).

2. **External Services**: You'll need to set up:
   - MongoDB (Atlas or DocumentDB)
   - Qdrant (Cloud or ECS)
   - Embedding service (Lambda or ECS)

3. **VPC**: ElastiCache Redis requires VPC configuration. The SST config handles this automatically.

4. **Environment Variables**: Set in `.env` file or AWS Secrets Manager for production.

## 🔧 Configuration

Edit `sst.config.ts` to customize:
- Lambda memory and timeout
- ElastiCache instance size
- VPC configuration
- Environment variables

## 📊 Architecture

```
API Gateway → Lambda (Express API) → ElastiCache Redis
                                      ↓
                                  MongoDB (Atlas/DocumentDB)
                                  Qdrant (Cloud/ECS)
                                  Embedding Service
```

## 🆘 Support

For issues:
1. Check `docs/AWS_DEPLOYMENT_SST.md` troubleshooting section
2. Review SST logs: `npx sst logs`
3. Check AWS CloudWatch logs

