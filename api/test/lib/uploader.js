"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFileWithTiming = uploadFileWithTiming;
exports.uploadBatch = uploadBatch;
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const API_URL = process.env.API_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY || 'dev-key-123'; // Default test key
async function uploadFileWithTiming(companyId, filePath) {
    const form = new form_data_1.default();
    const fileStream = fs_1.default.createReadStream(filePath);
    form.append('file', fileStream);
    const fileName = filePath.split('/').pop() || 'unknown';
    const fileSize = fs_1.default.statSync(filePath).size;
    console.log(`   📤 Uploading ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)...`);
    const start = performance.now();
    try {
        const res = await axios_1.default.post(`${API_URL}/v1/companies/${companyId}/uploads`, form, {
            headers: {
                ...form.getHeaders(),
                'x-api-key': API_KEY,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 120000, // 2 minute timeout for large files
        });
        const end = performance.now();
        return {
            success: true,
            timeMs: end - start,
            jobId: res.data.jobId,
            fileId: res.data.fileId,
            statusUrl: res.data.statusUrl,
        };
    }
    catch (error) {
        const err = error;
        const end = performance.now();
        console.error(`   ❌ Upload failed: ${err.message || 'Unknown error'}`);
        if (err.response) {
            console.error(`   Status: ${err.response.status}`);
            console.error(`   Response:`, err.response.data);
        }
        return {
            success: false,
            timeMs: end - start,
            jobId: null,
            error: err.message || 'Upload failed',
        };
    }
}
async function uploadBatch(companyId, filePaths) {
    console.log(`📦 Uploading batch of ${filePaths.length} files...`);
    const results = [];
    for (const filePath of filePaths) {
        const result = await uploadFileWithTiming(companyId, filePath);
        results.push(result);
        // Small delay between uploads to avoid overwhelming the system
        if (results.length < filePaths.length) {
            await new Promise((r) => setTimeout(r, 500));
        }
    }
    const successCount = results.filter((r) => r.success).length;
    console.log(`   ✅ Batch complete: ${successCount}/${filePaths.length} successful`);
    return results;
}
