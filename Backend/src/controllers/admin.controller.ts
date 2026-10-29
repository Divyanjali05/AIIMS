import { Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { User } from '../models/User.model';
import { Task, defaultTasks } from '../models/Task.model';
import { Submission, memorySubmissions } from '../models/Submission.model';
import { AuditLog, memoryAuditLogs, writeAuditLog } from '../models/AuditLog.model';
import { registeredUsers, isSafeKey, saveRegisteredUser } from '../models/userStore';

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
  const tempPassword =
    password && typeof password === 'string' && password.length >= 8
      ? password
      : `EvalTemp!${crypto.randomBytes(4).toString('hex')}2026`;

  const inviteToken = crypto.randomBytes(24).toString('hex');
  const inviteTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  if (mongoose.connection.readyState === 1) {
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    const newEvaluator = await User.create({
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
    });

    await writeAuditLog({
      actor: admin._id || admin.id,
      actorName: admin.name,
      actorRole: admin.role || 'admin',
      action: 'CREATE_EVALUATOR',
      target: String(newEvaluator._id),
      targetType: 'User',
      details: { email: normalizedEmail, name: name.trim() },
    });

    return res.status(201).json({
      success: true,
      message: 'Evaluator account created successfully.',
      evaluator: {
        id: String(newEvaluator._id),
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
  }

  // Fallback memory store with safe key guard against prototype pollution
  if (!isSafeKey(normalizedEmail)) {
    return res.status(400).json({ error: 'Invalid evaluator email address.' });
  }
  if (registeredUsers[normalizedEmail]) {
    return res.status(400).json({ error: 'A user with this email already exists.' });
  }

  const memoryId = `usr-eval-${Date.now()}`;
  const memoryEvaluator: any = {
    _id: memoryId,
    id: memoryId,
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
    transactions: [],
  };
  saveRegisteredUser(normalizedEmail, memoryEvaluator);

  await writeAuditLog({
    actor: admin._id || admin.id,
    actorName: admin.name,
    actorRole: admin.role || 'admin',
    action: 'CREATE_EVALUATOR',
    target: memoryId,
    targetType: 'User',
    details: { email: normalizedEmail, name: name.trim() },
  });

  return res.status(201).json({
    success: true,
    message: 'Evaluator account created successfully.',
    evaluator: {
      id: memoryId,
      name: memoryEvaluator.name,
      email: memoryEvaluator.email,
      role: memoryEvaluator.role,
      isActive: memoryEvaluator.isActive,
      mustChangePassword: memoryEvaluator.mustChangePassword,
    },
    invite: {
      temporaryPassword: tempPassword,
      inviteToken,
      setPasswordUrl: `/auth/set-password?token=${inviteToken}&email=${encodeURIComponent(normalizedEmail)}`,
      expiresAt: inviteTokenExpires,
    },
  });
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

  let evaluator: any = null;

  if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(id)) {
    evaluator = await User.findById(id);
    if (evaluator) {
      evaluator.isActive = isActive;
      await evaluator.save();
    }
  }

  if (!evaluator) {
    for (const key of Object.keys(registeredUsers)) {
      const u = registeredUsers[key];
      if (String(u._id) === id || String(u.id) === id) {
        u.isActive = isActive;
        evaluator = u;
        break;
      }
    }
  }

  if (!evaluator) {
    return res.status(404).json({ error: 'Evaluator not found.' });
  }

  const action = isActive ? 'ENABLE_EVALUATOR' : 'DISABLE_EVALUATOR';
  await writeAuditLog({
    actor: admin._id || admin.id,
    actorName: admin.name,
    actorRole: admin.role || 'admin',
    action,
    target: String(evaluator._id || evaluator.id),
    targetType: 'User',
    details: { email: evaluator.email, isActive },
  });

  return res.json({
    success: true,
    message: `Evaluator account ${isActive ? 'enabled' : 'disabled'} successfully.`,
    evaluator: {
      id: String(evaluator._id || evaluator.id),
      email: evaluator.email,
      role: evaluator.role,
      isActive: evaluator.isActive,
    },
  });
};

/**
 * GET /admin/evaluators
 * List all evaluators.
 */
export const listEvaluators = async (req: AuthenticatedRequest, res: Response) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const evaluators = await User.find({ role: 'evaluator' })
        .select('_id name email role isActive mustChangePassword createdAt')
        .lean();
      return res.json({
        success: true,
        count: evaluators.length,
        evaluators,
      });
    } catch {}
  }

  const memoryEvaluators = Object.values(registeredUsers).filter(
    (u: any) => u.role === 'evaluator'
  );

  return res.json({
    success: true,
    count: memoryEvaluators.length,
    evaluators: memoryEvaluators,
  });
};

/**
 * GET /admin/tasks
 * Lists all tasks available in the system.
 */
