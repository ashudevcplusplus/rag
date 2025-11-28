import { QdrantClient } from '@qdrant/js-client-rest';
import { CONFIG } from '../config';
import {
  VectorPoint,
  SearchResult,
  EmbeddingResponse,
  QdrantFilter,
  RerankResponse,
  SearchResultPayload,
} from '../types/vector.types';
import { ExternalServiceError } from '../types/error.types';
import { logger } from '../utils/logger';
import { embeddingRepository } from '../repositories/embedding.repository';

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

      // Fetch full text content
      const searchResults = result as SearchResult[];
      const chunksToFetch = searchResults
        .map((r) => {
          const payload = r.payload as SearchResultPayload;
          return payload ? { fileId: payload.fileId, chunkIndex: payload.chunkIndex } : null;
        })
        .filter((c): c is { fileId: string; chunkIndex: number } => c !== null);

      if (chunksToFetch.length > 0) {
        try {
          const contents = await embeddingRepository.findChunks(chunksToFetch);
          const contentMap = new Map(
            contents.map((c) => [`${c.fileId}:${c.chunkIndex}`, c.content])
          );

          return searchResults.map((r) => {
            const payload = r.payload as SearchResultPayload;
            if (payload) {
              const key = `${payload.fileId}:${payload.chunkIndex}`;
              const content = contentMap.get(key);
              if (content) {
                payload.content = content;
                // Also update text_preview to be full text if available, or keep as is
                // payload.text_preview = content;
              }
            }
            return r;
          });
        } catch (error) {
          logger.warn('Failed to fetch full text content', { error });
        }
      }

      return searchResults;
    } catch (error) {
      logger.error('Search failed', {
        collection: collectionName,
        limit,
        error,
      });
      throw error;
    }
  }

  /**
   * Rerank documents using cross-encoder
   */
  static async rerank(query: string, documents: string[]): Promise<number[]> {
    try {
      logger.debug('Reranking documents', { count: documents.length, url: CONFIG.RERANK_URL });

      const response = await fetch(CONFIG.RERANK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, documents }),
      });

      if (!response.ok) {
        throw new ExternalServiceError('Rerank service', response.statusText);
      }

      const data = (await response.json()) as RerankResponse;
      return data.scores;
    } catch (error) {
      logger.error('Failed to rerank', {
        error,
        docsCount: documents.length,
        url: CONFIG.RERANK_URL,
      });
      throw error;
    }
  }

  /**
   * Search with hybrid reranking (Vector + Cross-Encoder)
   */
  static async searchWithReranking(
    collectionName: string,
    query: string,
    limit: number = 10,
    filter?: QdrantFilter,
    rerankLimit: number = 50
  ): Promise<SearchResult[]> {
    // 1. Get query embedding
    const embeddings = await this.getEmbeddings([query]);
    const queryVector = embeddings[0];

    // 2. Initial vector search with higher limit
    const initialResults = await this.search(collectionName, queryVector, rerankLimit, filter);

    if (initialResults.length === 0) {
      return [];
    }

    // 3. Fetch full text for reranking
    const chunksToFetch = initialResults
      .map((r) => {
        const payload = r.payload as SearchResultPayload;
        return payload ? { fileId: payload.fileId, chunkIndex: payload.chunkIndex } : null;
      })
      .filter((c): c is { fileId: string; chunkIndex: number } => c !== null);

    let fullTextsMap: Record<string, string> = {};
    try {
      const embeddings = await embeddingRepository.findChunks(chunksToFetch);
      fullTextsMap = embeddings.reduce(
        (acc, curr) => {
          const key = `${curr.fileId}:${curr.chunkIndex}`;
          acc[key] = curr.content;
          return acc;
        },
        {} as Record<string, string>
      );
      logger.debug('Fetched full texts for reranking', {
        count: Object.keys(fullTextsMap).length,
        total: chunksToFetch.length,
      });
    } catch (error) {
      logger.warn('Failed to fetch full texts for reranking, falling back to previews', { error });
    }

    // 4. Extract texts for reranking (prefer full text)
    const documents = initialResults.map((r) => {
      const payload = r.payload as SearchResultPayload;
      if (!payload) return '';
      const key = `${payload.fileId}:${payload.chunkIndex}`;
      return fullTextsMap[key] || payload.text_preview || '';
    });

    // 5. Rerank
    const scores = await this.rerank(query, documents);

    // 6. Update scores, attach full text, and sort
    const rerankedResults = initialResults.map((result, index) => {
      const payload = result.payload as SearchResultPayload;
      const key = `${payload.fileId}:${payload.chunkIndex}`;
      const content = fullTextsMap[key];

      return {
        ...result,
        score: scores[index],
        payload: {
          ...payload,
          original_score: result.score, // Keep original vector score for reference
          content: content || payload.text_preview, // Attach full text
        } as SearchResultPayload,
      };
    });

    rerankedResults.sort((a, b) => b.score - a.score);

    return rerankedResults.slice(0, limit);
  }
}
