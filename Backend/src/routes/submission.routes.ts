import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import {
  submitTask,
  getMySubmissions,
  getSubmissionById,
  resubmitTask,
} from '../controllers/submission.controller';

const router = Router();

// Task Submission endpoints (open to all authenticated user roles; self-review is strictly forbidden)
router.post('/submissions', requireAuth, requireRole('learner', 'evaluator', 'admin'), submitTask);
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
  resubmitTask
);

export default router;
