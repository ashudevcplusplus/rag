export interface CompanyConfig {
  apiUrl: string;
  apiKey: string;
  companyId: string;
}

export interface Project {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  fileCount?: number;
  vectorCount?: number;
  status?: string;
  createdAt: string;
  ownerId?: string;
}

export interface SearchResult {
  score: number;
  payload: {
    content?: string;
    text?: string;
    text_preview?: string;
    fileId?: string;
    fileName?: string;
    originalFilename?: string;
    projectId?: string;
    projectName?: string;
    chunkIndex?: number;
    totalChunks?: number;
  };
}

export interface FileUploadResult {
  file: string;
  success: boolean;
  jobId?: string;
  error?: string;
}

export interface JobStatus {
  state: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
}
