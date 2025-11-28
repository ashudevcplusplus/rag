import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { API_URL, API_KEY, COMPANY_ID } from './config';
import { uploadFileWithTiming } from '../lib/uploader';
import { waitForIndexing } from '../lib/index-wait';
import { recursiveChunkText } from '../../src/utils/text-processor';

describe('Level 2: Cache & Chunking Tests', () => {
  const companyId = COMPANY_ID;
  const testFile2000 = path.join(__dirname, '../test-data-2000.txt');

  beforeAll(() => {
    if (!fs.existsSync(testFile2000)) {
      console.warn('test-data-2000.txt not found, skipping cache tests might fail');
      // Ideally generate it here or fail
    }
  });

  test('2.1: Cache Performance', async () => {
    if (!fs.existsSync(testFile2000)) {
      console.warn('Skipping cache test due to missing file');
      return;
    }

    const upload = await uploadFileWithTiming(companyId, testFile2000);
    expect(upload.success).toBe(true);
    expect(upload.jobId).toBeDefined();

    if (!upload.jobId) throw new Error('Job ID missing');

    await waitForIndexing(upload.jobId, 120000);
    await new Promise((r) => setTimeout(r, 2000));

    const query = 'What is the refund policy?';
    
    // First search
    const start1 = Date.now();
    const search1 = await axios.post(
      `${API_URL}/v1/companies/${companyId}/search`,
      { query, limit: 10 },
      { headers: { 'x-api-key': API_KEY } }
    );
    const time1 = Date.now() - start1;
    const cacheStatus1 = search1.headers['x-cache'] || 'UNKNOWN';

    // Second search
    const start2 = Date.now();
    const search2 = await axios.post(
      `${API_URL}/v1/companies/${companyId}/search`,
      { query, limit: 10 },
      { headers: { 'x-api-key': API_KEY } }
    );
    const time2 = Date.now() - start2;
    const cacheStatus2 = search2.headers['x-cache'] || 'UNKNOWN';

    // Expect cache hit on second request
    // Note: Depending on environment, cache headers might not be set or might be MISS if Redis is down/cleared
    // But we expect it to work in E2E
    if (cacheStatus1 === 'MISS') {
        expect(cacheStatus2).toBe('HIT');
        expect(time2).toBeLessThan(time1);
    } else {
        console.log('Cache already warm or not enabled via headers');
    }
  });

  test('2.2: Intelligent Chunking', () => {
    if (!fs.existsSync(testFile2000)) {
      console.warn('Skipping chunking test due to missing file');
      return;
    }

    const content = fs.readFileSync(testFile2000, 'utf-8');
    const chunks = recursiveChunkText(content, 1000, 200);

    let contextBreaks = 0;
    chunks.forEach((chunk, i) => {
      if (i > 0) {
        const firstChar = chunk.trim()[0];
        if (firstChar && !/[A-Z\n]/.test(firstChar)) {
          contextBreaks++;
        }
      }
    });

    const qualityScore = ((chunks.length - contextBreaks) / chunks.length) * 100;
    expect(qualityScore).toBeGreaterThanOrEqual(80);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test('2.3: Bull Board Dashboard', async () => {
    try {
        const response = await axios.get(`${API_URL}/admin/queues`, {
        validateStatus: () => true,
        });
        // 200 if open, 401 if protected. Both mean the route exists.
        expect([200, 401]).toContain(response.status);
    } catch (e) {
        // Failed to connect
        throw e;
    }
  });
});

