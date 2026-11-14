import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma, isDatabaseConnected } from '../config/prisma';
import { getDefaultCapabilityGaps } from '../data/aiimsCatalog';
import { ClaudeService } from '../services/anthropic/claude.service';
import { CREDIT_RULES, clarityTaskRewardKey } from '../config/credits.config';
import { creditsLedgerService } from '../services/creditsLedger.service';
import { questionBankService } from '../services/questionBank.service';
import { clarityProgressionService } from '../services/clarityProgression.service';
import {
  claritySubmitSchema,
  clarityProgressionConfigSchema,
  clarityStartAttemptSchema,
  clarityAdminCreateQuestionSchema,
  clarityAdminUpdateQuestionSchema,
  clarityAdminUpdateStatusSchema,
} from '../schemas/clarity.schema';
import { rubricEvaluatorService } from '../services/rubricEvaluator.service';
import { defaultClarity, toJsonInput, userRecordToIUser } from '../utils/userMapper';
import { isSafeKey, isValidId, toArray, toRecord, withLegacyId } from '../utils/id';

const claudeService = new ClaudeService();

export const CLARITY_LEARNING_LEVELS = [
  {
    id: 'understanding',
    topic: 'Understanding',
    name: 'Understanding',
    title: 'Level 1: AI Prompt Understanding',
    levelTier: 'Foundational',
    description:
      'Master foundational prompt mechanics, temperature, framing, edge cases, and constraint enforcement.',
    icon: 'Brain',
    targetCount: 10,
  },
  {
    id: 'workflow',
    topic: 'Workflow',
    name: 'Workflow',
    title: 'Level 2: AI Workflow Orchestration',
    levelTier: 'Intermediate',
    description:
      'Design multi-step reasoning chains, JSON schema enforcement, error recovery, and human-in-the-loop review.',
    icon: 'GitFork',
    targetCount: 10,
  },
  {
    id: 'ai-agents',
    topic: 'AI Agents',
    name: 'AI Agents',
    title: 'Level 3: Autonomous AI Agents',
    levelTier: 'Advanced',
    description:
      'Architect tool use, goal decomposition, autonomous execution loops, boundary verification, and defensive recovery.',
    icon: 'Bot',
    targetCount: 10,
  },
];

export function normalizeClarityTopic(input: string): string {
  const clean = (input || '').toLowerCase().trim();
  if (clean === 'understanding' || clean === 'und' || clean === '1') return 'Understanding';
  if (clean === 'workflow' || clean === 'wf' || clean === '2') return 'Workflow';
  if (
    clean === 'ai-agents' ||
    clean === 'ai_agents' ||
    clean === 'ai agents' ||
    clean === 'agents' ||
    clean === '3'
  ) {
    return 'AI Agents';
  }
  return input;
}

/**
 * GET /clarity/gaps
 */
export const getGaps = (req: AuthenticatedRequest, res: Response) => {
  const baseGaps = getDefaultCapabilityGaps();
  const overrides = toRecord(
    (req.user?.clarity as unknown as Record<string, unknown>)?.gapOverrides
  );

  const merged = baseGaps.map((g) => {
    const override = toRecord(overrides[g.id]);
    if (override && typeof override.mentorOverride === 'string') {
      return {
        ...g,
        mentorOverride: override.mentorOverride,
        isOverridden: Boolean(override.isOverridden ?? true),
      };
    }
    return g;
  });

  return res.json(merged);
};

/**
 * POST /clarity/mentor-override
 */
export const mentorOverride = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const { gapId, mentorOverride: overrideNote } = req.body;
  if (!gapId || typeof gapId !== 'string' || !isSafeKey(gapId.trim())) {
    return res.status(400).json({ error: 'Valid gapId is required' });
  }

  const cleanGapId = gapId.trim();
  const baseGap = getDefaultCapabilityGaps().find((g) => g.id === cleanGapId);
  if (!baseGap) {
    return res.status(404).json({ error: 'Capability gap not found' });
  }

  const userId = String(req.user.id || req.user._id);
  if (!isValidId(userId)) {
    return res.status(400).json({ error: 'Invalid user identifier' });
  }

  const userRow = await prisma.user.findUnique({ where: { id: userId } });
  if (!userRow) {
    return res.status(404).json({ error: 'User record not found' });
  }

  const clarityData = {
    ...defaultClarity(),
    ...toRecord(userRow.clarityData),
  };
  const existingOverrides = toRecord((clarityData as Record<string, unknown>).gapOverrides);

  const nextClarityData = {
    ...clarityData,
    gapOverrides: {
      ...existingOverrides,
      [cleanGapId]: {
        mentorOverride: String(overrideNote || ''),
        isOverridden: true,
      },
    },
  };

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      clarityData: toJsonInput(nextClarityData),
    },
  });
  req.user = userRecordToIUser(updated);

  return res.json({
    ...baseGap,
    mentorOverride: String(overrideNote || ''),
    isOverridden: true,
  });
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
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate prompt' });
  }
};

/**
 * POST /clarity/run-task (also /clarity/run)
 * Requires authentication and meters credit balance:
 * - First run: complimentary trial (0 AC)
 * - Subsequent runs: deducts 10 AC atomically BEFORE provider call
 * - Provider failure: automatically refunds 10 AC atomically
 * - Does NOT mark task as completed or submitted (decoupled from Submit)
 * - Rejects with HTTP 409 if task was already submitted and locked
 */
