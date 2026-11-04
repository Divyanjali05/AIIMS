# AIIMS — Application Security Audit & Vulnerability Assessment

**Audit Date:** November 2, 2026
**Security Standard:** OWASP Top 10 API Security Risks (2023) / CWE / NIST SP 800-53
**Auditor:** Application Security Engineer & Software Architect
**Document Status:** Complete Empirical Security Audit

---

## 1. Executive Summary & Vulnerability Matrix

| ID | Vulnerability Title | Severity | CWE / OWASP | Affected Layer | Active Code Location | Status in Current Codebase |
| :---: | :--- | :---: | :---: | :---: | :--- | :---: |
| **V-01** | Privilege Escalation & Unvalidated State Mutation | **CRITICAL** | CWE-269 / API1 | Backend | `Backend/src/controllers/learner.controller.ts:L47` | **ACTIVE VULNERABILITY** |
| **V-02** | Unauthenticated Wallet Write Endpoints | **HIGH** | CWE-306 / API2 | Backend | `Backend/src/routes/aiWallet.routes.ts:L52-L53` | **ACTIVE VULNERABILITY** |
| **V-03** | Unauthenticated Focus & Radar Mutation Endpoints | **HIGH** | CWE-306 / API2 | Backend | `Backend/src/routes/investigation.routes.ts:L25,L27` | **ACTIVE VULNERABILITY** |
| **V-04** | Mock-Data Fallbacks in Production Controllers | **MEDIUM** | CWE-1188 / API8 | Backend | `aiWallet.controller.ts`, `investigation.controller.ts`, `assessment.controller.ts` | **ACTIVE VULNERABILITY** |
| **V-05** | Plaintext Password Fallback & Hardcoded Seed Passwords | **MEDIUM** | CWE-259 / API2 | Backend | `auth.controller.ts:L119`, `userStore.ts:L74,L89` | **ACTIVE VULNERABILITY** |
| **V-06** | Insecure Development JWT Fallback | **LOW (Dev-only)** | CWE-798 / API2 | Backend | `Backend/src/config/env.ts:L93` | **PARTIALLY MITIGATED** (Strict in prod, insecure in dev) |
| **V-07** | Exposed / Test Credentials in Repositories | **LOW** | CWE-798 / API2 | Repo Root | `Backend/api-tests.http:L15-L16`, git history | **PARTIALLY MITIGATED** (Protected by `.gitleaks.toml`) |
| **V-08** | Missing One-Account-One-Device Session Binding | **MEDIUM** | CWE-384 / API2 | Full-Stack | Global auth & session architecture | **ACTIVE GAP** |
| **V-09** | Client-Side Authority & State Rehydration Overwrite | **HIGH** | CWE-602 / API3 | Full-Stack | `Frontend/src/context/LearnerContext.tsx:L511-L533` | **ACTIVE VULNERABILITY** |
| **V-10** | Client-Side Credit Award & Dual-Ledger Inconsistency | **HIGH** | CWE-840 / API6 | Frontend | `Frontend/src/context/LearnerContext.tsx:L1447-L1478` | **ACTIVE VULNERABILITY** |

---

## 2. Deep Investigation of the 10 Known Issues (Full Code Review v2)

### Issue 1: Browser Access to Protected Learner State & Privilege Escalation
- **Severity:** **CRITICAL**
- **Affected File:** `Backend/src/controllers/learner.controller.ts` (lines 45–64), `Backend/src/routes/learner.routes.ts` (line 20)
- **Code Evidence:**
```typescript
// Backend/src/controllers/learner.controller.ts:35-54
export const updateLearnerState = async (req: AuthenticatedRequest, res: Response) => {
  const { state } = req.body;
  ...
  if (state.profile) {
    if (state.profile.name) updateDoc.name = state.profile.name;
    if (state.profile.role) updateDoc.role = state.profile.role; // <--- PRIVILEGE ESCALATION VULNERABILITY!
    if (state.profile.college) updateDoc.college = state.profile.college;
    if (state.profile.targetGoal) updateDoc.targetGoal = state.profile.targetGoal;
    if (state.profile.stage) updateDoc.stage = state.profile.stage;
  }
  if (state.assessment) updateDoc.assessment = state.assessment;
  if (state.analysis) updateDoc.analysis = state.analysis;
  if (state.clarity) updateDoc.clarity = state.clarity;
  if (state.focus) updateDoc.focus = state.focus;
  if (state.radar) updateDoc.radar = state.radar;
  if (state.investigation) updateDoc.investigation = state.investigation;
```
- **Vulnerability Analysis:**
  1. While `PUT /api/learner/state` requires a valid JWT token (`requireAuth`), any authenticated learner can issue a PUT request containing `{ state: { profile: { role: 'admin' } } }`. The controller copies `state.profile.role` directly into `updateDoc.role`, executing `User.findByIdAndUpdate` and elevating the user to `admin` or `evaluator`.
  2. Furthermore, a client can modify `state.assessment.status = 'completed'` or `state.assessment.scores` arbitrarily, unlocking journey stages without submitting questions to the grading engine.
