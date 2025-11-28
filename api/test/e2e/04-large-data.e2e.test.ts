import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { API_URL, API_KEY, COMPANY_ID } from './config';
import { uploadBatch } from '../lib/uploader';
import { waitForBatch } from '../lib/index-wait';
import { gatherMetrics } from '../lib/metrics';

describe('Level 4: Large Data Tests', () => {
  const DATA_DIR = path.join(__dirname, '../data');
  const companyId = COMPANY_ID;

  test('4.1: Multiple File Uploads', async () => {
    if (!fs.existsSync(DATA_DIR)) {
        console.warn('Skipping large data test - data dir missing');
        return;
    }
    
    const files = ['1mb.txt', '5mb.txt'].filter((f) =>
      fs.existsSync(path.join(DATA_DIR, f))
    );

    if (files.length === 0) {
      console.warn('No test files found for level 4');
      return;
    }

    const filePaths = files.map((f) => path.join(DATA_DIR, f));
    const uploadResults = await uploadBatch(companyId, filePaths);

    const jobIds = uploadResults.filter((r) => r.success && r.jobId).map((r) => r.jobId as string);
    expect(jobIds.length).toBeGreaterThan(0);

    // 15 minutes timeout
    const indexResults = await waitForBatch(jobIds, 900000);
    const successCount = indexResults.filter((r) => r.success).length;

    expect(successCount).toBe(jobIds.length);
  }, 900000); // Set test timeout

  test('4.2: Performance Metrics', async () => {
     // Need to check if 4.1 actually ran and populated data
     if (!fs.existsSync(DATA_DIR)) return;

     await new Promise((r) => setTimeout(r, 2000));
     const metrics = await gatherMetrics(companyId, 'policy refund processing');

     expect(metrics.search.p95LatencyMs).toBeLessThan(1000);
     expect(metrics.search.successRate).toBeGreaterThan(0.8);
  });

  test('4.3: Search with Large Collection', async () => {
    if (!fs.existsSync(DATA_DIR)) return;

    const searchRes = await axios.post(
      `${API_URL}/v1/companies/${companyId}/search`,
      { query: 'refund policy', limit: 10 },
      { headers: { 'x-api-key': API_KEY } }
    );

    expect(searchRes.data.results.length).toBeGreaterThan(0);
  });
});

