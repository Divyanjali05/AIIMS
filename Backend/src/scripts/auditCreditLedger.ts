/**
 * auditCreditLedger.ts
 * =========================================================
 * AIIMS Phase 1: Read-Only Credit Ledger & Balance Audit Script
 *
 * Inspects all users and credit_ledger records in the active PostgreSQL database.
 * Detects:
 *   1. Balance and ledger mismatches (users.aiims_credits vs calculated ledger sum).
 *   2. Duplicate credit transactions (duplicate idempotency keys or duplicate rewards).
 *   3. Missing idempotency keys on ledger entries.
 *   4. Suspicious negative or invalid balances.
 *   5. Assessment-related credit records and legacy inconsistencies.
 *
 * STRICTLY READ-ONLY: Does NOT alter or delete any database records.
 */

import { prisma, connectDatabase, disconnectDatabase, isDatabaseConnected } from '../config/prisma';

export interface AuditSummary {
  timestamp: string;
  totalUsersAudited: number;
  totalLedgerEntriesAudited: number;
  balanceMismatches: Array<{
    userId: string;
    email: string;
    storedBalance: number;
    calculatedBalance: number;
    discrepancy: number;
    ledgerCount: number;
  }>;
  negativeBalances: Array<{
    userId: string;
    email: string;
    balance: number;
  }>;
  duplicateTransactions: Array<{
    userId: string;
    idempotencyKey?: string | null;
    source: string;
    sourceId?: string | null;
    count: number;
  }>;
  missingIdempotencyKeys: Array<{
    id: string;
    userId: string | null;
    type: string;
    amount: number;
    reason: string;
    createdAt: Date;
  }>;
  ledgerArithmeticAnomalies: Array<{
    id: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    expectedBalanceAfter: number;
  }>;
  assessmentCreditSummary: {
    totalCompletedAssessments: number;
    legacyRewardOnlyCount: number;
    submissionFeeCount: number;
    highScoreBonusCount: number;
  };
}

export async function runCreditLedgerAudit(): Promise<AuditSummary> {
  const summary: AuditSummary = {
    timestamp: new Date().toISOString(),
    totalUsersAudited: 0,
    totalLedgerEntriesAudited: 0,
    balanceMismatches: [],
    negativeBalances: [],
    duplicateTransactions: [],
    missingIdempotencyKeys: [],
    ledgerArithmeticAnomalies: [],
    assessmentCreditSummary: {
      totalCompletedAssessments: 0,
      legacyRewardOnlyCount: 0,
      submissionFeeCount: 0,
      highScoreBonusCount: 0,
    },
  };

  const dbStatus = await connectDatabase(1, 1000);
  if (!dbStatus.connected) {
    throw new Error('PostgreSQL database is not reachable. Connect database before running audit.');
  }

  // 1. Audit Users and Balances
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      aiimsCredits: true,
      assessmentStatus: true,
      createdAt: true,
    },
  });
  summary.totalUsersAudited = users.length;

  for (const user of users) {
    if (user.aiimsCredits < 0) {
      summary.negativeBalances.push({
        userId: user.id,
        email: user.email,
        balance: user.aiimsCredits,
      });
    }

    if (user.assessmentStatus === 'completed') {
      summary.assessmentCreditSummary.totalCompletedAssessments++;
    }

    // Retrieve ledger entries for user
    const entries = await prisma.creditLedger.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    if (entries.length > 0) {
      let calculatedBalance = 0;
      for (const entry of entries) {
        if (entry.type === 'EARN' || entry.type === 'REFUND' || entry.type === 'ADJUSTMENT') {
          calculatedBalance += entry.amount;
        } else if (entry.type === 'SPEND') {
          calculatedBalance -= entry.amount;
        }
      }

      const discrepancy = user.aiimsCredits - calculatedBalance;
      if (discrepancy !== 0) {
        summary.balanceMismatches.push({
          userId: user.id,
          email: user.email,
          storedBalance: user.aiimsCredits,
          calculatedBalance,
          discrepancy,
          ledgerCount: entries.length,
        });
      }
    }
  }

  // 2. Audit all CreditLedger entries
  const allLedgerEntries = await prisma.creditLedger.findMany({
    orderBy: { createdAt: 'asc' },
  });
  summary.totalLedgerEntriesAudited = allLedgerEntries.length;

  // Check for missing idempotency keys and arithmetic integrity
  for (const entry of allLedgerEntries) {
    if (!entry.idempotencyKey || entry.idempotencyKey.trim().length === 0) {
      summary.missingIdempotencyKeys.push({
        id: entry.id,
        userId: entry.userId,
        type: entry.type,
        amount: entry.amount,
        reason: entry.reason,
        createdAt: entry.createdAt,
      });
    }

    // Arithmetic integrity: balanceAfter should equal balanceBefore (+/-) amount
    let expectedAfter = entry.balanceBefore;
    if (entry.type === 'EARN' || entry.type === 'REFUND' || entry.type === 'ADJUSTMENT') {
      expectedAfter = entry.balanceBefore + entry.amount;
    } else if (entry.type === 'SPEND') {
      expectedAfter = entry.balanceBefore - entry.amount;
    }

    if (expectedAfter !== entry.balanceAfter) {
      summary.ledgerArithmeticAnomalies.push({
        id: entry.id,
        type: entry.type,
        amount: entry.amount,
        balanceBefore: entry.balanceBefore,
        balanceAfter: entry.balanceAfter,
        expectedBalanceAfter: expectedAfter,
      });
    }

    // Track assessment entries
    if (entry.source === 'ASSESSMENT') {
      if (entry.type === 'SPEND') {
        summary.assessmentCreditSummary.submissionFeeCount++;
      } else if (entry.type === 'EARN' && entry.sourceId === 'ASSESSMENT_HIGH_SCORE_BONUS') {
        summary.assessmentCreditSummary.highScoreBonusCount++;
      } else if (entry.type === 'EARN' && entry.sourceId === 'DIAGNOSTIC_ASSESSMENT') {
        summary.assessmentCreditSummary.legacyRewardOnlyCount++;
      }
    }
  }

  // 3. Check for potential duplicate transactions by source/sourceId
  const sourceGroups = await prisma.creditLedger.groupBy({
    by: ['userId', 'source', 'sourceId', 'type'],
    where: {
      userId: { not: null },
      sourceId: { not: null },
      type: 'EARN',
    },
    _count: { id: true },
    having: {
      id: { _count: { gt: 1 } },
    },
  });

  for (const grp of sourceGroups) {
    if (grp.userId && grp._count.id > 1) {
      summary.duplicateTransactions.push({
        userId: grp.userId,
        source: grp.source,
        sourceId: grp.sourceId,
        count: grp._count.id,
      });
    }
  }

  return summary;
}

