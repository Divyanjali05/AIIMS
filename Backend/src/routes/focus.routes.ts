import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import {
  startFocusSessionSchema,
  pauseFocusSessionSchema,
  resumeFocusSessionSchema,
  completeFocusPeriodSchema,
  startBreakPeriodSchema,
  abandonFocusSessionSchema,
  updateFocusConfigSchema,
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
} from '../controllers/focus.controller';

const router = Router();

// Focus Session Lifecycle Endpoints
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

// Focus Statistics & History Endpoints
router.get('/focus/stats', requireAuth, getFocusStats);
router.get('/focus/history', requireAuth, getFocusHistory);

// Focus Preferences Configuration Endpoint
router.put('/focus/config', requireAuth, validateBody(updateFocusConfigSchema), updateFocusConfig);

export default router;
