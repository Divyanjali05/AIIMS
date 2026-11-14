import { Response } from 'express';
import crypto from 'crypto';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma, isDatabaseConnected, isPrismaErrorCode } from '../config/prisma';
import { writeAuditLog } from '../services/auditLog.service';
import {
  hashPassword,
  defaultAssessment,
  defaultAnalysis,
  defaultClarity,
  defaultFocus,
  defaultRadar,
  defaultInvestigation,
  defaultSolver,
  defaultBuild,
  defaultNotifications,
  defaultAiWallet,
  toJsonInput,
} from '../utils/userMapper';
import { isSafeKey, isValidId, withLegacyId, toRecord } from '../utils/id';

/**
 * Format milliseconds into human-readable duration.
 */
function formatDuration(ms: number): string {
  if (isNaN(ms) || ms <= 0) return '0s';
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
 * POST /admin/evaluators
 * Admin invites / creates an evaluator account with a temporary password or set-password link.
 * Evaluator is flagged with mustChangePassword: true.
 */
export const createEvaluator = async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password } = req.body;
  const admin = req.user!;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    return res.status(400).json({ error: 'Valid email is required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (!isSafeKey(normalizedEmail) || !normalizedEmail.includes('@')) {
    return res.status(400).json({ error: 'Invalid evaluator email address.' });
  }

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const tempPassword =
    password && typeof password === 'string' && password.length >= 8
      ? password
      : `EvalTemp!${crypto.randomBytes(4).toString('hex')}2026`;

  const inviteToken = crypto.randomBytes(24).toString('hex');
  const inviteTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const hashedPassword = await hashPassword(tempPassword);

  try {
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    const newEvaluator = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: 'evaluator',
        isActive: true,
        mustChangePassword: true,
        inviteToken,
        inviteTokenExpires,
        college: 'AIIMS Evaluation Panel',
        targetGoal: 'AI Evaluation & Assessment',
        stage: 'Applying',
        xpPoints: 500,
        aiimsCredits: 0,
        assessmentStatus: 'not_started',
        assessmentData: toJsonInput(defaultAssessment()),
        analysisData: toJsonInput(defaultAnalysis()),
        clarityData: toJsonInput(defaultClarity()),
        focusData: toJsonInput(defaultFocus()),
        radarData: toJsonInput(defaultRadar()),
        investigationData: toJsonInput(defaultInvestigation()),
        solverData: toJsonInput(defaultSolver()),
        buildData: toJsonInput(defaultBuild()),
        relevanceData: toJsonInput({ status: 'locked' }),
        mentorData: toJsonInput({ status: 'locked' }),
        transactionsData: toJsonInput([]),
        notificationsData: toJsonInput(defaultNotifications()),
        aiWalletData: toJsonInput(defaultAiWallet()),
      },
    });

    await writeAuditLog({
      actor: String(admin.id || admin._id),
      actorName: admin.name,
      actorRole: admin.role || 'admin',
      action: 'CREATE_EVALUATOR',
      target: String(newEvaluator.id),
      targetType: 'User',
      details: { email: normalizedEmail, name: name.trim() },
    });

    return res.status(201).json({
      success: true,
      message: 'Evaluator account created successfully.',
      evaluator: {
        id: String(newEvaluator.id),
        name: newEvaluator.name,
        email: newEvaluator.email,
        role: newEvaluator.role,
        isActive: newEvaluator.isActive,
        mustChangePassword: newEvaluator.mustChangePassword,
      },
      invite: {
        temporaryPassword: tempPassword,
        inviteToken,
        setPasswordUrl: `/auth/set-password?token=${inviteToken}&email=${encodeURIComponent(normalizedEmail)}`,
        expiresAt: inviteTokenExpires,
      },
    });
  } catch (err: unknown) {
    if (isPrismaErrorCode(err, 'P2002')) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to create evaluator account.', details: msg });
  }
};

/**
 * PATCH /admin/evaluators/:id/status
 * Enable or disable an evaluator account.
 */
