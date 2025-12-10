import { Router } from 'express';
import { chat } from '../controllers/chat.controller';
import { searchLimiter } from '../middleware/rate-limiter.middleware';

const router = Router({ mergeParams: true });

/**
 * POST /v1/companies/:companyId/chat
 *
 * RAG-powered chat endpoint.
 * Retrieves relevant context from vector store and generates an answer using LLM.
 *
 * Request body:
 * - query: string (required) - The user's question
 * - messages: ChatMessage[] (optional) - Conversation history
 * - systemPrompt: string (optional) - Custom system prompt
 * - limit: number (optional, default: 5) - Number of context chunks to retrieve
 * - rerank: boolean (optional, default: true) - Whether to rerank results
 * - filter: object (optional) - Filter by fileId, fileIds, or projectId
 * - llmProvider: 'openai' | 'gemini' (optional) - LLM provider to use
 * - embeddingProvider: 'inhouse' | 'openai' | 'gemini' (optional) - Embedding provider for RAG
 * - maxTokens: number (optional) - Max tokens for response
 * - temperature: number (optional) - LLM temperature
 * - includeSources: boolean (optional, default: true) - Include source documents in response
 *
 * Response:
 * - answer: string - The generated answer
 * - sources: ChatSource[] - Source documents used for context
 * - usage: object - Token usage statistics
 * - model: string - Model used
 * - provider: string - Provider used
 */
router.post('/', searchLimiter, chat);

export default router;
