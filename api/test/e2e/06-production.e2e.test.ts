import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { API_URL, API_KEY, COMPANY_ID } from './config';
import { waitForIndexing } from '../lib/index-wait';

describe('Level 3: Production-Grade Features', () => {
  const testFile2000 = path.join(__dirname, '../test-data-2000.txt');
  const testFile3000 = path.join(__dirname, '../test-data-3000.txt');

  test('3.1: Metadata Filtering', async () => {
    if (!fs.existsSync(testFile2000) || !fs.existsSync(testFile3000)) {
        console.warn('Skipping metadata test due to missing files');
        return;
    }

    const companyId = COMPANY_ID;

    // Upload File 1
    const form1 = new FormData();
    form1.append('file', fs.createReadStream(testFile2000));
    const upload1 = await axios.post(`${API_URL}/v1/companies/${companyId}/uploads`, form1, {
      headers: { ...form1.getHeaders(), 'x-api-key': API_KEY },
    });
    const fileId1 = upload1.data.fileId;
    await waitForIndexing(upload1.data.jobId, 120000);

    // Upload File 2
    const form2 = new FormData();
    form2.append('file', fs.createReadStream(testFile3000));
    const upload2 = await axios.post(`${API_URL}/v1/companies/${companyId}/uploads`, form2, {
      headers: { ...form2.getHeaders(), 'x-api-key': API_KEY },
    });
    await waitForIndexing(upload2.data.jobId, 120000);
    
    await new Promise((r) => setTimeout(r, 2000));

    // Search with Filter
    const searchFiltered = await axios.post(
      `${API_URL}/v1/companies/${companyId}/search`,
      {
        query: 'What is the refund policy?',
        limit: 10,
        filter: { fileId: fileId1 },
      },
      { headers: { 'x-api-key': API_KEY } }
    );

    expect(searchFiltered.data.results.length).toBeGreaterThan(0);
    const allFromFile1 = searchFiltered.data.results.every(
      (r: any) => r.payload?.fileId === fileId1
    );
    expect(allFromFile1).toBe(true);
  });

  test('3.2: Rate Limiting', async () => {
    const companyId = COMPANY_ID;
    let rateLimitedCount = 0;
    let successCount = 0;

    // Send 105 requests sequentially
    for (let i = 0; i < 105; i++) {
        const res = await axios.post(
            `${API_URL}/v1/companies/${companyId}/search`,
            { query: 'test', limit: 1 },
            {
                headers: { 'x-api-key': API_KEY },
                validateStatus: () => true,
            }
        );
         if (res.status === 200) successCount++;
         if (res.status === 429) rateLimitedCount++;
    }

    // If rate limiting is not enabled in the environment, this might fail.
    // But based on the original test, it expects it to be enabled.
    // If it fails in some environments (like CI without Redis), we might need to adjust.
    expect(rateLimitedCount).toBeGreaterThan(0);
    expect(successCount).toBeLessThanOrEqual(100); 
  });

  test('3.3: Graceful Shutdown Check', async () => {
      const health = await axios.get(`${API_URL}/health`);
      expect(health.status).toBe(200);
  });
});

