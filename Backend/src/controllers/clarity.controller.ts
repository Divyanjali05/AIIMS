import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { User } from '../models/User.model';
import {
  mockCapabilityGaps,
  mockTransactions,
  mockLearnerFullState,
  mockUser,
} from '../models/aiims.models';
import { ClaudeService } from '../services/anthropic/claude.service';
import { CREDIT_RULES, clarityTaskRewardKey } from '../config/credits.config';
import { creditsLedgerService } from '../services/creditsLedger.service';

const claudeService = new ClaudeService();

/**
 * GET /clarity/gaps
 */
export const getGaps = (req: Request, res: Response) => {
  res.json(mockCapabilityGaps);
};

/**
 * POST /clarity/mentor-override
 */
export const mentorOverride = (req: Request, res: Response) => {
  const { gapId, mentorOverride } = req.body;
  const gap = mockCapabilityGaps.find((g) => g.id === gapId);
  if (gap) {
    gap.mentorOverride = mentorOverride;
    gap.isOverridden = true;
  }
  res.json(gap);
};

/**
 * POST /clarity/generate-prompt
 */
export const generatePrompt = async (req: Request, res: Response) => {
  try {
    const { topic, difficulty, taskTitle, taskObjective, scenario } = req.body;
    const result = await claudeService.generatePromptForClarityTask({
      topic: topic || 'Checking AI',
      difficulty: difficulty || 'easy',
      taskTitle: taskTitle || 'AI Task',
      taskObjective: taskObjective || 'Design a reliable AI prompt',
      scenario: scenario || 'Workplace automation workflow',
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate prompt' });
  }
};

/**
 * POST /clarity/run-task
 * Requires authentication and meters credit balance:
 * - First run: complimentary trial (0 AC)
 * - Subsequent runs: deducts 10 AC atomically BEFORE provider call
 * - Provider failure: automatically refunds 10 AC atomically
 */
export const runTask = async (req: AuthenticatedRequest, res: Response) => {
  const { topic, difficulty, taskTitle, userPrompt, contextData } = req.body;
  const user = req.user;
  const userId = user ? String(user._id || user.id) : null;
  const operationId = `op-clarity-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const idempotencyKey = (req.body.idempotencyKey ||
    req.headers['x-idempotency-key'] ||
    operationId) as string;

  // 1. Input sanitization & boundary checks
  if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim().length === 0) {
    return res.status(400).json({ error: 'userPrompt is required and must not be empty' });
  }
  if (userPrompt.length > 3000) {
    return res
      .status(400)
      .json({ error: 'userPrompt exceeds maximum permitted length (3,000 characters)' });
  }

  const CLARITY_TASK_COST = 10;
  let costDeducted = 0;
  let isFreeTrial = false;

  // 2. Server-side credit authorization & atomic pre-deduction
  if (user && userId) {
    const trialRunsUsed = user.clarity?.trialRunsUsed || 0;
    isFreeTrial = trialRunsUsed === 0;
    costDeducted = isFreeTrial ? 0 : CLARITY_TASK_COST;

    if (costDeducted > 0) {
      const spendResult = await creditsLedgerService.executeTransaction({
        userId,
        type: 'SPEND',
        category: 'TASK_USAGE',
        amount: costDeducted,
        reason: `Ran Clarity AI Task: ${taskTitle || topic || 'AI Task'} (-${costDeducted} AC)`,
        source: 'CLARITY',
        sourceId: operationId,
        idempotencyKey,
        relatedTaskId: operationId,
      });

      if (spendResult.conflict) {
        return res.status(409).json({ error: 'Idempotency key reuse conflict' });
      }

      if (!spendResult.success) {
        return res.status(402).json({
          error: `Insufficient AIIMS Credits balance. Running this task requires ${costDeducted} AC. Current balance: ${spendResult.balance ?? 0} AC.`,
          code: 'INSUFFICIENT_CREDITS',
          requiredCredits: costDeducted,
          currentBalance: spendResult.balance ?? 0,
        });
      }

      // Update in-memory user reference
      if (mongoose.connection.readyState === 1 && user._id) {
        const refreshed = await User.findById(user._id);
        if (refreshed) req.user = refreshed;
      } else {
        user.aiimsCredits = spendResult.balance ?? user.aiimsCredits;
      }
    }
  }

  // 3. Provider execution with safe refund handling
  try {
    const startTime = Date.now();

    // Execute prompt with AI provider
    const execResult = await claudeService.executePromptWithAI(userPrompt, contextData);
    const executionTimeMs = Date.now() - startTime;

    // Evaluate prompt & output
    const evalResult = await claudeService.evaluateClarityTask({
      topic: topic || 'Checking AI',
      difficulty: difficulty || 'easy',
      taskTitle: taskTitle || 'AI Task',
      userPrompt,
      output: execResult.output,
    });

    // Update trial runs used
    if (user && userId) {
      if (mongoose.connection.readyState === 1 && user._id) {
        await User.findByIdAndUpdate(user._id, {
          $inc: { 'clarity.trialRunsUsed': 1 },
        });
      } else {
        user.clarity = user.clarity || ({} as any);
        user.clarity.trialRunsUsed = (user.clarity.trialRunsUsed || 0) + 1;
      }
    }

    const currentBalance = userId
      ? await creditsLedgerService.getBalance(userId)
      : mockUser.aiimsCredits;

    res.json({
      output: execResult.output,
      modelUsed: execResult.model,
      executionTimeMs,
      creditsDeducted: costDeducted,
      isFreeTrial,
      currentBalance,
      operationId,
      ...evalResult,
    });
  } catch (err: any) {
    console.error(
      `[ClarityController] AI Provider failed for operation ${operationId}:`,
      err.message
    );

    // If credits were deducted beforehand, atomically refund
    let currentBalance = 0;
    if (costDeducted > 0 && userId) {
      const refundResult = await creditsLedgerService.executeTransaction({
        userId,
        type: 'REFUND',
        category: 'REFUND',
        amount: costDeducted,
        reason: `Automatic Refund: Clarity AI Provider Failure (${taskTitle || topic || 'AI Task'})`,
        source: 'CLARITY',
        sourceId: operationId,
        idempotencyKey: `refund::${operationId}`,
        relatedTaskId: operationId,
        metadata: { originalError: err.message || String(err) },
      });

      currentBalance = refundResult.balance ?? (await creditsLedgerService.getBalance(userId));

      return res.status(500).json({
        error: `AI provider execution failed. Your ${costDeducted} AIIMS Credits have been safely refunded.`,
        refunded: true,
        refundAmount: costDeducted,
        currentBalance,
        operationId,
        details: err.message,
      });
    }

    res.status(500).json({ error: err.message || 'Failed to execute clarity task' });
  }
};

/**
 * POST /clarity/save-task-score
 */
export const saveTaskScore = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topic, difficulty, taskId } = req.body;
    if (!topic || !difficulty || !taskId) {
      return res.status(400).json({ error: 'topic, difficulty, and taskId are required' });
    }

    const rewardXP = CREDIT_RULES.CLARITY_TASK_EASY.xp;
    const rewardCredits = CREDIT_RULES.CLARITY_TASK_EASY.credits;

    if (req.user) {
      const userId = String(req.user._id || req.user.id);
      const actionKey = clarityTaskRewardKey(userId, topic, difficulty, taskId);

      // Server-authoritative single credit mutation through creditsLedgerService
      const ledgerResult = await creditsLedgerService.executeTransaction({
        userId,
        type: 'EARN',
        category: 'REWARD',
        amount: rewardCredits,
        reason: `Completed Clarity AI Task: ${topic} (${difficulty.toUpperCase()}) (+${rewardCredits} AC)`,
        source: 'CLARITY_TASK',
        sourceId: actionKey,
        idempotencyKey: actionKey,
      });

      if (!ledgerResult.success || ledgerResult.duplicate) {
        const currentBal = ledgerResult.balance ?? (await creditsLedgerService.getBalance(userId));
        let currentXP = req.user.xpPoints || 0;
        if (mongoose.connection.readyState === 1 && req.user._id) {
          const latestUser = await User.findById(req.user._id);
          currentXP = latestUser?.xpPoints ?? currentXP;
        }
        return res.json({
          success: true,
          awarded: false,
          message: 'Task credits already claimed',
          rewardXP: 0,
          rewardCredits: 0,
          totalCredits: currentBal,
          totalXP: currentXP,
          actionKey,
        });
      }

      // Successful first-time award: increment XP
      let totalXP = (req.user.xpPoints || 0) + rewardXP;
      const finalBal = ledgerResult.balance ?? (await creditsLedgerService.getBalance(userId));

      if (mongoose.connection.readyState === 1 && req.user._id) {
        const updatedUser = await User.findByIdAndUpdate(
          req.user._id,
          { $inc: { xpPoints: rewardXP } },
          { returnDocument: 'after' }
        );
        if (updatedUser) {
          req.user = updatedUser;
          totalXP = updatedUser.xpPoints;
        }
      } else {
        req.user.xpPoints = totalXP;
        req.user.aiimsCredits = finalBal;
      }

      const tx = ledgerResult.transaction || {
        id: `tx-clarity-${Date.now()}`,
        transactionType: 'TASK_COMPLETION',
        type: 'EARN' as const,
        source: 'CLARITY_TASK',
        sourceId: actionKey,
        amount: rewardCredits,
        description: `Completed Clarity AI Task: ${topic} (${difficulty.toUpperCase()}) (+${rewardCredits} AC)`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        previousBalance: ledgerResult.previousBalance ?? finalBal - rewardCredits,
        newBalance: finalBal,
      };

      return res.json({
        success: true,
        awarded: true,
        rewardXP,
        rewardCredits,
        totalCredits: finalBal,
        totalXP,
        transaction: tx,
        actionKey,
      });
    } else {
      const actionKey = `clarity::mock::${topic || 'general'}::${difficulty || 'easy'}::${taskId || 'task'}`;
      const alreadyAwarded = mockTransactions.some((t) => t.sourceId === actionKey);

      if (alreadyAwarded) {
        return res.json({
          success: true,
          awarded: false,
          message: 'Task credits already claimed',
          rewardXP: 0,
          rewardCredits: 0,
          totalCredits: mockLearnerFullState.profile.aiimsCredits,
          totalXP: mockLearnerFullState.profile.xpPoints,
          actionKey,
        });
      }

      const previousBalance = mockLearnerFullState.profile.aiimsCredits;
      mockLearnerFullState.profile.xpPoints += rewardXP;
      mockLearnerFullState.profile.aiimsCredits += rewardCredits;

      const tx = {
        id: `tx-clarity-${Date.now()}`,
        transactionType: 'TASK_COMPLETION' as const,
        type: 'EARN' as const,
        source: 'CLARITY_TASK',
        sourceId: actionKey,
        amount: rewardCredits,
        description: `Completed Clarity AI Task: ${topic || 'General'} (${(difficulty || 'easy').toUpperCase()}) (+${rewardCredits} AC)`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        previousBalance,
        newBalance: mockLearnerFullState.profile.aiimsCredits,
      };

      mockTransactions.unshift(tx as any);

      return res.json({
        success: true,
        awarded: true,
        rewardXP,
        rewardCredits,
        totalCredits: mockLearnerFullState.profile.aiimsCredits,
        totalXP: mockLearnerFullState.profile.xpPoints,
        transaction: tx,
        actionKey,
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save score' });
  }
};

/**
 * POST /clarity/suggest-reflection
 */
export const suggestReflection = async (req: Request, res: Response) => {
  try {
    const { topic, taskTitle, score } = req.body;
    const isAgents =
      topic?.toLowerCase().includes('agent') || topic?.toLowerCase().includes('autonom');
    const isCheckingAI =
      topic?.toLowerCase().includes('check') || topic?.toLowerCase().includes('eval');

    let suggestion = '';
    try {
      const prompt = `Write a concise 2-sentence first-person reflection for an engineering/product learner who just completed a hands-on AI prompt engineering task in "${topic}" (Task: "${taskTitle || 'AI Task'}", Score: ${score || 85}/100).
The reflection must answer: "Where could this show up in your actual daily work or projects?"
It should follow this format:
"In my daily work with [specific recurring deliverable or process], I can implement a repeatable workflow where [how AI is prompted with constraints and verification]. This will help me [concrete benefit, e.g. eliminate errors, save hours weekly, maintain quality]."
Output ONLY the reflection sentences without quotation marks, intro, or explanation.`;

      const aiRes = await claudeService.executePromptWithAI(prompt);
      if (aiRes && aiRes.output && aiRes.output.trim().length > 30) {
        suggestion = aiRes.output.trim();
      }
    } catch {
      // Fallback below
    }

    if (!suggestion) {
      if (isAgents) {
        suggestion = `In my daily work with multi-source project research, I can deploy an autonomous agent to scan documentation, extract key action items, and flag discrepancies for human review before updating sprint tickets.`;
      } else if (isCheckingAI) {
        suggestion = `In my daily work reviewing code pull requests and technical reports, I can enforce a mandatory verification checklist where AI outputs are cross-referenced against test suites and source metrics before deployment.`;
      } else {
        suggestion = `In my daily work with weekly status updates and team summaries, I can build a repeatable prompt template with defined markdown schemas and strict constraints, cutting manual synthesis time in half while preserving accuracy.`;
      }
    }

    res.json({ suggestion });
  } catch {
    res.json({
      suggestion: `In my daily work, I can establish a repeatable prompt workflow with explicit inputs, validation checkpoints, and structured output formatting to save hours while ensuring high reliability.`,
    });
  }
};
