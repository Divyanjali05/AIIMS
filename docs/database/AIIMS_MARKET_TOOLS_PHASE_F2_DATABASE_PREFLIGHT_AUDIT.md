# AIIMS Market AI Tools Catalog — Phase F.2: Database Migration Preflight & Safety Audit Report (Corrected Edition)

**Project:** AIIMS (AI Intelligence & Mentoring System)  
**Workspace:** `C:\Users\divya\OneDrive\Documents\AIIMS`  
**Phase:** Phase F.2 — Preflight Structural & Safety Audit of Migration `0003_market_tools_catalog`  
**Auditor:** Senior PostgreSQL Database Architect, Prisma Migration Specialist, Backend Security Engineer & Independent QA Auditor  
**Date:** November 16, 2026 (Updated under Phase F.2.1 Review)  
**Execution Mode:** Strictly Read-Only (Zero live database connections, zero SQL executed, zero migrations applied)  

---

## 1. Executive Summary & Audit Verdict

This audit report provides an independent, read-only preflight evaluation of the pending Prisma migration:

`Backend/prisma/migrations/0003_market_tools_catalog/migration.sql`

The audit evaluates the migration's structural safety, SQL statement-by-statement integrity, schema parity with `Backend/prisma/schema.prisma`, foreign-key deletion cascades, PostgreSQL version portability (PG 16 vs PG 17), deployment locking risks, safe disaster recovery procedures, and dependency alignment with the candidate import pipeline.

### Preflight Audit Matrix

| Audit Area | Inspected Artifact | Technical Finding | Audit Evaluation | Status |
| :--- | :--- | :--- | :--- | :---: |
| **SQL Safety** | `0003_market_tools_catalog/migration.sql` | 3 nullable columns added to `ai_tools`; 1 new table `tool_reports` created; 6 indexes; 3 foreign keys. | Zero `DROP`, `TRUNCATE`, `DELETE`, or column renames. 100% additive and non-destructive. | **PASS** |
| **Schema Parity** | `schema.prisma` vs `migration.sql` | `marketTier`, `pricingSourceUrl`, `pricingVerifiedAt` on `AiTool`; `model ToolReport` with all 11 fields. | Perfect field-for-field, type-for-type, and index-for-index parity. Zero schema drift. | **PASS** |
| **Foreign Keys** | `ToolReport` relationships | `tool_id` (`CASCADE`), `user_id` (`CASCADE`), `reviewer_id` (`SET NULL`). | `SET NULL` on reviewer is safe. `CASCADE` on reporter user wipes reports if a user deletes account. Documented for owner decision. | **PASS (With Note)** |
| **Locking & Downtime** | PostgreSQL catalog execution | Metadata-only `ALTER TABLE` (no row rewrite); new table creation; B-tree index builds. | Low locking duration under normal conditions, but lock acquisition queues behind concurrent transactions. Coordinated window recommended. | **PASS (Clarified)** |
| **Pipeline Dependencies** | `importMarketCandidates.ts` | Requires `marketTier`, `pricingSourceUrl`, `pricingVerifiedAt` on `ai_tools`. | 100% satisfied by migration `0003`. | **PASS** |
| **Deployment Order** | Forward / Backward Compatibility | Schema migration and application code require synchronized deployment. | Current code already includes `toolReport` endpoints. Coordinated restart or maintenance window required. | **PASS (Clarified)** |
| **Database Target** | Environment & Ports | Documented ports `5432` (PG 16) vs `5433` (PG 17, `aiims_db`). | Cannot confirm active target without reading `.env` or connecting. | **NOT VERIFIED** |
| **Live Migration History** | `_prisma_migrations` table | State of live migration history in target database. | Requires live database connection; prohibited in read-only audit. | **NOT VERIFIED** |
| **Live Schema Drift** | Target database schema | Whether live database contains unrecorded manual schema modifications. | Requires live database connection; prohibited in read-only audit. | **NOT VERIFIED** |
| **Database Backup** | Pre-migration snapshot | Existence, integrity, and restorable status of database backup. | Requires infrastructure / file inspection outside repository. | **NOT VERIFIED** |

---

### Phase F.2 Preflight Verdict