export const runTask = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const { assignmentId, topic, difficulty, taskTitle, userPrompt, contextData } = req.body;
  const userId = String(req.user.id || req.user._id);
  if (!isValidId(userId)) {
    return res.status(400).json({ error: 'Invalid user identifier', code: 'INVALID_USER_ID' });
  }

  const operationId = `op-clarity-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const idempotencyKey = (req.body.idempotencyKey ||
    req.headers?.['x-idempotency-key'] ||
    operationId) as string;

  // 0. Assignment Lock Check: Cannot execute a task that has already been submitted and locked
  if (assignmentId && typeof assignmentId === 'string') {
    const assignment = await prisma.questionAssignment.findFirst({
      where: { assignmentId, learnerId: userId },
    });

    if (assignment && assignment.status === 'SUBMITTED') {
      return res.status(409).json({
        error: 'This task has already been submitted and is locked.',
        code: 'TASK_LOCKED',
        isLocked: true,
      });
    }

    // Advance to IN_PROGRESS if currently ASSIGNED
    if (assignment && assignment.status === 'ASSIGNED') {
      await prisma.questionAssignment.update({
        where: { assignmentId },
        data: { status: 'IN_PROGRESS' },
      });
    }
  }

  // 1. Input sanitization & boundary checks
  if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim().length === 0) {
    return res.status(400).json({ error: 'userPrompt is required and must not be empty' });
  }
  if (userPrompt.length > 3000) {
    return res
      .status(400)
      .json({ error: 'userPrompt exceeds maximum permitted length (3,000 characters)' });
  }

  const freshUserRow = await prisma.user.findUnique({ where: { id: userId } });
  if (!freshUserRow) {
    return res.status(404).json({ error: 'User record not found', code: 'USER_NOT_FOUND' });
  }

  const clarityState = {
    ...defaultClarity(),
    ...toRecord(freshUserRow.clarityData),
  };

  const CLARITY_TASK_COST = 10;
  const trialRunsUsed = Number(clarityState.trialRunsUsed || 0);
  let isFreeTrial = trialRunsUsed === 0;
  let costDeducted = isFreeTrial ? 0 : CLARITY_TASK_COST;

  if (isFreeTrial) {
    // Atomically claim the first-free trial via CreditLedger to prevent concurrent race conditions
    const claimResult = await creditsLedgerService.executeTransaction({
      userId,
      type: 'EARN',
      category: 'REWARD',
      amount: 0,
      reason: 'Clarity First-Free Trial Grant',
      source: 'CLARITY',
      sourceId: `first-free-${userId}`,
      idempotencyKey: `clarity-first-free-${userId}`,
      relatedTaskId: operationId,
    });

    if (claimResult.duplicate || claimResult.conflict) {
      isFreeTrial = false;
      costDeducted = CLARITY_TASK_COST;
    }
  }

  // 2. Server-side credit authorization & atomic pre-deduction
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

    if (spendResult.code === 'DATABASE_UNAVAILABLE') {
      return res.status(503).json({
        error: 'Database service unavailable. PostgreSQL connection is required.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

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

    const refreshed = await prisma.user.findUnique({ where: { id: userId } });
    if (refreshed) {
      req.user = userRecordToIUser(refreshed);
    }
  }

  // 3. Provider execution with safe refund handling
  try {
    const startTime = Date.now();

    // Execute prompt with AI provider
    const execResult = await claudeService.executePromptWithAI(userPrompt, contextData);
    const executionTimeMs = Date.now() - startTime;

    // Evaluate prompt & output (formative guidance)
    const evalResult = await claudeService.evaluateClarityTask({
      topic: topic || 'Checking AI',
      difficulty: difficulty || 'easy',
      taskTitle: taskTitle || 'AI Task',
      userPrompt,
      output: execResult.output,
    });

    // Update trial runs used on fresh clarityData
    const latestRow = await prisma.user.findUnique({ where: { id: userId } });
    const latestClarity = {
      ...defaultClarity(),
      ...toRecord(latestRow?.clarityData),
    };
    const nextTrials = Number(latestClarity.trialRunsUsed || 0) + 1;

    const updatedRow = await prisma.user.update({
      where: { id: userId },
      data: {
        clarityData: toJsonInput({
          ...latestClarity,
          trialRunsUsed: nextTrials,
        }),
      },
    });
    req.user = userRecordToIUser(updatedRow);

    const currentBalance = await creditsLedgerService.getBalance(userId);

    return res.json({
      output: execResult.output,
      modelUsed: execResult.model,
      executionTimeMs,
      creditsDeducted: costDeducted,
      isFreeTrial,
      currentBalance,
      operationId,
      isLocked: false,
      ...evalResult,
    });
  } catch (err: any) {
    console.error(
      `[ClarityController] AI Provider failed for operation ${operationId}:`,
      err.message
    );

    // If credits were deducted beforehand, atomically refund
    if (costDeducted > 0) {
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

      const currentBalance =
        refundResult.balance ?? (await creditsLedgerService.getBalance(userId));

      return res.status(500).json({
        error: `AI provider execution failed. Your ${costDeducted} AIIMS Credits have been safely refunded.`,
        refunded: true,
        refundAmount: costDeducted,
        currentBalance,
        operationId,
        details: err.message,
      });
    }

    return res.status(500).json({ error: err.message || 'Failed to execute clarity task' });
  }
};

/**
 * POST /clarity/submit & POST /clarity/attempts/submit
 * Server-authoritative task submission, rubric evaluation, attempt logging,
 * Phase 4 credit economy enforcement (first attempt in level free, subsequent 10 AC),
 * automatic refund on AI failure, XP award, and task locking.
 */
export const submitClarityTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'Database service unavailable. PostgreSQL connection is required.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    const parseResult = claritySubmitSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid submission payload',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    const learnerId = String(req.user.id || req.user._id);
    const { assignmentId, answer, timeTakenSeconds } = parseResult.data;

    // 1. Fetch assignment
    const assignment = await prisma.questionAssignment.findFirst({
      where: { assignmentId, learnerId },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found or does not belong to you' });
    }

    // 2. Lock check: If already submitted, reject with HTTP 409
    if (assignment.status === 'SUBMITTED') {
      return res.status(409).json({
        error: 'This task has already been submitted and is locked.',
        code: 'TASK_LOCKED',
        isLocked: true,
      });
    }

    // 3. Fetch Question
    const question = await prisma.questionBank.findUnique({
      where: { questionId: assignment.questionId },
    });

    if (!question) {
      return res.status(404).json({ error: 'Assigned question not found in Question Bank' });
    }

    // 4. Calculate Phase 4 Credit Pricing:
    // First attempt for each learning level: FREE (0 AC).
    // Subsequent valid question submissions in this level: 10 AC each.
    const priorAttemptsCount = await prisma.questionAttempt.count({
      where: { learnerId, topic: question.topic },
    });
    let isFirstAttemptFree = priorAttemptsCount === 0;
    let submissionCost = isFirstAttemptFree ? 0 : 10;
    const idempotencyKey = parseResult.data.idempotencyKey || `clarity-sub-${assignmentId}`;
    let creditTransactionId: string | null = null;

    if (isFirstAttemptFree) {
      // Claim first-free attempt atomically to eliminate race conditions with concurrent requests
      const claimResult = await creditsLedgerService.executeTransaction({
        userId: learnerId,
        type: 'EARN',
        category: 'REWARD',
        amount: 0,
        reason: `Clarity First-Free Attempt: ${question.topic}`,
        source: 'CLARITY',
        sourceId: `first-free-${question.topic}`,
        idempotencyKey: `clarity-first-free-${learnerId}-${question.topic}`,
        relatedTaskId: assignmentId,
      });
      if (claimResult.conflict) {
        // Already claimed by a concurrent attempt
        isFirstAttemptFree = false;
        submissionCost = 10;
      }
    }

    // 5. Server-Side Atomic Credit Pre-Deduction (if not free attempt)
    if (submissionCost > 0) {
      const spendResult = await creditsLedgerService.executeTransaction({
        userId: learnerId,
        type: 'SPEND',
        category: 'TASK_USAGE',
        amount: submissionCost,
        reason: `Clarity AI Task Submission: ${question.title} (-${submissionCost} AC)`,
        source: 'CLARITY',
        sourceId: assignmentId,
        idempotencyKey,
        relatedTaskId: assignmentId,
      });

      if (spendResult.code === 'DATABASE_UNAVAILABLE') {
        return res.status(503).json({
          error: 'Database service unavailable. PostgreSQL connection is required.',
          code: 'DATABASE_UNAVAILABLE',
        });
      }

      if (spendResult.conflict) {
        return res.status(409).json({ error: 'Idempotency key reuse conflict' });
      }

      if (!spendResult.success) {
        return res.status(402).json({
          error: `Insufficient AIIMS Credits balance. Submitting this task requires ${submissionCost} AC. Current balance: ${spendResult.balance ?? 0} AC.`,
          code: 'INSUFFICIENT_CREDITS',
          requiredCredits: submissionCost,
          currentBalance: spendResult.balance ?? 0,
        });
      }

      creditTransactionId = spendResult.transaction?.id || idempotencyKey;
    }

    // 6. Server-authoritative Genuine AI Rubric Evaluation with automatic refund safety
    const cleanAnswer = answer.trim();
    let evaluation;
    try {
      evaluation = await rubricEvaluatorService.evaluateAnswer({
        question: {
          title: question.title,
          promptText: question.promptText,
          testScenario: question.testScenario,
          expectedCriteria: question.expectedCriteria,
        },
        rubric: toArray(question.scoringRubric),
        learnerAnswer: cleanAnswer,
      });
    } catch (evalErr: any) {
      console.error(
        `[ClarityController] Rubric evaluation failed for assignment ${assignmentId}:`,
        evalErr.message
      );

      // Automatic refund if credits were charged before the evaluation failed
      if (submissionCost > 0) {
        try {
          await creditsLedgerService.executeTransaction({
            userId: learnerId,
            type: 'REFUND',
            category: 'REFUND',
            amount: submissionCost,
            reason: `Automatic Refund: Clarity AI Evaluation Failure (${question.title})`,
            source: 'CLARITY',
            sourceId: assignmentId,
            idempotencyKey: `refund::${idempotencyKey}`,
            relatedTaskId: assignmentId,
            metadata: { originalError: evalErr.message },
          });
        } catch (refundErr: any) {
          console.error(
            `[ClarityController] Failed to execute automatic refund for ${assignmentId}:`,
            refundErr.message
          );
        }
      }

      return res.status(502).json({
        error: `AI rubric evaluation failed. Your ${
          submissionCost > 0
            ? submissionCost + ' AC have been safely refunded.'
            : 'submission was not counted.'
        }`,
        code: evalErr.code || 'RUBRIC_EVALUATION_FAILED',
        details: evalErr.message,
        refunded: submissionCost > 0,
        refundAmount: submissionCost,
      });
    }

    const rubricFeedback = evaluation.criteria.map((c) => ({
      criterion: c.criterion,
      score: c.score,
      maxScore: c.maxScore,
      comment: c.feedback,
    }));

    const score = evaluation.overallScore;
    const overallFeedback = evaluation.overallFeedback;
    const attemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const submittedAt = new Date();

    // 7. Atomically lock assignment & persist immutable attempt record in PostgreSQL
    await prisma.$transaction(async (tx) => {
      const lockUpdate = await tx.questionAssignment.updateMany({
        where: {
          assignmentId,
          learnerId,
          status: { not: 'SUBMITTED' },
        },
        data: {
          status: 'SUBMITTED',
          completedAt: submittedAt,
        },
      });

      if (lockUpdate.count === 0) {
        const lockErr: any = new Error('This task has already been submitted and is locked.');
        lockErr.code = 'TASK_LOCKED';
        lockErr.status = 409;
        throw lockErr;
      }

      await tx.questionAttempt.create({
        data: {
          attemptId,
          assignmentId,
          learnerId,
          questionId: question.questionId,
          topic: assignment.topic,
          level: assignment.level,
          track: assignment.track || 'General',
          startedAt: assignment.assignedAt || submittedAt,
          submittedAt,
          submittedAnswer: cleanAnswer,
          score,
          rubricFeedback: toJsonInput(rubricFeedback),
          overallFeedback,
          evaluationStatus: 'EVALUATED',
          timeTakenSeconds: timeTakenSeconds || 0,
          creditTransactionId,
        },
      });

      // 8. Award XP (50 XP) to User.xpPoints atomically inside the transaction lock
      if (isValidId(learnerId)) {
        await tx.user.update({
          where: { id: learnerId },
          data: { xpPoints: { increment: 50 } },
        });
      }
    });

    const rewardXP = 50;
    let currentXP = (req.user.xpPoints || 0) + rewardXP;
    if (isValidId(learnerId)) {
      const freshUser = await prisma.user.findUnique({ where: { id: learnerId } });
      if (freshUser) {
        req.user = userRecordToIUser(freshUser);
        currentXP = freshUser.xpPoints;
      }
    }

    const currentBalance = await creditsLedgerService.getBalance(learnerId);

    // 9. Authoritative progression update
    const progression = await clarityProgressionService.recordAttemptScore(
      learnerId,
      assignment.topic,
      score,
      attemptId
    );

    return res.status(200).json({
      success: true,
      attemptId,
      score,
      rubricFeedback,
      overallFeedback,
      submittedAt,
      timeTakenSeconds: timeTakenSeconds || 0,
      isLocked: true,
      creditsDeducted: submissionCost,
      isFirstAttemptFree,
      currentBalance,
      xpAwarded: rewardXP,
      currentXP,
      progression,
    });
  } catch (err: any) {
    console.error('[ClarityController] submitClarityTask error:', err);
    if (err.code === 'TASK_LOCKED' || err.status === 409) {
      return res.status(409).json({
        error: err.message || 'This task has already been submitted and is locked.',
        code: 'TASK_LOCKED',
        isLocked: true,
      });
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
    return res.status(500).json({ error: err.message || 'Failed to submit clarity task' });
  }
};

/**
 * POST /clarity/active-task
 * Fetches the active or latest question assignment for the learner and topic.
 * If none exists, automatically serves an eligible question from QuestionBank at the learner's current level.
 */
export const getActiveClarityTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'Database service unavailable. PostgreSQL connection is required.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    const { topic, track } = req.body;
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'topic is required' });
    }

    const learnerId = String(req.user.id || req.user._id);
    const progression = await clarityProgressionService.getLearnerProgression(learnerId, topic);

    // 1. Look for existing in-progress or recently submitted assignment for this topic
    const existingAssignment = await prisma.questionAssignment.findFirst({
      where: {
        learnerId,
        topic,
      },
      orderBy: { assignedAt: 'desc' },
    });

    if (existingAssignment) {
      const question = await prisma.questionBank.findUnique({
        where: { questionId: existingAssignment.questionId },
      });

      if (question) {
        const isLocked = existingAssignment.status === 'SUBMITTED';
        const attempt = isLocked
          ? await prisma.questionAttempt.findFirst({
              where: { assignmentId: existingAssignment.assignmentId },
            })
          : null;

        return res.status(200).json({
          hasActiveTask: true,
          isLocked,
          assignmentId: existingAssignment.assignmentId,
          assignedAt: existingAssignment.assignedAt,
          completedAt: existingAssignment.completedAt,
          currentLevel: progression.currentLevel,
          consecutiveHighScores: progression.consecutiveHighScores,
          question: {
            questionId: question.questionId,
            topic: question.topic,
            level: question.level,
            track: question.track,
            title: question.title,
            promptText: question.promptText,
            hint: question.hint,
            testScenario: question.testScenario,
            expectedCriteria: question.expectedCriteria,
            scoringRubric: toArray(question.scoringRubric),
          },
          attempt: attempt
            ? {
                attemptId: attempt.attemptId,
                score: attempt.score,
                rubricFeedback: toArray(attempt.rubricFeedback),
                overallFeedback: attempt.overallFeedback,
                submittedAnswer: attempt.submittedAnswer,
                timeTakenSeconds: attempt.timeTakenSeconds,
                submittedAt: attempt.submittedAt,
              }
            : null,
        });
      }
    }

    // 2. No assignment found: serve eligible question from QuestionBank at learner's progression level
    const result = await questionBankService.serveQuestion({
      learnerId,
      topic,
      level: progression.currentLevel,
      track: (track as any) || 'General',
      userCollege: req.user.college,
    });

    return res.status(200).json({
      hasActiveTask: true,
      isLocked: false,
      assignmentId: result.assignment.assignmentId,
      assignedAt: result.assignment.assignedAt,
      currentLevel: progression.currentLevel,
      consecutiveHighScores: progression.consecutiveHighScores,
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
        scoringRubric: toArray(result.question.scoringRubric),
      },
      attempt: null,
    });
  } catch (err: any) {
    console.error('[ClarityController] getActiveClarityTask error:', err);
    if (err.message === 'DATABASE_UNAVAILABLE') {
      return res.status(503).json({
        error: 'Database service unavailable. PostgreSQL connection is required.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    return res.status(500).json({ error: err.message || 'Failed to get active clarity task' });
  }
};

/**
 * POST /clarity/next-task
 * Serves the next eligible question for a learner, respecting updated progression level,
 * personal no-repeat guarantee, and 30-day institutional exclusion window.
 */
export const serveNextClarityTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'Database service unavailable. PostgreSQL connection is required.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    const { topic, track } = req.body;
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'topic is required' });
    }

    const learnerId = String(req.user.id || req.user._id);
    const progression = await clarityProgressionService.getLearnerProgression(learnerId, topic);

    const result = await questionBankService.serveQuestion({
      learnerId,
      topic,
      level: progression.currentLevel,
      track: (track as any) || 'General',
      userCollege: req.user.college,
    });

    return res.status(200).json({
      success: true,
      assignmentId: result.assignment.assignmentId,
      assignedAt: result.assignment.assignedAt,
      currentLevel: progression.currentLevel,
      consecutiveHighScores: progression.consecutiveHighScores,
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
        scoringRubric: toArray(result.question.scoringRubric),
      },
    });
  } catch (err: any) {
    console.error('[ClarityController] serveNextClarityTask error:', err);
    if (err.message === 'DATABASE_UNAVAILABLE') {
      return res.status(503).json({
        error: 'Database service unavailable. PostgreSQL connection is required.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    return res.status(500).json({ error: err.message || 'Failed to serve next clarity task' });
  }
};

/**
 * GET /clarity/progression
 * Returns learner's progression for a topic.
 */
export const getProgressionHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'Database service unavailable. PostgreSQL connection is required.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    const topic = (req.query.topic as string) || 'AI Prompt Engineering';
    const learnerId = String(req.user.id || req.user._id);
    const progression = await clarityProgressionService.getLearnerProgression(learnerId, topic);

    return res.status(200).json({
      success: true,
      progression,
    });
  } catch (err: any) {
    console.error('[ClarityController] getProgressionHandler error:', err);
    return res.status(500).json({ error: err.message || 'Failed to get progression' });
  }
};

/**
 * GET /clarity/progression-config
 * Returns active progression configuration.
 */
export const getProgressionConfigHandler = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'Database service unavailable. PostgreSQL connection is required.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }
    const config = await clarityProgressionService.getProgressionConfig();
    return res.status(200).json({
      success: true,
      config,
    });
  } catch (err: any) {
    console.error('[ClarityController] getProgressionConfigHandler error:', err);
    return res.status(500).json({ error: err.message || 'Failed to get progression config' });
  }
};

/**
 * PUT /clarity/progression-config
 * Updates progression configuration (Admin only).
 */
export const updateProgressionConfigHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator access required' });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'Database service unavailable. PostgreSQL connection is required.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    const parseResult = clarityProgressionConfigSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid progression config parameters',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    const adminId = String(req.user.id || req.user._id);
    const updated = await clarityProgressionService.updateProgressionConfig(
      adminId,
      parseResult.data
    );

    return res.status(200).json({
      success: true,
      config: updated,
    });
  } catch (err: any) {
    console.error('[ClarityController] updateProgressionConfigHandler error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update progression config' });
  }
};

/**
 * POST /clarity/save-task-score
 */
export const saveTaskScore = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'Database service unavailable. PostgreSQL connection is required.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    const { topic, difficulty, taskId } = req.body;
    if (!topic || !difficulty || !taskId) {
      return res.status(400).json({ error: 'topic, difficulty, and taskId are required' });
    }

    const rewardXP = CREDIT_RULES.CLARITY_TASK_EASY.xp;
    const rewardCredits = CREDIT_RULES.CLARITY_TASK_EASY.credits;
    const userId = String(req.user.id || req.user._id);
    const actionKey = clarityTaskRewardKey(userId, topic, difficulty, taskId);

    // Server-authoritative single credit mutation through creditsLedgerService
    const ledgerResult = await creditsLedgerService.executeTransaction({
      userId,
      type: 'EARN',
      category: 'REWARD',
      amount: rewardCredits,
      reason: `Completed Clarity AI Task: ${topic} (${String(difficulty).toUpperCase()}) (+${rewardCredits} AC)`,
      source: 'CLARITY_TASK',
      sourceId: actionKey,
      idempotencyKey: actionKey,
    });

    if (ledgerResult.code === 'DATABASE_UNAVAILABLE') {
      return res.status(503).json({
        error: 'Database service unavailable. PostgreSQL connection is required.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    if (!ledgerResult.success || ledgerResult.duplicate) {
      const currentBal = ledgerResult.balance ?? (await creditsLedgerService.getBalance(userId));
      let currentXP = req.user.xpPoints || 0;
      if (isValidId(userId)) {
        const latestUser = await prisma.user.findUnique({ where: { id: userId } });
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

    if (isValidId(userId)) {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { xpPoints: { increment: rewardXP } },
      });
      req.user = userRecordToIUser(updatedUser);
      totalXP = updatedUser.xpPoints;
    }

    const tx = ledgerResult.transaction || {
      id: `tx-clarity-${Date.now()}`,
      transactionType: 'TASK_COMPLETION',
      type: 'EARN' as const,
      source: 'CLARITY_TASK',
      sourceId: actionKey,
      amount: rewardCredits,
      description: `Completed Clarity AI Task: ${topic} (${String(difficulty).toUpperCase()}) (+${rewardCredits} AC)`,
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to save score' });
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

    return res.json({ suggestion });
  } catch {
    return res.json({
      suggestion: `In my daily work, I can establish a repeatable prompt workflow with explicit inputs, validation checkpoints, and structured output formatting to save hours while ensuring high reliability.`,
    });
  }
};

// ============================================================================
// PHASE 4: CLARITY AI TASK LAB — CORE CONTROLLERS & ENDPOINTS
// ============================================================================

/**
 * GET /clarity/levels
 * Returns the 3 learning levels (Understanding, Workflow, AI Agents) with approved
 * question counts, learner progress, and first-attempt-free status.
 */
export const getClarityLevels = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'Database service unavailable. PostgreSQL connection is required.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    const learnerId = String(req.user.id || req.user._id);

    // Fetch user attempts to calculate completion per level
    const userAttempts = await prisma.questionAttempt.findMany({
      where: { learnerId },
      select: { questionId: true, topic: true, score: true },
    });

    const completedQuestionIdsByTopic: Record<string, Set<string>> = {
      Understanding: new Set<string>(),
      Workflow: new Set<string>(),
      'AI Agents': new Set<string>(),
    };
    const totalAttemptsByTopic: Record<string, number> = {
      Understanding: 0,
      Workflow: 0,
      'AI Agents': 0,
    };

    for (const att of userAttempts) {
      const top = normalizeClarityTopic(att.topic);
      if (completedQuestionIdsByTopic[top]) {
        completedQuestionIdsByTopic[top].add(att.questionId);
        totalAttemptsByTopic[top]++;
      }
    }

    // Query approved question counts from PostgreSQL
    const approvedRows = await prisma.questionBank.findMany({
      where: { status: { in: ['APPROVED', 'ACTIVE'] } },
      select: { topic: true },
    });

    const approvedCountByTopic: Record<string, number> = {
      Understanding: 0,
      Workflow: 0,
      'AI Agents': 0,
    };
    for (const r of approvedRows) {
      const top = normalizeClarityTopic(r.topic);
      if (approvedCountByTopic[top] !== undefined) {
        approvedCountByTopic[top]++;
      }
    }

    const levels = CLARITY_LEARNING_LEVELS.map((lvl) => {
      const totalQuestions = approvedCountByTopic[lvl.topic] || lvl.targetCount;
      const completedCount = completedQuestionIdsByTopic[lvl.topic]?.size || 0;
      const attemptsCount = totalAttemptsByTopic[lvl.topic] || 0;
      const isFirstAttemptFree = attemptsCount === 0;
      const progressPercentage = Math.min(
        100,
        Math.round((completedCount / (totalQuestions || 1)) * 100)
      );

      return {
        id: lvl.id,
        topic: lvl.topic,
        name: lvl.name,
        title: lvl.title,
        levelTier: lvl.levelTier,
        description: lvl.description,
        icon: lvl.icon,
        totalQuestions,
        completedQuestions: completedCount,
        isFirstAttemptFree,
        progressPercentage,
      };
    });

    return res.status(200).json({
      success: true,
      levels,
    });
  } catch (err: any) {
    console.error('[ClarityController] getClarityLevels error:', err);
    return res.status(500).json({ error: err.message || 'Failed to get clarity levels' });
  }
};

/**
 * GET /clarity/levels/:level/questions
 * Returns approved questions for a specified level, sanitized for learners.
 */
export const getLevelQuestions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'Database service unavailable. PostgreSQL connection is required.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    const levelParam = req.params.level || '';
    const topic = normalizeClarityTopic(levelParam);
    const learnerId = String(req.user.id || req.user._id);
    const isAdmin = req.user.role === 'admin';

    // Status filter: non-admins ONLY see APPROVED/ACTIVE questions!
    const statusFilter =
      isAdmin && req.query.allStatus === 'true' ? undefined : { in: ['APPROVED', 'ACTIVE'] };

    const questions = await prisma.questionBank.findMany({
      where: {
        topic,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: [{ level: 'asc' }, { questionId: 'asc' }],
    });

    // Fetch user assignments and attempts for this learner in this topic
    const assignments = await prisma.questionAssignment.findMany({
      where: { learnerId, topic },
    });
    const assignmentMap = new Map<string, any>();
    for (const asg of assignments) {
      assignmentMap.set(asg.questionId, asg);
    }

    const attempts = await prisma.questionAttempt.findMany({
      where: { learnerId, topic },
      orderBy: { submittedAt: 'desc' },
    });
    const latestAttemptMap = new Map<string, any>();
    for (const att of attempts) {
      if (!latestAttemptMap.has(att.questionId)) {
        latestAttemptMap.set(att.questionId, att);
      }
    }

    const isFirstAttemptFree = attempts.length === 0;

    const sanitizedQuestions = questions.map((q) => {
      const asg = assignmentMap.get(q.questionId);
      const att = latestAttemptMap.get(q.questionId);
      const isLocked = asg?.status === 'SUBMITTED';
      const meta = toRecord(q.aiMetadata);

      return {
        questionId: q.questionId,
        topic: q.topic,
        level: q.level,
        track: q.track,
        title: q.title,
        promptText: q.promptText,
        hint: q.hint,
        testScenario: q.testScenario,
        expectedCriteria: q.expectedCriteria,
        scoringRubric: toArray(q.scoringRubric),
        learningObjective: (meta.learningObjective as string) || q.title,
        expectedAnswerFormat:
          (meta.expectedAnswerFormat as string) || 'Structured Prompt / Criteria Response',
        source: q.source,
        status: q.status,
        version: q.version,
        userStatus: att ? 'COMPLETED' : asg ? asg.status : 'NOT_STARTED',
        lastScore: att ? att.score : null,
        attemptId: att ? att.attemptId : null,
        assignmentId: asg ? asg.assignmentId : null,
        isLocked,
        // Model answer guidance and internal evaluation keys are strictly suppressed for learners
        ...(isAdmin
          ? {
              reviewedBy: q.reviewedBy,
              reviewedAt: q.reviewedAt,
              reviewNotes: q.reviewNotes,
              evaluationGuidance: meta.evaluationGuidance,
            }
          : {}),
      };
    });

    return res.status(200).json({
      success: true,
      topic,
      totalQuestions: sanitizedQuestions.length,
      isFirstAttemptFree,
      costPerSubmission: isFirstAttemptFree ? 0 : 10,
      questions: sanitizedQuestions,
    });
  } catch (err: any) {
    console.error('[ClarityController] getLevelQuestions error:', err);
    return res.status(500).json({ error: err.message || 'Failed to get level questions' });
  }
};

/**
 * POST /clarity/attempts/start
 * Starts or returns an active assignment for a learner and question.
 */
export const startClarityAttempt = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'Database service unavailable. PostgreSQL connection is required.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    const parseResult = clarityStartAttemptSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid start attempt parameters',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    const { questionId } = parseResult.data;
    const learnerId = String(req.user.id || req.user._id);

    const question = await prisma.questionBank.findUnique({
      where: { questionId },
    });
    if (!question) {
      return res.status(404).json({ error: 'Question not found in Question Bank' });
    }

    if (
      question.status !== 'APPROVED' &&
      question.status !== 'ACTIVE' &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        error: 'This question has not been published by an administrator.',
        code: 'QUESTION_NOT_PUBLISHED',
      });
    }

    // Check if assignment already exists
    let assignment = await prisma.questionAssignment.findUnique({
      where: {
        learnerId_questionId: {
          learnerId,
          questionId,
        },
      },
    });

    if (!assignment) {
      const assignmentId = `asg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      assignment = await prisma.questionAssignment.create({
        data: {
          assignmentId,
          learnerId,
          questionId,
          topic: question.topic,
          level: question.level,
          track: question.track,
          status: 'ASSIGNED',
          assignedAt: new Date(),
        },
      });
    }

    const isLocked = assignment.status === 'SUBMITTED';
    const priorAttempts = await prisma.questionAttempt.count({
      where: { learnerId, topic: question.topic },
    });
    const isFirstAttemptFree = priorAttempts === 0;
    const cost = isFirstAttemptFree ? 0 : 10;
    const meta = toRecord(question.aiMetadata);

    return res.status(200).json({
      success: true,
      assignmentId: assignment.assignmentId,
      isLocked,
      isFirstAttemptFree,
      submissionCost: cost,
      question: {
        questionId: question.questionId,
        topic: question.topic,
        level: question.level,
        track: question.track,
        title: question.title,
        promptText: question.promptText,
        hint: question.hint,
        testScenario: question.testScenario,
        expectedCriteria: question.expectedCriteria,
        scoringRubric: toArray(question.scoringRubric),
        learningObjective: (meta.learningObjective as string) || question.title,
        expectedAnswerFormat:
          (meta.expectedAnswerFormat as string) || 'Structured Prompt / Criteria Response',
      },
    });
  } catch (err: any) {
    console.error('[ClarityController] startClarityAttempt error:', err);
    return res.status(500).json({ error: err.message || 'Failed to start clarity attempt' });
  }
};

