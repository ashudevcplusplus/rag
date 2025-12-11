jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('mongoose', () => {
  const connect = jest.fn();
  const disconnect = jest.fn();
  const connection = {
    host: 'localhost',
    name: 'test_db',
    readyState: 0,
    on: jest.fn(),
  };

  return {
    __esModule: true,
    default: {
      connect,
      disconnect,
      connection,
    },
    connect,
    disconnect,
    connection,
  };
});

describe('DatabaseConnection (database)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('connect() should no-op when already connected', async () => {
    const mongoose = require('mongoose');
    mongoose.connection.readyState = 1;
    mongoose.connect.mockResolvedValue(undefined);

    const { database } = require('../../../src/config/database');

    await database.connect();
    await database.connect();

    // First call connects, second should early-return
    expect(mongoose.connect).toHaveBeenCalledTimes(1);
  });

  it('connect() should retry and eventually succeed', async () => {
    const mongoose = require('mongoose');
    mongoose.connection.readyState = 0;
    mongoose.connect
      .mockRejectedValueOnce(new Error('fail-1'))
      .mockRejectedValueOnce(new Error('fail-2'))
      .mockResolvedValueOnce(undefined);

    const { database } = require('../../../src/config/database');

    const connectPromise = database.connect();

    // Two retries at 2s each
    await jest.advanceTimersByTimeAsync(2000);
    await jest.advanceTimersByTimeAsync(2000);

    await connectPromise;

    expect(mongoose.connect).toHaveBeenCalledTimes(3);
  });

  it('connect() should throw after max retries', async () => {
    const mongoose = require('mongoose');
    mongoose.connection.readyState = 0;
    mongoose.connect.mockRejectedValue(new Error('always-fails'));

    const { database } = require('../../../src/config/database');

    const connectPromise = database.connect();
    // Attach rejection handler immediately to avoid unhandled-rejection flakiness
    const assertion = expect(connectPromise).rejects.toBeDefined();

    // 4 waits between 5 attempts
    await jest.advanceTimersByTimeAsync(2000 * 4);

    await assertion;
    expect(mongoose.connect).toHaveBeenCalledTimes(5);
  });

  it('disconnect() should not throw if mongoose.disconnect fails', async () => {
    const mongoose = require('mongoose');
    mongoose.connection.readyState = 1;
    mongoose.connect.mockResolvedValue(undefined);
    mongoose.disconnect.mockRejectedValue(new Error('disconnect-failed'));

    const { database } = require('../../../src/config/database');

    await database.connect();
    await expect(database.disconnect()).resolves.not.toThrow();
  });
});

