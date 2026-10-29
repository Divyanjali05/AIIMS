/**
 * ensureIndexes.ts
 * =========================================================
 * CLI Deploy Script: Explicitly Creates All Database Indexes
 *
 * Usage:
 *   npx ts-node src/scripts/ensureIndexes.ts
 *   or: npm run db:index
 */

import mongoose from 'mongoose';
import { config } from '../config/env';
import { syncAllDatabaseIndexes } from '../services/databaseIndex.service';
import { logger } from '../utils/logger';

async function run() {
  console.log('===============================================================');
  console.log('📦  AIIMS DATABASE INDEX DEPLOYMENT SCRIPT');
  console.log('===============================================================\n');

  if (!config.mongodbUri) {
    console.error('❌ FATAL: MONGODB_URI environment variable is missing.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB successfully.\n');

    const results = await syncAllDatabaseIndexes();

    console.log('\n───────────────────────────────────────────────────────────────');
    console.log('INDEX CREATION RESULTS:');
    console.log('───────────────────────────────────────────────────────────────');
    for (const res of results) {
      if (res.success) {
        console.log(`  ✅ [INDEXED] Model: ${res.modelName}`);
      } else {
        console.error(`  ❌ [FAILED]  Model: ${res.modelName} - ${res.error}`);
      }
    }

    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      console.error(`\n❌ Failed to synchronize indexes on ${failed.length} model(s).`);
      process.exit(1);
    }

    console.log('\n🎉 ALL DATABASE INDEXES SYNCHRONIZED SUCCESSFULLY!\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Fatal error during index deployment:', err.message);
    process.exit(1);
  }
}

run();
