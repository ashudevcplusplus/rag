import { QdrantClient } from '@qdrant/js-client-rest';
import { CONFIG } from '../config';
import {
  VectorPoint,
  SearchResult,
  QdrantFilter,
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

export type EmbeddingProvider = 'openai' | 'gemini';

export class VectorService {
  /**
   * Get embeddings from the specified or configured provider
   * Supports: openai or gemini
   * @param texts - Array of texts to embed
   * @param taskType - 'document' or 'query' (affects Gemini embeddings)
   * @param provider - Optional provider override. If not provided, uses CONFIG.EMBEDDING_PROVIDER
   */
  static async getEmbeddings(
    texts: string[],
    taskType: 'document' | 'query' = 'document',
    provider?: EmbeddingProvider
  ): Promise<number[][]> {
    const effectiveProvider = provider || CONFIG.EMBEDDING_PROVIDER || 'openai';

    switch (effectiveProvider) {
      case 'gemini':
        return GeminiEmbeddingService.getEmbeddings(texts, {
          taskType: taskType === 'query' ? 'retrieval_query' : 'retrieval_document',
        });
      case 'openai':
      default:
        return EmbeddingService.getEmbeddings(texts);
    }
  }

  /**
   * Get embedding dimensions for a given provider
   */
  static getEmbeddingDimensions(provider?: EmbeddingProvider): number {
    const effectiveProvider = provider || CONFIG.EMBEDDING_PROVIDER || 'openai';

    switch (effectiveProvider) {
      case 'gemini':
        return GeminiEmbeddingService.getEmbeddingDimensions();
      case 'openai':
      default:
        // OpenAI text-embedding-3-small = 1536, text-embedding-3-large = 3072
        return CONFIG.OPENAI_EMBEDDING_MODEL.includes('large') ? 3072 : 1536;
    }
  }

  /**
   * Get model name for a given provider
   */
  static getModelName(provider?: EmbeddingProvider): string {
    const effectiveProvider = provider || CONFIG.EMBEDDING_PROVIDER || 'openai';

    switch (effectiveProvider) {
      case 'gemini':
        return CONFIG.GEMINI_EMBEDDING_MODEL;
      case 'openai':
      default:
        return CONFIG.OPENAI_EMBEDDING_MODEL;
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
          `Collection ${collectionName} has dimension ${currentDimensions} but expected ${expectedDimensions} for provider ${provider || CONFIG.EMBEDDING_PROVIDER}. Please recreate the collection or use a different provider.`
        );
      }
    } catch (error) {
      const qdrantError = error as QdrantError;
      if (qdrantError.status === 404) {
        const vectorSize = this.getEmbeddingDimensions(provider);
        logger.info('Creating collection', {
          collection: collectionName,
          vectorSize,
          provider: provider || CONFIG.EMBEDDING_PROVIDER,
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
        // - fileId: Required for project-level access control
        // - companyId: Used for defense-in-depth validation (prevents collection naming bugs)
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
   * Search for similar vectors with optional filtering
   *
   * Security note: Callers should include companyId in filter.must for defense-in-depth:
   * ```
   * filter: {
   *   must: [
   *     { key: 'companyId', match: { value: companyId } },
   *     { key: 'fileId', match: { any: allowedFileIds } }
   *   ]
   * }
   * ```
   *
   * @param collectionName - Qdrant collection name (should be company_${companyId})
   * @param queryVector - Embedding vector to search for
   * @param limit - Maximum number of results to return
   * @param filter - Optional Qdrant filter (should include companyId for defense-in-depth)
   * @returns Array of search results with scores and payloads
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
   * Rerank documents using embedding similarity
   * Uses the configured embedding provider for consistency
   * @param query - The search query
   * @param documents - Array of document texts to rerank
   * @returns Array of relevance scores (higher = more relevant)
   */
  static async rerank(query: string, documents: string[]): Promise<number[]> {
    try {
      logger.debug('Reranking with embedding similarity', { count: documents.length });

      // Get embeddings for query and all documents in parallel
      const [queryEmbeddings, docEmbeddings] = await Promise.all([
        this.getEmbeddings([query], 'query'),
        this.getEmbeddings(documents, 'document'),
      ]);

      const queryVector = queryEmbeddings[0];

      // Calculate cosine similarity between query and each document
      const scores = docEmbeddings.map((docVector) => {
        return this.cosineSimilarity(queryVector, docVector);
      });

      logger.debug('Reranking complete', {
        count: documents.length,
        minScore: Math.min(...scores).toFixed(3),
        maxScore: Math.max(...scores).toFixed(3),
      });

      return scores;
    } catch (error) {
      logger.error('Failed to rerank', {
        error: error instanceof Error ? error.message : String(error),
        docsCount: documents.length,
      });
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) return 0;

    return dotProduct / magnitude;
  }

  /**
   * Search with hybrid reranking (Vector + Cross-Encoder)
   *
   * Security note: Filter should include companyId for defense-in-depth validation
   *
   * @param collectionName - Qdrant collection name (should be company_${companyId})
   * @param query - Search query text
   * @param limit - Final number of results after reranking
   * @param filter - Optional Qdrant filter (should include companyId for defense-in-depth)
   * @param rerankLimit - Number of results to fetch before reranking (default: 20)
   * @param provider - Optional provider override for generating query embeddings
   * @returns Array of reranked search results
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
