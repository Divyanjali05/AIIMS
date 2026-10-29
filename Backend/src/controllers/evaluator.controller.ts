import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Submission, memorySubmissions } from '../models/Submission.model';
import { RUBRIC_CRITERIA, validateRubricEvaluation } from '../config/rubric.config';
import { writeAuditLog } from '../models/AuditLog.model';

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
export const getEvaluationQueue = async (req: AuthenticatedRequest, res: Response) => {
  const now = Date.now();

  if (mongoose.connection.readyState === 1) {
    try {
      const queueItems = await Submission.find({ status: 'submitted' })
        .sort({ submittedAt: 1, createdAt: 1 })
        .lean();

      const enriched = queueItems.map((item) => {
        const submittedTime = item.submittedAt ? new Date(item.submittedAt).getTime() : now;
        const waitingTimeMs = Math.max(0, now - submittedTime);
        return {
          ...item,
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
    }
  }

  // Fallback to memory store
  const queueItems = memorySubmissions
    .filter((s) => s.status === 'submitted')
    .sort((a, b) => {
      const timeA = new Date(a.submittedAt || a.createdAt).getTime();
      const timeB = new Date(b.submittedAt || b.createdAt).getTime();
      return timeA - timeB;
    })
    .map((item) => {
      const submittedTime = item.submittedAt ? new Date(item.submittedAt).getTime() : now;
      const waitingTimeMs = Math.max(0, now - submittedTime);
      return {
        ...item,
        waitingTimeMs,
        waitingTimeFormatted: formatWaitingTime(waitingTimeMs),
      };
    });

  return res.json({
    success: true,
    count: queueItems.length,
    queue: queueItems,
  });
};

/**
 * POST /evaluator/submissions/:id/claim
 * Atomically claims a submission for evaluation, moving status to 'in_review'.
 * Race-safe: only one evaluator succeeds if multiple try concurrently.
 * Enforces self-review prevention: evaluator cannot claim their own submission.
 */
export const claimSubmission = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const evaluatorId = user._id || user.id;
  const evaluatorIdStr = String(evaluatorId);
  const now = new Date();

  // 1. First inspect the submission to prevent self-review
  let existingSub: any = null;
  if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
    existingSub = await Submission.findById(id).lean();
  }
  if (!existingSub) {
    existingSub = memorySubmissions.find((s) => String(s._id) === id || String(s.id) === id);
  }

  if (!existingSub) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  // SELF-REVIEW PREVENTION (Requirement 8)
  const learnerIdStr = String(existingSub.learner?._id || existingSub.learner);
  if (learnerIdStr === evaluatorIdStr) {
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

  // 2. Atomic race-safe claim in MongoDB
  if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
    const claimed = await Submission.findOneAndUpdate(
      {
        _id: id,
        status: 'submitted',
        evaluator: null,
      },
      {
        $set: {
          status: 'in_review',
          evaluator: evaluatorId,
          evaluatorName: user.name,
        },
        $push: {
          statusHistory: {
            changedBy: evaluatorId,
            changedByName: user.name,
            changedAt: now,
            fromStatus: 'submitted',
            toStatus: 'in_review',
            note: `Claimed for evaluation by ${user.name}`,
          },
        },
      },
      { returnDocument: 'after' }
    );

    if (!claimed) {
      return res.status(409).json({
        error:
          'Conflict: submission was claimed concurrently by another evaluator or is no longer available.',
        code: 'ALREADY_CLAIMED',
      });
    }

    // Write audit log entry (Requirement 9)
    await writeAuditLog({
      actor: evaluatorId,
      actorName: user.name,
      actorRole: user.role || 'evaluator',
      action: 'CLAIM_SUBMISSION',
      target: String(claimed._id),
      targetType: 'Submission',
      details: { taskId: claimed.taskId, learner: claimed.learner },
    });

    return res.json({
      success: true,
      message: 'Submission claimed successfully.',
      submission: claimed,
    });
  }

  // Fallback atomic memory claim
  if (existingSub.status !== 'submitted' || existingSub.evaluator) {
    return res.status(409).json({
      error: 'Conflict: submission was already claimed by another evaluator.',
      code: 'ALREADY_CLAIMED',
    });
  }

  existingSub.status = 'in_review';
  existingSub.evaluator = evaluatorId;
  existingSub.evaluatorName = user.name;
  existingSub.statusHistory = existingSub.statusHistory || [];
  existingSub.statusHistory.push({
    changedBy: evaluatorId,
    changedByName: user.name,
    changedAt: now,
    fromStatus: 'submitted',
    toStatus: 'in_review',
    note: `Claimed for evaluation by ${user.name}`,
  });

  await writeAuditLog({
    actor: evaluatorId,
    actorName: user.name,
    actorRole: user.role || 'evaluator',
    action: 'CLAIM_SUBMISSION',
    target: String(existingSub._id || existingSub.id),
    targetType: 'Submission',
    details: { taskId: existingSub.taskId, learner: existingSub.learner },
  });

  return res.json({
    success: true,
    message: 'Submission claimed successfully.',
    submission: existingSub,
  });
};

/**
 * POST /evaluator/submissions/:id/review
 * Submits rubric scores, written feedback, and outcome decision ('revision_requested' or 'accepted').
 * Enforces:
 *   - Evaluator cannot self-review
 *   - Only assigned evaluator (or admin) can review
 *   - Status must be 'in_review'
 *   - All criteria in rubric config must be scored (1 to 5)
 *   - Written feedback must be non-empty
 *   - Audit log recorded
 */
export const submitReview = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { rubricScores, writtenFeedback, decision } = req.body;
  const user = req.user!;
  const evaluatorIdStr = String(user._id || user.id);
  const now = new Date();

  let submission: any = null;
  if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
    submission = await Submission.findById(id);
  }
  if (!submission) {
    submission = memorySubmissions.find((s) => String(s._id) === id || String(s.id) === id);
  }

  if (!submission) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  // SELF-REVIEW PREVENTION (Requirement 8)
  const learnerIdStr = String(submission.learner?._id || submission.learner);
  if (learnerIdStr === evaluatorIdStr) {
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
  const assignedEvaluatorStr = String(submission.evaluator?._id || submission.evaluator);
  if (user.role !== 'admin' && assignedEvaluatorStr !== evaluatorIdStr) {
    return res.status(403).json({
      error: 'Forbidden: this submission is claimed by a different evaluator.',
      code: 'NOT_ASSIGNED_EVALUATOR',
    });
  }

  // RUBRIC & FEEDBACK VALIDATION (Requirement 7)
  const validation = validateRubricEvaluation(rubricScores, writtenFeedback);
  if (!validation.valid) {
    return res.status(400).json({
      error: validation.error,
      code: 'INVALID_RUBRIC_EVALUATION',
      rubricCriteria: RUBRIC_CRITERIA,
    });
  }

  // Validate decision outcome: must be 'revision_requested' or 'accepted'
  const validDecisions = ['revision_requested', 'accepted', 'feedback_given'];
  const finalDecision = decision || 'feedback_given';
  if (!validDecisions.includes(finalDecision)) {
    return res.status(400).json({
      error: `Invalid evaluation decision '${decision}'. Permitted decisions: 'revision_requested' or 'accepted'.`,
      code: 'INVALID_DECISION',
    });
  }

  // Prepare status history transitions
  // Flow: in_review -> feedback_given -> finalDecision (if decision is revision_requested or accepted)
  const historyEntries: any[] = [
    {
      changedBy: user._id || user.id,
      changedByName: user.name,
      changedAt: now,
      fromStatus: 'in_review',
      toStatus: 'feedback_given',
      note: 'Rubric scores and written feedback provided by evaluator',
    },
  ];

  if (finalDecision !== 'feedback_given') {
    historyEntries.push({
      changedBy: user._id || user.id,
      changedByName: user.name,
      changedAt: new Date(now.getTime() + 100),
      fromStatus: 'feedback_given',
      toStatus: finalDecision,
      note: `Outcome decision: ${finalDecision}`,
    });
  }

  if (mongoose.connection.readyState === 1 && typeof submission.save === 'function') {
    submission.rubricScores = rubricScores;
    submission.writtenFeedback = writtenFeedback.trim();
    submission.status = finalDecision;
    submission.reviewedAt = now;
    submission.statusHistory.push(...historyEntries);
    await submission.save();

    // Audit log (Requirement 9)
    await writeAuditLog({
      actor: user._id || user.id,
      actorName: user.name,
      actorRole: user.role || 'evaluator',
      action: 'SUBMIT_REVIEW',
      target: String(submission._id),
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
      submission,
    });
  }

  // Memory fallback
  submission.rubricScores = rubricScores;
  submission.writtenFeedback = writtenFeedback.trim();
  submission.status = finalDecision;
  submission.reviewedAt = now;
  submission.statusHistory = submission.statusHistory || [];
  submission.statusHistory.push(...historyEntries);

  await writeAuditLog({
    actor: user._id || user.id,
    actorName: user.name,
    actorRole: user.role || 'evaluator',
    action: 'SUBMIT_REVIEW',
    target: String(submission._id || submission.id),
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
    submission,
  });
};
