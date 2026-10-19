import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { aiExecutionRateLimiter } from '../middleware/rateLimit.middleware';
import {
  getGaps,
  mentorOverride,
  generatePrompt,
  runTask,
  saveTaskScore,
  suggestReflection
} from '../controllers/clarity.controller';

const router = Router();

router.get('/clarity/gaps', getGaps);
router.post('/clarity/mentor-override', requireAuth, mentorOverride);
router.post('/clarity/generate-prompt', requireAuth, aiExecutionRateLimiter, generatePrompt);
router.post('/clarity/run-task', requireAuth, aiExecutionRateLimiter, runTask);
router.post('/clarity/save-task-score', requireAuth, saveTaskScore);
router.post('/clarity/suggest-reflection', requireAuth, suggestReflection);

export default router;

