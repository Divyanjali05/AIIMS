import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getLearnerState,
  updateLearnerState,
  getAcademicTaxonomy,
  getInstitutes,
  requestInstitute,
  getStudentProfile,
  updateStudentProfile
} from '../controllers/learner.controller';

const router = Router();

// Learner state
router.get('/learner/state', requireAuth, getLearnerState);
router.put('/learner/state', requireAuth, updateLearnerState);

// Academic taxonomy & institutes
router.get('/academic/taxonomy', getAcademicTaxonomy);
router.get('/academic/institutes', getInstitutes);
router.post('/academic/institutes/request', requireAuth, requestInstitute);

// Student profile
router.get('/student/profile', requireAuth, getStudentProfile);
router.put('/student/profile', requireAuth, updateStudentProfile);

export default router;