- **Remediation Required:**
  - Strip `role` from allowable client profile updates. Role modifications must only be performed through administrative endpoints (`/api/admin/evaluators`).
  - Introduce strict Zod validation schema for `PUT /learner/state` allowing only safe user preferences (e.g., target goal, name, notification preferences).
  - Assessment status, clarity scores, and investigation stages must be updated solely by their respective server-authoritative controllers (`/assessments/submit`, `/clarity/save-task-score`, `/investigations/submit`).

---

### Issue 2: Unauthenticated Wallet Write Endpoints
- **Severity:** **HIGH**
- **Affected File:** `Backend/src/routes/aiWallet.routes.ts` (lines 52–53), `Backend/src/controllers/aiWallet.controller.ts` (lines 420–522)
- **Code Evidence:**
```typescript
// Backend/src/routes/aiWallet.routes.ts:50-53
router.get('/wallet/user', getUserWallet);                   // No requireAuth
router.post('/wallet/add', addToWallet);                     // No requireAuth
router.post('/wallet/update-familiarity', updateFamiliarity);// No requireAuth
```
```typescript
// Backend/src/controllers/aiWallet.controller.ts:460-478
// Offline / unauthenticated fallback — mutate in-memory mock only
const existing = mockUserTools.find(t => t.toolId === toolId);
if (existing) {
  existing.familiarity = (familiarity || existing.familiarity) as any;
  if (userNotes) existing.userNotes = userNotes;
  return res.json({ success: true, item: existing, action: 'updated' });
}
...
mockUserTools.unshift(newItem as any);
return res.json({ success: true, item: newItem, action: 'added' });
```
- **Vulnerability Analysis:**
  - `POST /wallet/add` and `POST /wallet/update-familiarity` allow unauthenticated external clients to send arbitrary payloads.
  - When unauthenticated, the controller falls back to modifying a global in-memory array (`mockUserTools`). Any anonymous request mutates the shared mock state for all concurrent unauthenticated visitors.
  - Furthermore, `POST /admin/sources`, `GET /admin/candidates`, and `POST /admin/verify/:toolId` in `aiWallet.routes.ts` (lines 60–65) lack role checks (`requireRole('admin')`), relying only on `requireAuth`.
- **Remediation Required:**
  - Attach `requireAuth` to `/wallet/user`, `/wallet/add`, and `/wallet/update-familiarity`.
  - Attach `requireRole('admin')` to all `/admin/sources`, `/admin/candidates`, and `/admin/verify/:toolId` endpoints.
  - Eliminate shared in-memory mock mutations for unauthenticated requests.

---

### Issue 3: Unauthenticated Focus and Radar Write Endpoints
- **Severity:** **HIGH**
- **Affected File:** `Backend/src/routes/investigation.routes.ts` (lines 24–27), `Backend/src/controllers/investigation.controller.ts` (lines 28–55)
- **Code Evidence:**
```typescript
// Backend/src/routes/investigation.routes.ts:24-27
router.get('/focus/areas', getFocusAreas);
router.post('/focus/override', overrideFocus);       // Unauthenticated write!
router.get('/radar/signals', getRadarSignals);
router.post('/radar/follow', toggleFollowSignal);    // Unauthenticated write!
```
```typescript
// Backend/src/controllers/investigation.controller.ts:28-55
export const overrideFocus = (req: Request, res: Response) => {
  const { focusId, mentorOverride } = req.body;
  const focus = mockFocusAreas.find((f) => f.id === focusId);
  if (focus) {
    focus.mentorOverride = mentorOverride;
  }
  res.json(focus);
};

export const toggleFollowSignal = (req: Request, res: Response) => {
  const { signalId } = req.body;
  const signal = mockRadarSignals.find((s) => s.id === signalId);
  if (signal) {
    signal.isFollowed = !signal.isFollowed;
  }
  res.json(signal);
};
```
- **Vulnerability Analysis:**
  - Any attacker can send HTTP POST requests to `/api/focus/override` and `/api/radar/follow` without authentication.
  - These requests mutate global shared mock arrays (`mockFocusAreas`, `mockRadarSignals`) in memory, leading to cross-user state corruption and potential data pollution.
