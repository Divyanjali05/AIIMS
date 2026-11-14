import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { FocusSessionService } from '../services/focusSession.service';
import { FocusTaskService } from '../services/focusTask.service';
import { FocusStorageService, AttachmentMetadata } from '../services/focusStorage.service';
import {
  startFocusTaskSchema,
  submitFocusTaskSchema,
  adminCreateFocusQuestionSchema,
  adminUpdateFocusStatusSchema,
} from '../schemas/focus.schema';
import { logger } from '../utils/logger';

function isDbUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: unknown; message?: unknown };
  return e.code === 'DATABASE_UNAVAILABLE' || e.message === 'DATABASE_UNAVAILABLE';
}

/**
 * GET /api/focus/active
 */
export const getActiveFocusSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = String(req.user!.id || req.user!._id);
    const session = await FocusSessionService.getActiveSession(learnerId);

    return res.json({
      success: true,
      activeSession: session,
    });
  } catch (error: any) {
    if (isDbUnavailable(error)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    logger.error('[FocusController] getActiveFocusSession error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve active focus session',
      code: 'FOCUS_ACTIVE_ERROR',
    });
  }
};

/**
 * POST /api/focus/start
 */
export const startFocusSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = String(req.user!.id || req.user!._id);
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
    if (isDbUnavailable(error)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    logger.error('[FocusController] startFocusSession error:', error);
    return res.status(500).json({
      error: 'Failed to start focus session',
      code: 'FOCUS_START_ERROR',
    });
  }
};

/**
 * POST /api/focus/pause
 */
export const pauseFocusSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = String(req.user!.id || req.user!._id);
    const { sessionId } = req.body;

    const session = await FocusSessionService.pauseSession(learnerId, sessionId);

    return res.json({
      success: true,
      session,
      message: 'Focus session paused.',
    });
  } catch (error: any) {
    if (isDbUnavailable(error)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
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
 */
export const resumeFocusSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = String(req.user!.id || req.user!._id);
    const { sessionId } = req.body;

    const session = await FocusSessionService.resumeSession(learnerId, sessionId);

    return res.json({
      success: true,
      session,
      message: 'Focus session resumed.',
    });
  } catch (error: any) {
    if (isDbUnavailable(error)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
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
 */
export const completeFocusPeriod = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = String(req.user!.id || req.user!._id);
    const { sessionId } = req.body;

    const { session, record } = await FocusSessionService.completePeriod(learnerId, sessionId);

    return res.json({
      success: true,
      session,
      record,
      message: 'Focus period completed successfully.',
    });
  } catch (error: any) {
    if (isDbUnavailable(error)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
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
 */
export const startBreakPeriod = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = String(req.user!.id || req.user!._id);
    const { sessionId, forceLongBreak } = req.body;

    const session = await FocusSessionService.startBreak(learnerId, { sessionId, forceLongBreak });

    return res.json({
      success: true,
      session,
      message: 'Break period started.',
    });
  } catch (error: any) {
    if (isDbUnavailable(error)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
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
 */
export const abandonFocusSession = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = String(req.user!.id || req.user!._id);
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
    if (isDbUnavailable(error)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
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
 */
export const getFocusStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = String(req.user!.id || req.user!._id);
    const stats = await FocusSessionService.getDailyStats(learnerId);

    return res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    if (isDbUnavailable(error)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    logger.error('[FocusController] getFocusStats error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve focus statistics',
      code: 'FOCUS_STATS_ERROR',
    });
  }
};

/**
 * GET /api/focus/history
 */
export const getFocusHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = String(req.user!.id || req.user!._id);
    const filter = req.query.filter === 'completed' ? 'completed' : 'all';

    const history = await FocusSessionService.getSessionHistory(learnerId, filter);

    return res.json({
      success: true,
      history,
    });
  } catch (error: any) {
    if (isDbUnavailable(error)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    logger.error('[FocusController] getFocusHistory error:', error);
    return res.status(500).json({
      error: 'Failed to retrieve focus history',
      code: 'FOCUS_HISTORY_ERROR',
    });
  }
};

/**
 * PUT /api/focus/config
 */
export const updateFocusConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = String(req.user!.id || req.user!._id);
    const updated = await FocusSessionService.updateConfig(learnerId, req.body);

    return res.json({
      success: true,
      config: updated,
      message: 'Focus configuration updated.',
    });
  } catch (error: any) {
    if (isDbUnavailable(error)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    logger.error('[FocusController] updateFocusConfig error:', error);
    return res.status(500).json({
      error: 'Failed to update focus configuration',
      code: 'FOCUS_CONFIG_ERROR',
    });
  }
};

// ============================================================================
// Phase 5: Timed Focus Tasks, Challenge Attempts, Attachments & Admin Endpoints
// ============================================================================

/**
 * GET /api/focus/categories
 * Returns the 3 canonical Focus categories with stats and approved question counts.
 */
export const getFocusCategoriesHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const learnerId = req.user ? String(req.user.id || req.user._id) : undefined;
    const categories = await FocusTaskService.getCategories(learnerId);

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (err: any) {
    if (isDbUnavailable(err)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    logger.error('[FocusController] getFocusCategories error:', err);
    return res.status(500).json({ error: 'Failed to fetch focus categories' });
  }
};

/**
 * GET /api/focus/categories/:category/questions
 * Returns approved questions for a category, optionally filtered by level.
 * Sanitized for learners (no evaluator guidance or model answers).
 */
export const getFocusCategoryQuestionsHandler = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { category } = req.params;
    const level = req.query.level as 'Easy' | 'Medium' | 'Hard' | undefined;

    const questions = await FocusTaskService.getQuestionsForCategory(category, level);

    return res.status(200).json({
      success: true,
      count: questions.length,
      category,
      level: level || 'ALL',
      questions,
    });
  } catch (err: any) {
    if (isDbUnavailable(err)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    logger.error('[FocusController] getFocusCategoryQuestions error:', err);
    return res.status(500).json({ error: 'Failed to fetch category questions' });
  }
};

/**
 * POST /api/focus/attempts/start
 * Starts a timed task attempt with server-authoritative timestamps.
 */
export const startFocusTaskAttemptHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const parseResult = startFocusTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid start challenge payload',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    const learnerId = String(req.user.id || req.user._id);
    const { category, level, questionId } = parseResult.data;

    const result = await FocusTaskService.startAttempt({
      learnerId,
      category,
      level,
      questionId,
    });

    return res.status(result.isExisting ? 200 : 201).json({
      success: true,
      ...result,
      message: result.isExisting
        ? 'Resumed existing active focus assignment within time limit.'
        : 'Started new timed focus challenge.',
    });
  } catch (err: any) {
    if (isDbUnavailable(err)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    if (err.status === 404) {
      return res.status(404).json({ error: err.message });
    }
    logger.error('[FocusController] startFocusTaskAttempt error:', err);
    return res.status(500).json({ error: err.message || 'Failed to start focus task attempt' });
  }
};

