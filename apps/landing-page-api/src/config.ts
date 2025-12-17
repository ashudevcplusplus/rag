export const CONFIG = {
  PORT: parseInt(process.env.PORT || '8001', 10),
  MONGODB_URI:
    process.env.MONGODB_URI ||
    'mongodb://admin:admin123@localhost:27018/landing_db?authSource=admin',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || '',
};

