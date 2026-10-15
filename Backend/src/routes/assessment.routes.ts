import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getQuestions,
  submitAssessment,
  getPeerBenchmarks,
  getIndividualAnalysis,
  getComparativeAnalysis,
  getOverallAnalysis
} from '../controllers/assessment.controller';

const router = Router();

// Assessment routes
router.get('/assessments/questions', getQuestions);
router.post('/assessments/submit', requireAuth, submitAssessment);

// Analysis routes
router.get('/analysis/peer-benchmarks', getPeerBenchmarks);
router.get('/analysis/individual', getIndividualAnalysis);
router.get('/analysis/comparative', getComparativeAnalysis);
router.get('/analysis/overall', getOverallAnalysis);

export default router;
