import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getFocusAreas,
  overrideFocus,
  getRadarSignals,
  toggleFollowSignal,
  submitInvestigation,
  generateRelevance,
  getMentorAdvice
} from '../controllers/investigation.controller';

const router = Router();

router.get('/focus/areas', getFocusAreas);
router.post('/focus/override', overrideFocus);
router.get('/radar/signals', getRadarSignals);
router.post('/radar/follow', toggleFollowSignal);
router.post('/investigations/submit', requireAuth, submitInvestigation);
router.post('/relevance/generate', generateRelevance);
router.post('/ai/mentor', getMentorAdvice);

export default router;
