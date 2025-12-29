import OpenAI from 'openai';
import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { Response } from 'express';
import { CONFIG } from '../config';
import { VectorService, EmbeddingProvider } from './vector.service';
import { fileMetadataRepository } from '../repositories/file-metadata.repository';
import { projectRepository } from '../repositories/project.repository';
import {
  ChatRequest,
  ChatResponse,
  ChatSource,
  ChatMessage,
  StreamEvent,
  PromptTemplateType,
} from '../schemas/chat.schema';
import { PROMPT_TEMPLATES } from '../utils/prompt-templates';
import { QdrantFilter, SearchResult, SearchResultPayload } from '../types/vector.types';
import { ExternalServiceError } from '../types/error.types';
import { logger } from '../utils/logger';

export class ChatService {
  private static openai: OpenAI | null = null;
  private static gemini: GoogleGenerativeAI | null = null;

  /**
   * Get OpenAI client lazily
   */
  private static getOpenAIClient(): OpenAI {
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
   * Get Gemini client lazily
   */
  private static getGeminiClient(): GoogleGenerativeAI {
    if (!this.gemini) {
      if (!CONFIG.GEMINI_API_KEY) {
        throw new ExternalServiceError('Gemini', 'GEMINI_API_KEY environment variable is not set');
      }
      this.gemini = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY);
    }
    return this.gemini;
  }

  /**
   * Process chat request with RAG
   * 1. Search for relevant chunks using vector similarity
   * 2. Arrange chunks by relevance and position
   * 3. Build context from chunks
   * 4. Send to LLM with context
   * 5. Return answer with sources
   */
  static async chat(companyId: string, request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const provider = request.llmProvider || CONFIG.LLM_PROVIDER;

    logger.info('Chat request started', {
      companyId,
      queryLength: request.query.length,
      provider,
      limit: request.limit,
      rerank: request.rerank,
    });

    // 1. Retrieve relevant chunks using RAG
    const sources = await this.retrieveContext(companyId, request);

    logger.debug('RAG context retrieved', {
      companyId,
      sourcesCount: sources.length,
      duration: Date.now() - startTime,
    });

    // 2. Build the context string from sources
    const context = this.buildContextString(sources);

    // 3. Build the messages for the LLM
    const systemPrompt = this.resolveSystemPrompt(request);
    const messages = this.buildMessages(systemPrompt, context, request.query, request.messages);

    // 4. Call the appropriate LLM
    let response: ChatResponse;

    if (provider === 'gemini') {
      response = await this.callGemini(messages, request);
    } else {
      response = await this.callOpenAI(messages, request);
    }

    // 5. Attach sources if requested
    if (request.includeSources) {
      response.sources = sources;
    } else {
      response.sources = [];
    }

    logger.info('Chat request completed', {
      companyId,
      provider,
      sourcesCount: sources.length,
      answerLength: response.answer.length,
      totalDuration: Date.now() - startTime,
      usage: response.usage,
    });

    return response;
  }

