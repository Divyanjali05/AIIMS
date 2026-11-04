import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { aiExecutionRateLimiter, clarityRateLimiter } from '../middleware/rateLimit.middleware';
import { requireClarityUnlocked } from '../middleware/featureLock.middleware';
import {
  getGaps,
  mentorOverride,
  generatePrompt,
  runTask,
  submitClarityTask,
  getActiveClarityTask,
  serveNextClarityTask,
  getProgressionHandler,
  getProgressionConfigHandler,
  updateProgressionConfigHandler,
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

// Decoupled Run vs Submit Actions:
// Run executes against test scenario without locking
router.post('/clarity/run', requireAuth, requireClarityUnlocked, aiExecutionRateLimiter, runTask);
router.post(
  '/clarity/run-task',
  requireAuth,
  requireClarityUnlocked,
  aiExecutionRateLimiter,
  runTask
);

// Submit executes authoritative rubric evaluation, logs attempt, awards credits, updates progression, and locks task
router.post('/clarity/submit', requireAuth, requireClarityUnlocked, submitClarityTask);

// Task lifecycle & progression
router.post('/clarity/active-task', requireAuth, requireClarityUnlocked, getActiveClarityTask);
router.get('/clarity/active-task', requireAuth, requireClarityUnlocked, getActiveClarityTask);
router.post('/clarity/next-task', requireAuth, requireClarityUnlocked, serveNextClarityTask);
router.get('/clarity/progression', requireAuth, requireClarityUnlocked, getProgressionHandler);

// Progression configuration (Admin)
router.get('/clarity/progression-config', requireAuth, getProgressionConfigHandler);
router.put(
  '/clarity/progression-config',
  requireAuth,
  requireRole('admin'),
  updateProgressionConfigHandler
);

// Legacy / Helper endpoints
router.post('/clarity/save-task-score', requireAuth, requireClarityUnlocked, saveTaskScore);
router.post('/clarity/suggest-reflection', requireAuth, requireClarityUnlocked, suggestReflection);

export default router;
