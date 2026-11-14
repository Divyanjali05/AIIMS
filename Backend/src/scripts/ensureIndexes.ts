/**
 * ensureIndexes.ts
 * =========================================================
 * CLI Deploy Script: Verifies & Validates PostgreSQL Schema & Table Indexes
 *
 * Usage:
 *   npx ts-node src/scripts/ensureIndexes.ts
 *   or: npm run db:index
 */

import { connectDatabase, disconnectDatabase, isDatabaseConnected } from '../config/prisma';
import { syncAllDatabaseIndexes } from '../services/databaseIndex.service';
import { logger } from '../utils/logger';

async function run() {
  console.log('===============================================================');
  console.log('📦  AIIMS POSTGRESQL DATABASE INDEX VERIFICATION SCRIPT');
  console.log('===============================================================\n');

  try {
    console.log('Connecting to PostgreSQL...');
    const conn = await connectDatabase(3, 1000);
    if (!conn.connected) {
      console.warn(
        '⚠️  PostgreSQL is offline. Cannot verify active database indexes in offline mode.'
      );
      console.log('Skipping live index verification gracefully.');
      process.exit(0);
    }
    console.log(
      `Connected to PostgreSQL database "${conn.databaseName || 'aiims'}" successfully.\n`
    );

    const results = await syncAllDatabaseIndexes();

    console.log('\n───────────────────────────────────────────────────────────────');
    console.log('POSTGRESQL TABLE & INDEX VERIFICATION RESULTS:');
    console.log('───────────────────────────────────────────────────────────────');
    for (const res of results) {
      if (res.success) {
        console.log(`  ✅ [INDEXED] Model: ${res.modelName} (Table: ${res.tableName})`);
      } else {
        console.error(
          `  ❌ [FAILED]  Model: ${res.modelName} (Table: ${res.tableName}) - ${res.error}`
        );
      }
    }

    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      console.error(`\n❌ Failed to verify indexes on ${failed.length} table(s).`);
      process.exit(1);
    }

    console.log('\n🎉 ALL POSTGRESQL TABLE INDEXES VERIFIED SUCCESSFULLY!\n');
    await disconnectDatabase();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Fatal error during PostgreSQL index deployment/verification:', err.message);
    process.exit(1);
  }
}

run();
