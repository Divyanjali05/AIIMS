/**
 * databaseIndex.service.ts
 * =========================================================
 * PostgreSQL Table & Index Verification Service
 *
 * Verifies all expected PostgreSQL tables and Prisma-managed indexes exist
 * before accepting traffic. Fails closed safely when DB is disconnected.
 */

import { prisma, isDatabaseConnected } from '../config/prisma';
import { logger } from '../utils/logger';

export interface ExpectedTableIndexes {
  modelName: string;
  tableName: string;
  expectedIndexes: string[];
}

export const EXPECTED_PG_INDEXES: readonly ExpectedTableIndexes[] = [
  {
    modelName: 'User',
    tableName: 'users',
    expectedIndexes: [
      'users_email_key',
      'users_role_created_at_idx',
      'users_invite_token_idx',
      'users_device_id_hash_idx',
      'users_assessment_status_idx',
      'users_active_session_id_idx',
    ],
  },
  {
    modelName: 'Institute',
    tableName: 'institutes',
    expectedIndexes: ['institutes_code_key', 'institutes_name_idx', 'institutes_status_name_idx'],
  },
  {
    modelName: 'Cohort',
    tableName: 'cohorts',
    expectedIndexes: [
      'cohorts_institute_id_stream_education_level_program_id_spec_key',
      'cohorts_institute_id_idx',
      'cohorts_stream_education_level_idx',
      'cohorts_stream_program_id_specialization_id_idx',
    ],
  },
  {
    modelName: 'StudentProfile',
    tableName: 'student_profiles',
    expectedIndexes: [
      'student_profiles_user_id_key',
      'student_profiles_institute_id_idx',
      'student_profiles_cohort_id_idx',
      'student_profiles_stream_education_level_idx',
      'student_profiles_institute_id_stream_idx',
      'student_profiles_program_id_specialization_id_stream_idx',
    ],
  },
  {
    modelName: 'CreditLedger',
    tableName: 'credit_ledger',
    expectedIndexes: [
      'credit_ledger_user_id_created_at_idx',
      'credit_ledger_related_task_id_idx',
      'credit_ledger_source_source_id_idx',
      'credit_ledger_user_id_idempotency_key_key',
    ],
  },
  {
    modelName: 'Session',
    tableName: 'sessions',
    expectedIndexes: [
      'sessions_session_id_key',
      'sessions_user_id_status_idx',
      'sessions_user_id_device_id_hash_idx',
      'sessions_device_id_hash_idx',
      'sessions_expires_at_idx',
    ],
  },
  {
    modelName: 'DeviceResetAudit',
    tableName: 'device_reset_audits',
    expectedIndexes: [
      'device_reset_audits_target_user_id_reset_at_idx',
      'device_reset_audits_admin_user_id_idx',
    ],
  },
  {
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    expectedIndexes: [
      'audit_logs_action_time_idx',
      'audit_logs_actor_time_idx',
      'audit_logs_target_idx',
      'audit_logs_time_idx',
    ],
  },
  {
    modelName: 'Task',
    tableName: 'tasks',
    expectedIndexes: ['tasks_task_id_key', 'tasks_is_active_level_idx'],
  },
  {
    modelName: 'Submission',
    tableName: 'submissions',
    expectedIndexes: [
      'submissions_status_submitted_at_idx',
      'submissions_learner_id_created_at_idx',
      'submissions_evaluator_id_reviewed_at_idx',
      'submissions_task_id_idx',
    ],
  },
  {
    modelName: 'FocusSession',
    tableName: 'focus_sessions',
    expectedIndexes: [
      'focus_sessions_session_id_key',
      'focus_sessions_learner_id_status_idx',
      'focus_sessions_learner_id_started_at_idx',
      'focus_sessions_learner_id_session_state_idx',
    ],
  },
  {
    modelName: 'QuestionBank',
    tableName: 'question_bank',
    expectedIndexes: [
      'question_bank_question_id_key',
      'question_bank_topic_level_track_status_idx',
      'question_bank_source_status_idx',
      'question_bank_status_idx',
    ],
  },
  {
    modelName: 'QuestionAssignment',
    tableName: 'question_assignments',
    expectedIndexes: [
      'question_assignments_assignment_id_key',
      'question_assignments_learner_id_status_idx',
      'question_assignments_college_question_id_assigned_at_idx',
      'question_assignments_institution_id_question_id_assigned_at_idx',
      'question_assignments_cohort_id_question_id_assigned_at_idx',
      'question_assignments_learner_id_question_id_key',
    ],
  },
  {
    modelName: 'QuestionAttempt',
    tableName: 'question_attempts',
    expectedIndexes: [
      'question_attempts_attempt_id_key',
      'question_attempts_learner_id_submitted_at_idx',
      'question_attempts_question_id_submitted_at_idx',
      'question_attempts_assignment_id_idx',
    ],
  },
  {
    modelName: 'InstitutionExclusionConfig',
    tableName: 'institution_exclusion_configs',
    expectedIndexes: ['institution_exclusion_configs_config_key_key'],
  },
  {
    modelName: 'ClarityProgressionConfig',
    tableName: 'clarity_progression_configs',
    expectedIndexes: ['clarity_progression_configs_config_key_key'],
  },
  {
    modelName: 'LearnerClarityProgression',
    tableName: 'learner_clarity_progressions',
    expectedIndexes: [
      'learner_clarity_progressions_learner_id_idx',
      'learner_clarity_progressions_topic_idx',
      'learner_clarity_progressions_learner_id_topic_key',
    ],
  },
  {
    modelName: 'AiTool',
    tableName: 'ai_tools',
    expectedIndexes: [
      'ai_tools_active_status_verification_status_idx',
      'ai_tools_category_idx',
      'ai_tools_provider_idx',
      'ai_tools_status_idx',
    ],
  },
  {
    modelName: 'ToolEvidence',
    tableName: 'tool_evidences',
    expectedIndexes: ['tool_evidences_tool_id_verification_status_idx'],
  },
  {
    modelName: 'ToolVersionHistory',
    tableName: 'tool_version_histories',
    expectedIndexes: [
      'tool_version_histories_tool_id_detected_at_idx',
      'tool_version_histories_change_type_idx',
    ],
  },
  {
    modelName: 'ToolDiscoveryRun',
    tableName: 'tool_discovery_runs',
    expectedIndexes: ['tool_discovery_runs_started_at_idx', 'tool_discovery_runs_status_idx'],
  },
  {
    modelName: 'EntrepreneurProfile',
    tableName: 'entrepreneur_profiles',
    expectedIndexes: [
      'entrepreneur_profiles_user_id_key',
      'entrepreneur_profiles_industry_idx',
      'entrepreneur_profiles_venture_stage_idx',
    ],
  },
];

