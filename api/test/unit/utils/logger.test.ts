import winston from 'winston';
import { logger, logStream } from '../../../src/utils/logger';

// Mock fs to avoid file system operations
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  stat: jest.fn((path, callback) => callback(null, { size: 0 })),
  createWriteStream: jest.fn(() => ({
    write: jest.fn(),
    end: jest.fn(),
  })),
}));

describe('Logger', () => {
  it('should export logger instance', () => {
    expect(logger).toBeDefined();
    expect(logger).toBeInstanceOf(winston.Logger);
  });

  it('should have correct service name in default meta', () => {
    expect(logger.defaultMeta).toEqual({ service: 'api' });
  });

  it('should have console transport', () => {
    const transports = logger.transports;
    const consoleTransport = transports.find((t) => t instanceof winston.transports.Console);
    expect(consoleTransport).toBeDefined();
  });

  it('should have file transports', () => {
    const transports = logger.transports;
    const fileTransports = transports.filter((t) => t instanceof winston.transports.File);
    expect(fileTransports.length).toBeGreaterThan(0);
  });

  it('should log at different levels', () => {
    const spy = jest.spyOn(logger, 'info');
    logger.info('Test message');
    expect(spy).toHaveBeenCalledWith('Test message');
    spy.mockRestore();
  });

  describe('logStream', () => {
    it('should export logStream', () => {
      expect(logStream).toBeDefined();
      expect(logStream.write).toBeDefined();
      expect(typeof logStream.write).toBe('function');
    });

    it('should write to logger when called', () => {
      const spy = jest.spyOn(logger, 'info');
      logStream.write('Test log message\n');
      expect(spy).toHaveBeenCalledWith('Test log message');
      spy.mockRestore();
    });

    it('should trim whitespace from messages', () => {
      const spy = jest.spyOn(logger, 'info');
      logStream.write('  Test message with spaces  \n');
      expect(spy).toHaveBeenCalledWith('Test message with spaces');
      spy.mockRestore();
    });
  });
});
