import { Router } from 'express';
import {
  createUser,
  getUser,
  listUsers,
  updateUser,
  deleteUser,
  setUserActive,
} from '../controllers/user.controller';

const router = Router({ mergeParams: true });

router.post('/', createUser);
router.get('/', listUsers);
router.get('/:userId', getUser);
router.patch('/:userId', updateUser);
router.delete('/:userId', deleteUser);
router.post('/:userId/active', setUserActive);

export default router;
