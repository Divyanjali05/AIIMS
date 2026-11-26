import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import {
  MIN_COMPLETED_QUESTIONS_FOR_WALLET,
  getCompletedQuestionsCount,
  isWalletUnlocked,
} from '../config/walletUnlock.config';

/**
 * Middleware that guards AI Wallet endpoints from direct access before the threshold is satisfied.
 * Enforces server-side security so UI hiding cannot be bypassed by direct API calls.
 */
export const requireWalletUnlock = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }

  // Admin and Evaluator roles bypass the learner threshold
  if (req.user.role === 'admin' || req.user.role === 'evaluator') {
    return next();
  }

  const completedCount = getCompletedQuestionsCount(req.user);

  if (completedCount < MIN_COMPLETED_QUESTIONS_FOR_WALLET) {
    return res.status(403).json({
      error: `AI Wallet is locked. You must complete at least ${MIN_COMPLETED_QUESTIONS_FOR_WALLET} questions across Clarity and Focus to unlock it. Currently completed: ${completedCount} of ${MIN_COMPLETED_QUESTIONS_FOR_WALLET}.`,
      code: 'WALLET_LOCKED',
      completedQuestionsCount: completedCount,
      requiredThreshold: MIN_COMPLETED_QUESTIONS_FOR_WALLET,
      unlocked: false,
    });
  }

  return next();
};
