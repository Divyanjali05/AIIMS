/**
 * One-time migration script: Migrates existing free-text user role values
 * to the fixed enum: 'learner' | 'evaluator' | 'admin'.
 * Any existing value outside this enum maps to 'learner'.
 *
 * Usage:
 *   npx ts-node src/scripts/migrateUserRoles.ts --dry-run
 *   npx ts-node src/scripts/migrateUserRoles.ts
 */

import mongoose from 'mongoose';
import { config } from '../config/env';
import { User, UserRole } from '../models/User.model';

const VALID_ROLES: Set<string> = new Set<UserRole>(['learner', 'evaluator', 'admin']);

export async function migrateUserRoles(dryRun = false): Promise<{
  inspected: number;
  eligible: number;
  migrated: number;
  unchanged: number;
}> {
  console.log('===============================================================');
  console.log('🚀 AIIMS User Role Migration to Fixed Enum (learner, evaluator, admin)');
  console.log(`MODE: ${dryRun ? '🔍 DRY RUN (No writes will occur)' : '⚡ LIVE EXECUTION'}`);
  console.log('===============================================================\n');

  let inspected = 0;
  let eligible = 0;
  let migrated = 0;
  let unchanged = 0;

  const users = await User.find({}).lean();
  inspected = users.length;
  console.log(`Found ${inspected} total user record(s) to inspect.\n`);

  for (const user of users) {
    const currentRole = (user as any).role;
    const isValid = typeof currentRole === 'string' && VALID_ROLES.has(currentRole);

    if (isValid) {
      unchanged++;
    } else {
      eligible++;
      console.log(
        `[ELIGIBLE] User ${user.email} (ID: ${user._id}) has role '${currentRole}' -> will map to 'learner'`
      );

      if (!dryRun) {
        await User.updateOne({ _id: user._id }, { $set: { role: 'learner' } });
        migrated++;
      }
    }
  }

  console.log('\n===============================================================');
  console.log('📊 MIGRATION SUMMARY');
  console.log(`- Inspected: ${inspected}`);
  console.log(`- Unchanged (already valid enum): ${unchanged}`);
  console.log(`- Eligible for migration: ${eligible}`);
  console.log(`- Migrated to 'learner': ${dryRun ? '0 (Dry Run)' : migrated}`);
  console.log('===============================================================\n');

  return { inspected, eligible, migrated, unchanged };
}

// Direct CLI execution wrapper
if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run');

  const runCli = async () => {
    if (!config.mongodbUri) {
      console.error('FATAL: MONGODB_URI is required to run migration.');
      process.exit(1);
    }

    try {
      await mongoose.connect(config.mongodbUri);
      console.log('Connected to MongoDB database.');
      await migrateUserRoles(isDryRun);
      await mongoose.disconnect();
      console.log('Database connection closed.');
      process.exit(0);
    } catch (err: any) {
      console.error('Migration failed with error:', err.message);
      process.exit(1);
    }
  };

  runCli();
}
