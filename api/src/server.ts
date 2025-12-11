import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import worker from './consumers/indexing';
import consistencyCheckWorker from './consumers/consistency-check';
import { closeAllWorkers } from './consumers/async-tasks';
import {
  indexingQueue,
  consistencyCheckQueue,
  allAsyncTaskQueues,
} from './queue/async-tasks.queue';
import { CONFIG } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error.middleware';
import { generalLimiter } from './middleware/rate-limiter.middleware';
import { database } from './config/database';
import routes from './routes';

const app = express();

// Setup Bull Board for Queue Visualization
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(indexingQueue),
    new BullMQAdapter(consistencyCheckQueue),
    ...allAsyncTaskQueues.map((queue) => new BullMQAdapter(queue)),
  ],
  serverAdapter: serverAdapter,
});

// Security middleware
app.use(helmet()); // Set security headers
app.use(
  cors({
    origin: true, // Allow all origins (or specify: ['http://localhost:8080'])
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })
); // Enable CORS
app.use(compression()); // Compress responses

// General rate limiting
app.use(generalLimiter);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (debug level to reduce noise)
app.use((req, _res, next) => {
  logger.debug('Incoming request', {
    method: req.method,
    path: req.path,
  });
  next();
});

// Bull Board UI (no auth required for easier access during development)
// In production, you should protect this with authentication
app.use('/admin/queues', serverAdapter.getRouter());

// API Routes
app.use(routes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize MongoDB connection before starting server
async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB
    await database.connect();
    logger.info('MongoDB connection established');

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
        // 2. Close BullMQ workers (waits for current jobs to finish)
        logger.info('Closing BullMQ workers...');
        await worker.close();
        await consistencyCheckWorker.close();
        await closeAllWorkers();
        logger.info('Workers closed successfully');

        // 3. Close queue connections
        logger.info('Closing queue connections...');
        await indexingQueue.close();
        await consistencyCheckQueue.close();
        await Promise.all(allAsyncTaskQueues.map((queue) => queue.close()));
        logger.info('Queue connections closed');

        // 4. Close MongoDB connection
        logger.info('Closing MongoDB connection...');
        await database.disconnect();
        logger.info('MongoDB connection closed');

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
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start the server
void startServer();

export default app;