/**
 * GET /clarity/history
 * Returns the authenticated learner's attempt history.
 */
export const getClarityHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'Database service unavailable. PostgreSQL connection is required.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    const learnerId = String(req.user.id || req.user._id);
    const { topic } = req.query as { topic?: string };

    const where: any = { learnerId };
    if (topic) {
      where.topic = normalizeClarityTopic(topic);
    }

    const attempts = await prisma.questionAttempt.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      include: {
        question: {
          select: {
            title: true,
            level: true,
            topic: true,
            promptText: true,
          },
        },
      },
    });

    const history = attempts.map((att) => ({
      attemptId: att.attemptId,
      assignmentId: att.assignmentId,
      questionId: att.questionId,
      topic: att.topic,
      level: att.level,
      title: att.question?.title || att.topic,
      score: att.score,
      rubricFeedback: toArray(att.rubricFeedback),
      overallFeedback: att.overallFeedback,
      submittedAnswer: att.submittedAnswer,
      timeTakenSeconds: att.timeTakenSeconds,
      submittedAt: att.submittedAt,
      creditTransactionId: att.creditTransactionId,
    }));

    return res.status(200).json({
      success: true,
      count: history.length,
      history,
    });
  } catch (err: any) {
    console.error('[ClarityController] getClarityHistory error:', err);
    return res.status(500).json({ error: err.message || 'Failed to get clarity history' });
  }
};

