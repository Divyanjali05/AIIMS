import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { JourneyService } from '../services/journey.service';
import { assessmentHistoryQuerySchema } from '../schemas/journey.schema';
import { logger } from '../utils/logger';

/**
 * Helper: Extract authenticated user ID
 */
const getUserId = (req: AuthenticatedRequest): string => {
  const user = req.user;
  if (!user) throw new Error('UNAUTHORIZED');
  return String(user.id || user._id);
};

/**
 * GET /api/journey/overview
 */
export const getJourneyOverview = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const overview = await JourneyService.getJourneyOverview(userId);
    return res.status(200).json({ success: true, data: overview });
  } catch (err: any) {
    logger.error('Error fetching journey overview:', err);
    if (err.message === 'LEARNER_NOT_FOUND') {
      return res
        .status(404)
        .json({ error: 'Learner profile not found', code: 'LEARNER_NOT_FOUND' });
    }
    return res
      .status(500)
      .json({ error: 'Failed to fetch journey overview', code: 'INTERNAL_ERROR' });
  }
};

/**
 * GET /api/journey/assessment-history
 */
export const getAssessmentHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const parsedQuery = assessmentHistoryQuerySchema.parse(req.query);
    const result = await JourneyService.getAssessmentHistory(userId, parsedQuery);
    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    logger.error('Error fetching assessment history:', err);
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid query parameters', details: err.errors });
    }
    return res
      .status(500)
      .json({ error: 'Failed to fetch assessment history', code: 'INTERNAL_ERROR' });
  }
};

/**
 * GET /api/journey/clarity-progress
 */
export const getClarityProgress = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const progress = await JourneyService.getClarityProgress(userId);
    return res.status(200).json({ success: true, data: progress });
  } catch (err: any) {
    logger.error('Error fetching clarity progress:', err);
    return res
      .status(500)
      .json({ error: 'Failed to fetch clarity progress', code: 'INTERNAL_ERROR' });
  }
};

/**
 * GET /api/journey/focus-activity
 */
export const getFocusActivity = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const activity = await JourneyService.getFocusActivity(userId);
    return res.status(200).json({ success: true, data: activity });
  } catch (err: any) {
    logger.error('Error fetching focus activity:', err);
    return res
      .status(500)
      .json({ error: 'Failed to fetch focus activity', code: 'INTERNAL_ERROR' });
  }
};

/**
 * GET /api/journey/analytics
 */
export const getPerformanceAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const analytics = await JourneyService.getPerformanceAnalytics(userId);
    return res.status(200).json({ success: true, data: analytics });
  } catch (err: any) {
    logger.error('Error fetching performance analytics:', err);
    return res
      .status(500)
      .json({ error: 'Failed to fetch performance analytics', code: 'INTERNAL_ERROR' });
  }
};

/**
 * GET /api/journey/next-action
 */
export const getNextBestAction = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserId(req);
    const overview = await JourneyService.getJourneyOverview(userId);
    return res.status(200).json({ success: true, data: overview.nextBestAction });
  } catch (err: any) {
    logger.error('Error fetching next best action:', err);
    return res.status(500).json({ error: 'Failed to fetch next action', code: 'INTERNAL_ERROR' });
  }
};
