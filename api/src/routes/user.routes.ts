import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import {
  createUser,
  getUser,
  listUsers,
  updateUser,
  deleteUser,
  setUserActive,
} from '../controllers/user.controller';

const router = Router({ mergeParams: true });

router.post('/', asyncHandler(createUser));
router.get('/', asyncHandler(listUsers));
router.get('/:userId', asyncHandler(getUser));
router.patch('/:userId', asyncHandler(updateUser));
router.delete('/:userId', asyncHandler(deleteUser));
router.post('/:userId/active', asyncHandler(setUserActive));

export default router;
