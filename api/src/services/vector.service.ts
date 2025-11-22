import { QdrantClient } from '@qdrant/js-client-rest';
import { CONFIG } from '../config';
import { VectorPoint, SearchResult, EmbeddingResponse, QdrantFilter } from '../types/vector.types';
import { ExternalServiceError } from '../types/error.types';
import { logger } from '../utils/logger';

const qdrant = new QdrantClient({ url: CONFIG.QDRANT_URL });

interface QdrantError extends Error {
  status?: number;
}

export class VectorService {
  /**
   * Get embeddings from the embed service
   */
  static async getEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      logger.debug('Requesting embeddings', { count: texts.length });

      const response = await fetch(CONFIG.EMBED_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts }),
      });

      if (!response.ok) {
        throw new ExternalServiceError('Embedding service', response.statusText);
      }

      const data = (await response.json()) as EmbeddingResponse;
      const embeddings = data.embeddings || data.vectors || [];

      logger.debug('Embeddings received', { count: embeddings.length });
      return embeddings;
    } catch (error) {
      logger.error('Failed to get embeddings', { error, textsCount: texts.length });
      throw error;
    }
  }

  /**
   * Ensure a collection exists with proper configuration and payload indexes
   */
  static async ensureCollection(collectionName: string): Promise<void> {
    try {
      await qdrant.getCollection(collectionName);
      logger.debug('Collection exists', { collection: collectionName });
    } catch (error) {
      const qdrantError = error as QdrantError;
      if (qdrantError.status === 404) {
        logger.info('Creating collection', { collection: collectionName });
        // Collection doesn't exist, create it
        await qdrant.createCollection(collectionName, {
          vectors: {
            size: 384, // Adjust based on your embed model
            distance: 'Cosine',
          },
        });
        logger.info('Collection created', { collection: collectionName });

        // Create Payload Indexes for fast filtering
        logger.info('Creating payload indexes', { collection: collectionName });
        try {
          await qdrant.createPayloadIndex(collectionName, {
            field_name: 'fileId',
            field_schema: 'keyword',
          });
          await qdrant.createPayloadIndex(collectionName, {
            field_name: 'companyId',
            field_schema: 'keyword',
          });
          logger.info('Payload indexes created', { collection: collectionName });
        } catch (indexError) {
          logger.warn('Failed to create payload indexes', {
            collection: collectionName,
            error: indexError,
          });
          // Don't throw - indexes are an optimization, not critical
        }
      } else {
        logger.error('Failed to check/create collection', {
          collection: collectionName,
          error,
        });
        throw error;
      }
    }
  }

  /**
   * Batch upsert points to Qdrant
   */
  static async upsertBatch(collectionName: string, points: VectorPoint[]): Promise<void> {
    try {
      logger.debug('Upserting batch', {
        collection: collectionName,
        pointsCount: points.length,
      });

      await qdrant.upsert(collectionName, {
        wait: true,
        points: points,
      });

      logger.debug('Batch upserted', {
        collection: collectionName,
        pointsCount: points.length,
      });
    } catch (error) {
      logger.error('Failed to upsert batch', {
        collection: collectionName,
        pointsCount: points.length,
        error,
      });
      throw error;
    }
  }

  /**
   * Search for similar vectors
   */
  static async search(
    collectionName: string,
    queryVector: number[],
    limit: number = 10,
    filter?: QdrantFilter
  ): Promise<SearchResult[]> {
    try {
      logger.debug('Searching', {
        collection: collectionName,
        limit,
        hasFilter: !!filter,
      });

      const result = await qdrant.search(collectionName, {
        vector: queryVector,
        limit,
        filter,
      });

      logger.debug('Search completed', {
        collection: collectionName,
        resultsCount: result.length,
      });

      return result as SearchResult[];
    } catch (error) {
      logger.error('Search failed', {
        collection: collectionName,
        limit,
        error,
      });
      throw error;
    }
  }
}