/**
 * GET /api/focus/attempts/:assignmentId/time
 * Returns server-authoritative time remaining and expiry status.
 */
export const getFocusRemainingTimeHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const learnerId = String(req.user.id || req.user._id);
    const { assignmentId } = req.params;

    const timeData = await FocusTaskService.getTimeRemaining(assignmentId, learnerId);

    return res.status(200).json({
      success: true,
      ...timeData,
    });
  } catch (err: any) {
    if (isDbUnavailable(err)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    if (err.status === 404) {
      return res.status(404).json({ error: err.message });
    }
    logger.error('[FocusController] getFocusRemainingTime error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch remaining time' });
  }
};

/**
 * POST /api/focus/attempts/upload
 * Handles file attachment uploads with MIME & size validation and learner ownership check.
 */
export const uploadFocusAttachmentHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const learnerId = String(req.user.id || req.user._id);
    const assignmentId = String(req.body.assignmentId || req.query.assignmentId || '');
    const originalFileName = String(
      req.body.fileName || req.body.originalFileName || 'attachment.pdf'
    );
    const mimeType = String(req.body.mimeType || 'application/pdf');

    if (!assignmentId) {
      return res.status(400).json({ error: 'assignmentId is required for attachment upload' });
    }

    // Verify ownership
    const isOwner = await FocusStorageService.verifyAttemptOwnership(learnerId, assignmentId);
    if (!isOwner) {
      return res.status(403).json({
        error: 'You do not have permission to attach files to this assignment.',
        code: 'FORBIDDEN',
      });
    }

    // Accept raw base64 data or binary buffer
    let buffer: Buffer;
    if (req.body.fileBase64 && typeof req.body.fileBase64 === 'string') {
      const cleanBase64 = req.body.fileBase64.replace(/^data:.*?;base64,/, '');
      buffer = Buffer.from(cleanBase64, 'base64');
    } else if (req.body.content && typeof req.body.content === 'string') {
      buffer = Buffer.from(req.body.content, 'utf-8');
    } else {
      // Synthetic simulated upload buffer for testing
      buffer = Buffer.from('AIIMS Focus Challenge Attachment Content', 'utf-8');
    }

    const metadata = await FocusStorageService.storeAttachment({
      userId: learnerId,
      attemptId: assignmentId,
      originalFileName,
      mimeType,
      buffer,
    });

    return res.status(201).json({
      success: true,
      attachment: metadata,
      message: 'Attachment uploaded and verified successfully.',
    });
  } catch (err: any) {
    if (err.status === 400 || err.code === 'INVALID_FILE') {
      return res.status(400).json({ error: err.message });
    }
    logger.error('[FocusController] uploadFocusAttachment error:', err);
    return res.status(500).json({ error: err.message || 'Failed to upload attachment' });
  }
};

