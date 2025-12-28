export const CONFIG = {
  QDRANT_URL: process.env.QDRANT_URL || 'http://localhost:6333',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  MONGODB_URI:
    process.env.MONGODB_URI || 'mongodb://admin:admin123@localhost:27017/rag_db?authSource=admin',
  PORT: parseInt(process.env.PORT || '8000', 10),

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Embeddings Configuration
  // Embedding provider: 'openai' | 'gemini'
  EMBEDDING_PROVIDER: (process.env.EMBEDDING_PROVIDER || 'openai') as 'openai' | 'gemini',

  // OpenAI Configuration
  // text-embedding-3-large: Best quality (3072 dimensions)
  // text-embedding-3-small: Good balance (1536 dimensions)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',

  // Gemini Configuration
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_EMBEDDING_MODEL: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
  GEMINI_EMBEDDING_DIMENSIONS: process.env.GEMINI_EMBEDDING_DIMENSIONS
    ? parseInt(process.env.GEMINI_EMBEDDING_DIMENSIONS, 10)
    : undefined,

  // LLM Configuration for Chat API
  LLM_PROVIDER: (process.env.LLM_PROVIDER || 'openai') as 'openai' | 'gemini',
  OPENAI_CHAT_MODEL: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
  GEMINI_CHAT_MODEL: process.env.GEMINI_CHAT_MODEL || 'gemini-1.5-flash',

  // Chat settings
  CHAT_MAX_TOKENS: parseInt(process.env.CHAT_MAX_TOKENS || '1024', 10),
  CHAT_TEMPERATURE: parseFloat(process.env.CHAT_TEMPERATURE || '0.7'),
};