/**
 * GET /clarity/progress
 * Returns summary of learner's progress across all 3 levels.
 */
export const getClarityProgress = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'Database service unavailable. PostgreSQL connection is required.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    const learnerId = String(req.user.id || req.user._id);

    const attempts = await prisma.questionAttempt.findMany({
      where: { learnerId },
      select: { questionId: true, topic: true, score: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: learnerId },
      select: { xpPoints: true, aiimsCredits: true },
    });

    const completedQuestionIds = new Set<string>();
    const levelStats: Record<string, { completed: number; total: number; scores: number[] }> = {
      Understanding: { completed: 0, total: 10, scores: [] },
      Workflow: { completed: 0, total: 10, scores: [] },
      'AI Agents': { completed: 0, total: 10, scores: [] },
    };

    let totalScoreSum = 0;
    for (const att of attempts) {
      completedQuestionIds.add(att.questionId);
      totalScoreSum += att.score;
      const top = normalizeClarityTopic(att.topic);
      if (levelStats[top]) {
        levelStats[top].scores.push(att.score);
      }
    }

    for (const key of Object.keys(levelStats)) {
      const distinctInLevel = new Set(
        attempts.filter((a) => normalizeClarityTopic(a.topic) === key).map((a) => a.questionId)
      );
      levelStats[key].completed = distinctInLevel.size;
    }

    const averageScore = attempts.length > 0 ? Math.round(totalScoreSum / attempts.length) : 0;

    return res.status(200).json({
      success: true,
      totalCompleted: completedQuestionIds.size,
      totalQuestions: 30,
      totalAttempts: attempts.length,
      averageScore,
      xpPoints: user?.xpPoints || 0,
      aiimsCredits: user?.aiimsCredits || 0,
      levels: {
        understanding: {
          completed: levelStats['Understanding'].completed,
          total: 10,
          avgScore:
            levelStats['Understanding'].scores.length > 0
              ? Math.round(
                  levelStats['Understanding'].scores.reduce((a, b) => a + b, 0) /
                    levelStats['Understanding'].scores.length
                )
              : 0,
        },
        workflow: {
          completed: levelStats['Workflow'].completed,
          total: 10,
          avgScore:
            levelStats['Workflow'].scores.length > 0
              ? Math.round(
                  levelStats['Workflow'].scores.reduce((a, b) => a + b, 0) /
                    levelStats['Workflow'].scores.length
                )
              : 0,
        },
        aiAgents: {
          completed: levelStats['AI Agents'].completed,
          total: 10,
          avgScore:
            levelStats['AI Agents'].scores.length > 0
              ? Math.round(
                  levelStats['AI Agents'].scores.reduce((a, b) => a + b, 0) /
                    levelStats['AI Agents'].scores.length
                )
              : 0,
        },
      },
    });
  } catch (err: any) {
    console.error('[ClarityController] getClarityProgress error:', err);
    return res.status(500).json({ error: err.message || 'Failed to get clarity progress' });
  }
};

