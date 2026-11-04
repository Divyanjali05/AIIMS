import { Router } from 'express';
import { resetUserDevice } from '../controllers/auth.controller';
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
import {
  adminListQuestionsHandler,
  adminCreateQuestionHandler,
  adminUpdateQuestionHandler,
  adminUpdateStatusHandler,
  adminGetCoverageStatsHandler,
  adminGetExclusionConfigHandler,
  adminUpdateExclusionConfigHandler,
  adminTriggerAIGenerationHandler,
} from '../controllers/question.controller';

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

// Admin Device Binding Management
router.post(
  '/admin/users/:userId/device-reset',
  requireAuth,
  requireRole('admin'),
  resetUserDevice
);
router.post('/admin/device-reset', requireAuth, requireRole('admin'), resetUserDevice);

// Admin Question Bank & AI Question Generation Management
router.get(
  '/admin/questions/stats',
  requireAuth,
  requireRole('admin'),
  adminGetCoverageStatsHandler
);
router.get(
  '/admin/questions/exclusion-config',
  requireAuth,
  requireRole('admin'),
  adminGetExclusionConfigHandler
);
router.put(
  '/admin/questions/exclusion-config',
  requireAuth,
  requireRole('admin'),
  adminUpdateExclusionConfigHandler
);
router.post(
  '/admin/questions/generate-ai',
  requireAuth,
  requireRole('admin'),
  adminTriggerAIGenerationHandler
);
router.get('/admin/questions', requireAuth, requireRole('admin'), adminListQuestionsHandler);
router.post('/admin/questions', requireAuth, requireRole('admin'), adminCreateQuestionHandler);
router.put('/admin/questions/:id', requireAuth, requireRole('admin'), adminUpdateQuestionHandler);
router.patch(
  '/admin/questions/:id/status',
  requireAuth,
  requireRole('admin'),
  adminUpdateStatusHandler
);

export default router;
