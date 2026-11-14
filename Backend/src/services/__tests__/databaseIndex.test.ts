/**
 * databaseIndex.test.ts
 * =========================================================
 * PostgreSQL Database Index Verification Test Suite
 *
 * Verifies:
 *  1. All critical query path indexes are declared for PostgreSQL tables
 *  2. Compound indexes exist for submission queues, learner history, and audit timelines
 *  3. Declared index specs match Prisma migration SQL definitions
 *  4. syncAllDatabaseIndexes gracefully handles offline/disconnected state and connected verification
 */

import fs from 'fs';
import path from 'path';
import { afterAll, describe, it, expect } from 'vitest';
import { setDatabaseConnected } from '../../config/prisma';
import { EXPECTED_PG_INDEXES, syncAllDatabaseIndexes } from '../databaseIndex.service';
import { installPrismaTestDouble, uninstallPrismaTestDouble } from './helpers/prismaTestDouble';

function getIndexesFor(modelName: string): string[] {
  const entry = EXPECTED_PG_INDEXES.find((e) => e.modelName === modelName);
  return entry ? entry.expectedIndexes : [];
}

afterAll(() => {
  uninstallPrismaTestDouble();
});

describe('PostgreSQL Index Definition & Query Path Coverage Suite', () => {
  it('confirms User table has indexes on email, role+createdAt, and inviteToken', () => {
    const indexes = getIndexesFor('User');
    expect(indexes).toContain('users_email_key');
    expect(indexes).toContain('users_role_created_at_idx');
    expect(indexes).toContain('users_invite_token_idx');
  });

  it('confirms Submission table has compound indexes for queue and history retrieval', () => {
    const indexes = getIndexesFor('Submission');
    expect(indexes).toContain('submissions_status_submitted_at_idx');
    expect(indexes).toContain('submissions_learner_id_created_at_idx');
    expect(indexes).toContain('submissions_evaluator_id_reviewed_at_idx');
  });

  it('confirms AuditLog table has compound indexes for timeline and actor filtering', () => {
    const indexes = getIndexesFor('AuditLog');
    expect(indexes).toContain('audit_logs_action_time_idx');
    expect(indexes).toContain('audit_logs_actor_time_idx');
  });

  it('confirms Task table has compound index on isActive and level', () => {
    const indexes = getIndexesFor('Task');
    expect(indexes).toContain('tasks_is_active_level_idx');
  });

  it('confirms CreditLedger table has compound unique idempotency index', () => {
    const indexes = getIndexesFor('CreditLedger');
    expect(indexes).toContain('credit_ledger_user_id_created_at_idx');
    expect(indexes).toContain('credit_ledger_user_id_idempotency_key_key');
  });

  it('confirms all 22 models and declared indexes exist in Prisma SQL migrations', () => {
    expect(EXPECTED_PG_INDEXES).toHaveLength(22);
    const migration1Path = path.resolve(
      __dirname,
      '../../../prisma/migrations/0001_init/migration.sql'
    );
    const migration2Path = path.resolve(
      __dirname,
      '../../../prisma/migrations/0002_entrepreneur_profile/migration.sql'
    );
    const combinedSql =
      fs.readFileSync(migration1Path, 'utf8') + '\n' + fs.readFileSync(migration2Path, 'utf8');

    for (const spec of EXPECTED_PG_INDEXES) {
      expect(combinedSql).toContain(`CREATE TABLE "${spec.tableName}"`);
      for (const indexName of spec.expectedIndexes) {
        expect(combinedSql).toContain(`"${indexName}"`);
      }
    }
  });

  it('syncAllDatabaseIndexes resolves safely when PostgreSQL is offline', async () => {
    setDatabaseConnected(false);
    const res = await syncAllDatabaseIndexes();
    expect(Array.isArray(res)).toBe(true);
    expect(res).toHaveLength(0);
  });

  it('syncAllDatabaseIndexes verifies all 22 tables when connected', async () => {
    installPrismaTestDouble({ connected: true });
    const res = await syncAllDatabaseIndexes();
    expect(res).toHaveLength(22);
    expect(res.every((r) => r.success)).toBe(true);
  });
});
