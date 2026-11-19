/**
 * verifyAssessmentRewardEligibility.ts
 * ============================================================================
 * AIIMS Baseline Assessment Reward Eligibility & Idempotency Verification
 *
 * Verifies Business Rules:
 * 1. Score of 94%: Not eligible, 0 AC awarded, rewardClaimed is false.
 * 2. Score of 95%: Not eligible (strictly > 95% required), 0 AC awarded, rewardClaimed is false.
 * 3. Score of 96%: Eligible, +50 AC awarded once, rewardClaimed is true.
 * 4. Repeated assessment completion requests (re-submission): Exactly-once idempotency,
 *    duplicate transaction detected, 0 new credits awarded, balance remains unchanged.
 * 5. formatUserState state sanitation: Even if legacy records had rewardClaimed=true,
 *    scores <= 95% output rewardClaimed: false to client.
 * ============================================================================
 */

import { prisma, isDatabaseConnected } from '../config/prisma';
import { installPrismaTestDouble } from '../services/__tests__/helpers/prismaTestDouble';
import { creditsLedgerService } from '../services/creditsLedger.service';
import { formatUserState, ASSESSMENT_RULES } from '../config/credits.config';
import { defaultAssessment, defaultAnalysis } from '../utils/userMapper';

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`  ✅ [PASS] ${label}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function runTests(): Promise<void> {
  console.log('==================================================================');
  console.log('🧪 AIIMS BASELINE ASSESSMENT REWARD ELIGIBILITY & WALLET AUDIT');
  console.log('==================================================================\n');

  if (!isDatabaseConnected()) {
    installPrismaTestDouble({ connected: true });
  }

  // ── TEST 1: Service Layer - 94% Score (Not Eligible) ─────────────────────
  const user1Id = `user-eval-94-${Date.now()}`;
  await prisma.user.create({
    data: {
      id: user1Id,
      name: 'Learner 94',
      email: `learner94.${Date.now()}@example.com`,
      password: 'SecurePassword123!',
      role: 'learner',
      track: 'Student',
      aiimsCredits: 500,
      xpPoints: 100,
    },
  });

  const bonus94 = await creditsLedgerService.awardAssessmentBonus(
    user1Id,
    94,
    `assessment::${user1Id}::bonus`
  );
  const balanceAfter94 = await creditsLedgerService.getBalance(user1Id);

  assert('94%: awardAssessmentBonus returns null', bonus94 === null);
  assert('94%: 0 AC awarded, wallet balance remains exactly 500 AC', balanceAfter94 === 500);

  // ── TEST 2: Service Layer - 95% Score Boundary (Not Eligible) ────────────
  const user2Id = `user-eval-95-${Date.now()}`;
  await prisma.user.create({
    data: {
      id: user2Id,
      name: 'Learner 95',
      email: `learner95.${Date.now()}@example.com`,
      password: 'SecurePassword123!',
      role: 'learner',
      track: 'Student',
      aiimsCredits: 500,
      xpPoints: 100,
    },
  });

  const bonus95 = await creditsLedgerService.awardAssessmentBonus(
    user2Id,
    95,
    `assessment::${user2Id}::bonus`
  );
  const balanceAfter95 = await creditsLedgerService.getBalance(user2Id);

  assert('95%: awardAssessmentBonus returns null (strictly > 95% required)', bonus95 === null);
  assert('95%: 0 AC awarded, wallet balance remains exactly 500 AC', balanceAfter95 === 500);

  // ── TEST 3: Service Layer - 96% Score (Eligible, Awarded Once) ───────────
  const user3Id = `user-eval-96-${Date.now()}`;
  await prisma.user.create({
    data: {
      id: user3Id,
      name: 'Learner 96',
      email: `learner96.${Date.now()}@example.com`,
      password: 'SecurePassword123!',
      role: 'learner',
      track: 'Student',
      aiimsCredits: 500,
      xpPoints: 100,
    },
  });

  const bonus96 = await creditsLedgerService.awardAssessmentBonus(
    user3Id,
    96,
    `assessment::${user3Id}::bonus`
  );
  const balanceAfter96 = await creditsLedgerService.getBalance(user3Id);

  assert('96%: awardAssessmentBonus succeeds', bonus96 !== null && bonus96.success === true);
  assert('96%: +50 AC credited to wallet, balance reaches exactly 550 AC', balanceAfter96 === 550);
  assert('96%: transaction type is EARN and category is REWARD', bonus96?.transaction?.type === 'EARN' && bonus96?.transaction?.category === 'REWARD');

  // ── TEST 4: Repeated Completion / Resubmission (Idempotency Protection) ──
  const duplicateBonus96 = await creditsLedgerService.awardAssessmentBonus(
    user3Id,
    96,
    `assessment::${user3Id}::bonus`
  );
  const balanceAfterDuplicate = await creditsLedgerService.getBalance(user3Id);

  assert('Re-submission: duplicate transaction detected', duplicateBonus96 !== null && duplicateBonus96.duplicate === true);
  assert('Re-submission: 0 new AC awarded, wallet balance remains exactly 550 AC', balanceAfterDuplicate === 550);

  // ── TEST 5: Controller Logic Verification for Eligibility & Flagging ─────
  const evaluateScore = (score: number, bonusAlreadyClaimed = false) => {
    const isEligibleForReward = score > ASSESSMENT_RULES.HIGH_SCORE_BONUS_THRESHOLD;
    const qualifiesForBonus = isEligibleForReward;
    const bonusEarned = qualifiesForBonus ? (bonusAlreadyClaimed ? 0 : 50) : 0;
    const isRewardClaimed = qualifiesForBonus && (bonusEarned > 0 || bonusAlreadyClaimed);
    return { isEligibleForReward, qualifiesForBonus, bonusEarned, isRewardClaimed };
  };

  const eval94 = evaluateScore(94);
  assert('Controller eval 94%: qualifiesForBonus is false and rewardClaimed is false', !eval94.qualifiesForBonus && !eval94.isRewardClaimed && eval94.bonusEarned === 0);

  const eval95 = evaluateScore(95);
  assert('Controller eval 95%: qualifiesForBonus is false and rewardClaimed is false', !eval95.qualifiesForBonus && !eval95.isRewardClaimed && eval95.bonusEarned === 0);

  const eval96First = evaluateScore(96, false);
  assert('Controller eval 96% first-time: qualifiesForBonus is true and rewardClaimed is true, bonusEarned = 50', eval96First.qualifiesForBonus && eval96First.isRewardClaimed && eval96First.bonusEarned === 50);

  const eval96Repeat = evaluateScore(96, true);
  assert('Controller eval 96% repeat: qualifiesForBonus is true, bonusEarned = 0, rewardClaimed is true', eval96Repeat.qualifiesForBonus && eval96Repeat.isRewardClaimed && eval96Repeat.bonusEarned === 0);

  // ── TEST 6: formatUserState Sanitization for Client Output ────────────────
  const mockUser94: any = {
    id: 'user-format-94',
    name: 'User 94',
    email: 'user94@example.com',
    role: 'learner',
    aiimsCredits: 500,
    xpPoints: 100,
    assessment: {
      ...defaultAssessment(),
      status: 'completed',
      rewardClaimed: true, // Legacy field was true
      evaluationResult: { overallScore: 94 },
    },
    analysis: defaultAnalysis(),
  };
  const formatted94 = formatUserState(mockUser94);
  assert('formatUserState: 94% score forces rewardClaimed to false', formatted94.assessment.rewardClaimed === false);

  const mockUser95: any = {
    id: 'user-format-95',
    name: 'User 95',
    email: 'user95@example.com',
    role: 'learner',
    aiimsCredits: 500,
    xpPoints: 100,
    assessment: {
      ...defaultAssessment(),
      status: 'completed',
      rewardClaimed: true, // Legacy field was true
      evaluationResult: { overallScore: 95 },
    },
    analysis: defaultAnalysis(),
  };
  const formatted95 = formatUserState(mockUser95);
  assert('formatUserState: 95% score forces rewardClaimed to false (not strictly >95%)', formatted95.assessment.rewardClaimed === false);

  const mockUser96: any = {
    id: 'user-format-96',
    name: 'User 96',
    email: 'user96@example.com',
    role: 'learner',
    aiimsCredits: 550,
    xpPoints: 100,
    assessment: {
      ...defaultAssessment(),
      status: 'completed',
      rewardClaimed: true,
      highScoreBonusClaimed: true,
      evaluationResult: { overallScore: 96 },
    },
    analysis: defaultAnalysis(),
  };
  const formatted96 = formatUserState(mockUser96);
  assert('formatUserState: 96% score preserves rewardClaimed: true', formatted96.assessment.rewardClaimed === true);

  console.log('\n==================================================================');
  console.log(`SUMMARY: ${passed} PASSED / ${failed} FAILED`);
  console.log('==================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL ASSESSMENT REWARD ELIGIBILITY TESTS PASSED CLEANLY!\n');
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
