// Simplified SST Config - Use this if the main config has issues
// Rename this file to sst.config.ts if needed

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
    // S3 Bucket for file uploads
    const uploadsBucket = new sst.aws.Bucket("UploadsBucket");

    // Main API Lambda Function
    const apiFunction = new sst.aws.Function("RagApiFunction", {
      handler: "api/src/handler.lambda.ts",
      runtime: "nodejs20.x",
      timeout: "30 seconds",
      memory: "1024 MB",
      environment: {
        MONGODB_URI: process.env.MONGODB_URI || "",
        REDIS_HOST: process.env.REDIS_HOST || "localhost",
        REDIS_PORT: process.env.REDIS_PORT || "6379",
        QDRANT_URL: process.env.QDRANT_URL || "",
        EMBED_URL: process.env.EMBED_URL || "",
        EMBEDDING_PROVIDER: process.env.EMBEDDING_PROVIDER || "inhouse",
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
        UPLOADS_BUCKET: uploadsBucket.name,
        NODE_ENV: "production",
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
        allowOrigins: ["*"],
      },
    });
    api.route("$default", apiFunction.arn);

    return {
      apiUrl: api.url,
      uploadsBucket: uploadsBucket.name,
    };
  },
});

