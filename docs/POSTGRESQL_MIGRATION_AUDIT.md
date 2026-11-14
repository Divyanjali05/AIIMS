# AIIMS — Complete MongoDB to PostgreSQL Migration Audit

**Date:** 2026-11-11
**Scope:** Full-stack repository audit of `c:/Users/divya/OneDrive/Documents/AIIMS` prior to complete elimination of MongoDB/Mongoose and replacement with PostgreSQL + Prisma ORM.

---

## 1. Executive Summary

- **Legacy Architecture:** Express 4 + TypeScript backend backed by `mongoose@^9.10.1`, paired with volatile process-memory fallback stores (`registeredUsers`, `memorySubmissions`, `inMemory*` maps, `mockUser`, `mockTransactions`) whenever `mongoose.connection.readyState !== 1`.
- **Target Architecture:** **PostgreSQL-only** persistence via **Prisma ORM** (`prisma` + `@prisma/client`) and versioned SQL migrations (`Backend/prisma/migrations/`), configured exclusively through `DATABASE_URL`. Zero MongoDB code, zero `mongoose` dependency, and zero runtime in-memory fallback stores in production modules.
- **Scale of Migration:**
  - **23 files** under `Backend/src/models/` (19 Mongoose schemas + `userStore.ts` + `aiims.models.ts` + exported domain interfaces/helpers).
  - **13 controllers** under `Backend/src/controllers/`.
  - **12 database-touching services** (including duplicated tool catalog/discovery/verification layers under `src/services/` and `src/services/wallet/`).
  - **1 database-dependent middleware** (`auth.middleware.ts`).
  - **35 scripts** under `Backend/src/scripts/` (~29 referencing MongoDB/Mongoose/`registeredUsers`).
  - **16 Vitest unit suites** under `Backend/src/services/__tests__/` (using direct in-memory Mongoose fallbacks in 10 suites).
  - **CI/Docker/Env/Frontend:** `.github/workflows/ci.yml`, `Backend/Dockerfile`, `.env.example`, `Backend/.env.example`, `Backend/src/config/env.ts`, `Backend/src/server.ts`, plus minor UI copy updates in 3 frontend files while preserving 100% of API contracts.

---

## 2. Inventory of Mongoose Models & Memory Stores (`Backend/src/models/`)

