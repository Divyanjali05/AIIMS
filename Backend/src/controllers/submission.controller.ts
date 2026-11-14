import { Response } from 'express';
import { Submission as PrismaSubmission } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma, isDatabaseConnected } from '../config/prisma';
import { getDefaultTasks } from '../data/aiimsCatalog';
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
 * Helper to resolve task title from PostgreSQL Task table or static reference catalog.
 */
async function resolveTaskTitle(taskId: string): Promise<string> {
  if (isDatabaseConnected()) {
    try {
      const task = await prisma.task.findUnique({ where: { taskId } });
      if (task) return task.title;
    } catch {}
  }
  const fallback = getDefaultTasks().find((t) => t.taskId === taskId);
  return fallback ? fallback.title : `Task (${taskId})`;
}

/**
 * POST /submissions
 * Learner submits a new task solution for review.
 */
export const submitTask = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const { taskId } = req.body;
  const rawAnswer =
    req.body.answerContent ||
    (req.body.userPrompt ? `${req.body.userPrompt}\n\n${req.body.aiResponse || ''}` : '');
  const answerContent = typeof rawAnswer === 'string' ? rawAnswer.trim() : '';

  if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
    return res.status(400).json({ error: 'Valid taskId is required.' });
  }

  if (!answerContent || answerContent.length === 0) {
    return res.status(400).json({ error: 'Answer content is required and cannot be empty.' });
  }

  const user = req.user;
  const userId = String(user.id || user._id);
  const taskTitle = await resolveTaskTitle(taskId.trim());
  const now = new Date();

  try {
    const created = await prisma.submission.create({
      data: {
        learnerId: userId,
        learnerName: user.name,
        learnerEmail: user.email,
        taskId: taskId.trim(),
        taskTitle,
        answerContent: answerContent.trim(),
        status: 'submitted',
        evaluatorId: null,
        evaluatorName: null,
        rubricScores: toJsonInput({}),
        writtenFeedback: '',
        revisionCount: 0,
        statusHistory: toJsonInput([
          {
            changedBy: userId,
            changedByName: user.name,
            changedAt: now,
            fromStatus: 'none',
            toStatus: 'submitted',
            note: 'Initial task submission',
          },
        ]),
        submittedAt: now,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Task submitted successfully.',
      submission: submissionToDTO(created),
    });
  } catch (err: any) {
    console.warn('[Submission] DB creation failed:', err.message);
    return res.status(500).json({ error: 'Failed to create submission.', details: err.message });
  }
};

/**
 * GET /submissions
 * Learner lists all their own submissions.
 */
export const getMySubmissions = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const userId = String(req.user.id || req.user._id);

  try {
    const submissions = await prisma.submission.findMany({
      where: { learnerId: userId },
      orderBy: { submittedAt: 'desc' },
    });

    return res.json({
      success: true,
      count: submissions.length,
      submissions: submissions.map(submissionToDTO),
    });
  } catch (err: any) {
    console.warn('[Submission] DB query failed:', err.message);
    return res.status(500).json({ error: 'Failed to load submissions.', details: err.message });
  }
};

/**
 * GET /submissions/:id
 * Views one submission with its feedback and rubric scores.
 * Enforces learner privacy (learners cannot view other learners' submissions).
 */
export const getSubmissionById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }
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

  const user = req.user;
  const userId = String(user.id || user._id);
  const userRole = user.role || 'learner';

  try {
    const submission = await prisma.submission.findUnique({ where: { id } });
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    // Privacy guard: learner can only view their own submission
    if (userRole === 'learner' && String(submission.learnerId) !== userId) {
      return res.status(403).json({
        error: 'Forbidden: you are not authorized to view another learner’s submission.',
        code: 'FORBIDDEN',
      });
    }

    return res.json({
      success: true,
      submission: submissionToDTO(submission),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve submission.', details: err.message });
  }
};

/**
 * POST /submissions/:id/resubmit
 * Learner resubmits when status is 'revision_requested'.
 * Increments revision count and transitions status back to 'submitted'.
 */
export const resubmitTask = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const { id } = req.params;
  const { answerContent } = req.body;
  const user = req.user;
  const userId = String(user.id || user._id);

  if (!answerContent || typeof answerContent !== 'string' || answerContent.trim().length === 0) {
    return res.status(400).json({ error: 'Answer content is required and cannot be empty.' });
  }

  if (!isValidId(id)) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  try {
    const submission = await prisma.submission.findUnique({ where: { id } });
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    // Ownership check
    if (String(submission.learnerId) !== userId) {
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

    const now = new Date();
    const prevStatus = submission.status;
    const newRevisionCount = (submission.revisionCount || 0) + 1;
    const historyEntry = {
      changedBy: userId,
      changedByName: user.name,
      changedAt: now,
      fromStatus: prevStatus,
      toStatus: 'submitted',
      note: `Revision #${newRevisionCount} submitted by learner`,
    };

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        answerContent: answerContent.trim(),
        status: 'submitted',
        evaluatorId: null,
        evaluatorName: null,
        revisionCount: newRevisionCount,
        submittedAt: now,
        statusHistory: toJsonInput([...toArray(submission.statusHistory), historyEntry]),
      },
    });

    return res.json({
      success: true,
      message: 'Revision submitted successfully.',
      submission: submissionToDTO(updated),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to resubmit task.', details: err.message });
  }
};
