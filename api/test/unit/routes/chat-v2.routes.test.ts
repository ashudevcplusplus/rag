import express from 'express';
import request from 'supertest';

jest.mock('../../../src/controllers/chat-v2.controller', () => {
  const handler =
    (name: string, status = 200) =>
    (req: any, res: any): void => {
      res.status(status).json({
        handler: name,
        companyId: req.params.companyId,
        query: req.body?.query,
        projectId: req.body?.projectId,
        searchMode: req.body?.searchMode,
        stream: req.body?.stream,
      });
    };

  return {
    chatV2: handler('chatV2', 200),
    chatV2Stream: handler('chatV2Stream', 200),
  };
});

jest.mock('../../../src/middleware/rate-limiter.middleware', () => ({
  searchLimiter: (req: any, res: any, next: any) => {
    res.setHeader('X-Rate-Limited', 'true');
    next();
  },
}));

import chatV2Routes from '../../../src/routes/chat-v2.routes';

describe('chat-v2.routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/v1/companies/:companyId/chat/v2', chatV2Routes);
  });

  describe('POST /v1/companies/:companyId/chat/v2', () => {
    it('should handle chat v2 requests', async () => {
      const response = await request(app)
        .post('/v1/companies/company-123/chat/v2')
        .send({
          query: 'What is the refund policy?',
          projectId: 'project-456',
          searchMode: 'smart',
          responseFormat: 'markdown',
        })
        .expect(200);

      expect(response.body).toEqual({
        handler: 'chatV2',
        companyId: 'company-123',
        query: 'What is the refund policy?',
        projectId: 'project-456',
        searchMode: 'smart',
        stream: undefined,
      });
      expect(response.headers['x-rate-limited']).toBe('true');
    });

    it('should handle requests with various search modes', async () => {
      const searchModes = ['smart', 'fast', 'deep'];

      for (const mode of searchModes) {
        const response = await request(app)
          .post('/v1/companies/company-123/chat/v2')
          .send({
            query: 'Test query',
            projectId: 'project-456',
            searchMode: mode,
          })
          .expect(200);

        expect(response.body.searchMode).toBe(mode);
      }
    });

    it('should handle requests with different response formats', async () => {
      const responseFormats = ['text', 'markdown', 'structured'];

      for (const format of responseFormats) {
        const response = await request(app)
          .post('/v1/companies/company-123/chat/v2')
          .send({
            query: 'Test query',
            projectId: 'project-456',
            responseFormat: format,
          })
          .expect(200);

        expect(response.body.query).toBe('Test query');
      }
    });

    it('should handle requests with optional parameters', async () => {
      const response = await request(app)
        .post('/v1/companies/company-123/chat/v2')
        .send({
          query: 'Complex query with many options',
          projectId: 'project-456',
          searchMode: 'deep',
          responseFormat: 'structured',
          includeReasoning: true,
          includeMetadata: true,
          language: 'en',
          maxCitations: 10,
          expandContext: false,
          promptTemplate: 'technical_support',
          systemPrompt: 'Custom system prompt',
          limit: 25,
          rerank: false,
          filter: {
            fileId: 'specific-file-id',
            tags: ['important', 'policy'],
          },
          embeddingProvider: 'openai',
          llmProvider: 'openai',
          maxTokens: 1000,
          temperature: 0.7,
          includeSources: true,
        })
        .expect(200);

      expect(response.body.handler).toBe('chatV2');
      expect(response.body.companyId).toBe('company-123');
      expect(response.body.query).toBe('Complex query with many options');
    });

    it('should handle streaming requests', async () => {
      const response = await request(app)
        .post('/v1/companies/company-123/chat/v2')
        .send({
          query: 'Stream this response',
          projectId: 'project-456',
          stream: true,
        })
        .expect(200);

      expect(response.body.stream).toBe(true);
      expect(response.body.handler).toBe('chatV2');
    });

    it('should handle conversation history', async () => {
      const response = await request(app)
        .post('/v1/companies/company-123/chat/v2')
        .send({
          query: 'Follow-up question',
          projectId: 'project-456',
          messages: [
            { role: 'user', content: 'What is RAG?' },
            { role: 'assistant', content: 'RAG stands for Retrieval-Augmented Generation...' },
          ],
          conversationId: 'conv-123',
        })
        .expect(200);

      expect(response.body.query).toBe('Follow-up question');
      expect(response.body.handler).toBe('chatV2');
    });

    it('should apply rate limiting to all requests', async () => {
      const response = await request(app)
        .post('/v1/companies/company-123/chat/v2')
        .send({
          query: 'Test query',
          projectId: 'project-456',
        })
        .expect(200);

      expect(response.headers['x-rate-limited']).toBe('true');
    });

    it('should handle empty request bodies gracefully', async () => {
      const response = await request(app)
        .post('/v1/companies/company-123/chat/v2')
        .send({})
        .expect(200);

      expect(response.body.companyId).toBe('company-123');
      expect(response.body.query).toBeUndefined();
    });

    it('should handle malformed JSON', async () => {
      // Express should handle malformed JSON before reaching our routes
      await request(app)
        .post('/v1/companies/company-123/chat/v2')
        .set('Content-Type', 'application/json')
        .send('{invalid json')
        .expect(400);
    });
  });

  describe('POST /v1/companies/:companyId/chat/v2/stream', () => {
    it('should handle streaming endpoint requests', async () => {
      const response = await request(app)
        .post('/v1/companies/company-456/chat/v2/stream')
        .send({
          query: 'Stream this important question',
          projectId: 'project-789',
          searchMode: 'deep',
          responseFormat: 'markdown',
          includeMetadata: true,
        })
        .expect(200);

      expect(response.body).toEqual({
        handler: 'chatV2Stream',
        companyId: 'company-456',
        query: 'Stream this important question',
        projectId: 'project-789',
        searchMode: 'deep',
        stream: undefined, // The controller forces stream: true
      });
      expect(response.headers['x-rate-limited']).toBe('true');
    });

    it('should apply rate limiting to streaming endpoint', async () => {
      const response = await request(app)
        .post('/v1/companies/company-123/chat/v2/stream')
        .send({
          query: 'Test streaming query',
          projectId: 'project-456',
        })
        .expect(200);

      expect(response.headers['x-rate-limited']).toBe('true');
    });

    it('should handle streaming with all optional parameters', async () => {
      const response = await request(app)
        .post('/v1/companies/company-123/chat/v2/stream')
        .send({
          query: 'Complex streaming query',
          projectId: 'project-456',
          searchMode: 'smart',
          responseFormat: 'structured',
          includeReasoning: true,
          includeMetadata: true,
          language: 'es',
          maxCitations: 15,
          expandContext: true,
          promptTemplate: 'customer_support',
          limit: 30,
          rerank: true,
          filter: {
            tags: ['faq', 'support'],
          },
          embeddingProvider: 'gemini',
          llmProvider: 'gemini',
          maxTokens: 2000,
          temperature: 0.8,
          includeSources: false,
        })
        .expect(200);

      expect(response.body.handler).toBe('chatV2Stream');
      expect(response.body.companyId).toBe('company-123');
      expect(response.body.query).toBe('Complex streaming query');
    });
  });

  describe('Route mounting and middleware', () => {
    it('should mount routes with correct path structure', async () => {
      // Test that routes are properly mounted under the company scope
      const response1 = await request(app)
        .post('/v1/companies/company-abc/chat/v2')
        .send({ query: 'test', projectId: 'project-123' })
        .expect(200);

      const response2 = await request(app)
        .post('/v1/companies/company-xyz/chat/v2/stream')
        .send({ query: 'test', projectId: 'project-456' })
        .expect(200);

      expect(response1.body.companyId).toBe('company-abc');
      expect(response2.body.companyId).toBe('company-xyz');
    });

    it('should require companyId parameter', async () => {
      // This should result in a 404 since the route requires companyId
      await request(app)
        .post('/v1/companies//chat/v2') // Empty companyId
        .send({ query: 'test', projectId: 'project-123' })
        .expect(404);
    });

    it('should handle different company IDs correctly', async () => {
      const companies = ['company-1', 'company-2', 'company-3'];

      for (const companyId of companies) {
        const response = await request(app)
          .post(`/v1/companies/${companyId}/chat/v2`)
          .send({ query: 'test', projectId: 'project-123' })
          .expect(200);

        expect(response.body.companyId).toBe(companyId);
      }
    });

    it('should handle URL-encoded company IDs', async () => {
      const companyId = 'company-with-special-chars@test.com';
      const response = await request(app)
        .post(`/v1/companies/${encodeURIComponent(companyId)}/chat/v2`)
        .send({ query: 'test', projectId: 'project-123' })
        .expect(200);

      expect(response.body.companyId).toBe(companyId);
    });
  });

  describe('HTTP methods and status codes', () => {
    it('should only accept POST method for chat endpoint', async () => {
      await request(app).get('/v1/companies/company-123/chat/v2').expect(404); // Express returns 404 for method not allowed

      await request(app).put('/v1/companies/company-123/chat/v2').expect(404);

      await request(app).delete('/v1/companies/company-123/chat/v2').expect(404);
    });

    it('should only accept POST method for stream endpoint', async () => {
      await request(app).get('/v1/companies/company-123/chat/v2/stream').expect(404);

      await request(app).put('/v1/companies/company-123/chat/v2/stream').expect(404);

      await request(app).delete('/v1/companies/company-123/chat/v2/stream').expect(404);
    });

    it('should return correct status codes', async () => {
      // Mock different status codes for testing
      const originalChatV2 = jest.requireMock('../../../src/controllers/chat-v2.controller').chatV2;
      const originalChatV2Stream = jest.requireMock(
        '../../../src/controllers/chat-v2.controller'
      ).chatV2Stream;

      // Test successful responses (200)
      await request(app)
        .post('/v1/companies/company-123/chat/v2')
        .send({ query: 'test', projectId: 'project-123' })
        .expect(200);

      await request(app)
        .post('/v1/companies/company-123/chat/v2/stream')
        .send({ query: 'test', projectId: 'project-123' })
        .expect(200);
    });
  });

  describe('Request body validation', () => {
    it('should handle large request bodies', async () => {
      const largeQuery = 'x'.repeat(10000); // 10KB query
      const response = await request(app)
        .post('/v1/companies/company-123/chat/v2')
        .send({
          query: largeQuery,
          projectId: 'project-456',
        })
        .expect(200);

      expect(response.body.query).toBe(largeQuery);
    });

    it('should handle special characters in query', async () => {
      const specialQuery = 'Query with spécial characters: àáâãäå, 中文, 🚀, 💡';
      const response = await request(app)
        .post('/v1/companies/company-123/chat/v2')
        .send({
          query: specialQuery,
          projectId: 'project-456',
        })
        .expect(200);

      expect(response.body.query).toBe(specialQuery);
    });

    it('should handle null and undefined values in request body', async () => {
      const response = await request(app)
        .post('/v1/companies/company-123/chat/v2')
        .send({
          query: 'Test query',
          projectId: 'project-456',
          searchMode: null,
          responseFormat: undefined,
          includeMetadata: null,
        })
        .expect(200);

      expect(response.body.query).toBe('Test query');
      expect(response.body.projectId).toBe('project-456');
    });
  });

  describe('Middleware integration', () => {
    it('should execute rate limiter middleware for all requests', async () => {
      const response1 = await request(app)
        .post('/v1/companies/company-123/chat/v2')
        .send({ query: 'test', projectId: 'project-123' })
        .expect(200);

      const response2 = await request(app)
        .post('/v1/companies/company-456/chat/v2/stream')
        .send({ query: 'test', projectId: 'project-456' })
        .expect(200);

      expect(response1.headers['x-rate-limited']).toBe('true');
      expect(response2.headers['x-rate-limited']).toBe('true');
    });

    it('should maintain middleware order', async () => {
      // The rate limiter should execute before the route handler
      // This is tested by checking that the X-Rate-Limited header is set
      // before the response is generated
      const response = await request(app)
        .post('/v1/companies/company-123/chat/v2')
        .send({ query: 'test', projectId: 'project-123' })
        .expect(200);

      expect(response.headers['x-rate-limited']).toBe('true');
      expect(response.body.handler).toBe('chatV2');
    });
  });
});
