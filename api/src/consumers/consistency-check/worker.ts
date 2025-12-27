import { createWorker } from '../../utils/worker-factory';
import { processConsistencyCheckJob, ConsumerJobData, ConsumerJobResult } from './processor';

const worker = createWorker<ConsumerJobData, ConsumerJobResult>(
  'consistency-check-queue',
  processConsistencyCheckJob,
  {
    concurrency: 1,
    logPrefix: 'ConsistencyCheck',
    metadata: {
      supportedJobs: ['consistency-check', 'cleanup-orphaned', 'check-and-fix'],
    },
  }
);

export default worker;
