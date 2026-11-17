import { runMarketToolsCatalogTestSuite } from './marketToolsCatalogFrontend.test';

console.log('===============================================================');
console.log('🧪  AIIMS MARKET AI TOOLS CATALOG FRONTEND TEST RUNNER (PHASE D)');
console.log('===============================================================\n');

const result = runMarketToolsCatalogTestSuite();

result.results.forEach((r, idx) => {
  const icon = r.passed ? '✅' : '❌';
  console.log(
    `  ${icon} [${idx + 1}] ${r.name} -> ${r.detail || (r.passed ? 'PASSED' : 'FAILED')}`
  );
});

console.log('\n===============================================================');
console.log(`TOTAL CHECKS : ${result.totalCount}`);
console.log(`PASSED       : ${result.passedCount}`);
console.log(`FAILED       : ${result.failedCount}`);
console.log('===============================================================');

if (result.failedCount > 0) {
  console.error('\n❌ SOME CHECKS FAILED!\n');
  process.exit(1);
} else {
  console.log('\n🎉 ALL PHASE D FRONTEND CHECKS PASSED CLEANLY!\n');
  process.exit(0);
}
