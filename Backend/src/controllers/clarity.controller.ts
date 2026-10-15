import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { User } from '../models/User.model';
import { mockCapabilityGaps, mockTransactions, mockLearnerFullState } from '../models/aiims.models';
import { ClaudeService } from '../services/anthropic/claude.service';
import { CREDIT_RULES, clarityTaskRewardKey } from '../config/credits.config';

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
  const gap = mockCapabilityGaps.find(g => g.id === gapId);
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
      scenario: scenario || 'Workplace automation workflow'
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate prompt' });
  }
};

/**
 * POST /clarity/run-task
 */
export const runTask = async (req: Request, res: Response) => {
  try {
    const { topic, difficulty, taskTitle, taskObjective, userPrompt, contextData } = req.body;
    const startTime = Date.now();
    
    // 1. Execute prompt with AI
    const execResult = await claudeService.executePromptWithAI(userPrompt, contextData);
    const executionTimeMs = Date.now() - startTime;

    // 2. Evaluate prompt & output individually
    const evalResult = await claudeService.evaluateClarityTask({
      topic: topic || 'Checking AI',
      difficulty: difficulty || 'easy',
      taskTitle: taskTitle || 'AI Task',
      userPrompt,
      output: execResult.output
    });

    res.json({
      output: execResult.output,
      modelUsed: execResult.model,
      executionTimeMs,
      ...evalResult
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to execute clarity task' });
  }
};

/**
 * POST /clarity/save-task-score
 */
export const saveTaskScore = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topic, difficulty, taskId, score } = req.body;
    if (!topic || !difficulty || !taskId) {
      return res.status(400).json({ error: 'topic, difficulty, and taskId are required' });
    }

    const rewardXP = CREDIT_RULES.CLARITY_TASK_EASY.xp;
    const rewardCredits = CREDIT_RULES.CLARITY_TASK_EASY.credits;

    if (req.user) {
      const actionKey = clarityTaskRewardKey(
        String(req.user._id || req.user.id),
        topic,
        difficulty,
        taskId
      );

      if (mongoose.connection.readyState === 1 && req.user._id) {
        const tx = {
          id: `tx-clarity-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          transactionType: 'TASK_COMPLETION',
          type: 'EARN' as const,
          source: 'CLARITY_TASK',
          sourceId: actionKey,
          amount: rewardCredits,
          description: `Completed Clarity AI Task: ${topic} (${difficulty.toUpperCase()}) (+${rewardCredits} AC)`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
          previousBalance: req.user.aiimsCredits || 0,
          newBalance: (req.user.aiimsCredits || 0) + rewardCredits
        };

        const updatedUser = await User.findOneAndUpdate(
          {
            _id: req.user._id,
            'transactions.sourceId': { $ne: actionKey }
          },
          {
            $inc: { aiimsCredits: rewardCredits, xpPoints: rewardXP },
            $push: {
              transactions: {
                $each: [tx],
                $position: 0
              }
            }
          },
          { returnDocument: 'after' }
        );

        if (!updatedUser) {
          const latestUser = await User.findById(req.user._id);
          const currentBal = latestUser?.aiimsCredits ?? req.user.aiimsCredits;
          const currentXP = latestUser?.xpPoints ?? req.user.xpPoints;
          return res.json({
            success: true,
            awarded: false,
            message: 'Task credits already claimed',
            rewardXP: 0,
            rewardCredits: 0,
            totalCredits: currentBal,
            totalXP: currentXP,
            actionKey
          });
        }

        req.user = updatedUser;
        return res.json({
          success: true,
          awarded: true,
          rewardXP,
          rewardCredits,
          totalCredits: updatedUser.aiimsCredits,
          totalXP: updatedUser.xpPoints,
          transaction: tx,
          actionKey
        });
      }

      const alreadyAwarded = req.user.transactions?.some(t => t.sourceId === actionKey);

      if (alreadyAwarded) {
        return res.json({
          success: true,
          awarded: false,
          message: 'Task credits already claimed',
          rewardXP: 0,
          rewardCredits: 0,
          totalCredits: req.user.aiimsCredits,
          totalXP: req.user.xpPoints,
          actionKey
        });
      }

      const previousBalance = req.user.aiimsCredits || 0;
      req.user.aiimsCredits = previousBalance + rewardCredits;
      req.user.xpPoints = (req.user.xpPoints || 0) + rewardXP;

      const tx = {
        id: `tx-clarity-${Date.now()}`,
        transactionType: 'TASK_COMPLETION',
        type: 'EARN' as const,
        source: 'CLARITY_TASK',
        sourceId: actionKey,
        amount: rewardCredits,
        description: `Completed Clarity AI Task: ${topic} (${difficulty.toUpperCase()}) (+${rewardCredits} AC)`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        previousBalance,
        newBalance: req.user.aiimsCredits
      };

      req.user.transactions = req.user.transactions || [];
      req.user.transactions.unshift(tx);

      return res.json({
        success: true,
        awarded: true,
        rewardXP,
        rewardCredits,
        totalCredits: req.user.aiimsCredits,
        totalXP: req.user.xpPoints,
        transaction: tx,
        actionKey
      });
    } else {
      const actionKey = `clarity::mock::${topic || 'general'}::${difficulty || 'easy'}::${taskId || 'task'}`;
      const alreadyAwarded = mockTransactions.some(t => t.sourceId === actionKey);

      if (alreadyAwarded) {
        return res.json({
          success: true,
          awarded: false,
          message: 'Task credits already claimed',
          rewardXP: 0,
          rewardCredits: 0,
          totalCredits: mockLearnerFullState.profile.aiimsCredits,
          totalXP: mockLearnerFullState.profile.xpPoints,
          actionKey
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
        newBalance: mockLearnerFullState.profile.aiimsCredits
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
        actionKey
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
    const isAgents = topic?.toLowerCase().includes('agent') || topic?.toLowerCase().includes('autonom');
    const isCheckingAI = topic?.toLowerCase().includes('check') || topic?.toLowerCase().includes('eval');

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
  } catch (err: any) {
    res.json({
      suggestion: `In my daily work, I can establish a repeatable prompt workflow with explicit inputs, validation checkpoints, and structured output formatting to save hours while ensuring high reliability.`
    });
  }
};