// =========================================================================
// ADMINISTRATIVE QUESTION BANK REVIEW & CONTENT MANAGEMENT
// =========================================================================

/**
 * GET /clarity/admin/questions
 */
export const adminListClarityQuestions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator access required' });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    const { topic, level, status } = req.query as Record<string, string>;
    const where: Prisma.QuestionBankWhereInput = {};

    if (topic) where.topic = normalizeClarityTopic(topic);
    if (level) where.level = level;
    if (status) where.status = status;

    const rows = await prisma.questionBank.findMany({
      where,
      orderBy: [{ topic: 'asc' }, { level: 'asc' }, { questionId: 'asc' }],
    });

    const questions = rows.map((q) => ({
      ...withLegacyId(q),
      scoringRubric: toArray(q.scoringRubric),
      aiMetadata: toRecord(q.aiMetadata),
    }));

    return res.status(200).json({ count: questions.length, questions });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to list clarity questions' });
  }
};

/**
 * POST /clarity/admin/questions
 */
export const adminCreateClarityQuestion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator access required' });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    const parseResult = clarityAdminCreateQuestionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid question creation payload',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    const adminId = String(req.user.id || req.user._id || 'admin');
    const data = parseResult.data;
    const topic = normalizeClarityTopic(data.topic);
    const prefix = topic
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .slice(0, 7);
    const questionId = data.questionId || `clarity-${prefix}-${Date.now().toString(36)}`;

    const created = await prisma.questionBank.create({
      data: {
        questionId,
        topic,
        level: data.level,
        track: data.track || 'General',
        title: data.title,
        promptText: data.promptText,
        hint: data.hint ?? null,
        testScenario: data.testScenario,
        expectedCriteria: data.expectedCriteria,
        scoringRubric: toJsonInput(data.scoringRubric),
        source: data.source || 'Human',
        status: data.status || 'DRAFT',
        version: 1,
        createdBy: adminId,
        reviewedBy: data.status === 'APPROVED' ? adminId : null,
        reviewedAt: data.status === 'APPROVED' ? new Date() : null,
        reviewNotes: data.reviewNotes ?? null,
        aiMetadata: data.aiMetadata ? toJsonInput(data.aiMetadata) : undefined,
      },
    });

    return res.status(201).json({
      success: true,
      question: {
        ...withLegacyId(created),
        scoringRubric: toArray(created.scoringRubric),
        aiMetadata: toRecord(created.aiMetadata),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create clarity question' });
  }
};

/**
 * PATCH /clarity/admin/questions/:id
 */
export const adminUpdateClarityQuestion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator access required' });
    }
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

    const parseResult = clarityAdminUpdateQuestionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid update payload',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    const existing = await prisma.questionBank.findUnique({ where: { questionId: id } });
    if (!existing) {
      return res.status(404).json({ error: 'Question not found in Question Bank' });
    }

    const d = parseResult.data;
    const updateData: Prisma.QuestionBankUpdateInput = {
      version: { increment: 1 },
      ...(d.topic !== undefined ? { topic: normalizeClarityTopic(d.topic) } : {}),
      ...(d.level !== undefined ? { level: d.level } : {}),
      ...(d.track !== undefined ? { track: d.track } : {}),
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.promptText !== undefined ? { promptText: d.promptText } : {}),
      ...(d.hint !== undefined ? { hint: d.hint } : {}),
      ...(d.testScenario !== undefined ? { testScenario: d.testScenario } : {}),
      ...(d.expectedCriteria !== undefined ? { expectedCriteria: d.expectedCriteria } : {}),
      ...(d.scoringRubric !== undefined ? { scoringRubric: toJsonInput(d.scoringRubric) } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
      ...(d.reviewNotes !== undefined ? { reviewNotes: d.reviewNotes } : {}),
      ...(d.aiMetadata !== undefined ? { aiMetadata: toJsonInput(d.aiMetadata) } : {}),
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
        aiMetadata: toRecord(updated.aiMetadata),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update question' });
  }
};

