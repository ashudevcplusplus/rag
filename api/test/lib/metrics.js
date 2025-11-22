"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gatherMetrics = gatherMetrics;
exports.writeReport = writeReport;
exports.printSummary = printSummary;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const API_URL = process.env.API_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY || 'dev-key-123';
async function gatherMetrics(companyId, query = 'policy') {
    console.log('   📊 Gathering system metrics...');
    const mem = process.memoryUsage();
    // Measure search latency with multiple samples
    const latencies = [];
    const sampleCount = 10;
    for (let i = 0; i < sampleCount; i++) {
        const start = performance.now();
        try {
            await axios_1.default.post(`${API_URL}/v1/companies/${companyId}/search`, { query, limit: 5 }, { headers: { 'x-api-key': API_KEY }, timeout: 5000 });
            latencies.push(performance.now() - start);
        }
        catch (e) {
            // Count failed requests
            latencies.push(-1);
        }
        // Small delay between requests
        await new Promise((r) => setTimeout(r, 100));
    }
    const validLatencies = latencies.filter((l) => l >= 0);
    const avgLatency = validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length || 0;
    const minLatency = Math.min(...validLatencies);
    const maxLatency = Math.max(...validLatencies);
    // Calculate P95
    const sorted = [...validLatencies].sort((a, b) => a - b);
    const p95Index = Math.ceil(sorted.length * 0.95) - 1;
    const p95Latency = sorted[p95Index] || 0;
    const cpuUsage = process.cpuUsage();
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    return {
        timestamp: new Date().toISOString(),
        memory: {
            rssMB: Math.round(mem.rss / 1024 / 1024),
            heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
            externalMB: Math.round(mem.external / 1024 / 1024),
        },
        search: {
            avgLatencyMs: Math.round(avgLatency),
            minLatencyMs: Math.round(minLatency),
            maxLatencyMs: Math.round(maxLatency),
            p95LatencyMs: Math.round(p95Latency),
            successRate: validLatencies.length / sampleCount,
        },
        process: {
            uptimeSec: Math.round(process.uptime()),
            cpuUsage: Math.round(cpuPercent * 100) / 100,
        },
    };
}
function writeReport(data, filename) {
    const dir = path_1.default.join(__dirname, '..', '..', 'reports');
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
    const filePath = path_1.default.join(dir, filename);
    fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`📄 Report written to: ${filePath}`);
}
function printSummary(report) {
    console.log('\n' + '='.repeat(70));
    console.log('📊 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`\nMode: ${report.mode.toUpperCase()}`);
    console.log(`Company ID: ${report.companyId}`);
    console.log(`Tests Run: ${report.results.length}`);
    console.log('\n' + '-'.repeat(70));
    console.log('Per-File Results:');
    console.log('-'.repeat(70));
    report.results.forEach((r, idx) => {
        console.log(`\n${idx + 1}. ${r.file}`);
        console.log(`   Upload Time:    ${(r.uploadTimeMs / 1000).toFixed(2)}s`);
        console.log(`   Indexing Time:  ${(r.indexTimeMs / 1000).toFixed(2)}s`);
        console.log(`   Total Time:     ${((r.uploadTimeMs + r.indexTimeMs) / 1000).toFixed(2)}s`);
        console.log(`   Chunks:         ${r.chunks}`);
        console.log(`   Search P95:     ${r.metrics.search.p95LatencyMs}ms`);
        console.log(`   Memory RSS:     ${r.metrics.memory.rssMB} MB`);
    });
    // Overall statistics
    const totalUploadTime = report.results.reduce((sum, r) => sum + r.uploadTimeMs, 0);
    const totalIndexTime = report.results.reduce((sum, r) => sum + r.indexTimeMs, 0);
    const totalChunks = report.results.reduce((sum, r) => sum + r.chunks, 0);
    console.log('\n' + '-'.repeat(70));
    console.log('Aggregate Statistics:');
    console.log('-'.repeat(70));
    console.log(`Total Upload Time:   ${(totalUploadTime / 1000).toFixed(2)}s`);
    console.log(`Total Indexing Time: ${(totalIndexTime / 1000).toFixed(2)}s`);
    console.log(`Total Chunks:        ${totalChunks}`);
    console.log(`Avg Throughput:      ${(totalChunks / (totalIndexTime / 1000)).toFixed(2)} chunks/sec`);
    console.log('\n' + '='.repeat(70));
}
