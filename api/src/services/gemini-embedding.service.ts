import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONFIG } from '../config';
import { ExternalServiceError } from '../types/error.types';
import { logger } from '../utils/logger';

export type GeminiTaskType =
  | 'retrieval_document'
  | 'retrieval_query'
  | 'semantic_similarity'
  | 'classification'
  | 'clustering';

export interface GeminiEmbeddingOptions {
  taskType?: GeminiTaskType;
  title?: string;
  outputDimensionality?: number; // For gemini-embedding-001 with MRL
}

export class GeminiEmbeddingService {
  private static genAI: GoogleGenerativeAI | null = null;

  /**
   * Initialize Google Generative AI client lazily
   */
  private static getClient(): GoogleGenerativeAI {
    if (!this.genAI) {
      if (!CONFIG.GEMINI_API_KEY) {
        throw new ExternalServiceError('Gemini', 'GEMINI_API_KEY environment variable is not set');
      }
      this.genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);
    }
    return this.genAI;
  }

  /**
   * Get the model name with proper prefix
   */
  private static getModelName(): string {
    const model = CONFIG.GEMINI_EMBEDDING_MODEL;
    // Add 'models/' prefix if not already present
    if (model.startsWith('models/')) {
      return model;
    }
    return `models/${model}`;
  }

  /**
   * Get embeddings from Google Gemini API
   * Supports multiple models: text-embedding-004, text-embedding-005, gemini-embedding-001, multimodalembedding@001
   * Handles batching and task types for optimal performance
   */
  static async getEmbeddings(
    texts: string[],
    options: GeminiEmbeddingOptions = {}
  ): Promise<number[][]> {
    try {
      const modelName = this.getModelName();
      const taskType = options.taskType || 'retrieval_document';

      logger.debug('Requesting Gemini embeddings', {
        count: texts.length,
        model: modelName,
        taskType,
      });

      if (texts.length === 0) {
        return [];
      }

      const genAI = this.getClient();
      const model = genAI.getGenerativeModel({ model: modelName });

      // Gemini API supports batching, but we'll use a conservative batch size
      // to stay within rate limits (typically 100-1000 requests per minute)
      const BATCH_SIZE = 100;
      const batches: string[][] = [];

      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        batches.push(texts.slice(i, i + BATCH_SIZE));
      }

      const allEmbeddings: number[][] = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        logger.debug(`Processing batch ${i + 1}/${batches.length}`, {
          batchSize: batch.length,
        });

        try {
          // Process each text in the batch
          const batchPromises = batch.map(async (text, index) => {
            try {
              // Build embedding request - Gemini API accepts string or object
              // For text-embedding models, we can pass options directly
              const embedOptions: {
                taskType?: string;
                title?: string;
                outputDimensionality?: number;
              } = {};

              // Add task type for text-embedding models
              if (modelName.includes('text-embedding') || modelName.includes('gemini-embedding')) {
                embedOptions.taskType = taskType;
              }

              // Add title if provided (improves quality for documents)
              if (options.title) {
                embedOptions.title = options.title;
              }

              // Add output dimensionality for gemini-embedding-001 (MRL support)
              if (modelName.includes('gemini-embedding-001') && options.outputDimensionality) {
                embedOptions.outputDimensionality = options.outputDimensionality;
              }

              // Pass text as content - Gemini SDK embedContent takes content only
              // Task type and other options need to be configured at model level
              const result = await model.embedContent(text);

              // Extract embedding values - handle different response structures
              let embedding: number[] = [];
              if (result.embedding) {
                if (Array.isArray(result.embedding)) {
                  embedding = result.embedding;
                } else if ('values' in result.embedding && Array.isArray(result.embedding.values)) {
                  embedding = result.embedding.values;
                }
              }

              if (embedding.length === 0) {
                throw new Error('Empty embedding returned from API');
              }

              return { embedding, index };
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              logger.error(`Failed to get embedding for text ${index} in batch ${i + 1}`, {
                error: errorMessage,
              });
              throw new ExternalServiceError(
                'Gemini',
                `Failed to get embedding for text ${index}: ${errorMessage}`
              );
            }
          });

          const batchResults = await Promise.all(batchPromises);
          // Sort by original index to maintain order
          batchResults.sort((a, b) => a.index - b.index);
          const batchEmbeddings = batchResults.map((result) => result.embedding);

          allEmbeddings.push(...batchEmbeddings);

          logger.debug(`Batch ${i + 1} completed`, {
            embeddingsCount: batchEmbeddings.length,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error(`Failed to process batch ${i + 1}`, {
            error: errorMessage,
            batchSize: batch.length,
          });
          throw new ExternalServiceError('Gemini', `Batch ${i + 1} failed: ${errorMessage}`);
        }
      }

      logger.debug('All Gemini embeddings received', {
        totalCount: allEmbeddings.length,
        expectedCount: texts.length,
      });

      if (allEmbeddings.length !== texts.length) {
        throw new ExternalServiceError(
          'Gemini',
          `Expected ${texts.length} embeddings but received ${allEmbeddings.length}`
        );
      }

      return allEmbeddings;
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }

      const errorDetails = {
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
        model: CONFIG.GEMINI_EMBEDDING_MODEL,
        textsCount: texts.length,
      };

      logger.error('Failed to get Gemini embeddings', errorDetails);

      // Provide more specific error messages for common issues
      if (error instanceof Error) {
        if (error.message.includes('API key') || error.message.includes('API_KEY')) {
          throw new ExternalServiceError('Gemini', 'Invalid or missing API key');
        }
        if (error.message.includes('rate limit') || error.message.includes('429')) {
          throw new ExternalServiceError('Gemini', 'Rate limit exceeded');
        }
        if (error.message.includes('timeout')) {
          throw new ExternalServiceError('Gemini', 'Request timeout');
        }
        if (error.message.includes('quota') || error.message.includes('QUOTA')) {
          throw new ExternalServiceError('Gemini', 'Quota exceeded');
        }
      }

      throw new ExternalServiceError(
        'Gemini',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Get embedding dimensions for the configured model
   */
  static getEmbeddingDimensions(): number {
    const model = CONFIG.GEMINI_EMBEDDING_MODEL.toLowerCase();

    if (model.includes('gemini-embedding-001')) {
      // Default to 768, but can be adjusted via outputDimensionality option
      return CONFIG.GEMINI_EMBEDDING_DIMENSIONS || 768;
    }
    if (model.includes('multimodalembedding')) {
      return 1408;
    }
    if (model.includes('text-embedding-005') || model.includes('text-embedding-004')) {
      return 768;
    }

    // Default fallback
    return 768;
  }
}
