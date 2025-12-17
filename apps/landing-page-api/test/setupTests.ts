// Global mocks for external services that shouldn't connect in test environment

// Mock mongoose to prevent database connections during unit tests
jest.mock('mongoose', () => {
  const mockModel = jest.fn();
  const mockSchema = jest.fn(() => ({
    index: jest.fn(),
  }));
  const mockConnection = {
    host: 'localhost',
    name: 'test_db',
    readyState: 1,
    on: jest.fn(),
  };

  return {
    Schema: mockSchema,
    model: jest.fn(() => mockModel),
    connect: jest.fn().mockResolvedValue(mockConnection),
    disconnect: jest.fn().mockResolvedValue(undefined),
    connection: mockConnection,
  };
});

// Mock winston logger
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

afterEach(() => {
  // Keep tests isolated
  jest.clearAllMocks();
});

