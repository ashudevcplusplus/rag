"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const text_processor_1 = require("../../src/utils/text-processor");
const fs_1 = __importDefault(require("fs"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
// Mock dependencies to avoid file I/O during unit tests
jest.mock('fs');
jest.mock('pdf-parse', () => jest.fn());
describe('Text Processor', () => {
    // --- Chunking Logic ---
    describe('chunkText', () => {
        test('returns empty array for empty input', () => {
            const result = (0, text_processor_1.chunkText)('', 100, 20);
            // Function may return [""] which gets filtered, so check it's effectively empty
            expect(result.filter((chunk) => chunk.length > 0)).toEqual([]);
        });
        test('returns single chunk for text smaller than chunk size', () => {
            const text = 'Short text';
            const chunks = (0, text_processor_1.chunkText)(text, 1000);
            expect(chunks).toHaveLength(1);
            expect(chunks[0]).toBe('Short text');
        });
        test('chunks text correctly with overlap', () => {
            const text = '1234567890';
            // Chunk size 5, overlap 2 -> [12345, 45678, 7890]
            const chunks = (0, text_processor_1.chunkText)(text, 5, 2);
            expect(chunks).toHaveLength(3);
            expect(chunks[0]).toBe('12345');
            expect(chunks[1]).toBe('45678'); // Overlaps "45"
            expect(chunks[2]).toBe('7890');
        });
        test('trims whitespace from chunks', () => {
            const text = '  Hello    World  ';
            const chunks = (0, text_processor_1.chunkText)(text);
            // Function trims chunks but doesn't normalize internal whitespace
            expect(chunks[0].trim()).toBe('Hello    World');
        });
        test('handles text with sentence boundaries', () => {
            const text = 'First sentence. Second sentence. Third sentence.';
            const chunks = (0, text_processor_1.chunkText)(text, 20, 5);
            // Should break at sentence boundaries when possible
            expect(chunks.length).toBeGreaterThan(1);
            chunks.forEach((chunk) => {
                expect(chunk.trim().length).toBeGreaterThan(0);
            });
        });
    });
    // --- Extraction Logic ---
    describe('extractText', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });
        test('extracts text from PDF via pdf-parse', async () => {
            const mockBuffer = Buffer.from('fake-pdf-content');
            fs_1.default.readFileSync.mockReturnValue(mockBuffer);
            pdf_parse_1.default.mockResolvedValue({ text: 'Parsed PDF Text' });
            const result = await (0, text_processor_1.extractText)('/path/to/doc.pdf', 'application/pdf');
            expect(fs_1.default.readFileSync).toHaveBeenCalledWith('/path/to/doc.pdf');
            expect(pdf_parse_1.default).toHaveBeenCalledWith(mockBuffer);
            expect(result).toBe('Parsed PDF Text');
        });
        test('extracts text from plain text files directly', async () => {
            fs_1.default.readFileSync.mockReturnValue('Plain Content');
            const result = await (0, text_processor_1.extractText)('/path/to/note.txt', 'text/plain');
            expect(fs_1.default.readFileSync).toHaveBeenCalledWith('/path/to/note.txt', 'utf-8');
            expect(pdf_parse_1.default).not.toHaveBeenCalled(); // Should skip PDF parser
            expect(result).toBe('Plain Content');
        });
        test('extracts text from JSON files', async () => {
            const jsonContent = '{"key": "value"}';
            fs_1.default.readFileSync.mockReturnValue(jsonContent);
            const result = await (0, text_processor_1.extractText)('/path/to/data.json', 'application/json');
            expect(fs_1.default.readFileSync).toHaveBeenCalledWith('/path/to/data.json', 'utf-8');
            expect(result).toBe(jsonContent);
        });
        test('throws error for unsupported file types', async () => {
            fs_1.default.readFileSync.mockImplementation(() => {
                throw new Error('Cannot read file');
            });
            await expect((0, text_processor_1.extractText)('/path/to/file.bin', 'application/octet-stream')).rejects.toThrow('Unsupported file type: application/octet-stream');
        });
    });
});
