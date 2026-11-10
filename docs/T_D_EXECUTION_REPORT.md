# AIIMS — T-D: Backend Process Restart Verification Report

**Execution Date:** 2026-11-09
**Execution Posture:** Option B (Deterministic Evaluation Runner for Synthetic Test Learner, 0 Live API Calls)
**Target Environment:** Isolated Test Database (`aiims_test` on MongoDB Atlas)
**Baseline Git Commit:** `43db712`
**Overall Status:** **COMPLETED** (13 / 13 Verification Steps Passed)

---

## 1. Task T-D Status
**Status:** **COMPLETED**
All 13 acceptance verification steps passed with **Exit Code: 0**. Learner state, assignment statuses, scores, credit balances, and dual-ledger transactions survived a complete operating-system backend process shutdown and restart. Duplicate submission attempts were rejected with **HTTP 409 TASK_LOCKED** post-restart.

---

## 2. Preflight Results
- **Git Branch:** `main`
- **Git HEAD:** `43db7129773d52bddc8902a0d268e6fc2adbd846` (`43db712`)
- **T-C Acceptance Confirmation:** Confirmed reviewed and accepted by Product Owner.
- **Working Tree State:** All uncommitted baseline changes (`.gitignore`, `docs/E2E_RESULTS.md`, `docs/T3_OWNER_DECISION_RECORD.md`, `Backend/src/scripts/verifyT3LearnerJourney.ts`, `scripts/export_clean_source.ps1`) preserved.
- **Target Database:** Strictly persistent MongoDB Atlas (`aiims_test`).
- **Production Safety:** Real learner accounts and production databases completely inaccessible.
- **Synthetic Test Identity:**
  - Email: `td_restart_learner_1794197807714@aiims.test`
  - MongoDB User ID: `6af14930c8124999cf268418`
  - Initial Balance: **500 AC**

---

## 3. First Process Startup Evidence
- **Process ID (PID 1):** `48904`
- **Port:** `5055`
- **Startup Duration:** `17,836 ms`
- **Startup Output:** `AIIMS Backend API running on port 5055 (0.0.0.0); Database Mode: MongoDB Atlas (Connected)`
- **Health Verification:** `GET http://127.0.0.1:5055/health` returned `HTTP 200 OK`.
- **Learner Authentication:** `POST http://127.0.0.1:5055/api/auth/login` returned `HTTP 200 OK` and issued JWT token.

---

## 4. Pre-Restart Activities & Submissions (Process 1)
1. **Clarity Task Submission:**
   - Active Task: `POST /api/clarity/active-task` $\to$ Assignment ID: `asgn-clarity-1794197807714`
   - Submission: `POST /api/clarity/submit` $\to$ HTTP 200 OK
   - Score: **92%**
   - Reward: **+15 AC**
   - Intermediate Balance: **515 AC**
2. **Focus Challenge Submission:**
   - Challenge Served: `POST /api/questions/serve` $\to$ Question ID: `qb-check-easy-01`, Assignment ID: `asgn-focus-1794197807714`
   - Submission: `POST /api/questions/submit` $\to$ HTTP 200 OK
   - Timing Tier: **FAST** ($\le 300\text{s}$)
   - Reward: **+20 AC** (Owner Decision 13)
   - Final Persisted Balance: **535 AC**

---

## 5. First Process Hard Termination Evidence
- **Kill Action:** `taskkill /PID 48904 /T /F` executed.
- **Process Exit Verification:** `tasklist /FI "PID eq 48904"` returned `INFO: No tasks are running which match the specified criteria.`
- **Network Port Verification:** Outbound HTTP connection to `http://127.0.0.1:5055/health` immediately threw `ECONNREFUSED`.
- **Database Resilience:** MongoDB connection to `aiims_test` remained continuously open and healthy.

---

## 6. Second Process Startup Evidence
- **New Process ID (PID 2):** `4816`
- **PID Differentiation:** `4816 !== 48904` (Confirmed brand-new OS process).
- **Port:** `5055`
- **Startup Duration:** `19,421 ms`
- **Health Verification:** `GET http://127.0.0.1:5055/health` returned `HTTP 200 OK`.
- **Learner Re-Authentication:** `POST http://127.0.0.1:5055/api/auth/login` returned `HTTP 200 OK` on PID 2 with stable device binding (`td_device_1794197807714`).

