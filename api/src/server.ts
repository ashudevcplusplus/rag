import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import worker from './queue/worker'; // Import worker for graceful shutdown
import { uploadFile, searchCompany, getJobStatus } from './controllers/company.controller';
import { indexingQueue } from './queue/queue.client';
import { CONFIG } from './config';
import { logger } from './utils/logger';
import { errorHandler, asyncHandler } from './middleware/error.middleware';
import { authenticateRequest } from './middleware/auth.middleware';
import { uploadLimiter, searchLimiter, generalLimiter } from './middleware/rate-limiter.middleware';
import { companyRateLimiter } from './middleware/company-rate-limiter.middleware';

const app = express();

// Setup Bull Board for Queue Visualization
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(indexingQueue)],
  serverAdapter: serverAdapter,
});

// Security middleware
app.use(helmet()); // Set security headers
app.use(cors()); // Enable CORS
app.use(compression()); // Compress responses

// General rate limiting
app.use(generalLimiter);

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../data/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info('Upload directory created', { path: uploadDir });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix);
  },
});

const upload = multer({ storage });

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req, _res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Health check (no auth required, no rate limit)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Bull Board UI (no auth required for easier access during development)
// In production, you should protect this with authentication
app.use('/admin/queues', serverAdapter.getRouter());

// Apply authentication to all routes except health and admin
app.use(authenticateRequest);

// Apply company-based rate limiting ONLY to company routes
app.use('/v1/companies/:companyId', companyRateLimiter as express.RequestHandler);

// Routes with specific rate limiters
app.post(
  '/v1/companies/:companyId/uploads',
  uploadLimiter,
  upload.single('file'),
  asyncHandler(uploadFile)
);

app.post('/v1/companies/:companyId/search', searchLimiter, asyncHandler(searchCompany));

app.get('/v1/jobs/:jobId', asyncHandler(getJobStatus));

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(CONFIG.PORT, () => {
  logger.info('API server started', {
    port: CONFIG.PORT,
    environment: process.env.NODE_ENV || 'development',
  });
});

// Graceful Shutdown Handler
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, forcing exit...');
    process.exit(1);
  }

  isShuttingDown = true;
  logger.info(`${signal} received, starting graceful shutdown...`);

  // 1. Stop accepting new HTTP connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  try {
    // 2. Close BullMQ worker (waits for current jobs to finish)
    logger.info('Closing BullMQ worker...');
    await worker.close();
    logger.info('Worker closed successfully');

    // 3. Close queue connections
    logger.info('Closing queue connections...');
    await indexingQueue.close();
    logger.info('Queue connections closed');

    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error, stack: error.stack });
  void gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  void gracefulShutdown('UNHANDLED_REJECTION');
});

export default app;
