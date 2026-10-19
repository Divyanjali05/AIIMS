import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { User } from '../models/User.model';
import { mockUser, mockTransactions, rewardedLevelIds } from '../models/aiims.models';
import { CREDIT_RULES } from '../config/credits.config';
import { creditsLedgerService } from '../services/creditsLedger.service';

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
      transactions: req.user.transactions && req.user.transactions.length > 0
        ? req.user.transactions
        : ledger.transactions,
      ledger: ledger.transactions,
      totalEarned: ledger.totalEarned,
      totalSpent: ledger.totalSpent,
      totalRefunded: ledger.totalRefunded
    });
  }
  res.json({
    balance: mockUser.aiimsCredits,
    transactions: mockTransactions,
    ledger: mockTransactions,
    totalEarned: mockTransactions.filter((t: any) => t.type === 'EARN').reduce((a: number, c: any) => a + c.amount, 0),
    totalSpent: mockTransactions.filter((t: any) => t.type === 'SPEND').reduce((a: number, c: any) => a + c.amount, 0),
    totalRefunded: 0
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
  const type = req.query.type as any;
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
    timestamp: new Date().toISOString()
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
          newBalance: currentBal
        });
      }

      const tx = {
        id: `tx-level-${numLevel}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        transactionType: 'LEVEL_COMPLETION',
        type: 'EARN' as const,
        source: 'ASSESSMENT',
        sourceId,
        amount: rewardAmount,
        description: `Completed AI Quest Level 0${numLevel} (+${rewardAmount} AC)`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        previousBalance: req.user.aiimsCredits || 0,
        newBalance: (req.user.aiimsCredits || 0) + rewardAmount
      };

      const updatedUser = await User.findOneAndUpdate(
        {
          _id: req.user._id,
          'transactions.sourceId': { $nin: [sourceId, altSourceId] }
        },
        {
          $inc: { aiimsCredits: rewardAmount, xpPoints: xpAmount },
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
        return res.json({
          awarded: false,
          message: `Level 0${numLevel} credits already awarded`,
          amount: 0,
          currentBalance: currentBal,
          previousBalance: currentBal,
          newBalance: currentBal
        });
      }

      // Record in CreditLedger via service
      await creditsLedgerService.executeTransaction({
        userId,
        type: 'EARN',
        category: 'REWARD',
        amount: rewardAmount,
        reason: `Completed AI Quest Level 0${numLevel} (+${rewardAmount} AC)`,
        source: 'ASSESSMENT',
        sourceId,
        idempotencyKey
      }).catch((e) => console.warn('[Credits] Ledger dual-write warning:', e.message));

      req.user = updatedUser;
      return res.json({
        awarded: true,
        amount: rewardAmount,
        previousBalance: tx.previousBalance,
        newBalance: updatedUser.aiimsCredits,
        transaction: tx
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
      idempotencyKey
    });

    if (result.duplicate) {
      return res.json({
        awarded: false,
        message: `Level 0${numLevel} credits already awarded`,
        amount: 0,
        currentBalance: result.balance,
        previousBalance: result.previousBalance,
        newBalance: result.newBalance
      });
    }

    req.user.aiimsCredits = result.balance || (req.user.aiimsCredits || 0) + rewardAmount;
    req.user.xpPoints = (req.user.xpPoints || 0) + xpAmount;

    return res.json({
      awarded: true,
      amount: rewardAmount,
      previousBalance: result.previousBalance,
      newBalance: result.newBalance,
      transaction: result.transaction
    });
  }

  // Fallback for mockUser
  if (rewardedLevelIds.has(numLevel)) {
    return res.json({
      awarded: false,
      message: `Level 0${numLevel} credits already awarded`,
      amount: 0,
      currentBalance: mockUser.aiimsCredits
    });
  }

  const previousBalance = mockUser.aiimsCredits;
  mockUser.aiimsCredits += rewardAmount;
  rewardedLevelIds.add(numLevel);

  const tx = {
    id: `tx-level-${numLevel}-${Date.now()}`,
    transactionType: 'LEVEL_COMPLETION' as const,
    source: 'ASSESSMENT' as const,
    sourceId: `LEVEL_0${numLevel}`,
    amount: rewardAmount,
    description: `Completed AI Quest Level 0${numLevel} (+10 AC)`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    previousBalance,
    newBalance: mockUser.aiimsCredits
  };
  mockTransactions.unshift(tx as any);

  res.json({
    awarded: true,
    amount: rewardAmount,
    previousBalance,
    newBalance: mockUser.aiimsCredits,
    transaction: tx
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
      idempotencyKey
    });

    if (result.conflict) {
      return res.status(409).json({
        error: result.error || 'Idempotency key reuse conflict'
      });
    }

    if (!result.success) {
      return res.status(400).json({
        error: 'Insufficient AIIMS Credits balance',
        currentBalance: result.balance
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
      isDuplicate: result.duplicate || false
    });
  }

  if (mockUser.aiimsCredits < numAmount) {
    return res.status(400).json({ error: 'Insufficient AIIMS Credits balance' });
  }
  const previousBalance = mockUser.aiimsCredits;
  mockUser.aiimsCredits -= numAmount;
  const tx = {
    id: `tx-${Date.now()}`,
    transactionType: 'SPEND' as const,
    source: 'MENTOR' as const,
    sourceId: 'LAB_INVESTMENT',
    amount: numAmount,
    description: description || 'Invested in mentoring activity',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    previousBalance,
    newBalance: mockUser.aiimsCredits
  };
  mockTransactions.unshift(tx as any);
  res.json({ balance: mockUser.aiimsCredits, transaction: tx });
};
