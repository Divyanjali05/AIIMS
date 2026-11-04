import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { aiExecutionRateLimiter, generalApiRateLimiter } from '../middleware/rateLimit.middleware';
import { validateBody } from '../middleware/validate.middleware';
import {
  focusOverrideSchema,
  radarFollowSchema,
  submitInvestigationSchema,
  generateRelevanceSchema,
  mentorAdviceSchema,
} from '../schemas/investigation.schema';
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

router.use('/focus', generalApiRateLimiter);
router.use('/radar', generalApiRateLimiter);

router.get('/focus/areas', getFocusAreas);
router.post('/focus/override', requireAuth, validateBody(focusOverrideSchema), overrideFocus);
router.get('/radar/signals', getRadarSignals);
router.post('/radar/follow', requireAuth, validateBody(radarFollowSchema), toggleFollowSignal);

router.post(
  '/investigations/submit',
  requireAuth,
  requireInvestigationUnlocked,
  validateBody(submitInvestigationSchema),
  aiExecutionRateLimiter,
  submitInvestigation
);
router.post(
  '/relevance/generate',
  requireAuth,
  requireRelevanceUnlocked,
  validateBody(generateRelevanceSchema),
  aiExecutionRateLimiter,
  generateRelevance
);
router.post(
  '/ai/mentor',
  requireAuth,
  requireMentorUnlocked,
  validateBody(mentorAdviceSchema),
  aiExecutionRateLimiter,
  getMentorAdvice
);

export default router;
