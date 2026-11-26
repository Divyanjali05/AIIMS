import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { generalApiRateLimiter } from '../middleware/rateLimit.middleware';
import {
  serveQuestionHandler,
  getCurrentQuestionHandler,
  submitAttemptHandler,
  getAttemptHistoryHandler,
  recordQuestionAttemptHandler,
} from '../controllers/question.controller';

const router = Router();

// Learner Question Delivery & Attempt Lifecycle
router.post('/questions/serve', requireAuth, serveQuestionHandler);
router.get('/questions/current', requireAuth, getCurrentQuestionHandler);
router.post('/questions/submit', requireAuth, submitAttemptHandler);
router.get('/questions/history', requireAuth, getAttemptHistoryHandler);
router.post('/questions/record-attempt', requireAuth, recordQuestionAttemptHandler);

export default router;
