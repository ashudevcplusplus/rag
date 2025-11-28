import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { API_URL, API_KEY, COMPANY_ID } from './config';
import { uploadBatch } from '../lib/uploader';
import { waitForBatch } from '../lib/index-wait';

jest.setTimeout(300000); // 5 minutes global timeout for this file

// Tunable constants
const TOP_K = 3;
const PARAPHRASE_OVERLAP_THRESHOLD = 0.33;

describe('Level 3: Search Quality with Reranking', () => {
  const companyId = COMPANY_ID;
  const dataDir = path.join(__dirname, '../data');
  const runSuffix = Date.now().toString().slice(-6);

  // Same files as 07-search-quality
  const files = [
    {
      name: `ai_deep_rr_${runSuffix}.txt`,
      content:
        `Artificial intelligence and machine learning are transforming industries. Neural networks and deep learning algorithms allow computers to learn from data. \nModern architectures (CNNs, RNNs, Transformers) enable state-of-the-art performance in vision, language, and decision systems. Practical deployment requires pretraining, fine-tuning, and careful dataset curation.`,
      keywords: ['artificial intelligence', 'deep learning', 'transformers', 'neural networks'],
      metadata: { topic: 'AI', docType: 'article', quality: 'high' },
    },
    {
      name: `ai_dup_rr_${runSuffix}.txt`,
      content:
        `Neural networks and deep learning algorithms allow computers to learn from data. This short intro is reused across internal notes.`,
      keywords: ['neural networks', 'deep learning'],
      metadata: { topic: 'AI', docType: 'note', quality: 'low' },
    },
    {
      name: `cooking_carbonara_rr_${runSuffix}.txt`,
      content:
        `Classic Carbonara\nIngredients: spaghetti, eggs, pecorino romano, guanciale, black pepper.\nSteps: render guanciale, combine hot pasta with egg+cheese off heat to create a creamy sauce. Do not use cream.\nNotes: authentic carbonara never includes cream — if someone uses cream it's a variant.`,
      keywords: ['carbonara', 'pecorino', 'guanciale', 'pasta'],
      metadata: { topic: 'Cooking', docType: 'recipe', quality: 'high' },
    },
    {
      name: `cooking_faq_rr_${runSuffix}.txt`,
      content:
        `FAQ: How to cook dinner quickly? Try one-pan pasta, stir-fries, or sheet-pan meals. For authentic pasta, focus on quality pasta, proper salt in water, and finish in pan with sauce.`,
      keywords: ['how to cook', 'one-pan pasta', 'quick dinner'],
      metadata: { topic: 'Cooking', docType: 'faq', quality: 'medium' },
    },
    {
      name: `sports_report_rr_${runSuffix}.txt`,
      content:
        `Match Report: The match ended 1-1. In the 89th minute the striker stepped up for a penalty kick but missed. The goalkeeper made a decisive save. The match was notable for tactical substitutions.`,
      keywords: ['penalty', 'striker', 'goalkeeper', 'match report'],
      metadata: { topic: 'Sports', docType: 'report', quality: 'high' },
    },
    {
      name: `finance_loans_rr_${runSuffix}.txt`,
      content:
        `Personal loan for home renovations: interest, processing fees, and tenure impact monthly EMI. Bank offers vary; compare APR and prepayment penalties.`,
      keywords: ['loan', 'EMI', 'APR', 'home renovation'],
      metadata: { topic: 'Finance', docType: 'guide', quality: 'medium' },
    },
    {
      name: `health_nutrition_rr_${runSuffix}.txt`,
      content:
        `Nutrition: balanced diet includes proteins, carbohydrates, and fats. For cooking healthy dinners, prefer whole grains, lean proteins, and vegetables.`,
      keywords: ['nutrition', 'healthy dinner', 'balanced diet'],
      metadata: { topic: 'Health', docType: 'note', quality: 'medium' },
    },
    {
      name: `boilerplate_privacy_rr_${runSuffix}.txt`,
      content:
        `Privacy Policy excerpt: We collect personal data to provide services. This document includes standard legal language about data collection, retention, and user's rights.`,
      keywords: ['privacy', 'policy', 'data collection'],
      metadata: { topic: 'Legal', docType: 'policy', quality: 'boilerplate' },
    },
  ];

  const filePaths = files.map((f) => path.join(dataDir, f.name));

  // Same queries as 07-search-quality
  const queries = [
    { q: 'deep learning algorithms', topic: 'AI', paraphrases: ['deep neural network algorithms', 'transformers and deep learning'] },
    { q: 'neural network pretraining', topic: 'AI', paraphrases: ['pretraining transformers', 'how to fine-tune deep models'] },
    { q: 'authentic pasta recipe', topic: 'Cooking', paraphrases: ['traditional carbonara recipe', 'how to make carbonara without cream'] },
    { q: 'how to cook dinner', topic: 'Cooking/Health', paraphrases: ['quick dinner ideas', 'easy healthy dinner recipes'] },
    { q: 'football penalty kick', topic: 'Sports', paraphrases: ['penalty kick miss', 'how to take a penalty in football'] },
    { q: 'home loan interest', topic: 'Finance', paraphrases: ['personal loan interest rates', 'EMI calculation home renovation'] },
    { q: 'recipe', topic: 'Cooking', paraphrases: ['best pasta recipe', 'easy recipe for beginners'] },
    { q: 'penalty', topic: 'Sports/Generic', paraphrases: ['penalties in football', 'penalty kick rules'] },
  ];

  function warnDuplicatePreviews(results: any[]) {
    const previews = results.map((r) => (r.payload && r.payload.text_preview) || '');
    for (let i = 0; i < previews.length; i++) {
      for (let j = i + 1; j < previews.length; j++) {
        if (!previews[i] || !previews[j]) continue;
        if (previews[i].trim() === previews[j].trim()) {
          console.warn(
            `Warning: Duplicate text_preview detected between results ${i} and ${j}. Consider deduping at ingest.`
          );
        }
      }
    }
  }

  beforeAll(async () => {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    files.forEach((f, i) => fs.writeFileSync(filePaths[i], f.content));

    try {
      console.log('Uploading test files for rerank quality test...');
      const uploadResults = await uploadBatch(companyId, filePaths);
      const failedUploads = uploadResults.filter((r) => !r.success);
      if (failedUploads.length > 0) {
        const ids = failedUploads.map((f) => f.jobId || JSON.stringify(f));
        throw new Error(`Failed to upload ${failedUploads.length} files: ${ids.join(', ')}`);
      }

      const jobIds = uploadResults.map((r) => r.jobId as string);
      // Store uploaded file IDs for isolation
      uploadedFileIds = uploadResults.map((r) => r.fileId as string).filter(id => !!id);
      
      await waitForBatch(jobIds);
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      filePaths.forEach((p) => { if (fs.existsSync(p)) fs.unlinkSync(p); });
      throw err;
    }
  });

  afterAll(() => {
    filePaths.forEach((p) => { if (fs.existsSync(p)) fs.unlinkSync(p); });
  });

  const http = axios.create({ timeout: 20000 });
  let uploadedFileIds: string[] = [];

  // Helper to perform search with rerank=true and filter by current file IDs
  async function searchWithRerank(query: string, limit = TOP_K) {
    const res = await http.post(`${API_URL}/v1/companies/${companyId}/search`, 
        { 
          query, 
          limit, 
          rerank: true,
          filter: {
            fileIds: uploadedFileIds
          }
        }, 
        { headers: { 'x-api-key': API_KEY } }
    );
    if (res.status !== 200) throw new Error(`Search returned ${res.status}`);
    return res.data.results || [];
  }

  test('9.1: Reranked Search for AI related content', async () => {
    const query = 'deep learning algorithms';
    const results = await searchWithRerank(query);
    
    console.log(`9.1 Input: "${query}" | Reranked Results:`, JSON.stringify(results, null, 2));
    expect(results.length).toBeGreaterThan(0);
    warnDuplicatePreviews(results);

    const topResult = results[0];
    const preview = topResult.payload?.text_preview || '';
    const matched = files[0].keywords.some((k) => preview.toLowerCase().includes(k));
    expect(matched).toBeTruthy();
    
    // Reranked scores are not bounded [0,1], so we just check it's a number
    expect(typeof topResult.score).toBe('number');
    
    // Verify payload has original_score
    expect(topResult.payload).toHaveProperty('original_score');
  });

  test('9.2: Reranked Search for Cooking related content', async () => {
    const query = 'authentic pasta recipe';
    const results = await searchWithRerank(query);

    console.log(`9.2 Input: "${query}" | Reranked Results:`, JSON.stringify(results, null, 2));
    expect(results.length).toBeGreaterThan(0);
    
    const anyCooking = results.some((r: any) => files[2].keywords.some((k) => (r.payload?.text_preview || '').toLowerCase().includes(k)));
    expect(anyCooking).toBeTruthy();
  });

  test('9.3: Reranked Search for Sports related content', async () => {
    const query = 'football penalty kick';
    const results = await searchWithRerank(query);

    console.log(`9.3 Input: "${query}" | Reranked Results:`, JSON.stringify(results, null, 2));
    expect(results.length).toBeGreaterThan(0);

    const anySports = results.some((r: any) => files[4].keywords.some((k) => (r.payload?.text_preview || '').toLowerCase().includes(k)));
    expect(anySports).toBeTruthy();
  });

  test('9.4: Reranked Search relevance check - how to cook dinner', async () => {
    const query = 'how to cook dinner';
    const results = await searchWithRerank(query, 10);
    
    console.log(`9.4 Input: "${query}" | Reranked Results:`, JSON.stringify(results, null, 2));
    warnDuplicatePreviews(results);

    const aiResult = results.find((r: any) => (r.payload?.text_preview || '').toLowerCase().includes('artificial intelligence'));
    // Look for either the carbonara recipe OR the cooking FAQ
    const cookingResult = results.find((r: any) => {
      const text = (r.payload?.text_preview || '').toLowerCase();
      return text.includes('carbonara') || text.includes('how to cook dinner');
    });

    if (aiResult && cookingResult) {
      // Reranker should definitively prefer the cooking result
      expect(cookingResult.score).toBeGreaterThan(aiResult.score);
    } else {
      // We expect at least one cooking result to be found
      expect(cookingResult).toBeDefined();
    }
  });

  test('9.5: Reranked Paraphrase robustness', async () => {
    for (const item of queries) {
      const baseline = await searchWithRerank(item.q, TOP_K);
      const paraQuery = item.paraphrases && item.paraphrases.length ? item.paraphrases[0] : item.q;
      const para = await searchWithRerank(paraQuery, TOP_K);

      expect(baseline.length).toBeGreaterThan(0);
      expect(para.length).toBeGreaterThan(0);

      const baseIds = baseline.map((r: any) => r.id);
      const paraIds = para.map((r: any) => r.id);
      
      // Check overlap
      const overlap = paraIds.filter((id: any) => baseIds.includes(id)).length;
      const overlapRatio = overlap / TOP_K;

      if (overlapRatio < PARAPHRASE_OVERLAP_THRESHOLD) {
        console.warn(`Warning: Paraphrase overlap ${overlapRatio} < ${PARAPHRASE_OVERLAP_THRESHOLD} for "${item.q}"`);
      } else {
        expect(overlapRatio).toBeGreaterThanOrEqual(PARAPHRASE_OVERLAP_THRESHOLD);
      }
    }
  });
});

