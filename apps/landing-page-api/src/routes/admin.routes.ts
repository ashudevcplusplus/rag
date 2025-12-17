import { Router } from 'express';
import {
  listContacts,
  getContactStats,
  updateContactStatus,
} from '../controllers/contact.controller';
import { listSubscribers, getNewsletterStats } from '../controllers/newsletter.controller';
import { authenticateAdmin } from '../middleware/auth.middleware';

const router = Router();

// All admin routes require authentication
router.use(authenticateAdmin);

// Contact admin endpoints
router.get('/contacts', listContacts);
router.get('/contacts/stats', getContactStats);
router.patch('/contacts/:id', updateContactStatus);

// Newsletter admin endpoints
router.get('/newsletter', listSubscribers);
router.get('/newsletter/stats', getNewsletterStats);

export default router;

