# AIIMS — Baseline Test Execution Results

**Execution Date:** November 2, 2026
**Environment:** Windows (PowerShell), Node.js v20+, npm 10+, Standard Sandbox Isolation
**Document Status:** Complete Empirical Test Baseline

---

## 1. Executive Summary Table

| Test Suite / Command | Execution Command | Result | Tests Passed / Total | Exit Code | Root Cause / Status |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Backend Typecheck** | `npm --prefix Backend run typecheck` | **PASS** | Strict TypeScript check | **0** | Clean, zero compiler errors. |
| **Frontend Typecheck** | `npm --prefix Frontend run typecheck` | **PASS** | Strict TypeScript check | **0** | Clean, zero compiler errors. |
| **Backend Build** | `npm --prefix Backend run build` | **FAIL** | 0 / 1 | **1** | Windows cross-platform incompatibility: `clean` script uses Unix `rm -rf dist`. (Note: `tsc` directly passes). |
| **Frontend Build** | `npm --prefix Frontend run build` | **PASS** | 2163 modules bundled | **0** | Clean Vite production build in 17.16s. |
| **Backend Lint** | `npm --prefix Backend run lint` | **PASS** | 0 errors | **0** | 305 warnings (primarily `@typescript-eslint/no-explicit-any`). |
| **Frontend Lint** | `npm --prefix Frontend run lint` | **PASS** | 0 errors | **0** | 78 warnings (primarily `@typescript-eslint/no-explicit-any`). |
| **Backend Scoring Suite** | `npm --prefix Backend run test:scoring` | **PASS** | 17 / 17 | **0** | Evidence scoring, rubrics, and confidence algorithms all pass. |
| **Backend Entitlements** | `npm --prefix Backend run test:entitlements` | **PASS** | 58 / 58 | **0** | Journey gates, Level 1–4 lock logic, and access rules pass. |
| **Frontend Unit & Service**| `npm --prefix Frontend run test` | **PASS** | 130 / 130 | **0** | 5 test suites (Scoring, Gates, Tokens, WCAG AA, Evaluator UI) pass. |
| **Frontend Vitest Suite** | `npx vitest run Frontend` | **PASS** | 134 / 134 | **0** | 6 test files pass cleanly across all unit specifications. |
| **Backend Vitest Suite** | `npm --prefix Backend run test:unit` | **PARTIAL**| 95 / 122 (7/9 files) | **1** | 95 in-memory tests pass. 27 tests (`health.test.ts`, `security.test.ts`) failed due to `connect EACCES 127.0.0.1` loopback isolation. |
| **Backend Security Suite** | `npm --prefix Backend run test:security` | **BLOCKED**| 5 / 36 | **1** | Suite 1 passes. Suite 2 blocks on `connect EACCES 127.0.0.1:50489` (ephemeral server loopback socket). |
| **Backend Evaluation Suite**| `npm --prefix Backend run test:evaluation` | **BLOCKED**| 0 / 24 | **1** | Blocks on `connect EACCES 127.0.0.1:55396` (ephemeral server loopback socket). |
| **Account Deletion Suite**| `npm --prefix Backend run test:deletion` | **BLOCKED**| 0 / 14 | **1** | Blocks on `connect EACCES 127.0.0.1:50227` (ephemeral server loopback socket). |
| **Credits End-to-End** | `npx ts-node src/scripts/verifyCreditsSystem.ts` | **BLOCKED**| 0 / 10 | **1** | MongoDB Atlas remote DNS timeout (`querySrv ETIMEOUT`) & HTTP loopback block (`EACCES`). |
| **Playwright E2E Tests** | `npx playwright test` | **BLOCKED**| Canceled | **N/A** | WebServer listener on `http://localhost:3000` is unreachable under sandbox loopback isolation. |

---

## 2. Detailed Test Logs & Execution Evidence

### 2.1 Backend Typecheck
- **Command:** `npm --prefix Backend run typecheck` (`tsc --noEmit`)
- **Exit Code:** `0`
- **Output:**
```
> aiims-backend@1.0.0 typecheck
> tsc --noEmit
```
- **Finding:** No syntax, type, or import errors in Backend source code.

---

### 2.2 Frontend Typecheck
- **Command:** `npm --prefix Frontend run typecheck` (`tsc --noEmit`)
- **Exit Code:** `0`
- **Output:**
```
> aiims-frontend@1.0.0 typecheck
> tsc --noEmit
```
- **Finding:** Zero type or interface compiler errors in Frontend source code.

---

