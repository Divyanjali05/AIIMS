import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma, isDatabaseConnected } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  serveQuestionSchema,
  submitAttemptSchema,
  adminCreateQuestionSchema,
  adminUpdateQuestionSchema,
  adminUpdateStatusSchema,
  adminExclusionConfigSchema,
} from '../schemas/question.schema';
import { questionBankService } from '../services/questionBank.service';
import { aiQuestionGeneratorService } from '../services/aiQuestionGenerator.service';
import { creditsLedgerService } from '../services/creditsLedger.service';
import { IQuestionBank } from '../types/models';
import { isValidId, toArray, withLegacyId } from '../utils/id';
import { toJsonInput } from '../utils/userMapper';

function isDbUnavailableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: unknown; message?: unknown };
  return e.code === 'DATABASE_UNAVAILABLE' || e.message === 'DATABASE_UNAVAILABLE';
}

/**
 * POST /api/questions/serve
 * Serves an individually assigned, unrepeated question to the authenticated learner.
 */
export const serveQuestionHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const parseResult = serveQuestionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid question serve parameters',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    const learnerId = String(req.user.id || req.user._id);
    const { topic, level, track } = parseResult.data;

    const result = await questionBankService.serveQuestion({
      learnerId,
      topic,
      level,
      track: track || 'General',
      userCollege: req.user.college,
    });

    return res.status(200).json({
      success: true,
      assignmentId: result.assignment.assignmentId,
      source: result.source,
      question: {
        questionId: result.question.questionId,
        topic: result.question.topic,
        level: result.question.level,
        track: result.question.track,
        title: result.question.title,
        promptText: result.question.promptText,
        hint: result.question.hint,
        testScenario: result.question.testScenario,
        expectedCriteria: result.question.expectedCriteria,
      },
    });
  } catch (err: any) {
    if (isDbUnavailableError(err)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    console.error('[QuestionController] serveQuestion error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to serve question',
    });
  }
};

/**
 * GET /api/questions/current
 * Returns the active in-progress question assignment for the authenticated learner.
 */
export const getCurrentQuestionHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const learnerId = String(req.user.id || req.user._id);
    const active = await questionBankService.getCurrentAssignment(learnerId);

    if (!active) {
      return res.status(200).json({
        hasActiveAssignment: false,
        assignment: null,
      });
    }

    return res.status(200).json({
      hasActiveAssignment: true,
      assignmentId: active.assignment.assignmentId,
      assignedAt: active.assignment.assignedAt,
      question: {
        questionId: active.question.questionId,
        topic: active.question.topic,
        level: active.question.level,
        track: active.question.track,
        title: active.question.title,
        promptText: active.question.promptText,
        hint: active.question.hint,
        testScenario: active.question.testScenario,
        expectedCriteria: active.question.expectedCriteria,
      },
    });
  } catch (err: any) {
    if (isDbUnavailableError(err)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    console.error('[QuestionController] getCurrentQuestion error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to fetch current question',
    });
  }
};

/**
 * POST /api/questions/submit
 * Submits an answer to an assigned question, scores it, and persists an immutable attempt record.
 */