- **Remediation Required:**
  - Add `requireAuth` to `/focus/override` and `/radar/follow`.
  - Persist focus overrides and followed signals to the individual authenticated user's database document (`req.user.focus` and `req.user.radar.followedSignalIds`), rather than shared module globals.

---

### Issue 4: Mock-Data Fallbacks in Production Controllers
- **Severity:** **MEDIUM**
- **Affected Files:**
  - `Backend/src/controllers/assessment.controller.ts` (lines 420–483)
  - `Backend/src/controllers/credits.controller.ts` (lines 220–250)
  - `Backend/src/controllers/aiWallet.controller.ts` (lines 460–478, 514–522)
  - `Backend/src/controllers/investigation.controller.ts` (lines 20–55)
- **Code Evidence:**
```typescript
// Backend/src/controllers/assessment.controller.ts:465-482
export const getComparativeAnalysis = (req: Request, res: Response) => {
  res.json({
    scores: mockDimensionScores,
    cohortPercentile: 78,
    peerAverage: 72.5,
  });
};

export const getOverallAnalysis = (req: Request, res: Response) => {
  res.json({
    totalStudents: 1240,
    cohortAverage: 71.4,
    topDimension: 'Prompt Engineering',
    biggestKnowledgeGap: 'Agentic Workflows',
  });
};
```
- **Vulnerability Analysis:**
  - Production endpoints return static synthetic numbers and fake cohort totals (`totalStudents: 1240`, `cohortAverage: 71.4`) instead of actual aggregate statistics.
  - In `credits.controller.ts:awardLevel`, if `req.user` is somehow absent, it adds credits to `mockUser.aiimsCredits` rather than returning an error.
- **Remediation Required:**
  - Remove all mock fallbacks from API controllers when running in non-development environments, or explicitly guard them behind `process.env.NODE_ENV === 'test'`.
  - Implement real MongoDB aggregation queries for comparative and cohort metrics, or return an empty/insufficient-data notice when records are below threshold (as correctly done in `getPeerBenchmarks`).

---

### Issue 5: Plaintext Password Fallback & Hardcoded Seed Passwords
- **Severity:** **MEDIUM**
- **Affected Files:**
  - `Backend/src/controllers/auth.controller.ts` (line 119)
  - `Backend/src/models/userStore.ts` (lines 74, 89)
- **Code Evidence:**
```typescript
// Backend/src/controllers/auth.controller.ts:117-119
user.password && user.password.startsWith('$2')
  ? await bcrypt.compare(password, user.password)
  : user.password === password; // <--- PLAINTEXT COMPARISON FALLBACK!
```
```typescript
// Backend/src/models/userStore.ts:74, 89
registeredUsers[mockUser.email.toLowerCase()] = {
  ...
  password: bcrypt.hashSync('password123', 10),
};
registeredUsers['alex.ai@example.com'] = {
  ...
  password: bcrypt.hashSync('password123', 10),
};
```
- **Vulnerability Analysis:**
  - The fallback `user.password === password` was created for backward compatibility with unmigrated accounts, but allows unhashed passwords in the store.
  - The in-memory proxy seed store pre-populates `'divya@example.com'` and `'alex.ai@example.com'` with known password `'password123'`.
- **Remediation Required:**
  - Enforce bcrypt comparison exclusively. Disallow plaintext comparisons (`user.password === password`).
  - Disable default mock user accounts in production builds.

---

### Issue 6: Insecure Development JWT Fallback
- **Severity:** **LOW (Dev-only)**
- **Affected File:** `Backend/src/config/env.ts` (lines 84–94)
- **Code Evidence:**
```typescript
if (!secret) {
  if (isProduction) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing in production...');
  }
  console.warn('⚠️  [SECURITY WARNING] No JWT_SECRET defined in environment...');
  return 'aiims-dev-ephemeral-key-do-not-use-in-production-min32chars';
}
```
- **Current Status:** **PARTIALLY MITIGATED.**
  - In production (`NODE_ENV === 'production'`), the system safely throws a fatal error if `JWT_SECRET` is missing, shorter than 32 characters, or matches known default placeholders.
  - In development mode, it logs a warning and falls back to a static string.
- **Remediation:** In development, generate a cryptographically random ephemeral secret via `crypto.randomBytes(32).toString('hex')` on server startup so that tokens cannot be forged across restarts using the known static string.

---

### Issue 7: Exposed or Previously Shared Credentials
- **Severity:** **LOW**
- **Affected Files:** `.gitleaks.toml`, `.gitleaksignore`, `Backend/api-tests.http`
- **Code Evidence:**
  - Git history contains an ignored finding: `c4d193c72159b7ccabbc05e7e409e69dc1e19b13:Backend/src/scripts/testPhase1Security.ts:generic-api-key:131`.
  - `Backend/api-tests.http` contains placeholder test credentials (`student@aiims.edu`, `Password123!`).
  - Remote MongoDB Atlas cluster hostname `clusteraiims.obfnfic.mongodb.net` is referenced in tests and `.env`.
