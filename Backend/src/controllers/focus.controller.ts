import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { FocusSessionService } from '../services/focusSession.service';
import { logger } from '../utils/logger';

/**
 * GET /api/focus/active
 * Get currently active focus session for authenticated learner
 */
export const getActiveFocusSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = req.user!._id ? req.user!._id.toString() : (req.user as any).id;
    const session = await FocusSessionService.getActiveSession(learnerId);

    return res.json({
      success: true,
      activeSession: session,
    });
  } catch (error: any) {
    logger.error('[FocusController] getActiveFocusSession error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve active focus session',
      code: 'FOCUS_ACTIVE_ERROR',
    });
  }
};

/**
 * POST /api/focus/start
 * Start a new focus session
 */
export const startFocusSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = req.user!._id ? req.user!._id.toString() : (req.user as any).id;
    const {
      trackTitle,
      intention,
      focusDurationMinutes,
      breakDurationMinutes,
      enableLongBreak,
      longBreakDurationMinutes,
      longBreakInterval,
      soundEnabled,
    } = req.body;

    const { session, isExisting } = await FocusSessionService.startSession({
      learnerId,
      trackTitle,
      intention,
      focusDurationMinutes,
      breakDurationMinutes,
      enableLongBreak,
      longBreakDurationMinutes,
      longBreakInterval,
      soundEnabled,
    });

    return res.status(isExisting ? 200 : 201).json({
      success: true,
      isExisting,
      session,
      message: isExisting
        ? 'Active session already exists for this learner.'
        : 'Focus session started.',
    });
  } catch (error: any) {
    logger.error('[FocusController] startFocusSession error:', error);
    return res.status(500).json({
      error: 'Failed to start focus session',
      code: 'FOCUS_START_ERROR',
    });
  }
};

/**
 * POST /api/focus/pause
 * Pause an active focus session
 */
export const pauseFocusSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = req.user!._id ? req.user!._id.toString() : (req.user as any).id;
    const { sessionId } = req.body;

    const session = await FocusSessionService.pauseSession(learnerId, sessionId);

    return res.json({
      success: true,
      session,
      message: 'Focus session paused.',
    });
  } catch (error: any) {
    if (error.message === 'NO_ACTIVE_FOCUS_SESSION') {
      return res.status(404).json({
        error: 'No active focus session found to pause',
        code: 'NO_ACTIVE_SESSION',
      });
    }
    if (error.message === 'SESSION_ID_MISMATCH') {
      return res.status(409).json({
        error: 'Provided sessionId does not match active session',
        code: 'SESSION_ID_MISMATCH',
      });
    }
    if (error.message === 'SESSION_NOT_PAUSABLE') {
      return res.status(400).json({
        error: 'Session is not in a pausable state',
        code: 'SESSION_NOT_PAUSABLE',
      });
    }
    logger.error('[FocusController] pauseFocusSession error:', error);
    return res.status(500).json({
      error: 'Failed to pause focus session',
      code: 'FOCUS_PAUSE_ERROR',
    });
  }
};

/**
 * POST /api/focus/resume
 * Resume a paused focus session
 */
export const resumeFocusSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = req.user!._id ? req.user!._id.toString() : (req.user as any).id;
    const { sessionId } = req.body;

    const session = await FocusSessionService.resumeSession(learnerId, sessionId);

    return res.json({
      success: true,
      session,
      message: 'Focus session resumed.',
    });
  } catch (error: any) {
    if (error.message === 'NO_ACTIVE_FOCUS_SESSION') {
      return res.status(404).json({
        error: 'No active focus session found to resume',
        code: 'NO_ACTIVE_SESSION',
      });
    }
    if (error.message === 'SESSION_ID_MISMATCH') {
      return res.status(409).json({
        error: 'Provided sessionId does not match active session',
        code: 'SESSION_ID_MISMATCH',
      });
    }
    if (error.message === 'SESSION_NOT_PAUSED') {
      return res.status(400).json({
        error: 'Session is not paused',
        code: 'SESSION_NOT_PAUSED',
      });
    }
    logger.error('[FocusController] resumeFocusSession error:', error);
    return res.status(500).json({
      error: 'Failed to resume focus session',
      code: 'FOCUS_RESUME_ERROR',
    });
  }
};

/**
 * POST /api/focus/complete
 * Authoritatively verify and complete active focus period
 */
