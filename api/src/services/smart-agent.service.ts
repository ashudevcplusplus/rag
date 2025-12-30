import OpenAI from 'openai';
import { CONFIG } from '../config';
import { VectorService, EmbeddingProvider } from './vector.service';
import { fileMetadataRepository } from '../repositories/file-metadata.repository';
import { embeddingRepository } from '../repositories/embedding.repository';
import { ChatRequest, ChatResponse, ChatSource } from '../schemas/chat.schema';
import { logger } from '../utils/logger';
import { SearchResult } from '../types/vector.types';

// ============================================
// TYPES
// ============================================

interface QueryPlan {
  intent: 'find_information' | 'summarize' | 'compare' | 'list' | 'clarify' | 'greeting';
  searchQueries: string[];
  keywords: string[];
  needsClarification: boolean;
  clarificationQuestion?: string;
  confidence: number;
}

interface SearchAnalysis {
  hasEnoughContext: boolean;
  dominantFileId: string | null;
  dominantFileRelevance: number;
  shouldFetchMoreFromFile: boolean;
  missingInformation: string[];
}

// ============================================
// SMART AGENT SERVICE
// ============================================

export class SmartAgentService {
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
  // STEP 1: UNDERSTAND THE QUERY
  // ========================================

  /**
   * Planner: Understand what the user wants and generate search strategy
   */
  private static async planQuery(
    query: string,
    conversationHistory?: { role: string; content: string }[]
  ): Promise<QueryPlan> {
    const client = this.getClient();

    const historyContext =
      conversationHistory
        ?.slice(-5)
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n') || '';

    const response = await client.chat.completions.create({
      model: CONFIG.OPENAI_QUERY_ANALYSIS_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a search query planner. Analyze user questions and create a search strategy.

Given a user question, output JSON:
{
  "intent": "find_information" | "summarize" | "compare" | "list" | "clarify" | "greeting",
  "searchQueries": ["primary search query", "alternative query 1", "alternative query 2"],
  "keywords": ["important", "terms", "to", "match"],
  "needsClarification": false,
  "clarificationQuestion": null,
  "confidence": 0.9
}

Guidelines:
- Generate 2-4 search queries with different phrasings
- Extract key terms/keywords that must appear
- "find_information" = user wants to know something specific
- "summarize" = user wants overview of a topic/document
- "compare" = user wants comparison between things
- "list" = user wants a list of items
- "clarify" = question is too vague (e.g., "tell me about it" - what is "it"?)
- "greeting" = hello, thanks, etc.

Consider conversation history for context (what is "it", "that", etc.)`,
        },
        {
          role: 'user',
          content: `${historyContext ? `Recent conversation:\n${historyContext}\n\n` : ''}Current question: "${query}"`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
      temperature: 0.3,
    });

    try {
      return JSON.parse(response.choices[0]?.message?.content || '{}') as QueryPlan;
    } catch {
      return {
        intent: 'find_information',
        searchQueries: [query],
        keywords: query
          .toLowerCase()
          .split(' ')
          .filter((w) => w.length > 3),
        needsClarification: false,
        confidence: 0.5,
      };
    }
  }

  // ========================================
  // STEP 2: SEARCH WITH MULTIPLE QUERIES
  // ========================================

  /**
   * Execute search with all generated queries and combine results
   *
   * Security: Multi-layer isolation
   * - Collection: company_${companyId}
   * - Qdrant filter: companyId + fileId (defense-in-depth)
   * - Project validation: files must belong to request.projectId
   *
   * @param companyId - Authenticated company ID
   * @param plan - Query plan with generated search queries
   * @param request - Chat request with required projectId and optional filters
   * @returns Array of combined and reranked sources
   * @private
   */
  private static async executeSearch(
    companyId: string,
    plan: QueryPlan,
    request: ChatRequest
  ): Promise<ChatSource[]> {
    const collection = `company_${companyId}`;
    const embeddingProvider = request.embeddingProvider as EmbeddingProvider;

    // Build filter from required projectId
    const projectFiles = await fileMetadataRepository.findByProjectId(request.projectId);
    if (projectFiles.length === 0) {
      return [];
    }

    let allowedFileIds = projectFiles.map((f) => f._id);

    // Apply additional file filters if specified
    if (request.filter?.fileId) {
      if (!allowedFileIds.includes(request.filter.fileId)) {
        return [];
      }
      allowedFileIds = [request.filter.fileId];
    }
    if (request.filter?.fileIds && request.filter.fileIds.length > 0) {
      const fileIdsSet = new Set(request.filter.fileIds);
      allowedFileIds = allowedFileIds.filter((id) => fileIdsSet.has(id));
      if (allowedFileIds.length === 0) {
        return [];
      }
    }

    const filter = {
      must: [
        { key: 'companyId', match: { value: companyId } },
        { key: 'fileId', match: { any: allowedFileIds } },
      ],
    };

    // Search with all queries in parallel
    const searchPromises = plan.searchQueries.map(async (searchQuery) => {
      const [embedding] = await VectorService.getEmbeddings(
        [searchQuery],
        'query',
        embeddingProvider
      );
      return VectorService.search(collection, embedding, 10, filter);
    });

    const allResults = await Promise.all(searchPromises);

    // Combine and deduplicate using RRF
    const combined = this.combineSearchResults(allResults, plan.searchQueries.length);

    // Enrich with file metadata
    const enriched = await this.enrichSources(combined.slice(0, 20));

    // Rerank top results for better ordering
    if (enriched.length > 5) {
      return await this.rerank(request.query, enriched, 10);
    }

    return enriched;
  }

  /**
   * Combine multiple search results using Reciprocal Rank Fusion
   */
  private static combineSearchResults(
    resultSets: SearchResult[][],
    _numQueries: number
  ): SearchResult[] {
    const k = 60;
    const scores = new Map<string, { score: number; item: SearchResult }>();

    resultSets.forEach((results) => {
      results.forEach((item, rank) => {
        const id = `${item.payload?.fileId}_${item.payload?.chunkIndex}`;
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
   * Rerank top results using GPT-4o-mini
   */
  private static async rerank(
    query: string,
    sources: ChatSource[],
    topK: number = 10
  ): Promise<ChatSource[]> {
    if (sources.length <= topK) return sources;

    const client = this.getClient();
    const docsToRank = sources.slice(0, Math.min(20, sources.length));

    const docList = docsToRank.map((d, i) => `[${i}] ${d.content.slice(0, 200)}`).join('\n\n');

    const response = await client.chat.completions.create({
      model: CONFIG.OPENAI_RERANK_MODEL,
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

    try {
      const { scores } = JSON.parse(response.choices[0]?.message?.content || '{}') as {
        scores?: Array<{ i: number; s: number }>;
      };

      return docsToRank
        .map((doc, idx) => ({
          ...doc,
          score: scores?.find((s) => s.i === idx)?.s ?? doc.score,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    } catch {
      return sources.slice(0, topK);
    }
  }

  // ========================================
  // STEP 3: ANALYZE SEARCH RESULTS
  // ========================================

  /**
   * Check if top chunks are from same file and contiguous
   */
  private static areChunksContiguous(sources: ChatSource[]): boolean {
    if (sources.length < 2) return true;

    const fileId = sources[0].fileId;
    const sameFile = sources.every((s) => s.fileId === fileId);
    if (!sameFile) return false;

    const indexes = sources.map((s) => s.chunkIndex).sort((a, b) => a - b);
    for (let i = 1; i < indexes.length; i++) {
      if (indexes[i] - indexes[i - 1] > 2) return false; // Allow gap of 1
    }
    return true;
  }

  /**
   * Quick heuristic-based analysis (no LLM call!)
   */
  private static quickAnalysis(sources: ChatSource[]): SearchAnalysis {
    const fileChunkCounts = new Map<string, number>();

    for (const source of sources) {
      fileChunkCounts.set(source.fileId, (fileChunkCounts.get(source.fileId) || 0) + 1);
    }

    let dominantFileId: string | null = null;
    let dominantCount = 0;

    for (const [fileId, count] of fileChunkCounts) {
      if (count > dominantCount) {
        dominantCount = count;
        dominantFileId = fileId;
      }
    }

    const dominantFileRelevance = dominantCount / sources.length;

    return {
      hasEnoughContext: true,
      dominantFileId,
      dominantFileRelevance,
      shouldFetchMoreFromFile: dominantFileRelevance > 0.6 && !this.areChunksContiguous(sources),
      missingInformation: [],
    };
  }

  /**
   * Analyze search results - heuristics first, LLM only if uncertain
   */
  private static async analyzeSearchResults(
    query: string,
    sources: ChatSource[],
    _plan: QueryPlan
  ): Promise<SearchAnalysis> {
    if (sources.length === 0) {
      return {
        hasEnoughContext: false,
        dominantFileId: null,
        dominantFileRelevance: 0,
        shouldFetchMoreFromFile: false,
        missingInformation: ['No relevant documents found'],
      };
    }

    // ========================================
    // STEP 1: Fast heuristic analysis
    // ========================================

    const fileChunkCounts = new Map<string, { count: number; avgScore: number }>();

    for (const source of sources) {
      const entry = fileChunkCounts.get(source.fileId) || { count: 0, avgScore: 0 };
      entry.avgScore = (entry.avgScore * entry.count + source.score) / (entry.count + 1);
      entry.count++;
      fileChunkCounts.set(source.fileId, entry);
    }

    // Find dominant file
    let dominantFileId: string | null = null;
    let dominantFileRelevance = 0;

    for (const [fileId, data] of fileChunkCounts) {
      const relevance = data.count / sources.length;
      if (relevance > dominantFileRelevance) {
        dominantFileRelevance = relevance;
        dominantFileId = fileId;
      }
    }

    // Calculate confidence metrics
    const topScore = sources[0]?.score || 0;
    const avgScore =
      sources.slice(0, 5).reduce((a, b) => a + b.score, 0) / Math.min(5, sources.length);
    const _scoreSpread = topScore - (sources[4]?.score || 0);

    // ========================================
    // STEP 2: Decide if we're confident WITHOUT LLM
    // ========================================

    // HIGH CONFIDENCE cases (skip LLM):
    if (topScore > 80 && avgScore > 65 && dominantFileRelevance > 0.5) {
      logger.debug('Analysis: high confidence, skipping LLM');
      return {
        hasEnoughContext: true,
        dominantFileId,
        dominantFileRelevance,
        shouldFetchMoreFromFile: dominantFileRelevance > 0.6 && !this.areChunksContiguous(sources),
        missingInformation: [],
      };
    }

    // LOW CONFIDENCE cases (skip LLM, but flag):
    if (topScore < 40 || avgScore < 30) {
      logger.debug('Analysis: low confidence results');
      return {
        hasEnoughContext: false,
        dominantFileId: null,
        dominantFileRelevance: 0,
        shouldFetchMoreFromFile: false,
        missingInformation: ['Search results have low relevance scores'],
      };
    }

    // ========================================
    // STEP 3: UNCERTAIN cases → Use LLM
    // ========================================

    logger.debug('Analysis: uncertain, using LLM');

    const client = this.getClient();
    const contextPreview = sources
      .slice(0, 3)
      .map((s) => `[${s.fileName}] ${s.content.slice(0, 150)}...`)
      .join('\n');

    const response = await client.chat.completions.create({
      model: CONFIG.OPENAI_CONTEXT_ANALYSIS_MODEL,
      messages: [
        {
          role: 'system',
          content: `Quick check: Can these snippets answer the question? Return JSON: {"hasEnough": true/false, "shouldReadMore": true/false}`,
        },
        {
          role: 'user',
          content: `Q: "${query}"\n\nSnippets:\n${contextPreview}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 50,
      temperature: 0,
    });

    try {
      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      return {
        hasEnoughContext: result.hasEnough ?? true,
        dominantFileId,
        dominantFileRelevance,
        shouldFetchMoreFromFile:
          result.shouldReadMore &&
          dominantFileRelevance > 0.5 &&
          !this.areChunksContiguous(sources),
        missingInformation: [],
      };
    } catch {
      return {
        hasEnoughContext: true,
        dominantFileId,
        dominantFileRelevance,
        shouldFetchMoreFromFile: dominantFileRelevance > 0.6 && !this.areChunksContiguous(sources),
        missingInformation: [],
      };
    }
  }

