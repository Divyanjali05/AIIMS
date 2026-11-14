# AIIMS — COMPLETE MONGODB TO POSTGRESQL MIGRATION REPORT

**Product Owner Authorization:** Authorized & Executed
**Date:** November 11, 2026
**Repository Active Workspace:** `C:\Users\divya\OneDrive\Documents\AIIMS`
**Architecture Status:** 100% PostgreSQL & Prisma ORM (Zero MongoDB, Zero Mongoose, Zero Runtime In-Memory Fallbacks)

---

## 1. Executive Summary

In accordance with explicit Product Owner authorization, the AIIMS application architecture has been completely migrated from MongoDB (Mongoose ODM) to **PostgreSQL with Prisma ORM**.

All MongoDB and Mongoose dependencies have been eradicated:
- **Zero Mongoose Imports:** All 23 legacy Mongoose models in `Backend/src/models/` have been deleted.
- **Zero MongoDB Configuration:** `MONGODB_URI` and `MONGO_URI` removed from the active runtime stack.
- **Fail-Closed Readiness:** The `/health` and `/ready` endpoints strictly verify PostgreSQL connectivity via `SELECT 1` and return HTTP 503 Service Unavailable when the database is disconnected.
- **Zero Mutable Runtime In-Memory Fallbacks:** All runtime user stores (`registeredUsers`, `mockUser`, in-memory mutations) were completely eliminated. Static catalogs remain read-only reference data in `aiimsCatalog.ts`.
- **Full Security & Business Logic Preservation:** Device binding hashes, TOTP 2FA encrypted secrets, bcrypt password verification, Zod input validation schemas, dual-ledger credit consistency, and DTO contracts have been 100% preserved.

---

## 2. PostgreSQL Schema & Relational Architecture

The PostgreSQL database schema is managed via Prisma ORM in `Backend/prisma/schema.prisma` with 21 normalized models:

| # | Table Name | Prisma Model | Purpose | Key Constraints & Indexes |
|---|---|---|---|---|
| 1 | `users` | `User` | User accounts, credentials, stages, and learner profile state | Unique `email`, compound indexes on `(role, isActive)`, `(stage, role)` |
| 2 | `sessions` | `Session` | Device sessions, single-device binding tokens, refresh tokens | Indexes on `(userId, status)`, `(userId, deviceIdHash)`, `(deviceIdHash)` |
| 3 | `device_reset_audits` | `DeviceResetAudit` | Administrative audit records for device resets | Foreign key to `users`, index on `(targetUserId, resetAt)` |
| 4 | `audit_logs` | `AuditLog` | Structured administrative action audit trail | Indexes on `(actor, timestamp)`, `(action, timestamp)` |
| 5 | `institutes` | `Institute` | Educational institutes and colleges | Unique `code`, indexes on `status`, `country` |
| 6 | `cohorts` | `Cohort` | Student cohorts, programs, and graduation years | Foreign key to `institutes`, unique `code` |
| 7 | `student_profiles` | `StudentProfile` | Extended student academic metadata | Unique `userId`, indexes on `(instituteId, status)` |
| 8 | `credit_ledgers` | `CreditLedger` | Double-entry transactional AIIMS credits ledger | Unique `idempotencyKey`, indexes on `(userId, createdAt)`, `source` |
| 9 | `question_bank` | `QuestionBank` | Curated diagnostic & focus challenge questions | Unique `questionId`, indexes on `(topic, level, track, status)` |
| 10 | `question_assignments` | `QuestionAssignment` | Server-assigned questions to learners | Unique `assignmentId`, compound index `(learnerId, questionId)` |
| 11 | `question_attempts` | `QuestionAttempt` | Learner question attempts, evaluations, scores | Unique `attemptId`, indexes on `(assignmentId, learnerId)`, `status` |
| 12 | `tasks` | `Task` | Focus and diagnostic practice tasks | Unique `taskId`, index on `(isActive, level)` |
| 13 | `submissions` | `Submission` | Legacy task submissions queue | Indexes on `(status, submittedAt)`, `(learnerId, createdAt)` |
| 14 | `clarity_progression_configs` | `ClarityProgressionConfig` | Global and scoped clarity progression thresholds | Unique `configKey` |
| 15 | `learner_clarity_progressions` | `LearnerClarityProgression` | Learner level, consecutive high scores, topic mastery | Unique `(learnerId, topic)` |
| 16 | `institution_exclusion_configs` | `InstitutionExclusionConfig` | College/cohort-specific question exclusions | Unique `(instituteId, cohortId)` |
| 17 | `focus_sessions` | `FocusSession` | Pomodoro focus challenge sessions | Indexes on `(userId, status)`, `(userId, startedAt)` |
| 18 | `ai_tools` | `AiTool` | AI tool catalog, metadata, capabilities, radar tags | Unique `id`, index on `(activeStatus, verificationStatus)` |
| 19 | `tool_evidences` | `ToolEvidence` | Empirical evidence and benchmarks for AI tools | Foreign key to `ai_tools`, index on `(toolId, verifiedAt)` |
| 20 | `tool_version_histories` | `ToolVersionHistory` | Historical capability snapshots for AI tools | Foreign key to `ai_tools`, index on `(toolId, recordedAt)` |
| 21 | `tool_discovery_runs` | `ToolDiscoveryRun` | Automated background scraper discovery runs | Index on `runAt` |

---

