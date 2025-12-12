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
import { EmbeddingService } from './embedding.service';
import { GeminiEmbeddingService } from './gemini-embedding.service';

const qdrant = new QdrantClient({ url: CONFIG.QDRANT_URL });

interface QdrantError extends Error {
  status?: number;
}

export type EmbeddingProvider = 'inhouse' | 'openai' | 'gemini';

export class VectorService {
  /**
   * Get embeddings from the specified or configured provider
   * Supports: inhouse (Python service), openai, or gemini
   * @param texts - Array of texts to embed
   * @param taskType - 'document' or 'query' (affects Gemini embeddings)
   * @param provider - Optional provider override. If not provided, uses CONFIG.EMBEDDING_PROVIDER
   */
  static async getEmbeddings(
    texts: string[],
    taskType: 'document' | 'query' = 'document',
    provider?: EmbeddingProvider
  ): Promise<number[][]> {
    // Determine provider: use provided, then CONFIG.EMBEDDING_PROVIDER, otherwise fall back to INHOUSE_EMBEDDINGS
    const effectiveProvider =
      provider || CONFIG.EMBEDDING_PROVIDER || (CONFIG.INHOUSE_EMBEDDINGS ? 'inhouse' : 'openai');

    // Route to appropriate embedding service based on configuration
    switch (effectiveProvider) {
      case 'gemini':
        // Use Gemini embedding service
        return GeminiEmbeddingService.getEmbeddings(texts, {
          taskType: taskType === 'query' ? 'retrieval_query' : 'retrieval_document',
        });
      case 'openai':
        // Use OpenAI embedding service
        return EmbeddingService.getEmbeddings(texts);
      case 'inhouse':
      default:
        // Use in-house Python embedding service
        return this.getInhouseEmbeddings(texts);
    }
  }

  /**
   * Get embedding dimensions for a given provider
   */
  static getEmbeddingDimensions(provider?: EmbeddingProvider): number {
    const effectiveProvider =
      provider || CONFIG.EMBEDDING_PROVIDER || (CONFIG.INHOUSE_EMBEDDINGS ? 'inhouse' : 'openai');

    switch (effectiveProvider) {
      case 'gemini':
        return GeminiEmbeddingService.getEmbeddingDimensions();
      case 'openai':
        // OpenAI text-embedding-3-small = 1536, text-embedding-3-large = 3072
        return CONFIG.OPENAI_EMBEDDING_MODEL.includes('large') ? 3072 : 1536;
      case 'inhouse':
      default:
        return 384; // all-MiniLM-L6-v2
    }
  }

  /**
   * Get model name for a given provider
   */
  static getModelName(provider?: EmbeddingProvider): string {
    const effectiveProvider =
      provider || CONFIG.EMBEDDING_PROVIDER || (CONFIG.INHOUSE_EMBEDDINGS ? 'inhouse' : 'openai');

    switch (effectiveProvider) {
      case 'gemini':
        return CONFIG.GEMINI_EMBEDDING_MODEL;
      case 'openai':
        return CONFIG.OPENAI_EMBEDDING_MODEL;
      case 'inhouse':
      default:
        return 'all-MiniLM-L6-v2';
    }
  }

  /**
   * Get embeddings from in-house Python embed service
   */
  private static async getInhouseEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      logger.debug('Requesting in-house embeddings', {
        count: texts.length,
        url: CONFIG.EMBED_URL,
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(CONFIG.EMBED_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          logger.error('Embedding service returned error', {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
            url: CONFIG.EMBED_URL,
          });
          throw new ExternalServiceError(
            'Embedding service',
            `${response.status}: ${response.statusText}`
          );
        }

        const data = (await response.json()) as EmbeddingResponse;
        const embeddings = data.embeddings || data.vectors || [];

        logger.debug('In-house embeddings received', { count: embeddings.length });
        return embeddings;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      const errorDetails = {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
        cause: error instanceof Error && 'cause' in error ? error.cause : undefined,
        url: CONFIG.EMBED_URL,
        textsCount: texts.length,
      };
      logger.error('Failed to get in-house embeddings', errorDetails);
      throw error;
    }
  }