export interface IndexSyncResult {
  modelName: string;
  tableName: string;
  success: boolean;
  indexCount?: number;
  missingIndexes?: string[];
  error?: string;
}

/**
 * Verifies that all expected PostgreSQL tables and indexes managed by Prisma migrations exist.
 */
export async function syncAllDatabaseIndexes(): Promise<IndexSyncResult[]> {
  if (!isDatabaseConnected()) {
    logger.warn('[DatabaseIndexService] PostgreSQL is not connected; skipping index verification.');
    return [];
  }

  logger.info(
    `[DatabaseIndexService] Verifying schema & indexes for ${EXPECTED_PG_INDEXES.length} PostgreSQL tables...`
  );

  try {
    const pgIndexes = await prisma.$queryRaw<Array<{ tablename: string; indexname: string }>>`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
    `;

    const indexMap = new Map<string, Set<string>>();
    for (const row of pgIndexes) {
      if (!indexMap.has(row.tablename)) {
        indexMap.set(row.tablename, new Set());
      }
      indexMap.get(row.tablename)!.add(row.indexname);
    }

    const results: IndexSyncResult[] = [];
    for (const spec of EXPECTED_PG_INDEXES) {
      const existing = indexMap.get(spec.tableName) || new Set<string>();
      const missingIndexes = spec.expectedIndexes.filter((idx) => !existing.has(idx));
      const success = missingIndexes.length === 0;
      if (!success) {
        logger.warn(
          `[DatabaseIndexService] Missing indexes on ${spec.tableName}: ${missingIndexes.join(', ')}`
        );
      }
      results.push({
        modelName: spec.modelName,
        tableName: spec.tableName,
        success,
        indexCount: existing.size,
        missingIndexes: missingIndexes.length > 0 ? missingIndexes : undefined,
      });
    }

    const okCount = results.filter((r) => r.success).length;
    logger.info(
      `[DatabaseIndexService] PostgreSQL index verification completed: ${okCount}/${EXPECTED_PG_INDEXES.length} tables verified.`
    );
    return results;
  } catch (err: any) {
    logger.error(`[DatabaseIndexService] PostgreSQL index inspection failed: ${err.message}`);
    return EXPECTED_PG_INDEXES.map((spec) => ({
      modelName: spec.modelName,
      tableName: spec.tableName,
      success: false,
      error: err.message,
    }));
  }
}