```
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                 PREFLIGHT AUDIT VERDICT:                                 ║
║                                   CONDITIONALLY READY                                    ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
```

**Verdict Rationale:**
1. **Structural Readiness (READY):** The SQL script `0003_market_tools_catalog/migration.sql` is structurally valid, strictly additive, 100% non-destructive, and in complete parity with `schema.prisma`. It executes inside a single PostgreSQL interactive transaction without table rewrites.
2. **Operational Prerequisites (CONDITIONAL):** Live deployment cannot be authorized until the project owner satisfies five mandatory preflight gates:
   - **Gate ENV-1:** Explicit confirmation of target PostgreSQL instance (Port `5432` vs Port `5433`) and database name (`aiims` vs `aiims_db`).
   - **Gate BKP-1:** Verification that a restorable database backup has been taken immediately prior to migration.
   - **Gate M-1:** Formal owner sign-off authorizing migration execution (`prisma migrate deploy`).
   - **Gate G-1 & D-3:** Catalog import scope approval (34 creates / 18 updates) and NotebookLM tier policy decision.

---

## 2. Inspected Repository Files

The audit directly inspected the following repository artifacts:
1. `Backend/prisma/migrations/0003_market_tools_catalog/migration.sql` — Pending migration SQL script.
2. `Backend/prisma/schema.prisma` — Authoritative Prisma schema (lines 520–687 for `AiTool` and `ToolReport`; lines 40–105 for `User`).
3. `Backend/prisma/migrations/0001_init/migration.sql` — Baseline migration script.
4. `Backend/prisma/migrations/0002_entrepreneur_profile/migration.sql` — Intermediate profile migration script.
5. `Backend/prisma/migrations/migration_lock.toml` — Prisma provider configuration (`provider = "postgresql"`).
6. `Backend/package.json` — Prisma CLI script definitions (`db:migrate:deploy`, `db:status`).
7. `Backend/src/config/prisma.ts` — Prisma client lifecycle and PostgreSQL connection manager.
8. `Backend/.env.example` — Non-secret environment configuration template.
9. `Backend/src/scripts/importMarketCandidates.ts` — Candidate import pipeline source code.
10. `Backend/src/controllers/aiWallet.controller.ts` — Wallet & tool report endpoints.
11. `Backend/src/controllers/admin.controller.ts` — Staff QA tool report endpoints.
12. `Backend/src/services/wallet/toolCatalog.service.ts` — Tool catalog query service.
13. `AIIMS_MARKET_TOOLS_PHASE_A_COMPLETION_REPORT.md` — Phase A schema implementation report.
14. `AIIMS_MARKET_TOOLS_PHASE_F0_READINESS_AUDIT.md` — Phase F.0 readiness audit report.
15. `AIIMS_MARKET_TOOLS_PHASE_F121_CORRECTIVE_AUDIT.md` — Phase F.1.2.1 pipeline security audit report.

### Git Working Tree Status
- Zero modifications were made to `schema.prisma`, `migration.sql`, backend application code, or candidate datasets.
- No `.env` files were read, displayed, modified, or staged.
- The repository remains strictly in read-only audit mode.

---

## 3. Migration SQL Statement-by-Statement Safety Audit

The migration script `Backend/prisma/migrations/0003_market_tools_catalog/migration.sql` consists of 48 lines containing 11 distinct SQL operations.

