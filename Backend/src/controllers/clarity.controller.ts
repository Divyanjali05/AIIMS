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
import { QuestionBank, inMemoryQuestionBank } from '../models/QuestionBank.model';
import { QuestionAssignment, inMemoryAssignments } from '../models/QuestionAssignment.model';
import { QuestionAttempt, inMemoryAttempts } from '../models/QuestionAttempt.model';
import { questionBankService } from '../services/questionBank.service';
import { clarityProgressionService } from '../services/clarityProgression.service';
import { claritySubmitSchema, clarityProgressionConfigSchema } from '../schemas/clarity.schema';
import { rubricEvaluatorService } from '../services/rubricEvaluator.service';

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
 * POST /clarity/run-task (also /clarity/run)
 * Requires authentication and meters credit balance:
 * - First run: complimentary trial (0 AC)
 * - Subsequent runs: deducts 10 AC atomically BEFORE provider call
 * - Provider failure: automatically refunds 10 AC atomically
 * - Does NOT mark task as completed or submitted (decoupled from Submit)
 * - Rejects with HTTP 409 if task was already submitted and locked
 */
export const runTask = async (req: AuthenticatedRequest, res: Response) => {
  const { assignmentId, topic, difficulty, taskTitle, userPrompt, contextData } = req.body;
  const user = req.user;
  const userId = user ? String(user._id || user.id) : null;
  const operationId = `op-clarity-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const idempotencyKey = (req.body.idempotencyKey ||
    req.headers?.['x-idempotency-key'] ||
    operationId) as string;

  // 0. Assignment Lock Check: Cannot execute a task that has already been submitted and locked
  if (assignmentId && userId) {
    let assignment: any = null;
    if (mongoose.connection.readyState === 1) {
      assignment = await QuestionAssignment.findOne({ assignmentId, learnerId: userId });
    } else {
      assignment = inMemoryAssignments.get(assignmentId);
      if (assignment && assignment.learnerId !== userId) {
        assignment = null;
      }
    }

    if (assignment && assignment.status === 'SUBMITTED') {
      return res.status(409).json({
        error: 'This task has already been submitted and is locked.',
        code: 'TASK_LOCKED',
        isLocked: true,
      });
    }

    // Advance to IN_PROGRESS if currently ASSIGNED
    if (assignment && assignment.status === 'ASSIGNED') {
      assignment.status = 'IN_PROGRESS';
      if (mongoose.connection.readyState === 1) {
        await assignment.save();
      } else {
        inMemoryAssignments.set(assignmentId, assignment);
      }
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

    // Evaluate prompt & output (formative guidance)
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
      isLocked: false,
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
 * POST /clarity/submit
 * Server-authoritative task submission, rubric evaluation, attempt logging,
 * credit award, and task locking.
 */
export const submitClarityTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const parseResult = claritySubmitSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid submission payload',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    const learnerId = String(req.user._id || req.user.id);
    const { assignmentId, answer, timeTakenSeconds } = parseResult.data;

    // 1. Fetch assignment
    let assignment: any = null;
    if (mongoose.connection.readyState === 1) {
      assignment = await QuestionAssignment.findOne({ assignmentId, learnerId });
    } else {
      assignment = inMemoryAssignments.get(assignmentId);
      if (assignment && assignment.learnerId !== learnerId) {
        assignment = null;
      }
    }

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
    let question: any = null;
    if (mongoose.connection.readyState === 1) {
      question = await QuestionBank.findOne({ questionId: assignment.questionId });
    } else {
      question = inMemoryQuestionBank.get(assignment.questionId);
    }

    if (!question) {
      return res.status(404).json({ error: 'Assigned question not found in Question Bank' });
    }

    // 4. Server-authoritative Genuine AI Rubric Evaluation
    const cleanAnswer = answer.trim();
    const evaluation = await rubricEvaluatorService.evaluateAnswer({
      question: {
        title: question.title,
        promptText: question.promptText,
        testScenario: question.testScenario,
        expectedCriteria: question.expectedCriteria,
      },
      rubric: question.scoringRubric,
      learnerAnswer: cleanAnswer,
    });

    const rubricFeedback = evaluation.criteria.map((c) => ({
      criterion: c.criterion,
      score: c.score,
      maxScore: c.maxScore,
      comment: c.feedback,
    }));

    const score = evaluation.overallScore;
    const overallFeedback = evaluation.overallFeedback;

    const attemptId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // 5. Persist Immutable Attempt Record
    const attemptRecord = {
      attemptId,
      assignmentId,
      learnerId,
      questionId: question.questionId,
      topic: assignment.topic,
      level: assignment.level,
      track: assignment.track || 'General',
      startedAt: assignment.assignedAt || new Date(),
      submittedAt: new Date(),
      submittedAnswer: cleanAnswer,
      score,
      rubricFeedback,
      overallFeedback,
      evaluationStatus: 'EVALUATED' as const,
      timeTakenSeconds: timeTakenSeconds || 0,
    };

    if (mongoose.connection.readyState === 1) {
      await QuestionAttempt.create(attemptRecord);
      assignment.status = 'SUBMITTED';
      assignment.completedAt = new Date();
      await assignment.save();
    } else {
      inMemoryAttempts.set(attemptId, attemptRecord);
      assignment.status = 'SUBMITTED';
      assignment.completedAt = new Date();
      inMemoryAssignments.set(assignmentId, assignment);
    }

    // 6. Award completion credits & XP idempotently
    const rewardCredits = CREDIT_RULES.CLARITY_TASK_EASY.credits || 50;
    const rewardXP = CREDIT_RULES.CLARITY_TASK_EASY.xp || 100;
    const idempotencyKey = `clarity::submit::${assignmentId}`;

    const ledgerResult = await creditsLedgerService.executeTransaction({
      userId: learnerId,
      type: 'EARN',
      category: 'REWARD',
      amount: rewardCredits,
      reason: `Completed Clarity Task: ${assignment.topic} (${assignment.level}) (+${rewardCredits} AC)`,
      source: 'CLARITY_TASK',
      sourceId: idempotencyKey,
      idempotencyKey,
    });

    const currentBalance =
      ledgerResult.balance ?? (await creditsLedgerService.getBalance(learnerId));

    // Update user XP
    let currentXP = req.user.xpPoints || 0;
    if (mongoose.connection.readyState === 1 && req.user._id) {
      const updated = await User.findByIdAndUpdate(
        req.user._id,
        { $inc: { xpPoints: rewardXP } },
        { returnDocument: 'after' }
      );
      if (updated) {
        req.user = updated;
        currentXP = updated.xpPoints;
      }
    } else {
      req.user.xpPoints = currentXP + rewardXP;
      req.user.aiimsCredits = currentBalance;
      currentXP = req.user.xpPoints;
    }

    // 7. Authoritative progression update
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
      submittedAt: attemptRecord.submittedAt,
      timeTakenSeconds: attemptRecord.timeTakenSeconds,
      isLocked: true,
      creditsAwarded: rewardCredits,
      xpAwarded: rewardXP,
      currentBalance,
      currentXP,
      progression,
    });
  } catch (err: any) {
    console.error('[ClarityController] submitClarityTask error:', err);
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

    const { topic, track } = req.body;
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'topic is required' });
    }

    const learnerId = String(req.user._id || req.user.id);
    const progression = await clarityProgressionService.getLearnerProgression(learnerId, topic);

    // 1. Look for existing in-progress or recently submitted assignment for this topic
    let existingAssignment: any = null;
    if (mongoose.connection.readyState === 1) {
      existingAssignment = await QuestionAssignment.findOne({
        learnerId,
        topic,
      }).sort({ assignedAt: -1 });
    } else {
      const assignments = Array.from(inMemoryAssignments.values())
        .filter((a) => a.learnerId === learnerId && a.topic === topic)
        .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime());
      existingAssignment = assignments[0] || null;
    }

    if (existingAssignment) {
      // Fetch question
      let question: any = null;
      if (mongoose.connection.readyState === 1) {
        question = await QuestionBank.findOne({ questionId: existingAssignment.questionId });
      } else {
        question = inMemoryQuestionBank.get(existingAssignment.questionId);
      }

      if (question) {
        const isLocked = existingAssignment.status === 'SUBMITTED';
        let attempt: any = null;

        if (isLocked) {
          if (mongoose.connection.readyState === 1) {
            attempt = await QuestionAttempt.findOne({
              assignmentId: existingAssignment.assignmentId,
            });
          } else {
            for (const att of inMemoryAttempts.values()) {
              if (att.assignmentId === existingAssignment.assignmentId) {
                attempt = att;
                break;
              }
            }
          }
        }

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
            scoringRubric: question.scoringRubric,
          },
          attempt: attempt
            ? {
                attemptId: attempt.attemptId,
                score: attempt.score,
                rubricFeedback: attempt.rubricFeedback,
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
        scoringRubric: result.question.scoringRubric,
      },
      attempt: null,
    });
  } catch (err: any) {
    console.error('[ClarityController] getActiveClarityTask error:', err);
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

    const { topic, track } = req.body;
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'topic is required' });
    }

    const learnerId = String(req.user._id || req.user.id);
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
        scoringRubric: result.question.scoringRubric,
      },
    });
  } catch (err: any) {
    console.error('[ClarityController] serveNextClarityTask error:', err);
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

    const topic = (req.query.topic as string) || 'AI Prompt Engineering';
    const learnerId = String(req.user._id || req.user.id);
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
export const getProgressionConfigHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
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

    const parseResult = clarityProgressionConfigSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid progression config parameters',
        details: parseResult.error.issues.map((i) => i.message),
      });
    }

    const adminId = String(req.user._id || req.user.id);
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