- **Current Status:**
  - Gitleaks pre-commit hooks and CI scans are configured in `.gitleaks.toml` and `.husky/pre-commit`.
  - No active `.env` files are tracked in git (`.gitignore` properly ignores `.env`).
- **Remediation:**
  - Maintain zero `.env` tracking.
  - Regularly rotate database cluster credentials in MongoDB Atlas if previously shared across development sessions.

---

### Issue 8: Missing One-Account-One-Device Session Binding
- **Severity:** **MEDIUM**
- **Affected Layer:** Authentication & Session Management
- **Vulnerability Analysis:**
  - AIIMS JWT tokens are stateless (signed with 7-day expiration).
  - No device fingerprint, IP hash, or device ID is embedded in the JWT payload or tracked in the database.
  - A user can share their credentials or JWT token with multiple individuals on separate devices concurrently.
  - No logout-all-devices or active session revocation endpoint exists.
- **Remediation Required:**
  - Implement a `sessions` sub-document or collection storing active device IDs, user-agents, and last active timestamps.
  - Issue short-lived access tokens (e.g. 15–30 minutes) alongside rotating refresh tokens stored with device bindings in the database.
  - Invalidate older device sessions when a new device signs in if single-device policy is chosen.

---

### Issue 9: Client-Side Business Logic & State Rehydration Overwrite
- **Severity:** **HIGH**
- **Affected File:** `Frontend/src/context/LearnerContext.tsx` (lines 510–533)
- **Code Evidence:**
```typescript
// Frontend/src/context/LearnerContext.tsx:523-533
if (isAuthenticated) {
  const timer = setTimeout(() => {
    apiClient.syncLearnerState(state).catch((err) => {
      console.warn('Background MongoDB sync warning:', err);
    });
  }, 800);

  return () => clearTimeout(timer);
}
```
- **Vulnerability Analysis:**
  - The client application considers its local React state and `localStorage` to be the primary state authority.
  - On every state change, it pushes the entire `state` tree to `PUT /api/learner/state`.
  - An attacker can modify `localStorage.getItem('aiims_learner_state_v3')` via DevTools, refreshing the page to trigger state rehydration and subsequent background push to MongoDB.
- **Remediation Required:**
  - Adopt a strict server-authoritative state model: state mutations must occur via explicit action endpoints (e.g., `POST /clarity/tasks`, `POST /assessments/submit`).
  - The client should fetch authoritative state on boot (`GET /api/learner/state`) and merge downward, rather than pushing client-side modifications upward.

---

### Issue 10: Client-Side Credit Balance Manipulation & Duplicate Rewards
- **Severity:** **HIGH**
- **Affected File:** `Frontend/src/context/LearnerContext.tsx` (lines 1447–1478)
- **Code Evidence:**
```typescript
// Frontend/src/context/LearnerContext.tsx:1447-1478
const awardCredits = (amount: number, description: string, actionKey?: string) => {
  const key = actionKey || `CUSTOM_${Date.now()}_${amount}`;
  ...
  setState((prev) => {
    if (prev.credits.claimedActions.includes(key)) {
      return prev;
    }
    const newBalance = prev.credits.balance + amount;
    const newTx: CreditTransactionItem = {
      id: `tx-${Date.now()}`,
      description,
      amount,
      type: 'EARN',
      timestamp: nowStr,
      actionKey: key,
    };
    return {
      ...prev,
      profile: { ...prev.profile, aiimsCredits: newBalance },
      credits: {
        balance: newBalance,
        transactions: [newTx, ...prev.credits.transactions],
        claimedActions: [...prev.credits.claimedActions, key],
      },
    };
  });
};
```
- **Vulnerability Analysis:**
  - `LearnerContext.tsx` exposes `awardCredits(amount, description, actionKey)` directly in client state.
  - While `Backend/src/controllers/credits.controller.ts` uses `CreditLedger` and atomic MongoDB transactions for backend credit transactions, the frontend maintains a separate in-memory balance and `claimedActions` list that can be invoked directly in the browser console.
  - If a user triggers `awardCredits(1000, 'Free Credits')`, their local UI balance inflates immediately to 1000 AC.
- **Remediation Required:**
  - Remove `awardCredits` from the exported `LearnerContext` surface.
  - All credit grants must originate from server-side transactional API calls (`POST /credits/award-level`, `POST /assessments/submit`, `POST /investigations/submit`).
  - The frontend balance must be read-only from `credits.balance` returned by `GET /api/credits/wallet`.