### 2.3 Backend Build
- **Command:** `npm --prefix Backend run build` (`npm run clean && tsc`)
- **Exit Code:** `1`
- **Output:**
```
> aiims-backend@1.0.0 build
> npm run clean && tsc

> aiims-backend@1.0.0 clean
> rm -rf dist

'rm' is not recognized as an internal or external command,
operable program or batch file.
```
- **Finding:** The `clean` script in `Backend/package.json` relies on the Unix command `rm -rf dist`. On Windows command shell environments, `rm` is not recognized. If compiled directly with `tsc`, compilation completes with exit code 0. A cross-platform clean command (e.g. `rimraf dist` or Node-based script) is required in `Backend/package.json`.

---

### 2.4 Frontend Production Build
- **Command:** `npm --prefix Frontend run build` (`tsc && vite build`)
- **Exit Code:** `0`
- **Output:**
```
> aiims-frontend@1.0.0 build
> tsc && vite build

vite v5.4.21 building for production...
✓ 2163 modules transformed.
dist/index.html                              2.69 kB │ gzip:   1.09 kB
dist/assets/index-Da6DqIyB.css              18.52 kB │ gzip:   4.03 kB
dist/assets/vendor-react-PSaFauDY.js         0.07 kB │ gzip:   0.08 kB
dist/assets/web-Dgzr2YNh.js                  0.74 kB │ gzip:   0.37 kB
dist/assets/Hero3DScene-Cu_CTwyS.js          3.03 kB │ gzip:   1.30 kB
dist/assets/OrbitalRings-Cw2dQfrV.js         3.09 kB │ gzip:   1.11 kB
dist/assets/Assessment3DScene-DzK0_F4V.js    4.61 kB │ gzip:   1.78 kB
dist/assets/vendor-icons-DTysH2l3.js        48.38 kB │ gzip:  10.51 kB
dist/assets/index-CT9Vy52c.js              830.02 kB │ gzip: 186.42 kB
dist/assets/vendor-three-vLPwqAjh.js       955.05 kB │ gzip: 264.46 kB
✓ built in 17.16s
```
- **Finding:** Frontend production bundle compiles cleanly. Bundle chunking isolates Three.js, Lucide icons, and React vendor trees.

---

### 2.5 Backend Evidence-Based Scoring Tests
- **Command:** `npm --prefix Backend run test:scoring` (`ts-node src/scripts/runScoringTests.ts`)
- **Exit Code:** `0`
- **Output:**
```
====================================================
RUNNING AIIMS EVIDENCE-BASED SCORING ENGINE TESTS (17 SCENARIOS)
====================================================

✅ [PASS] Test 1: Two options with similar strong verification meaning produce similar scores
✅ [PASS] Test 2: Weak answer in option A does NOT receive high score
✅ [PASS] Test 3: Strong answer receives high score regardless of option letter (B/C/D)
✅ [PASS] Test 4: Selecting more options in multi-select does NOT automatically produce higher score (depth > count)
✅ [PASS] Test 5: Q5 & Q24 preferences do NOT inflate capability scores
✅ [PASS] Test 6: Q23 attitude/concern stays within balanced analytical range without artificial inflation/reduction
✅ [PASS] Test 7: Open-ended answers are evaluated from actual text content, not repetitive length
✅ [PASS] Test 8: Missing/empty evidence receives 0 score with no score inflation
✅ [PASS] Test 9: Anthropic failure uses deterministic fallback without fake numeric scores
✅ [PASS] Test 10: Every final capability score can be traced to actual question evidence
✅ [PASS] Test 11: Intermediate learner profile produces moderate score (50–74 range)
✅ [PASS] Test 12: Beginner profile produces low score (<50 range)
✅ [PASS] Test 13: Advanced profile produces high score (>=75 range)
✅ [PASS] Test 14: Peer benchmark returns insufficiency notice when records < 30
✅ [PASS] Test 15: Peer benchmark returns data when records >= 30
✅ [PASS] Test 16: Score confidence decreases with missing responses
✅ [PASS] Test 17: Evidence coverage matches percentage of answered weighted questions

====================================================
TEST SUMMARY: 17 / 17 Quality Checks Passed.
====================================================
```
- **Finding:** All 17 scoring engine scenarios execute in-memory with 100% pass rate.

---

