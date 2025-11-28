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
    },
    {
      name: `rerank_doc4_large_${runSuffix}.txt`,
      content: `The history of writing traces the development of expressing language by letters or other marks and also the studies and descriptions of these developments. In the history of how writing systems have evolved in different human civilizations, more complete writing systems were preceded by proto-writing, systems of ideographic or early mnemonic symbols. True writing, in which the content of a linguistic utterance is encoded so that another reader can reconstruct, with a fair degree of accuracy, the exact utterance written down, is a later development. It is distinguished from proto-writing, which typically avoids encoding grammatical words and affixes, making it more difficult or even impossible to reconstruct the exact meaning intended by the writer unless a great deal of context is already known in advance.

Cuneiform script is one of the earliest systems of writing, emerging in Sumer in the late fourth millennium BC. At first, the Sumerians used a series of pictograms to record information such as crop yields and business accounts. Over time, these pictograms became more abstract and evolved into wedge-shaped characters that could be impressed into wet clay using a stylus. This innovation allowed for more complex records and the preservation of knowledge over long periods. The evolution of writing systems continued with the development of hieroglyphs in Egypt and the Indus script in the Indus Valley.

The Phoenician alphabet, which developed around 1050 BC, is considered the ancestor of almost all modern alphabets. It was a phonetic system where each symbol represented a distinct sound, making it easier to learn and use compared to earlier logographic systems. This alphabet was adopted and adapted by the Greeks, who added vowels, creating the first true alphabet. The Greek alphabet then influenced the Etruscan and Latin alphabets, the latter of which became the most widely used writing system in the world today.

In East Asia, the Chinese writing system developed independently, using logograms to represent words or morphemes. This system has remained in continuous use for thousands of years, evolving in style but retaining its core structure. Meanwhile, in the Americas, the Maya civilization developed a sophisticated writing system involving a combination of logograms and syllabic glyphs. The diversity of writing systems reflects the ingenuity of human cultures in finding ways to record and transmit information across time and space.

The secret unique needle found in the middle chunk.

The printing press, invented by Johannes Gutenberg in the 15th century, revolutionized the spread of information. Before this invention, books were copied by hand, a laborious and expensive process that limited the availability of knowledge. The printing press made it possible to produce books quickly and cheaply, leading to a surge in literacy and the rapid dissemination of ideas. This technological advancement played a crucial role in the Renaissance, the Reformation, and the Scientific Revolution.

In the modern era, the digital revolution has once again transformed how we write and communicate. The advent of computers and the internet has created new forms of writing, such as email, instant messaging, and social media posts. These digital platforms allow for instant communication across the globe, breaking down geographical barriers. However, they also present new challenges, such as the spread of misinformation and the erosion of privacy.

Despite these changes, the fundamental purpose of writing remains the same: to record and share human thought. From clay tablets to digital screens, writing has been an essential tool for civilization, enabling us to build on the knowledge of previous generations. As technology continues to evolve, so too will the ways in which we write, ensuring that this ancient art form remains a vital part of the human experience.

The future of writing is likely to be shaped by artificial intelligence and other emerging technologies. AI-powered tools can already generate text, translate languages, and even assist with creative writing. While some fear that these technologies could replace human writers, others believe they will serve as powerful assistants, augmenting human creativity and efficiency.`,
      keywords: ['unique needle'],
    },
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
      filePaths.forEach((p) => {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });
      throw err;
    }
  });

  afterAll(() => {
    filePaths.forEach((p) => {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });
  });

  const http = axios.create({ timeout: 30000 });

  test('8.1: Search with reranking enabled returns results with original_score in payload', async () => {
    const query = 'fox story';
    const res = await http.post(
      `${API_URL}/v1/companies/${companyId}/search`,
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
    const resStandard = await http.post(
      `${API_URL}/v1/companies/${companyId}/search`,
      { query, limit: 3, rerank: false },
      { headers: { 'x-api-key': API_KEY } }
    );
    const standardResults = resStandard.data.results;

    // Reranked search
    const resRerank = await http.post(
      `${API_URL}/v1/companies/${companyId}/search`,
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

  test('8.3: Search matches specific chunk in large file with reranking', async () => {
    const query = 'secret unique needle';
    const res = await http.post(
      `${API_URL}/v1/companies/${companyId}/search`,
      { query, limit: 3, rerank: true },
      { headers: { 'x-api-key': API_KEY } }
    );

    expect(res.status).toBe(200);
    const results = res.data.results;

    expect(results.length).toBeGreaterThan(0);

    // Find the result from the large file
    const largeFileResult = results.find((r: any) =>
      r.payload.text_preview.includes('secret unique needle')
    );

    expect(largeFileResult).toBeDefined();
    // Verify it has rerank score
    expect(largeFileResult.payload).toHaveProperty('original_score');
    // Verify chunk index is likely not 0 (since it's in the middle)
    expect(largeFileResult.payload.chunkIndex).toBeGreaterThan(0);
  });
});
