import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  login,
  register,
  getProfile,
  updateProfile
} from '../controllers/auth.controller';

const router = Router();

router.post('/auth/login', login);
router.post('/auth/register', register);
router.get('/users/profile', requireAuth, getProfile);
router.put('/users/profile', requireAuth, updateProfile);

export default router;