  /**
   * Ensure a collection exists with proper configuration and payload indexes
   * @param collectionName - Name of the collection
   * @param provider - Optional provider to determine vector dimensions. If not provided, uses CONFIG.EMBEDDING_PROVIDER
   */
  static async ensureCollection(
    collectionName: string,
    provider?: EmbeddingProvider
  ): Promise<void> {
    try {
      const collectionInfo = await qdrant.getCollection(collectionName);
      logger.debug('Collection exists', {
        collection: collectionName,
        vectorSize: collectionInfo.config?.params?.vectors?.size,
      });

      // Verify collection dimensions match expected dimensions
      const expectedDimensions = this.getEmbeddingDimensions(provider);
      const currentDimensions = (collectionInfo.config?.params?.vectors as { size?: number })?.size;

      if (currentDimensions && currentDimensions !== expectedDimensions) {
        logger.warn('Collection dimensions mismatch', {
          collection: collectionName,
          currentDimensions,
          expectedDimensions,
          provider: provider || CONFIG.EMBEDDING_PROVIDER,
        });
        throw new ExternalServiceError(
          'Qdrant',
          `Collection ${collectionName} has dimension ${currentDimensions} but expected ${expectedDimensions} for provider ${provider || CONFIG.EMBEDDING_PROVIDER || 'inhouse'}. Please recreate the collection or use a different provider.`
        );
      }
    } catch (error) {
      const qdrantError = error as QdrantError;
      if (qdrantError.status === 404) {
        const vectorSize = this.getEmbeddingDimensions(provider);
        logger.info('Creating collection', {
          collection: collectionName,
          vectorSize,
          provider: provider || CONFIG.EMBEDDING_PROVIDER || 'inhouse',
        });
        // Collection doesn't exist, create it with correct dimensions
        await qdrant.createCollection(collectionName, {
          vectors: {
            size: vectorSize,
            distance: 'Cosine',
          },
        });
        logger.info('Collection created', {
          collection: collectionName,
          vectorSize,
        });

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

      // Normalize cosine similarity scores (0-1) to 0-100 range
      const searchResults = (result as SearchResult[]).map((r) => ({
        ...r,
        score: Math.max(0, Math.min(100, r.score * 100)), // Clamp to 0-100
      }));
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
   * @param provider - Optional provider override for generating query embeddings
   */
  static async searchWithReranking(
    collectionName: string,
    query: string,
    limit: number = 10,
    filter?: QdrantFilter,
    rerankLimit: number = 20,
    provider?: EmbeddingProvider
  ): Promise<SearchResult[]> {
    // 1. Get query embedding (use 'query' task type for better search quality)
    const embeddings = await this.getEmbeddings([query], 'query', provider);
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
      // PROFILING START: DB Fetch
      const dbStart = Date.now();
      const embeddings = await embeddingRepository.findChunks(chunksToFetch);
      logger.debug('DB Fetch time:', {
        duration: Date.now() - dbStart,
        count: chunksToFetch.length,
      });
      // PROFILING END: DB Fetch

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
    // PROFILING START: Rerank Call
    const rerankStart = Date.now();
    const scores = await this.rerank(query, documents);
    logger.debug('Rerank Service time:', {
      duration: Date.now() - rerankStart,
      count: documents.length,
    });
    // PROFILING END: Rerank Call

    // 6. Normalize rerank scores to 0-100 range using min-max normalization
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const scoreRange = maxScore - minScore;
    const normalizedScores =
      scoreRange > 0
        ? scores.map((s) => ((s - minScore) / scoreRange) * 100)
        : scores.map(() => 50); // If all scores are the same, set to 50

    // 7. Update scores, attach full text, and sort
    const rerankedResults = initialResults.map((result, index) => {
      const payload = result.payload as SearchResultPayload;
      const key = `${payload.fileId}:${payload.chunkIndex}`;
      const content = fullTextsMap[key];

      return {
        ...result,
        score: normalizedScores[index],
        payload: {
          ...payload,
          original_score: result.score, // Keep original vector score for reference
          original_rerank_score: scores[index], // Keep original rerank score for reference
          content: content || payload.text_preview, // Attach full text
        } as SearchResultPayload,
      };
    });

    rerankedResults.sort((a, b) => b.score - a.score);

    return rerankedResults.slice(0, limit);
  }

  /**
   * Delete vectors from Qdrant by fileId
   */
  static async deleteByFileId(collectionName: string, fileId: string): Promise<number> {
    try {
      logger.debug('Deleting vectors by fileId', {
        collection: collectionName,
        fileId,
      });

      const result = await qdrant.delete(collectionName, {
        wait: true,
        filter: {
          must: [
            {
              key: 'fileId',
              match: { value: fileId },
            },
          ],
        },
      });

      const deletedCount = result.operation_id ? 1 : 0; // Qdrant doesn't return exact count, but we know it succeeded
      logger.info('Vectors deleted', { fileId });

      return deletedCount;
    } catch (error) {
      logger.error('Failed to delete vectors from Qdrant', {
        collection: collectionName,
        fileId,
        error,
      });
      throw error;
    }
  }

  /**
   * Delete vectors from Qdrant by projectId (all files in project)
   */
  static async deleteByProjectId(
    collectionName: string,
    projectId: string,
    fileIds: string[]
  ): Promise<number> {
    if (fileIds.length === 0) {
      logger.debug('No files to delete vectors for', { projectId });
      return 0;
    }

    try {
      logger.debug('Deleting vectors by projectId', {
        collection: collectionName,
        projectId,
        fileCount: fileIds.length,
      });

      // Delete all vectors for all files in the project
      await qdrant.delete(collectionName, {
        wait: true,
        filter: {
          must: [
            {
              key: 'fileId',
              match: { any: fileIds },
            },
          ],
        },
      });

      logger.info('Vectors deleted for project', { projectId, fileCount: fileIds.length });

      return fileIds.length; // Return number of files processed
    } catch (error) {
      logger.error('Failed to delete vectors from Qdrant for project', {
        collection: collectionName,
        projectId,
        fileCount: fileIds.length,
        error,
      });
      throw error;
    }
  }

  /**
   * Count vectors by fileId using Qdrant's count API with filter (leverages fileId index)
   * Much more efficient than scrolling for known file IDs
   */
  static async countByFileId(collectionName: string, fileId: string): Promise<number> {
    try {
      const result = await qdrant.count(collectionName, {
        filter: {
          must: [
            {
              key: 'fileId',
              match: { value: fileId },
            },
          ],
        },
        exact: true,
      });

      return result.count;
    } catch (error) {
      const qdrantError = error as QdrantError;
      if (qdrantError.status === 404) {
        return 0; // Collection doesn't exist
      }
      logger.error('Failed to count vectors by fileId', {
        collection: collectionName,
        fileId,
        error,
      });
      throw error;
    }
  }

  /**
   * Count vectors for multiple file IDs efficiently using batch count queries
   * Returns a Map of fileId -> count
   */
  static async countByFileIds(
    collectionName: string,
    fileIds: string[]
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();

    // Process in batches to avoid overwhelming Qdrant
    const batchSize = 50;
    for (let i = 0; i < fileIds.length; i += batchSize) {
      const batch = fileIds.slice(i, i + batchSize);

      // Run count queries in parallel for the batch
      const results = await Promise.all(
        batch.map(async (fileId) => ({
          fileId,
          count: await this.countByFileId(collectionName, fileId),
        }))
      );

      for (const { fileId, count } of results) {
        counts.set(fileId, count);
      }
    }

    return counts;
  }

  /**
   * Get unique file IDs from a Qdrant collection
   * Scrolls through points but only extracts fileIds for orphan detection
   */
  static async getUniqueFileIds(collectionName: string): Promise<Set<string>> {
    const fileIds = new Set<string>();

    try {
      let offset: string | number | Record<string, unknown> | undefined = undefined;
      const limit = 1000; // Larger batch for efficiency since we only need fileId

      while (true) {
        const result = await qdrant.scroll(collectionName, {
          limit,
          offset,
          with_payload: ['fileId'], // Only fetch fileId payload field
          with_vector: false,
        });

        if (result.points.length === 0) {
          break;
        }

        for (const point of result.points) {
          const payload = point.payload as { fileId?: string };
          if (payload?.fileId) {
            fileIds.add(payload.fileId);
          }
        }

        if (!result.next_page_offset) {
          break;
        }

        offset = result.next_page_offset;
      }

      logger.debug('Retrieved unique file IDs from collection', {
        collection: collectionName,
        uniqueFileCount: fileIds.size,
      });

      return fileIds;
    } catch (error) {
      const qdrantError = error as QdrantError;
      if (qdrantError.status === 404) {
        return fileIds; // Collection doesn't exist
      }
      logger.error('Failed to get unique file IDs', {
        collection: collectionName,
        error,
      });
      throw error;
    }
  }

  /**
   * Get all points from a Qdrant collection using scroll (generator version)
   * Yields batches of points to avoid loading everything into memory
   * @param collectionName - The collection to scroll
   * @param filter - Optional filter to limit points (uses indexed fields for efficiency)
   */
  static async *getAllPoints(
    collectionName: string,
    filter?: QdrantFilter
  ): AsyncGenerator<VectorPoint[]> {
    try {
      logger.debug('Getting all points from collection (generator)', {
        collection: collectionName,
        hasFilter: !!filter,
      });

      let offset: string | number | Record<string, unknown> | undefined = undefined;
      const limit = 100; // Scroll in batches of 100

      while (true) {
        const result = await qdrant.scroll(collectionName, {
          limit,
          offset,
          filter,
          with_payload: true,
          with_vector: false, // We don't need the vectors for consistency checks
        });

        if (result.points.length === 0) {
          break;
        }

        // Map Qdrant points to VectorPoint format
        const points: VectorPoint[] = result.points.map((point) => {
          const payload = point.payload as {
            fileId: string;
            companyId: string;
            text_preview?: string;
            chunkIndex: number;
          };

          return {
            id: typeof point.id === 'string' ? point.id : String(point.id),
            vector: [], // Empty since we're not fetching vectors
            payload: {
              fileId: payload.fileId,
              companyId: payload.companyId,
              text_preview: payload.text_preview || '',
              chunkIndex: payload.chunkIndex,
            },
          };
        });

        yield points;

        // Check if there are more points
        if (!result.next_page_offset) {
          break;
        }

        offset = result.next_page_offset;
      }

      logger.debug('Finished retrieving points from collection', {
        collection: collectionName,
      });
    } catch (error) {
      const qdrantError = error as QdrantError;
      if (qdrantError.status === 404) {
        // Collection doesn't exist, yield nothing
        logger.debug('Collection does not exist', { collection: collectionName });
        return;
      }

      logger.error('Failed to get all points from Qdrant', {
        collection: collectionName,
        error,
      });
      throw error;
    }
  }

  /**
   * Get collection info (point count)
   */
  static async getCollectionInfo(collectionName: string): Promise<{ pointsCount: number } | null> {
    try {
      const info = await qdrant.getCollection(collectionName);
      return {
        pointsCount: info.points_count || 0,
      };
    } catch (error) {
      const qdrantError = error as QdrantError;
      if (qdrantError.status === 404) {
        return null; // Collection doesn't exist
      }
      logger.error('Failed to get collection info', {
        collection: collectionName,
        error,
      });
      throw error;
    }
  }
}
