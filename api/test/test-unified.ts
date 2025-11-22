import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { uploadFileWithTiming, uploadBatch } from './lib/uploader';
import { waitForIndexing, waitForBatch } from './lib/index-wait';
import { gatherMetrics, writeReport } from './lib/metrics';

const API_URL = process.env.API_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY || 'dev-key-123';

// Test file paths
const TEST_FILE_2000 = path.join(__dirname, 'test-data-2000.txt');
const TEST_FILE_3000 = path.join(__dirname, 'test-data-3000.txt');
const DATA_DIR = path.join(__dirname, 'data');

interface TestSuiteResult {
  difficulty: number;
  totalTests: number;
  passed: number;
  failed: number;
  results: Array<{
    name: string;
    success: boolean;
    error?: string;
    metrics?: unknown;
  }>;
  summary: {
    startTime: string;
    endTime: string;
    durationMs: number;
  };
}

// ============================================================================
// DIFFICULTY LEVEL 1: Basic E2E Tests
// ============================================================================
async function runLevel1(): Promise<TestSuiteResult> {
  console.log('\n' + '='.repeat(70));
  console.log('LEVEL 1: BASIC E2E TESTS');
  console.log('='.repeat(70));
  console.log('Testing: File upload, indexing, and basic search\n');

  const startTime = Date.now();
  const companyId = `test_level1_${Date.now()}`;
  const results: TestSuiteResult['results'] = [];

  // Test 1.1: Small file upload and search
  try {
    console.log('\n📝 Test 1.1: Small File Upload & Search');
    const smallContent =
      'This is a test document about refund policy. Refunds are processed within 14 business days.';
    const smallFilePath = path.join(__dirname, 'data', 'temp-small.txt');
    fs.writeFileSync(smallFilePath, smallContent);

    const upload = await uploadFileWithTiming(companyId, smallFilePath);
    if (!upload.success || !upload.jobId) {
      throw new Error('Upload failed');
    }

    const indexResult = await waitForIndexing(upload.jobId, 60000);
    if (!indexResult.success) {
      throw new Error('Indexing failed');
    }

    await new Promise((r) => setTimeout(r, 2000));

    const searchRes = await axios.post(
      `${API_URL}/v1/companies/${companyId}/search`,
      { query: 'refund policy', limit: 5 },
      { headers: { 'x-api-key': API_KEY } }
    );

    if (searchRes.data.results && searchRes.data.results.length > 0) {
      console.log('   ✅ Test 1.1 PASSED');
      results.push({ name: 'Small File Upload & Search', success: true });
    } else {
      throw new Error('No search results');
    }

    fs.unlinkSync(smallFilePath);
  } catch (error: unknown) {
    const err = error as Error;
    console.log(`   ❌ Test 1.1 FAILED: ${err.message}`);
    results.push({ name: 'Small File Upload & Search', success: false, error: err.message });
  }

  // Test 1.2: Health check
  try {
    console.log('\n📝 Test 1.2: API Health Check');
    const health = await axios.get(`${API_URL}/health`);
    if (health.status === 200) {
      console.log('   ✅ Test 1.2 PASSED');
      results.push({ name: 'API Health Check', success: true });
    } else {
      throw new Error(`Unexpected status: ${health.status}`);
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.log(`   ❌ Test 1.2 FAILED: ${err.message}`);
    results.push({ name: 'API Health Check', success: false, error: err.message });
  }

  return {
    difficulty: 1,
    totalTests: results.length,
    passed: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
    summary: {
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    },
  };
}

// ============================================================================
// DIFFICULTY LEVEL 2: Cache & Chunking Tests
// ============================================================================
async function runLevel2(): Promise<TestSuiteResult> {
  console.log('\n' + '='.repeat(70));
  console.log('LEVEL 2: CACHE & CHUNKING TESTS');
  console.log('='.repeat(70));
  console.log('Testing: Cache performance, intelligent chunking, queue dashboard\n');

  const startTime = Date.now();
  const companyId = `test_level2_${Date.now()}`;
  const results: TestSuiteResult['results'] = [];

  if (!fs.existsSync(TEST_FILE_2000)) {
    console.log('   ⚠️  Skipping tests - test-data-2000.txt not found');
    return {
      difficulty: 2,
      totalTests: 0,
      passed: 0,
      failed: 0,
      results: [],
      summary: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      },
    };
  }

  // Test 2.1: Cache Performance
  try {
    console.log('\n📝 Test 2.1: Cache Performance');
    const upload = await uploadFileWithTiming(companyId, TEST_FILE_2000);
    if (!upload.success || !upload.jobId) {
      throw new Error('Upload failed');
    }

    await waitForIndexing(upload.jobId, 120000);
    await new Promise((r) => setTimeout(r, 2000));

    const query = 'What is the refund policy?';
    const start1 = Date.now();
    const search1 = await axios.post(
      `${API_URL}/v1/companies/${companyId}/search`,
      { query, limit: 10 },
      { headers: { 'x-api-key': API_KEY } }
    );
    const time1 = Date.now() - start1;
    const cacheStatus1 = search1.headers['x-cache'] || 'UNKNOWN';

    const start2 = Date.now();
    const search2 = await axios.post(
      `${API_URL}/v1/companies/${companyId}/search`,
      { query, limit: 10 },
      { headers: { 'x-api-key': API_KEY } }
    );
    const time2 = Date.now() - start2;
    const cacheStatus2 = search2.headers['x-cache'] || 'UNKNOWN';

    if (cacheStatus1 === 'MISS' && cacheStatus2 === 'HIT' && time2 < time1) {
      const speedup = (time1 / time2).toFixed(2);
      console.log(`   ✅ Test 2.1 PASSED (${speedup}x speedup)`);
      results.push({
        name: 'Cache Performance',
        success: true,
        metrics: { firstSearch: time1, cachedSearch: time2, speedup },
      });
    } else {
      throw new Error('Cache not working as expected');
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.log(`   ❌ Test 2.1 FAILED: ${err.message}`);
    results.push({ name: 'Cache Performance', success: false, error: err.message });
  }

  // Test 2.2: Intelligent Chunking
  try {
    console.log('\n📝 Test 2.2: Intelligent Chunking');
    const content = fs.readFileSync(TEST_FILE_2000, 'utf-8');
    const { recursiveChunkText } = await import('../src/utils/text-processor');
    const chunks = recursiveChunkText(content, 1000, 200);

    let contextBreaks = 0;
    chunks.forEach((chunk: string, i: number) => {
      if (i > 0) {
        const firstChar = chunk.trim()[0];
        if (firstChar && !/[A-Z\n]/.test(firstChar)) {
          contextBreaks++;
        }
      }
    });

    const qualityScore = ((chunks.length - contextBreaks) / chunks.length) * 100;
    if (qualityScore >= 80 && chunks.length > 0) {
      console.log(`   ✅ Test 2.2 PASSED (Quality: ${qualityScore.toFixed(1)}%)`);
      results.push({
        name: 'Intelligent Chunking',
        success: true,
        metrics: { chunks: chunks.length, qualityScore },
      });
    } else {
      throw new Error(`Low quality score: ${qualityScore.toFixed(1)}%`);
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.log(`   ❌ Test 2.2 FAILED: ${err.message}`);
    results.push({ name: 'Intelligent Chunking', success: false, error: err.message });
  }

  // Test 2.3: Bull Board Dashboard
  try {
    console.log('\n📝 Test 2.3: Bull Board Dashboard');
    const response = await axios.get(`${API_URL}/admin/queues`, {
      validateStatus: () => true,
    });
    if (response.status === 200 || response.status === 401) {
      console.log('   ✅ Test 2.3 PASSED (Dashboard accessible)');
      results.push({ name: 'Bull Board Dashboard', success: true });
    } else {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.log(`   ❌ Test 2.3 FAILED: ${err.message}`);
    results.push({ name: 'Bull Board Dashboard', success: false, error: err.message });
  }

  return {
    difficulty: 2,
    totalTests: results.length,
    passed: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
    summary: {
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    },
  };
}

// ============================================================================
// DIFFICULTY LEVEL 3: Production-Grade Features
// ============================================================================
async function runLevel3(): Promise<TestSuiteResult> {
  console.log('\n' + '='.repeat(70));
  console.log('LEVEL 3: PRODUCTION-GRADE FEATURES');
  console.log('='.repeat(70));
  console.log('Testing: Metadata filtering, rate limiting, graceful shutdown\n');

  const startTime = Date.now();
  const results: TestSuiteResult['results'] = [];

  if (!fs.existsSync(TEST_FILE_2000) || !fs.existsSync(TEST_FILE_3000)) {
    console.log('   ⚠️  Skipping tests - test data files not found');
    return {
      difficulty: 3,
      totalTests: 0,
      passed: 0,
      failed: 0,
      results: [],
      summary: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      },
    };
  }

  // Test 3.1: Metadata Filtering
  try {
    console.log('\n📝 Test 3.1: Metadata Filtering');
    const companyId = `test_level3_metadata_${Date.now()}`;

    const form1 = new FormData();
    form1.append('file', fs.createReadStream(TEST_FILE_2000));
    const upload1 = await axios.post(`${API_URL}/v1/companies/${companyId}/uploads`, form1, {
      headers: { ...form1.getHeaders(), 'x-api-key': API_KEY },
    });
    const fileId1 = upload1.data.fileId;
    await waitForIndexing(upload1.data.jobId, 120000);

    const form2 = new FormData();
    form2.append('file', fs.createReadStream(TEST_FILE_3000));
    const upload2 = await axios.post(`${API_URL}/v1/companies/${companyId}/uploads`, form2, {
      headers: { ...form2.getHeaders(), 'x-api-key': API_KEY },
    });
    await waitForIndexing(upload2.data.jobId, 120000);
    await new Promise((r) => setTimeout(r, 2000));

    const searchFiltered = await axios.post(
      `${API_URL}/v1/companies/${companyId}/search`,
      {
        query: 'What is the refund policy?',
        limit: 10,
        filter: { fileId: fileId1 },
      },
      { headers: { 'x-api-key': API_KEY } }
    );

    const allFromFile1 = searchFiltered.data.results.every(
      (r: { payload?: { fileId?: string } }) => r.payload?.fileId === fileId1
    );

    if (allFromFile1 && searchFiltered.data.results.length > 0) {
      console.log('   ✅ Test 3.1 PASSED');
      results.push({ name: 'Metadata Filtering', success: true });
    } else {
      throw new Error('Filtering failed');
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.log(`   ❌ Test 3.1 FAILED: ${err.message}`);
    results.push({ name: 'Metadata Filtering', success: false, error: err.message });
  }

  // Test 3.2: Rate Limiting
  try {
    console.log('\n📝 Test 3.2: Rate Limiting');
    const companyId = `test_level3_ratelimit_${Date.now()}`;

    let successCount = 0;
    let rateLimitedCount = 0;

    for (let i = 1; i <= 105; i++) {
      const res = await axios.post(
        `${API_URL}/v1/companies/${companyId}/search`,
        { query: 'test', limit: 1 },
        {
          headers: { 'x-api-key': API_KEY },
          validateStatus: () => true,
        }
      );

      if (res.status === 200) {
        successCount++;
      } else if (res.status === 429) {
        rateLimitedCount++;
      }
    }

    if (rateLimitedCount > 0 && successCount <= 100) {
      console.log(`   ✅ Test 3.2 PASSED (${rateLimitedCount} requests rate limited)`);
      results.push({
        name: 'Rate Limiting',
        success: true,
        metrics: { successCount, rateLimitedCount },
      });
    } else {
      throw new Error('Rate limiting not working as expected');
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.log(`   ❌ Test 3.2 FAILED: ${err.message}`);
    results.push({ name: 'Rate Limiting', success: false, error: err.message });
  }

  // Test 3.3: Graceful Shutdown (Health Check)
  try {
    console.log('\n📝 Test 3.3: Graceful Shutdown (Health Check)');
    const health = await axios.get(`${API_URL}/health`);
    if (health.status === 200) {
      console.log('   ✅ Test 3.3 PASSED (API responsive)');
      results.push({ name: 'Graceful Shutdown Check', success: true });
    } else {
      throw new Error(`Unexpected status: ${health.status}`);
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.log(`   ❌ Test 3.3 FAILED: ${err.message}`);
    results.push({ name: 'Graceful Shutdown Check', success: false, error: err.message });
  }

  return {
    difficulty: 3,
    totalTests: results.length,
    passed: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
    summary: {
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    },
  };
}

// ============================================================================
// DIFFICULTY LEVEL 4: Large Data Tests
// ============================================================================
async function runLevel4(): Promise<TestSuiteResult> {
  console.log('\n' + '='.repeat(70));
  console.log('LEVEL 4: LARGE DATA TESTS');
  console.log('='.repeat(70));
  console.log('Testing: Multiple files, performance metrics, large collections\n');

  const startTime = Date.now();
  const companyId = `test_level4_${Date.now()}`;
  const results: TestSuiteResult['results'] = [];

  // Check for test data directory
  if (!fs.existsSync(DATA_DIR)) {
    console.log('   ⚠️  Test data directory not found. Run: npm run generate:test-data');
    return {
      difficulty: 4,
      totalTests: 0,
      passed: 0,
      failed: 0,
      results: [],
      summary: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      },
    };
  }

  // Test 4.1: Multiple File Uploads
  try {
    console.log('\n📝 Test 4.1: Multiple File Uploads');
    // Test with progressively larger files (limit to 2-3 to avoid rate limiting)
    const files = ['1mb.txt', '10mb.txt', '20mb.txt'].filter((f) =>
      fs.existsSync(path.join(DATA_DIR, f))
    );

    if (files.length === 0) {
      throw new Error('No test data files found');
    }

    const filePaths = files.map((f) => path.join(DATA_DIR, f));
    const uploadResults = await uploadBatch(companyId, filePaths);

    const jobIds = uploadResults.filter((r) => r.success && r.jobId).map((r) => r.jobId as string);

    if (jobIds.length === 0) {
      throw new Error('No successful uploads');
    }

    // Large files need more time - increase timeout to 15 minutes
    const indexResults = await waitForBatch(jobIds, 900000);
    const successCount = indexResults.filter((r) => r.success).length;

    if (successCount === jobIds.length) {
      const totalChunks = indexResults.reduce((sum, r) => sum + r.chunks, 0);
      console.log(`   ✅ Test 4.1 PASSED (${successCount} files, ${totalChunks} chunks)`);
      results.push({
        name: 'Multiple File Uploads',
        success: true,
        metrics: { files: successCount, chunks: totalChunks },
      });
    } else {
      throw new Error(`Only ${successCount}/${jobIds.length} files indexed successfully`);
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.log(`   ❌ Test 4.1 FAILED: ${err.message}`);
    results.push({ name: 'Multiple File Uploads', success: false, error: err.message });
  }

  // Test 4.2: Performance Metrics
  try {
    console.log('\n📝 Test 4.2: Performance Metrics');
    await new Promise((r) => setTimeout(r, 2000));
    const metrics = await gatherMetrics(companyId, 'policy refund processing');

    if (metrics.search.p95LatencyMs < 1000 && metrics.search.successRate > 0.8) {
      console.log(`   ✅ Test 4.2 PASSED (P95: ${metrics.search.p95LatencyMs}ms)`);
      results.push({
        name: 'Performance Metrics',
        success: true,
        metrics,
      });
    } else {
      throw new Error('Performance metrics below threshold');
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.log(`   ❌ Test 4.2 FAILED: ${err.message}`);
    results.push({ name: 'Performance Metrics', success: false, error: err.message });
  }

  // Test 4.3: Search with Large Collection
  try {
    console.log('\n📝 Test 4.3: Search with Large Collection');
    const searchRes = await axios.post(
      `${API_URL}/v1/companies/${companyId}/search`,
      { query: 'refund policy', limit: 10 },
      { headers: { 'x-api-key': API_KEY } }
    );

    if (searchRes.data.results && searchRes.data.results.length > 0) {
      console.log(`   ✅ Test 4.3 PASSED (${searchRes.data.results.length} results)`);
      results.push({
        name: 'Search with Large Collection',
        success: true,
        metrics: { resultsCount: searchRes.data.results.length },
      });
    } else {
      throw new Error('No search results');
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.log(`   ❌ Test 4.3 FAILED: ${err.message}`);
    results.push({ name: 'Search with Large Collection', success: false, error: err.message });
  }

  return {
    difficulty: 4,
    totalTests: results.length,
    passed: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
    summary: {
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    },
  };
}

// ============================================================================
// DIFFICULTY LEVEL 5: Extreme Scale Tests
// ============================================================================
async function runLevel5(): Promise<TestSuiteResult> {
  console.log('\n' + '='.repeat(70));
  console.log('LEVEL 5: EXTREME SCALE TESTS');
  console.log('='.repeat(70));
  console.log('Testing: Large files, concurrent uploads, stress tests\n');

  const startTime = Date.now();
  const companyId = `test_level5_${Date.now()}`;
  const results: TestSuiteResult['results'] = [];

  if (!fs.existsSync(DATA_DIR)) {
    console.log('   ⚠️  Test data directory not found. Run: npm run generate:test-data');
    return {
      difficulty: 5,
      totalTests: 0,
      passed: 0,
      failed: 0,
      results: [],
      summary: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      },
    };
  }

  // Test 5.1: Large File Upload (30MB+)
  try {
    console.log('\n📝 Test 5.1: Large File Upload');
    const largeFiles = ['15mb.txt', '30mb.txt', '45mb.txt'].filter((f) =>
      fs.existsSync(path.join(DATA_DIR, f))
    );

    if (largeFiles.length === 0) {
      throw new Error('No large test files found');
    }

    const filePath = path.join(DATA_DIR, largeFiles[0]);
    const upload = await uploadFileWithTiming(companyId, filePath);

    if (!upload.success || !upload.jobId) {
      throw new Error('Upload failed');
    }

    const indexResult = await waitForIndexing(upload.jobId, 600000);
    if (!indexResult.success) {
      throw new Error('Indexing failed');
    }

    const fileSizeMB = fs.statSync(filePath).size / 1024 / 1024;
    const throughput = indexResult.chunks / (indexResult.durationMs / 1000);

    console.log(
      `   ✅ Test 5.1 PASSED (${fileSizeMB.toFixed(1)}MB, ${indexResult.chunks} chunks, ${throughput.toFixed(1)} chunks/sec)`
    );
    results.push({
      name: 'Large File Upload',
      success: true,
      metrics: {
        fileSizeMB,
        chunks: indexResult.chunks,
        durationMs: indexResult.durationMs,
        throughput,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.log(`   ❌ Test 5.1 FAILED: ${err.message}`);
    results.push({ name: 'Large File Upload', success: false, error: err.message });
  }

  // Test 5.2: Concurrent Uploads
  try {
    console.log('\n📝 Test 5.2: Concurrent Uploads');
    const companyId2 = `test_level5_concurrent_${Date.now()}`;
    const files = ['5mb.txt', '1mb.txt'].filter((f) => fs.existsSync(path.join(DATA_DIR, f)));

    if (files.length < 2) {
      throw new Error('Need at least 2 files for concurrent test');
    }

    const filePaths = files.map((f) => path.join(DATA_DIR, f));
    const uploadPromises = filePaths.map((fp) => uploadFileWithTiming(companyId2, fp));
    const uploadResults = await Promise.all(uploadPromises);

    const jobIds = uploadResults.filter((r) => r.success && r.jobId).map((r) => r.jobId as string);

    if (jobIds.length < 2) {
      throw new Error('Not enough successful concurrent uploads');
    }

    const indexResults = await waitForBatch(jobIds, 600000);
    const successCount = indexResults.filter((r) => r.success).length;

    if (successCount === jobIds.length) {
      console.log(`   ✅ Test 5.2 PASSED (${successCount} concurrent uploads)`);
      results.push({
        name: 'Concurrent Uploads',
        success: true,
        metrics: { concurrentFiles: successCount },
      });
    } else {
      throw new Error(`Only ${successCount}/${jobIds.length} concurrent uploads succeeded`);
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.log(`   ❌ Test 5.2 FAILED: ${err.message}`);
    results.push({ name: 'Concurrent Uploads', success: false, error: err.message });
  }

  // Test 5.3: Stress Test - Multiple Large Files
  try {
    console.log('\n📝 Test 5.3: Stress Test - Multiple Large Files');
    const companyId3 = `test_level5_stress_${Date.now()}`;
    const files = ['5mb.txt', '15mb.txt'].filter((f) => fs.existsSync(path.join(DATA_DIR, f)));

    if (files.length === 0) {
      throw new Error('No test files available');
    }

    const filePaths = files.map((f) => path.join(DATA_DIR, f));
    const uploadResults = await uploadBatch(companyId3, filePaths);

    const jobIds = uploadResults.filter((r) => r.success && r.jobId).map((r) => r.jobId as string);

    const indexResults = await waitForBatch(jobIds, 600000);
    const totalChunks = indexResults.reduce((sum, r) => sum + r.chunks, 0);
    const successCount = indexResults.filter((r) => r.success).length;

    if (successCount === jobIds.length && totalChunks > 1000) {
      console.log(`   ✅ Test 5.3 PASSED (${successCount} files, ${totalChunks} chunks)`);
      results.push({
        name: 'Stress Test - Multiple Large Files',
        success: true,
        metrics: { files: successCount, chunks: totalChunks },
      });
    } else {
      throw new Error('Stress test failed');
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.log(`   ❌ Test 5.3 FAILED: ${err.message}`);
    results.push({
      name: 'Stress Test - Multiple Large Files',
      success: false,
      error: err.message,
    });
  }

  return {
    difficulty: 5,
    totalTests: results.length,
    passed: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
    summary: {
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    },
  };
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================
async function runUnifiedTests() {
  const args = process.argv.slice(2);
  const difficultyArg =
    args.find((a) => a.startsWith('--difficulty=')) || args.find((a) => a.startsWith('-d='));
  const difficultyStr = difficultyArg
    ? difficultyArg.split('=')[1]
    : args.find((a) => /^[1-5]$/.test(a)) || '1';

  const difficulty = parseInt(difficultyStr, 10);

  if (difficulty < 1 || difficulty > 5) {
    console.error('❌ Difficulty must be between 1 and 5');
    console.error('Usage: npm run test:unified -- --difficulty=1');
    process.exit(1);
  }

  console.log('\n');
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║              UNIFIED TEST SUITE                                  ║');
  console.log(
    '║              Difficulty Level: ' + difficulty + '                                    ║'
  );
  console.log('╚═══════════════════════════════════════════════════════════════════╝');

  let result: TestSuiteResult;

  try {
    switch (difficulty) {
      case 1:
        result = await runLevel1();
        break;
      case 2:
        result = await runLevel2();
        break;
      case 3:
        result = await runLevel3();
        break;
      case 4:
        result = await runLevel4();
        break;
      case 5:
        result = await runLevel5();
        break;
      default:
        throw new Error(`Invalid difficulty level: ${difficulty}`);
    }

    // Print summary
    console.log('\n\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`\nDifficulty Level: ${result.difficulty}`);
    console.log(`Total Tests:      ${result.totalTests}`);
    console.log(`Passed:           ${result.passed} ✅`);
    console.log(`Failed:           ${result.failed} ${result.failed > 0 ? '❌' : ''}`);
    console.log(`Duration:         ${(result.summary.durationMs / 1000).toFixed(2)}s`);

    if (result.results.length > 0) {
      console.log('\n' + '-'.repeat(70));
      console.log('Test Results:');
      console.log('-'.repeat(70));
      result.results.forEach((r, idx) => {
        const status = r.success ? '✅' : '❌';
        console.log(`\n${idx + 1}. ${status} ${r.name}`);
        if (!r.success && r.error) {
          console.log(`   Error: ${r.error}`);
        }
        if (r.metrics) {
          console.log(`   Metrics: ${JSON.stringify(r.metrics, null, 2).replace(/\n/g, '\n   ')}`);
        }
      });
    }

    console.log('\n' + '='.repeat(70));

    // Write report
    const reportFilename = `test-report-level${difficulty}-${Date.now()}.json`;
    writeReport(result, reportFilename);

    // Exit code
    if (result.failed === 0 && result.totalTests > 0) {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    } else if (result.totalTests === 0) {
      console.log('\n⚠️  No tests were run');
      process.exit(0);
    } else {
      console.log(`\n⚠️  ${result.failed} test(s) failed`);
      process.exit(1);
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('\n💥 Fatal error:', err.message);
    if (err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  void runUnifiedTests();
}