export const submitAttemptHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const parseResult = submitAttemptSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid attempt submission',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    const learnerId = String(req.user.id || req.user._id);
    const { assignmentId, answer, timeTakenSeconds } = parseResult.data;

    const result = await questionBankService.submitAttempt({
      learnerId,
      assignmentId,
      answer,
      timeTakenSeconds,
    });

    const currentBalance = await creditsLedgerService.getBalance(learnerId);

    return res.status(200).json({
      success: true,
      attemptId: result.attempt.attemptId,
      score: result.attempt.score,
      rubricFeedback: result.attempt.rubricFeedback,
      overallFeedback: result.attempt.overallFeedback,
      submittedAt: result.attempt.submittedAt,
      reward: (result as any).reward,
      currentBalance,
    });
  } catch (err: any) {
    if (isDbUnavailableError(err)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    console.error('[QuestionController] submitAttempt error:', err);
    if (
      err.code === 'TASK_LOCKED' ||
      err.status === 409 ||
      (err.message && err.message.includes('locked')) ||
      (err.message && err.message.includes('already been submitted'))
    ) {
      return res.status(409).json({
        error: err.message || 'This task has already been submitted and is locked.',
        code: 'TASK_LOCKED',
        isLocked: true,
      });
    }
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    if (
      err.name === 'RubricEvaluationError' ||
      err.code === 'PROVIDER_UNAVAILABLE' ||
      err.code === 'PROVIDER_CALL_FAILED' ||
      err.code === 'PROVIDER_TIMEOUT' ||
      err.code === 'PROVIDER_RATE_LIMIT' ||
      err.code === 'PROVIDER_INVALID_CREDENTIALS' ||
      err.code === 'VALIDATION_FAILED_AFTER_RETRY' ||
      err.code === 'RUBRIC_EVALUATION_FAILED'
    ) {
      return res.status(502).json({
        error: err.message,
        code: err.code || 'RUBRIC_EVALUATION_FAILED',
        details: err.details,
      });
    }
    return res.status(500).json({
      error: err.message || 'Failed to submit question attempt',
    });
  }
};

/**
 * GET /api/questions/history
 * Returns the authenticated learner's attempt history.
 */
export const getAttemptHistoryHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const learnerId = String(req.user.id || req.user._id);
    const { topic, level } = req.query as { topic?: string; level?: string };

    const history = await questionBankService.getAttemptHistory(learnerId, { topic, level });

    return res.status(200).json({
      success: true,
      count: history.length,
      history,
    });
  } catch (err: any) {
    if (isDbUnavailableError(err)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    console.error('[QuestionController] getAttemptHistory error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to fetch question attempt history',
    });
  }
};

// =========================================================================
// ADMINISTRATIVE QUESTION BANK ENDPOINTS (Admin Authorization Required)
// =========================================================================

/**
 * GET /api/admin/questions
 */
export const adminListQuestionsHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    const { topic, level, track, status, source } = req.query as Record<string, string>;
    const where: Prisma.QuestionBankWhereInput = {};

    if (topic) where.topic = topic;
    if (level) where.level = level;
    if (track) where.track = track;
    if (status) where.status = status;
    if (source) where.source = source;

    const rows = await prisma.questionBank.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const questions = rows.map((q) => ({
      ...withLegacyId(q),
      scoringRubric: toArray(q.scoringRubric),
    }));

    return res.status(200).json({ count: questions.length, questions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to list questions' });
  }
};

/**
 * POST /api/admin/questions
 */
export const adminCreateQuestionHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = adminCreateQuestionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid question creation payload',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    const adminId = String(req.user?.id || req.user?._id || 'admin');
    const data = parseResult.data;
    const questionId =
      data.questionId ||
      `qb-human-${data.topic.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`;

    const newQuestion: Partial<IQuestionBank> & { questionId: string } = {
      ...data,
      questionId,
      source: 'Human',
      status: data.status || 'ACTIVE',
      version: 1,
      createdBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saved = await questionBankService.saveQuestion(newQuestion);
    return res.status(201).json({ success: true, question: saved });
  } catch (err: any) {
    if (isDbUnavailableError(err)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    return res.status(500).json({ error: err.message || 'Failed to create question' });
  }
};

/**
 * PUT /api/admin/questions/:id
 */
