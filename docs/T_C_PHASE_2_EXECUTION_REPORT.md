# AIIMS — T-C Phase 2: Controlled Live AI Scoring Execution Report

**Execution Date:** 2026-11-08
**Target Environment:** Isolated Test Environment (`aiims_test` on MongoDB Atlas)
**Primary Live AI Model:** Google Gemini (`gemini-3.1-flash-lite`)
**Baseline Git Commit:** `43db712`

---

## 1. Authorization Record

| Field | Record / Value |
| :--- | :--- |
| **Approver** | Divya |
| **Role** | Product Owner |
| **Date** | 2026-11-08 |
| **Scope** | Phase 2 controlled live run under decisions A, B, C |
| **Exact Statement** | *"I authorize T-C Phase 2 controlled live run under decisions A, B, C."* |
| **Evidence Source** | Explicit written authorization in ChatGPT conversation (2026-11-08) |
| **Audit Document** | `docs/T_C_PHASE_2_AUTHORIZATION_RECORD.md` |
| **Owner Decision 13 Status** | **APPROVED** (Fast $\le 300\text{s} \to 20\text{ AC}$, Standard $\le 600\text{s} \to 12\text{ AC}$, Extended $> 600\text{s} \to 6\text{ AC}$) |

---

## 2. Preflight Status & Environment

- **Git Branch:** `main`
- **Git HEAD:** `43db7129773d52bddc8902a0d268e6fc2adbd846` (`43db712`)
- **Working Tree State:** All uncommitted baseline changes (`.gitignore`, `docs/E2E_RESULTS.md`, `docs/T3_OWNER_DECISION_RECORD.md`, `Backend/src/scripts/verifyT3LearnerJourney.ts`, `scripts/export_clean_source.ps1`) preserved without alteration.
- **Database Isolation:** Connected strictly to `aiims_test` on MongoDB Atlas cluster. Confirmed zero interaction with production databases or real learner profiles.
- **Secrets & Credentials Safety:** No `.env` credentials, API keys, or JWT tokens exposed in logs, code, or terminal output.

---

## 3. Technical Configuration & Provider Architecture

- **Primary Provider:** Google Gemini API (`@google/generative-ai` SDK).
- **Primary Model ID:** `gemini-3.1-flash-lite`.
- **Secondary Provider (Claude):** Strictly **DISABLED** in controlled mode (`ClaudeService.setControlledMode({ primaryModel: 'gemini-3.1-flash-lite', disableFallbacks: true })`).
- **Model Fallbacks:** Strictly **DISABLED** (no loop iteration across candidate fallback models).
- **Model Retries (Attempt 2):** Strictly **DISABLED** (`RubricEvaluatorService.setDisableRetries(true)`).
- **Call Budget:** Hard ceiling of **2 outbound provider requests**.

---

## 4. Hard Request Limiter Implementation & Verification

Implemented `ProviderRequestLimiter` in `Backend/src/services/providerRequestLimiter.ts`:
- Enforces pre-network attempt registration (increments and validates budget before any HTTP socket connection).
- Hard blocks 3rd outbound call before network transmission, throwing `BudgetExceededError`.
- Captures millisecond latencies, timestamps, provider IDs, and error statuses.

### Limiter Unit Tests (`npm run test:limiter` via `Backend/src/scripts/testProviderRequestLimiter.ts`)
```
PASS Unit Test 1: Registers attempt before network call
PASS Unit Test 2: Records latency and success status
PASS Unit Test 3: Allows 2nd request within budget
PASS Unit Test 4: Blocks 3rd request before outbound execution (BudgetExceededError)
PASS Unit Test 5: Does not increment request counter on blocked attempts
PASS Unit Test 6: Audit log accurately reflects exactly 2 requests
---
Result: 6 / 6 PASSED (Exit Code: 0)
```

---

## 5. Live Outbound Provider Calls (Metrics & Audit Log)

Executed via `Backend/src/scripts/verifyLiveAIScoring.ts` with network access outside the sandbox:

| Request # | Target Activity | Outbound Model | Latency | Status | Criteria Evaluated | Zod Schema Validation |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Request 1** | Clarity Open-Ended Prompt | `gemini-3.1-flash-lite` | **7,510 ms** | 200 OK | 4 / 4 | **VALID** |
| **Request 2** | Focus Challenge (`qb-check-easy-01`) | `gemini-3.1-flash-lite` | **2,205 ms** | 200 OK | 2 / 2 | **VALID** |
| **Request 3** | Boundary Verification | `gemini-3.1-flash-lite` | **0 ms** | **BLOCKED** | *N/A (Pre-network)* | Intercepted |

