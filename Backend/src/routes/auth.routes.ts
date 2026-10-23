import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimit.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { loginSchema, registerSchema, updateProfileSchema } from '../schemas/auth.schema';
import { login, register, getProfile, updateProfile } from '../controllers/auth.controller';

const router = Router();

router.post('/auth/login', authRateLimiter, validateBody(loginSchema), login);
router.post('/auth/register', authRateLimiter, validateBody(registerSchema), register);
router.get('/users/profile', requireAuth, getProfile);
router.put('/users/profile', requireAuth, validateBody(updateProfileSchema), updateProfile);

export default router;
