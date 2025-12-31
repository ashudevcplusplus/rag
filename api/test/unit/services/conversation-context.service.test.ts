import { ConversationContextService } from '../../../src/services/conversation-context.service';
import { CachedContext } from '../../../src/schemas/conversation.schema';
import { ChatSource } from '../../../src/schemas/chat.schema';

describe('ConversationContextService', () => {
  describe('createCachedContext', () => {
    it('should create cached context with expiration', () => {
      const sources: ChatSource[] = [
        {
          fileId: 'file1',
          fileName: 'test.txt',
          chunkIndex: 0,
          content: 'Test content',
          score: 0.95,
        },
      ];
      const query = 'What is the test content?';
      const contextString = 'Test content from file';

      const cached = ConversationContextService.createCachedContext(sources, query, contextString);

      expect(cached.sources).toEqual(sources);
      expect(cached.query).toBe(query);
      expect(cached.contextString).toBe(contextString);
      expect(cached.fileIds).toEqual(['file1']);
      expect(cached.retrievedAt).toBeInstanceOf(Date);
      expect(cached.expiresAt).toBeInstanceOf(Date);
      expect(cached.expiresAt.getTime()).toBeGreaterThan(cached.retrievedAt.getTime());
    });

    it('should extract unique file IDs from sources', () => {
      const sources: ChatSource[] = [
        {
          fileId: 'file1',
          chunkIndex: 0,
          content: 'Content 1',
          score: 0.95,
        },
        {
          fileId: 'file1',
          chunkIndex: 1,
          content: 'Content 2',
          score: 0.9,
        },
        {
          fileId: 'file2',
          chunkIndex: 0,
          content: 'Content 3',
          score: 0.85,
        },
      ];

      const cached = ConversationContextService.createCachedContext(
        sources,
        'test query',
        'context'
      );

      expect(cached.fileIds).toHaveLength(2);
      expect(cached.fileIds).toContain('file1');
      expect(cached.fileIds).toContain('file2');
    });
  });

  describe('shouldInvalidateCache', () => {
    it('should invalidate cache if cached files are no longer available', () => {
      const cachedContext: CachedContext = {
        sources: [],
        query: 'test',
        contextString: 'context',
        retrievedAt: new Date(),
        expiresAt: new Date(Date.now() + 300000),
        fileIds: ['file1', 'file2'],
      };

      const availableFileIds = ['file1']; // file2 is missing

      const shouldInvalidate = ConversationContextService.shouldInvalidateCache(
        cachedContext,
        availableFileIds
      );

      expect(shouldInvalidate).toBe(true);
    });

    it('should not invalidate cache if all cached files are still available', () => {
      const cachedContext: CachedContext = {
        sources: [],
        query: 'test',
        contextString: 'context',
        retrievedAt: new Date(),
        expiresAt: new Date(Date.now() + 300000),
        fileIds: ['file1', 'file2'],
      };

      const availableFileIds = ['file1', 'file2', 'file3']; // All cached files present

      const shouldInvalidate = ConversationContextService.shouldInvalidateCache(
        cachedContext,
        availableFileIds
      );

      expect(shouldInvalidate).toBe(false);
    });
  });

  describe('shouldUseCache', () => {
    it('should not use cache if no cached context exists', async () => {
      const decision = await ConversationContextService.shouldUseCache(
        'What is X?',
        undefined,
        undefined,
        []
      );

      expect(decision.useCache).toBe(false);
      expect(decision.reason).toContain('No cached context');
    });

    it('should not use cache if cached context is expired', async () => {
      const expiredContext: CachedContext = {
        sources: [],
        query: 'previous query',
        contextString: 'context',
        retrievedAt: new Date(Date.now() - 600000), // 10 minutes ago
        expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
        fileIds: ['file1'],
      };

      const decision = await ConversationContextService.shouldUseCache(
        'What is Y?',
        expiredContext,
        undefined,
        []
      );

      expect(decision.useCache).toBe(false);
      expect(decision.reason).toContain('expired');
      expect(decision.cacheExpired).toBe(true);
    });
  });
});
