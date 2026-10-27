import { Router } from 'express';
import { authenticateStudent, requireAuth, requireRole } from '../middleware/auth.middleware';
import { authRateLimiter, createRateLimiter } from '../middleware/rateLimit.middleware';
import { validateBody } from '../middleware/validate.middleware';
import {
  loginSchema,
  registerSchema,
  updateProfileSchema,
  deleteAccountSchema,
} from '../schemas/auth.schema';
import {
  login,
  register,
  getProfile,
  getMe,
  logout,
  updateProfile,
  setPassword,
  totpSetup,
  totpVerifySetup,
  totpVerifyLogin,
  deleteAccount,
  getPublicConfig,
} from '../controllers/auth.controller';

const router = Router();

// Public app configuration endpoint (support contact, etc.)
router.get('/config/public', getPublicConfig);

// TOTP second-step rate limiter: 10 attempts per 10 minutes per IP
const totpRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: 'Too many 2FA attempts. Please wait before trying again.',
});

router.post('/auth/login', authRateLimiter, validateBody(loginSchema), login);
router.post('/auth/register', authRateLimiter, validateBody(registerSchema), register);
router.post('/auth/logout', logout);
router.post('/auth/set-password', setPassword);

// In-app account deletion: permanently purges personal data with "DELETE" confirmation
router.delete(
  '/auth/account',
  authenticateStudent,
  requireAuth,
  validateBody(deleteAccountSchema),
  deleteAccount
);
router.post(
  '/auth/delete-account',
  authenticateStudent,
  requireAuth,
  validateBody(deleteAccountSchema),
  deleteAccount
);

// \"Who am I\" — lightweight session-restore endpoint used by the frontend on page load
router.get('/auth/me', authenticateStudent, requireAuth, getMe);

router.get('/users/profile', requireAuth, getProfile);
router.put('/users/profile', requireAuth, validateBody(updateProfileSchema), updateProfile);

// ── TOTP 2FA endpoints ────────────────────────────────────────────────────────
// Setup: authenticated staff only
router.post(
  '/auth/totp/setup',
  authenticateStudent,
  requireAuth,
  requireRole('evaluator', 'admin'),
  totpSetup
);
router.post(
  '/auth/totp/verify-setup',
  authenticateStudent,
  requireAuth,
  requireRole('evaluator', 'admin'),
  totpVerifySetup
);
// Second-step login: unauthenticated (uses userId from first-factor response), rate-limited
router.post('/auth/totp/verify', totpRateLimiter, totpVerifyLogin);

export default router;