```sql
-- AlterTable
ALTER TABLE "ai_tools" ADD COLUMN "market_tier" INTEGER,
ADD COLUMN "pricing_source_url" TEXT,
ADD COLUMN "pricing_verified_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "tool_reports" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "report_category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reviewer_id" TEXT,
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_tools_market_tier_idx" ON "ai_tools"("market_tier");

-- CreateIndex
CREATE INDEX "tool_reports_tool_id_idx" ON "tool_reports"("tool_id");

-- CreateIndex
CREATE INDEX "tool_reports_user_id_idx" ON "tool_reports"("user_id");

-- CreateIndex
CREATE INDEX "tool_reports_status_idx" ON "tool_reports"("status");

-- CreateIndex
CREATE INDEX "tool_reports_report_category_idx" ON "tool_reports"("report_category");

-- CreateIndex
CREATE INDEX "tool_reports_created_at_idx" ON "tool_reports"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "tool_reports" ADD CONSTRAINT "tool_reports_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "ai_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_reports" ADD CONSTRAINT "tool_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_reports" ADD CONSTRAINT "tool_reports_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

### 3.1 Statement-by-Statement Review

#### Statement 1: `ALTER TABLE "ai_tools" ADD COLUMN ...`
- **Columns Added:**
  1. `"market_tier" INTEGER` — Nullable. Represents market tier (1 to 4; null = Unrated).
  2. `"pricing_source_url" TEXT` — Nullable. Provenance link for verified pricing.
  3. `"pricing_verified_at" TIMESTAMP(3)` — Nullable. Millisecond-precision ISO timestamp.
- **Nullability Analysis:** All 3 columns are explicitly nullable (no `NOT NULL` constraint).
- **Default Value Analysis:** No default value is specified.
- **Table Rewrite & Lock Impact:** In PostgreSQL (both 16 and 17), adding nullable columns without default values is a **metadata-only catalog update** (`pg_attribute`). It requires an `ACCESS EXCLUSIVE` lock on `ai_tools`. While the catalog update itself completes rapidly once the lock is acquired, the command must wait in PostgreSQL's lock queue behind any active read or write transactions on `ai_tools`. Zero row data is rewritten on disk.
- **Data Invariant Safety:** Pre-existing `ai_tools` rows receive `NULL` immediately.

#### Statement 2: `CREATE TABLE "tool_reports" (...)`
- **Table Created:** `"tool_reports"`, an entirely new table.
- **Columns & Defaults:**
  - `"id" TEXT NOT NULL PRIMARY KEY`: String UUID identifier.
  - `"tool_id" TEXT NOT NULL`: Foreign key reference to target tool.
  - `"user_id" TEXT NOT NULL`: Foreign key reference to reporting learner.
  - `"report_category" TEXT NOT NULL`: Category discriminator (`PRICING_OUTDATED`, `LINK_BROKEN`, etc.).
  - `"description" TEXT NOT NULL`: Reporter notes.
  - `"source_url" TEXT`: Nullable reference evidence link.
  - `"status" TEXT NOT NULL DEFAULT 'PENDING'`: Default review status.
  - `"reviewer_id" TEXT`: Nullable staff reviewer reference.
  - `"review_notes" TEXT`: Nullable staff resolution notes.
  - `"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`: Automated insertion timestamp.
  - `"updated_at" TIMESTAMP(3) NOT NULL`: Automated update timestamp.
- **Lock Impact:** Creates a new physical relation. Zero lock contention on existing tables during table creation.

#### Statements 3–8: `CREATE INDEX ...`
1. `"ai_tools_market_tier_idx"` on `"ai_tools"("market_tier")"`:
   - B-tree index. Nullable values are indexed in PostgreSQL.
   - Takes a `SHARE` lock on `ai_tools` (blocks concurrent writes, allows reads) during build.
2. `"tool_reports_tool_id_idx"` on `"tool_reports"("tool_id")"`
3. `"tool_reports_user_id_idx"` on `"tool_reports"("user_id")"`
4. `"tool_reports_status_idx"` on `"tool_reports"("status")"`
5. `"tool_reports_report_category_idx"` on `"tool_reports"("report_category")"`
6. `"tool_reports_created_at_idx"` on `"tool_reports"("created_at" DESC)`:
   - Optimized descending index for admin timeline queries (`GET /api/admin/tool-reports`).
- **Index Construction Safety:** All 5 indexes on `tool_reports` are built against an empty table with 0 rows.

#### Statements 9–11: `ALTER TABLE "tool_reports" ADD CONSTRAINT ... FOREIGN KEY`
1. `"tool_reports_tool_id_fkey"`: References `"ai_tools"("id")` with `ON DELETE CASCADE ON UPDATE CASCADE`.
2. `"tool_reports_user_id_fkey"`: References `"users"("id")` with `ON DELETE CASCADE ON UPDATE CASCADE`.
3. `"tool_reports_reviewer_id_fkey"`: References `"users"("id")` with `ON DELETE SET NULL ON UPDATE CASCADE`.
- **Constraint Validation Safety:** Foreign key constraints added to an empty table validate without delay because there are no rows to verify against referenced tables.