| # | Legacy File | Collection / Store | Target PostgreSQL Table (Prisma Model) | Notes & Foreign Keys |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `User.model.ts` | `users` | `users` (`User`) | Unified learner/evaluator/admin account; UUID/string PK (preserves migrated 24-hex ObjectIds); structured columns for auth, RBAC, TOTP 2FA, single-device binding (`device_id_hash`, `active_session_id`, `binding_status`), XP/credits (`aiims_credits`, `xp_points`), plus JSONB columns for dashboard/learning state modules (`assessment_data`, `analysis_data`, `clarity_data`, `focus_data`, `radar_data`, `investigation_data`, `solver_data`, `build_data`, `relevance_data`, `mentor_data`, `notifications_data`, `wallet_data`, `ai_wallet_data`, `transactions_data`). |
| 2 | `StudentProfile.model.ts` | `studentprofiles` | `student_profiles` (`StudentProfile`) | 1:1 FK `user_id` -> `users.id` (`ON DELETE CASCADE`), optional FK `institute_id` -> `institutes.id` (`ON DELETE SET NULL`), optional FK `cohort_id` -> `cohorts.id` (`ON DELETE SET NULL`). |
| 3 | `Institute.model.ts` | `institutes` | `institutes` (`Institute`) | Normalized institutional directory; `normalized_name` index, `is_verified`, `is_active`. Also seeds baseline active institutes if table is empty. |
| 4 | `Cohort.model.ts` | `cohorts` | `cohorts` (`Cohort`) | FK `institute_id` -> `institutes.id` (`ON DELETE CASCADE`); unique `[institute_id, stream, education_level, program_id, specialization_id, admission_year]`. |
| 5 | `CreditLedger.model.ts` | `creditledgers` | `credit_ledger` (`CreditLedger`) | **Financial Dual-Ledger**. Nullable FK `user_id` -> `users.id` (`ON DELETE SET NULL`) so ledger survives account deletion anonymization (`metadata = {}`, `user_id = NULL`). Unique `[user_id, idempotency_key]` + `[user_id, created_at]` index + `[source, source_id]` index. |
| 6 | `Session.model.ts` | `sessions` + memory map | `sessions` (`Session`) | Single-device active session store; `session_id` unique; FK `user_id` -> `users.id` (`ON DELETE CASCADE`); indexes `[user_id, status]`, `device_id_hash`, `expires_at`. Migrated to `SessionService`. |
| 7 | `DeviceResetAudit.model.ts` | `deviceresetaudits` + memory array | `device_reset_audits` (`DeviceResetAudit`) | Admin device reset audit log; nullable FK `target_user_id`, `admin_user_id` -> `users.id` (`ON DELETE SET NULL`). Migrated to `SessionService` / `AuditLogService`. |
| 8 | `AuditLog.model.ts` | `auditlogs` | `audit_logs` (`AuditLog`) | Immutable system audit log; scalar `actor` (supports `'ANONYMIZED_USER'` or user email/ID) and `[action, created_at]` + `[actor, created_at]` indexes. Migrated to `AuditLogService`. |
| 9 | `Task.model.ts` | `tasks` | `tasks` (`Task`) | Lab task catalogue; unique `task_id` string slug plus primary UUID/string `id`; index `[is_active, level]`. |
| 10 | `Submission.model.ts` | `submissions` + `memorySubmissions` | `submissions` (`Submission`) | Learner submissions + evaluator reviews; FK `learner_id` -> `users.id` (`ON DELETE CASCADE`), optional FK `evaluator_id` -> `users.id` (`ON DELETE SET NULL`); indexes `[status, submitted_at]`, `[learner_id, created_at]`, `[evaluator_id, reviewed_at]`. |
| 11 | `FocusSession.model.ts` | `focussessions` + `inMemoryFocusSessions` | `focus_sessions` (`FocusSession`) | Pomodoro/focus execution records; unique `session_id`; FK `learner_id` -> `users.id` (`ON DELETE CASCADE`); index `[learner_id, status, started_at]`. |
| 12 | `QuestionBank.model.ts` | `questionbanks` + `inMemoryQuestionBank` | `question_bank` (`QuestionBank`) | Curated + AI-generated Clarity questions; unique `question_id`; JSONB for `expected_criteria`, `scoring_rubric`, `ai_metadata`; compound indexes `[topic, level, track, status]`, `content_hash`. |
| 13 | `QuestionAssignment.model.ts` | `questionassignments` + `inMemoryAssignments` | `question_assignments` (`QuestionAssignment`) | Anti-repeat per-learner/institution question lock; unique `assignment_id`; FK `learner_id` -> `users.id` (`ON DELETE CASCADE`) (nullable/relaxed if external learner test IDs are used? No — make `learner_id` indexed scalar string OR optional FK carefully analyzed in Section 4). |
| 14 | `QuestionAttempt.model.ts` | `questionattempts` + `inMemoryAttempts` | `question_attempts` (`QuestionAttempt`) | Immutable scored clarity attempt history; unique `attempt_id`, unique `assignment_id` + indexes `[learner_id, submitted_at]`, `[learner_id, question_id]`. |
| 15 | `InstitutionExclusionConfig.model.ts` | `institutionexclusionconfigs` + `inMemoryExclusionConfig` | `institution_exclusion_configs` (`InstitutionExclusionConfig`) | Singleton config (`config_key = 'GLOBAL_EXCLUSION_POLICY'`). |
| 16 | `ClarityProgressionConfig.model.ts` | `clarityprogressionconfigs` + in-memory singleton | `clarity_progression_configs` (`ClarityProgressionConfig`) | Singleton progression policy (`config_key = 'GLOBAL_PROGRESSION_CONFIG'`). |
| 17 | `LearnerClarityProgression.model.ts` | `learnerclarityprogressions` + `inMemoryLearnerClarityProgressions` | `learner_clarity_progressions` (`LearnerClarityProgression`) | Unique `[learner_id, topic]`; tracks `current_level` (`Easy`/`Medium`/`Hard`), `consecutive_high_scores`, total/best stats. |
| 18 | `aiTool.model.ts` | `aitools` | `ai_tools` (`AiTool`) | Verified AI Tool Catalog; unique string PK `id` (`tool-*`); structured attributes + JSONB arrays/details (`pricing_details`, `learning_track`, `familiarity_guidance`). |
| 19 | `toolEvidence.model.ts` | `toolevidences` | `tool_evidences` (`ToolEvidence`) | Evidence-first verification links; FK `tool_id` -> `ai_tools.id` (`ON DELETE CASCADE`); index `[tool_id, verification_status]`. |
| 20 | `toolVersionHistory.model.ts` | `toolversionhistories` | `tool_version_histories` (`ToolVersionHistory`) | Version/pricing/capability change audit; FK `tool_id` -> `ai_tools.id` (`ON DELETE CASCADE`); index `[tool_id, detected_at]`. |
| 21 | `ToolDiscoveryRun.model.ts` | `tooldiscoveryruns` | `tool_discovery_runs` (`ToolDiscoveryRun`) | Discovery pipeline telemetry runs; `status`, counters, `errors` JSONB, index `[started_at]`. |
| 22 | `userStore.ts` | `registeredUsers` memory map | **ELIMINATED** | All user lookups/mutations go directly through Prisma `users` table. |
| 23 | `aiims.models.ts` | `mockUser`, `mockTransactions` + static seed catalogs (`CREDIT_RULES`, `CLARITY_GAPS`, `AI_RADAR_SIGNALS`, `FOCUS_AREAS`, `CLARITY_TASKS_DATA`, `mockToolCatalog`) | Static seed constants moved to `src/data/aiimsCatalog.ts`; mutable `mockUser` / `mockTransactions` **ELIMINATED**. | Controllers no longer mutate process-local `mockUser`/`mockTransactions` when unauthenticated or DB-disconnected. |

