import mongoose from 'mongoose';
import { QdrantClient } from '@qdrant/js-client-rest';
import Redis from 'ioredis';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config';
import { logger } from '../utils/logger';
import { 
  CompanyModel, 
  UserModel, 
  ProjectModel, 
  ProjectMemberModel, 
  FileMetadataModel, 
  ApiLogModel, 
  EmbeddingModel 
} from '../models';

async function cleanData() {
  logger.info('🧹 Starting comprehensive data cleanup...');

  // 1. MongoDB Cleanup
  try {
    logger.info('🔌 Connecting to MongoDB...');
    await mongoose.connect(CONFIG.MONGODB_URI);
    logger.info('Connected to MongoDB.');

    const models = [
      { name: 'Company', model: CompanyModel },
      { name: 'User', model: UserModel },
      { name: 'Project', model: ProjectModel },
      { name: 'ProjectMember', model: ProjectMemberModel },
      { name: 'FileMetadata', model: FileMetadataModel },
      { name: 'ApiLog', model: ApiLogModel },
      { name: 'Embedding', model: EmbeddingModel }
    ];

    for (const { name, model } of models) {
      const result = await (model as any).deleteMany({});
      logger.info(`Deleted ${result.deletedCount} documents from ${name}`);
    }
  } catch (error) {
    logger.error('MongoDB cleanup failed', { error });
  }

  // 2. Qdrant Cleanup
  try {
    logger.info('🔌 Connecting to Qdrant...');
    const qdrant = new QdrantClient({ url: CONFIG.QDRANT_URL });
    const collections = await qdrant.getCollections();
    
    logger.info(`Found ${collections.collections.length} Qdrant collections.`);
    
    for (const collection of collections.collections) {
      await qdrant.deleteCollection(collection.name);
      logger.info(`Deleted Qdrant collection: ${collection.name}`);
    }
  } catch (error) {
    logger.error('Qdrant cleanup failed', { error });
  }

  // 3. Redis Cleanup
  try {
    logger.info('🔌 Connecting to Redis...');
    const redis = new Redis({
      host: CONFIG.REDIS_HOST,
      port: CONFIG.REDIS_PORT,
    });

    await redis.flushdb();
    logger.info('Redis DB flushed.');
    redis.disconnect();
  } catch (error) {
    logger.error('Redis cleanup failed', { error });
  }

  // 4. File System Cleanup (Uploads)
  try {
    const uploadsDir = path.join(__dirname, '../../data/uploads');
    if (fs.existsSync(uploadsDir)) {
      logger.info(`Cleaning uploads directory: ${uploadsDir}`);
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file !== '.gitkeep') {
          fs.unlinkSync(path.join(uploadsDir, file));
        }
      }
      logger.info(`Deleted ${files.length} files from uploads.`);
    }
  } catch (error) {
    logger.error('File system cleanup failed', { error });
  }

  logger.info('✅ Cleanup complete!');
  
  // Close MongoDB connection
  await mongoose.disconnect();
  process.exit(0);
}

cleanData().catch(err => {
  console.error(err);
  process.exit(1);
});

