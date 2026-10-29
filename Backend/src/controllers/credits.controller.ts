import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { User } from '../models/User.model';
import { mockUser, mockTransactions, rewardedLevelIds } from '../models/aiims.models';
import { CreditTransaction } from '../types';
import { CREDIT_RULES } from '../config/credits.config';
import { creditsLedgerService } from '../services/creditsLedger.service';
import { CreditTransactionType } from '../models/CreditLedger.model';

/**
 * GET /credits/wallet
 * Authoritative wallet balance and ledger history summary
 */
export const getWallet = async (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    const userId = String(req.user._id || req.user.id);
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
  }
  res.json({
    balance: mockUser.aiimsCredits,
    transactions: mockTransactions,
    ledger: mockTransactions,
    totalEarned: mockTransactions
      .filter((t: CreditTransaction) => t.type === 'EARN')
      .reduce((a: number, c: CreditTransaction) => a + c.amount, 0),
    totalSpent: mockTransactions
      .filter((t: CreditTransaction) => t.type === 'SPEND')
      .reduce((a: number, c: CreditTransaction) => a + c.amount, 0),
    totalRefunded: 0,
  });
};

/**
 * GET /credits/ledger
 * Paginated and filtered query of server-authoritative CreditLedger
 */
export const getLedger = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = String(req.user._id || req.user.id);
  const type = req.query.type as CreditTransactionType | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const skip = req.query.skip ? parseInt(req.query.skip as string, 10) : 0;

  const result = await creditsLedgerService.getLedgerHistory(userId, { type, limit, skip });
  res.json(result);
};

/**
 * GET /credits/balance
 * Fast endpoint for strictly authoritative balance
 */
export const getBalance = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = String(req.user._id || req.user.id);
  const balance = await creditsLedgerService.getBalance(userId);

  res.json({
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
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = String(req.user._id || req.user.id);
  const report = await creditsLedgerService.reconcileBalance(userId);

  res.json(report);
};

/**
 * POST /credits/award-level
 * Awards quest level completion credits with strict idempotency
 */
export const awardLevel = async (req: AuthenticatedRequest, res: Response) => {
  const { levelId } = req.body;
  const numLevel = Number(levelId);
  if (isNaN(numLevel) || numLevel <= 0) {
    return res.status(400).json({ error: 'Valid positive levelId is required' });
  }
  const rewardAmount = CREDIT_RULES.LEVEL_QUEST_COMPLETION.credits;
  const xpAmount = CREDIT_RULES.LEVEL_QUEST_COMPLETION.xp;
  const sourceId = `LEVEL_0${numLevel}`;
  const altSourceId = `LEVEL_${numLevel}`;

  if (req.user) {
    const userId = String(req.user._id || req.user.id);
    const idempotencyKey = `quest_level::${userId}::${numLevel}`;

    if (mongoose.connection.readyState === 1 && req.user._id) {
      // 1. Check whether already awarded in user transactions
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

      // Server-authoritative credit grant via CreditLedger
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

      if (!txResult.success || txResult.duplicate) {
        const latestUser = await User.findById(req.user._id);
        const currentBal = latestUser?.aiimsCredits ?? txResult.balance ?? req.user.aiimsCredits;
        return res.json({
          awarded: false,
          message: `Level 0${numLevel} credits already awarded`,
          amount: 0,
          currentBalance: currentBal,
          previousBalance: currentBal,
          newBalance: currentBal,
        });
      }

      // Update XP points on user document
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $inc: { xpPoints: xpAmount } },
        { returnDocument: 'after' }
      );
      if (updatedUser) req.user = updatedUser;

      const finalBal = txResult.balance ?? req.user.aiimsCredits;

      return res.json({
        awarded: true,
        amount: rewardAmount,
        previousBalance: txResult.previousBalance ?? finalBal - rewardAmount,
        newBalance: finalBal,
        transaction: txResult.transaction,
      });
    }

    // In-memory / offline fallback
    const result = await creditsLedgerService.executeTransaction({
      userId,
      type: 'EARN',
      category: 'REWARD',
      amount: rewardAmount,
      reason: `Completed AI Quest Level 0${numLevel} (+${rewardAmount} AC)`,
      source: 'ASSESSMENT',
      sourceId,
      idempotencyKey,
    });

    if (result.duplicate) {
      return res.json({
        awarded: false,
        message: `Level 0${numLevel} credits already awarded`,
        amount: 0,
        currentBalance: result.balance,
        previousBalance: result.previousBalance,
        newBalance: result.newBalance,
      });
    }

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Failed to award quest level credits',
        code: result.code || 'TRANSACTION_FAILED',
        currentBalance: result.balance ?? req.user.aiimsCredits,
      });
    }

    req.user.aiimsCredits = result.balance ?? (req.user.aiimsCredits || 0);
    req.user.xpPoints = (req.user.xpPoints || 0) + xpAmount;

    return res.json({
      awarded: true,
      amount: rewardAmount,
      previousBalance: result.previousBalance,
      newBalance: result.newBalance,
      transaction: result.transaction,
    });
  }

  // Fallback for mockUser
  if (rewardedLevelIds.has(numLevel)) {
    return res.json({
      awarded: false,
      message: `Level 0${numLevel} credits already awarded`,
      amount: 0,
      currentBalance: mockUser.aiimsCredits,
    });
  }

  const previousBalance = mockUser.aiimsCredits;
  mockUser.aiimsCredits += rewardAmount;
  rewardedLevelIds.add(numLevel);

  const tx: CreditTransaction = {
    id: `tx-level-${numLevel}-${Date.now()}`,
    type: 'EARN',
    amount: rewardAmount,
    description: `Completed AI Quest Level 0${numLevel} (+10 AC)`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    newBalance: mockUser.aiimsCredits,
    source: 'ASSESSMENT',
  };
  mockTransactions.unshift(tx);

  res.json({
    awarded: true,
    amount: rewardAmount,
    previousBalance,
    newBalance: mockUser.aiimsCredits,
    transaction: tx,
  });
};

/**
 * POST /credits/invest
 * Server-authoritative atomic deduction with idempotency protection
 */
export const investCredits = async (req: AuthenticatedRequest, res: Response) => {
  const { amount, description, idempotencyKey: bodyKey } = req.body;
  const headerKey = req.headers['x-idempotency-key'] as string | undefined;
  const idempotencyKey = bodyKey || headerKey;

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Valid positive investment amount is required' });
  }

  if (req.user) {
    const userId = String(req.user._id || req.user.id);

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

    if (mongoose.connection.readyState === 1 && req.user._id) {
      const refreshed = await User.findById(req.user._id);
      if (refreshed) req.user = refreshed;
    } else {
      req.user.aiimsCredits = result.balance || 0;
    }

    return res.json({
      balance: result.balance,
      transaction: result.transaction,
      isDuplicate: result.duplicate || false,
    });
  }

  if (mockUser.aiimsCredits < numAmount) {
    return res.status(400).json({ error: 'Insufficient AIIMS Credits balance' });
  }
  mockUser.aiimsCredits -= numAmount;
  const tx: CreditTransaction = {
    id: `tx-${Date.now()}`,
    type: 'SPEND',
    amount: numAmount,
    description: description || 'Invested in mentoring activity',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    newBalance: mockUser.aiimsCredits,
    source: 'MENTOR',
  };
  mockTransactions.unshift(tx);
  res.json({ balance: mockUser.aiimsCredits, transaction: tx });
};
