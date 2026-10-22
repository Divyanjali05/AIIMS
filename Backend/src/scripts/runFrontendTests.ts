/**
 * runFrontendTests.ts
 * =========================================================
 * AIIMS Consolidated Frontend Unit & Service Test Runner
 *
 * Dynamically executes and reports all supported frontend test suites:
 *  1. Assessment scoring quality checks
 *  2. Feature access, journey gates & entitlement checks
 *  3. Design system tokens & theme engine checks
 */

import { runAssessmentScoringQualityChecks } from '../../../Frontend/src/services/__tests__/assessmentScoring.test';
import { runFeatureAccessTestSuite } from '../../../Frontend/src/services/__tests__/featureAccess.test';
import { runThemeQualityChecks } from '../../../Frontend/src/services/__tests__/theme.test';

interface SuiteResult {
  id: string;
  name: string;
  passedCount: number;
  failedCount: number;
  totalCount: number;
  error?: Error;
  logs?: string[];
  details?: { name: string; passed: boolean; detail?: string }[];
}

interface SuiteDefinition {
  id: string;
  name: string;
  execute: () => {
    passedCount: number;
    failedCount: number;
    totalCount: number;
    logs?: string[];
    details?: { name: string; passed: boolean; detail?: string }[];
  };
}

console.log('===============================================================');
console.log('🧪  AIIMS FRONTEND UNIT & SERVICE TEST SUITE');
console.log('===============================================================\n');

const suiteDefinitions: SuiteDefinition[] = [
  {
    id: 'scoring',
    name: 'Evidence-Based Assessment Scoring Engine',
    execute: () => {
      const res = runAssessmentScoringQualityChecks();
      return {
        passedCount: res.passedCount,
        failedCount: res.totalCount - res.passedCount,
        totalCount: res.totalCount,
        logs: res.logs
      };
    }
  },
  {
    id: 'featureAccess',
    name: 'Feature Access, Entitlements & Journey Gates',
    execute: () => {
      const res = runFeatureAccessTestSuite();
      return {
        passedCount: res.passedCount,
        failedCount: res.failedCount,
        totalCount: res.passedCount + res.failedCount,
        details: res.results
      };
    }
  },
  {
    id: 'theme',
    name: 'Design Tokens & Theme Engine Standards',
    execute: () => {
      const res = runThemeQualityChecks();
      return {
        passedCount: res.passedCount,
        failedCount: res.failedCount,
        totalCount: res.passedCount + res.failedCount,
        details: res.results
      };
    }
  }
];

const suiteResults: SuiteResult[] = [];

for (let i = 0; i < suiteDefinitions.length; i++) {
  const def = suiteDefinitions[i];
  console.log(`── SUITE ${i + 1}: ${def.name} ──`);

  try {
    const raw = def.execute();
    if (!raw || typeof raw.passedCount !== 'number' || typeof raw.failedCount !== 'number') {
      throw new Error(`Suite "${def.name}" did not return a valid result object.`);
    }
    if (raw.totalCount === 0) {
      throw new Error(`Suite "${def.name}" reported 0 executed checks (empty suite).`);
    }

    const suiteRes: SuiteResult = {
      id: def.id,
      name: def.name,
      passedCount: raw.passedCount,
      failedCount: raw.failedCount,
      totalCount: raw.totalCount,
      logs: raw.logs,
      details: raw.details
    };

    if (suiteRes.logs) {
      suiteRes.logs.forEach(log => console.log(`  ${log}`));
    }
    if (suiteRes.details) {
      suiteRes.details.forEach(item => {
        const icon = item.passed ? '✅ [PASS]' : '❌ [FAIL]';
        console.log(`  ${icon} ${item.name}${item.detail ? ` (${item.detail})` : ''}`);
      });
    }

    console.log(`\n  ${def.name} Subtotal: ${suiteRes.passedCount}/${suiteRes.totalCount} Passed\n`);
    suiteResults.push(suiteRes);
  } catch (err: unknown) {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    console.error(`  ❌ [CRITICAL SUITE ERROR] ${def.name}: ${errorObj.message}\n`);
    suiteResults.push({
      id: def.id,
      name: def.name,
      passedCount: 0,
      failedCount: 1,
      totalCount: 1,
      error: errorObj
    });
  }
}

// Aggregation & Dynamic Calculations
let totalPassed = 0;
let totalFailed = 0;
suiteResults.forEach(s => {
  totalPassed += s.passedCount;
  totalFailed += s.failedCount;
});
const grandTotal = totalPassed + totalFailed;

// Summary Reporting
console.log('===============================================================');
console.log('📊  AIIMS FRONTEND TEST EXECUTION SUMMARY');
console.log('===============================================================');
suiteResults.forEach((s, idx) => {
  const isClean = s.failedCount === 0 && !s.error;
  const statusBadge = isClean ? '✅ PASSED' : '❌ FAILED';
  console.log(`  ${idx + 1}. ${s.name}`);
  console.log(`     Status : ${statusBadge}`);
  console.log(`     Passed : ${s.passedCount}`);
  console.log(`     Failed : ${s.failedCount}`);
  console.log(`     Total  : ${s.totalCount}`);
  if (s.error) {
    console.log(`     Error  : ${s.error.message}`);
  }
});
console.log('───────────────────────────────────────────────────────────────');
console.log(`TOTAL SUITES EXECUTED : ${suiteResults.length} / ${suiteDefinitions.length}`);
console.log(`TOTAL CHECKS PASSED   : ${totalPassed}`);
console.log(`TOTAL CHECKS FAILED   : ${totalFailed}`);
console.log(`ACTUAL TOTAL CHECKS   : ${grandTotal}`);
console.log('===============================================================');

// Verification of Execution Invariants
const allSuitesExecuted = suiteResults.length === suiteDefinitions.length;
const noSuiteFailed = suiteResults.every(s => s.failedCount === 0 && !s.error);
const validGrandTotal = grandTotal > 0 && grandTotal === (totalPassed + totalFailed);

if (totalFailed > 0 || !allSuitesExecuted || !noSuiteFailed || !validGrandTotal) {
  console.error('\n❌ FRONTEND TEST SUITE FAILED — One or more checks failed or a suite did not complete.\n');
  process.exit(1);
} else {
  console.log(`\n🎉 ALL ${grandTotal} CHECKS ACROSS ${suiteResults.length} SUITES PASSED CLEANLY!\n`);
  process.exit(0);
}
