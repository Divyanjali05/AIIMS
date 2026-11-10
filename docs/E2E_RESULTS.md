# AIIMS Task T3 — End-to-End Learner Journey Verification Results

**Date:** 2026-11-07  
**Status:** **FULL PASS (16 Passed, 0 Failed, 0 Blocked)**  
**Target Database:** `aiims_test` (Persistent MongoDB Atlas Cluster)  
**Cluster Topology:** `ReplicaSetWithPrimary` (Full Multi-Document ACID Transaction Capability)  
**Authority Reference:** [`docs/T3_OWNER_DECISION_RECORD.md`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/docs/T3_OWNER_DECISION_RECORD.md) & [`docs/OWNER_DECISION_REGISTER.md`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/docs/OWNER_DECISION_REGISTER.md) (Decision 13)

---

## 1. Executive Summary

Task T3 verifies the complete AIIMS learner lifecycle executed against a live, persistent MongoDB test database (`aiims_test`). The verification covers:
- Learner registration and persistence in the `users` collection.
- 25-question baseline diagnostic assessment and idempotent +50 AC / +100 XP award.
- Clarity task progression, server-authoritative rubric evaluation, and +15 AC award.
- Clarity submission lock and reload persistence (HTTP 409).
- Focus Challenge serving under difficulty-based rules and personal history exclusion.
- Server-authoritative timing calculations (`submittedAt - assignedAt`).
- Fast reward (≤ 5 min): +20 AC; Normal reward (≤ 10 min): +15 AC; Overtime (> 10 min): 0 AC with genuine rubric score retention.
- Focus submission lock guard (HTTP 409 `TASK_LOCKED`).
- Cross-module isolation (Clarity vs Focus).
- Strict dual-entry credit ledger reconciliation (`CreditLedger` documents strictly match `User.aiimsCredits`).
- Direct MongoDB schema constraints: Compound unique indexes (`{ userId: 1, idempotencyKey: 1 }` and `{ learnerId: 1, questionId: 1 }`) enforcing E11000 duplicate rejections.
- Process restart recovery: Simulated restart clearing all in-memory state confirms assignment lock status and user balances are retrieved directly from MongoDB.

All 16 automated verification steps executed and passed completely against the live MongoDB Atlas database. Zero in-memory substitutions were used for database acceptance.

---

## 2. 16-Step Learner Journey Verification Matrix (Persistent MongoDB)

| Step | Scope & Requirement | Expected Behavior | Actual Result | Status |
|:---:|:---|:---|:---|:---:|
| **1** | Database Connectivity & Safety Guard | Connect to persistent MongoDB test database (`aiims_test`); verify indexes | Connected to `aiims_test` on MongoDB Atlas (Topology: `ReplicaSetWithPrimary`); 19/19 model indexes synchronized; Production safety guard enforced. | **PASS** |
| **2** | Question Bank Seed Process | Baseline human-curated questions initialized in MongoDB | Seeded 12 verified baseline questions into persistent MongoDB across Checking AI, AI Workflow Design, Autonomous Agents, and Coding tracks. | **PASS** |
| **3** | Learner Registration Flow | Student registration with taxonomy validation saved to MongoDB | HTTP 201; persisted initial balance: 500 AC; role: Student; Academic taxonomy verified; MongoDB User document confirmed. | **PASS** |
| **4** | Baseline Diagnostic Assessment | 25 diagnostic questions submitted, scored, and awarded | HTTP 200; earned: +50 AC / +100 XP; stage transitioned to `Understanding`; persisted balance: 550 AC. | **PASS** |
| **5** | Baseline Resubmission Idempotency | Re-attempting baseline assessment | HTTP 200; duplicate AC awarded: 0; `alreadyClaimed: true`; balance preserved in MongoDB at 550 AC. | **PASS** |
| **6** | Clarity Task Rubric Evaluation | Level 1 task scored by genuine AI rubric with persistence | HTTP 200; score: 92%; reward: +15 AC / +50 XP; persisted balance in MongoDB: 565 AC. | **PASS** |
| **7** | Clarity Submission Lock Guard | Re-submission of completed Clarity assignment | HTTP 409; `code: TASK_LOCKED`; resubmission rejected; lock preserved in MongoDB. | **PASS** |
| **8** | Focus Challenge Serving (Easy) | Dynamic assignment of unserved question in MongoDB | HTTP 200; generated/assigned unserved question; status: `ASSIGNED`; persisted in `questionassignments`. | **PASS** |
| **9** | Focus Fast Timing Reward ($\le 5$ min) | Server duration $\le 300$s | HTTP 200; tier: `FAST`; reward: +20 AC / +50 XP; persisted balance: 585 AC. | **PASS** |
| **10** | Focus Normal Timing Reward ($\le 10$ min) | Server duration $301$s–$600$s | HTTP 200; tier: `NORMAL`; reward: +15 AC / +50 XP; persisted balance: 600 AC. | **PASS** |
| **11** | Focus Over-time & Score Retention ($> 10$ min) | Server duration $> 600$s | HTTP 200; tier: `OVERTIME`; reward: 0 AC; score preserved at 90%; persisted balance: 600 AC. | **PASS** |
| **12** | Focus Submission Lock Guard | Re-attempting submitted Focus challenge | HTTP 409; `code: TASK_LOCKED`; re-attempt rejected; balance unchanged. | **PASS** |
| **13** | Unrepeated Question Delivery Guard | Personal history exclusion across consecutive serves | 3 consecutive assignments delivered 3 unique questions; personal history exclusion enforced in MongoDB. | **PASS** |
| **14** | Module & Assignment Isolation | Cross-module assignment ID submitted to Focus endpoint | HTTP 404; foreign/cross-module assignment cannot be submitted to Focus endpoint. | **PASS** |
| **15** | End-to-End Credit Ledger Reconciliation | Dual-entry audit of all learner credit movements | Calculated ledger balance: 600 AC; Persisted User balance: 600 AC; Expected: 600 AC; Zero drift detected. | **PASS** |
| **16** | MongoDB Persistence, Indexes & Restart Recovery | Compound unique indexes, attempt persistence, and restart recovery | E11000 Idempotency Index: **ENFORCED**; E11000 Assignment Index: **ENFORCED**; Attempts Persisted: 4; Restart State Recovery: **VERIFIED**; Post-Restart Lock Rejection: **VERIFIED (HTTP 409)**. | **PASS** |

