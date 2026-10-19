import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { User, IUser, ICreditTransaction } from '../models/User.model';
import {
  CreditLedger,
  ICreditLedger,
  CreditTransactionType,
  CreditTransactionCategory,
  CreditTransactionStatus
} from '../models/CreditLedger.model';
import { registeredUsers } from '../models/userStore';

export interface ExecuteTransactionParams {
  userId: string;
  type: CreditTransactionType;
  category?: CreditTransactionCategory;
  amount: number;
  reason: string;
  source: string;
  sourceId?: string;
  idempotencyKey?: string;
  relatedTaskId?: string;
  metadata?: Record<string, any>;
}

export interface TransactionResult {
  success: boolean;
  duplicate?: boolean;
  conflict?: boolean;
  code?: string;
  error?: string;
  balance?: number;
  previousBalance?: number;
  newBalance?: number;
  transaction?: any;
}

// In-memory fallback ledger store for offline / test runner environments
interface MemoryLedgerEntry {
  id: string;
  userId: string;
  type: CreditTransactionType;
  category: CreditTransactionCategory;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  source: string;
  sourceId?: string;
  idempotencyKey?: string;
  status: CreditTransactionStatus;
  relatedTaskId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const memoryLedgerStore: MemoryLedgerEntry[] = [];
const memoryUserBalances: Map<string, number> = new Map();

export class CreditsLedgerService {
  /**
   * Helper to clean metadata so internal keys/secrets are never saved
   */
  private sanitizeMetadata(meta?: Record<string, any>): Record<string, any> {
    if (!meta) return {};
    const sanitized = { ...meta };
    delete sanitized.apiKey;
    delete sanitized.api_key;
    delete sanitized.secret;
    delete sanitized.authorization;
    delete sanitized.password;
    delete sanitized.token;
    return sanitized;
  }

  /**
   * Executes a credit transaction with atomic balance checking and duplicate-request protection
   */
  public async executeTransaction(params: ExecuteTransactionParams): Promise<TransactionResult> {
    const {
      userId,
      type,
      category = type === 'EARN' ? 'REWARD' : type === 'SPEND' ? 'TASK_USAGE' : 'REFUND',
      amount,
      reason,
      source,
      sourceId,
      idempotencyKey,
      relatedTaskId,
      metadata
    } = params;

    // 1. Strict validation
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return { success: false, error: 'Valid userId is required' };
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return { success: false, error: 'Transaction amount must be a positive number' };
    }
    if (!['EARN', 'SPEND', 'REFUND', 'ADJUSTMENT'].includes(type)) {
      return { success: false, error: `Invalid transaction type: ${type}` };
    }

    const isDbConnected = mongoose.connection.readyState === 1;

    // 2. Database mode execution
    if (isDbConnected) {
      // 2a. Check idempotency key in CreditLedger first
      if (idempotencyKey) {
        const existingTx = await CreditLedger.findOne({ userId, idempotencyKey });
        if (existingTx) {
          // Verify if parameters match
          const matches =
            existingTx.type === type &&
            existingTx.amount === numAmount &&
            existingTx.source === source;

          if (matches) {
            return {
              success: true,
              duplicate: true,
              balance: existingTx.balanceAfter,
              previousBalance: existingTx.balanceBefore,
              newBalance: existingTx.balanceAfter,
              transaction: existingTx.toJSON ? existingTx.toJSON() : existingTx
            };
          } else {
            return {
              success: false,
              conflict: true,
              code: 'IDEMPOTENCY_KEY_CONFLICT',
              error: 'Idempotency key reuse with conflicting operation parameters'
            };
          }
        }
      }

      // 2b. Retrieve current user and balance
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, code: 'USER_NOT_FOUND', error: 'User not found' };
      }

      const balanceBefore = user.aiimsCredits ?? 0;

      // 2c. Atomic conditional balance update
      let updatedUser: IUser | null = null;
      const txId = `tx-ledger-${Date.now()}-${randomUUID().substring(0, 8)}`;
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

