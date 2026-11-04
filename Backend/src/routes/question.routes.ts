import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { generalApiRateLimiter } from '../middleware/rateLimit.middleware';
import {
  serveQuestionHandler,
  getCurrentQuestionHandler,
  submitAttemptHandler,
  getAttemptHistoryHandler,
} from '../controllers/question.controller';

const router = Router();

// Rate limit learner question endpoints
router.use('/questions', generalApiRateLimiter);

// Learner Question Delivery & Attempt Lifecycle
router.post('/questions/serve', requireAuth, serveQuestionHandler);
router.get('/questions/current', requireAuth, getCurrentQuestionHandler);
router.post('/questions/submit', requireAuth, submitAttemptHandler);
router.get('/questions/history', requireAuth, getAttemptHistoryHandler);

export default router;
