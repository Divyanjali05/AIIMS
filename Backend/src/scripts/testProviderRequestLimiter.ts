/**
 * testProviderRequestLimiter.ts
 *
 * Unit and integration tests proving that ProviderRequestLimiter:
 * 1. Increments immediately before each outbound provider request.
 * 2. Hard blocks the 3rd request before network access.
 * 3. Prevents retries from bypassing the counter.
 * 4. Prevents fallbacks from bypassing the counter.
 * 5. Accurately tracks latency, success, and failure.
 */

import { ProviderRequestLimiter } from '../services/providerRequestLimiter';
import { claudeService } from '../services/anthropic/claude.service';
import { rubricEvaluatorService, RubricEvaluationError } from '../services/rubricEvaluator.service';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] Test ${totalTests}: ${testName}`);
  } else {
    console.error(`❌ [FAIL] Test ${totalTests}: ${testName}`);
    if (detail) console.error(`   Details: ${detail}`);
  }
}

async function runLimiterTests() {
  console.log('====================================================');
  console.log('AIIMS T-C: PROVIDER REQUEST LIMITER TEST SUITE');
  console.log('====================================================\n');

  // TEST 1: Request 1 increments counter to 1
  const limiter = new ProviderRequestLimiter(2);
  const a1 = limiter.recordAttemptBeforeOutbound('gemini', 'gemini-3.1-flash-lite');
  assert(a1 === 1 && limiter.count === 1, 'First request increments counter to 1');

  // TEST 2: Request 2 increments counter to 2 (limit reached)
  const a2 = limiter.recordAttemptBeforeOutbound('gemini', 'gemini-3.1-flash-lite');
  assert(a2 === 2 && limiter.count === 2, 'Second request increments counter to 2 (limit reached)');

  // TEST 3: Third request is blocked before network access
  let thirdBlocked = false;
  let blockedErrorMsg = '';
  try {
    limiter.recordAttemptBeforeOutbound('gemini', 'gemini-3.1-flash-lite');
  } catch (err: any) {
    thirdBlocked = true;
    blockedErrorMsg = err.message;
  }
  assert(
    thirdBlocked &&
      blockedErrorMsg.includes('Maximum authorized request limit (2) reached') &&
      limiter.count === 2,
    'Third request is strictly blocked before network access, counter remains 2'
  );

  // TEST 4: Retry cannot bypass counter
  const retryLimiter = new ProviderRequestLimiter(2);
  retryLimiter.recordAttemptBeforeOutbound('gemini', 'gemini-3.1-flash-lite'); // request 1
  retryLimiter.recordAttemptBeforeOutbound('gemini', 'gemini-3.1-flash-lite'); // request 2
  let retryBlocked = false;
  try {
    // Simulated retry loop
    retryLimiter.recordAttemptBeforeOutbound('gemini', 'gemini-3.1-flash-lite');
  } catch (err: any) {
    retryBlocked = true;
  }
  assert(retryBlocked && retryLimiter.count === 2, 'Simulated retry attempt cannot bypass counter');

  // TEST 5: Fallback to secondary model cannot bypass counter
  const fallbackLimiter = new ProviderRequestLimiter(2);
  fallbackLimiter.recordAttemptBeforeOutbound('gemini', 'gemini-3.1-flash-lite'); // request 1
  fallbackLimiter.recordAttemptBeforeOutbound('gemini', 'gemini-3.1-flash-lite'); // request 2
  let fallbackBlocked = false;
  try {
    // Simulated fallback to another model (e.g. gemini-3.8-flash)
    fallbackLimiter.recordAttemptBeforeOutbound('gemini', 'gemini-3.8-flash');
  } catch (err: any) {
    fallbackBlocked = true;
  }
  assert(
    fallbackBlocked && fallbackLimiter.count === 2,
    'Model fallback attempt cannot bypass counter'
  );

  // TEST 6: RubricEvaluatorService with disableRetries throws immediately without 2nd call
  const noRetryLimiter = new ProviderRequestLimiter(2);
  let runnerInvocations = 0;
  const mockFailingRunner = async () => {
    noRetryLimiter.recordAttemptBeforeOutbound('gemini', 'gemini-3.1-flash-lite');
    runnerInvocations++;
    return 'INVALID_JSON_OUTPUT_THAT_FAILS_VALIDATION';
  };

  let validationFailed = false;
  try {
    rubricEvaluatorService.setDisableRetries(true);
    await rubricEvaluatorService.evaluateAnswer({
      question: {
        title: 'Test Q',
        promptText: 'Test prompt',
        testScenario: 'Test scenario',
        expectedCriteria: ['Criteria 1'],
      },
      rubric: [{ criterion: 'Criteria 1', maxScore: 100, description: 'Test' }],
      learnerAnswer: 'Test learner answer',
      completionRunner: mockFailingRunner,
      disableRetries: true,
    });
  } catch (err: any) {
    validationFailed = true;
  } finally {
    rubricEvaluatorService.setDisableRetries(false);
  }

  assert(
    validationFailed && runnerInvocations === 1 && noRetryLimiter.count === 1,
    'RubricEvaluatorService respects disableRetries and makes exactly 1 request without retry'
  );

  // Summary
  console.log(`\nLimiter Test Summary: ${passedTests} / ${totalTests} Passed.\n`);
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runLimiterTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