export const listTasks = async (req: AuthenticatedRequest, res: Response) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const tasks = await Task.find({}).sort({ level: 1, createdAt: 1 }).lean();
      if (tasks.length > 0) {
        return res.json({
          success: true,
          count: tasks.length,
          tasks,
        });
      }
    } catch {}
  }

  return res.json({
    success: true,
    count: defaultTasks.length,
    tasks: defaultTasks,
  });
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

  const cleanTaskId = taskId.trim();

  if (mongoose.connection.readyState === 1) {
    const existing = await Task.findOne({ taskId: cleanTaskId });
    if (existing) {
      return res.status(400).json({ error: `Task with taskId '${cleanTaskId}' already exists.` });
    }

    const newTask = await Task.create({
      taskId: cleanTaskId,
      title: title.trim(),
      description: (description || '').trim(),
      category: category || 'General AI',
      level: Number(level) || 1,
      isActive: true,
    });

    await writeAuditLog({
      actor: admin._id || admin.id,
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
      task: newTask,
    });
  }

  // Memory fallback
  const memoryTask = {
    taskId: cleanTaskId,
    title: title.trim(),
    description: (description || '').trim(),
    category: category || 'General AI',
    level: Number(level) || 1,
    isActive: true,
  };
  defaultTasks.push(memoryTask);

  await writeAuditLog({
    actor: admin._id || admin.id,
    actorName: admin.name,
    actorRole: admin.role || 'admin',
    action: 'CREATE_TASK',
    target: cleanTaskId,
    targetType: 'Task',
    details: { title: memoryTask.title, level: memoryTask.level },
  });

  return res.status(201).json({
    success: true,
    message: 'Task created successfully.',
    task: memoryTask,
  });
};

/**
 * PUT /admin/tasks/:id
 * Admin updates an existing task.
 */
export const updateTask = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { title, description, category, level, isActive } = req.body;
  const admin = req.user!;

  let task: any = null;

  if (mongoose.connection.readyState === 1) {
    task = await Task.findOne({
      $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { taskId: id }],
    });
    if (task) {
      if (title !== undefined) task.title = String(title).trim();
      if (description !== undefined) task.description = String(description).trim();
      if (category !== undefined) task.category = String(category);
      if (level !== undefined) task.level = Number(level);
      if (isActive !== undefined) task.isActive = Boolean(isActive);
      await task.save();
    }
  }

  if (!task) {
    const memIdx = defaultTasks.findIndex((t) => t.taskId === id);
    if (memIdx !== -1) {
      if (title !== undefined) defaultTasks[memIdx].title = String(title).trim();
      if (description !== undefined) defaultTasks[memIdx].description = String(description).trim();
      if (category !== undefined) defaultTasks[memIdx].category = String(category);
      if (level !== undefined) defaultTasks[memIdx].level = Number(level);
      if (isActive !== undefined) defaultTasks[memIdx].isActive = Boolean(isActive);
      task = defaultTasks[memIdx];
    }
  }

  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  await writeAuditLog({
    actor: admin._id || admin.id,
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
    task,
  });
};

/**
 * DELETE /admin/tasks/:id
 * Admin deactivates / deletes a task.
 */
export const deleteTask = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const admin = req.user!;

  if (mongoose.connection.readyState === 1) {
    const deleted = await Task.findOneAndDelete({
      $or: [{ _id: mongoose.Types.ObjectId.isValid(id) ? id : null }, { taskId: id }],
    });
    if (deleted) {
      await writeAuditLog({
        actor: admin._id || admin.id,
        actorName: admin.name,
        actorRole: admin.role || 'admin',
        action: 'DELETE_TASK',
        target: deleted.taskId,
        targetType: 'Task',
      });
      return res.json({ success: true, message: 'Task deleted successfully.' });
    }
  }

  const memIdx = defaultTasks.findIndex((t) => t.taskId === id);
  if (memIdx !== -1) {
    const [removed] = defaultTasks.splice(memIdx, 1);
    await writeAuditLog({
      actor: admin._id || admin.id,
      actorName: admin.name,
      actorRole: admin.role || 'admin',
      action: 'DELETE_TASK',
      target: removed.taskId,
      targetType: 'Task',
    });
    return res.json({ success: true, message: 'Task deleted successfully.' });
  }

  return res.status(404).json({ error: 'Task not found.' });
};

/**
 * GET /admin/reports/summary
 * Summary report:
 *   - counts by status (submitted, in_review, feedback_given, revision_requested, accepted, total)
 *   - average review time
 */
export const getSummaryReport = async (req: AuthenticatedRequest, res: Response) => {
  let allSubmissions: any[] = [];

  if (mongoose.connection.readyState === 1) {
    try {
      allSubmissions = await Submission.find({}).lean();
    } catch {}
  }

  if (allSubmissions.length === 0 && memorySubmissions.length > 0) {
    allSubmissions = memorySubmissions;
  }

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
      (statusCounts as any)[s.status]++;
    }

    if (s.reviewedAt && s.submittedAt) {
      const reviewDuration = new Date(s.reviewedAt).getTime() - new Date(s.submittedAt).getTime();
      if (reviewDuration >= 0) {
        totalReviewTimeMs += reviewDuration;
        reviewedCount++;
      }
    }
  }

  const averageReviewTimeMs = reviewedCount > 0 ? Math.round(totalReviewTimeMs / reviewedCount) : 0;

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
};

/**
 * GET /admin/audit-logs
 * List all recorded audit logs, newest first.
 */
export const getAuditLogs = async (req: AuthenticatedRequest, res: Response) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const page = Math.max(1, Number(req.query.page) || 1);
  const skip = (page - 1) * limit;

  if (mongoose.connection.readyState === 1) {
    try {
      const [logs, total] = await Promise.all([
        AuditLog.find({}).sort({ time: -1 }).skip(skip).limit(limit).lean(),
        AuditLog.countDocuments({}),
      ]);
      return res.json({
        success: true,
        page,
        limit,
        total,
        auditLogs: logs,
      });
    } catch {}
  }

  const sortedMemory = [...memoryAuditLogs].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  );
  const pagedMemory = sortedMemory.slice(skip, skip + limit);

  return res.json({
    success: true,
    page,
    limit,
    total: sortedMemory.length,
    auditLogs: pagedMemory,
  });
};
