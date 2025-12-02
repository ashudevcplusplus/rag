import { ChangeType } from '../models/consumer-change.model';

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

// Event types (merged from events.types.ts)
export interface BaseEvent {
  eventId: string;
  eventType: ChangeType;
  timestamp: Date;
  companyId?: string;
  metadata?: Record<string, unknown>;
}

export interface ConsistencyCheckEvent extends BaseEvent {
  eventType: ChangeType.CONSISTENCY_CHECK;
  companyId?: string;
}

export interface CleanupOrphanedEvent extends BaseEvent {
  eventType: ChangeType.CLEANUP_ORPHANED;
  companyId?: string;
  autoFix?: boolean;
}

export type ConsumerEvent = ConsistencyCheckEvent | CleanupOrphanedEvent;

export interface ConsistencyCheckJobData {
  companyId?: string; // If undefined, check all companies
  eventId?: string; // Event ID for tracking
}

export interface CleanupOrphanedJobData {
  companyId?: string; // If undefined, cleanup all companies
  eventId?: string; // Event ID for tracking
  autoFix?: boolean; // If true, automatically cleanup after consistency check
}

export interface CheckAndFixJobData {
  companyId?: string; // If undefined, check and fix all companies
  eventId?: string; // Event ID for tracking
}

export interface ConsistencyCheckResult {
  status: 'completed' | 'failed';
  companiesChecked: number;
  discrepancies: Array<{
    companyId: string;
    companyName: string;
    issues: string[];
    dbVectorCount: number;
    qdrantVectorCount: number;
    missingInQdrant: number;
    missingInDb: number;
  }>;
}

export interface CleanupJobData {
  companyId?: string; // If undefined, cleanup all companies
}

export interface CleanupResult {
  status: 'completed' | 'failed';
  companiesProcessed: number;
  results: Array<{
    companyId: string;
    companyName: string;
    orphanedFiles: string[];
    vectorsDeleted: number;
    filesProcessed: number;
  }>;
}

export interface JobStatusResponse {
  id: string;
  state: string;
  progress: number | object;
  result?: JobResult | ConsistencyCheckResult;
  reason?: string;
}