/**
 * GET /api/focus/attachments/:objectKey
 * Securely serves an uploaded attachment with IDOR ownership validation.
 */
export const downloadFocusAttachmentHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const learnerId = String(req.user.id || req.user._id);
    const objectKey = decodeURIComponent(req.params.objectKey);

    // IDOR Protection: verify key contains learnerId or user is Admin/Evaluator
    const isAdminOrEvaluator =
      req.user.role === 'admin' ||
      req.user.role === 'evaluator' ||
      (req.user as any).roles?.includes('admin') ||
      (req.user as any).roles?.includes('evaluator');

    if (!objectKey.startsWith(`focus-attachments/${learnerId}/`) && !isAdminOrEvaluator) {
      return res.status(403).json({
        error: 'Access denied: You do not have permission to view this attachment.',
        code: 'FORBIDDEN',
      });
    }

    // Parse parts: focus-attachments/:userId/:attemptId/:fileName
    const parts = objectKey.split('/');
    if (parts.length < 4) {
      return res.status(400).json({ error: 'Invalid attachment object key format.' });
    }

    const [, targetUserId, attemptId, fileName] = parts;
    const localPath = FocusStorageService.getAttachmentLocalPath(targetUserId, attemptId, fileName);

    if (!localPath) {
      return res.status(404).json({ error: 'Attachment file not found.' });
    }

    return res.sendFile(localPath);
  } catch (err: any) {
    logger.error('[FocusController] downloadFocusAttachment error:', err);
    return res.status(500).json({ error: 'Failed to retrieve attachment file.' });
  }
};

/**
 * POST /api/focus/attempts/submit
 * Submits a completed focus challenge solution for genuine AI rubric evaluation.
 * Enforces:
 * - Product Decision D5: Rejects late submission after timer expiry with HTTP 410 TASK_EXPIRED.
 * - Pricing: 20 AC on subsequent attempts, overdraft protection (402), auto-refund on AI error.
 * - Product Decision D4: NO automatic AC rewards for completion.
 */
export const submitFocusTaskAttemptHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const parseResult = submitFocusTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid challenge submission payload',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    const learnerId = String(req.user.id || req.user._id);
    const { assignmentId, answer, timeTakenSeconds, attachments, idempotencyKey } =
      parseResult.data;

    const result = await FocusTaskService.submitAttempt({
      learnerId,
      assignmentId,
      answer,
      timeTakenSeconds,
      attachments: attachments as AttachmentMetadata[],
      idempotencyKey,
    });

    return res.status(200).json({
      ...result,
      isLocked: true,
    });
  } catch (err: any) {
    if (isDbUnavailable(err)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    // Product Decision D5: Server timer expired -> HTTP 410 TASK_EXPIRED
    if (err.code === 'TASK_EXPIRED' || err.status === 410) {
      return res.status(410).json({
        error:
          err.message || 'Time limit has expired. The challenge is locked and cannot be submitted.',
        code: 'TASK_EXPIRED',
        isExpired: true,
        isLocked: true,
      });
    }

    // Duplicate submission -> HTTP 409 TASK_LOCKED
    if (err.code === 'TASK_LOCKED' || err.status === 409) {
      return res.status(409).json({
        error: err.message || 'This task has already been submitted and is locked.',
        code: 'TASK_LOCKED',
        isLocked: true,
      });
    }

    // Insufficient credits -> HTTP 402 INSUFFICIENT_CREDITS
    if (err.code === 'INSUFFICIENT_CREDITS' || err.status === 402) {
      return res.status(402).json({
        error: err.message,
        code: 'INSUFFICIENT_CREDITS',
        requiredCredits: err.requiredCredits || 20,
        currentBalance: err.currentBalance || 0,
      });
    }

    // AI rubric evaluation failed -> HTTP 502 with refund confirmation
    if (err.code === 'RUBRIC_EVALUATION_FAILED' || err.status === 502) {
      return res.status(502).json({
        error: err.message,
        code: 'RUBRIC_EVALUATION_FAILED',
        refunded: Boolean(err.refunded),
        refundAmount: err.refunded ? 20 : 0,
      });
    }

    if (err.status === 404) {
      return res.status(404).json({ error: err.message });
    }

    logger.error('[FocusController] submitFocusTaskAttempt error:', err);
    return res.status(500).json({ error: err.message || 'Failed to submit focus task' });
  }
};