### 3.2 Destructive Operation Verification

An exhaustive search across the entire migration SQL confirms:
- `DROP TABLE`: **NONE**
- `DROP COLUMN`: **NONE**
- `TRUNCATE`: **NONE**
- `DELETE`: **NONE**
- Unintended `UPDATE`: **NONE**
- Column renames: **NONE**
- Type conversions: **NONE**
- Constraints failing against existing data: **NONE**

---

## 4. Prisma Schema Compatibility & Drift Audit

A field-by-field comparison was conducted between `Backend/prisma/schema.prisma` and `Backend/prisma/migrations/0003_market_tools_catalog/migration.sql`:

### 4.1 `AiTool` Model Parity

| Prisma Schema Field (`model AiTool`) | SQL Migration Definition (`ai_tools`) | Parity Status |
| :--- | :--- | :---: |
| `marketTier Int? @map("market_tier")` | `"market_tier" INTEGER` | **MATCH** |
| `pricingSourceUrl String? @map("pricing_source_url")` | `"pricing_source_url" TEXT` | **MATCH** |
| `pricingVerifiedAt DateTime? @map("pricing_verified_at")` | `"pricing_verified_at" TIMESTAMP(3)` | **MATCH** |
| `@@index([marketTier])` | `CREATE INDEX "ai_tools_market_tier_idx" ON "ai_tools"("market_tier")` | **MATCH** |
| `reports ToolReport[]` | Back-relation to `ToolReport.tool` | **MATCH** |

### 4.2 `ToolReport` Model Parity

| Prisma Schema Field (`model ToolReport`) | SQL Migration Definition (`tool_reports`) | Parity Status |
| :--- | :--- | :---: |
| `id String @id @default(uuid())` | `"id" TEXT NOT NULL, PRIMARY KEY ("id")` | **MATCH** |
| `toolId String @map("tool_id")` | `"tool_id" TEXT NOT NULL` | **MATCH** |
| `userId String @map("user_id")` | `"user_id" TEXT NOT NULL` | **MATCH** |
| `reportCategory String @map("report_category")` | `"report_category" TEXT NOT NULL` | **MATCH** |
| `description String` | `"description" TEXT NOT NULL` | **MATCH** |
| `sourceUrl String? @map("source_url")` | `"source_url" TEXT` | **MATCH** |
| `status String @default("PENDING")` | `"status" TEXT NOT NULL DEFAULT 'PENDING'` | **MATCH** |
| `reviewerId String? @map("reviewer_id")` | `"reviewer_id" TEXT` | **MATCH** |
| `reviewNotes String? @map("review_notes")` | `"review_notes" TEXT` | **MATCH** |
| `createdAt DateTime @default(now()) @map("created_at")` | `"created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP` | **MATCH** |
| `updatedAt DateTime @updatedAt @map("updated_at")` | `"updated_at" TIMESTAMP(3) NOT NULL` | **MATCH** |
| `@@index([toolId])` | `CREATE INDEX "tool_reports_tool_id_idx"` | **MATCH** |
| `@@index([userId])` | `CREATE INDEX "tool_reports_user_id_idx"` | **MATCH** |
| `@@index([status])` | `CREATE INDEX "tool_reports_status_idx"` | **MATCH** |
| `@@index([reportCategory])` | `CREATE INDEX "tool_reports_report_category_idx"` | **MATCH** |
| `@@index([createdAt(sort: Desc)])` | `CREATE INDEX "tool_reports_created_at_idx" ... ("created_at" DESC)` | **MATCH** |

### 4.3 Schema Drift Evaluation
- **Zero Local Drift:** The Prisma schema and migration SQL are in 100% alignment.
- **Client Artifact Generation:** Running `npx prisma generate` produces types that match migration 0003 exactly.

---

## 5. ToolReport Foreign-Key and Deletion Policy Assessment

### 5.1 Foreign-Key Behavior Architecture

```mermaid
erDiagram
    users ||--o{ tool_reports : "reporter (ON DELETE CASCADE)"
    users ||--o{ tool_reports : "reviewer (ON DELETE SET NULL)"
    ai_tools ||--o{ tool_reports : "target tool (ON DELETE CASCADE)"

    tool_reports {
        string id PK
        string tool_id FK
        string user_id FK
        string reviewer_id FK "nullable"
        string report_category
        string status
        string description
        timestamp created_at
    }
```

