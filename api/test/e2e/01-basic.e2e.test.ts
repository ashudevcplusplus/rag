import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { API_URL, API_KEY, COMPANY_ID } from './config';
import { uploadFileWithTiming } from '../lib/uploader';
import { waitForIndexing } from '../lib/index-wait';

describe('Level 1: Basic E2E Tests', () => {
  const companyId = COMPANY_ID;
  const smallContent = 'This is a test document about refund policy. Refunds are processed within 14 business days.';
  const smallFilePath = path.join(__dirname, '../data', 'temp-small-e2e.txt');

  beforeAll(() => {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(smallFilePath, smallContent);
  });

  afterAll(() => {
    if (fs.existsSync(smallFilePath)) {
      fs.unlinkSync(smallFilePath);
    }
  });

  test('1.1: Small File Upload & Search', async () => {
    console.log('Testing with companyId:', companyId);
    const upload = await uploadFileWithTiming(companyId, smallFilePath);
    expect(upload.success).toBe(true);
    expect(upload.jobId).toBeDefined();

    if (!upload.jobId) throw new Error('Job ID missing');

    const indexResult = await waitForIndexing(upload.jobId, 60000);
    expect(indexResult.success).toBe(true);

    // Give it a moment for the search index to refresh if necessary
    await new Promise((r) => setTimeout(r, 2000));

    const searchRes = await axios.post(
      `${API_URL}/v1/companies/${companyId}/search`,
      { query: 'refund policy', limit: 5 },
      { headers: { 'x-api-key': API_KEY } }
    );

    expect(searchRes.status).toBe(200);
    expect(searchRes.data.results).toBeDefined();
    expect(searchRes.data.results.length).toBeGreaterThan(0);
  });

  test('1.2: API Health Check', async () => {
    const health = await axios.get(`${API_URL}/health`);
    expect(health.status).toBe(200);
  });
});

