import fs from 'fs';
import path from 'path';
import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY || 'dev-key-123';

export interface SystemMetrics {
  timestamp: string;
  memory: {
    rssMB: number;
    heapUsedMB: number;
    heapTotalMB: number;
    externalMB: number;
  };
  search: {
    avgLatencyMs: number;
    minLatencyMs: number;
    maxLatencyMs: number;
    p95LatencyMs: number;
    successRate: number;
  };
  process: {
    uptimeSec: number;
    cpuUsage: number;
  };
}

export async function gatherMetrics(companyId: string, query = 'policy'): Promise<SystemMetrics> {
  console.log('   📊 Gathering system metrics...');

  const mem = process.memoryUsage();

  // Measure search latency with multiple samples
  const latencies: number[] = [];
  const sampleCount = 10;

  for (let i = 0; i < sampleCount; i++) {
    const start = performance.now();
    try {
      await axios.post(
        `${API_URL}/v1/companies/${companyId}/search`,
        { query, limit: 5 },
        { headers: { 'x-api-key': API_KEY }, timeout: 5000 }
      );
      latencies.push(performance.now() - start);
    } catch (e) {
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

export function writeReport(data: unknown, filename: string): void {
  const dir = path.join(__dirname, '..', '..', 'reports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`📄 Report written to: ${filePath}`);
}

export function printSummary(report: {
  mode: string;
  companyId: string;
  results: Array<{
    file: string;
    uploadTimeMs: number;
    indexTimeMs: number;
    chunks: number;
    metrics: SystemMetrics;
  }>;
}): void {
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
  console.log(
    `Avg Throughput:      ${(totalChunks / (totalIndexTime / 1000)).toFixed(2)} chunks/sec`
  );

  console.log('\n' + '='.repeat(70));
}