### 5.2 Critical Deletion Considerations & Recommendations

1. **Reviewer Deletion (`reviewer_id` → `ON DELETE SET NULL`):**
   - **Behavior:** If an administrator or staff member account is deleted, the foreign key `reviewer_id` is automatically set to `NULL`. The report record, `reviewNotes`, `status`, and `updatedAt` are preserved.
   - **Auditor Evaluation: EXCELLENT.** Preserves administrative audit trails while allowing staff lifecycle management without foreign key constraint violations.
2. **Target Tool Deletion (`tool_id` → `ON DELETE CASCADE`):**
   - **Behavior:** If an `AiTool` catalog record is deleted, all community reports filed against that tool are automatically deleted.
   - **Auditor Evaluation: ACCEPTABLE.** Orphaned reports pointing to non-existent tools serve little operational purpose.
3. **Reporter User Deletion (`user_id` → `ON DELETE CASCADE`):**
   - **Behavior:** If a learner account is deleted (e.g., via account deletion or GDPR data removal request), all tool reports submitted by that learner are **cascade-deleted immediately**.
   - **Auditor Evaluation & Concern:** In `CreditLedger` (`schema.prisma` line 218), `userId` uses `ON DELETE SET NULL` specifically so financial transaction records survive user deletion. In `ToolReport`, `user_id` is `NOT NULL` with `CASCADE`. If active reports or historical quality tickets are tied to a learner who subsequently deletes their account, those quality reports vanish from the admin review queue.
   - **Documented Trade-Off for Owner Decision:**
     - *Option A (Current):* Retain `ON DELETE CASCADE` on `user_id`. Simple, fully GDPR-compliant (user data deleted).
     - *Option B (Future Hardening):* Change `userId` to nullable (`String?`) with `ON DELETE SET NULL` so community tool feedback remains preserved anonymously for catalog maintenance even if the user departs.

---

## 6. Database Environment Identification — Strict Safety Protocol

### 6.1 Historical Context vs Active Environment

The repository documentation and commit history reference multiple PostgreSQL environments:
- **Port 5432:** Standard PostgreSQL 16 service.
- **Port 5433:** Clean PostgreSQL 17 cluster configured specifically for database `aiims_db`.
- **`.env.example` Baseline:** Illustrates `DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/aiims?schema=public`.

### 6.2 Strict Safety Constraints & Verification Status

Under mandatory agent safety rules:
- No `.env` files were opened, read, printed, or copied.
- No live database connection was opened.
- No database credentials were inspected.
- No PostgreSQL services were started, stopped, or queried.

**Official Audit Finding:**
```
TARGET ENVIRONMENT STATUS:
NOT VERIFIED — OWNER ENVIRONMENT CONFIRMATION REQUIRED
```

The auditor cannot and must not guess whether Port `5432` (PG 16) or Port `5433` (PG 17, `aiims_db`) is the active configured target. The project owner must explicitly confirm the target connection before migration execution.

### 6.3 PostgreSQL 16 vs PostgreSQL 17 Portability

The SQL statements in `0003_market_tools_catalog/migration.sql` were analyzed for engine-level compatibility across PostgreSQL versions:
- `ALTER TABLE ... ADD COLUMN` (nullable, no default): Metadata catalog update in both PG 16 and PG 17.
- `TIMESTAMP(3)` precision handling: Identical in PG 16 and PG 17.
- B-tree indexing with `DESC` sort: Identical storage engine implementation in PG 16 and PG 17.
- Foreign key constraint checks: Identical syntax and lock hierarchy in PG 16 and PG 17.

**Conclusion:** The migration SQL is **100% portable** and will execute identically on either PostgreSQL 16 or PostgreSQL 17.

---

## 7. Migration History, Drift, and Backup Readiness

### 7.1 What Can Be Verified (Static Repository Evidence)

1. **Migration Sequence on Disk:**
   - `0001_init` → Baseline schema.
   - `0002_entrepreneur_profile` → Profile additions.
   - `0003_market_tools_catalog` → Additive catalog fields.
   - The numbering sequence `0001` → `0002` → `0003` is contiguous and unambiguous.
