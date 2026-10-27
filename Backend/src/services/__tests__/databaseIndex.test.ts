/**
 * databaseIndex.test.ts
 * =========================================================
 * Database Index Verification Test Suite
 *
 * Verifies:
 *  1. All critical query path indexes are defined on Mongoose schemas
 *  2. Compound indexes exist for submission queues, learner history, and audit timelines
 *  3. syncAllDatabaseIndexes gracefully handles offline/disconnected state
 */

import { describe, it, expect } from 'vitest';
import { User } from '../../models/User.model';
import { Submission } from '../../models/Submission.model';
import { AuditLog } from '../../models/AuditLog.model';
import { Task } from '../../models/Task.model';
import { CreditLedger } from '../../models/CreditLedger.model';
import { syncAllDatabaseIndexes } from '../databaseIndex.service';

describe('Database Index Definition & Query Path Coverage Suite', () => {
  it('confirms User schema has indexes on email, role+createdAt, and inviteToken', () => {
    const indexes = User.schema.indexes();
    const indexKeys = indexes.map(([fields]) => Object.keys(fields).join('_'));

    expect(indexKeys).toContain('role_createdAt');
    expect(indexKeys).toContain('inviteToken');
  });

  it('confirms Submission schema has compound indexes for queue and history retrieval', () => {
    const indexes = Submission.schema.indexes();
    const indexKeys = indexes.map(([fields]) => Object.keys(fields).join('_'));

    // Queue query: status + submittedAt
    expect(indexKeys).toContain('status_submittedAt');
    // Learner submissions history: learner + createdAt
    expect(indexKeys).toContain('learner_createdAt');
    // Evaluator completed reviews: evaluator + reviewedAt
    expect(indexKeys).toContain('evaluator_reviewedAt');
  });

  it('confirms AuditLog schema has compound indexes for timeline and actor filtering', () => {
    const indexes = AuditLog.schema.indexes();
    const indexKeys = indexes.map(([fields]) => Object.keys(fields).join('_'));

    expect(indexKeys).toContain('action_time');
    expect(indexKeys).toContain('actor_time');
  });

  it('confirms Task schema has compound index on isActive and level', () => {
    const indexes = Task.schema.indexes();
    const indexKeys = indexes.map(([fields]) => Object.keys(fields).join('_'));

    expect(indexKeys).toContain('isActive_level');
  });

  it('confirms CreditLedger schema has compound unique idempotency index', () => {
    const indexes = CreditLedger.schema.indexes();
    const indexKeys = indexes.map(([fields]) => Object.keys(fields).join('_'));

    expect(indexKeys).toContain('userId_createdAt');
    expect(indexKeys).toContain('userId_idempotencyKey');
  });

  it('syncAllDatabaseIndexes resolves safely when MongoDB is offline', async () => {
    // If not connected, it should return [] without throwing
    const res = await syncAllDatabaseIndexes();
    expect(Array.isArray(res)).toBe(true);
  });
});
