import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { adminRateLimiter } from '../middleware/rateLimit.middleware';
import {
  createEvaluator,
  updateEvaluatorStatus,
  listEvaluators,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  getSummaryReport,
  getAuditLogs,
} from '../controllers/admin.controller';

const router = Router();

// Rate limit all admin routes
router.use('/admin', adminRateLimiter);

// Admin Evaluator Management
router.post('/admin/evaluators', requireAuth, requireRole('admin'), createEvaluator);
router.patch(
  '/admin/evaluators/:id/status',
  requireAuth,
  requireRole('admin'),
  updateEvaluatorStatus
);
router.get('/admin/evaluators', requireAuth, requireRole('admin'), listEvaluators);

// Admin Task Catalogue Management (tasks can be listed by learners/evaluators as well)
router.get('/admin/tasks', requireAuth, listTasks);
router.post('/admin/tasks', requireAuth, requireRole('admin'), createTask);
router.put('/admin/tasks/:id', requireAuth, requireRole('admin'), updateTask);
router.delete('/admin/tasks/:id', requireAuth, requireRole('admin'), deleteTask);

// Admin Analytics & Auditing
router.get('/admin/reports/summary', requireAuth, requireRole('admin'), getSummaryReport);
router.get('/admin/audit-logs', requireAuth, requireRole('admin'), getAuditLogs);

export default router;
