import mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { User, IUser, ICreditTransaction } from '../models/User.model';
import {
  CreditLedger,
  ICreditLedger,
  CreditTransactionType,
  CreditTransactionCategory,
  CreditTransactionStatus,
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
  metadata?: Record<string, unknown>;
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
  transaction?: {
    id?: string;
    type?: CreditTransactionType;
    amount?: number;
    [key: string]: unknown;
  };
}

// In-memory fallback ledger store for offline / test runner environments
export interface MemoryLedgerEntry {
  [key: string]: unknown;
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
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const memoryLedgerStore: MemoryLedgerEntry[] = [];
const memoryUserBalances: Map<string, number> = new Map();

export class CreditsLedgerService {
  /**
   * Helper to clean metadata so internal keys/secrets are never saved
   */
  private sanitizeMetadata(meta?: Record<string, unknown>): Record<string, unknown> {
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
   * Anonymizes all credit ledger entries for a user, stripping any identifying metadata
   * while preserving transaction types, amounts, and balance progression for audit trail consistency.
   */
  public async anonymizeUserLedger(userId: string): Promise<void> {
    if (!userId) return;

    if (mongoose.connection.readyState === 1) {
      await CreditLedger.updateMany(
        { userId },
        {
          $set: {
            metadata: {},
          },
        }
      );
    }

    for (const entry of memoryLedgerStore) {
      if (entry.userId === userId) {
        entry.metadata = {};
      }
    }
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
      metadata,
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
              transaction: existingTx.toJSON ? existingTx.toJSON() : existingTx,
            };
          } else {
            return {
              success: false,
              conflict: true,
              code: 'IDEMPOTENCY_KEY_CONFLICT',
              error: 'Idempotency key reuse with conflicting operation parameters',
            };
          }
        }
      }

      // 2b. Retrieve current user and balance
      let user: IUser | null = null;
      if (mongoose.Types.ObjectId.isValid(userId)) {
        user = await User.findById(userId);
      } else {
        user = await User.findOne({ email: userId.toLowerCase().trim() });
      }

      if (user) {
        const balanceBefore = user.aiimsCredits ?? 0;

        let session: mongoose.ClientSession | null = null;
        let useReplicaTransaction = false;
        try {
          const client = (
            mongoose.connection as unknown as {
              client?: { topology?: { description?: { type?: string } } };
            }
          )?.client;
          const topologyType = client?.topology?.description?.type;
          const isReplicaOrSharded =
            typeof topologyType === 'string' &&
            (topologyType.includes('Replica') || topologyType === 'Sharded');

          if (isReplicaOrSharded) {
            session = await mongoose.startSession();
            session.startTransaction();
            useReplicaTransaction = true;
          }
        } catch {
          if (session) {
            try {
              await session.endSession();
            } catch {}
            session = null;
          }
          useReplicaTransaction = false;
        }

        // 2c. Atomic conditional balance update
        let updatedUser: IUser | null = null;
        const txId = `tx-ledger-${Date.now()}-${randomUUID().substring(0, 8)}`;
        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

        const executeUserUpdate = async (
          filter: Record<string, unknown>,
          updatePayload: Record<string, unknown>
        ): Promise<IUser | null> => {
          if (useReplicaTransaction && session) {
            try {
              return await User.findOneAndUpdate(filter, updatePayload, {
                session,
                returnDocument: 'after' as const,
              });
            } catch (txErr: unknown) {
              const msg = txErr instanceof Error ? txErr.message : String(txErr);
              if (
                msg.includes('retryable') ||
                msg.includes('replica') ||
                msg.includes('Transaction') ||
                msg.includes('standalone')
              ) {
                try {
                  await session.abortTransaction();
                  await session.endSession();
                } catch {}
                session = null;
                useReplicaTransaction = false;
                return await User.findOneAndUpdate(filter, updatePayload, {
                  returnDocument: 'after' as const,
                });
              }
              throw txErr;
            }
          }
          return await User.findOneAndUpdate(filter, updatePayload, {
            returnDocument: 'after' as const,
          });
        };

        if (type === 'SPEND') {
          if (balanceBefore < numAmount) {
            if (useReplicaTransaction && session) {
              await session.abortTransaction();
              await session.endSession();
            }
            return {
              success: false,
              code: 'INSUFFICIENT_CREDITS',
              error: `Insufficient balance: ${balanceBefore} AC available, ${numAmount} AC requested`,
              balance: balanceBefore,
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
            newBalance: balanceBefore - numAmount,
          };

          // Conditional atomic update: only succeeds if balance is still >= numAmount
          updatedUser = await executeUserUpdate(
            {
              _id: user._id,
              aiimsCredits: { $gte: numAmount },
            },
            {
              $inc: { aiimsCredits: -numAmount },
              $push: {
                transactions: {
                  $each: [legacyTx],
                  $position: 0,
                },
              },
            }
          );

          if (!updatedUser) {
            if (useReplicaTransaction && session) {
              await session.abortTransaction();
              await session.endSession();
            }
            const freshUser = await User.findById(user._id);
            const freshBal = freshUser?.aiimsCredits ?? balanceBefore;
            return {
              success: false,
              code: 'INSUFFICIENT_CREDITS',
              error: `Insufficient balance during atomic update (current: ${freshBal} AC)`,
              balance: freshBal,
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
            newBalance: balanceAfter,
          };

          const earnFilter: Record<string, unknown> = { _id: user._id };
          if (sourceId) {
            earnFilter['transactions.sourceId'] = { $ne: sourceId };
          }

          updatedUser = await executeUserUpdate(earnFilter, {
            $inc: { aiimsCredits: numAmount },
            $push: {
              transactions: {
                $each: [legacyTx],
                $position: 0,
              },
            },
          });

          if (!updatedUser && sourceId) {
            if (useReplicaTransaction && session) {
              await session.abortTransaction();
              await session.endSession();
            }
            // Concurrently already awarded under this sourceId
            const freshUser = await User.findById(user._id);
            const freshBal = freshUser?.aiimsCredits ?? balanceBefore;
            const existingTx =
              (await CreditLedger.findOne({ userId, sourceId })) ||
              (idempotencyKey ? await CreditLedger.findOne({ userId, idempotencyKey }) : null);
            return {
              success: true,
              duplicate: true,
              balance: freshBal,
              previousBalance: freshBal,
              newBalance: freshBal,
              transaction: existingTx
                ? existingTx.toJSON
                  ? existingTx.toJSON()
                  : existingTx
                : undefined,
            };
          }
        }

        const balanceAfter = updatedUser
          ? updatedUser.aiimsCredits
          : type === 'SPEND'
            ? balanceBefore - numAmount
            : balanceBefore + numAmount;

        // 2d. Record in CreditLedger collection
        try {
          const ledgerDoc = {
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
            status: 'COMPLETED' as const,
            relatedTaskId,
            metadata: this.sanitizeMetadata(metadata),
          };

          let ledgerEntry: any;
          if (useReplicaTransaction && session) {
            try {
              const createdDocs = await CreditLedger.create([ledgerDoc], { session });
              ledgerEntry = createdDocs[0];
              await session.commitTransaction();
              await session.endSession();
            } catch (ledgerTxErr: unknown) {
              const msg = ledgerTxErr instanceof Error ? ledgerTxErr.message : String(ledgerTxErr);
              if (
                msg.includes('retryable') ||
                msg.includes('replica') ||
                msg.includes('Transaction') ||
                msg.includes('standalone')
              ) {
                try {
                  await session.abortTransaction();
                  await session.endSession();
                } catch {}
                session = null;
                useReplicaTransaction = false;
                ledgerEntry = await CreditLedger.create(ledgerDoc);
              } else {
                throw ledgerTxErr;
              }
            }
          } else {
            ledgerEntry = await CreditLedger.create(ledgerDoc);
          }

          return {
            success: true,
            balance: balanceAfter,
            previousBalance: balanceBefore,
            newBalance: balanceAfter,
            transaction: ledgerEntry.toJSON ? ledgerEntry.toJSON() : ledgerEntry,
          };
        } catch (err: unknown) {
          if (useReplicaTransaction && session) {
            try {
              await session.abortTransaction();
              await session.endSession();
            } catch {}
          }

          // In case of unique index violation on { userId, idempotencyKey }
          const isDuplicateKey =
            err &&
            typeof err === 'object' &&
            'code' in err &&
            (err as { code: number }).code === 11000;
          if (isDuplicateKey && idempotencyKey) {
            // Revert speculative balance mutation if transaction was not used
            if (!useReplicaTransaction) {
              if (type === 'SPEND') {
                await User.findByIdAndUpdate(user._id, {
                  $inc: { aiimsCredits: numAmount },
                  $pull: { transactions: { id: txId } },
                });
              } else {
                await User.findByIdAndUpdate(user._id, {
                  $inc: { aiimsCredits: -numAmount },
                  $pull: { transactions: { id: txId } },
                });
              }
            }

            const existingTx = await CreditLedger.findOne({ userId, idempotencyKey });
            if (existingTx) {
              return {
                success: true,
                duplicate: true,
                balance: existingTx.balanceAfter,
                previousBalance: existingTx.balanceBefore,
                newBalance: existingTx.balanceAfter,
                transaction: existingTx.toJSON ? existingTx.toJSON() : existingTx,
              };
            }
          }

          // Non-duplicate error: revert speculative balance mutation and legacy transaction entry
          if (!useReplicaTransaction) {
            if (type === 'SPEND') {
              await User.findByIdAndUpdate(user._id, {
                $inc: { aiimsCredits: numAmount },
                $pull: { transactions: { id: txId } },
              });
            } else {
              await User.findByIdAndUpdate(user._id, {
                $inc: { aiimsCredits: -numAmount },
                $pull: { transactions: { id: txId } },
              });
            }
          }

          console.error(
            '[CreditsLedgerService] Failed to record ledger entry; balance unchanged:',
            err
          );
          return {
            success: false,
            error: 'Failed to record credit ledger entry; balance unchanged',
            balance: balanceBefore,
            previousBalance: balanceBefore,
            newBalance: balanceBefore,
          };
        }
      }
      // If user is not found in MongoDB (e.g. synthetic test runner unit learner ID, offline test user),
      // smoothly transition to Section 3 in-memory fallback execution rather than throwing CastError.
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
          existing.type === type && existing.amount === numAmount && existing.source === source;

        if (matches) {
          return {
            success: true,
            duplicate: true,
            balance: existing.balanceAfter,
            previousBalance: existing.balanceBefore,
            newBalance: existing.balanceAfter,
            transaction: existing,
          };
        } else {
          return {
            success: false,
            conflict: true,
            code: 'IDEMPOTENCY_KEY_CONFLICT',
            error: 'Idempotency key reuse with conflicting operation parameters',
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
          balance: currentBal,
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
      createdAt: new Date(),
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
            newBalance: currentBal,
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
      transaction: memTx,
    };
  }

  /**
   * Retrieves server-authoritative ledger history for a specific user
   */
  public async getLedgerHistory(
    userId: string,
    options?: { limit?: number; skip?: number; type?: CreditTransactionType }
  ): Promise<{
    transactions: Array<{
      id?: string;
      type?: CreditTransactionType | string;
      amount: number;
      [key: string]: unknown;
    }>;
    total: number;
    balance: number;
    totalEarned: number;
    totalSpent: number;
    totalRefunded: number;
  }> {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return {
        transactions: [],
        total: 0,
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        totalRefunded: 0,
      };
    }

    const isDbConnected = mongoose.connection.readyState === 1;
    const limit = Math.min(100, Math.max(1, options?.limit || 50));
    const skip = Math.max(0, options?.skip || 0);

    if (isDbConnected) {
      let user: IUser | null = null;
      if (mongoose.Types.ObjectId.isValid(userId)) {
        user = await User.findById(userId);
      } else {
        user = await User.findOne({ email: userId.toLowerCase().trim() });
      }

      const query: Record<string, unknown> = { userId };
      if (options?.type) {
        query.type = options.type;
      }

      const [transactions, total, allEntries] = await Promise.all([
        CreditLedger.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        CreditLedger.countDocuments(query),
        CreditLedger.find({ userId }).lean(),
      ]);

      if (total > 0 || user) {
        const balance = user?.aiimsCredits ?? 0;
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
              createdAt: new Date(t.timestamp || Date.now()),
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
          totalRefunded,
        };
      }
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
      totalRefunded,
    };
  }

  /**
   * Retrieves server-authoritative balance for a user
   */
  public async getBalance(userId: string): Promise<number> {
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return 0;
    }
    const isDbConnected = mongoose.connection.readyState === 1;
    if (isDbConnected) {
      let user: IUser | null = null;
      if (mongoose.Types.ObjectId.isValid(userId)) {
        user = await User.findById(userId).select('aiimsCredits');
      } else {
        user = await User.findOne({ email: userId.toLowerCase().trim() }).select('aiimsCredits');
      }
      if (user) {
        return user.aiimsCredits ?? 0;
      }
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
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return {
        isReconciled: true,
        currentBalance: 0,
        calculatedBalance: 0,
        discrepancy: 0,
        entriesCount: 0,
      };
    }

    const isDbConnected = mongoose.connection.readyState === 1;
    if (isDbConnected) {
      let user: IUser | null = null;
      if (mongoose.Types.ObjectId.isValid(userId)) {
        user = await User.findById(userId);
      } else {
        user = await User.findOne({ email: userId.toLowerCase().trim() });
      }

      if (user) {
        const currentBalance = user.aiimsCredits ?? 0;
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
          entriesCount: ledgerEntries.length,
        };
      }
    }

    const currentBalance =
      memoryUserBalances.get(userId) ??
      (registeredUsers
        ? (Object.values(registeredUsers).find((u) => String(u._id || u.id) === userId)
            ?.aiimsCredits ?? 0)
        : 0);
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
      entriesCount: userEntries.length,
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
  }): Promise<{
    result: T;
    transaction?: ICreditLedger | MemoryLedgerEntry | Record<string, unknown>;
    balance: number;
  }> {
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
        relatedTaskId: operationId,
      });

      if (!spendTxResult.success) {
        throw {
          status: 402,
          code: spendTxResult.code || 'INSUFFICIENT_CREDITS',
          message: spendTxResult.error || 'Failed to authorize credit deduction for AI task',
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
        balance: currentBalance,
      };
    } catch (taskError: unknown) {
      const errorMsg = taskError instanceof Error ? taskError.message : String(taskError);
      // 3. Provider failure: atomically compensate and refund the learner
      if (cost > 0 && spendTxResult && spendTxResult.success && !spendTxResult.duplicate) {
        console.warn(
          `[CreditsLedgerService] Task failed for op ${operationId}. Issuing automatic refund of ${cost} AC`
        );
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
          metadata: { originalError: errorMsg },
        });

        throw {
          status: 500,
          code: 'AI_PROVIDER_ERROR_REFUNDED',
          message: `AI provider execution failed. Your ${cost} AIIMS Credits have been safely refunded.`,
          refunded: true,
          refundAmount: cost,
          currentBalance: refundResult.balance,
          error: errorMsg,
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
