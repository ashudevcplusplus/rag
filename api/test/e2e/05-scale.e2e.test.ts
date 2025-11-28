import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { API_URL, API_KEY, COMPANY_ID } from './config';
import { uploadFileWithTiming, uploadBatch } from '../lib/uploader';
import { waitForIndexing, waitForBatch } from '../lib/index-wait';

describe('Level 5: Extreme Scale Tests', () => {
  const DATA_DIR = path.join(__dirname, '../data');
  const companyId = COMPANY_ID;

  test('5.1: Large File Upload (5MB)', async () => {
    if (!fs.existsSync(DATA_DIR)) {
        console.warn('Skipping scale test - data dir missing');
        return;
    }

    const largeFiles = ['5mb.txt'].filter((f) =>
      fs.existsSync(path.join(DATA_DIR, f))
    );

    if (largeFiles.length === 0) {
      console.warn('No large test files found');
      return;
    }

    const filePath = path.join(DATA_DIR, largeFiles[0]);
    const upload = await uploadFileWithTiming(companyId, filePath);

    expect(upload.success).toBe(true);
    expect(upload.jobId).toBeDefined();
    if (!upload.jobId) throw new Error('Job ID missing');

    const indexResult = await waitForIndexing(upload.jobId, 600000);
    expect(indexResult.success).toBe(true);
  }, 600000);

  test('5.2: Concurrent Uploads', async () => {
     if (!fs.existsSync(DATA_DIR)) return;

    const companyId2 = COMPANY_ID;
    const files = ['5mb.txt', '1mb.txt'].filter((f) => fs.existsSync(path.join(DATA_DIR, f)));

    if (files.length < 2) {
      console.warn('Need at least 2 files for concurrent test');
      return;
    }

    const filePaths = files.map((f) => path.join(DATA_DIR, f));
    const uploadPromises = filePaths.map((fp) => uploadFileWithTiming(companyId2, fp));
    const uploadResults = await Promise.all(uploadPromises);

    const jobIds = uploadResults.filter((r) => r.success && r.jobId).map((r) => r.jobId as string);
    expect(jobIds.length).toBeGreaterThanOrEqual(2);

    const indexResults = await waitForBatch(jobIds, 600000);
    const successCount = indexResults.filter((r) => r.success).length;

    expect(successCount).toBe(jobIds.length);
  }, 600000);

  test('5.3: Stress Test - Multiple Files', async () => {
    if (!fs.existsSync(DATA_DIR)) return;

    const companyId3 = COMPANY_ID;
    const files = ['5mb.txt', '1mb.txt'].filter((f) => fs.existsSync(path.join(DATA_DIR, f)));

    if (files.length === 0) return;

    const filePaths = files.map((f) => path.join(DATA_DIR, f));
    const uploadResults = await uploadBatch(companyId3, filePaths);

    const jobIds = uploadResults.filter((r) => r.success && r.jobId).map((r) => r.jobId as string);

    const indexResults = await waitForBatch(jobIds, 600000);
    const successCount = indexResults.filter((r) => r.success).length;

    expect(successCount).toBe(jobIds.length);
  }, 600000);
});