  /**
   * Process streaming chat request with RAG
   * Sends SSE events for real-time token streaming
   */
  static async chatStream(companyId: string, request: ChatRequest, res: Response): Promise<void> {
    const startTime = Date.now();
    const provider = request.llmProvider || CONFIG.LLM_PROVIDER;

    logger.info('Streaming chat request started', {
      companyId,
      queryLength: request.query.length,
      provider,
      limit: request.limit,
      rerank: request.rerank,
    });

    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    try {
      // 1. Retrieve relevant chunks using RAG
      const sources = await this.retrieveContext(companyId, request);

      logger.debug('RAG context retrieved for streaming', {
        companyId,
        sourcesCount: sources.length,
        duration: Date.now() - startTime,
      });

      // 2. Send sources event first if requested
      if (request.includeSources && sources.length > 0) {
        this.sendSSE(res, { type: 'sources', data: { sources } });
      }

      // 3. Build the context and messages
      const context = this.buildContextString(sources);
      const systemPrompt = this.resolveSystemPrompt(request);
      const messages = this.buildMessages(systemPrompt, context, request.query, request.messages);

      // 4. Stream from the appropriate LLM
      if (provider === 'gemini') {
        await this.streamGemini(messages, request, res);
      } else {
        await this.streamOpenAI(messages, request, res);
      }

      logger.info('Streaming chat request completed', {
        companyId,
        provider,
        sourcesCount: sources.length,
        totalDuration: Date.now() - startTime,
      });
    } catch (error) {
      logger.error('Streaming chat request failed', {
        companyId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Send error event
      this.sendSSE(res, {
        type: 'error',
        data: { message: error instanceof Error ? error.message : 'Chat request failed' },
      });
    } finally {
      res.end();
    }
  }

  /**
   * Send SSE event to client
   */
  private static sendSSE(res: Response, event: StreamEvent): void {
    res.write(`event: ${event.type}\n`);
    res.write(`data: ${JSON.stringify(event.data)}\n\n`);
  }

  /**
   * Stream response from OpenAI
   */
  private static async streamOpenAI(
    messages: ChatMessage[],
    request: ChatRequest,
    res: Response
  ): Promise<void> {
    const client = this.getOpenAIClient();
    const model = CONFIG.OPENAI_CHAT_MODEL;

    const stream = await client.chat.completions.create({
      model,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      max_tokens: request.maxTokens || CONFIG.CHAT_MAX_TOKENS,
      temperature: request.temperature ?? CONFIG.CHAT_TEMPERATURE,
      stream: true,
      stream_options: { include_usage: true }, // Enable usage stats in streaming
    });

    let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        this.sendSSE(res, { type: 'token', data: { token: content } });
      }

      // Track usage from final chunk (sent when include_usage is true)
      if (chunk.usage) {
        usage = {
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens,
        };
      }
    }

    // Send done event
    this.sendSSE(res, {
      type: 'done',
      data: {
        model,
        provider: 'openai',
        usage,
      },
    });
  }

  /**
   * Stream response from Gemini
   */
  private static async streamGemini(
    messages: ChatMessage[],
    request: ChatRequest,
    res: Response
  ): Promise<void> {
    const client = this.getGeminiClient();
    const model = CONFIG.GEMINI_CHAT_MODEL;
    const genModel = client.getGenerativeModel({
      model,
      generationConfig: {
        maxOutputTokens: request.maxTokens || CONFIG.CHAT_MAX_TOKENS,
        temperature: request.temperature ?? CONFIG.CHAT_TEMPERATURE,
      },
    });

    // Extract system instruction and convert messages to Gemini format
    const systemMessage = messages.find((m) => m.role === 'system');
    const chatMessages = messages.filter((m) => m.role !== 'system');

    // Validate we have at least one message to send
    if (chatMessages.length === 0) {
      throw new ExternalServiceError('Gemini', 'No user message provided');
    }

    // Build Gemini content format
    const contents: Content[] = chatMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Start chat with system instruction
    const chat = genModel.startChat({
      history: contents.slice(0, -1),
      systemInstruction: systemMessage ? systemMessage.content : undefined,
    });

    // Send the last user message with streaming
    const lastMessage = contents[contents.length - 1];
    const lastMessageText = lastMessage?.parts[0]?.text;
    if (!lastMessageText) {
      throw new ExternalServiceError('Gemini', 'Empty message content');
    }
    const result = await chat.sendMessageStream(lastMessageText);

    let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined;

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        this.sendSSE(res, { type: 'token', data: { token: text } });
      }

