import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { aiExecutionRateLimiter, clarityRateLimiter } from '../middleware/rateLimit.middleware';
import { requireClarityUnlocked } from '../middleware/featureLock.middleware';
import {
  getGaps,
  mentorOverride,
  generatePrompt,
  runTask,
  saveTaskScore,
  suggestReflection,
} from '../controllers/clarity.controller';

const router = Router();

// Rate limit clarity operations
router.use('/clarity', clarityRateLimiter);

router.get('/clarity/gaps', getGaps);
router.post('/clarity/mentor-override', requireAuth, requireClarityUnlocked, mentorOverride);
router.post(
  '/clarity/generate-prompt',
  requireAuth,
  requireClarityUnlocked,
  aiExecutionRateLimiter,
  generatePrompt
);
router.post(
  '/clarity/run-task',
  requireAuth,
  requireClarityUnlocked,
  aiExecutionRateLimiter,
  runTask
);
router.post('/clarity/save-task-score', requireAuth, requireClarityUnlocked, saveTaskScore);
router.post('/clarity/suggest-reflection', requireAuth, requireClarityUnlocked, suggestReflection);

export default router;
