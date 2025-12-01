// Global mocks for external services that shouldn't connect in test environment
// This prevents Redis connections during tests
// Note: Integration tests need real MongoDB but don't need Redis, so Redis mocks are safe

// Mock BullMQ Queue to prevent Redis connections
// This must be done before any module imports queue.client.ts
jest.mock('bullmq', () => {
  const mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    getJob: jest.fn(),
    getJobs: jest.fn().mockResolvedValue([]),
    getWaiting: jest.fn().mockResolvedValue([]),
    getActive: jest.fn().mockResolvedValue([]),
    getCompleted: jest.fn().mockResolvedValue([]),
    getFailed: jest.fn().mockResolvedValue([]),
    getDelayed: jest.fn().mockResolvedValue([]),
    pause: jest.fn(),
    resume: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
  };

  // Return a constructor that doesn't attempt any connections
  const MockQueue = jest.fn().mockImplementation(() => {
    // Return the mock queue instance without attempting any Redis connection
    return mockQueue;
  });

  // Preserve the Queue class for instanceof checks if needed
  MockQueue.prototype = mockQueue;

  return {
    Queue: MockQueue,
    Worker: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    })),
  };
});

// Mock ioredis to prevent Redis connections (if not already mocked in specific tests)
// This prevents connection attempts when BullMQ tries to create Redis connections
jest.mock('ioredis', () => {
  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(60),
    scanStream: jest.fn().mockReturnValue({
      on: jest.fn(),
      once: jest.fn(),
    }),
    info: jest.fn().mockResolvedValue('redis_version:7.0.0'),
    dbsize: jest.fn().mockResolvedValue(0),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    quit: jest.fn().mockResolvedValue('OK'),
    status: 'ready',
    readyState: 'ready',
  };

  // Return a constructor that doesn't attempt connections
  const MockRedis = jest.fn().mockImplementation(() => {
    // Don't attempt any actual connection
    return mockRedis;
  });

  // Prevent connection attempts by overriding connect method
  MockRedis.prototype = mockRedis;

  return MockRedis;
});