---

## 3. Controllers, Services, Middleware & Routes Inventory

### 3.1 Middleware (`Backend/src/middleware/`)
- `auth.middleware.ts`: Previously resolved JWT user against Mongo `User.findOne` or fell back to `registeredUsers`. Migrated to Prisma `prisma.user.findUnique`, paired with `SessionService` verification (`prisma.session.findUnique`), strictly enforcing single-device binding and session revocation with zero memory fallback.

### 3.2 Controllers (`Backend/src/controllers/`)
1. `auth.controller.ts`: `register`, `login`, `logout`, `getMe`, `getProfile`, `updateProfile`, `setPassword`, `totpSetup`, `totpVerifySetup`, `totpVerifyLogin`, `resetUserDevice`, `deleteAccount`, `getPublicConfig`. Eliminates `registeredUsers`, Mongoose `User`, `StudentProfile`, `Institute`, `Cohort`, `CreditLedger`, `Submission`, `QuestionAssignment`, `QuestionAttempt`, `LearnerClarityProgression`, `FocusSession`, `Session`, `DeviceResetAudit`, `AuditLog` calls in favor of Prisma transactional writes (`$transaction`), `SessionService`, `AuditLogService`, and `creditsLedgerService`. Notice `deleteAccount` preserves anonymized `CreditLedger` and `AuditLog` entries cleanly via nullable `userId` (`ON DELETE SET NULL`) and scalar `actor = 'ANONYMIZED_USER'`. Also note NoSQL-style object payload checks (`typeof inviteToken !== 'string'`, `isValidId(userId)`, `__proto__` guard) remain enforced at the boundary.
2. `credits.controller.ts`: `getCreditCosts`, `getWallet`, `getLedger`, `getBalance`, `reconcileBalance`, `awardLevel`, `investCredits`. Strictly uses authenticated `req.user` + `creditsLedgerService` (no `mockUser` fallback).
3. `assessment.controller.ts`: `getQuestions`, `submitAssessment`, `getPeerBenchmarks`, `getIndividualAnalysis`, `getComparativeAnalysis`, `getOverallAnalysis`. Uses Prisma atomic `updateMany` claim guard (`rewardClaimed` inside `assessmentData` / idempotent ledger key) + `prisma.user` queries for real completed assessments (for benchmarks/comparative stats).
4. `clarity.controller.ts`: `getGaps`, `mentorOverride`, `generatePrompt`, `runTask`, `submitClarityTask`, `getActiveClarityTask`, `serveNextClarityTask`, `getProgressionHandler`, `getProgressionConfigHandler`, `updateProgressionConfigHandler`, `saveTaskScore`, `suggestReflection`. Persists clarity updates directly via `prisma.user.update` + `questionBankService` + `clarityProgressionService`.
5. `investigation.controller.ts`: `getFocusAreas`, `overrideFocus`, `getRadarSignals`, `toggleFollowSignal`, `submitInvestigation`, `generateRelevance`, `getMentorAdvice`. Updates `user.focusData`, `user.radarData`, `user.investigationData`, `user.relevanceData` cleanly in PostgreSQL.
6. `learner.controller.ts`: `getLearnerState`, `updateLearnerState`, `getAcademicTaxonomy`, `getInstitutes`, `requestInstitute`, `getStudentProfile`, `updateStudentProfile`. Syncs state & student profile against `users`, `student_profiles`, `institutes`, `cohorts`; returns both `id` and `_id` on institutes so frontend `RegisterScreen.tsx` works untouched.
7. `aiWallet.controller.ts`: `searchTools`, `matchTools`, `getCatalog`, `getToolById`, `getTaxonomy`, `compareTools`, `getGaps`, `triggerDiscovery`, `getNewTools`, `getRecentlyUpdatedTools`, `getToolEvidence`, `getToolHistory`, `getIntelligenceStatus`, `getDiscoveryStatus`, `getUserWallet`, `getRecommendations`, `addToWallet`, `updateFamiliarity`, `getDiscoveryRuns`, `getToolEvidenceAdmin`, `getToolHistoryAdmin`, `getAdminSources`, `registerAdminSource`, `getAdminCandidates`, `verifyCandidate`, `getAdminDashboard`. Queries `ai_tools`, `tool_evidences`, `tool_version_histories`, `tool_discovery_runs`, and `users` via Prisma & wallet services.
8. `evaluator.controller.ts`: `getEvaluationQueue`, `claimSubmission`, `submitReview`. Replaces Mongo conditional `findOneAndUpdate` with atomic Prisma `updateMany` race guard on claim (`status = 'submitted' AND evaluatorId IS NULL`) and atomic review + XP credit update.
9. `submission.controller.ts`: `submitTask`, `getMySubmissions`, `getSubmissionById`, `resubmitTask`. Replaces `Submission` & `Task` Mongoose calls + `memorySubmissions` fallback cleanly with Prisma.
10. `admin.controller.ts`: `createEvaluator`, `updateEvaluatorStatus`, `listEvaluators`, `listTasks`, `createTask`, `updateTask`, `deleteTask`, `getSummaryReport`, `getAuditLogs`. Replaces all `ObjectId.isValid` casts, `.find()`, `.countDocuments()`, `.deleteOne()`, `AuditLog.create()` with Prisma equivalents + `_id` serializer aliases.
11. `question.controller.ts`: Question serving, attempt submission, admin CRUD, exclusion config, AI question generation. Already delegates cleanly to `questionBankService` (migrated to Prisma).
12. `focus.controller.ts`: Focus session lifecycle (`start`, `pause`, `resume`, `complete`, `break`, `abandon`, `stats`, `history`, `config`). Already delegates cleanly to `FocusSessionService` + `prisma.user` updates.
13. `journey.controller.ts`: Journey overview, history, clarity progress, focus stats, analytics, next best action. Delegates cleanly to `JourneyService` (migrated to Prisma).

