/**
 * One-time idempotent migration script: Grants missing 400 credits to existing users
 * who only received the old 100 welcome bonus, establishing a 500 AC starting grant baseline.
 *
 * Usage:
 *   npx ts-node src/scripts/migrateWelcomeCredits500.ts --dry-run
 *   npx ts-node src/scripts/migrateWelcomeCredits500.ts
 */

import mongoose from 'mongoose';
import { config } from '../config/env';
import { User } from '../models/User.model';
import { CreditLedger } from '../models/CreditLedger.model';
import { creditsLedgerService } from '../services/creditsLedger.service';

const TOPUP_AMOUNT = 400;

export async function migrateWelcomeCredits500(dryRun = false): Promise<{
  inspected: number;
  eligible: number;
  migrated: number;
  skipped: number;
}> {
  console.log('===============================================================');
  console.log(`🚀 AIIMS Welcome Credit Top-up Migration (100 AC -> 500 AC)`);
  console.log(`MODE: ${dryRun ? '🔍 DRY RUN (No writes will occur)' : '⚡ LIVE EXECUTION'}`);
  console.log('===============================================================\n');

  let inspected = 0;
  let eligible = 0;
  let migrated = 0;
  let skipped = 0;

  const users = await User.find({}).lean();
  inspected = users.length;
  console.log(`Found ${inspected} total user(s) to inspect.\n`);

  for (const user of users) {
    const userId = String(user._id);
    const topupKey = `welcome-topup-500::${userId}`;

    // 1. Idempotency guard: check if user already received the topup
    const alreadyTopupLedger = await CreditLedger.findOne({
      userId,
      idempotencyKey: topupKey,
    });

    if (alreadyTopupLedger) {
      skipped++;
      continue;
    }

    // 2. Check if user already received a 500 welcome bonus
    const has500Welcome = await CreditLedger.findOne({
      userId,
      sourceId: 'WELCOME_BONUS',
      amount: 500,
    });

    if (has500Welcome) {
      skipped++;
      continue;
    }

    // 3. User is eligible for the 400 AC top-up
    eligible++;

    if (dryRun) {
      console.log(
        `[DRY RUN] User "${user.email}" (${userId}) is eligible: current balance = ${user.aiimsCredits ?? 0} AC -> would become ${(user.aiimsCredits ?? 0) + TOPUP_AMOUNT} AC`
      );
    } else {
      const result = await creditsLedgerService.executeTransaction({
        userId,
        type: 'EARN',
        category: 'REWARD',
        amount: TOPUP_AMOUNT,
        reason: 'Welcome Learning Grant Upgrade (+400 AC to 500 AC baseline)',
        source: 'SYSTEM',
        sourceId: 'WELCOME_TOPUP_500',
        idempotencyKey: topupKey,
      });

      if (result.success && !result.duplicate) {
        migrated++;
        console.log(
          `✅ Migrated user "${user.email}" (${userId}): new balance = ${result.balance} AC`
        );
      } else if (result.duplicate) {
        skipped++;
        console.log(
          `⏭️ User "${user.email}" (${userId}) already received topup (idempotency key matched)`
        );
      } else {
        console.error(`❌ Failed to migrate user "${user.email}" (${userId}): ${result.error}`);
      }
    }
  }

  console.log('\n===============================================================');
  console.log(`MIGRATION SUMMARY:`);
  console.log(` - Total users inspected: ${inspected}`);
  console.log(` - Users eligible for +400 AC: ${eligible}`);
  if (dryRun) {
    console.log(` - Total users that would change: ${eligible}`);
  } else {
    console.log(` - Users successfully migrated: ${migrated}`);
  }
  console.log(` - Users skipped (already 500 / already topup): ${skipped}`);
  console.log('===============================================================\n');

  return { inspected, eligible, migrated, skipped };
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  try {
    if (!config.mongodbUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    await mongoose.connect(config.mongodbUri);
    console.log('Connected to MongoDB database.');

    await migrateWelcomeCredits500(isDryRun);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

// Only invoke main when executed directly from the CLI
if (require.main === module) {
  main();
}