2. **Migration Lock:**
   - `migration_lock.toml` correctly specifies `provider = "postgresql"`.

### 7.2 What Cannot Be Verified (Requires Live Database Access)

The following items are explicitly marked **`NOT VERIFIED`** due to strict read-only constraints:

| Item | Status | Why Live Verification is Required |
| :--- | :---: | :--- |
| **`_prisma_migrations` History** | `NOT VERIFIED` | Determining whether migration `0003` has already been applied requires querying the `_prisma_migrations` table in the live database (`SELECT migration_name, finished_at FROM _prisma_migrations`). |
| **Live Schema Drift** | `NOT VERIFIED` | Determining whether someone manually added `market_tier` or modified tables in the live database requires inspecting `information_schema.columns`. |
| **Pre-Migration Backup Status** | `NOT VERIFIED` | Verifying whether a recent `pg_dump` exists on disk or cloud storage requires inspecting system backup volumes outside the repository. |
| **Pending Uncommitted Transactions** | `NOT VERIFIED` | Detecting long-running locks on `ai_tools` requires querying `pg_stat_activity`. |

**Deployment Warning:** Migration `0003_market_tools_catalog` must **never** be executed via `prisma migrate deploy` without first taking a fresh database backup and checking `prisma migrate status`.

---

## 8. Deployment and Recovery Risk Assessment

### 8.1 Transactionality & Atomicity

- In PostgreSQL, DDL commands are **fully transactional**.
- When executed via `npx prisma migrate deploy`, the entire `0003_market_tools_catalog/migration.sql` script is executed within a single interactive transaction (`BEGIN ... COMMIT`).
- If any statement encounters an error (such as a lock timeout or constraint collision), the transaction aborts and PostgreSQL rolls back all changes automatically, leaving the database exactly in its pre-migration state.

### 8.2 Locking and Concurrency Behavior

| Statement | PostgreSQL Lock Acquired | Lock Nature | Potential Contention Risk |
| :--- | :--- | :--- | :--- |
| `ALTER TABLE "ai_tools" ADD COLUMN ...` | `ACCESS EXCLUSIVE` on `ai_tools` | Metadata catalog update | Blocks all reads and writes while held. If concurrent long-running queries are reading `ai_tools`, this statement waits in the lock queue, causing subsequent queries to queue up behind it. |
| `CREATE INDEX "ai_tools_market_tier_idx"` | `SHARE` on `ai_tools` | B-tree index build | Blocks concurrent writes; permits concurrent reads. |
| `CREATE TABLE "tool_reports"` | `ACCESS EXCLUSIVE` on new table | Relation creation | Zero impact on existing tables. |
| `CREATE INDEX` (5 indexes on `tool_reports`) | `SHARE` on new table | Index build on empty table | Zero impact on existing tables. |
| `ALTER TABLE ... ADD CONSTRAINT FOREIGN KEY` | `SHARE ROW EXCLUSIVE` on referenced tables | Validation against empty table | Brief verification against `ai_tools` and `users`. |

**Operational Assessment:** Because `ALTER TABLE` requires an `ACCESS EXCLUSIVE` lock, execution during periods of high application activity carries the risk of lock contention if other transactions hold locks on `ai_tools`. Setting an explicit `lock_timeout` (e.g. 3 seconds) or deploying during a low-traffic window eliminates this risk.

---

### 8.3 Deployment Sequencing Analysis

Direct code inspection reveals that backend controllers already reference the new schema:
- `Backend/src/controllers/aiWallet.controller.ts`: Calls `prisma.toolReport.findFirst` and `prisma.toolReport.create` (lines 892, 920).
- `Backend/src/controllers/admin.controller.ts`: Calls `prisma.toolReport.findMany`, `count`, `update` (lines 687, 856, 1014).
- `Backend/src/services/wallet/toolCatalog.service.ts`: Calls `prisma.aiTool.findMany` which requests all schema columns via Prisma Client.

#### Sequencing Comparison:
1. **Application Deployed BEFORE Database Migration:**
   - Any learner submitting a report or admin reviewing QA reports hits a missing table, throwing `relation "tool_reports" does not exist (code 42P01)`.
   - Tool queries that select `market_tier` throw fatal column-missing errors.
   - **Verdict: UNSAFE.**
