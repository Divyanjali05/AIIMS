import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { generalApiRateLimiter } from '../middleware/rateLimit.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { submitAssessmentSchema } from '../schemas/assessment.schema';
import {
  getQuestions,
  submitAssessment,
  getPeerBenchmarks,
  getIndividualAnalysis,
  getComparativeAnalysis,
  getOverallAnalysis,
  generateAIProfile,
  getAIProfile,
  getPeerBranchComparison,
  getCohortAllComparison,
} from '../controllers/assessment.controller';

const router = Router();

router.use(generalApiRateLimiter);

// Assessment routes
router.get('/assessments/questions', getQuestions);
router.post(
  '/assessments/submit',
  requireAuth,
  validateBody(submitAssessmentSchema),
  submitAssessment
);

// Analysis routes
router.get('/analysis/peer-benchmarks', getPeerBenchmarks);
router.get('/analysis/individual', requireAuth, getIndividualAnalysis);
router.get('/analysis/comparative', getComparativeAnalysis);
router.get('/analysis/overall', getOverallAnalysis);

// AI Learner Profile & Phase 2 Comparative Intelligence
router.post('/analysis/generate-profile', requireAuth, generateAIProfile);
router.get('/analysis/ai-profile', requireAuth, getAIProfile);
router.get('/analysis/comparative/peer-branch', requireAuth, getPeerBranchComparison);
router.get('/analysis/comparative/cohort-all', getCohortAllComparison);

export default router;