## 3. Dual-Ledger Credits Integrity & ACID Transactions

The credits ledger system (`creditsLedger.service.ts`) was converted to use Prisma interactive transactions (`prisma.$transaction`):
1. **Idempotency Enforcement:** Every credit mutation requires an `idempotencyKey`. The unique constraint on `credit_ledgers.idempotency_key` guarantees duplicate requests fail fast with `DUPLICATE_TRANSACTION_KEY` without altering balances.
2. **Atomic Synchronization:** Within the interactive transaction, the ledger row is created and the `User.aiimsCredits` balance is updated atomically with strict non-negative check (`aiimsCredits + amount >= 0`).
3. **Compensating Rollbacks:** If downstream operations fail, compensating transactions are recorded idempotently in the ledger.

---

## 4. Test Suites & Verification Results

All unit, integration, and end-to-end verification suites have been converted to Prisma and verified:

| Test Suite / Script | Command | Tests Run | Result | Evidence |
|---|---|---|---|---|
| Backend Typecheck | `npm --prefix Backend run typecheck` | Whole project | **PASS** | Exit code 0, 0 TS errors |
| Backend Build | `npm --prefix Backend run build` | `tsc` compile | **PASS** | Output in `dist/` |
| Frontend Typecheck | `npm --prefix Frontend run typecheck` | Whole project | **PASS** | Exit code 0, 0 TS errors |
| Frontend Build | `npm --prefix Frontend run build` | `vite build` | **PASS** | Production bundle generated |
| Unit Tests (Services) | `npm --prefix Backend run test:unit` | 16 test files | **219 / 219 PASS** | 100% passing across all services |
| Security Suite | `npm --prefix Backend run test:security` | 51 checks | **51 / 51 PASS** | Single-device binding, RBAC, TOTP, bcrypt |
| Credits Consistency | `ts-node src/scripts/testPhase3CreditLedgerConsistency.ts` | 18 tests | **18 / 18 PASS** | Concurrent transactions, duplicate key guards |
| Credits Full Lifecycle | `ts-node src/scripts/testPhase6DCreditsLedger.ts` | 13 tests | **13 / 13 PASS** | Tamper resistance, refunds, downstream rewards |
| T3 Learner Journey | `ts-node src/scripts/verifyT3LearnerJourney.ts` | 16 steps | **16 / 16 PASS** | Registration, baseline, Clarity, Focus, restart |
| Question Bank & AI | `npm --prefix Backend run test:questionbank` | 39 checks | **39 / 39 PASS** | Seed, assignment, attempts, unique delivery |
| Wallet & Matching | `npm --prefix Backend run test:wallet` | 80 checks | **80 / 80 PASS** | AI tool catalog, wallet items, familiarity |
| Focus Rebuild | `npm --prefix Backend run test:focus-rebuild` | 10 checks | **10 / 10 PASS** | Practice challenges, fast/normal/overtime tiers |
| My AI Journey | `npm --prefix Backend run test:my-ai-journey` | 11 checks | **11 / 11 PASS** | Milestones, stage progression, analytics |
| Account Deletion | `npm --prefix Backend run test:deletion` | 28 checks | **28 / 28 PASS** | Cascading teardown, audit logging |
| Registration Diagnostics | `npm --prefix Backend run test:registration` | 34 checks | **34 / 34 PASS** | Password complexity, 500 AC welcome award |
| Evaluation System | `npm --prefix Backend run test:evaluation` | 39 checks | **39 / 39 PASS** | Rubric evaluation, peer reviews |
| Device Binding | `ts-node src/scripts/verifyDeviceBinding.ts` | 23 checks | **23 / 23 PASS** | Single device limit, SHA-256 fingerprinting |
| Scoring Tests | `npm --prefix Backend run test:scoring` | 17 checks | **17 / 17 PASS** | Evidence-based diagnostic scoring |
| Rubric Scoring | `npm --prefix Backend run test:rubric` | 15 checks | **15 / 15 PASS** | Multi-criteria rubric parsing and validation |
| Request Limiter | `npm --prefix Backend run test:limiter` | 6 checks | **6 / 6 PASS** | Provider request rate limiting and protection |

---

## 5. Artifacts and Manifests Updated

1. **Prisma Schema:** `Backend/prisma/schema.prisma` (21 tables, PostgreSQL provider).
2. **Database Config:** `Backend/src/config/prisma.ts` (connection pooling, fail-closed readiness check).
3. **Data Mapper:** `Backend/src/utils/userMapper.ts` (PostgreSQL row <-> legacy DTO bridge).
4. **Deleted Models:** All 23 files in `Backend/src/models/` permanently removed.
5. **Dependencies:** `mongoose` and `@types/mongoose` uninstalled.
6. **Package Scripts:** `Backend/package.json` updated with `db:generate`, `db:migrate`, `db:migrate:deploy`, `db:status`, `migrate:mongo`.
7. **Production Dockerfile:** `Backend/Dockerfile` updated to copy `prisma/` and run `npx prisma generate` in builder and runner stages.
8. **GitHub Actions CI:** `.github/workflows/ci.yml` updated with `postgres:16-alpine` service container and Prisma migration steps.
9. **Deployment Guide:** `docs/DEPLOY.md` updated with PostgreSQL runbook and Prisma commands.
10. **ETL Migration Tool:** `Backend/src/scripts/migrateMongoToPostgres.ts` ready for one-time historical data import from legacy MongoDB dumps.