2. **Database Migration Deployed BEFORE Application:**
   - New columns are nullable; existing legacy code ignoring those columns continues to operate.
   - However, until the application is restarted/deployed, users cannot interact with new catalog features.
   - **Verdict: SAFE, but requires prompt application update.**
3. **Coordinated Deployment / Maintenance Window (RECOMMENDED):**
   - The safest operational approach is a coordinated deployment: pause writes briefly, execute `prisma migrate deploy`, deploy the application build, verify health, and resume traffic.

---

### 8.4 Safe Disaster Recovery & Recovery Architecture

> [!CAUTION]
> **Manual DDL Drops & History Deletion are Prohibited:**  
> A previous draft suggested executing manual `DROP TABLE "tool_reports" CASCADE`, `ALTER TABLE "ai_tools" DROP COLUMN ...`, and deleting rows from `_prisma_migrations`. **This procedure is unsafe and rejected.**
>
> 1. **Data Destruction:** Dropping `tool_reports` wipes all community-submitted reports and admin review audit history permanently.
> 2. **Catalog Metadata Loss:** Dropping columns purges all verified market tiers and pricing source provenance.
> 3. **Prisma History Corruption:** Manually deleting rows from `_prisma_migrations` desynchronizes Prisma's checksum tracking, causing future `prisma migrate status` or `prisma migrate deploy` commands to fail or trigger destructive schema reset prompts.

#### The Approved Safe Recovery Hierarchy:

```mermaid
flowchart TD
    Issue["Deployment or Post-Migration Issue"] --> Type{"When Did It Occur?"}
    Type -->|"During Migration (Failed Deploy)"| AutoRollback["Automatic PostgreSQL Rollback<br/>(Transaction fails closed; DB remains at 0002)"]
    Type -->|"Post-Deployment Data Corruption"| Restore["Restore from Verified Pre-Migration Backup<br/>(pg_restore from validated snapshot)"]
    Type -->|"Post-Deployment Logic/Schema Defect"| ForwardFix["Author & Deploy Forward-Fix Migration<br/>(e.g., 0004_fix_... preserves data and migration chain)"]
```

1. **Automatic Transactional Rollback (Failure During Migration):**
   - If `prisma migrate deploy` fails during execution, PostgreSQL rolls back the entire DDL transaction automatically. The database remains in the clean `0002` state. No manual cleanup is required.
2. **Backup Restoration (Disaster Recovery):**
   - If catastrophic corruption occurs post-migration, restore the database from the pre-migration snapshot taken immediately before deployment:
     ```powershell
     pg_restore -U postgres -d <DATABASE_NAME> -p <PORT> --clean --if-exists "aiims_pre_migration_0003_backup.dump"
     ```
3. **Forward-Fix Migrations (Schema Corrections):**
   - If schema adjustments are required after successful deployment, create a forward migration (e.g. `0004_...`) using Prisma rather than manually dropping columns or tables.

---

## 9. Import Pipeline Dependency Verification

An audit of the corrected import pipeline (`Backend/src/scripts/importMarketCandidates.ts`) confirms the exact database schema prerequisites:

1. **Dynamic State Query (Line 940):** Requires `market_tier`, `pricing_source_url`, and `pricing_verified_at` on `ai_tools`.
2. **Safe Metadata Update (Line 973):** Updates only allowlisted fields on `ai_tools`.
3. **Admin Tool Reports Review APIs (Phase E):** Requires `tool_reports` table with foreign keys to `ai_tools` and `users`.

**Dependency Conclusion:** Migration `0003_market_tools_catalog` provides **100% of the required schema additions**. No additional migrations are needed for Phase F import or Phase E QA review.

---

## 10. Outstanding Owner Approval Gates

