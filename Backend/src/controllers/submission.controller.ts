import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Submission, memorySubmissions } from '../models/Submission.model';
import { Task, defaultTasks } from '../models/Task.model';

/**
 * Helper to resolve task title from DB or default task catalogue.
 */
async function resolveTaskTitle(taskId: string): Promise<string> {
  if (mongoose.connection.readyState === 1) {
    try {
      const task = await Task.findOne({ taskId });
      if (task) return task.title;
    } catch {}
  }
  const fallback = defaultTasks.find((t) => t.taskId === taskId);
  return fallback ? fallback.title : `Task (${taskId})`;
}

/**
 * POST /submissions
 * Learner submits a new task solution for review.
 */
export const submitTask = async (req: AuthenticatedRequest, res: Response) => {
  const { taskId, answerContent } = req.body;

  if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
    return res.status(400).json({ error: 'Valid taskId is required.' });
  }

  if (!answerContent || typeof answerContent !== 'string' || answerContent.trim().length === 0) {
    return res.status(400).json({ error: 'Answer content is required and cannot be empty.' });
  }

  const user = req.user!;
  const userId = user._id || user.id;
  const taskTitle = await resolveTaskTitle(taskId.trim());
  const now = new Date();

  const submissionDoc = {
    learner: userId,
    learnerName: user.name,
    learnerEmail: user.email,
    taskId: taskId.trim(),
    taskTitle,
    answerContent: answerContent.trim(),
    status: 'submitted' as const,
    evaluator: null,
    evaluatorName: undefined,
    rubricScores: {},
    writtenFeedback: '',
    revisionCount: 0,
    statusHistory: [
      {
        changedBy: userId,
        changedByName: user.name,
        changedAt: now,
        fromStatus: 'none',
        toStatus: 'submitted',
        note: 'Initial task submission',
      },
    ],
    submittedAt: now,
  };

  if (mongoose.connection.readyState === 1) {
    try {
      const created = await Submission.create(submissionDoc);
      return res.status(201).json({
        success: true,
        message: 'Task submitted successfully.',
        submission: created,
      });
    } catch (err: any) {
      console.warn('[Submission] DB creation failed:', err.message);
    }
  }

  // Fallback to memory store
  const memoryDoc = {
    _id: new mongoose.Types.ObjectId().toHexString(),
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...submissionDoc,
    createdAt: now,
    updatedAt: now,
  };
  memorySubmissions.unshift(memoryDoc);

  return res.status(201).json({
    success: true,
    message: 'Task submitted successfully.',
    submission: memoryDoc,
  });
};

/**
 * GET /submissions
 * Learner lists all their own submissions.
 */
export const getMySubmissions = async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const userId = String(user._id || user.id);

  if (mongoose.connection.readyState === 1) {
    try {
      const submissions = await Submission.find({ learner: user._id })
        .sort({ submittedAt: -1 })
        .lean();
      return res.json({
        success: true,
        count: submissions.length,
        submissions,
      });
    } catch (err: any) {
      console.warn('[Submission] DB query failed:', err.message);
    }
  }

  // Memory fallback
  const mySubs = memorySubmissions.filter(
    (s) => String(s.learner) === userId || String(s.learner?._id) === userId
  );

  return res.json({
    success: true,
    count: mySubs.length,
    submissions: mySubs,
  });
};

/**
 * GET /submissions/:id
 * Views one submission with its feedback and rubric scores.
 * Enforces learner privacy (learners cannot view other learners' submissions).
 */
export const getSubmissionById = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.user!;
  const userId = String(user._id || user.id);
  const userRole = user.role || 'learner';

  let submission: any = null;

  if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
    try {
      submission = await Submission.findById(id).lean();
    } catch {}
  }

  if (!submission) {
    submission = memorySubmissions.find((s) => String(s._id) === id || String(s.id) === id);
  }

  if (!submission) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  const learnerId = String(submission.learner?._id || submission.learner);

  // Privacy guard: learner can only view their own submission
  if (userRole === 'learner' && learnerId !== userId) {
    return res.status(403).json({
      error: 'Forbidden: you are not authorized to view another learner’s submission.',
      code: 'FORBIDDEN',
    });
  }

  return res.json({
    success: true,
    submission,
  });
};

/**
 * POST /submissions/:id/resubmit
 * Learner resubmits when status is 'revision_requested'.
 * Increments revision count and transitions status back to 'submitted'.
 */
export const resubmitTask = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { answerContent } = req.body;
  const user = req.user!;
  const userId = String(user._id || user.id);

  if (!answerContent || typeof answerContent !== 'string' || answerContent.trim().length === 0) {
    return res.status(400).json({ error: 'Answer content is required and cannot be empty.' });
  }

  let submission: any = null;
  const now = new Date();

  if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
    try {
      submission = await Submission.findById(id);
    } catch {}
  }

  if (!submission) {
    submission = memorySubmissions.find((s) => String(s._id) === id || String(s.id) === id);
  }

  if (!submission) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  const learnerId = String(submission.learner?._id || submission.learner);

  // Ownership check
  if (learnerId !== userId) {
    return res.status(403).json({
      error: 'Forbidden: you can only resubmit your own submissions.',
      code: 'FORBIDDEN',
    });
  }

  // Status transition check: Must be 'revision_requested'
  if (submission.status !== 'revision_requested') {
    return res.status(400).json({
      error: `Invalid status transition: resubmission is only allowed when status is 'revision_requested' (current status: '${submission.status}').`,
      code: 'INVALID_STATUS_TRANSITION',
    });
  }

  const prevStatus = submission.status;
  const newRevisionCount = (submission.revisionCount || 0) + 1;
  const historyEntry = {
    changedBy: user._id || user.id,
    changedByName: user.name,
    changedAt: now,
    fromStatus: prevStatus,
    toStatus: 'submitted',
    note: `Revision #${newRevisionCount} submitted by learner`,
  };

  if (mongoose.connection.readyState === 1 && typeof submission.save === 'function') {
    submission.answerContent = answerContent.trim();
    submission.status = 'submitted';
    submission.evaluator = null;
    submission.evaluatorName = undefined;
    submission.revisionCount = newRevisionCount;
    submission.submittedAt = now;
    submission.statusHistory.push(historyEntry);
    await submission.save();

    return res.json({
      success: true,
      message: 'Revision submitted successfully.',
      submission,
    });
  }

  // Memory fallback update
  submission.answerContent = answerContent.trim();
  submission.status = 'submitted';
  submission.evaluator = null;
  submission.evaluatorName = undefined;
  submission.revisionCount = newRevisionCount;
  submission.submittedAt = now;
  submission.statusHistory = submission.statusHistory || [];
  submission.statusHistory.push(historyEntry);

  return res.json({
    success: true,
    message: 'Revision submitted successfully.',
    submission,
  });
};