---

## 3. Persistent Database Architecture & Safety Controls

1. **Dedicated Test Database Isolation:**
   - The test harness strictly operates against database `aiims_test` via `mongoose.connect(rawUri, { dbName: 'aiims_test' })`.
   - An explicit safety guard checks `mongoose.connection.db.databaseName`. If the database name does not contain `test` or end with `_test`, execution aborts immediately to protect production data.
2. **Cluster Topology & Transactions:**
   - Active topology: `ReplicaSetWithPrimary`.
   - `creditsLedgerService` utilizes multi-document ACID transactions (`session.startTransaction()`) across `User` and `CreditLedger` collections, ensuring atomic ledger updates.
3. **Compound Unique Index Enforcement:**
   - `CreditLedgerSchema.index({ userId: 1, idempotencyKey: 1 }, { unique: true })` prevents duplicate ledger postings at the database engine level (E11000 error).
   - `QuestionAssignmentSchema.index({ learnerId: 1, questionId: 1 }, { unique: true })` prevents duplicate question assignments to the same learner at the database engine level.
4. **Server-Authoritative Timing:**
   - Elapsed duration is computed authoritatively on the server as `Math.floor((submittedAt.getTime() - assignedAt.getTime()) / 1000)`. Client-provided `timeTakenSeconds` is ignored for rewards.
5. **Simulated Process Restart Recovery:**
   - After clearing all in-memory caching structures (`inMemoryAssignments.clear()`, `inMemoryAttempts.clear()`), queries directly hit MongoDB to verify that completed assignments remain locked (`status === 'SUBMITTED'`) and user balances (600 AC) are accurately retrieved.
6. **Strict Test Isolation & Targeted Cleanup:**
   - Test user accounts use the pattern `t3-e2e-<timestamp>@aiims.test`.
   - In teardown, only records matching the test identity (`testEmail`, `learnerId`, and `/^t3-e2e-.*@aiims\.test$/`) are deleted. Unrelated user data is never touched.

---

## 4. Verification Commands & Exit Codes

| Command | Working Directory | Scope | Exit Code | Result |
|:---|:---|:---|:---:|:---:|
| `npm run test:t3` | `Backend/` | Task T3 16-Step Persistent MongoDB Journey Suite | `0` | **PASS (16 Passed, 0 Failed, 0 Blocked)** |
| `npm run typecheck` | `Backend/` | TypeScript static typing (`tsc --noEmit`) | `0` | **PASS (0 errors)** |
| `npm run build` | `Backend/` | Backend build (`npm run clean && tsc`) | `0` | **PASS** |
| `npm run test:rubric` | `Backend/` | Genuine AI Rubric Scoring 15-Test Suite | `0` | **PASS (15/15 passed)** |
| `npm run test:questionbank` | `Backend/` | Question Bank & AI Generation 39-Test Suite | `0` | **PASS (39/39 passed)** |
| `npm run test:scoring` | `Backend/` | Assessment Diagnostic Scoring 17-Test Suite | `0` | **PASS (17/17 passed)** |
| `npm run typecheck` | `Frontend/` | Frontend static typing (`tsc --noEmit`) | `0` | **PASS (0 errors)** |
| `npm run build` | `Frontend/` | Frontend production bundle (`tsc && vite build`) | `0` | **PASS** |