  // ========================================
  // STEP 4: FETCH MORE CONTEXT IF NEEDED
  // ========================================

  /**
   * Expand context by section headers instead of just adjacent indices
   */
  private static async expandContextBySectionAware(
    existingSources: ChatSource[],
    dominantFileId: string,
    companyId: string
  ): Promise<ChatSource[]> {
    const embedding = await embeddingRepository.findByFileId(dominantFileId);
    if (!embedding?.contents) return existingSources;

    const file = await fileMetadataRepository.findById(dominantFileId, companyId);
    if (!file) return existingSources;

    // Get existing chunk indexes
    const existingIndexes = new Set(
      existingSources.filter((s) => s.fileId === dominantFileId).map((s) => s.chunkIndex)
    );

    // Find section boundaries (chunks starting with headers)
    const sectionStarts: number[] = [];
    embedding.contents.forEach((content, idx) => {
      if (/^(#{1,4}\s|[A-Z][A-Z\s]+:|\d+\.\s)/.test(content.trim())) {
        sectionStarts.push(idx);
      }
    });

    // For each existing chunk, find its section and include the whole section
    const chunksToAdd: number[] = [];

    for (const existingIdx of existingIndexes) {
      // Find section this chunk belongs to
      let sectionStart = 0;
      let sectionEnd = embedding.contents.length;

      for (let i = 0; i < sectionStarts.length; i++) {
        if (sectionStarts[i] <= existingIdx) {
          sectionStart = sectionStarts[i];
        }
        if (sectionStarts[i] > existingIdx) {
          sectionEnd = sectionStarts[i];
          break;
        }
      }

      // Add chunks from this section (limit to 3 before/after)
      for (
        let i = Math.max(sectionStart, existingIdx - 3);
        i < Math.min(sectionEnd, existingIdx + 4);
        i++
      ) {
        if (!existingIndexes.has(i)) {
          chunksToAdd.push(i);
        }
      }
    }

    // Add the new chunks
    const expandedSources = [...existingSources];
    const uniqueChunksToAdd = [...new Set(chunksToAdd)].slice(0, 5);

    for (const idx of uniqueChunksToAdd) {
      expandedSources.push({
        fileId: dominantFileId,
        fileName: file.originalFilename || file.filename,
        chunkIndex: idx,
        content: embedding.contents[idx],
        score: 70,
      });
    }

    return expandedSources.sort((a, b) => {
      if (a.fileId !== b.fileId) return a.fileId.localeCompare(b.fileId);
      return a.chunkIndex - b.chunkIndex;
    });
  }

  /**
   * Fetch adjacent chunks from a dominant file for complete context
   */
  private static async expandContextFromFile(
    existingSources: ChatSource[],
    dominantFileId: string,
    companyId: string,
    maxAdditionalChunks: number = 5
  ): Promise<ChatSource[]> {
    // Get all chunks from the dominant file
    const embedding = await embeddingRepository.findByFileId(dominantFileId);
    if (!embedding || !embedding.contents) return existingSources;

    const file = await fileMetadataRepository.findById(dominantFileId, companyId);
    if (!file) return existingSources;

    // Find which chunks we already have
    const existingChunkIndexes = new Set(
      existingSources.filter((s) => s.fileId === dominantFileId).map((s) => s.chunkIndex)
    );

    // Get the range of chunks we have
    const indexes = Array.from(existingChunkIndexes);
    if (indexes.length === 0) return existingSources;

    const minIndex = Math.min(...indexes);
    const maxIndex = Math.max(...indexes);

    // Expand to include adjacent chunks (before and after)
    const expandedSources: ChatSource[] = [...existingSources];
    let added = 0;

    // Add chunks before
    for (let i = minIndex - 1; i >= 0 && added < maxAdditionalChunks / 2; i--) {
      if (!existingChunkIndexes.has(i)) {
        expandedSources.push({
          fileId: dominantFileId,
          fileName: file.originalFilename || file.filename,
          chunkIndex: i,
          content: embedding.contents[i],
          score: 75, // Lower score since it's context expansion
        });
        added++;
      }
    }

    // Add chunks after
    for (let i = maxIndex + 1; i < embedding.contents.length && added < maxAdditionalChunks; i++) {
      if (!existingChunkIndexes.has(i)) {
        expandedSources.push({
          fileId: dominantFileId,
          fileName: file.originalFilename || file.filename,
          chunkIndex: i,
          content: embedding.contents[i],
          score: 75,
        });
        added++;
      }
    }

    // Sort by file and chunk index for coherent reading
    return expandedSources.sort((a, b) => {
      if (a.fileId !== b.fileId) return a.fileId.localeCompare(b.fileId);
      return a.chunkIndex - b.chunkIndex;
    });
  }

  // ========================================
  // STEP 5: GENERATE ANSWER WITH CITATIONS
  // ========================================

  /**
   * Generate answer with enforced citations
   */
  private static async generateAnswerWithCitations(
    query: string,
    sources: ChatSource[],
    request: ChatRequest
  ): Promise<{
    answer: string;
    citedSources: string[];
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  }> {
    const client = this.getClient();

    // Build context with file grouping
    const contextParts: string[] = [];
    let currentFile = '';

    for (const source of sources) {
      if (source.fileId !== currentFile) {
        currentFile = source.fileId;
        contextParts.push(`\n### From: ${source.fileName}\n`);
      }
      contextParts.push(source.content);
    }

    const _context = contextParts.join('\n');

    // Number the sources for citation
    const numberedContext = sources
      .map((s, i) => `[${i + 1}] From "${s.fileName}":\n${s.content}`)
      .join('\n\n---\n\n');

    const response = await client.chat.completions.create({
      model: CONFIG.OPENAI_CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant. Answer based ONLY on the provided sources.

IMPORTANT: You MUST cite sources using [1], [2], etc. for every fact you mention.

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

    const answer = response.choices[0]?.message?.content || '';

    // Extract which sources were actually cited
    const citedNumbers = [...answer.matchAll(/\[(\d+)\]/g)].map((m) => parseInt(m[1]));
    const citedSources = [...new Set(citedNumbers)]
      .filter((n) => n >= 1 && n <= sources.length)
      .map((n) => sources[n - 1].fileId);

    return {
      answer,
      citedSources,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  // ========================================
  // MAIN ENTRY POINT
  // ========================================

  static async chat(companyId: string, request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    logger.info('Smart agent started', { companyId, query: request.query });

    // 1️⃣ PLAN: Understand the query
    const plan = await this.planQuery(request.query, request.messages);

    logger.info('Query plan', {
      intent: plan.intent,
      queries: plan.searchQueries,
      confidence: plan.confidence,
    });

    // Handle special intents
    if (plan.intent === 'greeting') {
      return {
        answer:
          "Hello! I'm here to help you find information in your documents. What would you like to know?",
        sources: [],
        model: CONFIG.OPENAI_CHAT_MODEL,
        provider: 'openai',
      };
    }

    if (plan.needsClarification) {
      return {
        answer:
          plan.clarificationQuestion ||
          "Could you please provide more details about what you're looking for?",
        sources: [],
        model: CONFIG.OPENAI_CHAT_MODEL,
        provider: 'openai',
      };
    }

    // 2️⃣ SEARCH: Execute multi-query search
    let sources = await this.executeSearch(companyId, plan, request);

    logger.info('Search completed', { resultCount: sources.length });

    if (sources.length === 0) {
      return {
        answer:
          "I couldn't find any relevant information in the documents. Could you try rephrasing your question or ask about a different topic?",
        sources: [],
        model: CONFIG.OPENAI_CHAT_MODEL,
        provider: 'openai',
      };
    }

    // ========================================
    // 🚀 SHORT-CIRCUIT: Skip expensive analysis if confident
    // ========================================

    const topScore = sources[0]?.score || 0;
    const avgScore =
      sources.slice(0, 5).reduce((a, b) => a + b.score, 0) / Math.min(5, sources.length);
    const chunksAreContiguous = this.areChunksContiguous(sources.slice(0, 5));

    const shouldSkipAnalysis =
      plan.confidence > 0.85 && // Planner was confident
      sources.length >= 5 && // Got enough results
      topScore > 75 && // Top result is highly relevant
      avgScore > 60; // Overall quality is good

    let analysis: SearchAnalysis;

    if (shouldSkipAnalysis) {
      // ⚡ FAST PATH: Use heuristics instead of LLM
      logger.info('Short-circuit: skipping LLM analysis');
      analysis = this.quickAnalysis(sources);
    } else {
      // 🐢 SLOW PATH: Use LLM for uncertain cases
      analysis = await this.analyzeSearchResults(request.query, sources, plan);
    }

    logger.info('Analysis', {
      hasEnough: analysis.hasEnoughContext,
      dominantFile: analysis.dominantFileId,
      shouldExpand: analysis.shouldFetchMoreFromFile,
    });

    // 3️⃣ EXPAND: Get more chunks if needed
    if (analysis.shouldFetchMoreFromFile && analysis.dominantFileId && !chunksAreContiguous) {
      // Try section-aware expansion first, fallback to adjacent
      try {
        sources = await this.expandContextBySectionAware(
          sources,
          analysis.dominantFileId,
          companyId
        );
      } catch {
        sources = await this.expandContextFromFile(sources, analysis.dominantFileId, companyId);
      }
      logger.info('Context expanded', { newSourceCount: sources.length });
    }

    // 4️⃣ ANSWER: Generate response with citations
    const { answer, citedSources, usage } = await this.generateAnswerWithCitations(
      request.query,
      sources,
      request
    );

    logger.info('Smart agent completed', {
      duration: Date.now() - startTime,
      sources: sources.length,
      citedSources: citedSources.length,
      usage,
    });

    return {
      answer,
      sources: request.includeSources ? sources : [],
      usage,
      model: CONFIG.OPENAI_CHAT_MODEL,
      provider: 'openai',
    };
  }

  // Helper to enrich sources
  private static async enrichSources(results: SearchResult[]): Promise<ChatSource[]> {
    const fileIds = [
      ...new Set(
        results
          .map((r) => (r.payload as { fileId?: string })?.fileId)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    if (fileIds.length === 0) return [];

    const files = await fileMetadataRepository.findByIds(fileIds);
    const fileMap = new Map(files.map((f) => [f._id, f]));

    return results.map((r) => {
      const payload = r.payload as {
        fileId?: string;
        chunkIndex?: number;
        content?: string;
        text_preview?: string;
      };
      const file = fileMap.get(payload?.fileId || '');
      return {
        fileId: payload?.fileId || '',
        fileName: file?.originalFilename || file?.filename || 'Unknown',
        chunkIndex: payload?.chunkIndex || 0,
        content: payload?.content || payload?.text_preview || '',
        score: r.score,
      };
    });
  }
}