### 3.3 Services (`Backend/src/services/`)
- `creditsLedger.service.ts` — Re-implemented using Prisma ACID `$transaction`, atomic conditional `UPDATE users SET aiims_credits = aiims_credits - $amount WHERE id = $userId AND aiims_credits >= $amount RETURNING aiims_credits`, unique `[user_id, idempotency_key]` collision handling (`P2002`), auto-refund compensation, and ledger reconciliation.
- `clarityProgression.service.ts` — Migrated from `ClarityProgressionConfig` & `LearnerClarityProgression` Mongoose models + memory maps to Prisma.
- `focusSession.service.ts` — Migrated from `FocusSession` Mongoose model + `inMemoryFocusSessions` to Prisma.
- `questionBank.service.ts` & `seedQuestions.ts` — Migrated from `QuestionBank`, `QuestionAssignment`, `QuestionAttempt`, `InstitutionExclusionConfig` Mongoose models + memory maps to Prisma.
- `journey.service.ts` — Migrated from `User`, `QuestionAttempt`, `QuestionAssignment`, `LearnerClarityProgression`, `FocusSession`, `CreditLedger` + memory maps to Prisma.
- `databaseIndex.service.ts` — Replaced Mongoose `.syncIndexes()` with Prisma/PostgreSQL schema index & table introspection (`pg_indexes` / `information_schema.tables`).
- `toolCatalog.service.ts`, `toolDiscovery.service.ts`, `toolVerification.service.ts` & `wallet/toolCatalog.service.ts`, `wallet/toolDiscovery.service.ts`, `wallet/toolEvidence.service.ts`, `wallet/toolChangeDetection.service.ts`, `wallet/toolVerification.service.ts`, `wallet/toolIntelligence.service.ts` — Migrated from `AIToolModel`, `ToolEvidenceModel`, `ToolVersionHistoryModel`, `ToolDiscoveryRunModel`, and `mongoose.connection.readyState` checks to Prisma (`prisma.aiTool`, `prisma.toolEvidence`, `prisma.toolVersionHistory`, `prisma.toolDiscoveryRun`). `ToolCatalogService` retains an explicit read-through in-memory cache populated by `syncFromDatabase()` against PostgreSQL so synchronous callers (`ToolMatchingService.searchTools`) continue functioning without API changes.

