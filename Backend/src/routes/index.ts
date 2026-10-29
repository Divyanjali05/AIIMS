import { Router } from 'express';
import { authenticateStudent } from '../middleware/auth.middleware';
import { generalApiRateLimiter } from '../middleware/rateLimit.middleware';
import authRoutes from './auth.routes';
import creditsRoutes from './credits.routes';
import assessmentRoutes from './assessment.routes';
import clarityRoutes from './clarity.routes';
import investigationRoutes from './investigation.routes';
import learnerRoutes from './learner.routes';
import aiWalletRoutes from './aiWallet.routes';
import submissionRoutes from './submission.routes';
import evaluatorRoutes from './evaluator.routes';
import adminRoutes from './admin.routes';

export { CREDIT_RULES } from '../config/credits.config';
export { registeredUsers } from '../controllers/auth.controller';

const router = Router();

// Rate limit incoming requests before authentication and route handlers
router.use(generalApiRateLimiter);

// Apply student authentication middleware globally to extract token if present
router.use(authenticateStudent);

// Mount modular sub-routers
router.use(authRoutes);
router.use(creditsRoutes);
router.use(assessmentRoutes);
router.use(clarityRoutes);
router.use(investigationRoutes);
router.use(learnerRoutes);
router.use(aiWalletRoutes);
router.use(submissionRoutes);
router.use(evaluatorRoutes);
router.use(adminRoutes);

export default router;
