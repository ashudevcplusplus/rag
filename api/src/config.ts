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
  // Embeddings Configuration
  // Embedding provider: 'inhouse' | 'openai' | 'gemini'
  EMBEDDING_PROVIDER: process.env.EMBEDDING_PROVIDER || 'inhouse',

  // In-house Python Embeddings (default)
  INHOUSE_EMBEDDINGS: process.env.INHOUSE_EMBEDDINGS !== 'false', // Deprecated: use EMBEDDING_PROVIDER instead

  // OpenAI Embeddings Configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',

  // Gemini Embeddings Configuration
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_EMBEDDING_MODEL: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
  // For gemini-embedding-001, you can specify output dimensionality (768, 1536, 3072)
  GEMINI_EMBEDDING_DIMENSIONS: process.env.GEMINI_EMBEDDING_DIMENSIONS
    ? parseInt(process.env.GEMINI_EMBEDDING_DIMENSIONS, 10)
    : undefined,

  // LLM Configuration for Chat API
  LLM_PROVIDER: (process.env.LLM_PROVIDER || 'openai') as 'openai' | 'gemini',
  // OpenAI Chat Model
  OPENAI_CHAT_MODEL: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
  // Gemini Chat Model
  GEMINI_CHAT_MODEL: process.env.GEMINI_CHAT_MODEL || 'gemini-1.5-flash',
  // Chat settings
  CHAT_MAX_TOKENS: parseInt(process.env.CHAT_MAX_TOKENS || '1024', 10),
  CHAT_TEMPERATURE: parseFloat(process.env.CHAT_TEMPERATURE || '0.7'),
};