### 2.6 Backend Entitlements & Journey Gates Tests
- **Command:** `npm --prefix Backend run test:entitlements` (`ts-node --transpile-only src/scripts/testPhase3Entitlements.ts`)
- **Exit Code:** `0`
- **Output:**
```
===============================================================
🛡️  AIIMS PHASE 3: RULE-BASED ENTITLEMENTS & JOURNEY GATES TESTS
===============================================================

── SUITE 1: Assessment Incomplete → My AI Profile Gating ─────── (4/4 Passed)
── SUITE 2: Assessment Completed → My AI Profile Unlocking ───── (2/2 Passed)
── SUITE 3: Clarity and Focus Defined Prerequisites ──────────── (6/6 Passed)
── SUITE 4: Level 2–4 Features Visible While Safely Locked ───── (24/24 Passed)
── SUITE 5 & 6: Navigation Guard & Journey Consistency ───────── (7/7 Passed)
── SUITE 7: Dynamic State Transition (Zero Refresh Required) ─── (2/2 Passed)
── SUITE 8: Safeguards Against Unauthorized Access Bypasses ───── (3/3 Passed)
── SUITE 9: State Preservation Across Storage Serialization ──── (4/4 Passed)
── SUITE 10: Working Feature Continuity ──────────────────────── (6/6 Passed)

===============================================================
PHASE 3 TEST SUMMARY: 58 PASSED / 0 FAILED (Total: 58)
===============================================================
🎉 ALL RULE-BASED ENTITLEMENT & JOURNEY GATE TESTS PASSED!
```
- **Finding:** All 58 entitlement and journey state transition checks passed.

---

### 2.7 Frontend Comprehensive Test Suite
- **Command:** `npm --prefix Frontend run test` (`npx ts-node --transpile-only ../Backend/src/scripts/runFrontendTests.ts`)
- **Exit Code:** `0`
- **Summary:**
  - Suite 1 (Evidence-Based Scoring Engine): 17/17 Passed
  - Suite 2 (Feature Access & Entitlements): 59/59 Passed
  - Suite 3 (Design Tokens & Theme Engine): 12/12 Passed
  - Suite 4 (WCAG AA Contrast Standards): 18/18 Passed
  - Suite 5 (Evaluator UI, Rubrics & Send Button Guardian): 24/24 Passed
  - **Total:** 130 / 130 Passed Cleanly.

---

### 2.8 Frontend Vitest Unit Tests
- **Command:** `npx vitest run Frontend`
- **Exit Code:** `0`
- **Summary:**
  - `assessmentScoring.test.ts`: 17 passed
  - `featureAccess.test.ts`: 59 passed
  - `colorContrast.test.ts`: 18 passed
  - `theme.test.ts`: 12 passed
  - `evaluationFrontend.test.ts`: 24 passed
  - `pwaServiceWorker.test.ts`: 4 passed
  - **Total:** 134 / 134 tests passed in 1.16s across 6 test files.

---

### 2.9 Backend Vitest Unit Tests
- **Command:** `npm --prefix Backend run test:unit` (`vitest run --config ../vitest.config.ts src/services/__tests__`)
- **Exit Code:** `1`
- **Passing Files (95 tests passed):**
  - `logging.test.ts`: 5 passed
  - `sentry.test.ts`: 4 passed
  - `assessmentScoring.test.ts`: 17 passed
  - `startupConfig.test.ts`: 10 passed
  - `validation.test.ts`: 38 passed
  - `totp.test.ts`: 15 passed
  - `databaseIndex.test.ts`: 6 passed
- **Failing Files (27 tests failed due to environment network socket restrictions):**
  - `health.test.ts` (5 tests failed): Spawns ephemeral Express server on random port and calls `fetch('http://127.0.0.1:port/health')`. Fails with `Error: connect EACCES 127.0.0.1:50249`.
  - `security.test.ts` (22 tests failed): Spawns ephemeral Express server and issues HTTP requests via `fetch`. Fails with `Error: connect EACCES 127.0.0.1:50249`.

---

### 2.10 Backend Ephemeral Server Integration Tests
- **Scripts:** `testPhase1Security.ts`, `testEvaluationSystem.ts`, `testAccountDeletion.ts`
- **Exit Code:** `1`
- **Status:** **BLOCKED by Sandbox Network Isolation**
- **Cause:** These scripts call `app.listen(0)` to start an ephemeral test server, and then issue HTTP client requests via `fetch` or `http.request` to `http://127.0.0.1:<port>`. In the standard sandbox security environment on Windows, local TCP socket connections trigger `connect EACCES 127.0.0.1:<port>`.

---

### 2.11 Credits System End-to-End Verification
- **Command:** `npx ts-node src/scripts/verifyCreditsSystem.ts`
- **Exit Code:** `1`
- **Status:** **BLOCKED by Remote Database & Network Isolation**
- **Cause:** Script attempts to connect to remote MongoDB Atlas cluster (`querySrv ETIMEOUT _mongodb._tcp.clusteraiims.obfnfic.mongodb.net`) and make HTTP loopback calls. Since outbound internet and local loopback sockets are restricted in sandbox mode, the script exits with network timeout and `EACCES`.

