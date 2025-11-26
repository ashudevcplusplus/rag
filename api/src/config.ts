export const CONFIG = {
  QDRANT_URL: process.env.QDRANT_URL || 'http://localhost:6333',
  EMBED_URL: process.env.EMBED_URL || 'http://localhost:5001/embed',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  MONGODB_URI:
    process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/rag_db?authSource=admin',
  PORT: parseInt(process.env.PORT || '8000', 10),
};
