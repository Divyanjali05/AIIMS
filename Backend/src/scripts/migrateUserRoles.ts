/**
 * One-time migration script: Migrates existing free-text user role values
 * to the fixed enum: 'learner' | 'evaluator' | 'admin' in PostgreSQL.
 * Any existing value outside this enum maps to 'learner'.
 *
 * Usage:
 *   npx ts-node src/scripts/migrateUserRoles.ts --dry-run
 *   npx ts-node src/scripts/migrateUserRoles.ts
 */

import { prisma, connectDatabase, disconnectDatabase } from '../config/prisma';

const VALID_ROLES = new Set(['learner', 'evaluator', 'admin']);

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

  const users = await prisma.user.findMany();
  inspected = users.length;
  console.log(`Found ${inspected} total user record(s) to inspect.\n`);

  for (const user of users) {
    const currentRole = user.role;
    const isValid = typeof currentRole === 'string' && VALID_ROLES.has(currentRole);

    if (isValid) {
      unchanged++;
    } else {
      eligible++;
      console.log(
        `[ELIGIBLE] User ${user.email} (ID: ${user.id}) has role '${currentRole}' -> will map to 'learner'`
      );

      if (!dryRun) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'learner' },
        });
        migrated++;
      }
    }
  }

  console.log('\n===============================================================');
  console.log('📊 MIGRATION SUMMARY');
  console.log(`- Inspected: ${inspected}`);
  console.log(`- Unchanged (already valid enum): ${unchanged}`);
  console.log(`- Eligible for migration: ${eligible}`);
  console.log(`- Successfully migrated: ${migrated}`);
  console.log('===============================================================\n');

  return { inspected, eligible, migrated, unchanged };
}

async function runCli() {
  const isDryRun = process.argv.includes('--dry-run');

  try {
    const conn = await connectDatabase(3, 1000);
    if (!conn.connected) {
      console.warn('⚠️  PostgreSQL is not reachable. Skipping role migration.');
      process.exit(0);
    }
    console.log(`Connected to PostgreSQL database "${conn.databaseName || 'aiims'}".\n`);

    await migrateUserRoles(isDryRun);
    await disconnectDatabase();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runCli();
}