export const updateEvaluatorStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { isActive } = req.body;
  const admin = req.user!;

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ error: 'isActive boolean is required.' });
  }

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  if (!isValidId(id)) {
    return res.status(404).json({ error: 'Evaluator not found.' });
  }

  try {
    const evaluator = await prisma.user.update({
      where: { id },
      data: { isActive },
    });

    const action = isActive ? 'ENABLE_EVALUATOR' : 'DISABLE_EVALUATOR';
    await writeAuditLog({
      actor: String(admin.id || admin._id),
      actorName: admin.name,
      actorRole: admin.role || 'admin',
      action,
      target: String(evaluator.id),
      targetType: 'User',
      details: { email: evaluator.email, isActive },
    });

    return res.json({
      success: true,
      message: `Evaluator account ${isActive ? 'enabled' : 'disabled'} successfully.`,
      evaluator: {
        id: String(evaluator.id),
        email: evaluator.email,
        role: evaluator.role,
        isActive: evaluator.isActive,
      },
    });
  } catch (err: unknown) {
    if (isPrismaErrorCode(err, 'P2025')) {
      return res.status(404).json({ error: 'Evaluator not found.' });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to update evaluator status.', details: msg });
  }
};

/**
 * GET /admin/evaluators
 * List all evaluators.
 */
