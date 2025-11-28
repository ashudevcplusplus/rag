const embedUrl = process.env.EMBED_URL || 'http://localhost:5001/embed';
// Replace /embed at the end of the string with /rerank
const defaultRerankUrl = embedUrl.replace(/\/embed$/, '/rerank');

export const CONFIG = {
  QDRANT_URL: process.env.QDRANT_URL || 'http://localhost:6333',
  EMBED_URL: embedUrl,
  RERANK_URL: process.env.RERANK_URL || defaultRerankUrl,
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  MONGODB_URI:
    process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/rag_db?authSource=admin',
  PORT: parseInt(process.env.PORT || '8000', 10),
};
