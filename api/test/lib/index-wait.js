"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForIndexing = waitForIndexing;
exports.waitForBatch = waitForBatch;
const axios_1 = __importDefault(require("axios"));
const API_URL = process.env.API_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY || 'dev-key-123';
async function waitForIndexing(jobId, timeoutMs = 600000) {
    const start = performance.now();
    const deadline = start + timeoutMs;
    let lastProgress = -1;
    let pollCount = 0;
    console.log(`   ⏳ Waiting for indexing to complete (Job: ${jobId})...`);
    while (performance.now() < deadline) {
        try {
            const res = await axios_1.default.get(`${API_URL}/v1/jobs/${jobId}`, {
                headers: { 'x-api-key': API_KEY },
            });
            const state = res.data.state;
            const progress = res.data.progress || 0;
            pollCount++;
            // Log progress updates
            if (progress !== lastProgress && typeof progress === 'number') {
                console.log(`      Progress: ${progress}%`);
                lastProgress = progress;
            }
            if (state === 'completed') {
                const durationMs = performance.now() - start;
                const chunks = res.data.result?.chunks || 0;
                console.log(`   ✅ Indexing completed in ${(durationMs / 1000).toFixed(2)}s`);
                console.log(`      Chunks: ${chunks}`);
                console.log(`      Polls: ${pollCount}`);
                return {
                    success: true,
                    durationMs,
                    chunks,
                    finalState: state,
                };
            }
            if (state === 'failed') {
                const reason = res.data.reason || 'Unknown error';
                console.error(`   ❌ Job failed: ${reason}`);
                return {
                    success: false,
                    durationMs: performance.now() - start,
                    chunks: 0,
                    finalState: state,
                    error: reason,
                };
            }
            // Wait 1s before polling again
            await new Promise((r) => setTimeout(r, 1000));
        }
        catch (error) {
            const err = error;
            if (err.response?.status === 404) {
                console.error(`   ❌ Job not found: ${jobId}`);
                return {
                    success: false,
                    durationMs: performance.now() - start,
                    chunks: 0,
                    error: 'Job not found',
                };
            }
            // Handle rate limiting with exponential backoff
            if (err.response?.status === 429) {
                const backoffMs = Math.min(5000 * Math.pow(2, Math.floor(pollCount / 10)), 30000); // Max 30s
                console.warn(`   ⚠️  Polling error (attempt ${pollCount}): ${err.message} - backing off ${(backoffMs / 1000).toFixed(1)}s`);
                await new Promise((r) => setTimeout(r, backoffMs));
            }
            else {
                console.warn(`   ⚠️  Polling error (attempt ${pollCount}): ${err.message}`);
                await new Promise((r) => setTimeout(r, 2000));
            }
        }
    }
    const durationMs = performance.now() - start;
    console.error(`   ❌ Indexing timed out after ${(durationMs / 1000).toFixed(2)}s`);
    return {
        success: false,
        durationMs,
        chunks: 0,
        error: 'Timeout',
    };
}
async function waitForBatch(jobIds, timeoutMs = 600000) {
    console.log(`⏳ Waiting for batch of ${jobIds.length} jobs...`);
    // Wait for all jobs in parallel
    const results = await Promise.all(jobIds.map((jobId) => waitForIndexing(jobId, timeoutMs)));
    const successCount = results.filter((r) => r.success).length;
    console.log(`   ✅ Batch indexing complete: ${successCount}/${jobIds.length} successful`);
    return results;
}
