import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { generalApiRateLimiter } from '../middleware/rateLimit.middleware';
import { validateQuery } from '../middleware/validate.middleware';
import { assessmentHistoryQuerySchema } from '../schemas/journey.schema';
import {
  getJourneyOverview,
  getAssessmentHistory,
  getClarityProgress,
  getFocusActivity,
  getPerformanceAnalytics,
  getNextBestAction,
} from '../controllers/journey.controller';

const router = Router();

router.use(generalApiRateLimiter);

// All journey endpoints strictly enforce authentication and device session binding
router.get('/journey/overview', requireAuth, getJourneyOverview);
router.get(
  '/journey/assessment-history',
  requireAuth,
  validateQuery(assessmentHistoryQuerySchema),
  getAssessmentHistory
);
router.get('/journey/clarity-progress', requireAuth, getClarityProgress);
router.get('/journey/focus-activity', requireAuth, getFocusActivity);
router.get('/journey/analytics', requireAuth, getPerformanceAnalytics);
router.get('/journey/next-action', requireAuth, getNextBestAction);

export default router;
