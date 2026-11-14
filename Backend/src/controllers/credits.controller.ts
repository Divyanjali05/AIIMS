import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { prisma, isDatabaseConnected } from '../config/prisma';
import { CreditTransactionType, CreditTransactionCategory } from '../types/models';
import { CREDIT_RULES } from '../config/credits.config';
import { creditsLedgerService } from '../services/creditsLedger.service';
import { userRecordToIUser } from '../utils/userMapper';
import { isValidId } from '../utils/id';

/**
 * GET /credits/costs
 * Authoritative credit cost table and honest payment status
 */
export const getCreditCosts = async (_req: AuthenticatedRequest, res: Response) => {
  return res.json({
    success: true,
    costs: {
      clarityRun: {
        cost: 10,
        freeTrialCount: 1,
        unit: 'AC',
        description: 'Execute AI prompt in Clarity Task Lab',
      },
      focusSession: {
        cost: 0,
        unit: 'AC',
        description: 'Timed focus and restorative break intervals (Free)',
      },
      focusChallenge: {
        cost: 0,
        rewardFast: 20,
        rewardNormal: 15,
        unit: 'AC',
        description: 'Focus Practice Challenges (Fast: +20 AC, Normal: +15 AC, Overtime: 0 AC)',
      },
      toolMatching: {
        cost: 0,
        unit: 'AC',
        description: 'Intelligent tool matching and catalog recommendations (Free)',
      },
      walletOperation: {
        cost: 100,
        unit: 'AC',
        description: 'Advanced AI Wallet operations and specialized tool execution (-100 AC)',
      },
      diagnosticAssessment: {
        cost: 100,
        bonusReward: 50,
        bonusThreshold: 95,
        xp: 100,
        unit: 'AC',
        description:
          'Baseline AI capability diagnostic assessment (Cost: 100 AC, Bonus: +50 AC for score > 95%)',
      },
      signalInvestigation: {
        cost: 0,
        reward: CREDIT_RULES.SIGNAL_INVESTIGATION.credits,
        xp: CREDIT_RULES.SIGNAL_INVESTIGATION.xp,
        unit: 'AC',
        description: 'Investigating market signal on AI Radar',
      },
      questLevelCompletion: {
        cost: 0,
        reward: CREDIT_RULES.LEVEL_QUEST_COMPLETION.credits,
        xp: CREDIT_RULES.LEVEL_QUEST_COMPLETION.xp,
        unit: 'AC',
        description: 'Completing learning quest level',
      },
      clarityTaskCompletion: {
        cost: 0,
        reward: CREDIT_RULES.CLARITY_TASK_EASY.credits,
        xp: CREDIT_RULES.CLARITY_TASK_EASY.xp,
        unit: 'AC',
        description: 'Completing Clarity task evaluation',
      },
    },
    paymentGateway: {
      status: 'PREVIEW',
      integrated: false,
      message:
        'Direct credit purchases via payment gateway are currently in preview. Credits are earned exclusively through completed quests, diagnostic assessments, and investigations.',
      notice:
        'Direct credit purchases via payment gateway are currently in preview. Credits are earned exclusively through completed quests, diagnostic assessments, and investigations.',
    },
  });
};

/**
 * GET /credits/wallet
 * Authoritative wallet balance and ledger history summary
 */
export const getWallet = async (req: AuthenticatedRequest, res: Response) => {
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
  const ledger = await creditsLedgerService.getLedgerHistory(userId, { limit: 50 });

  return res.json({
    balance: ledger.balance,
    transactions:
      req.user.transactions && req.user.transactions.length > 0
        ? req.user.transactions
        : ledger.transactions,
    ledger: ledger.transactions,
    totalEarned: ledger.totalEarned,
    totalSpent: ledger.totalSpent,
    totalRefunded: ledger.totalRefunded,
  });
};

/**
 * GET /credits/ledger
 * Paginated and filtered query of server-authoritative CreditLedger
 */
export const getLedger = async (req: AuthenticatedRequest, res: Response) => {
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
  const type = req.query.type as CreditTransactionType | undefined;
  const category = req.query.category as CreditTransactionCategory | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const skip = req.query.skip ? parseInt(req.query.skip as string, 10) : 0;

  const result = await creditsLedgerService.getLedgerHistory(userId, {
    type,
    category,
    limit,
    skip,
  });
  return res.json(result);
};

/**
 * GET /credits/balance
 * Fast endpoint for strictly authoritative balance
 */
export const getBalance = async (req: AuthenticatedRequest, res: Response) => {
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
  const balance = await creditsLedgerService.getBalance(userId);

  return res.json({
    balance,
    isAuthoritative: true,
    timestamp: new Date().toISOString(),
  });
};

/**
 * GET /credits/reconcile
 * Audit and verify balance against ledger
 */
