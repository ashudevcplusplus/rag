import { Worker, Processor, Job } from 'bullmq';
import { CONFIG } from '../config';
import { logger } from './logger';

/**
 * Options for creating a worker
 */
export interface WorkerOptions {
  /** Number of jobs to process in parallel (default: 1) */
  concurrency?: number;
  /** Prefix for log messages (default: queue name) */
  logPrefix?: string;
  /** Additional metadata to include in startup log */
  metadata?: Record<string, unknown>;
}

/**
 * Factory function to create a BullMQ worker with standardized event handlers
 *
 * Reduces code duplication across worker files by providing:
 * - Standard Redis connection configuration
 * - Consistent logging for completed, failed, and error events
 * - Startup logging with configuration details
 *
 * @example
 * ```typescript
 * const worker = createWorker<JobData, JobResult>(
 *   'my-queue',
 *   processMyJob,
 *   { concurrency: 2, logPrefix: 'MyWorker' }
 * );
 * ```
 */
export function createWorker<TData, TResult>(
  queueName: string,
  processor: Processor<TData, TResult>,
  options: WorkerOptions = {}
): Worker<TData, TResult> {
  const { concurrency = 1, logPrefix = queueName, metadata = {} } = options;

  const worker = new Worker<TData, TResult>(queueName, processor, {
    connection: { host: CONFIG.REDIS_HOST, port: CONFIG.REDIS_PORT },
    concurrency,
  });

  // Attach standardized event handlers
  attachEventHandlers(worker, logPrefix);

  // Log worker startup
  logger.info(`${logPrefix} worker started`, {
    queue: queueName,
    concurrency,
    ...metadata,
  });

  return worker;
}

/**
 * Attaches standard event handlers to a worker
 */
function attachEventHandlers<TData, TResult>(
  worker: Worker<TData, TResult>,
  logPrefix: string
): void {
  worker.on('completed', (job: Job<TData, TResult>) => {
    logger.info(`${logPrefix} completed job`, {
      jobId: job.id,
      jobName: job.name,
    });
  });

  worker.on('failed', (job: Job<TData, TResult> | undefined, err: Error) => {
    logger.error(`${logPrefix} failed job`, {
      jobId: job?.id,
      jobName: job?.name,
      error: err.message,
      stack: err.stack,
    });
  });

  worker.on('error', (err: Error) => {
    logger.error(`${logPrefix} error`, {
      error: err.message,
      stack: err.stack,
    });
  });
}

/**
 * Gracefully closes multiple workers
 */
export async function closeWorkers(workers: Worker[]): Promise<void> {
  await Promise.all(workers.map((worker) => worker.close()));
}