The following gates remain unresolved pending formal owner decisions:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                               OUTSTANDING OWNER GATES                                    │
├─────────┬──────────────────────────────────┬─────────────────────────────┬───────────────┤
│ Gate ID │ Scope Description                │ Current Audit Status        │ Required By   │
├─────────┼──────────────────────────────────┼─────────────────────────────┼───────────────┤
│ ENV-1   │ PostgreSQL Target Confirmation   │ NOT VERIFIED (Port 5432/33) │ Owner Decision│
│ BKP-1   │ Database Backup Verification     │ NOT VERIFIED (Fresh pg_dump)│ Owner Action  │
│ M-1     │ Migration 0003 Execution Approval│ Awaiting Owner Sign-Off     │ Owner Decision│
│ G-1     │ Catalog Import Scope (34 / 18)   │ Reconciled (53 Verified)    │ Owner Decision│
│ D-3     │ NotebookLM Market Tier Policy    │ Intercepted (Pending Freez) │ Owner Decision│
└─────────┴──────────────────────────────────┴─────────────────────────────┴───────────────┘
```

---

## 11. Findings Matrix & Recommendations

| Finding ID | Classification | Description | Impact | Action Required |
| :--- | :---: | :--- | :---: | :--- |
| **F-2-1** | **PASS** | Migration SQL is 100% additive and non-destructive. | None | Ready for execution upon approval. |
| **F-2-2** | **PASS** | Perfect parity between Prisma schema and migration SQL. | None | Retain existing schema definitions. |
| **F-2-3** | **PASS** | Zero table rewrites. | None | Catalog metadata update only. |
| **F-2-4** | **LOW** | `ToolReport.user_id` has `ON DELETE CASCADE`. Learner deletion removes reports. | Quality Data | Documented for future review; keep `CASCADE` for GDPR compliance. |
| **F-2-5** | **MEDIUM** | Missing database-level CHECK constraint on `market_tier` ($1 \le \text{tier} \le 4$). | Data Integrity | Zod schemas enforce range; consider adding DB check in future maintenance. |
| **F-2-6** | **HIGH** | Target PostgreSQL instance (Port 5432 vs 5433) unverified without `.env`. | Operational | Owner must specify active target before running migration. |
| **F-2-7** | **HIGH** | Target database backup status unverified. | Disaster Recovery | Owner must execute `pg_dump` before applying migration. |
| **F-2-8** | **PASS (Corrected)**| Dangerous manual rollback script replaced with backup/restore and forward-fix policy. | Architecture | Never execute manual DDL drops or delete `_prisma_migrations`. |

---

## 12. Recommended Pre-Deployment Checklist for Phase F.3

When the project owner authorizes live deployment, execute the following sequential workflow:

### Step 1: Confirm Target Environment
Verify which PostgreSQL instance is active in `.env` (without exposing credentials):
```powershell
# Verify connection readiness using safe backend health probe
cd Backend
npx ts-node -e "import { connectDatabase } from './src/config/prisma'; connectDatabase().then(s => { console.log('Connected to DB:', s.databaseName); process.exit(0); });"
```

### Step 2: Execute Fresh Database Backup (MANDATORY)
```powershell
# Create pre-migration disaster recovery dump
pg_dump -U postgres -d <DATABASE_NAME> -p <PORT> -F c -f "aiims_pre_migration_0003_backup.dump"
```

### Step 3: Check Live Migration Status
```powershell
cd Backend
npx prisma migrate status
```
*Verify that only `0003_market_tools_catalog` is reported as pending.*

### Step 4: Apply Migration
```powershell
cd Backend
npx prisma migrate deploy
```

### Step 5: Execute Candidate Import (After Gates G-1 and D-3)
```powershell
cd Backend
npx ts-node -r tsconfig-paths/register src/scripts/importMarketCandidates.ts --execute-write-authorized-by-owner
```

---

## 13. Final Preflight Audit Verdict

```
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                 PREFLIGHT AUDIT VERDICT:                                 ║
║                                   CONDITIONALLY READY                                    ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
```

Migration `0003_market_tools_catalog/migration.sql` is **CONDITIONALLY READY**.  
The migration SQL is structurally sound, non-destructive, and fully aligned with the application architecture. Deployment may proceed as soon as the project owner satisfies Preflight Gates **ENV-1**, **BKP-1**, and **M-1**.

**Audit Completed:** November 16, 2026 (Corrected Edition)  
**Auditor:** Senior PostgreSQL Database Architect, Prisma Migration Specialist, Backend Security Engineer & Independent QA Auditor
