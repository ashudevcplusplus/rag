describe('indexingQueue (queue.client)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should construct the BullMQ Queue with expected name and connection', () => {
    const bullmq = require('bullmq');

    // Import after mocks are applied via global test setup
    const { indexingQueue } = require('../../../src/queue/queue.client');

    expect(indexingQueue).toBeDefined();
    expect(bullmq.Queue).toHaveBeenCalledWith('indexing-queue', {
      connection: { host: 'localhost', port: 6379 },
    });
  });
});

