import { Router } from 'express';
import { chatV2, chatV2Stream } from '../controllers/chat-v2.controller';
import { searchLimiter } from '../middleware/rate-limiter.middleware';

const router = Router({ mergeParams: true });

/**
 * POST /v1/companies/:companyId/chat/v2
 *
 * ChatV2 - Enhanced RAG-powered chat endpoint with advanced features.
 *
 * New Features over V1:
 * - Multiple search modes for different use cases
 * - Response format options
 * - Query analysis and reasoning
 * - Suggested follow-up questions
 * - Confidence scoring
 * - Enhanced filtering options
 *
 * Request body:
 * - query: string (required) - The user's question
 * - projectId: string (required) - Project ID to search within
 * - messages: ChatMessage[] (optional) - Conversation history
 *
 * Search Mode:
 * - searchMode: 'smart' | 'fast' | 'deep' (default: 'smart')
 *   - 'smart': Multi-query search with RRF fusion and reranking (balanced)
 *   - 'fast': Single query, no reranking (lowest latency)
 *   - 'deep': Maximum retrieval with extensive context (highest quality)
 *
 * Response Format:
 * - responseFormat: 'text' | 'markdown' | 'structured' (default: 'markdown')
 *
 * Advanced Options:
 * - includeReasoning: boolean (default: false) - Include thinking process
 * - language: string (optional) - ISO 639-1 language code for response
 * - maxCitations: number (default: 5, max: 20) - Max sources to cite
 * - expandContext: boolean (default: true) - Enable context expansion
 * - includeMetadata: boolean (default: false) - Include detailed metadata
 *
 * System Prompt Options:
 * - promptTemplate: string (optional) - Predefined prompt template:
 *     - 'customer_support', 'sales_assistant', 'technical_support'
 *     - 'onboarding_assistant', 'faq_concise', 'ecommerce_assistant'
 *     - 'research_assistant', 'code_assistant'
 * - systemPrompt: string (optional) - Custom system prompt
 *
 * RAG Settings:
 * - limit: number (default: 10, max: 50) - Context chunks to retrieve
 * - rerank: boolean (default: true) - Rerank results
 * - filter: object (optional) - Additional filters within the project:
 *     - fileId: string - Filter to specific file
 *     - fileIds: string[] - Filter to specific files
 *     - tags: string[] - Filter by file tags
 * - embeddingProvider: 'openai' | 'gemini' (optional)
 *
 * LLM Settings:
 * - llmProvider: 'openai' | 'gemini' (optional)
 * - maxTokens: number (default: varies, max: 8192)
 * - temperature: number (0-2)
 *
 * Response Settings:
 * - includeSources: boolean (default: true)
 * - stream: boolean (default: false)
 *
 * Response (non-streaming):
 * {
 *   answer: string,
 *   sources: ChatV2Source[],
 *   queryAnalysis?: QueryAnalysis,
 *   reasoning?: string,
 *   suggestedFollowUps?: string[],
 *   confidence?: number,
 *   responseFormat: string,
 *   usage: { promptTokens, completionTokens, totalTokens },
 *   model: string,
 *   provider: string,
 *   searchMode: string,
 *   processingTime?: number (ms)
 * }
 *
 * Example Usage:
 * ```javascript
 * // Smart mode (default) - balanced performance
 * POST /v1/companies/:companyId/chat/v2
 * {
 *   "query": "What is the refund policy?",
 *   "projectId": "proj_123abc"
 * }
 *
 * // Fast mode - lowest latency
 * POST /v1/companies/:companyId/chat/v2
 * {
 *   "query": "Quick question?",
 *   "projectId": "proj_123abc",
 *   "searchMode": "fast"
 * }
 *
 * // Deep mode - highest quality for complex questions
 * POST /v1/companies/:companyId/chat/v2
 * {
 *   "query": "Compare all security features across products",
 *   "projectId": "proj_123abc",
 *   "searchMode": "deep",
 *   "includeReasoning": true,
 *   "includeMetadata": true
 * }
 * ```
 */
router.post('/', searchLimiter, chatV2);

/**
 * POST /v1/companies/:companyId/chat/v2/stream
 *
 * Dedicated streaming endpoint for ChatV2.
 * Always returns SSE stream regardless of the `stream` parameter.
 *
 * Request body:
 * - query: string (required) - The user's question
 * - projectId: string (required) - Project ID to search within
 * - (other options same as /chat/v2)
 *
 * SSE Events:
 * - analysis: Query analysis results
 * - sources: Retrieved context chunks
 * - reasoning: Thinking process (if enabled)
 * - token: Each generated token
 * - followups: Suggested follow-up questions
 * - done: Completion with stats
 * - error: Error occurred
 *
 * Example client usage:
 * ```javascript
 * const response = await fetch('/v1/companies/:companyId/chat/v2/stream', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     query: 'What is RAG?',
 *     projectId: 'proj_123abc',
 *     searchMode: 'smart'
 *   })
 * });
 *
 * const reader = response.body.getReader();
 * const decoder = new TextDecoder();
 *
 * while (true) {
 *   const { value, done } = await reader.read();
 *   if (done) break;
 *
 *   const chunk = decoder.decode(value);
 *   // Parse SSE events
 *   for (const line of chunk.split('\n')) {
 *     if (line.startsWith('data: ')) {
 *       const data = JSON.parse(line.slice(6));
 *       console.log(data);
 *     }
 *   }
 * }
 * ```
 */
router.post('/stream', searchLimiter, chatV2Stream);

export default router;
