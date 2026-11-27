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
import { isSafeKey, isValidId, withLegacyId, toRecord, toArray } from '../utils/id';
import { ToolCatalogService } from '../services/wallet/toolCatalog.service';
import { updateToolReportStatusSchema } from '../schemas/wallet.schema';

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

// ============================================================================
// Admin Quality Assurance: Market AI Tools Outdated Report Review Workflow
// ============================================================================

/**
 * GET /admin/tool-reports
 * Retrieves submitted outdated-tool reports with status/category filtering,
 * tool name/provider searching, pagination, and status breakdown metrics.
 * Protected by requireAuth, requireRole('admin').
 */
export const adminListToolReports = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'PostgreSQL database is unavailable.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  try {
    const rawStatus = req.query.status as string | undefined;
    const rawCategory = req.query.category as string | undefined;
    const rawSearch = (req.query.search as string | undefined)?.trim();
    const rawToolId = (req.query.toolId as string | undefined)?.trim();
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));

    // Validate status if provided
    if (rawStatus && !['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'].includes(rawStatus)) {
      return res.status(400).json({
        error: `Invalid status parameter '${rawStatus}'. Allowed: PENDING, UNDER_REVIEW, RESOLVED, REJECTED.`,
        code: 'INVALID_REPORT_STATUS',
      });
    }

    // Validate category if provided
    if (
      rawCategory &&
      ![
        'PRICING_OUTDATED',
        'LINK_BROKEN',
        'TIER_INCORRECT',
        'CAPABILITY_CHANGED',
        'OTHER',
      ].includes(rawCategory)
    ) {
      return res.status(400).json({
        error: `Invalid category parameter '${rawCategory}'. Allowed: PRICING_OUTDATED, LINK_BROKEN, TIER_INCORRECT, CAPABILITY_CHANGED, OTHER.`,
        code: 'INVALID_REPORT_CATEGORY',
      });
    }

    // Status breakdown metrics across entire catalog reports
    const [pendingCount, underReviewCount, resolvedCount, rejectedCount] = await Promise.all([
      prisma.toolReport.count({ where: { status: 'PENDING' } }),
      prisma.toolReport.count({ where: { status: 'UNDER_REVIEW' } }),
      prisma.toolReport.count({ where: { status: 'RESOLVED' } }),
      prisma.toolReport.count({ where: { status: 'REJECTED' } }),
    ]);
    const totalAll = pendingCount + underReviewCount + resolvedCount + rejectedCount;

    // Build filter where clause
    const where: any = {};
    if (rawStatus) where.status = rawStatus;
    if (rawCategory) where.reportCategory = rawCategory;
    if (rawToolId) where.toolId = rawToolId;

    if (rawSearch) {
      const q = rawSearch.toLowerCase();
      const allTools = ToolCatalogService.getCatalog();
      const matchingToolIds = allTools
        .filter(
          (t: { id: string; name?: string; provider?: string }) =>
            (t.name && t.name.toLowerCase().includes(q)) ||
            (t.provider && t.provider.toLowerCase().includes(q)) ||
            (t.id && t.id.toLowerCase().includes(q))
        )
        .map((t: { id: string }) => t.id);

      where.OR = [
        { toolId: { in: matchingToolIds } },
        { toolId: { contains: rawSearch, mode: 'insensitive' } },
        { description: { contains: rawSearch, mode: 'insensitive' } },
      ];
    }

    const [totalMatching, reports] = await Promise.all([
      prisma.toolReport.count({ where }),
      prisma.toolReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          tool: {
            select: {
              id: true,
              name: true,
              provider: true,
              category: true,
              marketTier: true,
              officialWebsite: true,
              pricingSourceUrl: true,
              pricingVerifiedAt: true,
              verificationStatus: true,
              activeStatus: true,
            },
          },
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    const formatted = reports.map((r: any) => {
      const catalogTool = r.tool || ToolCatalogService.getToolById(r.toolId);
      return {
        id: r.id,
        toolId: r.toolId,
        reportCategory: r.reportCategory,
        description: r.description,
        sourceUrl: r.sourceUrl,
        status: r.status,
        reviewerId: r.reviewerId,
        reviewNotes: r.reviewNotes,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
        tool: catalogTool
          ? {
              id: catalogTool.id,
              name: catalogTool.name,
              provider: catalogTool.provider,
              category: catalogTool.category,
              marketTier: catalogTool.marketTier ?? null,
              officialWebsite: catalogTool.officialWebsite,
              pricingSourceUrl: catalogTool.pricingSourceUrl ?? null,
              pricingVerifiedAt: catalogTool.pricingVerifiedAt ?? null,
              verificationStatus: catalogTool.verificationStatus,
            }
          : null,
        reporter: r.reporter
          ? {
              id: r.reporter.id,
              name: r.reporter.name,
              email: r.reporter.email,
            }
          : { id: r.userId, name: 'Learner', email: '' },
        reviewer: r.reviewer
          ? {
              id: r.reviewer.id,
              name: r.reviewer.name,
              email: r.reviewer.email,
            }
          : null,
      };
    });

    return res.json({
      success: true,
      total: totalMatching,
      page,
      limit,
      totalPages: Math.ceil(totalMatching / limit) || 1,
      metrics: {
        pending: pendingCount,
        underReview: underReviewCount,
        resolved: resolvedCount,
        rejected: rejectedCount,
        total: totalAll,
      },
      reports: formatted,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      error: 'Failed to retrieve tool reports.',
      code: 'DATABASE_ERROR',
      details: msg,
    });
  }
};

