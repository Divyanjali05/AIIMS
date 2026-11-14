import { Response } from 'express';
import { Submission as PrismaSubmission } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma, isDatabaseConnected } from '../config/prisma';
import { RUBRIC_CRITERIA, validateRubricEvaluation } from '../config/rubric.config';
import { writeAuditLog } from '../services/auditLog.service';
import { isValidId, toArray, toRecord, withLegacyId } from '../utils/id';
import { toJsonInput } from '../utils/userMapper';

function submissionToDTO(row: PrismaSubmission) {
  return withLegacyId({
    ...row,
    learner: row.learnerId,
    evaluator: row.evaluatorId ?? null,
    rubricScores: toRecord(row.rubricScores),
    statusHistory: toArray(row.statusHistory),
  });
}

/**
 * Format milliseconds into human-readable waiting time string.
 */
function formatWaitingTime(ms: number): string {
  if (ms < 0) ms = 0;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * GET /evaluator/queue
 * Lists submissions in the queue (status === 'submitted'), ordered oldest first.
 * Includes task name and waiting time.
 */
export const getEvaluationQueue = async (_req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const now = Date.now();

  try {
    const queueItems = await prisma.submission.findMany({
      where: { status: 'submitted' },
      orderBy: [{ submittedAt: 'asc' }, { createdAt: 'asc' }],
    });

    const enriched = queueItems.map((item) => {
      const submittedTime = item.submittedAt ? new Date(item.submittedAt).getTime() : now;
      const waitingTimeMs = Math.max(0, now - submittedTime);
      return {
        ...submissionToDTO(item),
        waitingTimeMs,
        waitingTimeFormatted: formatWaitingTime(waitingTimeMs),
      };
    });

    return res.json({
      success: true,
      count: enriched.length,
      queue: enriched,
    });
  } catch (err: any) {
    console.warn('[EvaluatorQueue] DB query failed:', err.message);
    return res
      .status(500)
      .json({ error: 'Failed to load evaluation queue.', details: err.message });
  }
};

/**
 * POST /evaluator/submissions/:id/claim
 * Atomically claims a submission for evaluation, moving status to 'in_review'.
 * Race-safe: only one evaluator succeeds if multiple try concurrently.
 * Enforces self-review prevention: evaluator cannot claim their own submission.
 */
export const claimSubmission = async (req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  const user = req.user!;
  const evaluatorId = String(user.id || user._id);
  const now = new Date();

  try {
    // 1. Inspect existing submission for self-review prevention
    const existingSub = await prisma.submission.findUnique({ where: { id } });
    if (!existingSub) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    // SELF-REVIEW PREVENTION
    if (String(existingSub.learnerId) === evaluatorId) {
      return res.status(403).json({
        error: 'Forbidden: evaluators cannot claim or evaluate their own submissions.',
        code: 'SELF_REVIEW_FORBIDDEN',
      });
    }

    // Status check
    if (existingSub.status !== 'submitted') {
      return res.status(409).json({
        error: `Conflict: submission is not available for claim (current status: '${existingSub.status}').`,
        code: 'ALREADY_CLAIMED_OR_INACTIVE',
      });
    }

    // 2. Atomic race-safe claim in PostgreSQL
    const nextHistory = [
      ...toArray(existingSub.statusHistory),
      {
        changedBy: evaluatorId,
        changedByName: user.name,
        changedAt: now,
        fromStatus: 'submitted',
        toStatus: 'in_review',
        note: `Claimed for evaluation by ${user.name}`,
      },
    ];

    const claimUpdate = await prisma.submission.updateMany({
      where: {
        id,
        status: 'submitted',
        evaluatorId: null,
      },
      data: {
        status: 'in_review',
        evaluatorId,
        evaluatorName: user.name,
        statusHistory: toJsonInput(nextHistory),
      },
    });

    if (claimUpdate.count === 0) {
      return res.status(409).json({
        error:
          'Conflict: submission was claimed concurrently by another evaluator or is no longer available.',
        code: 'ALREADY_CLAIMED',
      });
    }

    const claimed = await prisma.submission.findUnique({ where: { id } });
    if (!claimed) {
      return res.status(404).json({ error: 'Submission not found after claim.' });
    }

    // Write audit log entry
    await writeAuditLog({
      actor: evaluatorId,
      actorName: user.name,
      actorRole: user.role || 'evaluator',
      action: 'CLAIM_SUBMISSION',
      target: String(claimed.id),
      targetType: 'Submission',
      details: { taskId: claimed.taskId, learner: claimed.learnerId },
    });

    return res.json({
      success: true,
      message: 'Submission claimed successfully.',
      submission: submissionToDTO(claimed),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to claim submission.', details: err.message });
  }
};

/**
 * POST /evaluator/submissions/:id/review
 * Submits rubric scores, written feedback, and outcome decision ('revision_requested' or 'accepted').
 */
export const submitReview = async (req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  const rubricScores = req.body.rubricScores || req.body.scores;
  const writtenFeedback = req.body.writtenFeedback ?? req.body.feedback;
  let decision = req.body.decision || req.body.status;
  if (typeof decision === 'string') {
    decision = decision.toLowerCase();
  }
  const user = req.user!;
  const evaluatorIdStr = String(user.id || user._id);
  const now = new Date();

  try {
    const submission = await prisma.submission.findUnique({ where: { id } });
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    // SELF-REVIEW PREVENTION
    if (String(submission.learnerId) === evaluatorIdStr) {
      return res.status(403).json({
        error: 'Forbidden: evaluators cannot evaluate their own submissions.',
        code: 'SELF_REVIEW_FORBIDDEN',
      });
    }

    // Status check: must be 'in_review'
    if (submission.status !== 'in_review') {
      return res.status(400).json({
        error: `Invalid status transition: reviews can only be submitted for submissions currently 'in_review' (current status: '${submission.status}').`,
        code: 'INVALID_STATUS_TRANSITION',
      });
    }

    // Assigned evaluator check (unless admin)
    const assignedEvaluatorStr = String(submission.evaluatorId || '');
    if (user.role !== 'admin' && assignedEvaluatorStr !== evaluatorIdStr) {
      return res.status(403).json({
        error: 'Forbidden: this submission is claimed by a different evaluator.',
        code: 'NOT_ASSIGNED_EVALUATOR',
      });
    }

    // RUBRIC & FEEDBACK VALIDATION
    const validation = validateRubricEvaluation(rubricScores, writtenFeedback);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error,
        code: 'INVALID_RUBRIC_EVALUATION',
        rubricCriteria: RUBRIC_CRITERIA,
      });
    }

    // Validate decision outcome
    const validDecisions = ['revision_requested', 'accepted', 'feedback_given'];
    const finalDecision = decision || 'feedback_given';
    if (!validDecisions.includes(finalDecision)) {
      return res.status(400).json({
        error: `Invalid evaluation decision '${decision}'. Permitted decisions: 'revision_requested' or 'accepted'.`,
        code: 'INVALID_DECISION',
      });
    }

    // Prepare status history transitions
    const historyEntries: any[] = [
      {
        changedBy: evaluatorIdStr,
        changedByName: user.name,
        changedAt: now,
        fromStatus: 'in_review',
        toStatus: 'feedback_given',
        note: 'Rubric scores and written feedback provided by evaluator',
      },
    ];

    if (finalDecision !== 'feedback_given') {
      historyEntries.push({
        changedBy: evaluatorIdStr,
        changedByName: user.name,
        changedAt: new Date(now.getTime() + 100),
        fromStatus: 'feedback_given',
        toStatus: finalDecision,
        note: `Outcome decision: ${finalDecision}`,
      });
    }

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        rubricScores: toJsonInput(rubricScores),
        writtenFeedback: writtenFeedback.trim(),
        status: finalDecision,
        reviewedAt: now,
        statusHistory: toJsonInput([...toArray(submission.statusHistory), ...historyEntries]),
      },
    });

    await writeAuditLog({
      actor: evaluatorIdStr,
      actorName: user.name,
      actorRole: user.role || 'evaluator',
      action: 'SUBMIT_REVIEW',
      target: String(updated.id),
      targetType: 'Submission',
      details: {
        decision: finalDecision,
        rubricScores,
        writtenFeedbackLength: writtenFeedback.trim().length,
      },
    });

    return res.json({
      success: true,
      message: `Evaluation submitted successfully. Status: '${finalDecision}'.`,
      submission: submissionToDTO(updated),
    });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: 'Failed to submit evaluation review.', details: err.message });
  }
};
