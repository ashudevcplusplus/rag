import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

const API_URL = process.env.API_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY || 'dev-key-123'; // Default test key

export interface UploadResult {
  success: boolean;
  timeMs: number;
  jobId: string | null;
  fileId?: string;
  statusUrl?: string;
  error?: string;
}

export async function uploadFileWithTiming(
  companyId: string,
  filePath: string
): Promise<UploadResult> {
  const form = new FormData();
  const fileStream = fs.createReadStream(filePath);
  form.append('file', fileStream);

  const fileName = filePath.split('/').pop() || 'unknown';
  const fileSize = fs.statSync(filePath).size;

  console.log(`   📤 Uploading ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)...`);

  const start = performance.now();

  try {
    const res = await axios.post(`${API_URL}/v1/companies/${companyId}/uploads`, form, {
      headers: {
        ...form.getHeaders(),
        'x-api-key': API_KEY,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 120000, // 2 minute timeout for large files
    });

    const end = performance.now();

    return {
      success: true,
      timeMs: end - start,
      jobId: res.data.jobId,
      fileId: res.data.fileId,
      statusUrl: res.data.statusUrl,
    };
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { status?: number; data?: unknown } };
    const end = performance.now();

    console.error(`   ❌ Upload failed: ${err.message || 'Unknown error'}`);
    if (err.response) {
      console.error(`   Status: ${err.response.status}`);
      console.error(`   Response:`, err.response.data);
    }

    return {
      success: false,
      timeMs: end - start,
      jobId: null,
      error: err.message || 'Upload failed',
    };
  }
}

export async function uploadBatch(companyId: string, filePaths: string[]): Promise<UploadResult[]> {
  console.log(`📦 Uploading batch of ${filePaths.length} files...`);

  const results: UploadResult[] = [];

  for (const filePath of filePaths) {
    const result = await uploadFileWithTiming(companyId, filePath);
    results.push(result);

    // Small delay between uploads to avoid overwhelming the system
    if (results.length < filePaths.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log(`   ✅ Batch complete: ${successCount}/${filePaths.length} successful`);

  return results;
}