---

## 4. Critical Relational Design Decisions

1. **String / UUID Primary Keys & Dual `_id` DTO Compatibility:**
   - Primary keys on `users`, `institutes`, `cohorts`, `submissions`, `tasks`, `audit_logs`, etc. use `String @id @default(uuid())` (or stable slug IDs like `tool-chatgpt`, `task-prompt-1`, `qb-check-easy-01`).
   - Preserving 24-character MongoDB ObjectId strings during `migrateMongoToPostgres.ts` imports works seamlessly without synthetic ID remapping.
   - JSON response serializers return both `id` and `_id: id` on entities expected by frontend (`Institute`, `User`, `Submission`, `Task`, `AuditLog`).
2. **Account Deletion Anonymization & Referential Integrity:**
   - `credit_ledger.user_id` is nullable (`ON DELETE SET NULL`). `deleteAccount` nulls `user_id` and wipes `metadata = {}` in the same transaction that purges PII tables (`sessions`, `student_profiles`, `submissions`, `focus_sessions`, `question_assignments`, `question_attempts`, `learner_clarity_progressions`, `users`), preserving immutable accounting totals without violating foreign keys.
   - `audit_logs.actor` is a scalar `String` (indexed) rather than a strict FK to `users`, allowing anonymized markers (`'ANONYMIZED_USER'`) and `'SYSTEM'` events.
   - `question_assignments.learner_id`, `question_attempts.learner_id`, `learner_clarity_progressions.learner_id`, `focus_sessions.learner_id` can either reference `users.id` or store indexed `String`? Notice existing automated scripts and unit tests occasionally call `FocusSessionService`, `QuestionBankService`, `ClarityProgressionService`, and `CreditsLedgerService` directly in isolated tests with synthetic learner IDs or after creating users.
   - Decision: Enforce FKs where full relational integrity is required and lifecycle-managed (`StudentProfile.userId -> User.id`, `StudentProfile.instituteId -> Institute.id`, `StudentProfile.cohortId -> Cohort.id`, `Cohort.instituteId -> Institute.id`, `CreditLedger.userId -> User.id`, `Session.userId -> User.id`, `DeviceResetAudit.*UserId -> User.id`, `Submission.learnerId/evaluatorId -> User.id`, `ToolEvidence.toolId -> AiTool.id`, `ToolVersionHistory.toolId -> AiTool.id`, `QuestionAttempt.assignmentId -> QuestionAssignment.assignmentId`, `QuestionAttempt.questionId -> QuestionBank.questionId`, `QuestionAssignment.questionId -> QuestionBank.questionId`). For `learner_id` on `question_assignments`, `question_attempts`, `focus_sessions`, `learner_clarity_progressions`, relate FK `-> User.id` with `ON DELETE CASCADE` so deleting a learner cascades cleanly at DB level (and update any direct service tests/scripts to ensure the test `User` record exists first or uses valid FKs). Wait: verify whether `Submission.taskId` matches `Task.taskId` vs `Task.id`: keep `Submission.taskId` indexed scalar string (not a hard FK to `Task.id`) because tasks can be hardcoded catalog strings (`task-prompt-1`) as well as admin-created DB rows (`Submission` stores `taskTitle` snapshot).
