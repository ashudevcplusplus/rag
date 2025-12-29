import OpenAI from 'openai';
import { CONFIG } from '../config';
import { VectorService, EmbeddingProvider } from './vector.service';
import { fileMetadataRepository } from '../repositories/file-metadata.repository';
import { embeddingRepository } from '../repositories/embedding.repository';
import {
  ChatV2Request,
  ChatV2Response,
  ChatV2Source,
  QueryAnalysis,
  SearchMode,
} from '../schemas/chat-v2.schema';
import { SearchResult, QdrantFilter } from '../types/vector.types';
import { logger } from '../utils/logger';

// ============================================
// SMART AGENT V2 SERVICE - Completely Independent
// ============================================

/**
 * SmartAgentV2Service - Enhanced RAG chat with multiple search modes
 * This is a completely separate implementation from V1
 */
export class SmartAgentV2Service {
  private static openai: OpenAI;

  private static getClient(): OpenAI {
    if (!this.openai) {
      if (!CONFIG.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }
      this.openai = new OpenAI({
        apiKey: CONFIG.OPENAI_API_KEY,
      });
    }
    return this.openai;
  }

  // ========================================
  // MAIN ENTRY POINT
  // ========================================

  static async chat(companyId: string, request: ChatV2Request): Promise<ChatV2Response> {
    const startTime = Date.now();
    const searchMode = request.searchMode || 'smart';

    logger.info('SmartAgentV2 started', {
      companyId,
      query: request.query,
      searchMode,
    });

    // Step 1: Analyze query
    const analysis = await this.analyzeQuery(request.query, request.messages);

    // Handle special intents
    if (analysis.intent === 'greeting') {
      return this.createGreetingResponse(request, startTime);
    }

    if (analysis.needsClarification) {
      return this.createClarificationResponse(analysis, request, startTime);
    }

    // Step 2: Search based on mode
    let sources: ChatV2Source[];
    switch (searchMode) {
      case 'fast':
        sources = await this.searchFast(companyId, request, analysis);
        break;
      case 'deep':
        sources = await this.searchDeep(companyId, request, analysis);
        break;
      case 'smart':
      default:
        sources = await this.searchSmart(companyId, request, analysis);
        break;
    }

    if (sources.length === 0) {
      return this.createNoResultsResponse(request, searchMode, startTime);
    }

    // Step 3: Generate answer
    const { answer, usage } = await this.generateAnswer(request.query, sources, request);

    // Step 4: Calculate confidence
    const confidence = this.calculateConfidence(sources);

    // Step 5: Generate follow-ups if metadata requested
    let suggestedFollowUps: string[] | undefined;
    if (request.includeMetadata) {
      suggestedFollowUps = await this.generateFollowUps(request.query, answer);
    }

    const processingTime = Date.now() - startTime;

    logger.info('SmartAgentV2 completed', {
      companyId,
      searchMode,
      sourcesCount: sources.length,
      confidence,
      processingTime,
    });

    return {
      answer,
      sources: sources.slice(0, request.maxCitations || 5),
      queryAnalysis: request.includeMetadata ? analysis : undefined,
      suggestedFollowUps,
      confidence,
      responseFormat: request.responseFormat || 'markdown',
      usage,
      model: CONFIG.OPENAI_CHAT_MODEL,
      provider: 'openai',
      searchMode,
      processingTime,
    };
  }

  // ========================================
  // QUERY ANALYSIS
  // ========================================