/**
 * GET /admin/tool-reports/:id
 * Retrieves full detail of a specific tool report including associated catalog tool data,
 * original description, source URL, reviewer notes, and reporter info.
 * Protected by requireAuth, requireRole('admin').
 */
export const adminGetToolReportById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'PostgreSQL database is unavailable.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const reportId = String(req.params.id || '').trim();
  if (!reportId) {
    return res.status(400).json({
      error: 'Valid tool report ID is required in route parameter.',
      code: 'INVALID_REPORT_ID',
    });
  }

  try {
    const report = await prisma.toolReport.findUnique({
      where: { id: reportId },
      include: {
        tool: true,
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!report) {
      return res.status(404).json({
        error: `Tool report '${reportId}' not found.`,
        code: 'REPORT_NOT_FOUND',
      });
    }

    const catalogTool = (report as any).tool || ToolCatalogService.getToolById(report.toolId);

    const detailed = {
      id: report.id,
      toolId: report.toolId,
      reportCategory: report.reportCategory,
      description: report.description,
      sourceUrl: report.sourceUrl,
      status: report.status,
      reviewerId: report.reviewerId,
      reviewNotes: report.reviewNotes,
      createdAt:
        report.createdAt instanceof Date ? report.createdAt.toISOString() : report.createdAt,
      updatedAt:
        report.updatedAt instanceof Date ? report.updatedAt.toISOString() : report.updatedAt,
      tool: catalogTool
        ? {
            id: catalogTool.id,
            name: catalogTool.name,
            provider: catalogTool.provider,
            description: catalogTool.description,
            category: catalogTool.category,
            marketTier: catalogTool.marketTier ?? null,
            officialWebsite: catalogTool.officialWebsite,
            pricingDetails: catalogTool.pricingDetails,
            pricingSourceUrl: catalogTool.pricingSourceUrl ?? null,
            pricingVerifiedAt: catalogTool.pricingVerifiedAt ?? null,
            verificationStatus: catalogTool.verificationStatus,
            activeStatus: catalogTool.activeStatus,
            lastVerifiedAt: catalogTool.lastVerifiedAt,
          }
        : null,
      reporter: (report as any).reporter
        ? {
            id: (report as any).reporter.id,
            name: (report as any).reporter.name,
            email: (report as any).reporter.email,
          }
        : { id: report.userId, name: 'Learner', email: '' },
      reviewer: (report as any).reviewer
        ? {
            id: (report as any).reviewer.id,
            name: (report as any).reviewer.name,
            email: (report as any).reviewer.email,
          }
        : null,
    };

    return res.json({
      success: true,
      report: detailed,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      error: 'Failed to retrieve tool report details.',
      code: 'DATABASE_ERROR',
      details: msg,
    });
  }
};

/**
 * PATCH /admin/tool-reports/:id
 * Updates report review status (PENDING, UNDER_REVIEW, RESOLVED, REJECTED)
 * and records reviewer notes.
 * Enforces valid lifecycle status transitions, derives reviewer identity authoritatively
 * from authenticated administrator session, logs an audit entry, and guarantees catalog immutability.
 * Protected by requireAuth, requireRole('admin').
 */
export const adminUpdateToolReportStatus = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'PostgreSQL database is unavailable.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const reportId = String(req.params.id || '').trim();
  if (!reportId) {
    return res.status(400).json({
      error: 'Valid tool report ID is required in route parameter.',
      code: 'INVALID_REPORT_ID',
    });
  }

  const parsed = updateToolReportStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request body.',
      code: 'VALIDATION_ERROR',
      details: parsed.error.format(),
    });
  }

  const { status: targetStatus, reviewNotes } = parsed.data;

  try {
    const existing = await prisma.toolReport.findUnique({
      where: { id: reportId },
    });

    if (!existing) {
      return res.status(404).json({
        error: `Tool report '${reportId}' not found.`,
        code: 'REPORT_NOT_FOUND',
      });
    }

    const currentStatus = existing.status;

    // Disallow direct jump from REJECTED to RESOLVED without intermediate UNDER_REVIEW investigation
    const isDirectRejectedToResolved = currentStatus === 'REJECTED' && targetStatus === 'RESOLVED';
    if (isDirectRejectedToResolved) {
      return res.status(400).json({
        error: `Cannot transition directly from REJECTED to RESOLVED. Move report to UNDER_REVIEW to re-investigate first.`,
        code: 'INVALID_STATUS_TRANSITION',
        currentStatus,
        targetStatus,
      });
    }

    const adminId = String(req.user.id || req.user._id);
    const updatedNotes = reviewNotes !== undefined ? reviewNotes.trim() : existing.reviewNotes;

    const updated = await prisma.toolReport.update({
      where: { id: reportId },
      data: {
        status: targetStatus,
        reviewerId: adminId,
        reviewNotes: updatedNotes,
        updatedAt: new Date(),
      },
      include: {
        tool: {
          select: {
            id: true,
            name: true,
            provider: true,
            category: true,
            marketTier: true,
            officialWebsite: true,
            pricingSourceUrl: true,
            pricingVerifiedAt: true,
            verificationStatus: true,
          },
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Write audit log
    const auditAction =
      targetStatus === 'RESOLVED'
        ? 'TOOL_REPORT_RESOLVED'
        : targetStatus === 'REJECTED'
          ? 'TOOL_REPORT_REJECTED'
          : targetStatus === 'UNDER_REVIEW'
            ? 'TOOL_REPORT_UNDER_REVIEW'
            : 'TOOL_REPORT_REVIEW_UPDATED';

    await writeAuditLog({
      actor: adminId,
      actorName: req.user.name,
      actorRole: req.user.role || 'admin',
      action: auditAction,
      target: reportId,
      targetType: 'ToolReport',
      details: {
        reportId,
        toolId: existing.toolId,
        previousStatus: currentStatus,
        newStatus: targetStatus,
        reviewNotes: updatedNotes,
      },
    });

    const catalogTool = (updated as any).tool || ToolCatalogService.getToolById(updated.toolId);

    return res.json({
      success: true,
      message: `Tool report '${reportId}' updated to status '${targetStatus}'.`,
      report: {
        id: updated.id,
        toolId: updated.toolId,
        reportCategory: updated.reportCategory,
        description: updated.description,
        sourceUrl: updated.sourceUrl,
        status: updated.status,
        reviewerId: updated.reviewerId,
        reviewNotes: updated.reviewNotes,
        createdAt:
          updated.createdAt instanceof Date ? updated.createdAt.toISOString() : updated.createdAt,
        updatedAt:
          updated.updatedAt instanceof Date ? updated.updatedAt.toISOString() : updated.updatedAt,
        tool: catalogTool
          ? {
              id: catalogTool.id,
              name: catalogTool.name,
              provider: catalogTool.provider,
              category: catalogTool.category,
              marketTier: catalogTool.marketTier ?? null,
              officialWebsite: catalogTool.officialWebsite,
            }
          : null,
        reporter: (updated as any).reporter || { id: updated.userId, name: 'Learner', email: '' },
        reviewer: (updated as any).reviewer || {
          id: adminId,
          name: req.user.name,
          email: req.user.email,
        },
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      error: 'Failed to update tool report review status.',
      code: 'DATABASE_ERROR',
      details: msg,
    });
  }
};

// ============================================================================
// Admin Prompt Submissions & Review Workflow
// ============================================================================

/**
 * GET /admin/submissions/stats
 * Aggregates submission counts across statuses.
 */
export const adminGetSubmissionStats = async (_req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  try {
    const total = await prisma.submission.count();
    const pending = await prisma.submission.count({
      where: { status: { in: ['submitted', 'in_review'] } },
    });
    const approved = await prisma.submission.count({
      where: { status: 'accepted' },
    });
    const rejected = await prisma.submission.count({
      where: { status: { in: ['revision_requested', 'rejected'] } },
    });

    return res.json({
      success: true,
      stats: {
        total,
        pending,
        approved,
        rejected,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      error: 'Failed to retrieve submission statistics.',
      code: 'DATABASE_ERROR',
      details: msg,
    });
  }
};

/**
 * GET /admin/submissions
 * Searchable, filterable list of submissions for Admin review.
 * Filters: status (all, pending, approved, rejected), module (all, Clarity, Focus), topic, search.
 */
export const adminListSubmissions = async (req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const { status, module: moduleFilter, topic: topicFilter, search } = req.query;

  try {
    const where: any = {};

    if (status && status !== 'all') {
      if (status === 'pending') {
        where.status = { in: ['submitted', 'in_review'] };
      } else if (status === 'approved') {
        where.status = 'accepted';
      } else if (status === 'rejected') {
        where.status = { in: ['revision_requested', 'rejected'] };
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { learnerName: { contains: q, mode: 'insensitive' } },
        { learnerEmail: { contains: q, mode: 'insensitive' } },
        { taskTitle: { contains: q, mode: 'insensitive' } },
        { taskId: { contains: q, mode: 'insensitive' } },
        { answerContent: { contains: q, mode: 'insensitive' } },
      ];
    }

    const rows = await prisma.submission.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      take: 200,
    });

    let mapped = rows.map((row) => {
      const meta = toRecord(row.rubricScores);
      return withLegacyId({
        ...row,
        learner: row.learnerId,
        evaluator: row.evaluatorId ?? null,
        rubricScores: meta,
        statusHistory: toArray(row.statusHistory),
        module: meta.module || (row.taskId?.toLowerCase().includes('focus') ? 'Focus' : 'Clarity'),
        topic: meta.topic || meta.topicId || '',
        userPrompt: meta.userPrompt || row.answerContent,
        aiOutput: meta.aiOutput || '',
        modelUsed: meta.modelUsed || '',
        executionTimeMs: meta.executionTimeMs || null,
        promptHistory: toArray(meta.promptHistory),
      });
    });

    // In-memory module filter if requested
    if (moduleFilter && moduleFilter !== 'all') {
      mapped = mapped.filter(
        (sub) => String(sub.module).toLowerCase() === String(moduleFilter).toLowerCase()
      );
    }

    // In-memory topic filter if requested
    if (topicFilter && topicFilter !== 'all') {
      mapped = mapped.filter((sub) =>
        String(sub.topic).toLowerCase().includes(String(topicFilter).toLowerCase())
      );
    }

    return res.json({
      success: true,
      count: mapped.length,
      submissions: mapped,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      error: 'Failed to list submissions for admin review.',
      code: 'DATABASE_ERROR',
      details: msg,
    });
  }
};

/**
 * GET /admin/submissions/:id
 * Detailed submission view for Admin review.
 */
export const adminGetSubmissionById = async (req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(404).json({ error: 'Submission not found.', code: 'NOT_FOUND' });
  }

  try {
    const row = await prisma.submission.findUnique({ where: { id } });
    if (!row) {
      return res.status(404).json({ error: 'Submission not found.', code: 'NOT_FOUND' });
    }

    const meta = toRecord(row.rubricScores);
    const dto = withLegacyId({
      ...row,
      learner: row.learnerId,
      evaluator: row.evaluatorId ?? null,
      rubricScores: meta,
      statusHistory: toArray(row.statusHistory),
      module: meta.module || (row.taskId?.toLowerCase().includes('focus') ? 'Focus' : 'Clarity'),
      topic: meta.topic || meta.topicId || '',
      userPrompt: meta.userPrompt || row.answerContent,
      aiOutput: meta.aiOutput || '',
      modelUsed: meta.modelUsed || '',
      executionTimeMs: meta.executionTimeMs || null,
      promptHistory: toArray(meta.promptHistory),
    });

    return res.json({
      success: true,
      submission: dto,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      error: 'Failed to retrieve submission.',
      code: 'DATABASE_ERROR',
      details: msg,
    });
  }
};

/**
 * POST /admin/submissions/:id/review
 * Admin records decision ('accepted', 'revision_requested', 'rejected') and feedback.
 */
export const adminReviewSubmission = async (req: AuthenticatedRequest, res: Response) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(404).json({ error: 'Submission not found.', code: 'NOT_FOUND' });
  }

  const user = req.user!;
  const adminId = String(user.id || user._id);
  const now = new Date();

  const { decision, feedback } = req.body;
  const validDecisions = ['accepted', 'revision_requested', 'rejected'];
  if (!decision || !validDecisions.includes(decision)) {
    return res.status(400).json({
      error: `Invalid review decision. Permitted decisions: 'accepted', 'revision_requested', or 'rejected'.`,
      code: 'INVALID_DECISION',
    });
  }

  if (typeof feedback !== 'string' || feedback.trim().length === 0) {
    return res.status(400).json({
      error: 'Review feedback is required.',
      code: 'FEEDBACK_REQUIRED',
    });
  }

  try {
    const existing = await prisma.submission.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Submission not found.', code: 'NOT_FOUND' });
    }

    const nextHistory = [
      ...toArray(existing.statusHistory),
      {
        changedBy: adminId,
        changedByName: user.name,
        changedAt: now,
        fromStatus: existing.status,
        toStatus: decision,
        note: `Admin review completed by ${user.name}: ${decision.toUpperCase()}`,
        feedback: feedback.trim(),
      },
    ];

    const updated = await prisma.submission.update({
      where: { id },
      data: {
        status: decision,
        writtenFeedback: feedback.trim(),
        evaluatorId: adminId,
        evaluatorName: user.name,
        reviewedAt: now,
        statusHistory: toJsonInput(nextHistory),
      },
    });

    await writeAuditLog({
      actor: adminId,
      actorName: user.name,
      actorRole: 'admin',
      action: 'ADMIN_REVIEW_SUBMISSION',
      target: String(updated.id),
      targetType: 'Submission',
      details: {
        taskId: updated.taskId,
        learnerId: updated.learnerId,
        decision,
        feedback: feedback.trim(),
      },
    });

    const meta = toRecord(updated.rubricScores);
    return res.json({
      success: true,
      message: `Submission ${decision === 'accepted' ? 'approved' : 'reviewed'} successfully.`,
      submission: withLegacyId({
        ...updated,
        learner: updated.learnerId,
        evaluator: updated.evaluatorId ?? null,
        rubricScores: meta,
        statusHistory: toArray(updated.statusHistory),
        module:
          meta.module || (updated.taskId?.toLowerCase().includes('focus') ? 'Focus' : 'Clarity'),
        topic: meta.topic || meta.topicId || '',
        userPrompt: meta.userPrompt || updated.answerContent,
        aiOutput: meta.aiOutput || '',
        modelUsed: meta.modelUsed || '',
        executionTimeMs: meta.executionTimeMs || null,
        promptHistory: toArray(meta.promptHistory),
      }),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      error: 'Failed to record admin review.',
      code: 'DATABASE_ERROR',
      details: msg,
    });
  }
};