3. **Strict No-In-Memory-Fallback Production Policy:**
   - Removed all `mongoose.connection.readyState === 1` checks and fallback branches to `registeredUsers`, `memorySubmissions`, `inMemory*` maps, and `mockUser`/`mockTransactions`.
   - `/health` and `/api/health` return `database.mode: 'postgresql'` and `database.connected: boolean` via `SELECT 1`.
   - `/ready` and `/api/ready` return HTTP `200` only when PostgreSQL responds to `SELECT 1`; otherwise HTTP `503`.
4. **Vitest Isolation Strategy:**
   - Refactored backend Vitest unit suites cleanly using a test-only Prisma test double under `Backend/src/services/__tests__/helpers/prismaTestDouble.ts` (excluded from production `tsc` builds and never imported in runtime code).

---

## 5. Non-Backend & Environmental Coupling Audit

| Area | Current Mongo Reference | Action Planned |
| :--- | :--- | :--- |
| `Backend/package.json` | `"mongoose": "^9.10.1"`, `"db:index"` | Remove `mongoose`; add `@prisma/client` & `prisma`; add `db:generate`, `db:migrate`, `db:migrate:deploy`, `db:seed`, `migrate:mongo` scripts |
| `.env.example`, `Backend/.env.example` | `MONGODB_URI=...` | Replace with `DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/aiims?schema=public` |
| `Backend/src/config/env.ts` | Validates `MONGODB_URI` | Validates `DATABASE_URL` (`postgresql://` / `postgres://`), checks absence/empty in production |
| `Backend/Dockerfile` | No Prisma client step | Copy `prisma/`, generate Prisma Client in builder, copy `.prisma` & `prisma/` into runner image |
| `.github/workflows/ci.yml` | `mongo:7.0` container, `MONGODB_URI` | Switch to `postgres:16` service container with `pg_isready`, `DATABASE_URL`, `npx prisma generate && npx prisma migrate deploy` |
| `Frontend/src/screens/wallet/CreditsLedgerSection.tsx:264` | `"atomic MongoDB updates"` | Update copy cleanly to `"atomic PostgreSQL transactions"` |
| `Frontend/src/api/client.ts:262` | Comment `(MongoDB Atlas)` | Update comment to `(PostgreSQL)` |
| `Frontend/src/context/LearnerContext.tsx:512,525,529` | Comments & console warn naming `MongoDB` | Update to `PostgreSQL` |
| `Frontend/src/services/__tests__/assessmentScoring.test.ts` & `Backend/src/scripts/runScoringTests.ts` | Prompt fixture text `'...with MongoDB.'` | **Preserved as test prompt fixture string** (no scoring change) |
| `docs/DEPLOY.md`, `docs/README.md` | References `MONGODB_URI` / MongoDB | Update deployment & index runbooks for PostgreSQL + Prisma |
| Historical T-A to T-G reports (`docs/T*_*.md`, `docs/AIIMS_*_ARCHITECTURE.md`) | Historical audit records | Preserved untouched as historical records |