  private static async analyzeQuery(
    query: string,
    messages?: Array<{ role: string; content: string }>
  ): Promise<QueryAnalysis> {
    const client = this.getClient();

    const historyContext =
      messages
        ?.slice(-5)
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n') || '';

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Analyze the user question and create a search strategy.

Output JSON:
{
  "intent": "find_information" | "summarize" | "compare" | "list" | "clarify" | "greeting",
  "searchQueries": ["primary query", "alternative 1", "alternative 2"],
  "keywords": ["key", "terms"],
  "confidence": 0.9,
  "needsClarification": false,
  "clarificationQuestion": null
}

Rules:
- Generate 2-4 search queries with different phrasings
- ONLY set needsClarification=true for truly vague queries like "tell me about it", "what is that?"
- Most questions should have intent="find_information" - be helpful, not restrictive
- "greeting" = hello, thanks, hi, etc.
- DO NOT ask for clarification if the question mentions a topic (e.g., "refund policy" is clear enough)`,
          },
          {
            role: 'user',
            content: `${historyContext ? `Context:\n${historyContext}\n\n` : ''}Question: "${query}"`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 300,
        temperature: 0.3,
      });

      return JSON.parse(response.choices[0]?.message?.content || '{}') as QueryAnalysis;
    } catch (error) {
      logger.warn('Query analysis failed, using fallback', { query, error });
      return {
        intent: 'find_information',
        searchQueries: [query],
        keywords: query
          .toLowerCase()
          .split(' ')
          .filter((w) => w.length > 3),
        confidence: 0.5,
        needsClarification: false,
      };
    }
  }

  // ========================================
  // SEARCH MODES
  // ========================================

  /**
   * Fast mode: Single query, no reranking, minimal processing
   */
  private static async searchFast(
    companyId: string,
    request: ChatV2Request,
    _analysis: QueryAnalysis
  ): Promise<ChatV2Source[]> {
    const collection = `company_${companyId}`;
    const embeddingProvider = request.embeddingProvider as EmbeddingProvider;

    // Build filter
    const filter = await this.buildFilter(request, companyId);

    // Single query search
    const [embedding] = await VectorService.getEmbeddings(
      [request.query],
      'query',
      embeddingProvider
    );
    const results = await VectorService.search(collection, embedding, 5, filter);

    return this.enrichSources(results);
  }

  /**
   * Smart mode: Multi-query search with RRF fusion
   */
  private static async searchSmart(
    companyId: string,
    request: ChatV2Request,
    analysis: QueryAnalysis
  ): Promise<ChatV2Source[]> {
    const collection = `company_${companyId}`;
    const embeddingProvider = request.embeddingProvider as EmbeddingProvider;

    // Build filter
    const filter = await this.buildFilter(request, companyId);

    // Multi-query search
    const queries = analysis.searchQueries.slice(0, 3);
    const searchPromises = queries.map(async (searchQuery) => {
      const [embedding] = await VectorService.getEmbeddings(
        [searchQuery],
        'query',
        embeddingProvider
      );
      return VectorService.search(collection, embedding, 10, filter);
    });

    const allResults = await Promise.all(searchPromises);

    // Combine with RRF
    const combined = this.combineWithRRF(allResults);

    // Enrich and rerank if enabled
    let sources = await this.enrichSources(combined.slice(0, 20));

    if (request.rerank !== false && sources.length > 5) {
      sources = await this.rerank(request.query, sources, 10);
    }

    return sources;
  }

  /**
   * Deep mode: Extensive search with context expansion
   */
  private static async searchDeep(
    companyId: string,
    request: ChatV2Request,
    analysis: QueryAnalysis
  ): Promise<ChatV2Source[]> {
    const collection = `company_${companyId}`;
    const embeddingProvider = request.embeddingProvider as EmbeddingProvider;

    // Build filter
    const filter = await this.buildFilter(request, companyId);

    // Extended multi-query search
    const queries = analysis.searchQueries.slice(0, 4);
    const searchPromises = queries.map(async (searchQuery) => {
      const [embedding] = await VectorService.getEmbeddings(
        [searchQuery],
        'query',
        embeddingProvider
      );
      return VectorService.search(collection, embedding, 15, filter);
    });

    const allResults = await Promise.all(searchPromises);

    // Combine with RRF
    const combined = this.combineWithRRF(allResults);

    // Enrich sources
    let sources = await this.enrichSources(combined.slice(0, 30));

    // Always rerank in deep mode
    if (sources.length > 5) {
      sources = await this.rerank(request.query, sources, 15);
    }

    // Expand context if enabled
    if (request.expandContext !== false) {
      sources = await this.expandContext(sources);
    }

    return sources;
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Build Qdrant filter with defense-in-depth security
   *
   * Applies multi-layer filtering:
   * 1. companyId: Ensures data isolation at vector DB level (defense-in-depth)
   * 2. fileId: Restricts to files within the project
   * 3. Additional filters: fileId, fileIds, or tags from request
   *
   * @param request - Chat request with projectId and optional filters
   * @param companyId - Authenticated company ID for defense-in-depth validation
   * @returns Qdrant filter object or undefined if no files match
   * @private
   */
  private static async buildFilter(
    request: ChatV2Request,
    companyId: string
  ): Promise<QdrantFilter | undefined> {
    // projectId is required - get all files from the project
    const projectFiles = await fileMetadataRepository.findByProjectId(request.projectId);
    if (projectFiles.length === 0) return undefined;

    const projectFileIds = new Set(projectFiles.map((f) => String(f._id)));

    // Apply additional filters if present
    const filter = request.filter;
    if (filter) {
      // If fileId specified, intersect with project files
      if (filter.fileId && projectFileIds.has(filter.fileId)) {
        return {
          must: [
            { key: 'companyId', match: { value: companyId } },
            { key: 'fileId', match: { value: filter.fileId } },
          ],
        };
      }

      // If fileIds specified, intersect with project files
      if (filter.fileIds && filter.fileIds.length > 0) {
        const validFileIds = filter.fileIds.filter((id) => projectFileIds.has(id));
        if (validFileIds.length > 0) {
          return {
            must: [
              { key: 'companyId', match: { value: companyId } },
              { key: 'fileId', match: { any: validFileIds } },
            ],
          };
        }
      }

      // If tags specified, filter project files by tags
      if (filter.tags && filter.tags.length > 0) {
        const taggedFiles = await fileMetadataRepository.findByTags(filter.tags);
        const taggedFileIds = taggedFiles
          .map((f) => String(f._id))
          .filter((id) => projectFileIds.has(id));
        if (taggedFileIds.length > 0) {
          return {
            must: [
              { key: 'companyId', match: { value: companyId } },
              { key: 'fileId', match: { any: taggedFileIds } },
            ],
          };
        }
        // No files match the tag filter within this project
        return undefined;
      }
    }

    // Default: use all files from the project with companyId filter
    return {
      must: [
        { key: 'companyId', match: { value: companyId } },
        { key: 'fileId', match: { any: Array.from(projectFileIds) } },
      ],
    };
  }

  /**
   * Reciprocal Rank Fusion for combining search results
   */
  private static combineWithRRF(resultSets: SearchResult[][]): SearchResult[] {
    const k = 60;
    const scores = new Map<string, { score: number; item: SearchResult }>();

    resultSets.forEach((results) => {
      results.forEach((item, rank) => {
        const payload = item.payload as { fileId?: string; chunkIndex?: number } | undefined;
        const id = `${payload?.fileId}_${payload?.chunkIndex}`;
        const rrfScore = 1 / (k + rank + 1);

        if (scores.has(id)) {
          scores.get(id)!.score += rrfScore;
        } else {
          scores.set(id, { score: rrfScore, item });
        }
      });
    });

    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .map(({ item, score }) => ({ ...item, score: score * 100 }));
  }

  /**
   * Enrich sources with file metadata
   */
  private static async enrichSources(results: SearchResult[]): Promise<ChatV2Source[]> {
    const fileIds = [
      ...new Set(
        results
          .map((r) => {
            const payload = r.payload as { fileId?: string } | undefined;
            return payload?.fileId;
          })
          .filter((id): id is string => Boolean(id))
      ),
    ];
    if (fileIds.length === 0) return [];

    const files = await fileMetadataRepository.findByIds(fileIds);
    const fileMap = new Map(files.map((f) => [String(f._id), f]));

    return results.map((r, index) => {
      const payload = r.payload as {
        fileId?: string;
        chunkIndex?: number;
        content?: string;
        text_preview?: string;
      } | null;
      const file = fileMap.get(payload?.fileId || '');
      return {
        fileId: payload?.fileId || '',
        fileName: file?.originalFilename || file?.filename || 'Unknown',
        chunkIndex: payload?.chunkIndex || 0,
        content: payload?.content || payload?.text_preview || '',
        score: r.score || 0,
        citationNumber: index + 1,
      };
    });
  }

  /**
   * Rerank results using LLM
   */
  private static async rerank(
    query: string,
    sources: ChatV2Source[],
    topK: number
  ): Promise<ChatV2Source[]> {
    if (sources.length <= topK) return sources;

    const client = this.getClient();
    const docsToRank = sources.slice(0, Math.min(20, sources.length));

    const docList = docsToRank.map((d, i) => `[${i}] ${d.content.slice(0, 200)}`).join('\n\n');

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Score each passage's relevance to the query (0-100). Return JSON: {"scores": [{"i": 0, "s": 85}, ...]}`,
          },
          { role: 'user', content: `Query: "${query}"\n\n${docList}` },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 200,
        temperature: 0,
      });

      const { scores } = JSON.parse(response.choices[0]?.message?.content || '{}');

      return docsToRank
        .map((doc, idx) => ({
          ...doc,
          score: scores?.find((s: { i: number; s: number }) => s.i === idx)?.s ?? doc.score,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    } catch (error) {
      logger.warn('Reranking failed, using original order', { query, error });
      return sources.slice(0, topK);
    }
  }

  /**
   * Expand context with adjacent chunks
   */
  private static async expandContext(sources: ChatV2Source[]): Promise<ChatV2Source[]> {
    if (sources.length === 0) return sources;

    // Find dominant file
    const fileCounts = new Map<string, number>();
    sources.forEach((s) => {
      fileCounts.set(s.fileId, (fileCounts.get(s.fileId) || 0) + 1);
    });

    let dominantFileId = '';
    let maxCount = 0;
    fileCounts.forEach((count, fileId) => {
      if (count > maxCount) {
        maxCount = count;
        dominantFileId = fileId;
      }
    });

    // Only expand if dominant file has >50% of sources
    if (maxCount / sources.length < 0.5) return sources;

    const embedding = await embeddingRepository.findByFileId(dominantFileId);
    if (!embedding?.contents) return sources;

    const file = await fileMetadataRepository.findById(dominantFileId);
    if (!file) return sources;

    // Get existing chunk indexes
    const existingIndexes = new Set(
      sources.filter((s) => s.fileId === dominantFileId).map((s) => s.chunkIndex)
    );

    // Add adjacent chunks
    const expandedSources = [...sources];
    const chunksToAdd: number[] = [];

    existingIndexes.forEach((idx) => {
      if (idx > 0 && !existingIndexes.has(idx - 1)) chunksToAdd.push(idx - 1);
      if (idx < embedding.contents.length - 1 && !existingIndexes.has(idx + 1))
        chunksToAdd.push(idx + 1);
    });

    const uniqueChunks = [...new Set(chunksToAdd)].slice(0, 3);
    uniqueChunks.forEach((idx) => {
      expandedSources.push({
        fileId: dominantFileId,
        fileName: file.originalFilename || file.filename,
        chunkIndex: idx,
        content: embedding.contents[idx],
        score: 70,
        citationNumber: expandedSources.length + 1,
      });
    });

    return expandedSources.sort((a, b) => {
      if (a.fileId !== b.fileId) return a.fileId.localeCompare(b.fileId);
      return a.chunkIndex - b.chunkIndex;
    });
  }

  /**
   * Generate answer with citations
   */
  private static async generateAnswer(
    query: string,
    sources: ChatV2Source[],
    request: ChatV2Request
  ): Promise<{
    answer: string;
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  }> {
    const client = this.getClient();

    const numberedContext = sources
      .map((s, i) => `[${i + 1}] From "${s.fileName}":\n${s.content}`)
      .join('\n\n---\n\n');

    const response = await client.chat.completions.create({
      model: CONFIG.OPENAI_CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant. Answer based ONLY on the provided sources.

IMPORTANT: Cite sources using [1], [2], etc. for every fact.

## Sources:
${numberedContext}

## Rules:
1. Every claim must have a citation [n]
2. If you can't find information, say "I couldn't find this in the documents"
3. Don't make up information`,
        },
        ...(request.messages || []).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: query },
      ],
      max_tokens: request.maxTokens || CONFIG.CHAT_MAX_TOKENS,
      temperature: request.temperature ?? CONFIG.CHAT_TEMPERATURE,
    });

    return {
      answer: response.choices[0]?.message?.content || '',
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  /**
   * Generate follow-up suggestions
   */
  private static async generateFollowUps(query: string, answer: string): Promise<string[]> {
    try {
      const client = this.getClient();

      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Generate 3 natural follow-up questions. Return JSON: {"followups": ["q1", "q2", "q3"]}',
          },
          {
            role: 'user',
            content: `Query: "${query}"\n\nAnswer: "${answer.slice(0, 500)}"`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 150,
        temperature: 0.7,
      });

      const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
      return parsed.followups || [];
    } catch (error) {
      logger.warn('Follow-up generation failed', { query, error });
      return [];
    }
  }

  /**
   * Calculate confidence score
   */
  private static calculateConfidence(sources: ChatV2Source[]): number {
    if (sources.length === 0) return 0;
    const avgScore = sources.reduce((acc, s) => acc + s.score, 0) / sources.length;
    return Math.min(avgScore / 100, 1);
  }

  // ========================================
  // RESPONSE HELPERS
  // ========================================

  private static createGreetingResponse(request: ChatV2Request, startTime: number): ChatV2Response {
    return {
      answer:
        "Hello! I'm here to help you find information in your documents. What would you like to know?",
      sources: [],
      responseFormat: request.responseFormat || 'markdown',
      model: 'gpt-4o-mini',
      provider: 'openai',
      searchMode: request.searchMode || 'smart',
      processingTime: Date.now() - startTime,
    };
  }

  private static createClarificationResponse(
    analysis: QueryAnalysis,
    request: ChatV2Request,
    startTime: number
  ): ChatV2Response {
    return {
      answer:
        analysis.clarificationQuestion ||
        "Could you please provide more details about what you're looking for?",
      sources: [],
      queryAnalysis: request.includeMetadata ? analysis : undefined,
      responseFormat: request.responseFormat || 'markdown',
      model: 'gpt-4o-mini',
      provider: 'openai',
      searchMode: request.searchMode || 'smart',
      processingTime: Date.now() - startTime,
    };
  }

  private static createNoResultsResponse(
    request: ChatV2Request,
    searchMode: SearchMode,
    startTime: number
  ): ChatV2Response {
    return {
      answer:
        "I couldn't find any relevant information in the documents. Could you try rephrasing your question or ask about a different topic?",
      sources: [],
      confidence: 0,
      responseFormat: request.responseFormat || 'markdown',
      model: CONFIG.OPENAI_CHAT_MODEL,
      provider: 'openai',
      searchMode,
      processingTime: Date.now() - startTime,
    };
  }
}
