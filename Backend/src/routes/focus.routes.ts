import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import {
  startFocusSessionSchema,
  pauseFocusSessionSchema,
  resumeFocusSessionSchema,
  completeFocusPeriodSchema,
  startBreakPeriodSchema,
  abandonFocusSessionSchema,
  updateFocusConfigSchema,
  startFocusTaskSchema,
  submitFocusTaskSchema,
  adminCreateFocusQuestionSchema,
  adminUpdateFocusStatusSchema,
} from '../schemas/focus.schema';
import {
  getActiveFocusSession,
  startFocusSession,
  pauseFocusSession,
  resumeFocusSession,
  completeFocusPeriod,
  startBreakPeriod,
  abandonFocusSession,
  getFocusStats,
  getFocusHistory,
  updateFocusConfig,
  getFocusCategoriesHandler,
  getFocusCategoryQuestionsHandler,
  startFocusTaskAttemptHandler,
  getFocusRemainingTimeHandler,
  uploadFocusAttachmentHandler,
  downloadFocusAttachmentHandler,
  submitFocusTaskAttemptHandler,
  getFocusTaskHistoryHandler,
  getFocusTaskProgressHandler,
  adminListFocusQuestionsHandler,
  adminCreateFocusQuestionHandler,
  adminUpdateFocusStatusHandler,
} from '../controllers/focus.controller';

const router = Router();

// ============================================================================
// 1. Focus Tasks & Challenges (Phase 5 Practice Environment)
// ============================================================================

// Categories & Question Bank Browsing
router.get('/focus/categories', getFocusCategoriesHandler);
router.get('/focus/categories/:category/questions', getFocusCategoryQuestionsHandler);

// Learner Challenge Lifecycle & Server Timer Endpoints
router.post(
  '/focus/attempts/start',
  requireAuth,
  validateBody(startFocusTaskSchema),
  startFocusTaskAttemptHandler
);
router.get('/focus/attempts/:assignmentId/time', requireAuth, getFocusRemainingTimeHandler);
router.post(
  '/focus/attempts/submit',
  requireAuth,
  validateBody(submitFocusTaskSchema),
  submitFocusTaskAttemptHandler
);

// File Attachment Storage (Cloudflare R2 / Secure Storage)
router.post('/focus/attempts/upload', requireAuth, uploadFocusAttachmentHandler);
router.get('/focus/attachments/:objectKey', requireAuth, downloadFocusAttachmentHandler);

// Challenge Attempt History & Progress Analytics
router.get('/focus/attempts/history', requireAuth, getFocusTaskHistoryHandler);
router.get('/focus/attempts/progress', requireAuth, getFocusTaskProgressHandler);

// Admin Question Bank Review & Publication Endpoints
router.get(
  '/focus/admin/questions',
  requireAuth,
  requireRole('admin', 'evaluator'),
  adminListFocusQuestionsHandler
);
router.post(
  '/focus/admin/questions',
  requireAuth,
  requireRole('admin', 'evaluator'),
  validateBody(adminCreateFocusQuestionSchema),
  adminCreateFocusQuestionHandler
);
router.patch(
  '/focus/admin/questions/:questionId/status',
  requireAuth,
  requireRole('admin', 'evaluator'),
  validateBody(adminUpdateFocusStatusSchema),
  adminUpdateFocusStatusHandler
);

// ============================================================================
// 2. Legacy Focus & Pomodoro Session Endpoints (Preserved for compatibility)
// ============================================================================
router.get('/focus/active', requireAuth, getActiveFocusSession);
router.post('/focus/start', requireAuth, validateBody(startFocusSessionSchema), startFocusSession);
router.post('/focus/pause', requireAuth, validateBody(pauseFocusSessionSchema), pauseFocusSession);
router.post(
  '/focus/resume',
  requireAuth,
  validateBody(resumeFocusSessionSchema),
  resumeFocusSession
);
router.post(
  '/focus/complete',
  requireAuth,
  validateBody(completeFocusPeriodSchema),
  completeFocusPeriod
);
router.post('/focus/break', requireAuth, validateBody(startBreakPeriodSchema), startBreakPeriod);
router.post(
  '/focus/abandon',
  requireAuth,
  validateBody(abandonFocusSessionSchema),
  abandonFocusSession
);

router.get('/focus/stats', requireAuth, getFocusStats);
router.get('/focus/history', requireAuth, getFocusHistory);
router.put('/focus/config', requireAuth, validateBody(updateFocusConfigSchema), updateFocusConfig);

export default router;
