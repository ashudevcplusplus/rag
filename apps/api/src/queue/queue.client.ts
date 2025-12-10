import { Queue } from 'bullmq';
import { CONFIG } from '../config';

// The queue definition
export const indexingQueue = new Queue('indexing-queue', {
  connection: {
    host: CONFIG.REDIS_HOST,
    port: CONFIG.REDIS_PORT,
  },
});