/**
 * GET /api/focus/attempts/history
 * Returns learner's attempt history in Focus challenges.
 */
export const getFocusTaskHistoryHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const learnerId = String(req.user.id || req.user._id);
    const history = await FocusTaskService.getHistory(learnerId);

    return res.status(200).json({
      success: true,
      count: history.length,
      history,
    });
  } catch (err: any) {
    if (isDbUnavailable(err)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    logger.error('[FocusController] getFocusTaskHistory error:', err);
    return res.status(500).json({ error: 'Failed to retrieve focus history' });
  }
};

/**
 * GET /api/focus/attempts/progress
 * Returns aggregated progress across Focus categories.
 */
export const getFocusTaskProgressHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const learnerId = String(req.user.id || req.user._id);
    const progress = await FocusTaskService.getProgress(learnerId);

    return res.status(200).json({
      success: true,
      progress,
    });
  } catch (err: any) {
    if (isDbUnavailable(err)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    logger.error('[FocusController] getFocusTaskProgress error:', err);
    return res.status(500).json({ error: 'Failed to retrieve focus progress' });
  }
};

/**
 * GET /api/focus/admin/questions
 * Admin: list questions with optional filters.
 */
export const adminListFocusQuestionsHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, level, status } = req.query as {
      category?: string;
      level?: string;
      status?: string;
    };

    const questions = await FocusTaskService.adminListQuestions({ category, level, status });

    return res.status(200).json({
      success: true,
      count: questions.length,
      questions,
    });
  } catch (err: any) {
    logger.error('[FocusController] adminListFocusQuestions error:', err);
    return res.status(500).json({ error: 'Failed to list focus questions' });
  }
};

/**
 * POST /api/focus/admin/questions
 * Admin: create a new question draft in QuestionBank.
 */
export const adminCreateFocusQuestionHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = adminCreateFocusQuestionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid question draft payload',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    const adminEmail = req.user?.email || 'admin@aiims.education';
    const question = await FocusTaskService.adminCreateQuestion(parseResult.data, adminEmail);

    return res.status(201).json({
      success: true,
      question,
      message: 'Focus question draft created successfully.',
    });
  } catch (err: any) {
    logger.error('[FocusController] adminCreateFocusQuestion error:', err);
    return res.status(500).json({ error: 'Failed to create focus question draft' });
  }
};

/**
 * PATCH /api/focus/admin/questions/:questionId/status
 * Admin: update review status (APPROVED, DRAFT, REVIEW, REJECTED).
 */
export const adminUpdateFocusStatusHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { questionId } = req.params;
    const parseResult = adminUpdateFocusStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid status update payload',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    const adminEmail = req.user?.email || 'admin@aiims.education';
    const updated = await FocusTaskService.adminUpdateStatus(
      questionId,
      parseResult.data.status,
      parseResult.data.reviewNotes,
      adminEmail
    );

    return res.status(200).json({
      success: true,
      question: updated,
      message: `Focus question status updated to ${parseResult.data.status}.`,
    });
  } catch (err: any) {
    logger.error('[FocusController] adminUpdateFocusStatus error:', err);
    return res.status(500).json({ error: 'Failed to update focus question status' });
  }
};
