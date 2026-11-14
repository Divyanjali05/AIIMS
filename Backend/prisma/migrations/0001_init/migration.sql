-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'learner',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "invite_token" TEXT,
    "invite_token_expires" TIMESTAMP(3),
    "totp_encrypted_secret" TEXT,
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "totp_pending_setup" BOOLEAN NOT NULL DEFAULT false,
    "totp_backup_code_hashes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totp_failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "totp_locked_until" TIMESTAMP(3),
    "device_id_hash" TEXT DEFAULT '',
    "device_name" TEXT DEFAULT '',
    "device_platform" TEXT NOT NULL DEFAULT 'web',
    "device_bound_at" TIMESTAMP(3),
    "device_last_seen_at" TIMESTAMP(3),
    "active_session_id" TEXT,
    "binding_status" TEXT NOT NULL DEFAULT 'UNBOUND',
    "device_reset_at" TIMESTAMP(3),
    "device_reset_by" TEXT,
    "college" TEXT NOT NULL DEFAULT 'Engineering & Technology College',
    "track" TEXT NOT NULL DEFAULT 'Student',
    "target_goal" TEXT NOT NULL DEFAULT 'Master AI Intelligence & Mentoring',
    "stage" TEXT NOT NULL DEFAULT 'Knowing',
    "xp_points" INTEGER NOT NULL DEFAULT 100,
    "aiims_credits" INTEGER NOT NULL DEFAULT 500,
    "assessment_status" TEXT NOT NULL DEFAULT 'not_started',
    "assessment_data" JSONB NOT NULL DEFAULT '{"status":"not_started","answers":{},"currentQuestionIndex":0,"completedAt":null,"rewardClaimed":false,"scores":{"usageFrequency":0,"evaluationCapability":0,"workflowDesign":0,"strategicVision":0,"mentorshipReadiness":0}}',
    "analysis_data" JSONB NOT NULL DEFAULT '{"status":"locked","topCapability":"AI Evaluation & Critical Assessment","growthArea":"AI Workflow Design","unlockedAt":null}',
    "clarity_data" JSONB NOT NULL DEFAULT '{"status":"locked","selectedAreas":[],"selectedTopic":null,"completedTopics":[],"reflections":{},"taskScores":{},"trialRunsUsed":0}',
    "focus_data" JSONB NOT NULL DEFAULT '{"status":"locked","selectedTrack":null,"history":[],"activatedAt":null,"sessionHistory":[],"activeSession":null,"sessionConfig":null}',
    "radar_data" JSONB NOT NULL DEFAULT '{"status":"locked","investigatedSignalIds":[],"followedSignalIds":[],"savedSignalIds":[],"dismissedSignalIds":[],"lastViewedRadar":null,"radarProgress":0}',
    "investigation_data" JSONB NOT NULL DEFAULT '{"status":"locked","selectedSignalId":null,"userNotes":{}}',
    "solver_data" JSONB NOT NULL DEFAULT '{"latestWorkflow":null,"history":[]}',
    "build_data" JSONB NOT NULL DEFAULT '{"projects":[],"activeProjectId":null}',
    "relevance_data" JSONB NOT NULL DEFAULT '{"status":"locked"}',
    "mentor_data" JSONB NOT NULL DEFAULT '{"status":"locked"}',
    "transactions_data" JSONB NOT NULL DEFAULT '[]',
    "notifications_data" JSONB NOT NULL DEFAULT '[{"id":"notif-init","title":"Welcome to AIIMS Ecosystem","message":"Begin with your baseline Capability Assessment to unlock personalized AI intelligence.","timestamp":"Just now","targetTab":"assessment","read":false}]',
    "ai_wallet_data" JSONB NOT NULL DEFAULT '{"userTools":[],"dismissedRecommendations":[]}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "short_name" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "type" TEXT NOT NULL DEFAULT 'COLLEGE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "requested_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cohorts" (
    "id" TEXT NOT NULL,
    "institute_id" TEXT,
    "institute_name" TEXT,
    "stream" TEXT NOT NULL,
    "education_level" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "program_name" TEXT NOT NULL,
    "specialization_id" TEXT NOT NULL,
    "specialization_name" TEXT NOT NULL,
    "admission_year" INTEGER NOT NULL,
    "graduation_year" INTEGER NOT NULL,
    "display_name" TEXT NOT NULL,
    "short_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "student_count" INTEGER NOT NULL DEFAULT 0,
    "assessment_version" TEXT NOT NULL DEFAULT 'v1.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cohorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "display_name" TEXT,
    "track" TEXT NOT NULL DEFAULT 'Student',
    "institute_id" TEXT,
    "institute_name" TEXT,
    "campus_name" TEXT,
    "department_name" TEXT,
    "stream" TEXT NOT NULL,
    "stream_sub_category" TEXT NOT NULL,
    "education_level" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "program_name" TEXT NOT NULL,
    "specialization_id" TEXT NOT NULL,
    "specialization_name" TEXT NOT NULL,
    "year_of_study" INTEGER NOT NULL,
    "admission_year" INTEGER NOT NULL,
    "expected_graduation_year" INTEGER NOT NULL,
    "cohort_id" TEXT,
    "ai_familiarity" TEXT,
    "ai_usage_contexts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "primary_goal" TEXT,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_ledger" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'REWARD',
    "amount" INTEGER NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_id" TEXT,
    "idempotency_key" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "related_task_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id_hash" TEXT NOT NULL,
    "device_name" TEXT NOT NULL DEFAULT 'Unknown Device',
    "platform" TEXT NOT NULL DEFAULT 'web',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_reset_audits" (
    "id" TEXT NOT NULL,
    "target_user_id" TEXT,
    "admin_user_id" TEXT,
    "admin_email" TEXT NOT NULL,
    "previous_device_id_hash" TEXT NOT NULL DEFAULT '',
    "previous_device_name" TEXT DEFAULT '',
    "reason" TEXT NOT NULL,
    "reset_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_reset_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "actor_name" TEXT,
    "actor_role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "target_type" TEXT,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General AI',
    "level" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "learner_name" TEXT,
    "learner_email" TEXT,
    "task_id" TEXT NOT NULL,
    "task_title" TEXT,
    "answer_content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "evaluator_id" TEXT,
    "evaluator_name" TEXT,
    "rubric_scores" JSONB NOT NULL DEFAULT '{}',
    "written_feedback" TEXT NOT NULL DEFAULT '',
    "revision_count" INTEGER NOT NULL DEFAULT 0,
    "status_history" JSONB NOT NULL DEFAULT '[]',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "focus_sessions" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "track_title" TEXT NOT NULL DEFAULT 'AI Workflow Design',
    "intention" TEXT DEFAULT '',
    "session_state" TEXT NOT NULL DEFAULT 'focusing',
    "period_type" TEXT NOT NULL DEFAULT 'focus',
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "focus_duration_minutes" INTEGER NOT NULL DEFAULT 25,
    "break_duration_minutes" INTEGER NOT NULL DEFAULT 5,
    "long_break_duration_minutes" INTEGER NOT NULL DEFAULT 15,
    "long_break_interval" INTEGER NOT NULL DEFAULT 4,
    "enable_long_break" BOOLEAN NOT NULL DEFAULT true,
    "sound_enabled" BOOLEAN NOT NULL DEFAULT true,
    "total_period_seconds" INTEGER NOT NULL DEFAULT 1500,
    "remaining_seconds" INTEGER NOT NULL DEFAULT 1500,
    "accumulated_focus_seconds" INTEGER NOT NULL DEFAULT 0,
    "total_break_seconds" INTEGER NOT NULL DEFAULT 0,
    "completed_cycles" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paused_at" TIMESTAMP(3),
    "target_end_time" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "focus_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_bank" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "track" TEXT NOT NULL DEFAULT 'General',
    "title" TEXT NOT NULL,
    "prompt_text" TEXT NOT NULL,
    "hint" TEXT,
    "test_scenario" TEXT NOT NULL,
    "expected_criteria" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scoring_rubric" JSONB NOT NULL DEFAULT '[]',
    "source" TEXT NOT NULL DEFAULT 'Human',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "ai_metadata" JSONB,
    "created_by" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_assignments" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "track" TEXT NOT NULL DEFAULT 'General',
    "college" TEXT,
    "institution_id" TEXT,
    "cohort_id" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_attempts" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "track" TEXT NOT NULL DEFAULT 'General',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_answer" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "rubric_feedback" JSONB NOT NULL DEFAULT '[]',
    "overall_feedback" TEXT DEFAULT '',
    "evaluation_status" TEXT NOT NULL DEFAULT 'EVALUATED',
    "time_taken_seconds" INTEGER NOT NULL DEFAULT 0,
    "credit_transaction_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institution_exclusion_configs" (
    "id" TEXT NOT NULL,
    "config_key" TEXT NOT NULL DEFAULT 'GLOBAL_EXCLUSION_POLICY',
    "scope" TEXT NOT NULL DEFAULT 'college',
    "exclusion_days" INTEGER NOT NULL DEFAULT 30,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institution_exclusion_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clarity_progression_configs" (
    "id" TEXT NOT NULL,
    "config_key" TEXT NOT NULL DEFAULT 'GLOBAL_PROGRESSION_CONFIG',
    "upward_threshold" INTEGER NOT NULL DEFAULT 80,
    "consecutive_required" INTEGER NOT NULL DEFAULT 2,
    "downward_threshold" INTEGER NOT NULL DEFAULT 50,
    "updated_by" TEXT NOT NULL DEFAULT 'SYSTEM_DEFAULT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clarity_progression_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_clarity_progressions" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "current_level" TEXT NOT NULL DEFAULT 'Easy',
    "consecutive_high_scores" INTEGER NOT NULL DEFAULT 0,
    "total_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_score" INTEGER,
    "history" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learner_clarity_progressions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_tools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "short_description" TEXT,
    "official_website" TEXT NOT NULL,
    "website_url" TEXT,
    "category" TEXT NOT NULL,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "domains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subdomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "use_cases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tasks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_users" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "input_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "output_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supported_platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supported_languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "limitations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "model_information" TEXT,
    "version_information" TEXT,
    "pricing_details" JSONB NOT NULL,
    "pricing" TEXT,
    "learning_track" JSONB NOT NULL DEFAULT '[]',
    "first_seen_at" TEXT NOT NULL,
    "last_verified_at" TEXT NOT NULL,
    "last_updated_at" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "verification_status" TEXT NOT NULL DEFAULT 'VERIFIED',
    "evidence_coverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "icon_name" TEXT,
    "active_status" BOOLEAN NOT NULL DEFAULT true,
    "task_mappings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relevant_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skill_level" TEXT,
    "related_tools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "alternatives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "radar_topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clarity_topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "focus_tracks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "familiarity_guidance" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_evidences" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "claim" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_title" TEXT NOT NULL,
    "source_name" TEXT,
    "title" TEXT,
    "evidence_text" TEXT,
    "credibility" TEXT DEFAULT 'MEDIUM',
    "published_at" TEXT NOT NULL,
    "verified_at" TEXT NOT NULL,
    "discovered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "verification_status" TEXT NOT NULL DEFAULT 'PENDING',
    "structured_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_version_histories" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "change_type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "change_summary" TEXT,
    "previous_value" TEXT,
    "new_value" TEXT,
    "previous_data" JSONB,
    "new_data" JSONB,
    "detected_at" TEXT NOT NULL,
    "source_url" TEXT,
    "source_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verified_at" TEXT NOT NULL,
    "recorded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_version_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_discovery_runs" (
    "id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "source" TEXT NOT NULL DEFAULT 'MANUAL_SEED',
    "discovered_count" INTEGER NOT NULL DEFAULT 0,
    "new_tools_count" INTEGER NOT NULL DEFAULT 0,
    "updated_tools_count" INTEGER NOT NULL DEFAULT 0,
    "duplicate_count" INTEGER NOT NULL DEFAULT 0,
    "rejected_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "run_errors" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_discovery_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_created_at_idx" ON "users"("role", "created_at" DESC);

-- CreateIndex
CREATE INDEX "users_invite_token_idx" ON "users"("invite_token");

-- CreateIndex
CREATE INDEX "users_device_id_hash_idx" ON "users"("device_id_hash");

-- CreateIndex
CREATE INDEX "users_assessment_status_idx" ON "users"("assessment_status");

-- CreateIndex
CREATE INDEX "users_active_session_id_idx" ON "users"("active_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "institutes_code_key" ON "institutes"("code");

-- CreateIndex
CREATE INDEX "institutes_name_idx" ON "institutes"("name");

-- CreateIndex
CREATE INDEX "institutes_status_name_idx" ON "institutes"("status", "name");

-- CreateIndex
CREATE INDEX "cohorts_institute_id_idx" ON "cohorts"("institute_id");

-- CreateIndex
CREATE INDEX "cohorts_stream_education_level_idx" ON "cohorts"("stream", "education_level");

-- CreateIndex
CREATE INDEX "cohorts_stream_program_id_specialization_id_idx" ON "cohorts"("stream", "program_id", "specialization_id");

-- CreateIndex
CREATE UNIQUE INDEX "cohorts_institute_id_stream_education_level_program_id_spec_key" ON "cohorts"("institute_id", "stream", "education_level", "program_id", "specialization_id", "admission_year", "graduation_year");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_user_id_key" ON "student_profiles"("user_id");

-- CreateIndex
CREATE INDEX "student_profiles_institute_id_idx" ON "student_profiles"("institute_id");

-- CreateIndex
CREATE INDEX "student_profiles_cohort_id_idx" ON "student_profiles"("cohort_id");

-- CreateIndex
CREATE INDEX "student_profiles_stream_education_level_idx" ON "student_profiles"("stream", "education_level");

-- CreateIndex
CREATE INDEX "student_profiles_institute_id_stream_idx" ON "student_profiles"("institute_id", "stream");

-- CreateIndex
CREATE INDEX "student_profiles_program_id_specialization_id_stream_idx" ON "student_profiles"("program_id", "specialization_id", "stream");

-- CreateIndex
CREATE INDEX "credit_ledger_user_id_created_at_idx" ON "credit_ledger"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "credit_ledger_related_task_id_idx" ON "credit_ledger"("related_task_id");

-- CreateIndex
CREATE INDEX "credit_ledger_source_source_id_idx" ON "credit_ledger"("source", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "credit_ledger_user_id_idempotency_key_key" ON "credit_ledger"("user_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_id_key" ON "sessions"("session_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_status_idx" ON "sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "sessions_user_id_device_id_hash_idx" ON "sessions"("user_id", "device_id_hash");

-- CreateIndex
CREATE INDEX "sessions_device_id_hash_idx" ON "sessions"("device_id_hash");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "device_reset_audits_target_user_id_reset_at_idx" ON "device_reset_audits"("target_user_id", "reset_at" DESC);

-- CreateIndex
CREATE INDEX "device_reset_audits_admin_user_id_idx" ON "device_reset_audits"("admin_user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_time_idx" ON "audit_logs"("action", "time" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actor_time_idx" ON "audit_logs"("actor", "time" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_target_idx" ON "audit_logs"("target");

-- CreateIndex
CREATE INDEX "audit_logs_time_idx" ON "audit_logs"("time" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "tasks_task_id_key" ON "tasks"("task_id");

-- CreateIndex
CREATE INDEX "tasks_is_active_level_idx" ON "tasks"("is_active", "level");

-- CreateIndex
CREATE INDEX "submissions_status_submitted_at_idx" ON "submissions"("status", "submitted_at" ASC);

-- CreateIndex
CREATE INDEX "submissions_learner_id_created_at_idx" ON "submissions"("learner_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "submissions_evaluator_id_reviewed_at_idx" ON "submissions"("evaluator_id", "reviewed_at" DESC);

-- CreateIndex
CREATE INDEX "submissions_task_id_idx" ON "submissions"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "focus_sessions_session_id_key" ON "focus_sessions"("session_id");

-- CreateIndex
CREATE INDEX "focus_sessions_learner_id_status_idx" ON "focus_sessions"("learner_id", "status");

-- CreateIndex
CREATE INDEX "focus_sessions_learner_id_started_at_idx" ON "focus_sessions"("learner_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "focus_sessions_learner_id_session_state_idx" ON "focus_sessions"("learner_id", "session_state");

-- CreateIndex
CREATE UNIQUE INDEX "question_bank_question_id_key" ON "question_bank"("question_id");

-- CreateIndex
CREATE INDEX "question_bank_topic_level_track_status_idx" ON "question_bank"("topic", "level", "track", "status");

-- CreateIndex
CREATE INDEX "question_bank_source_status_idx" ON "question_bank"("source", "status");

-- CreateIndex
CREATE INDEX "question_bank_status_idx" ON "question_bank"("status");

-- CreateIndex
CREATE UNIQUE INDEX "question_assignments_assignment_id_key" ON "question_assignments"("assignment_id");

-- CreateIndex
CREATE INDEX "question_assignments_learner_id_status_idx" ON "question_assignments"("learner_id", "status");

-- CreateIndex
CREATE INDEX "question_assignments_college_question_id_assigned_at_idx" ON "question_assignments"("college", "question_id", "assigned_at" DESC);

-- CreateIndex
CREATE INDEX "question_assignments_institution_id_question_id_assigned_at_idx" ON "question_assignments"("institution_id", "question_id", "assigned_at" DESC);

-- CreateIndex
CREATE INDEX "question_assignments_cohort_id_question_id_assigned_at_idx" ON "question_assignments"("cohort_id", "question_id", "assigned_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "question_assignments_learner_id_question_id_key" ON "question_assignments"("learner_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_attempts_attempt_id_key" ON "question_attempts"("attempt_id");

-- CreateIndex
CREATE INDEX "question_attempts_learner_id_submitted_at_idx" ON "question_attempts"("learner_id", "submitted_at" DESC);

-- CreateIndex
CREATE INDEX "question_attempts_question_id_submitted_at_idx" ON "question_attempts"("question_id", "submitted_at" DESC);

-- CreateIndex
CREATE INDEX "question_attempts_assignment_id_idx" ON "question_attempts"("assignment_id");

-- CreateIndex
CREATE UNIQUE INDEX "institution_exclusion_configs_config_key_key" ON "institution_exclusion_configs"("config_key");

-- CreateIndex
CREATE UNIQUE INDEX "clarity_progression_configs_config_key_key" ON "clarity_progression_configs"("config_key");

-- CreateIndex
CREATE INDEX "learner_clarity_progressions_learner_id_idx" ON "learner_clarity_progressions"("learner_id");

-- CreateIndex
CREATE INDEX "learner_clarity_progressions_topic_idx" ON "learner_clarity_progressions"("topic");

-- CreateIndex
CREATE UNIQUE INDEX "learner_clarity_progressions_learner_id_topic_key" ON "learner_clarity_progressions"("learner_id", "topic");

-- CreateIndex
CREATE INDEX "ai_tools_active_status_verification_status_idx" ON "ai_tools"("active_status", "verification_status");

-- CreateIndex
CREATE INDEX "ai_tools_category_idx" ON "ai_tools"("category");

-- CreateIndex
CREATE INDEX "ai_tools_provider_idx" ON "ai_tools"("provider");

-- CreateIndex
CREATE INDEX "ai_tools_status_idx" ON "ai_tools"("status");

-- CreateIndex
CREATE INDEX "tool_evidences_tool_id_verification_status_idx" ON "tool_evidences"("tool_id", "verification_status");

-- CreateIndex
CREATE INDEX "tool_version_histories_tool_id_detected_at_idx" ON "tool_version_histories"("tool_id", "detected_at" DESC);

-- CreateIndex
CREATE INDEX "tool_version_histories_change_type_idx" ON "tool_version_histories"("change_type");

-- CreateIndex
CREATE INDEX "tool_discovery_runs_started_at_idx" ON "tool_discovery_runs"("started_at" DESC);

-- CreateIndex
CREATE INDEX "tool_discovery_runs_status_idx" ON "tool_discovery_runs"("status");

-- AddForeignKey
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_institute_id_fkey" FOREIGN KEY ("institute_id") REFERENCES "institutes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_institute_id_fkey" FOREIGN KEY ("institute_id") REFERENCES "institutes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_cohort_id_fkey" FOREIGN KEY ("cohort_id") REFERENCES "cohorts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_reset_audits" ADD CONSTRAINT "device_reset_audits_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_reset_audits" ADD CONSTRAINT "device_reset_audits_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_assignments" ADD CONSTRAINT "question_assignments_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question_bank"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "question_assignments"("assignment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_attempts" ADD CONSTRAINT "question_attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "question_bank"("question_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_evidences" ADD CONSTRAINT "tool_evidences_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "ai_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_version_histories" ADD CONSTRAINT "tool_version_histories_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "ai_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

