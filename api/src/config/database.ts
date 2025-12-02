import mongoose from 'mongoose';
import { CONFIG } from '../config';
import { logger } from '../utils/logger';

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('MongoDB already connected');
      return;
    }

    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await mongoose.connect(CONFIG.MONGODB_URI, {
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        });
        this.isConnected = true;
        logger.info('MongoDB connected successfully', {
          host: mongoose.connection.host,
          database: mongoose.connection.name,
        });

        // Handle connection events
        mongoose.connection.on('error', (error) => {
          logger.error('MongoDB connection error', { error });
        });

        mongoose.connection.on('disconnected', () => {
          logger.warn('MongoDB disconnected');
          this.isConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
          logger.info('MongoDB reconnected');
          this.isConnected = true;
        });
        return;
      } catch (error) {
        logger.warn(`MongoDB connection attempt ${attempt}/${maxRetries} failed`, {
          error: error instanceof Error ? error.message : error,
        });
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        } else {
          logger.error('MongoDB connection failed after all retries', { error });
          throw error;
        }
      }
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('MongoDB disconnected successfully');
    } catch (error) {
      logger.error('MongoDB disconnect error', { error });
      throw error;
    }
  }

  public getConnection(): typeof mongoose {
    return mongoose;
  }

  public isConnectionActive(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}

export const database = DatabaseConnection.getInstance();