if (require.main === module) {
  runCreditLedgerAudit()
    .then((res) => {
      console.log('========================================================');
      console.log('   AIIMS CREDIT LEDGER & HISTORICAL BALANCE AUDIT REPORT');
      console.log('========================================================');
      console.log(`Audited At: ${res.timestamp}`);
      console.log(`Total Users Audited: ${res.totalUsersAudited}`);
      console.log(`Total Ledger Entries Audited: ${res.totalLedgerEntriesAudited}`);
      console.log(`Negative Balances Detected: ${res.negativeBalances.length}`);
      console.log(`Balance Mismatches Detected: ${res.balanceMismatches.length}`);
      console.log(`Duplicate Earn Transactions: ${res.duplicateTransactions.length}`);
      console.log(`Missing Idempotency Keys: ${res.missingIdempotencyKeys.length}`);
      console.log(`Arithmetic Anomalies: ${res.ledgerArithmeticAnomalies.length}`);
      console.log('--------------------------------------------------------');
      console.log('Assessment Economy Summary:');
      console.log(
        `  Completed Assessments: ${res.assessmentCreditSummary.totalCompletedAssessments}`
      );
      console.log(
        `  Legacy Completion Rewards (+50 AC): ${res.assessmentCreditSummary.legacyRewardOnlyCount}`
      );
      console.log(
        `  Assessment Submission Fees (-100 AC): ${res.assessmentCreditSummary.submissionFeeCount}`
      );
      console.log(
        `  High-Score Bonuses (+50 AC): ${res.assessmentCreditSummary.highScoreBonusCount}`
      );
      console.log('========================================================\n');

      if (res.balanceMismatches.length > 0) {
        console.warn('⚠️  BALANCE MISMATCH DETAILS:');
        console.table(res.balanceMismatches);
      }
      if (res.negativeBalances.length > 0) {
        console.warn('⚠️  NEGATIVE BALANCES:');
        console.table(res.negativeBalances);
      }
      if (res.duplicateTransactions.length > 0) {
        console.warn('⚠️  DUPLICATE TRANSACTIONS:');
        console.table(res.duplicateTransactions);
      }
      if (res.missingIdempotencyKeys.length > 0) {
        console.warn(
          `⚠️  ENTRIES WITH MISSING IDEMPOTENCY KEYS (${res.missingIdempotencyKeys.length} items)`
        );
      }
    })
    .catch((err) => {
      console.error('Audit failed with error:', err);
      process.exit(1);
    })
    .finally(async () => {
      await disconnectDatabase().catch(() => {});
    });
}
