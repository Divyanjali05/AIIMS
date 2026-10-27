import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { aiExecutionRateLimiter } from '../middleware/rateLimit.middleware';
import {
  requireInvestigationUnlocked,
  requireRelevanceUnlocked,
  requireMentorUnlocked,
} from '../middleware/featureLock.middleware';
import {
  getFocusAreas,
  overrideFocus,
  getRadarSignals,
  toggleFollowSignal,
  submitInvestigation,
  generateRelevance,
  getMentorAdvice,
} from '../controllers/investigation.controller';

const router = Router();

router.get('/focus/areas', getFocusAreas);
router.post('/focus/override', overrideFocus);
router.get('/radar/signals', getRadarSignals);
router.post('/radar/follow', toggleFollowSignal);
router.post(
  '/investigations/submit',
  requireAuth,
  requireInvestigationUnlocked,
  aiExecutionRateLimiter,
  submitInvestigation
);
router.post(
  '/relevance/generate',
  requireAuth,
  requireRelevanceUnlocked,
  aiExecutionRateLimiter,
  generateRelevance
);
router.post(
  '/ai/mentor',
  requireAuth,
  requireMentorUnlocked,
  aiExecutionRateLimiter,
  getMentorAdvice
);

export default router;
