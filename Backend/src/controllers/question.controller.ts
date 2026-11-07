import { Request, Response } from 'express';
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
import {
  QuestionBank,
  IQuestionBank,
  inMemoryQuestionBank,
  QuestionStatus,
} from '../models/QuestionBank.model';
import { aiQuestionGeneratorService } from '../services/aiQuestionGenerator.service';
import { creditsLedgerService } from '../services/creditsLedger.service';
import mongoose from 'mongoose';

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

    const learnerId = String(req.user._id || req.user.id);
    const { topic, level, track } = parseResult.data;

    const result = await questionBankService.serveQuestion({
      learnerId,
      topic,
      level,
      track: track || 'General', // Default to Non-Coder General track!
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

    const learnerId = String(req.user._id || req.user.id);
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

    const learnerId = String(req.user._id || req.user.id);
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
 * Enforces ownership: cannot access other users' history.
 */
export const getAttemptHistoryHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const learnerId = String(req.user._id || req.user.id);
    const { topic, level } = req.query as { topic?: string; level?: string };

    const history = await questionBankService.getAttemptHistory(learnerId, { topic, level });

    return res.status(200).json({
      success: true,
      count: history.length,
      history,
    });
  } catch (err: any) {
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
 * Lists questions with optional topic, level, track, status, and source filters.
 */
export const adminListQuestionsHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topic, level, track, status, source } = req.query as Record<string, string>;
    const query: any = {};

    if (topic) query.topic = topic;
    if (level) query.level = level;
    if (track) query.track = track;
    if (status) query.status = status;
    if (source) query.source = source;

    if (mongoose.connection.readyState === 1) {
      const questions = await QuestionBank.find(query).sort({ createdAt: -1 }).lean();
      return res.status(200).json({ count: questions.length, questions });
    }

    let questions = Array.from(inMemoryQuestionBank.values());
    if (topic) questions = questions.filter((q) => q.topic === topic);
    if (level) questions = questions.filter((q) => q.level === level);
    if (track) questions = questions.filter((q) => q.track === track);
    if (status) questions = questions.filter((q) => q.status === status);
    if (source) questions = questions.filter((q) => q.source === source);

    return res.status(200).json({ count: questions.length, questions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to list questions' });
  }
};

/**
 * POST /api/admin/questions
 * Creates a human-authored question with schema validation.
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

    const adminId = String(req.user?._id || req.user?.id || 'admin');
    const data = parseResult.data;
    const questionId =
      data.questionId ||
      `qb-human-${data.topic.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`;

    const newQuestion = {
      ...data,
      questionId,
      source: 'Human' as const,
      status: data.status || 'ACTIVE',
      version: 1,
      createdBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saved = await questionBankService.saveQuestion(newQuestion);
    return res.status(201).json({ success: true, question: saved });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create question' });
  }
};

/**
 * PUT /api/admin/questions/:id
 * Edits an existing question.
 */
export const adminUpdateQuestionHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = adminUpdateQuestionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid update payload',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    if (mongoose.connection.readyState === 1) {
      const updated = await QuestionBank.findOneAndUpdate(
        { questionId: id },
        { ...parseResult.data, $inc: { version: 1 }, updatedAt: new Date() },
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: 'Question not found' });
      return res.status(200).json({ success: true, question: updated });
    }

    const existing = inMemoryQuestionBank.get(id);
    if (!existing) return res.status(404).json({ error: 'Question not found' });
    const merged = {
      ...existing,
      ...parseResult.data,
      version: (existing.version || 1) + 1,
      updatedAt: new Date(),
    };
    inMemoryQuestionBank.set(id, merged);
    return res.status(200).json({ success: true, question: merged });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update question' });
  }
};

/**
 * PATCH /api/admin/questions/:id/status
 * Updates a question's status (APPROVE, REJECT, ACTIVE, INACTIVE, etc.) with audit logging.
 */
export const adminUpdateStatusHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = adminUpdateStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid status payload',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    const { status, note } = parseResult.data;
    const adminId = String(req.user?._id || req.user?.id || 'admin');

    if (mongoose.connection.readyState === 1) {
      const updated = await QuestionBank.findOneAndUpdate(
        { questionId: id },
        {
          status,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNotes: note,
          updatedAt: new Date(),
        },
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: 'Question not found' });
      return res.status(200).json({ success: true, question: updated });
    }

    const existing = inMemoryQuestionBank.get(id);
    if (!existing) return res.status(404).json({ error: 'Question not found' });
    existing.status = status;
    existing.reviewedBy = adminId;
    existing.reviewedAt = new Date();
    existing.reviewNotes = note;
    existing.updatedAt = new Date();
    inMemoryQuestionBank.set(id, existing);
    return res.status(200).json({ success: true, question: existing });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update status' });
  }
};

/**
 * GET /api/admin/questions/stats
 * Generates coverage report against minimum targets.
 */
export const adminGetCoverageStatsHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const coverage = await questionBankService.getCoverageReport();
    return res.status(200).json({
      success: true,
      targetPerLevel: 30,
      coverage,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch coverage stats' });
  }
};

/**
 * GET /api/admin/questions/exclusion-config
 * Retrieves active institution exclusion configuration.
 */
export const adminGetExclusionConfigHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = await questionBankService.getExclusionConfig();
    return res.status(200).json({
      success: true,
      config,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch exclusion config' });
  }
};

/**
 * PUT /api/admin/questions/exclusion-config
 * Updates institution exclusion configuration.
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

    const adminId = String(req.user?._id || req.user?.id || 'admin');
    const { scope, exclusionDays } = parseResult.data;

    const updated = await questionBankService.updateExclusionConfig(scope, exclusionDays, adminId);
    return res.status(200).json({
      success: true,
      config: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update exclusion config' });
  }
};

/**
 * POST /api/admin/questions/generate-ai
 * Allows administrator to explicitly trigger AI question generation for testing.
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
    return res.status(500).json({ error: err.message || 'AI generation failed' });
  }
};
