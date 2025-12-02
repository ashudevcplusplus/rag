import { Queue } from 'bullmq';
import { CONFIG } from '../config';

// Single queue for all async tasks
export const asyncTasksQueue = new Queue('async-tasks-queue', {
  connection: {
    host: CONFIG.REDIS_HOST,
    port: CONFIG.REDIS_PORT,
  },
});

// Export for backward compatibility
export { indexingQueue } from './queue.client';
export { consistencyCheckQueue } from './consistency-check.queue';
