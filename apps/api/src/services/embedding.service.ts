import OpenAI from 'openai';
import { CONFIG } from '../config';
import { ExternalServiceError } from '../types/error.types';
import { logger } from '../utils/logger';

export class EmbeddingService {
  private static openai: OpenAI | null = null;

  /**
   * Initialize OpenAI client lazily
   */
  private static getClient(): OpenAI {
    if (!this.openai) {
      if (!CONFIG.OPENAI_API_KEY) {
        throw new ExternalServiceError('OpenAI', 'OPENAI_API_KEY environment variable is not set');
      }
      this.openai = new OpenAI({
        apiKey: CONFIG.OPENAI_API_KEY,
      });
    }
    return this.openai;
  }

  /**
   * Get embeddings from OpenAI API
   * Handles batching for large text arrays to respect rate limits
   */
  static async getEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      logger.debug('Requesting OpenAI embeddings', {
        count: texts.length,
        model: CONFIG.OPENAI_EMBEDDING_MODEL,
      });

      if (texts.length === 0) {
        return [];
      }

      const client = this.getClient();

      // OpenAI allows up to 2048 texts per request for text-embedding-3-small/large
      // We'll use a conservative batch size of 100 to stay well within limits
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
          const response = await client.embeddings.create({
            model: CONFIG.OPENAI_EMBEDDING_MODEL,
            input: batch,
            encoding_format: 'float',
          });

          // Extract embeddings in the correct order
          const batchEmbeddings = response.data
            .sort((a, b) => a.index - b.index)
            .map((item) => item.embedding);

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
          throw new ExternalServiceError('OpenAI', `Batch ${i + 1} failed: ${errorMessage}`);
        }
      }

      logger.debug('All OpenAI embeddings received', {
        totalCount: allEmbeddings.length,
        expectedCount: texts.length,
      });

      if (allEmbeddings.length !== texts.length) {
        throw new ExternalServiceError(
          'OpenAI',
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
        model: CONFIG.OPENAI_EMBEDDING_MODEL,
        textsCount: texts.length,
      };

      logger.error('Failed to get OpenAI embeddings', errorDetails);

      // Provide more specific error messages for common issues
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new ExternalServiceError('OpenAI', 'Invalid or missing API key');
        }
        if (error.message.includes('rate limit')) {
          throw new ExternalServiceError('OpenAI', 'Rate limit exceeded');
        }
        if (error.message.includes('timeout')) {
          throw new ExternalServiceError('OpenAI', 'Request timeout');
        }
      }

      throw new ExternalServiceError(
        'OpenAI',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}