      // Track usage from chunks
      if (chunk.usageMetadata) {
        usage = {
          promptTokens: chunk.usageMetadata.promptTokenCount || 0,
          completionTokens: chunk.usageMetadata.candidatesTokenCount || 0,
          totalTokens: chunk.usageMetadata.totalTokenCount || 0,
        };
      }
    }

    // Send done event
    this.sendSSE(res, {
      type: 'done',
      data: {
        model,
        provider: 'gemini',
        usage,
      },
    });
  }

  /**
   * Retrieve relevant context using RAG with multi-layer security
   *
   * Security layers:
   * 1. Collection scoping: company_${companyId}
   * 2. Project ownership validation
   * 3. Qdrant filter: companyId + fileId (defense-in-depth)
   *
   * @param companyId - Authenticated company ID
   * @param request - Chat request with required projectId
   * @returns Array of relevant document chunks with metadata
   * @private
   */
  private static async retrieveContext(
    companyId: string,
    request: ChatRequest
  ): Promise<ChatSource[]> {
    const collection = `company_${companyId}`;

    // projectId is required - verify it belongs to this company
    const project = await projectRepository.findById(request.projectId);
    if (!project) {
      logger.warn('Project not found for chat', {
        projectId: request.projectId,
        companyId,
      });
      return [];
    }

    if (String(project.companyId) !== companyId) {
      logger.warn('Project does not belong to company', {
        projectId: request.projectId,
        projectCompanyId: project.companyId,
        requestedCompanyId: companyId,
      });
      return []; // Return empty instead of throwing to avoid leaking info
    }

    // Get all files from the project
    const projectFiles = await fileMetadataRepository.findByProjectId(request.projectId);
    let allowedFileIds = projectFiles.map((f) => f._id);

    if (allowedFileIds.length === 0) {
      logger.debug('No files found for project', { projectId: request.projectId });
      return [];
    }

    logger.debug('Filtering by project files', {
      projectId: request.projectId,
      fileCount: allowedFileIds.length,
    });

    // Apply additional filters if specified
    if (request.filter) {
      // Handle fileId filter - intersect with project files
      if (request.filter.fileId) {
        if (!allowedFileIds.includes(request.filter.fileId)) {
          logger.debug('FileId not in project, returning empty', {
            fileId: request.filter.fileId,
            projectId: request.projectId,
          });
          return [];
        }
        allowedFileIds = [request.filter.fileId];
      }

      // Handle fileIds filter - intersect with project files
      if (request.filter.fileIds && request.filter.fileIds.length > 0) {
        const fileIdsSet = new Set(request.filter.fileIds);
        allowedFileIds = allowedFileIds.filter((id) => fileIdsSet.has(id));
        if (allowedFileIds.length === 0) {
          logger.debug('No intersection between fileIds and project files', {
            projectId: request.projectId,
          });
          return [];
        }
      }
    }

    // Build the Qdrant filter with defense-in-depth companyId check
    const qdrantFilter: QdrantFilter = {
      must: [
        {
          key: 'companyId',
          match: { value: companyId },
        },
        {
          key: 'fileId',
          match:
            allowedFileIds.length === 1 ? { value: allowedFileIds[0] } : { any: allowedFileIds },
        },
      ],
    };

    // Perform search
    let results: SearchResult[];
    const embeddingProvider = request.embeddingProvider as EmbeddingProvider | undefined;

    if (request.rerank) {
      results = await VectorService.searchWithReranking(
        collection,
        request.query,
        request.limit,
        qdrantFilter,
        Math.max(20, request.limit * 2), // Fetch more for reranking
        embeddingProvider
      );
    } else {
      const [queryVector] = await VectorService.getEmbeddings(
        [request.query],
        'query',
        embeddingProvider
      );
      results = await VectorService.search(collection, queryVector, request.limit, qdrantFilter);
    }

    if (results.length === 0) {
      return [];
    }

    // Enrich with metadata
    const sources = await this.enrichSources(results);

    // Sort chunks for coherent context:
    // 1. Group by file
    // 2. Within each file, sort by chunk index
    // 3. Order files by highest scoring chunk
    const enrichedSources = this.arrangeChunks(sources);

    return enrichedSources;
  }

  /**
   * Enrich search results with file and project metadata
   */
  private static async enrichSources(results: SearchResult[]): Promise<ChatSource[]> {
    const sources: ChatSource[] = [];

    // Collect unique file IDs
    const fileIds = [
      ...new Set(
        results
          .map((r) => (r.payload as SearchResultPayload | null)?.fileId)
          .filter((id): id is string => !!id)
      ),
    ];

    if (fileIds.length === 0) {
      return sources;
    }

    // Fetch file metadata
    const files = await fileMetadataRepository.findByIds(fileIds);
    const fileMap = new Map(files.map((f) => [f._id, f]));

    // Fetch project metadata
    const projectIds = [
      ...new Set(files.map((f) => f.projectId).filter((id): id is string => !!id)),
    ];
    const projects = await projectRepository.findByIds(projectIds);
    const projectMap = new Map(projects.map((p) => [p._id, p]));

    // Build sources
    for (const result of results) {
      const payload = result.payload as SearchResultPayload | null;
      if (!payload?.fileId) continue;

      const file = fileMap.get(payload.fileId);
      if (!file) continue; // Skip orphaned vectors

      const project = file.projectId ? projectMap.get(file.projectId) : null;

      sources.push({
        fileId: payload.fileId,
        fileName: file.originalFilename || file.filename,
        projectId: file.projectId || undefined,
        projectName: project?.name,
        chunkIndex: payload.chunkIndex,
        content: payload.content || payload.text_preview || '',
        score: result.score,
      });
    }

    return sources;
  }

  /**
   * Arrange chunks for coherent context
   * Groups by file and sorts by chunk index within each file
   * Orders files by their highest scoring chunk
   */
  private static arrangeChunks(sources: ChatSource[]): ChatSource[] {
    // Group by file
    const fileGroups = new Map<string, ChatSource[]>();
    const fileMaxScore = new Map<string, number>();

    for (const source of sources) {
      const chunks = fileGroups.get(source.fileId) || [];
      chunks.push(source);
      fileGroups.set(source.fileId, chunks);

      // Track max score per file
      const currentMax = fileMaxScore.get(source.fileId) || 0;
      if (source.score > currentMax) {
        fileMaxScore.set(source.fileId, source.score);
      }
    }

    // Sort chunks within each file by chunk index
    for (const chunks of fileGroups.values()) {
      chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
    }

    // Order files by their max score (highest first)
    const sortedFileIds = [...fileGroups.keys()].sort((a, b) => {
      return (fileMaxScore.get(b) || 0) - (fileMaxScore.get(a) || 0);
    });

    // Flatten back to array
    const arranged: ChatSource[] = [];
    for (const fileId of sortedFileIds) {
      const chunks = fileGroups.get(fileId) || [];
      arranged.push(...chunks);
    }

    return arranged;
  }

  // Maximum context size in characters (roughly 32k tokens for most models)
  // This leaves room for system prompt and response
  private static readonly MAX_CONTEXT_CHARS = 100000;

  /**
   * Build context string from sources with size limit
   */
  private static buildContextString(sources: ChatSource[]): string {
    if (sources.length === 0) {
      return 'No relevant context found.';
    }

    const contextParts: string[] = [];
    let currentFile = '';
    let totalChars = 0;
    let truncated = false;

    for (const source of sources) {
      // Check if adding this chunk would exceed the limit
      const chunkSize = source.content.length + 100; // +100 for header overhead
      if (totalChars + chunkSize > this.MAX_CONTEXT_CHARS) {
        truncated = true;
        logger.warn('Context truncated due to size limit', {
          maxChars: this.MAX_CONTEXT_CHARS,
          totalChars,
          sourcesIncluded: contextParts.length,
          sourcesTotal: sources.length,
        });
        break;
      }

      // Add file header when switching files
      if (source.fileId !== currentFile) {
        currentFile = source.fileId;
        const fileLabel = source.fileName || source.fileId;
        const projectLabel = source.projectName ? ` (Project: ${source.projectName})` : '';
        const header = `\n--- Document: ${fileLabel}${projectLabel} ---\n`;
        contextParts.push(header);
        totalChars += header.length;
      }

      // Add chunk content
      contextParts.push(source.content);
      totalChars += source.content.length + 1; // +1 for newline in join
    }

    if (truncated) {
      contextParts.push('\n[Context truncated due to size limits]');
    }

    return contextParts.join('\n');
  }

  /**
   * Map prompt template types to template keys
   */
  private static readonly TEMPLATE_MAP: Record<PromptTemplateType, keyof typeof PROMPT_TEMPLATES> =
    {
      customer_support: 'CUSTOMER_SUPPORT',
      sales_assistant: 'SALES_ASSISTANT',
      technical_support: 'TECHNICAL_SUPPORT',
      onboarding_assistant: 'ONBOARDING_ASSISTANT',
      faq_concise: 'FAQ_CONCISE',
      ecommerce_assistant: 'ECOMMERCE_ASSISTANT',
    };

  /**
   * Resolve the system prompt from request options
   * Priority: systemPrompt > promptTemplate > default
   */
  private static resolveSystemPrompt(request: ChatRequest): string {
    // Custom system prompt takes highest priority
    if (request.systemPrompt) {
      return request.systemPrompt;
    }

    // Check for template selection
    if (request.promptTemplate) {
      const templateKey = this.TEMPLATE_MAP[request.promptTemplate];
      if (templateKey && PROMPT_TEMPLATES[templateKey]) {
        return PROMPT_TEMPLATES[templateKey];
      }
    }

    // Fall back to default
    return this.getDefaultSystemPrompt();
  }

  /**
   * Get default system prompt for RAG
   * Optimized for customer service chatbot with lead generation capabilities
   */
  private static getDefaultSystemPrompt(): string {
    return `You are an expert AI customer support assistant. Your role is to provide helpful, accurate, and friendly responses to visitors based on the company's knowledge base.

## Core Principles

1. **Knowledge-Based Responses**: Answer questions using ONLY the information from the provided context. Never fabricate or assume information not present in the context.

2. **Transparency**: If the context doesn't contain sufficient information to fully answer a question:
   - Clearly state what you don't know
   - Offer to help with related topics you can address
   - Suggest the user contact human support for complex or missing information

3. **Professional & Friendly Tone**: 
   - Be warm, approachable, and professional
   - Use clear, concise language
   - Adapt your communication style to match the user's tone

4. **Source Attribution**: When referencing specific information, indicate which document or section it comes from.

## Response Guidelines

- **Be Concise**: Provide direct answers first, then elaborate if needed
- **Use Formatting**: Structure responses with bullet points, numbered lists, or headers when it improves clarity
- **Stay On Topic**: Focus on what the user is asking; avoid tangential information
- **Multilingual Support**: Respond in the same language the user writes in
- **No Hallucination**: If you're uncertain, say so rather than guessing

## Handling Edge Cases

- **Out of Scope Questions**: Politely redirect to relevant topics or suggest contacting human support
- **Technical Issues**: Acknowledge the issue and suggest appropriate next steps
- **Escalation Triggers**: If a user expresses frustration, requests human assistance, or has complex issues requiring human judgment, acknowledge this and offer to connect them with a human agent

## Lead Qualification (When Appropriate)

If a user shows buying intent or needs personalized assistance:
- Offer to collect their contact information for follow-up
- Explain the benefit of connecting with the team
- Keep it natural and non-pushy

Remember: You represent the company. Every interaction should leave the user feeling helped and valued.`;
  }

  /**
   * Build messages array for LLM
   */
  private static buildMessages(
    systemPrompt: string,
    context: string,
    query: string,
    history?: ChatMessage[]
  ): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // System message with context
    const systemContent = `${systemPrompt}

## Context:
${context}`;

    messages.push({
      role: 'system',
      content: systemContent,
    });

    // Add conversation history if provided
    if (history && history.length > 0) {
      messages.push(...history);
    }

    // Add current query
    messages.push({
      role: 'user',
      content: query,
    });

    return messages;
  }

  /**
   * Call OpenAI Chat API
   */
  private static async callOpenAI(
    messages: ChatMessage[],
    request: ChatRequest
  ): Promise<ChatResponse> {
    try {
      const client = this.getOpenAIClient();
      const model = CONFIG.OPENAI_CHAT_MODEL;

      const response = await client.chat.completions.create({
        model,
        messages: messages.map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        })),
        max_tokens: request.maxTokens || CONFIG.CHAT_MAX_TOKENS,
        temperature: request.temperature ?? CONFIG.CHAT_TEMPERATURE,
      });

      const answer = response.choices[0]?.message?.content || '';

      return {
        answer,
        sources: [],
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens,
              completionTokens: response.usage.completion_tokens,
              totalTokens: response.usage.total_tokens,
            }
          : undefined,
        model,
        provider: 'openai',
      };
    } catch (error) {
      logger.error('OpenAI chat request failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new ExternalServiceError('OpenAI', 'Invalid or missing API key');
        }
        if (error.message.includes('rate limit')) {
          throw new ExternalServiceError('OpenAI', 'Rate limit exceeded');
        }
      }

      throw new ExternalServiceError(
        'OpenAI',
        error instanceof Error ? error.message : 'Chat request failed'
      );
    }
  }

  /**
   * Call Gemini Chat API
   */
  private static async callGemini(
    messages: ChatMessage[],
    request: ChatRequest
  ): Promise<ChatResponse> {
    try {
      const client = this.getGeminiClient();
      const model = CONFIG.GEMINI_CHAT_MODEL;
      const genModel = client.getGenerativeModel({
        model,
        generationConfig: {
          maxOutputTokens: request.maxTokens || CONFIG.CHAT_MAX_TOKENS,
          temperature: request.temperature ?? CONFIG.CHAT_TEMPERATURE,
        },
      });

      // Extract system instruction and convert messages to Gemini format
      const systemMessage = messages.find((m) => m.role === 'system');
      const chatMessages = messages.filter((m) => m.role !== 'system');

      // Validate we have at least one message to send
      if (chatMessages.length === 0) {
        throw new ExternalServiceError('Gemini', 'No user message provided');
      }

      // Build Gemini content format
      const contents: Content[] = chatMessages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      // Start chat with system instruction
      const chat = genModel.startChat({
        history: contents.slice(0, -1), // All but the last message
        systemInstruction: systemMessage ? systemMessage.content : undefined,
      });

      // Send the last user message
      const lastMessage = contents[contents.length - 1];
      const lastMessageText = lastMessage?.parts[0]?.text;
      if (!lastMessageText) {
        throw new ExternalServiceError('Gemini', 'Empty message content');
      }
      const result = await chat.sendMessage(lastMessageText);
      const response = result.response;
      const answer = response.text();

      // Gemini doesn't provide detailed token usage in the same way
      const usage = response.usageMetadata
        ? {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
          }
        : undefined;

      return {
        answer,
        sources: [],
        usage,
        model,
        provider: 'gemini',
      };
    } catch (error) {
      logger.error('Gemini chat request failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          throw new ExternalServiceError('Gemini', 'Invalid or missing API key');
        }
        if (error.message.includes('quota')) {
          throw new ExternalServiceError('Gemini', 'API quota exceeded');
        }
      }

      throw new ExternalServiceError(
        'Gemini',
        error instanceof Error ? error.message : 'Chat request failed'
      );
    }
  }
}