/**
 * PATCH /clarity/admin/questions/:id/status
 */
export const adminUpdateClarityQuestionStatus = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator access required' });
    }
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

    const parseResult = clarityAdminUpdateStatusSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid status payload',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    const { status, note } = parseResult.data;
    const adminId = String(req.user.id || req.user._id || 'admin');

    const existing = await prisma.questionBank.findUnique({ where: { questionId: id } });
    if (!existing) {
      return res.status(404).json({ error: 'Question not found in Question Bank' });
    }

    const updated = await prisma.questionBank.update({
      where: { questionId: id },
      data: {
        status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNotes: note ?? existing.reviewNotes,
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
 * GET /clarity/admin/stats
 */
export const adminGetClarityStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Administrator access required' });
    }
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'PostgreSQL database is unavailable.',
        code: 'DATABASE_UNAVAILABLE',
      });
    }

    const rows = await prisma.questionBank.findMany({
      select: { topic: true, status: true, level: true },
    });

    const stats: Record<
      string,
      { total: number; approved: number; draft: number; review: number; rejected: number }
    > = {
      Understanding: { total: 0, approved: 0, draft: 0, review: 0, rejected: 0 },
      Workflow: { total: 0, approved: 0, draft: 0, review: 0, rejected: 0 },
      'AI Agents': { total: 0, approved: 0, draft: 0, review: 0, rejected: 0 },
    };

    for (const r of rows) {
      const top = normalizeClarityTopic(r.topic);
      if (!stats[top]) {
        stats[top] = { total: 0, approved: 0, draft: 0, review: 0, rejected: 0 };
      }
      stats[top].total++;
      const st = (r.status || '').toUpperCase();
      if (st === 'APPROVED' || st === 'ACTIVE') stats[top].approved++;
      else if (st === 'DRAFT') stats[top].draft++;
      else if (st === 'REVIEW') stats[top].review++;
      else if (st === 'REJECTED') stats[top].rejected++;
    }

    return res.status(200).json({
      success: true,
      targetPerLevel: 10,
      stats,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch clarity stats' });
  }
};
