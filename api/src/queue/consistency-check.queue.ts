import { Queue } from 'bullmq';
import { CONFIG } from '../config';

// The queue definition for consistency checks
export const consistencyCheckQueue = new Queue('consistency-check-queue', {
  connection: {
    host: CONFIG.REDIS_HOST,
    port: CONFIG.REDIS_PORT,
  },
});