export const adminUpdateQuestionHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    const { id } = req.params;
    if (!id || !isValidId(id)) {
      return res.status(400).json({ error: 'Valid question ID is required.' });
    }

    const parseResult = adminUpdateQuestionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid update payload',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    const existing = await prisma.questionBank.findUnique({ where: { questionId: id } });
    if (!existing) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const d = parseResult.data;
    const updateData: Prisma.QuestionBankUpdateInput = {
      version: { increment: 1 },
      ...(d.topic !== undefined ? { topic: d.topic } : {}),
      ...(d.level !== undefined ? { level: d.level } : {}),
      ...(d.track !== undefined ? { track: d.track } : {}),
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.promptText !== undefined ? { promptText: d.promptText } : {}),
      ...(d.hint !== undefined ? { hint: d.hint } : {}),
      ...(d.testScenario !== undefined ? { testScenario: d.testScenario } : {}),
      ...(d.expectedCriteria !== undefined ? { expectedCriteria: d.expectedCriteria } : {}),
      ...(d.scoringRubric !== undefined ? { scoringRubric: toJsonInput(d.scoringRubric) } : {}),
      ...(d.source !== undefined ? { source: d.source } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
    };

    const updated = await prisma.questionBank.update({
      where: { questionId: id },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      question: {
        ...withLegacyId(updated),
        scoringRubric: toArray(updated.scoringRubric),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update question' });
  }
};

/**
 * PATCH /api/admin/questions/:id/status
 */
export const adminUpdateStatusHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    const { id } = req.params;
    if (!id || !isValidId(id)) {
      return res.status(400).json({ error: 'Valid question ID is required.' });
    }

    const parseResult = adminUpdateStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid status payload',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    const { status, note } = parseResult.data;
    const adminId = String(req.user?.id || req.user?._id || 'admin');

    const existing = await prisma.questionBank.findUnique({ where: { questionId: id } });
    if (!existing) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const updated = await prisma.questionBank.update({
      where: { questionId: id },
      data: {
        status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNotes: note ?? null,
      },
    });

    return res.status(200).json({
      success: true,
      question: {
        ...withLegacyId(updated),
        scoringRubric: toArray(updated.scoringRubric),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update status' });
  }
};

/**
 * GET /api/admin/questions/stats
 */
export const adminGetCoverageStatsHandler = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const coverage = await questionBankService.getCoverageReport();
    return res.status(200).json({
      success: true,
      targetPerLevel: 30,
      coverage,
    });
  } catch (err: any) {
    if (isDbUnavailableError(err)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    return res.status(500).json({ error: err.message || 'Failed to fetch coverage stats' });
  }
};

/**
 * GET /api/admin/questions/exclusion-config
 */
export const adminGetExclusionConfigHandler = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const config = await questionBankService.getExclusionConfig();
    return res.status(200).json({
      success: true,
      config,
    });
  } catch (err: any) {
    if (isDbUnavailableError(err)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    return res.status(500).json({ error: err.message || 'Failed to fetch exclusion config' });
  }
};

/**
 * PUT /api/admin/questions/exclusion-config
 */
export const adminUpdateExclusionConfigHandler = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const parseResult = adminExclusionConfigSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid exclusion config payload',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    const adminId = String(req.user?.id || req.user?._id || 'admin');
    const { scope, exclusionDays } = parseResult.data;

    const updated = await questionBankService.updateExclusionConfig(scope, exclusionDays, adminId);
    return res.status(200).json({
      success: true,
      config: updated,
    });
  } catch (err: any) {
    if (isDbUnavailableError(err)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    return res.status(500).json({ error: err.message || 'Failed to update exclusion config' });
  }
};

/**
 * POST /api/admin/questions/generate-ai
 */
export const adminTriggerAIGenerationHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topic, level, track } = req.body;
    if (!topic || !level) {
      return res.status(400).json({ error: 'Topic and level are required.' });
    }

    const existingPool = await questionBankService.getAllQuestionsForTopic(topic);
    const generated = await aiQuestionGeneratorService.generateQuestion({
      topic,
      level,
      track: track || 'General',
      existingQuestions: existingPool,
    });

    const saved = await questionBankService.saveQuestion(generated);
    return res.status(201).json({
      success: true,
      question: saved,
    });
  } catch (err: any) {
    if (isDbUnavailableError(err)) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    return res.status(500).json({ error: err.message || 'AI generation failed' });
  }
};