export const reconcileBalance = async (req: AuthenticatedRequest, res: Response) => {
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
  const report = await creditsLedgerService.reconcileBalance(userId);

  return res.json(report);
};

/**
 * POST /credits/award-level
 * Awards quest level completion credits with strict idempotency
 */
export const awardLevel = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const { levelId } = req.body;
  const numLevel = Number(levelId);
  if (isNaN(numLevel) || numLevel <= 0) {
    return res.status(400).json({ error: 'Valid positive levelId is required' });
  }

  const rewardAmount = CREDIT_RULES.LEVEL_QUEST_COMPLETION.credits;
  const xpAmount = CREDIT_RULES.LEVEL_QUEST_COMPLETION.xp;
  const sourceId = `LEVEL_0${numLevel}`;
  const altSourceId = `LEVEL_${numLevel}`;
  const userId = String(req.user.id || req.user._id);
  const idempotencyKey = `quest_level::${userId}::${numLevel}`;

  // 1. Check whether already awarded in user transactions mirror (including legacy altSourceId)
  const alreadyAwarded = req.user.transactions?.some(
    (t) => t.sourceId === sourceId || t.sourceId === altSourceId
  );

  if (alreadyAwarded) {
    const currentBal = await creditsLedgerService.getBalance(userId);
    return res.json({
      awarded: false,
      message: `Level 0${numLevel} credits already awarded`,
      amount: 0,
      currentBalance: currentBal,
      previousBalance: currentBal,
      newBalance: currentBal,
    });
  }

  // 2. Server-authoritative credit grant via PostgreSQL CreditLedger
  const txResult = await creditsLedgerService.executeTransaction({
    userId,
    type: 'EARN',
    category: 'REWARD',
    amount: rewardAmount,
    reason: `Completed AI Quest Level 0${numLevel} (+${rewardAmount} AC)`,
    source: 'ASSESSMENT',
    sourceId,
    idempotencyKey,
  });

  if (txResult.code === 'DATABASE_UNAVAILABLE') {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  if (txResult.duplicate) {
    const latestRow = isValidId(userId)
      ? await prisma.user.findUnique({ where: { id: userId } })
      : null;
    const currentBal = latestRow?.aiimsCredits ?? txResult.balance ?? req.user.aiimsCredits;
    return res.json({
      awarded: false,
      message: `Level 0${numLevel} credits already awarded`,
      amount: 0,
      currentBalance: currentBal,
      previousBalance: currentBal,
      newBalance: currentBal,
    });
  }

  if (!txResult.success) {
    return res.status(400).json({
      error: txResult.error || 'Failed to award quest level credits',
      code: txResult.code || 'TRANSACTION_FAILED',
      currentBalance: txResult.balance ?? req.user.aiimsCredits,
    });
  }

  // 3. Increment XP points atomically in PostgreSQL (without touching credits/transactions)
  if (isValidId(userId)) {
    const updatedRow = await prisma.user.update({
      where: { id: userId },
      data: { xpPoints: { increment: xpAmount } },
    });
    req.user = userRecordToIUser(updatedRow);
  }

  const finalBal = txResult.balance ?? req.user.aiimsCredits;

  return res.json({
    awarded: true,
    amount: rewardAmount,
    previousBalance: txResult.previousBalance ?? finalBal - rewardAmount,
    newBalance: finalBal,
    transaction: txResult.transaction,
  });
};

/**
 * POST /credits/invest
 * Server-authoritative atomic deduction with idempotency protection
 */
export const investCredits = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const { amount, description, idempotencyKey: bodyKey } = req.body;
  const headerKey = req.headers['x-idempotency-key'] as string | undefined;
  const idempotencyKey = bodyKey || headerKey;

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Valid positive investment amount is required' });
  }

  const userId = String(req.user.id || req.user._id);

  const result = await creditsLedgerService.executeTransaction({
    userId,
    type: 'SPEND',
    category: 'INVESTMENT',
    amount: numAmount,
    reason: description || 'Invested in mentoring activity',
    source: 'MENTOR',
    sourceId: 'LAB_INVESTMENT',
    idempotencyKey,
  });

  if (result.code === 'DATABASE_UNAVAILABLE') {
    return res.status(503).json({
      error: 'Database service unavailable. PostgreSQL connection is required.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  if (result.conflict) {
    return res.status(409).json({
      error: result.error || 'Idempotency key reuse conflict',
    });
  }

  if (!result.success) {
    return res.status(400).json({
      error: 'Insufficient AIIMS Credits balance',
      currentBalance: result.balance,
    });
  }

  if (isValidId(userId)) {
    const refreshed = await prisma.user.findUnique({ where: { id: userId } });
    if (refreshed) {
      req.user = userRecordToIUser(refreshed);
    }
  }

  return res.json({
    balance: result.balance,
    transaction: result.transaction,
    isDuplicate: result.duplicate || false,
  });
};