---

## 7. State Parity & Database Snapshot Comparison

| Data Field / Record | Pre-Restart Snapshot (Process 1: PID 48904) | Post-Restart Snapshot (Process 2: PID 4816) | Parity Status |
| :--- | :--- | :--- | :---: |
| **User ID** | `6af14930c8124999cf268418` | `6af14930c8124999cf268418` | **100% MATCH** |
| **Learner AC Balance** | **535 AC** | **535 AC** | **100% MATCH** |
| **Clarity Assignment** | Status: `SUBMITTED` | Status: `SUBMITTED` | **100% MATCH** |
| **Focus Assignment** | Status: `SUBMITTED` | Status: `SUBMITTED` | **100% MATCH** |
| **Attempts Recorded** | Exactly 2 Attempts | Exactly 2 Attempts | **100% MATCH** |
| **Attempt Scores** | Clarity: 92%, Focus: 90% | Clarity: 92%, Focus: 90% | **100% MATCH** |
| **Credit Ledger Entries** | Exactly 2 Entries (+15 AC, +20 AC) | Exactly 2 Entries (+15 AC, +20 AC) | **100% MATCH** |

---

## 8. Duplicate Submission Protection (HTTP 409 Locks)
Post-restart duplicate attacks were issued against Process 2:
- **Duplicate Clarity Submission:**
  - `POST /api/clarity/submit` with `asgn-clarity-1794197807714`
  - Response: **HTTP 409 Conflict** (`code: 'TASK_LOCKED'`, `isLocked: true`)
- **Duplicate Focus Submission:**
  - `POST /api/questions/submit` with `asgn-focus-1794197807714`
  - Response: **HTTP 409 Conflict** (`code: 'TASK_LOCKED'`)
- **Balance Impact:** Persisted balance remained strictly at **535 AC** (zero duplicate AC awarded).

---

## 9. Question Repetition Prevention & Stream Isolation
- **Question Repetition Test:** `POST /api/questions/serve` requested a new Easy challenge.
  - Server-generated new assignment `asgn-1794197850518-dvn780f` distinct from previous assignment.
- **Cross-Stream Isolation:** Attempting to submit a Clarity assignment ID to the Focus question endpoint was rejected with **HTTP 409 Conflict**.

---

## 10. Automated Teardown & Post-Cleanup Database Audit
Executed in a `finally` block:
- `User.deleteMany({ _id: testUserId })` $\to$ **Deleted**
- `QuestionAssignment.deleteMany({ learnerId: testUserId })` $\to$ **Deleted**
- `QuestionAttempt.deleteMany({ learnerId: testUserId })` $\to$ **Deleted**
- `CreditLedger.deleteMany({ userId: testUserId })` $\to$ **Deleted**

**Post-Cleanup Audit Counts in `aiims_test`:**
- Remaining synthetic users: **0**
- Remaining synthetic assignments: **0**
- Remaining synthetic attempts: **0**
- Remaining synthetic ledger rows: **0**
- MongoDB connection closed cleanly.

---

## 11. Verification Commands & Exit Codes

| Check / Test Command | Target / Scope | Result / Exit Code | Description |
| :--- | :--- | :---: | :--- |
| `npm run typecheck` | `Backend/` | **Exit Code: 0** | TypeScript strict compilation validation |
| `npm run test:restart` | `Backend/` | **Exit Code: 0** (13/13 Pass) | Full OS process restart, state parity & lock verification |
| `git status --short` | Root | **Exit Code: 0** | Verified zero uncommitted baseline drift |

---

## 12. Files Modified & Inspected
- [`Backend/src/server.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/server.ts): Added gated support for `process.env.MONGODB_TEST_DB` and `process.env.ENABLE_TEST_DETERMINISTIC_RUNNER === 'true'`.
- [`Backend/package.json`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/package.json): Registered script `"test:restart": "ts-node src/scripts/verifyProcessRestart.ts"`.
- [`Backend/src/scripts/verifyProcessRestart.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/scripts/verifyProcessRestart.ts): Created automated 13-step OS process lifecycle verification suite.
- [`docs/T_D_EXECUTION_REPORT.md`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/docs/T_D_EXECUTION_REPORT.md): Created official execution report.

---

## 13. Remaining Technical Issues
- **None.** T-D is 100% complete with 0 outstanding defects or warnings.

