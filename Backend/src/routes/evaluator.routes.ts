import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { evaluatorRateLimiter } from '../middleware/rateLimit.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { evaluatorReviewSchema } from '../schemas/submission.schema';
import {
  getEvaluationQueue,
  claimSubmission,
  submitReview,
} from '../controllers/evaluator.controller';

const router = Router();

// Rate limit all evaluator endpoints
router.use('/evaluator', evaluatorRateLimiter);

// Evaluator endpoints (guarded by requireRole('evaluator', 'admin'))
router.get('/evaluator/queue', requireAuth, requireRole('evaluator', 'admin'), getEvaluationQueue);
router.post(
  '/evaluator/submissions/:id/claim',
  requireAuth,
  requireRole('evaluator', 'admin'),
  claimSubmission
);
router.post(
  '/evaluator/submissions/:id/review',
  requireAuth,
  requireRole('evaluator', 'admin'),
  validateBody(evaluatorReviewSchema),
  submitReview
);

export default router;