export const listEvaluators = async (_req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  try {
    const evaluators = await prisma.user.findMany({
      where: { role: 'evaluator' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      count: evaluators.length,
      evaluators: evaluators.map(withLegacyId),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to list evaluators.', details: msg });
  }
};

/**
 * GET /admin/tasks
 * Lists all tasks available in the system.
 */
export const listTasks = async (_req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  try {
    const tasks = await prisma.task.findMany({
      orderBy: [{ level: 'asc' }, { createdAt: 'asc' }],
    });

    return res.json({
      success: true,
      count: tasks.length,
      tasks: tasks.map(withLegacyId),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to list tasks.', details: msg });
  }
};

/**
 * POST /admin/tasks
 * Admin creates a new task.
 */
export const createTask = async (req: AuthenticatedRequest, res: Response) => {
  const { taskId, title, description, category, level } = req.body;
  const admin = req.user!;

  if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
    return res.status(400).json({ error: 'Valid taskId is required.' });
  }

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required.' });
  }

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const cleanTaskId = taskId.trim();

  try {
    const existing = await prisma.task.findUnique({ where: { taskId: cleanTaskId } });
    if (existing) {
      return res.status(400).json({ error: `Task with taskId '${cleanTaskId}' already exists.` });
    }

    const newTask = await prisma.task.create({
      data: {
        taskId: cleanTaskId,
        title: title.trim(),
        description: (description || '').trim(),
        category: category || 'General AI',
        level: Number(level) || 1,
        isActive: true,
      },
    });

    await writeAuditLog({
      actor: String(admin.id || admin._id),
      actorName: admin.name,
      actorRole: admin.role || 'admin',
      action: 'CREATE_TASK',
      target: cleanTaskId,
      targetType: 'Task',
      details: { title: newTask.title, level: newTask.level },
    });

    return res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      task: withLegacyId(newTask),
    });
  } catch (err: unknown) {
    if (isPrismaErrorCode(err, 'P2002')) {
      return res.status(400).json({ error: `Task with taskId '${cleanTaskId}' already exists.` });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to create task.', details: msg });
  }
};

/**
 * PUT /admin/tasks/:id
 * Admin updates an existing task.
 */
export const updateTask = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { title, description, category, level, isActive } = req.body;
  const admin = req.user!;

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  try {
    const existing = await prisma.task.findFirst({
      where: {
        OR: [...(isValidId(id) ? [{ id }] : []), { taskId: id }],
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const task = await prisma.task.update({
      where: { id: existing.id },
      data: {
        ...(title !== undefined ? { title: String(title).trim() } : {}),
        ...(description !== undefined ? { description: String(description).trim() } : {}),
        ...(category !== undefined ? { category: String(category) } : {}),
        ...(level !== undefined ? { level: Number(level) } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    await writeAuditLog({
      actor: String(admin.id || admin._id),
      actorName: admin.name,
      actorRole: admin.role || 'admin',
      action: 'UPDATE_TASK',
      target: task.taskId || id,
      targetType: 'Task',
      details: { title: task.title, isActive: task.isActive },
    });

    return res.json({
      success: true,
      message: 'Task updated successfully.',
      task: withLegacyId(task),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to update task.', details: msg });
  }
};

/**
 * DELETE /admin/tasks/:id
 * Admin deactivates / deletes a task.
 */
export const deleteTask = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const admin = req.user!;

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  try {
    const existing = await prisma.task.findFirst({
      where: {
        OR: [...(isValidId(id) ? [{ id }] : []), { taskId: id }],
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const deleted = await prisma.task.delete({ where: { id: existing.id } });

    await writeAuditLog({
      actor: String(admin.id || admin._id),
      actorName: admin.name,
      actorRole: admin.role || 'admin',
      action: 'DELETE_TASK',
      target: deleted.taskId,
      targetType: 'Task',
    });

    return res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to delete task.', details: msg });
  }
};

/**
 * GET /admin/reports/summary
 * Summary report:
 *   - counts by status (submitted, in_review, feedback_given, revision_requested, accepted, total)
 *   - average review time
 */
export const getSummaryReport = async (_req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  try {
    const allSubmissions = await prisma.submission.findMany({
      select: {
        status: true,
        submittedAt: true,
        reviewedAt: true,
      },
    });

    const statusCounts = {
      submitted: 0,
      in_review: 0,
      feedback_given: 0,
      revision_requested: 0,
      accepted: 0,
      total: allSubmissions.length,
    };

    let totalReviewTimeMs = 0;
    let reviewedCount = 0;

    for (const s of allSubmissions) {
      if (s.status in statusCounts) {
        (statusCounts as Record<string, number>)[s.status]++;
      }

      if (s.reviewedAt && s.submittedAt) {
        const reviewDuration = new Date(s.reviewedAt).getTime() - new Date(s.submittedAt).getTime();
        if (reviewDuration >= 0) {
          totalReviewTimeMs += reviewDuration;
          reviewedCount++;
        }
      }
    }

    const averageReviewTimeMs =
      reviewedCount > 0 ? Math.round(totalReviewTimeMs / reviewedCount) : 0;

    return res.json({
      success: true,
      generatedAt: new Date(),
      summary: {
        statusCounts,
        metrics: {
          totalSubmissions: allSubmissions.length,
          reviewedCount,
          pendingReviewCount: statusCounts.submitted + statusCounts.in_review,
          averageReviewTimeMs,
          averageReviewTimeFormatted: formatDuration(averageReviewTimeMs),
        },
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to generate summary report.', details: msg });
  }
};

/**
 * GET /admin/audit-logs
 * List all recorded audit logs, newest first.
 */
export const getAuditLogs = async (req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const page = Math.max(1, Number(req.query.page) || 1);
  const skip = (page - 1) * limit;

  try {
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { time: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count(),
    ]);

    return res.json({
      success: true,
      page,
      limit,
      total,
      auditLogs: logs.map((l) =>
        withLegacyId({
          ...l,
          details: toRecord(l.details),
        })
      ),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to fetch audit logs.', details: msg });
  }
};

/**
 * GET /admin/billing/summary
 * Admin-only read-only financial ledger summary and payment readiness audit.
 * Enforces Rule: Only authorized administrators may access sensitive billing information.
 */
export const getFinancialSummary = async (_req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  try {
    const [totalUsers, totalLedgerEntries, users, ledgerEntries] = await Promise.all([
      prisma.user.count(),
      prisma.creditLedger.count(),
      prisma.user.findMany({
        select: { aiimsCredits: true },
      }),
      prisma.creditLedger.findMany({
        select: { type: true, amount: true },
      }),
    ]);

    let totalEarned = 0;
    let totalSpent = 0;
    let totalRefunded = 0;

    for (const entry of ledgerEntries) {
      if (entry.type === 'EARN' || entry.type === 'ADJUSTMENT') {
        totalEarned += entry.amount;
      } else if (entry.type === 'SPEND') {
        totalSpent += entry.amount;
      } else if (entry.type === 'REFUND') {
        totalRefunded += entry.amount;
      }
    }

    const circulatingCredits = users.reduce((sum, u) => sum + (u.aiimsCredits ?? 0), 0);

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      monetizationStatus: {
        paymentGatewayIntegrated: false,
        paymentGatewayStatus: 'PREVIEW',
        subscriptionModelStatus: 'UNAPPROVED_D7',
        directCreditPurchasesEnabled: false,
      },
      ledgerMetrics: {
        totalUsers,
        totalLedgerEntries,
        circulatingCredits,
        totalEarned,
        totalSpent,
        totalRefunded,
        netLedgerBalance: totalEarned + totalRefunded - totalSpent,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: 'Failed to generate financial summary.', details: msg });
  }
};
