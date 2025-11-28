import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { API_URL, API_KEY, COMPANY_ID } from './config';
import { uploadBatch } from '../lib/uploader';
import { waitForBatch } from '../lib/index-wait';

jest.setTimeout(300000); // 5 minutes

describe('Level 3: Hybrid Reranking', () => {
  const companyId = COMPANY_ID;
  const dataDir = path.join(__dirname, '../data');
  const runSuffix = Date.now().toString().slice(-6);

  const files = [
    {
      name: `rerank_doc1_${runSuffix}.txt`,
      content: `The quick brown fox jumps over the lazy dog. This is a story about a fox.`,
      keywords: ['fox'],
    },
    {
      name: `rerank_doc2_${runSuffix}.txt`,
      content: `The lazy dog was jumped over by the quick brown fox. Dogs are great pets.`,
      keywords: ['dog'],
    },
    {
        name: `rerank_doc3_${runSuffix}.txt`,
        content: `Foxes are wild animals. They are not typically pets.`,
        keywords: ['foxes'],
    }
  ];

  const filePaths = files.map((f) => path.join(dataDir, f.name));

  beforeAll(async () => {
    // Ensure data dir
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    // Write files
    files.forEach((f, i) => fs.writeFileSync(filePaths[i], f.content));

    try {
      console.log('Uploading test files for reranking...');
      const uploadResults = await uploadBatch(companyId, filePaths);
      const jobIds = uploadResults.map((r) => r.jobId as string);
      await waitForBatch(jobIds);
      // small buffer
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
        // cleanup
        filePaths.forEach((p) => { if (fs.existsSync(p)) fs.unlinkSync(p); });
        throw err;
    }
  });

  afterAll(() => {
    filePaths.forEach((p) => { if (fs.existsSync(p)) fs.unlinkSync(p); });
  });

  const http = axios.create({ timeout: 30000 });

  test('8.1: Search with reranking enabled returns results with original_score in payload', async () => {
    const query = 'fox story';
    const res = await http.post(`${API_URL}/v1/companies/${companyId}/search`, 
        { query, limit: 3, rerank: true }, 
        { headers: { 'x-api-key': API_KEY } }
    );
    
    expect(res.status).toBe(200);
    const results = res.data.results;
    console.log('Reranked Results:', JSON.stringify(results, null, 2));
    
    expect(results.length).toBeGreaterThan(0);
    
    // Check for original_score in payload
    results.forEach((r: any) => {
        expect(r.payload).toHaveProperty('original_score');
    });
  });

  test('8.2: Reranking changes order or scores compared to standard search', async () => {
      const query = 'lazy dog pets';
      
      // Standard search
      const resStandard = await http.post(`${API_URL}/v1/companies/${companyId}/search`, 
          { query, limit: 3, rerank: false }, 
          { headers: { 'x-api-key': API_KEY } }
      );
      const standardResults = resStandard.data.results;

      // Reranked search
      const resRerank = await http.post(`${API_URL}/v1/companies/${companyId}/search`, 
          { query, limit: 3, rerank: true }, 
          { headers: { 'x-api-key': API_KEY } }
      );
      const rerankResults = resRerank.data.results;
      
      const standardScores = standardResults.map((r: any) => r.score);
      const rerankScores = rerankResults.map((r: any) => r.score);

      console.log('Standard Scores:', standardScores);
      console.log('Rerank Scores:', rerankScores);

      // Check that scores are different
      expect(standardScores[0]).not.toEqual(rerankScores[0]);
  });
});

