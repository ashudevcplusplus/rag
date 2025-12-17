import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { CONFIG } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error.middleware';
import { generalLimiter } from './middleware/rate-limiter.middleware';
import { database } from './config/database';
import routes from './routes';

export function createApp(): express.Express {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(
    cors({
      origin: CONFIG.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    })
  );
  app.use(compression());

  // General rate limiting
  app.use(generalLimiter);

  // Middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request logging middleware
  app.use((req, _res, next) => {
    logger.debug('Incoming request', {
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
    next();
  });

  // API Routes
  app.use(routes);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}

const app = createApp();

async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB
    await database.connect();
    logger.info('MongoDB connection established');

    // Start server
    const server = app.listen(CONFIG.PORT, () => {
      logger.info('Landing Page API server started', {
        port: CONFIG.PORT,
        environment: CONFIG.NODE_ENV,
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

      server.close(() => {
        logger.info('HTTP server closed');
      });

      try {
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
if (require.main === module) {
  void startServer();
}

export default app;

