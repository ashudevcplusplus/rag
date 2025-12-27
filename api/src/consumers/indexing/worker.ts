import { IndexingJobData, JobResult } from '../../types/job.types';
import { createWorker } from '../../utils/worker-factory';
import { processIndexingJob } from './processor';

const worker = createWorker<IndexingJobData, JobResult>('indexing-queue', processIndexingJob, {
  concurrency: 2,
  logPrefix: 'Indexing',
});

export default worker;
