import { randomUUID } from 'crypto';
import { prisma, isDatabaseConnected, isPrismaErrorCode, withRetry } from '../config/prisma';
import {
  ICreditTransaction,
  ICreditLedger,
  CreditTransactionType,
  CreditTransactionCategory,
} from '../types/models';
import { isSafeKey, isValidId, toArray } from '../utils/id';
import { toJsonInput } from '../utils/userMapper';

export interface ExecuteTransactionParams {
  userId: string;
  type: CreditTransactionType;
  category?: CreditTransactionCategory | string;
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
    type?: CreditTransactionType | string;
    amount?: number;
    [key: string]: unknown;
  };
}

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
   * Resolves a user row by UUID/id or email.
   */
  private async resolveUser(db: { user: typeof prisma.user }, userIdOrEmail: string) {
    const clean = userIdOrEmail.trim();
    if (!clean || !isSafeKey(clean)) return null;

    if (clean.includes('@')) {
      return db.user.findUnique({ where: { email: clean.toLowerCase() } });
    }

    if (isValidId(clean)) {
      const byId = await db.user.findUnique({ where: { id: clean } });
      if (byId) return byId;
    }

    return null;
  }

  /**
   * Anonymizes all credit ledger entries for a user, stripping identifying userId and metadata
   * while preserving transaction types, amounts, and balance progression for financial audit consistency.
   */
  public async anonymizeUserLedger(userId: string): Promise<void> {
    if (!userId || !isDatabaseConnected()) return;

    const user = await this.resolveUser(prisma, userId);
    const targetUserId = user ? user.id : userId;

    await prisma.creditLedger.updateMany({
      where: { userId: targetUserId },
      data: {
        userId: null,
        metadata: toJsonInput({}),
      },
    });
  }

  /**
   * Executes a credit transaction inside an atomic PostgreSQL transaction with
   * conditional balance checks, row locking, dual-ledger synchronization, and idempotency guards.
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

    // 1. Strict input validation
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0 || !isSafeKey(userId)) {
      return { success: false, error: 'Valid userId is required' };
    }
    const rawAmount = Number(amount);
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      return { success: false, error: 'Transaction amount must be a positive number' };
    }
    const numAmount = Math.round(rawAmount);
    if (numAmount <= 0) {
      return { success: false, error: 'Transaction amount must be a positive number' };
    }
    if (!['EARN', 'SPEND', 'REFUND', 'ADJUSTMENT'].includes(type)) {
      return { success: false, error: `Invalid transaction type: ${type}` };
    }

    if (!isDatabaseConnected()) {
      return {
        success: false,
        code: 'DATABASE_UNAVAILABLE',
        error:
          'Database is currently unavailable. Credit transactions require PostgreSQL persistence.',
      };
    }

    try {
      return await withRetry(async () => {
        return await prisma.$transaction(async (tx) => {
          // 2. Resolve user record (UUID id or email)
          const user = await this.resolveUser(tx, userId);
          if (!user) {
            return {
              success: false,
              code: 'USER_NOT_FOUND',
              error: 'User account not found',
            };
          }

          const resolvedUserId = user.id;
          const balanceBefore = user.aiimsCredits ?? 0;

          // 3. Check idempotency key inside transaction
          if (idempotencyKey) {
            const existingTx = await tx.creditLedger.findUnique({
              where: {
                userId_idempotencyKey: {
                  userId: resolvedUserId,
                  idempotencyKey,
                },
              },
            });

            if (existingTx) {
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
                  transaction: existingTx as unknown as Record<string, unknown>,
                };
              }
              return {
                success: false,
                conflict: true,
                code: 'IDEMPOTENCY_KEY_CONFLICT',
                error: 'Idempotency key reuse with conflicting operation parameters',
              };
            }
          }

          // 4. For EARN rewards with sourceId, guarantee duplicate-reward prevention
          // (SPEND and automatic REFUND share operationId as sourceId so only EARN is deduped by sourceId)
          const legacyTxs = toArray<ICreditTransaction>(user.transactionsData);
          if (type === 'EARN' && sourceId) {
            const existingEarnLedger = await tx.creditLedger.findFirst({
              where: {
                userId: resolvedUserId,
                type: 'EARN',
                sourceId,
              },
            });
            const existingEarnMirror = legacyTxs.some(
              (t) => t.sourceId === sourceId && (t.type === 'EARN' || !t.type)
            );

            if (existingEarnLedger || existingEarnMirror) {
              return {
                success: true,
                duplicate: true,
                balance: balanceBefore,
                previousBalance: balanceBefore,
                newBalance: balanceBefore,
                transaction: existingEarnLedger
                  ? (existingEarnLedger as unknown as Record<string, unknown>)
                  : undefined,
              };
            }
          }

          const txId = `tx-ledger-${Date.now()}-${randomUUID().substring(0, 8)}`;
          const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
          let actualBalanceBefore = balanceBefore;
          let actualBalanceAfter = balanceBefore;

          // 5. Execute atomic conditional balance mutation + dual-ledger transactionsData update
          if (type === 'SPEND') {
            if (balanceBefore < numAmount) {
              return {
                success: false,
                code: 'INSUFFICIENT_CREDITS',
                error: `Insufficient balance: ${balanceBefore} AC available, ${numAmount} AC requested`,
                balance: balanceBefore,
              };
            }

            const updated = await tx.user.updateMany({
              where: {
                id: resolvedUserId,
                aiimsCredits: { gte: numAmount },
              },
              data: {
                aiimsCredits: { decrement: numAmount },
              },
            });

            if (updated.count === 0) {
              const freshUser = await tx.user.findUnique({ where: { id: resolvedUserId } });
              const freshBal = freshUser?.aiimsCredits ?? 0;
              return {
                success: false,
                code: 'INSUFFICIENT_CREDITS',
                error: `Insufficient balance during atomic update (current: ${freshBal} AC)`,
                balance: freshBal,
              };
            }

            const freshUser = await tx.user.findUnique({ where: { id: resolvedUserId } });
            actualBalanceAfter = freshUser?.aiimsCredits ?? Math.max(0, balanceBefore - numAmount);
            actualBalanceBefore = actualBalanceAfter + numAmount;
          } else {
            // EARN, REFUND, or ADJUSTMENT
            await tx.user.updateMany({
              where: { id: resolvedUserId },
              data: {
                aiimsCredits: { increment: numAmount },
              },
            });

            const freshUser = await tx.user.findUnique({ where: { id: resolvedUserId } });
            actualBalanceAfter = freshUser?.aiimsCredits ?? balanceBefore + numAmount;
            actualBalanceBefore = actualBalanceAfter - numAmount;
          }

          const legacyTx: ICreditTransaction = {
            id: txId,
            transactionType: String(category),
            type: type === 'SPEND' ? 'SPEND' : 'EARN',
            source,
            sourceId,
            amount: numAmount,
            description: reason,
            timestamp: nowStr,
            previousBalance: actualBalanceBefore,
            newBalance: actualBalanceAfter,
          };

          await tx.user.update({
            where: { id: resolvedUserId },
            data: {
              transactionsData: toJsonInput([legacyTx, ...legacyTxs].slice(0, 200)),
            },
          });

          // 6. Insert authoritative CreditLedger record inside same ACID transaction
          const ledgerEntry = await tx.creditLedger.create({
            data: {
              id: txId,
              userId: resolvedUserId,
              type,
              category: String(category),
              amount: numAmount,
              balanceBefore: actualBalanceBefore,
              balanceAfter: actualBalanceAfter,
              reason,
              source,
              sourceId: sourceId ?? null,
              idempotencyKey: idempotencyKey ?? null,
              status: 'COMPLETED',
              relatedTaskId: relatedTaskId ?? null,
              metadata: toJsonInput(this.sanitizeMetadata(metadata)),
            },
          });

          return {
            success: true,
            balance: actualBalanceAfter,
            previousBalance: actualBalanceBefore,
            newBalance: actualBalanceAfter,
            transaction: ledgerEntry as unknown as Record<string, unknown>,
          };
        });
      });
    } catch (err: unknown) {
      // Handle unique constraint collision on (userId, idempotencyKey)
      if (isPrismaErrorCode(err, 'P2002') && idempotencyKey) {
        const user = await this.resolveUser(prisma, userId);
        if (user) {
          const existingTx = await prisma.creditLedger.findUnique({
            where: {
              userId_idempotencyKey: {
                userId: user.id,
                idempotencyKey,
              },
            },
          });
          if (existingTx) {
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
                transaction: existingTx as unknown as Record<string, unknown>,
              };
            }
            return {
              success: false,
              conflict: true,
              code: 'IDEMPOTENCY_KEY_CONFLICT',
              error: 'Idempotency key reuse with conflicting operation parameters',
            };
          }
        }
      }

      console.error(
        '[CreditsLedgerService] Transaction failed and rolled back cleanly:',
        err instanceof Error ? err.message : err
      );
      return {
        success: false,
        error: 'Failed to record credit ledger entry; balance unchanged',
      };
    }
  }

  /**
   * Retrieves server-authoritative ledger history for a specific user
   */
  public async getLedgerHistory(
    userId: string,
    options?: {
      limit?: number;
      skip?: number;
      type?: CreditTransactionType;
      category?: CreditTransactionCategory | string;
    }
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
    if (
      !userId ||
      typeof userId !== 'string' ||
      userId.trim().length === 0 ||
      !isDatabaseConnected()
    ) {
      return {
        transactions: [],
        total: 0,
        balance: 0,
        totalEarned: 0,
        totalSpent: 0,
        totalRefunded: 0,
      };
    }

    const limit = Math.min(100, Math.max(1, options?.limit || 50));
    const skip = Math.max(0, options?.skip || 0);

    const user = await this.resolveUser(prisma, userId);
    const resolvedUserId = user ? user.id : userId;

    const whereClause: {
      userId: string;
      type?: string;
      category?: string;
    } = { userId: resolvedUserId };
    if (options?.type) whereClause.type = options.type;
    if (options?.category) whereClause.category = String(options.category);

    const [transactions, total, allEntries] = await Promise.all([
      prisma.creditLedger.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.creditLedger.count({ where: whereClause }),
      prisma.creditLedger.findMany({
        where: { userId: resolvedUserId },
        select: { type: true, amount: true },
      }),
    ]);

    const balance = user?.aiimsCredits ?? 0;
    let finalTxs: Array<Record<string, unknown>> = transactions as unknown as Array<
      Record<string, unknown>
    >;
    let finalTotal = total;

    const legacyTxs = user ? toArray<ICreditTransaction>(user.transactionsData) : [];
    if (transactions.length === 0 && legacyTxs.length > 0) {
      const mapped = legacyTxs
        .filter((t) => (!options?.type ? true : t.type === options.type))
        .map((t) => ({
          id: t.id,
          userId: resolvedUserId,
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
      transactions: finalTxs as Array<{
        id?: string;
        type?: CreditTransactionType | string;
        amount: number;
        [key: string]: unknown;
      }>,
      total: finalTotal,
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
    if (
      !userId ||
      typeof userId !== 'string' ||
      userId.trim().length === 0 ||
      !isDatabaseConnected()
    ) {
      return 0;
    }

    const user = await this.resolveUser(prisma, userId);
    return user?.aiimsCredits ?? 0;
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
    if (
      !userId ||
      typeof userId !== 'string' ||
      userId.trim().length === 0 ||
      !isDatabaseConnected()
    ) {
      return {
        isReconciled: true,
        currentBalance: 0,
        calculatedBalance: 0,
        discrepancy: 0,
        entriesCount: 0,
      };
    }

    const user = await this.resolveUser(prisma, userId);
    if (!user) {
      return {
        isReconciled: true,
        currentBalance: 0,
        calculatedBalance: 0,
        discrepancy: 0,
        entriesCount: 0,
      };
    }

    const currentBalance = user.aiimsCredits ?? 0;
    const ledgerEntries = await prisma.creditLedger.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    let calculatedBalance = 0;
    if (ledgerEntries.length > 0) {
      for (const entry of ledgerEntries) {
        if (entry.type === 'EARN' || entry.type === 'REFUND' || entry.type === 'ADJUSTMENT') {
          calculatedBalance += entry.amount;
        } else if (entry.type === 'SPEND') {
          calculatedBalance -= entry.amount;
        }
      }
    } else {
      const legacyTxs = toArray<ICreditTransaction>(user.transactionsData);
      for (let i = legacyTxs.length - 1; i >= 0; i--) {
        const t = legacyTxs[i];
        if (t.type === 'EARN' || !t.type) calculatedBalance += t.amount;
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
    transaction?: ICreditLedger | Record<string, unknown>;
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
        const errStatus = spendTxResult.code === 'DATABASE_UNAVAILABLE' ? 503 : 402;
        throw {
          status: errStatus,
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
   * Helper to reward credits
   */
  public async rewardCredits(
    userId: string,
    amount: number,
    category: CreditTransactionCategory | string = 'REWARD',
    reason: string = 'Credit reward',
    idempotencyKey?: string,
    sourceId?: string
  ): Promise<TransactionResult> {
    return this.executeTransaction({
      userId,
      type: 'EARN',
      category,
      amount,
      reason,
      source: 'system_reward',
      sourceId,
      idempotencyKey,
    });
  }

  /**
   * Helper to deduct credits
   */
  public async deductCredits(
    userId: string,
    amount: number,
    category: CreditTransactionCategory | string = 'TASK_USAGE',
    reason: string = 'Credit deduction',
    idempotencyKey?: string,
    sourceId?: string
  ): Promise<TransactionResult> {
    return this.executeTransaction({
      userId,
      type: 'SPEND',
      category,
      amount,
      reason,
      source: 'task_execution',
      sourceId,
      idempotencyKey,
    });
  }

  /**
   * Helper to refund credits
   */
  public async refundCredits(
    userId: string,
    amount: number,
    category: CreditTransactionCategory | string = 'REFUND',
    reason: string = 'Credit refund',
    idempotencyKey?: string,
    sourceId?: string
  ): Promise<TransactionResult> {
    return this.executeTransaction({
      userId,
      type: 'REFUND',
      category,
      amount,
      reason,
      source: 'task_refund',
      sourceId,
      idempotencyKey,
    });
  }

  /**
   * Authoritative Assessment Submission Charge (-100 AC).
   * Deducts 100 AC using atomic row locking and idempotency protection.
   */
  public async chargeAssessmentSubmission(
    userId: string,
    idempotencyKey?: string
  ): Promise<TransactionResult> {
    return this.executeTransaction({
      userId,
      type: 'SPEND',
      category: 'TASK_USAGE',
      amount: 100,
      reason: 'Diagnostic Assessment Submission Fee (-100 AC)',
      source: 'ASSESSMENT',
      sourceId: 'DIAGNOSTIC_ASSESSMENT_CHARGE',
      idempotencyKey: idempotencyKey || `assessment::${userId}::charge`,
    });
  }

  /**
   * Authoritative Assessment High-Score Bonus (+50 AC).
   * Awarded strictly when overall score > 95%.
   * Score equal to 95% or lower receives no bonus (returns null).
   * Bonus is protected by idempotency to guarantee exact-once issuance.
   */
  public async awardAssessmentBonus(
    userId: string,
    score: number,
    idempotencyKey?: string
  ): Promise<TransactionResult | null> {
    if (score <= 95) {
      return null;
    }

    return this.executeTransaction({
      userId,
      type: 'EARN',
      category: 'REWARD',
      amount: 50,
      reason: `Diagnostic Assessment High-Score Bonus (+50 AC, Score: ${score}%)`,
      source: 'ASSESSMENT',
      sourceId: 'ASSESSMENT_HIGH_SCORE_BONUS',
      idempotencyKey: idempotencyKey || `assessment::${userId}::bonus`,
      metadata: { score },
    });
  }

  /**
   * Authoritative AI Wallet Operation Charge (-100 AC).
   * Phase 3 requirement: Deducts exactly 100 AC once per valid operation
   * using atomic overdraft protection and deterministic idempotency key.
   */
  public async chargeWalletOperation(
    userId: string,
    operationName: string = 'AI Wallet Operation',
    idempotencyKey?: string,
    metadata?: Record<string, unknown>
  ): Promise<TransactionResult> {
    const cleanOp = operationName.trim() || 'AI Wallet Operation';
    return this.executeTransaction({
      userId,
      type: 'SPEND',
      category: 'TASK_USAGE',
      amount: 100,
      reason: `AI Wallet Operation Charge: ${cleanOp} (-100 AC)`,
      source: 'WALLET',
      sourceId: 'WALLET_OPERATION_CHARGE',
      idempotencyKey: idempotencyKey || `wallet::${userId}::${Date.now()}`,
      metadata: {
        operation: cleanOp,
        ...metadata,
      },
    });
  }

  /**
   * Retained empty no-op stub only for legacy script compatibility; zero mutable memory stores exist.
   */
  public _resetMemoryStoreForTests(): void {
    // No-op: PostgreSQL Prisma is the sole persistence store.
  }
}

export const creditsLedgerService = new CreditsLedgerService();
