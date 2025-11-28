export interface IndexingJobData {
  companyId: string;
  fileId: string;
  filePath: string;
  mimetype: string;
  fileSizeMB: number;
}

export interface JobResult {
  status: 'completed' | 'failed';
  chunks: number;
}

export interface JobStatusResponse {
  id: string;
  state: string;
  progress: number | object;
  result?: JobResult;
  reason?: string;
}
