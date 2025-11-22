"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const logger_1 = require("../../../src/utils/logger");
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
        expect(logger_1.logger).toBeDefined();
        expect(logger_1.logger).toBeInstanceOf(winston_1.default.Logger);
    });
    it('should have correct service name in default meta', () => {
        expect(logger_1.logger.defaultMeta).toEqual({ service: 'api' });
    });
    it('should have console transport', () => {
        const transports = logger_1.logger.transports;
        const consoleTransport = transports.find((t) => t instanceof winston_1.default.transports.Console);
        expect(consoleTransport).toBeDefined();
    });
    it('should have file transports', () => {
        const transports = logger_1.logger.transports;
        const fileTransports = transports.filter((t) => t instanceof winston_1.default.transports.File);
        expect(fileTransports.length).toBeGreaterThan(0);
    });
    it('should log at different levels', () => {
        const spy = jest.spyOn(logger_1.logger, 'info');
        logger_1.logger.info('Test message');
        expect(spy).toHaveBeenCalledWith('Test message');
        spy.mockRestore();
    });
    describe('logStream', () => {
        it('should export logStream', () => {
            expect(logger_1.logStream).toBeDefined();
            expect(logger_1.logStream.write).toBeDefined();
            expect(typeof logger_1.logStream.write).toBe('function');
        });
        it('should write to logger when called', () => {
            const spy = jest.spyOn(logger_1.logger, 'info');
            logger_1.logStream.write('Test log message\n');
            expect(spy).toHaveBeenCalledWith('Test log message');
            spy.mockRestore();
        });
        it('should trim whitespace from messages', () => {
            const spy = jest.spyOn(logger_1.logger, 'info');
            logger_1.logStream.write('  Test message with spaces  \n');
            expect(spy).toHaveBeenCalledWith('Test message with spaces');
            spy.mockRestore();
        });
    });
});
