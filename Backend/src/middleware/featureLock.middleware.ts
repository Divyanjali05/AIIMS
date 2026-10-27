import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

/**
 * Middleware guards to enforce feature lock rules on the server.
 * A locked user attempting to invoke locked feature APIs directly is refused with HTTP 403 Forbidden.
 */

export const requireClarityUnlocked = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      error: 'Invalid or expired session. Please sign in again.',
      code: 'UNAUTHORIZED',
    });
  }

  // Clarity requires baseline assessment to be completed
  const isAssessmentCompleted = user.assessment?.status === 'completed';
  if (!isAssessmentCompleted) {
    return res.status(403).json({
      error: 'Clarity unlocks after your assessment profile is analyzed.',
      code: 'FEATURE_LOCKED',
      featureId: 'clarity',
      targetTab: 'assessment',
      unlockAction: 'Complete Baseline Assessment',
    });
  }

  // Clarity requires profile analysis to have been reviewed
  const isAnalysisViewed =
    user.analysis?.status === 'viewed' || user.analysis?.status === 'unlocked';
  if (!isAnalysisViewed) {
    return res.status(403).json({
      error: 'Clarity unlocks after you review your AI capability profile.',
      code: 'FEATURE_LOCKED',
      featureId: 'clarity',
      targetTab: 'analysis',
      unlockAction: 'View My AI Profile',
    });
  }

  next();
};

export const requireInvestigationUnlocked = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      error: 'Invalid or expired session. Please sign in again.',
      code: 'UNAUTHORIZED',
    });
  }

  // Level 2 Investigation is locked pending activity-gated unlocks / radar signals
  const isUnlocked =
    user.investigation?.status === 'unlocked' ||
    user.investigation?.status === 'active' ||
    user.investigation?.status === 'completed';
  if (!isUnlocked) {
    return res.status(403).json({
      error:
        'Signal Investigation is locked for now. It will unlock based on your learning activities.',
      code: 'FEATURE_LOCKED',
      featureId: 'investigation',
      targetTab: 'radar',
      unlockAction: 'Explore AI Radar',
    });
  }

  next();
};

export const requireRelevanceUnlocked = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      error: 'Invalid or expired session. Please sign in again.',
      code: 'UNAUTHORIZED',
    });
  }

  const isUnlocked =
    (user as any).relevance?.status === 'unlocked' || (user as any).relevance?.status === 'active';
  if (!isUnlocked) {
    return res.status(403).json({
      error: 'AI Relevance is locked for now. It will unlock based on your learning activities.',
      code: 'FEATURE_LOCKED',
      featureId: 'relevance',
      targetTab: 'radar',
      unlockAction: 'Explore AI Radar',
    });
  }

  next();
};

export const requireMentorUnlocked = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({
      error: 'Invalid or expired session. Please sign in again.',
      code: 'UNAUTHORIZED',
    });
  }

  const isUnlocked =
    (user as any).mentor?.status === 'unlocked' || (user as any).mentor?.status === 'active';
  if (!isUnlocked) {
    return res.status(403).json({
      error:
        'Mentor Workspace is locked for now. It will unlock based on your learning activities.',
      code: 'FEATURE_LOCKED',
      featureId: 'mentor',
      targetTab: 'home',
      unlockAction: 'Advance through Level 3',
    });
  }

  next();
};
