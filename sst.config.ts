/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "rag-system",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    // VPC for Redis (required for private subnets)
    const vpc = new sst.aws.Vpc("RagVpc", {
      nat: "managed",
    });

    // Redis for queues and caching
    const cache = new sst.aws.Redis("RedisCache", {
      engine: "redis",
      version: "7.0",
      instance: "cache.t3.micro", // Adjust based on needs
      cluster: {
        nodes: 1,
      },
      vpc: vpc,
    });

    // S3 Bucket for file uploads
    const uploadsBucket = new sst.aws.Bucket("UploadsBucket", {
      cors: {
        allowOrigins: ["*"],
        allowMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
        allowHeaders: ["*"],
      },
    });

    // Main API Lambda Function
    const apiFunction = new sst.aws.Function("RagApiFunction", {
      handler: "api/src/handler.lambda.ts",
      runtime: "nodejs20.x",
      timeout: "30 seconds",
      memory: "1024 MB",
      environment: {
        // Database Configuration
        MONGODB_URI: process.env.MONGODB_URI || "mongodb://admin:admin123@localhost:27017/rag_db?authSource=admin",
        
        // Redis Configuration
        REDIS_HOST: cache.host,
        REDIS_PORT: cache.port.apply(p => p.toString()),
        
        // Qdrant Configuration (external or ECS service)
        QDRANT_URL: process.env.QDRANT_URL || "http://localhost:6333",
        
        // Embedding Service Configuration
        EMBED_URL: process.env.EMBED_URL || "http://localhost:5001/embed",
        RERANK_URL: process.env.RERANK_URL || "",
        EMBEDDING_PROVIDER: process.env.EMBEDDING_PROVIDER || "inhouse",
        
        // OpenAI/Gemini Configuration (optional)
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
        OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
        GEMINI_EMBEDDING_MODEL: process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004",
        
        // LLM Configuration
        LLM_PROVIDER: process.env.LLM_PROVIDER || "openai",
        OPENAI_CHAT_MODEL: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
        GEMINI_CHAT_MODEL: process.env.GEMINI_CHAT_MODEL || "gemini-1.5-flash",
        CHAT_MAX_TOKENS: process.env.CHAT_MAX_TOKENS || "1024",
        CHAT_TEMPERATURE: process.env.CHAT_TEMPERATURE || "0.7",
        
        // S3 Configuration
        UPLOADS_BUCKET: uploadsBucket.name,
        
        // Environment
        NODE_ENV: "production",
      },
      vpc: {
        securityGroups: vpc.securityGroups,
        privateSubnets: vpc.privateSubnets,
      },
      permissions: [
        {
          actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
          resources: [`${uploadsBucket.arn}/*`],
        },
      ],
    });

    // API Gateway
    const api = new sst.aws.ApiGatewayV2("RagApi", {
      cors: {
        allowCredentials: true,
        allowHeaders: ["Content-Type", "Authorization", "x-api-key"],
        allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowOrigins: ["*"], // Configure for production
      },
    });
    api.route("$default", apiFunction.arn);

    // Note: BullMQ workers are long-running processes (not suitable for Lambda's 15-min limit).
    // For production, deploy workers to ECS Fargate. See docs/AWS_DEPLOYMENT_SST.md for details.

    return {
      apiUrl: api.url,
      cacheHost: cache.host,
      cachePort: cache.port,
      uploadsBucket: uploadsBucket.name,
    };
  },
});

