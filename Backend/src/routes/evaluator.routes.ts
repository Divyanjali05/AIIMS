import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import {
  getEvaluationQueue,
  claimSubmission,
  submitReview,
} from '../controllers/evaluator.controller';

const router = Router();

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
  submitReview
);

export default router;
