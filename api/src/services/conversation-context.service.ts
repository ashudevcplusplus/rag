import { VectorService, EmbeddingProvider } from './vector.service';
import { ChatSource } from '../schemas/chat.schema';
import { CachedContext } from '../schemas/conversation.schema';
import { logger } from '../utils/logger';

/**
 * Context decision result
 */
export interface ContextDecision {
  useCache: boolean; // Whether to use cached context
  reason: string; // Explanation
  cacheExpired?: boolean; // If cache exists but expired
  similarityScore?: number; // Query similarity score (0-1)
}

// Keywords that indicate a follow-up question (no need for embedding similarity)
const FOLLOW_UP_PATTERNS = [
  /^(tell me more|explain|what about|how about|and what|can you)/i,
  /^(more on|elaborate|clarify|expand on|details about)/i,
  /\b(you mentioned|you said|the .* you mentioned)\b/i,
  /^(why|how|when|where|who) (does|do|is|are|was|were|did|can|could|would|should) (it|that|this|they)\b/i,
];

// Keywords that indicate a new topic (skip to fresh search)
const NEW_TOPIC_PATTERNS = [
  /^(now|next|moving on|different question|unrelated|change topic)/i,
  /^(forget that|never mind|start over|new question)/i,
];

/**
 * Service for intelligent conversation context management
 *
 * FAST MODE: Uses pattern matching first, embedding similarity only when needed.
 *
 * Performance gains:
 * - Initial query: Full vector search (~10-15 seconds)
 * - Follow-up queries: Pattern match → instant decision (~0ms overhead)
 * - Ambiguous queries: Embedding similarity (~500ms overhead)
 *
 * Decision priority:
 * 1. No cache → fetch fresh
 * 2. Cache expired → fetch fresh
 * 3. Pattern match (follow-up) → use cache immediately
 * 4. Pattern match (new topic) → fetch fresh
 * 5. Embedding similarity (fallback)
 */
export class ConversationContextService {
  // Configuration
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly SIMILARITY_THRESHOLD = 0.7;
  private static readonly FOLLOW_UP_THRESHOLD = 0.3;

  /**
   * Fast cache decision using pattern matching first, embeddings only when needed
   */
  static async shouldUseCache(
    currentQuery: string,
    cachedContext: CachedContext | undefined,
    lastQueryEmbedding: number[] | undefined,
    _conversationHistory: Array<{ role: string; content: string }>,
    embeddingProvider?: EmbeddingProvider
  ): Promise<ContextDecision> {
    // No cache = fetch new context
    if (!cachedContext) {
      return { useCache: false, reason: 'No cached context available' };
    }

    // Check cache expiration
    const now = new Date();
    const expired = cachedContext.expiresAt && new Date(cachedContext.expiresAt) < now;
    if (expired) {
      logger.debug('Context cache expired');
      return { useCache: false, reason: 'Cached context expired', cacheExpired: true };
    }

    // FAST PATH: Pattern-based detection (no API calls)
    const patternResult = this.detectQueryTypeByPattern(currentQuery);
    if (patternResult) {
      logger.info('Fast cache decision via pattern match', {
        pattern: patternResult.type,
        query: currentQuery.substring(0, 40),
      });
      return {
        useCache: patternResult.type === 'follow_up',
        reason: patternResult.reason,
      };
    }

    // FAST PATH: Short queries with pronouns likely refer to previous context
    if (this.isLikelyFollowUp(currentQuery)) {
      logger.info('Fast cache decision: likely follow-up (pronoun/short query)');
      return { useCache: true, reason: 'Short query with context reference' };
    }

    // SLOW PATH: Use embedding similarity for ambiguous cases
    if (lastQueryEmbedding) {
      return this.decideByEmbeddingSimilarity(currentQuery, lastQueryEmbedding, embeddingProvider);
    }

    // Default: use cache if it exists
    return { useCache: true, reason: 'Using cache (no embedding for comparison)' };
  }

  /**
   * Detect query type using regex patterns (instant, no API calls)
   */
  private static detectQueryTypeByPattern(
    query: string
  ): { type: 'follow_up' | 'new_topic'; reason: string } | null {
    const trimmedQuery = query.trim();

    // Check for follow-up patterns
    for (const pattern of FOLLOW_UP_PATTERNS) {
      if (pattern.test(trimmedQuery)) {
        return { type: 'follow_up', reason: 'Pattern match: follow-up question' };
      }
    }

    // Check for new topic patterns
    for (const pattern of NEW_TOPIC_PATTERNS) {
      if (pattern.test(trimmedQuery)) {
        return { type: 'new_topic', reason: 'Pattern match: new topic detected' };
      }
    }

    return null;
  }

  /**
   * Check if query is likely a follow-up based on simple heuristics
   */
  private static isLikelyFollowUp(query: string): boolean {
    const words = query.trim().split(/\s+/);

    // Very short queries (1-5 words) are often follow-ups
    if (words.length <= 5) {
      // Contains pronouns referencing previous context
      const hasContextPronoun = /\b(it|this|that|they|them|these|those)\b/i.test(query);
      if (hasContextPronoun) return true;

      // Single word questions about the topic
      if (words.length <= 2 && /^(why|how|when|where|what|which)\??$/i.test(words[0])) {
        return true;
      }
    }

    return false;
  }

  /**
   * Fallback to embedding similarity for ambiguous queries
   */
  private static async decideByEmbeddingSimilarity(
    currentQuery: string,
    lastQueryEmbedding: number[],
    embeddingProvider?: EmbeddingProvider
  ): Promise<ContextDecision> {
    try {
      const [currentEmbedding] = await VectorService.getEmbeddings(
        [currentQuery],
        'query',
        embeddingProvider
      );
      const similarityScore = this.cosineSimilarity(currentEmbedding, lastQueryEmbedding);

      logger.info('Cache decision via embedding similarity', {
        similarityScore: similarityScore.toFixed(3),
        decision: similarityScore >= this.FOLLOW_UP_THRESHOLD ? 'use_cache' : 'fetch_fresh',
      });

      if (similarityScore >= this.SIMILARITY_THRESHOLD) {
        return {
          useCache: true,
          reason: 'Very similar query',
          similarityScore,
        };
      }

      if (similarityScore < this.FOLLOW_UP_THRESHOLD) {
        return {
          useCache: false,
          reason: 'Different topic detected',
          similarityScore,
        };
      }

      // Medium similarity = follow-up
      return {
        useCache: true,
        reason: 'Follow-up query',
        similarityScore,
      };
    } catch (error) {
      logger.warn('Embedding similarity failed, defaulting to cache', { error });
      return { useCache: true, reason: 'Defaulting to cache (embedding error)' };
    }
  }

  /**
   * Create cached context from sources
   */
  static createCachedContext(
    sources: ChatSource[],
    query: string,
    contextString: string
  ): CachedContext {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.CACHE_TTL_MS);

    return {
      sources,
      query,
      contextString,
      retrievedAt: now,
      expiresAt,
      fileIds: [...new Set(sources.map((s) => s.fileId))],
    };
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }

  /**
   * Check if cached context should be invalidated based on file changes
   */
  static shouldInvalidateCache(cachedContext: CachedContext, availableFileIds: string[]): boolean {
    const cachedFileIds = new Set(cachedContext.fileIds);
    const availableFileIdsSet = new Set(availableFileIds);

    for (const fileId of cachedFileIds) {
      if (!availableFileIdsSet.has(fileId)) {
        logger.info('Invalidating cache - file no longer available', { fileId });
        return true;
      }
    }

    return false;
  }
}