      if (type === 'SPEND') {
        if (balanceBefore < numAmount) {
          return {
            success: false,
            code: 'INSUFFICIENT_CREDITS',
            error: `Insufficient balance: ${balanceBefore} AC available, ${numAmount} AC requested`,
            balance: balanceBefore
          };
        }

        const legacyTx: ICreditTransaction = {
          id: txId,
          transactionType: category,
          type: 'SPEND',
          source,
          sourceId,
          amount: numAmount,
          description: reason,
          timestamp: nowStr,
          previousBalance: balanceBefore,
          newBalance: balanceBefore - numAmount
        };

        // Conditional atomic update: only succeeds if balance is still >= numAmount
        updatedUser = await User.findOneAndUpdate(
          {
            _id: userId,
            aiimsCredits: { $gte: numAmount }
          },
          {
            $inc: { aiimsCredits: -numAmount },
            $push: {
              transactions: {
                $each: [legacyTx],
                $position: 0
              }
            }
          },
          { returnDocument: 'after' }
        );

        if (!updatedUser) {
          const freshUser = await User.findById(userId);
          const freshBal = freshUser?.aiimsCredits ?? balanceBefore;
          return {
            success: false,
            code: 'INSUFFICIENT_CREDITS',
            error: `Insufficient balance during atomic update (current: ${freshBal} AC)`,
            balance: freshBal
          };
        }
      } else {
        // EARN or REFUND: Increases balance
        const balanceAfter = balanceBefore + numAmount;
        const legacyTx: ICreditTransaction = {
          id: txId,
          transactionType: category,
          type: type === 'REFUND' ? 'EARN' : 'EARN',
          source,
          sourceId,
          amount: numAmount,
          description: reason,
          timestamp: nowStr,
          previousBalance: balanceBefore,
          newBalance: balanceAfter
        };

        updatedUser = await User.findOneAndUpdate(
          { _id: userId },
          {
            $inc: { aiimsCredits: numAmount },
            $push: {
              transactions: {
                $each: [legacyTx],
                $position: 0
              }
            }
          },
          { returnDocument: 'after' }
        );
      }

      const balanceAfter = updatedUser ? updatedUser.aiimsCredits : (
        type === 'SPEND' ? balanceBefore - numAmount : balanceBefore + numAmount
      );

