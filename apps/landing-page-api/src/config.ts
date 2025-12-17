import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";

// Environment variable validation schema
const envSchema = z.object({
  PORT: z.coerce.number().default(8001),
  MONGODB_URI: isProduction
    ? z.string().min(1, "MONGODB_URI is required in production")
    : z
        .string()
        .default(
          "mongodb://admin:admin123@localhost:27018/landing_db?authSource=admin",
        ),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  ADMIN_API_KEY: isProduction
    ? z.string().min(1, "ADMIN_API_KEY is required in production")
    : z.string().default(""),
});

// Parse and validate environment variables
const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Environment validation failed:");
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    });
    process.exit(1);
  }

  return result.data;
};

export const CONFIG = parseEnv();
