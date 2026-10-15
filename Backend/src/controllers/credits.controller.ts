import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { User } from '../models/User.model';
import { mockUser, mockTransactions, rewardedLevelIds } from '../models/aiims.models';
import { CREDIT_RULES } from '../config/credits.config';

/**
 * GET /credits/wallet
 */
export const getWallet = (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    return res.json({
      balance: req.user.aiimsCredits,
      transactions: req.user.transactions || []
    });
  }
  res.json({
    balance: mockUser.aiimsCredits,
    transactions: mockTransactions
  });
};

/**
 * POST /credits/award-level
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
    if (mongoose.connection.readyState === 1 && req.user._id) {
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

      req.user = updatedUser;
      return res.json({
        awarded: true,
        amount: rewardAmount,
        previousBalance: tx.previousBalance,
        newBalance: updatedUser.aiimsCredits,
        transaction: tx
      });
    }

    const alreadyAwarded = req.user.transactions?.some(
      t => t.sourceId === sourceId || t.sourceId === altSourceId
    );

    if (alreadyAwarded) {
      return res.json({
        awarded: false,
        message: `Level 0${numLevel} credits already awarded`,
        amount: 0,
        currentBalance: req.user.aiimsCredits,
        previousBalance: req.user.aiimsCredits,
        newBalance: req.user.aiimsCredits
      });
    }

    const previousBalance = req.user.aiimsCredits || 0;
    req.user.aiimsCredits = previousBalance + rewardAmount;
    req.user.xpPoints = (req.user.xpPoints || 0) + xpAmount;

    const tx = {
      id: `tx-level-${numLevel}-${Date.now()}`,
      transactionType: 'LEVEL_COMPLETION',
      type: 'EARN' as const,
      source: 'ASSESSMENT',
      sourceId,
      amount: rewardAmount,
      description: `Completed AI Quest Level 0${numLevel} (+${rewardAmount} AC)`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      previousBalance,
      newBalance: req.user.aiimsCredits
    };

    req.user.transactions = req.user.transactions || [];
    req.user.transactions.unshift(tx);

    return res.json({
      awarded: true,
      amount: rewardAmount,
      previousBalance,
      newBalance: req.user.aiimsCredits,
      transaction: tx
    });
  }

  // Fallback
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
 */
export const investCredits = async (req: AuthenticatedRequest, res: Response) => {
  const { amount, description } = req.body;
  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Valid positive investment amount is required' });
  }

  if (req.user) {
    if (mongoose.connection.readyState === 1 && req.user._id) {
      const tx = {
        id: `tx-invest-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        transactionType: 'SPEND',
        type: 'SPEND' as const,
        source: 'MENTOR',
        sourceId: 'LAB_INVESTMENT',
        amount: numAmount,
        description: description || 'Invested in mentoring activity',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        previousBalance: req.user.aiimsCredits || 0,
        newBalance: (req.user.aiimsCredits || 0) - numAmount
      };

      const updatedUser = await User.findOneAndUpdate(
        {
          _id: req.user._id,
          aiimsCredits: { $gte: numAmount }
        },
        {
          $inc: { aiimsCredits: -numAmount },
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
        return res.status(400).json({ error: 'Insufficient AIIMS Credits balance' });
      }

      req.user = updatedUser;
      return res.json({ balance: updatedUser.aiimsCredits, transaction: tx });
    }

    if ((req.user.aiimsCredits || 0) < numAmount) {
      return res.status(400).json({ error: 'Insufficient AIIMS Credits balance' });
    }
    const previousBalance = req.user.aiimsCredits;
    req.user.aiimsCredits -= numAmount;

    const tx = {
      id: `tx-invest-${Date.now()}`,
      transactionType: 'SPEND',
      type: 'SPEND' as const,
      source: 'MENTOR',
      sourceId: 'LAB_INVESTMENT',
      amount: numAmount,
      description: description || 'Invested in mentoring activity',
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      previousBalance,
      newBalance: req.user.aiimsCredits
    };

    req.user.transactions = req.user.transactions || [];
    req.user.transactions.unshift(tx);

    return res.json({ balance: req.user.aiimsCredits, transaction: tx });
  }

  if (mockUser.aiimsCredits < amount) {
    return res.status(400).json({ error: 'Insufficient AIIMS Credits balance' });
  }
  const previousBalance = mockUser.aiimsCredits;
  mockUser.aiimsCredits -= amount;
  const tx = {
    id: `tx-${Date.now()}`,
    transactionType: 'SPEND' as const,
    source: 'MENTOR' as const,
    sourceId: 'LAB_INVESTMENT',
    amount,
    description: description || 'Invested in mentoring activity',
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
    previousBalance,
    newBalance: mockUser.aiimsCredits
  };
  mockTransactions.unshift(tx as any);
  res.json({ balance: mockUser.aiimsCredits, transaction: tx });
};
