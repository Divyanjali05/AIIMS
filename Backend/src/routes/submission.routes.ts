import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { submissionRateLimiter } from '../middleware/rateLimit.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { createSubmissionSchema, resubmitTaskSchema } from '../schemas/submission.schema';
import {
  submitTask,
  getMySubmissions,
  getSubmissionById,
  resubmitTask,
} from '../controllers/submission.controller';

const router = Router();

// Rate limit all task submission endpoints
router.use('/submissions', submissionRateLimiter);

// Task Submission endpoints (open to all authenticated user roles; self-review is strictly forbidden)
router.post(
  '/submissions',
  requireAuth,
  requireRole('learner', 'evaluator', 'admin'),
  validateBody(createSubmissionSchema),
  submitTask
);
router.get(
  '/submissions',
  requireAuth,
  requireRole('learner', 'evaluator', 'admin'),
  getMySubmissions
);
router.get('/submissions/:id', requireAuth, getSubmissionById);
router.post(
  '/submissions/:id/resubmit',
  requireAuth,
  requireRole('learner', 'evaluator', 'admin'),
  validateBody(resubmitTaskSchema),
  resubmitTask
);

export default router;