export const completeFocusPeriod = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = req.user!._id ? req.user!._id.toString() : (req.user as any).id;
    const { sessionId } = req.body;

    const { session, record } = await FocusSessionService.completePeriod(learnerId, sessionId);

    return res.json({
      success: true,
      session,
      record,
      message: 'Focus period completed successfully.',
    });
  } catch (error: any) {
    if (error.message === 'NO_ACTIVE_FOCUS_SESSION') {
      return res.status(404).json({
        error: 'No active focus session found to complete',
        code: 'NO_ACTIVE_SESSION',
      });
    }
    if (error.message === 'SESSION_ID_MISMATCH') {
      return res.status(409).json({
        error: 'Provided sessionId does not match active session',
        code: 'SESSION_ID_MISMATCH',
      });
    }
    if (error.message === 'FOCUS_DURATION_INCOMPLETE') {
      return res.status(400).json({
        error:
          'Target focus duration has not elapsed yet. Session cannot be claimed as completed early.',
        code: 'FOCUS_DURATION_INCOMPLETE',
      });
    }
    logger.error('[FocusController] completeFocusPeriod error:', error);
    return res.status(500).json({
      error: 'Failed to complete focus period',
      code: 'FOCUS_COMPLETE_ERROR',
    });
  }
};

/**
 * POST /api/focus/break
 * Start short or long break
 */
export const startBreakPeriod = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = req.user!._id ? req.user!._id.toString() : (req.user as any).id;
    const { sessionId, forceLongBreak } = req.body;

    const session = await FocusSessionService.startBreak(learnerId, { sessionId, forceLongBreak });

    return res.json({
      success: true,
      session,
      message: 'Break period started.',
    });
  } catch (error: any) {
    if (error.message === 'NO_COMPLETED_SESSION_FOR_BREAK') {
      return res.status(400).json({
        error: 'Cannot start break without an active or recently completed focus period',
        code: 'NO_COMPLETED_SESSION',
      });
    }
    logger.error('[FocusController] startBreakPeriod error:', error);
    return res.status(500).json({
      error: 'Failed to start break period',
      code: 'FOCUS_BREAK_ERROR',
    });
  }
};

/**
 * POST /api/focus/abandon
 * Abort active session
 */
export const abandonFocusSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = req.user!._id ? req.user!._id.toString() : (req.user as any).id;
    const { sessionId } = req.body;

    const { session, savedToHistory } = await FocusSessionService.abandonSession(
      learnerId,
      sessionId
    );

    return res.json({
      success: true,
      session,
      savedToHistory,
      message: 'Focus session ended.',
    });
  } catch (error: any) {
    if (error.message === 'NO_ACTIVE_FOCUS_SESSION') {
      return res.status(404).json({
        error: 'No active focus session found to abandon',
        code: 'NO_ACTIVE_SESSION',
      });
    }
    logger.error('[FocusController] abandonFocusSession error:', error);
    return res.status(500).json({
      error: 'Failed to abandon focus session',
      code: 'FOCUS_ABANDON_ERROR',
    });
  }
};

/**
 * GET /api/focus/stats
 * Get server-calculated daily statistics & active session
 */
export const getFocusStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = req.user!._id ? req.user!._id.toString() : (req.user as any).id;
    const stats = await FocusSessionService.getDailyStats(learnerId);

    return res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    logger.error('[FocusController] getFocusStats error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve focus statistics',
      code: 'FOCUS_STATS_ERROR',
    });
  }
};

/**
 * GET /api/focus/history
 * Get focus session history
 */
export const getFocusHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = req.user!._id ? req.user!._id.toString() : (req.user as any).id;
    const filter = req.query.filter === 'completed' ? 'completed' : 'all';

    const history = await FocusSessionService.getSessionHistory(learnerId, filter);

    return res.json({
      success: true,
      history,
    });
  } catch (error: any) {
    logger.error('[FocusController] getFocusHistory error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve focus history',
      code: 'FOCUS_HISTORY_ERROR',
    });
  }
};

/**
 * PUT /api/focus/config
 * Update learner focus & break configuration preferences
 */
export const updateFocusConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = req.user!._id ? req.user!._id.toString() : (req.user as any).id;
    const updated = await FocusSessionService.updateConfig(learnerId, req.body);

    return res.json({
      success: true,
      config: updated,
      message: 'Focus configuration updated.',
    });
  } catch (error: any) {
    logger.error('[FocusController] updateFocusConfig error:', error);
    return res.status(500).json({
      error: 'Failed to update focus configuration',
      code: 'FOCUS_CONFIG_ERROR',
    });
  }
};
