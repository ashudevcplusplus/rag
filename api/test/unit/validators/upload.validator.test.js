"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const upload_validator_1 = require("../../../src/validators/upload.validator");
describe('Upload Validators', () => {
    describe('companyIdSchema', () => {
        it('should validate valid company ID', () => {
            const result = upload_validator_1.companyIdSchema.safeParse({ companyId: 'company-123' });
            expect(result.success).toBe(true);
        });
        it('should reject empty company ID', () => {
            const result = upload_validator_1.companyIdSchema.safeParse({ companyId: '' });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('required');
            }
        });
        it('should reject company ID that is too long', () => {
            const longId = 'a'.repeat(101);
            const result = upload_validator_1.companyIdSchema.safeParse({ companyId: longId });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('too long');
            }
        });
        it('should reject company ID with invalid characters', () => {
            const result = upload_validator_1.companyIdSchema.safeParse({ companyId: 'company@123' });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Invalid');
            }
        });
        it('should accept company ID with underscores and hyphens', () => {
            const result = upload_validator_1.companyIdSchema.safeParse({ companyId: 'company_123-test' });
            expect(result.success).toBe(true);
        });
    });
    describe('fileUploadSchema', () => {
        it('should validate valid PDF file', () => {
            const result = upload_validator_1.fileUploadSchema.safeParse({
                file: {
                    mimetype: 'application/pdf',
                    size: 1024 * 1024, // 1MB
                    originalname: 'test.pdf',
                },
            });
            expect(result.success).toBe(true);
        });
        it('should validate valid text file', () => {
            const result = upload_validator_1.fileUploadSchema.safeParse({
                file: {
                    mimetype: 'text/plain',
                    size: 512 * 1024,
                    originalname: 'test.txt',
                },
            });
            expect(result.success).toBe(true);
        });
        it('should validate valid JSON file', () => {
            const result = upload_validator_1.fileUploadSchema.safeParse({
                file: {
                    mimetype: 'application/json',
                    size: 256 * 1024,
                    originalname: 'test.json',
                },
            });
            expect(result.success).toBe(true);
        });
        it('should reject unsupported file type', () => {
            const result = upload_validator_1.fileUploadSchema.safeParse({
                file: {
                    mimetype: 'image/png',
                    size: 1024,
                    originalname: 'test.png',
                },
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('Unsupported');
            }
        });
        it('should reject file that is too large', () => {
            const result = upload_validator_1.fileUploadSchema.safeParse({
                file: {
                    mimetype: 'application/pdf',
                    size: 51 * 1024 * 1024, // 51MB
                    originalname: 'large.pdf',
                },
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('too large');
            }
        });
        it('should accept file at size limit', () => {
            const result = upload_validator_1.fileUploadSchema.safeParse({
                file: {
                    mimetype: 'text/plain',
                    size: 50 * 1024 * 1024, // Exactly 50MB
                    originalname: 'large.txt',
                },
            });
            expect(result.success).toBe(true);
        });
    });
    describe('searchQuerySchema', () => {
        it('should validate valid search query', () => {
            const result = upload_validator_1.searchQuerySchema.safeParse({
                query: 'test query',
                limit: 10,
            });
            expect(result.success).toBe(true);
        });
        it('should use default limit if not provided', () => {
            const result = upload_validator_1.searchQuerySchema.parse({
                query: 'test',
            });
            expect(result.limit).toBe(10);
        });
        it('should reject empty query', () => {
            const result = upload_validator_1.searchQuerySchema.safeParse({
                query: '',
                limit: 10,
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('empty');
            }
        });
        it('should reject query that is too long', () => {
            const longQuery = 'a'.repeat(1001);
            const result = upload_validator_1.searchQuerySchema.safeParse({
                query: longQuery,
                limit: 10,
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('too long');
            }
        });
        it('should reject limit that is too small', () => {
            const result = upload_validator_1.searchQuerySchema.safeParse({
                query: 'test',
                limit: 0,
            });
            expect(result.success).toBe(false);
        });
        it('should reject limit that is too large', () => {
            const result = upload_validator_1.searchQuerySchema.safeParse({
                query: 'test',
                limit: 101,
            });
            expect(result.success).toBe(false);
        });
        it('should accept valid filter', () => {
            const result = upload_validator_1.searchQuerySchema.safeParse({
                query: 'test',
                limit: 10,
                filter: { fileId: 'file-123' },
            });
            expect(result.success).toBe(true);
        });
    });
    describe('jobIdSchema', () => {
        it('should validate valid job ID', () => {
            const result = upload_validator_1.jobIdSchema.safeParse({ jobId: 'job-123' });
            expect(result.success).toBe(true);
        });
        it('should reject empty job ID', () => {
            const result = upload_validator_1.jobIdSchema.safeParse({ jobId: '' });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toContain('required');
            }
        });
        it('should accept any non-empty string', () => {
            const result = upload_validator_1.jobIdSchema.safeParse({ jobId: 'any-job-id-123' });
            expect(result.success).toBe(true);
        });
    });
});
