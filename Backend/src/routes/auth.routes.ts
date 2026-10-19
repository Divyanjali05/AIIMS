import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimit.middleware';
import {
  login,
  register,
  getProfile,
  updateProfile
} from '../controllers/auth.controller';

const router = Router();

router.post('/auth/login', authRateLimiter, login);
router.post('/auth/register', authRateLimiter, register);
router.get('/users/profile', requireAuth, getProfile);
router.put('/users/profile', requireAuth, updateProfile);

export default router;