      // 2d. Record in CreditLedger collection
      try {
        const ledgerEntry = await CreditLedger.create({
          id: txId,
          userId,
          type,
          category,
          amount: numAmount,
          balanceBefore,
          balanceAfter,
          reason,
          source,
          sourceId,
          idempotencyKey,
          status: 'COMPLETED',
          relatedTaskId,
          metadata: this.sanitizeMetadata(metadata)
        });

        return {
          success: true,
          balance: balanceAfter,
          previousBalance: balanceBefore,
          newBalance: balanceAfter,
          transaction: ledgerEntry.toJSON ? ledgerEntry.toJSON() : ledgerEntry
        };
      } catch (err: any) {
        // In case of unique index violation on { userId, idempotencyKey }
        if (err.code === 11000 && idempotencyKey) {
          const existingTx = await CreditLedger.findOne({ userId, idempotencyKey });
          if (existingTx) {
            return {
              success: true,
              duplicate: true,
              balance: existingTx.balanceAfter,
              transaction: existingTx.toJSON ? existingTx.toJSON() : existingTx
            };
          }
        }
        console.error('[CreditsLedgerService] Failed to record ledger entry:', err);
        return {
          success: true,
          balance: balanceAfter,
          previousBalance: balanceBefore,
          newBalance: balanceAfter,
          transaction: {
            id: txId,
            userId,
            type,
            category,
            amount: numAmount,
            balanceBefore,
            balanceAfter,
            reason,
            source,
            status: 'COMPLETED'
          }
        };
      }
    }

    // 3. In-memory / offline fallback execution
    if (!memoryUserBalances.has(userId)) {
      if (registeredUsers) {
        for (const k of Object.keys(registeredUsers)) {
          const u = registeredUsers[k];
          if (String(u._id || u.id) === userId && typeof u.aiimsCredits === 'number') {
            memoryUserBalances.set(userId, u.aiimsCredits);
            break;
          }
        }
      }
    }

    let currentBal = memoryUserBalances.get(userId) ?? 0;

    if (idempotencyKey) {
      const existing = memoryLedgerStore.find(
        (e) => e.userId === userId && e.idempotencyKey === idempotencyKey
      );
      if (existing) {
        const matches =
          existing.type === type &&
          existing.amount === numAmount &&
          existing.source === source;

        if (matches) {
          return {
            success: true,
            duplicate: true,
            balance: existing.balanceAfter,
            previousBalance: existing.balanceBefore,
            newBalance: existing.balanceAfter,
            transaction: existing
          };
        } else {
          return {
            success: false,
            conflict: true,
            code: 'IDEMPOTENCY_KEY_CONFLICT',
            error: 'Idempotency key reuse with conflicting operation parameters'
          };
        }
      }
    }

    const balanceBefore = currentBal;
    if (type === 'SPEND') {
      if (currentBal < numAmount) {
        return {
          success: false,
          code: 'INSUFFICIENT_CREDITS',
          error: `Insufficient balance: ${currentBal} AC available, ${numAmount} AC requested`,
          balance: currentBal
        };
      }
      currentBal -= numAmount;
    } else {
      currentBal += numAmount;
    }

    memoryUserBalances.set(userId, currentBal);

    const memTx: MemoryLedgerEntry = {
      id: `tx-mem-${Date.now()}-${randomUUID().substring(0, 8)}`,
      userId,
      type,
      category,
      amount: numAmount,
      balanceBefore,
      balanceAfter: currentBal,
      reason,
      source,
      sourceId,
      idempotencyKey,
      status: 'COMPLETED',
      relatedTaskId,
      metadata: this.sanitizeMetadata(metadata),
      createdAt: new Date()
    };

    memoryLedgerStore.unshift(memTx);

    if (registeredUsers) {
      for (const k of Object.keys(registeredUsers)) {
        const u = registeredUsers[k];
        if (String(u._id || u.id) === userId) {
          u.aiimsCredits = currentBal;
          if (!u.transactions) u.transactions = [];
          u.transactions.unshift({
            id: memTx.id,
            transactionType: category,
            type: type === 'SPEND' ? 'SPEND' : 'EARN',
            source,
            sourceId,
            amount: numAmount,
            description: reason,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
            previousBalance: balanceBefore,
            newBalance: currentBal
          });
          break;
        }
      }
    }

    return {
      success: true,
      balance: currentBal,
      previousBalance: balanceBefore,
      newBalance: currentBal,
      transaction: memTx
    };
  }

  /**
   * Retrieves server-authoritative ledger history for a specific user
   */
  public async getLedgerHistory(
    userId: string,
    options?: { limit?: number; skip?: number; type?: CreditTransactionType }
  ): Promise<{
    transactions: any[];
    total: number;
    balance: number;
    totalEarned: number;
    totalSpent: number;
    totalRefunded: number;
  }> {
    const isDbConnected = mongoose.connection.readyState === 1;
    const limit = Math.min(100, Math.max(1, options?.limit || 50));
    const skip = Math.max(0, options?.skip || 0);

    if (isDbConnected) {
      const user = await User.findById(userId);
      const balance = user?.aiimsCredits ?? 0;

      const query: any = { userId };
      if (options?.type) {
        query.type = options.type;
      }

      const [transactions, total, allEntries] = await Promise.all([
        CreditLedger.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        CreditLedger.countDocuments(query),
        CreditLedger.find({ userId }).lean()
      ]);

      // If CreditLedger is empty for this user but user.transactions has history, fallback to user.transactions
      let finalTxs = transactions;
      let finalTotal = total;

      if (transactions.length === 0 && user?.transactions && user.transactions.length > 0) {
        const mapped = user.transactions
          .filter((t) => (!options?.type ? true : t.type === options.type))
          .map((t) => ({
            id: t.id,
            userId,
            type: t.type || 'EARN',
            category: t.transactionType || 'REWARD',
            amount: t.amount,
            balanceBefore: t.previousBalance ?? 0,
            balanceAfter: t.newBalance ?? 0,
            reason: t.description,
            source: t.source || 'SYSTEM',
            sourceId: t.sourceId,
            status: 'COMPLETED',
            createdAt: new Date(t.timestamp || Date.now())
          }));
        finalTxs = mapped.slice(skip, skip + limit);
        finalTotal = mapped.length;
      }

      let totalEarned = 0;
      let totalSpent = 0;
      let totalRefunded = 0;

      for (const entry of allEntries) {
        if (entry.type === 'EARN') totalEarned += entry.amount;
        else if (entry.type === 'SPEND') totalSpent += entry.amount;
        else if (entry.type === 'REFUND') totalRefunded += entry.amount;
      }

      return {
        transactions: finalTxs,
        total: finalTotal,
        balance,
        totalEarned,
        totalSpent,
        totalRefunded
      };
    }

    // In-memory fallback
    const userEntries = memoryLedgerStore.filter((e) => e.userId === userId);
    const filtered = options?.type
      ? userEntries.filter((e) => e.type === options.type)
      : userEntries;

    const balance = memoryUserBalances.get(userId) ?? 0;
    let totalEarned = 0;
    let totalSpent = 0;
    let totalRefunded = 0;

    for (const e of userEntries) {
      if (e.type === 'EARN') totalEarned += e.amount;
      else if (e.type === 'SPEND') totalSpent += e.amount;
      else if (e.type === 'REFUND') totalRefunded += e.amount;
    }

    return {
      transactions: filtered.slice(skip, skip + limit),
      total: filtered.length,
      balance,
      totalEarned,
      totalSpent,
      totalRefunded
    };
  }

  /**
   * Retrieves server-authoritative balance for a user
   */
  public async getBalance(userId: string): Promise<number> {
    const isDbConnected = mongoose.connection.readyState === 1;
    if (isDbConnected) {
      const user = await User.findById(userId).select('aiimsCredits');
      return user?.aiimsCredits ?? 0;
    }
    if (!memoryUserBalances.has(userId)) {
      if (registeredUsers) {
        for (const k of Object.keys(registeredUsers)) {
          const u = registeredUsers[k];
          if (String(u._id || u.id) === userId && typeof u.aiimsCredits === 'number') {
            return u.aiimsCredits;
          }
        }
      }
    }
    return memoryUserBalances.get(userId) ?? 0;
  }

  /**
   * Reconciles user balance against the transaction ledger
   */
  public async reconcileBalance(userId: string): Promise<{
    isReconciled: boolean;
    currentBalance: number;
    calculatedBalance: number;
    discrepancy: number;
    entriesCount: number;
  }> {
    const isDbConnected = mongoose.connection.readyState === 1;
    if (isDbConnected) {
      const user = await User.findById(userId);
      const currentBalance = user?.aiimsCredits ?? 0;

      const ledgerEntries = await CreditLedger.find({ userId }).sort({ createdAt: 1 });
      
      let calculatedBalance = 0; // Pure ledger accumulation from 0
      if (ledgerEntries.length > 0) {
        for (const entry of ledgerEntries) {
          if (entry.type === 'EARN' || entry.type === 'REFUND') {
            calculatedBalance += entry.amount;
          } else if (entry.type === 'SPEND') {
            calculatedBalance -= entry.amount;
          }
        }
      } else if (user?.transactions && user.transactions.length > 0) {
        // Fallback to legacy user.transactions
        for (let i = user.transactions.length - 1; i >= 0; i--) {
          const t = user.transactions[i];
          if (t.type === 'EARN') calculatedBalance += t.amount;
          else if (t.type === 'SPEND') calculatedBalance -= t.amount;
        }
      }

      const discrepancy = currentBalance - calculatedBalance;
      return {
        isReconciled: discrepancy === 0,
        currentBalance,
        calculatedBalance,
        discrepancy,
        entriesCount: ledgerEntries.length
      };
    }

    const currentBalance = memoryUserBalances.get(userId) ?? (
      registeredUsers ? Object.values(registeredUsers).find(u => String(u._id || u.id) === userId)?.aiimsCredits ?? 0 : 0
    );
    const userEntries = memoryLedgerStore.filter((e) => e.userId === userId);
    let calculatedBalance = 0;
    for (const e of userEntries) {
      if (e.type === 'EARN' || e.type === 'REFUND') calculatedBalance += e.amount;
      else if (e.type === 'SPEND') calculatedBalance -= e.amount;
    }

    return {
      isReconciled: currentBalance === calculatedBalance,
      currentBalance,
      calculatedBalance,
      discrepancy: currentBalance - calculatedBalance,
      entriesCount: userEntries.length
    };
  }

  /**
   * Safe AI-task execution lifecycle with atomic pre-deduction and guaranteed idempotent refund
   */
  public async executeTaskWithRefund<T>(params: {
    userId: string;
    cost: number;
    taskTitle: string;
    source: string;
    idempotencyKey?: string;
    taskFn: (operationId: string) => Promise<T>;
  }): Promise<{ result: T; transaction?: any; balance: number }> {
    const { userId, cost, taskTitle, source, idempotencyKey, taskFn } = params;
    const operationId = `op-${Date.now()}-${randomUUID().substring(0, 8)}`;

    let spendTxResult: TransactionResult | null = null;

    // 1. If cost > 0, atomically deduct BEFORE invoking external AI provider
    if (cost > 0) {
      spendTxResult = await this.executeTransaction({
        userId,
        type: 'SPEND',
        category: 'TASK_USAGE',
        amount: cost,
        reason: `AI Task Execution: ${taskTitle}`,
        source,
        sourceId: operationId,
        idempotencyKey: idempotencyKey || operationId,
        relatedTaskId: operationId
      });

      if (!spendTxResult.success) {
        throw {
          status: 402,
          code: spendTxResult.code || 'INSUFFICIENT_CREDITS',
          message: spendTxResult.error || 'Failed to authorize credit deduction for AI task'
        };
      }
    }

    // 2. Execute external AI task
    try {
      const result = await taskFn(operationId);
      const currentBalance = await this.getBalance(userId);
      return {
        result,
        transaction: spendTxResult?.transaction,
        balance: currentBalance
      };
    } catch (taskError: any) {
      // 3. Provider failure: atomically compensate and refund the learner
      if (cost > 0 && spendTxResult && spendTxResult.success && !spendTxResult.duplicate) {
        console.warn(`[CreditsLedgerService] Task failed for op ${operationId}. Issuing automatic refund of ${cost} AC`);
        const refundResult = await this.executeTransaction({
          userId,
          type: 'REFUND',
          category: 'REFUND',
          amount: cost,
          reason: `Automatic Refund: Failure during ${taskTitle}`,
          source,
          sourceId: operationId,
          idempotencyKey: `refund::${operationId}`,
          relatedTaskId: operationId,
          metadata: { originalError: taskError.message || String(taskError) }
        });

        throw {
          status: 500,
          code: 'AI_PROVIDER_ERROR_REFUNDED',
          message: `AI provider execution failed. Your ${cost} AIIMS Credits have been safely refunded.`,
          refunded: true,
          refundAmount: cost,
          currentBalance: refundResult.balance,
          error: taskError.message || String(taskError)
        };
      }
      throw taskError;
    }
  }

  /**
   * Reset in-memory test stores (for unit testing)
   */
  public _resetMemoryStoreForTests(): void {
    memoryLedgerStore.length = 0;
    memoryUserBalances.clear();
  }
}

export const creditsLedgerService = new CreditsLedgerService();