**Total Live Outbound Provider Calls Made:** **2** (Hard limit: 2).

---

## 6. Clarity Task Live Scoring Verification

- **Task Type:** Clarity Open-Ended Prompt Engineering Diagnostic.
- **Rubric Structure (4 Criteria):**
  1. *Role & Objective Definition:* 25 / 25
  2. *Constraints & Performance Limits:* 25 / 25
  3. *Edge-Case Handling:* 25 / 25
  4. *Deterministic Verification:* 25 / 25
- **Composite Score:** **100 / 100**
- **Reward Credit Award:** **+15 AC**
- **Idempotency Key:** `clarity::submit::asgn-clarity-live-1773163820251`
- **Duplicate Submission Test:** Re-submitting the same assignment returned **HTTP 409 Conflict** (`Assignment is already SUBMITTED`).
- **Provider Invocations on Duplicate:** **0** (Verified via limiter audit log).

---

## 7. Focus Challenge Live Scoring Verification (Decision 13)

- **Challenge Identifier:** `qb-check-easy-01`
- **Rubric Structure (2 Criteria):**
  1. *Threshold Clarity:* 50 / 50
  2. *Verdict Alignment:* 50 / 50
- **Composite Score:** **100 / 100**
- **Authoritative Timing:**
  - Started: `2026-11-08T17:30:20.000Z`
  - Completed: `2026-11-08T17:32:21.000Z`
  - Elapsed Time: **121 seconds**
- **Owner Decision 13 Tier Applied:**
  - Tier: **Fast** ($\le 300\text{ seconds}$)
  - Reward Credit Award: **+20 AC**
- **Idempotency Key:** `focus::challenge::asgn-focus-live-1773163820251`
- **Duplicate Submission Test:** Re-submitting the completed focus challenge returned **HTTP 409 Conflict** (`TASK_LOCKED`).
- **Provider Invocations on Duplicate:** **0** (Verified via limiter audit log).

---

## 8. Idempotency & Duplicate Submission Hardening

- **State Machine Guard:** Assignments cannot transition from `SUBMITTED` or `COMPLETED` back into evaluation. Duplicate requests reject before provider dispatch.
- **Credit Ledger Uniqueness:** Unique compound index `(userId, idempotencyKey)` prevents duplicate ledger entries and balance increments under concurrent access.

---

## 9. Credit Ledger & Dual-Ledger Balance Reconciliation

| Milestone | Action / Idempotency Key | Balance Delta | Wallet Balance | Ledger Synchronized |
| :--- | :--- | :---: | :---: | :---: |
| **Genesis** | Synthetic test user created | Seed | **500 AC** | Yes |
| **Step 1: Clarity** | `clarity::submit::asgn-clarity-live-1773163820251` | +15 AC | **515 AC** | Yes |
| **Step 2: Focus** | `focus::challenge::asgn-focus-live-1773163820251` | +20 AC (Fast) | **535 AC** | Yes |
| **Duplicate Clarity** | Duplicate submission rejected (HTTP 409) | +0 AC | **535 AC** | Preserved |
| **Duplicate Focus** | Duplicate submission rejected (HTTP 409) | +0 AC | **535 AC** | Preserved |

- Direct comparison between `User.aiimsCredits` and cumulative `CreditLedger` verified 100% balance consistency.

---

## 10. Synthetic Data Teardown & Database State Audit

Automated teardown executed on `aiims_test`:
- `User.deleteMany({ email: /tc_phase2_learner_/ })` $\to$ **1 deleted**
- `Assignment.deleteMany({ userId: testUserId })` $\to$ **2 deleted**
- `Attempt.deleteMany({ userId: testUserId })` $\to$ **2 deleted**
- `CreditLedger.deleteMany({ userId: testUserId })` $\to$ **2 deleted**

**Teardown Verification Audit:**
- Remaining synthetic users: **0**
- Remaining synthetic assignments: **0**
- Remaining synthetic attempts: **0**
- Remaining synthetic ledger records: **0**
- MongoDB connection closed cleanly.

---

## 11. Verification Summary

| Test / Check Suite | Target / Command | Result |
| :--- | :--- | :---: |
| Hard Limiter Unit Tests | `npm run test:limiter` | **6 / 6 PASS** (Exit Code 0) |
| Offline Rubric Tests | `npm run test:rubric` | **15 / 15 PASS** (Exit Code 0) |
| Live AI Scoring Verification | `npm run test:live-ai` | **14 / 14 PASS** (Exit Code 0) |
| TypeScript Compilation | `npm run typecheck` | **0 Errors** (Exit Code 0) |
| Git Working Tree Status | `git status --short` | **0 Baseline Drift** |

