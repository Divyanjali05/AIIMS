# AIIMS — Security, Credentials, Privacy, and Launch Safeguards Review

**Document Version:** 1.0.0  
**Audit Date:** October 18, 2026  
**Scope:** AIIMS Full-Stack Repository (Backend TypeScript/Express, Frontend React/Vite, MongoDB Atlas, Anthropic & Gemini API Integrations)  
**Status:** Pre-Launch Engineering Audit & Compliance Advisory  

---

## 1. Executive Summary & Risk Posture

This security-oriented review evaluates the AIIMS codebase, infrastructure configuration, authentication mechanisms, evaluator workflows, credit/reward mechanics, prompt processing pipelines, data privacy, and external regulatory requirements prior to launch.

### Key Audit Highlights:
1. **Critical Secret Rotation Status: UNVERIFIED / PROOF MISSING.**  
   Four critical keys are configured for the platform. While `.env` is currently excluded by `.gitignore` and not committed in the active tree, **no cryptographic rotation logs, timestamped certificate revocations, or cloud audit trails exist** in the repository to substantiate that keys were rotated. Keys must be formally treated as unrotated until authorized cloud-environment evidence is furnished.
2. **Critical Route Exposure & Financial Leakage:**  
   The core AI execution endpoint (`POST /api/clarity/run-task`) invokes live LLMs (Anthropic Claude 3.5 Sonnet / Google Gemini 3.1 Flash) **without authentication, without rate limiting, and without deducting user credits**.
3. **Absence of Role-Based Access Control (RBAC):**  
   There is no separate evaluator or admin role model implemented. Admin endpoints (`/admin/sources`, `/admin/candidates`, `/admin/verify/:toolId`, `/admin/intelligence/dashboard`) have **no authentication middleware** attached.
4. **Ghost User Auto-Creation Vulnerability:**  
   `authenticateStudent` middleware automatically instantiates and persists a new user document with 100 free credits whenever a token is signed with the configured secret, bypassing registration validation.
5. **Zero Rate Limiting:**  
   No rate-limiting middleware (`express-rate-limit`) is installed across the Express API, exposing auth, billing, and LLM endpoints to brute-force and resource-exhaustion attacks.
6. **External Launch Blockers:**  
   Brand trademark conflict with AIIMS (All India Institute of Medical Sciences), India DPDP Act 2023 restrictions on minors (<18), 18% GST liability on digital credits, and App Store in-app purchase (IAP) mandates represent hard launch blockers requiring legal, tax, and product clearance.

---

## 2. Credentials & Secrets Audit (Zero-Exposure Policy)

> [!IMPORTANT]
> In accordance with zero-exposure security protocols, **no raw secret values, hashes, or connection passwords are printed or reproduced in this report**. Secrets are referenced strictly by environment variable name and configuration file path.

### 2.1 Critical Key Inventory & Status

| Key Identifier | Location / Config Variable | Current Exposure Assessment | Rotation Evidence Status |
| :--- | :--- | :--- | :--- |
| **Key 1: Database Connection** | `MONGODB_URI`<br>([Backend/.env](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/.env), [env.ts:L9](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/config/env.ts#L9)) | **Uncommitted in Git** (ignored by `.gitignore`). Present in local unencrypted `.env`. Connects to live MongoDB Atlas cluster. | **MISSING PROOF**: No Atlas database user rotation audit log or IAM certificate exists in the workspace. |
| **Key 2: JWT Signing Secret** | `JWT_SECRET`<br>([Backend/.env](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/.env), [env.ts:L11](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/config/env.ts#L11)) | **Exposed Fallback in Source Code**: [env.ts:L11](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/config/env.ts#L11) has hardcoded default string `'aiims-secret-key-2026'`. Any deployment lacking an explicit env var falls back to this publicly known string. | **MISSING PROOF**: No secret rotation timestamp or dual-key transition window verified. |
| **Key 3: Anthropic API Key** | `ANTHROPIC_API_KEY`<br>([Backend/.env](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/.env), [env.ts:L13](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/config/env.ts#L13)) | Set to placeholder `'mock-claude-key'` in local `.env`. Live Claude calls currently trigger fallback logic or fail unless provided via parent process environment. | **MISSING PROOF**: No proof of key provisioning or rotation from Anthropic Console. |
| **Key 4: Google Gemini API Key** | `GEMINI_API_KEY`<br>([Backend/.env](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/.env), [env.ts:L15](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/config/env.ts#L15)) | Present in local `.env`. Used actively by [claude.service.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/anthropic/claude.service.ts) and [aiProvider.service.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/aiProvider.service.ts). | **MISSING PROOF**: No Google Cloud Console / AI Studio key rotation or restriction audit record. |

### 2.2 Git History & Repository Hygiene Verification

1. **Git Status Verification**:
   - `git status --ignored` confirms `Backend/.env` is ignored by `.gitignore` and is not staged.
2. **Git Commit History Verification**:
   - Ran `git log --all -- "**/.*env*" "Backend/.env"`. Confirmed no commits contain the explicit filename `.env`.
3. **Hardcoded Secrets & Defaults in Source**:
   - [Backend/src/config/env.ts:L11](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/config/env.ts#L11): Fallback default secret `'aiims-secret-key-2026'`.
   - [Backend/src/middleware/auth.middleware.ts:L73](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/middleware/auth.middleware.ts#L73): Hardcoded fallback password hash `'$2a$10$inMemoryFallbackHashedPasswordMock12345'`.
   - [Backend/src/server.ts:L38](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/server.ts#L38): Hardcoded developer machine local path `/Users/nithishkumar07/.../aiims_learning_student.jpg`.

### 2.3 Recommended Key Rotation & History-Cleanup Procedures

Because proof of rotation is missing, the following standard rotation procedure must be executed in the authorized infrastructure environment:

1. **MongoDB Atlas (`MONGODB_URI`)**:
   - In MongoDB Atlas Console under **Database Access**, create a new database user with least-privilege role (`readWrite` scoped strictly to `aiims` database).
   - Update production environment secrets with the new URI.
   - Delete/revoke the prior database user credential in Atlas.
   - Verify connection logs in Atlas to confirm 100% traffic switched to the new credential.
2. **JWT Secret (`JWT_SECRET`)**:
   - Remove fallback default from [env.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/config/env.ts). Ensure the server throws a fatal startup exception (`process.exit(1)`) if `process.env.JWT_SECRET` is undefined or less than 32 random characters.
   - Generate a cryptographically secure 256-bit secret (`openssl rand -base64 32`).
   - If user sessions must be gracefully preserved during rotation, implement a dual-key array (`JWT_SECRETS=[new_secret, old_secret]`) allowing old tokens to verify during their expiry window while signing new tokens with the new secret.
3. **External AI API Keys (`ANTHROPIC_API_KEY` & `GEMINI_API_KEY`)**:
   - In Anthropic Console, revoke existing API keys and generate a scoped key with monthly spend limits and budget alerts.
   - In Google Cloud Console / Google AI Studio, revoke the active Gemini API key, generate a new key, and apply API restrictions (restricting key usage strictly to the Generative Language API) and IP/HTTP referer restrictions.
4. **Git History Scrubbing Protocol**:
   - Even though `.env` was not found in git logs, if any team branch, stash, or PR ever committed a secret, run `git-filter-repo` or `BFG Repo-Cleaner`:
     ```bash
     bfg --replace-text banned-secrets.txt
     git reflog expire --expire=now --all && git gc --prune=now --aggressive
     ```
   - Enforce pre-commit hooks via `husky` and `gitleaks` or `secretlint` to prevent future secret commits.

---

## 3. Authentication, Evaluator Permissions, and User Data Access

### 3.1 Confirmed Code Findings

#### Finding 1: Ghost User Auto-Creation Vulnerability (CRITICAL)
- **Location:** [Backend/src/middleware/auth.middleware.ts:L64-L95](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/middleware/auth.middleware.ts#L64-L95)
- **Vulnerability:** If an incoming request provides a JWT that decodes with an email not found in MongoDB, the middleware executes `new User({ ... aiimsCredits: 100 }).save()`.
- **Impact:** Any attacker with knowledge of the default or weak JWT secret can forge tokens for arbitrary email addresses. Each request automatically seeds a valid database account with 100 free credits without password verification or email ownership verification.
- **Remediation:** Remove auto-creation logic from `authenticateStudent`. If `!dbUser`, return `401 Unauthorized`.

#### Finding 2: Complete Absence of Role-Based Access Control (HIGH)
- **Location:** [Backend/src/models/User.model.ts:L22](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/models/User.model.ts#L22), [Backend/src/middleware/auth.middleware.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/middleware/auth.middleware.ts)
- **Vulnerability:** `User.role` is stored as an arbitrary freeform string (e.g. `'Student / AI Learner'`). There is no enum restriction and no authorization middleware such as `requireRole('EVALUATOR')` or `requireRole('ADMIN')`.
- **Impact:** Any authenticated user possesses identical privileges. There is no cryptographic or route-level mechanism to isolate evaluator or administrator capabilities from student capabilities.

#### Finding 3: Unprotected Admin & System Modification Routes (HIGH)
- **Location:** [Backend/src/routes/aiWallet.routes.ts:L58-L62](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/routes/aiWallet.routes.ts#L58-L62)
- **Vulnerability:** The following administrative endpoints have **zero authentication or authorization middleware**:
  - `GET /api/admin/sources`
  - `POST /api/admin/sources` (registers external tool sources)
  - `GET /api/admin/candidates` (lists unverified tool candidates)
  - `POST /api/admin/verify/:toolId` (modifies tool catalog verification state)
  - `GET /api/admin/intelligence/dashboard` (exposes system scraping metrics)
  - `POST /api/wallet/discover/trigger` (launches batch scraping jobs)
- **Remediation:** Attach `requireAuth` and an explicit role check `requireRole('ADMIN')` to all `/admin/*` and discovery trigger routes.

#### Finding 4: Token Storage in Browser LocalStorage (MEDIUM)
- **Location:** [Frontend/src/api/client.ts:L4](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/api/client.ts#L4)
- **Vulnerability:** Tokens are stored in `localStorage.getItem('aiims_auth_token')`.
- **Impact:** In the event of any Cross-Site Scripting (XSS) vulnerability (such as rendering unsanitized markdown outputs from AI models), stored tokens can be exfiltrated by client-side scripts.
- **Remediation:** Transition authentication to `httpOnly`, `secure`, `sameSite: 'strict'` HTTP session cookies.

### 3.2 Evaluator Access Architecture & Least-Privilege Workflow

To meet the requirements for a secure Evaluator role without compromising student privacy:

1. **Role Separation & Multi-Factor Authentication (MFA)**:
   - Introduce strict role types: `enum UserRole { STUDENT = 'STUDENT', ENTREPRENEUR = 'ENTREPRENEUR', EVALUATOR = 'EVALUATOR', ADMIN = 'ADMIN' }`.
   - Evaluator accounts must not be self-registered via public `/register`. They must be provisioned via admin invitation.
   - Evaluators should be mandated to use Multi-Factor Authentication (TOTP via RFC 6238 like Google Authenticator / Authy or WebAuthn/FIDO2 hardware keys) due to their elevated capability to alter student academic scores and trigger server-billed prompts.
2. **Submission Data Isolation & Blind Evaluation**:
   - **Principle of Least Privilege:** Evaluators should only access submissions assigned to them or within their assigned academic cohort.
   - **PII Masking (Double-Blind Review):** Evaluator views must sanitize and mask student personal identifiable information (full name, email, college, student ID, financial transactions, credit wallet balance). The evaluator should only see:
     * Submission ID
     * Timestamp
     * Task prompt / code artifact / open-ended response
     * Evaluation rubric and scoring criteria
3. **Audit Trail & Action Immutability**:
   - Every evaluator action (scoring adjustment, qualitative feedback submission, prompt re-run) must be written to an immutable `EvaluatorAuditLog` collection capturing: `evaluatorId`, `submissionId`, `previousScore`, `newScore`, `feedbackText`, `clientIp`, and `timestamp`.

---

## 4. Credit, Reward Integrity, and Financial Abuse Controls

### 4.1 Confirmed Code Findings

#### Finding 1: Unmetered AI Task Execution Vulnerability (CRITICAL)
- **Location:** [Backend/src/routes/clarity.routes.ts:L17](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/routes/clarity.routes.ts#L17) & [clarity.controller.ts:L53-L80](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/clarity.controller.ts#L53-L80)
- **Vulnerability:** `POST /api/clarity/run-task` executes live Anthropic Claude 3.5 Sonnet or Gemini 3.1 Flash prompts and subsequent evaluation calls. It has **no authentication requirement**, **no credit cost check**, and **no credit deduction**.
- **Impact:** Any automated script or external entity can send unlimited requests, consuming API quotas and generating massive LLM vendor billing liabilities with zero credit cost or user accountability.
- **Remediation:** 
  1. Add `requireAuth`.
  2. Implement a server-authoritative credit check and atomic deduction (e.g. 5 or 10 credits per task run) before calling external AI providers.
  3. Reject request with `402 Payment Required` if balance is insufficient.

#### Finding 2: Pre-Computation Desynchronization in `investCredits` (MEDIUM)
- **Location:** [Backend/src/controllers/credits.controller.ts:L186-L196](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/credits.controller.ts#L186-L196)
- **Vulnerability:** In `investCredits`, the transaction audit object calculates `newBalance: (req.user.aiimsCredits || 0) - numAmount` in memory *before* executing the MongoDB atomic update `User.findOneAndUpdate({ _id: req.user._id, aiimsCredits: { $gte: numAmount } }, { $inc: { aiimsCredits: -numAmount } })`.
- **Impact:** If two concurrent investments occur, both transaction logs will record identical pre-computed balances, causing audit ledger desynchronization with the actual user balance in MongoDB.
- **Remediation:** Persist the transaction with the post-update balance returned by `{ returnDocument: 'after' }` or execute credit mutations within a MongoDB multi-document transaction (`session.withTransaction`).

### 4.2 Verified Positive Integrity Controls
- **Atomic MongoDB Balance Guards:** [credits.controller.ts:L201](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/credits.controller.ts#L201) uses `{ aiimsCredits: { $gte: numAmount } }` with `$inc: { aiimsCredits: -numAmount }`. This prevents balances from dropping below zero under concurrent spend requests.
- **Idempotency Keys on Level Quests:** [credits.controller.ts:L56](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/credits.controller.ts#L56) enforces `'transactions.sourceId': { $nin: [sourceId, altSourceId] }` atomically, preventing duplicate level quest claims.

### 4.3 Proposed Safeguards for Daily Earning & Game Rewards
If the owner approves restoring the optional daily check-in reward (e.g., 5 credits/day):
1. **Clock Manipulation Immunity:** All eligibility checks must be computed using server-authoritative UTC date strings (`new Date().toISOString().slice(0, 10)`), ignoring client timestamps.
2. **Server-Side Unique Index:** Maintain a sub-document or index on `dailyCheckIns.date`:
   ```typescript
   UserSchema.index({ _id: 1, 'dailyRewards.claimedDate': 1 });
   ```
3. **Atomic Claim Operation:**
   ```typescript
   const todayUTC = new Date().toISOString().slice(0, 10);
   const updated = await User.findOneAndUpdate(
     { _id: userId, 'dailyRewards.lastClaimedDate': { $ne: todayUTC } },
     {
       $inc: { aiimsCredits: 5 },
       $set: { 'dailyRewards.lastClaimedDate': todayUTC },
       $push: { transactions: dailyTx }
     },
     { returnDocument: 'after' }
   );
   ```

---

## 5. Prompt Execution, Abuse Controls, and Rate Limiting

### 5.1 Confirmed Code Findings

#### Finding 1: Total Absence of Rate Limiting Middleware (HIGH)
- **Location:** [Backend/package.json](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/package.json), [Backend/src/server.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/server.ts)
- **Vulnerability:** `express-rate-limit` is not present in dependencies or server middleware.
- **Impact:**
  - Login/Register routes are susceptible to credential stuffing and brute force.
  - LLM routes (`/clarity/run-task`, `/clarity/generate-prompt`, `/relevance/generate`) can be flooded to exhaust Anthropic/Google API quotas.
- **Remediation:** Install `express-rate-limit` and configure tiered limits:
  - Auth routes (`/api/auth/*`): 10 requests per 15 minutes per IP.
  - LLM execution routes (`/api/clarity/*`, `/api/ai/*`): 15 requests per minute per user.
  - General API: 120 requests per minute per IP.

#### Finding 2: Unbounded Prompt Concatenation & Injection Exposure (MEDIUM)
- **Location:** [Backend/src/services/anthropic/claude.service.ts:L355-L357](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/anthropic/claude.service.ts#L355-L357)
- **Vulnerability:** `userPrompt` is concatenated directly into LLM messages without character length truncation or structural boundary checks.
- **Impact:** An attacker can submit massive payloads (causing excessive token consumption) or prompt injection strings designed to alter rubric scoring or force artificial outputs.
- **Remediation:** 
  - Enforce a strict character limit (e.g. max 2,500 characters) on `userPrompt`.
  - Isolate user input inside explicit XML boundary tags (e.g. `<learner_prompt>${sanitizedPrompt}</learner_prompt>`) as already practiced in [aiProvider.service.ts:L87](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/aiProvider.service.ts#L87).
  - Add request timeouts (e.g., 30s `AbortSignal`) to all external API calls.

---

## 6. Filesystem, Image Handling, and Logging Hygiene

### 6.1 Confirmed Code Findings

#### Finding 1: Hardcoded Local Machine Filesystem Path (HIGH)
- **Location:** [Backend/src/server.ts:L37-L40](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/server.ts#L37-L40)
- **Code:**
  ```typescript
  app.get('/api/mascot', (req, res) => {
    const imagePath = '/Users/nithishkumar07/.gemini/antigravity-ide/brain/15116c1c-6582-4df7-b482-51099d1cf792/aiims_learning_student_1789836271046.jpg';
    res.sendFile(imagePath);
  });
  ```
- **Vulnerability:** Hardcoded path tied to a specific developer's Unix home directory (`/Users/nithishkumar07/`).
- **Impact:** Fails on any Windows server, Linux production container, or secondary developer environment (triggering 500 errors). Exposes internal local path structure.
- **Remediation:** Serve static assets from a project-relative `public/` directory or cloud object storage using `path.join(__dirname, '../public/assets/mascot.jpg')`.

#### Finding 2: Sensitive Data Logging in Migration Scripts (LOW)
- **Location:** [Backend/src/scripts/migratePasswords.ts:L47](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/scripts/migratePasswords.ts#L47)
- **Vulnerability:** Script logs user emails and partial bcrypt hash prefixes to `stdout`.
- **Remediation:** Sanitize script logs to output only count summaries rather than individual email addresses or hash fragments.

#### Finding 3: File Uploads Status
- **Current State:** No file upload routes or `multer` dependencies currently exist in the codebase.
- **Launch Safeguard:** When file upload features are added (for student assignments or resumes):
  - Strictly validate MIME types and file magic bytes (do not trust `Content-Type` header).
  - Enforce strict size limits (e.g., 5MB max).
  - Store uploads in private S3/GCS buckets using pre-signed download URLs, never directly in server filesystem.

---

## 7. Confirmed Findings vs. Possibilities Needing Investigation

To provide clear engineering priorities, findings are strictly bifurcated:

### Confirmed Findings (Verified Directly in Code)
1. **Missing Key Rotation Evidence:** No proof of rotation exists in the repository for `MONGODB_URI`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY`.
2. **Hardcoded Fallback JWT Secret:** [env.ts:L11](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/config/env.ts#L11) defaults to `'aiims-secret-key-2026'`.
3. **Ghost User Auto-Creation:** [auth.middleware.ts:L64-L95](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/middleware/auth.middleware.ts#L64-L95) creates database user documents with 100 credits for any valid signature.
4. **Unauthenticated LLM Endpoint:** [clarity.routes.ts:L17](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/routes/clarity.routes.ts#L17) allows unmetered Claude/Gemini execution without auth or credit deduction.
5. **Unprotected Admin Routes:** [aiWallet.routes.ts:L58-L62](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/routes/aiWallet.routes.ts#L58-L62) allows public modification of tool candidates and sources.
6. **Zero Rate Limiting:** No rate limiting middleware is configured anywhere on the Express server.
7. **Hardcoded Machine Path:** [server.ts:L38](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/server.ts#L38) contains a hardcoded `/Users/nithishkumar07/` path.
8. **Insecure Token Storage:** [Frontend client.ts:L4](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/api/client.ts#L4) stores auth tokens in browser `localStorage`.
9. **Absent Role Isolation:** No evaluator schema, login flow, or RBAC guard exists in backend code.

### Possibilities Requiring Production & Operational Investigation
1. **Third-Party Key Quotas & Spend Caps:** Need verification in Google Cloud Console and Anthropic Console whether spending caps and alert thresholds are actively configured to prevent financial overrun.
2. **MongoDB Atlas IP Access List:** Need verification in Atlas Console whether cluster access is restricted to production server static IPs or currently open to `0.0.0.0/0` (anywhere).
3. **Production Reverse Proxy / WAF:** Need investigation whether Cloudflare, AWS CloudFront, or Nginx sits in front of the API to handle SSL termination, DDoS mitigation, and HTTP request buffering.
4. **CORS Production Whitelist:** [server.ts:L25](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/server.ts#L25) currently executes `app.use(cors())` which reflects wildcard `*`. Must verify production deployment configuration to ensure CORS is restricted to production domains.

---

## 8. External Launch Requirements & Regulatory Safeguards

> [!WARNING]
> The following items represent critical legal, regulatory, and policy boundaries. **These notes do not constitute formal legal clearance or tax advice.** Formal clearance must be obtained from qualified legal and tax counsel prior to public launch.

### 8.1 Trademark Clearance Check ("AIIMS" Conflict)
- **Regulatory Conflict:** The name and acronym **AIIMS** is widely known throughout India as the **All India Institute of Medical Sciences**, an autonomous institution of national importance established under the parliamentary **AIIMS Act, 1956**.
- **Legal Risk:**
  - AIIMS is heavily protected under Indian trademark law (Class 41 for education/training and Class 42 for scientific/technological services) and under the **Emblems and Names (Prevention of Improper Use) Act, 1950**.
  - Commercial or public deployment under the name "AIIMS" creates acute risk of immediate Cease & Desist notices, trademark infringement/passing-off litigation, and consumer confusion regarding government or medical affiliation.
- **Required Action:**
  - Conduct an immediate formal trademark search with the Controller General of Patents, Designs and Trade Marks (CGPDTM).
  - Prepare a defensive alternative brand name (e.g. **AINOVA**, which already appears extensively in backend prompts and assets, or a distinct coined mark) to ensure zero launch delay if trademark counsel advises against using "AIIMS".

### 8.2 Legal and Tax Review (GST, Credit Expiry, and Refunds)
- **Goods and Services Tax (GST) in India:**
  - The commercial sale of prepaid digital credits / tokens (e.g. ₹299 = 500 AIIMS Credits) constitutes a supply of digital content or online information database access and retrieval (OIDAR) services under SAC 9984 / SAC 9992.
  - Standard GST rate of **18%** is applicable. The billing engine must calculate GST, issue GST-compliant tax invoices containing mandatory fields (GSTIN, SAC code, state code), and handle place of supply rules (B2C vs. B2B).
- **Credit Expiry & Prepaid Instrument Regulations:**
  - Under the Consumer Protection (E-Commerce) Rules, 2020 and Reserve Bank of India (RBI) guidelines on closed-loop prepaid instruments, arbitrary forfeiture or hidden expiration of purchased credits is subject to legal challenge.
  - Clear, prominent disclosures regarding credit validity (e.g. "Credits valid for 12 months from purchase") must be accepted at checkout.
- **Refund & Cancellation Policy:**
  - A statutory refund policy must be defined: are unspent credits refundable upon account termination? What is the dispute resolution timeframe for failed AI task generations?

### 8.3 Participation of Users Under 18 & India DPDP Act 2023
- **Statutory Mandate:** Under **Section 9 of the Digital Personal Data Protection Act, 2023 (DPDP Act)**:
  1. A data fiduciary must obtain **verifiable consent of the parent or lawful guardian** before processing any personal data of a child (an individual under 18 years of age).
  2. Data fiduciaries are strictly prohibited from undertaking **tracking or behavioral monitoring of children**, or targeted advertising directed at children.
  3. Processing of personal data likely to cause detrimental effects on a child's well-being is prohibited.
- **Required Action:**
  - Unless AIIMS develops a robust, verified parental consent workflow (with guardian ID verification), **users under 18 must be legally barred from participating in v1**.
  - Add an explicit age verification checkbox during registration: *"I confirm that I am 18 years of age or older"*.

### 8.4 Biometric Focus Tracking Hold
- **Context:** The original product concept contemplated camera-based gaze, blink, or facial attention tracking.
- **Privacy Classification:** Biometric signals constitute Sensitive Personal Data or Information (SPDI) under IT Rules 2011 and high-risk processing under the DPDP Act 2023.
- **Required Action:**
  - **Biometric tracking must remain completely parked and absent from v1.**
  - No camera permissions, video streams, or gaze inferences may be collected.
  - Any future reconsideration requires a formal Data Protection Impact Assessment (DPIA), device feasibility study, and explicit opt-in privacy consents. Focus mode in v1 must rely strictly on privacy-safe signals (session timer, task duration, break nudges).

### 8.5 Third-Party Plugin & LLM Data Terms Review
- **CodeRabbit & Antigravity Plugins:**
  - Confirmed: Neither CodeRabbit nor GSD plugins are installed in the repository. "GSD" refers to the development sprint workflow ("Get Shit Done").
  - If third-party AI review plugins or SaaS bots are connected to the GitHub repository, an enterprise review must confirm whether source code, commit messages, or proprietary algorithms are retained or used to train third-party models.
- **LLM Sub-Processors (Anthropic & Google):**
  - Data Processing Addendums (DPAs) must be reviewed for both Anthropic API and Google Cloud Generative AI.
  - Commercial API terms must verify that customer prompts and responses are **zero-data-retention (ZDR)** or exempt from model training.
  - Privacy policy must explicitly disclose Anthropic and Google as sub-processors of student prompt data.

### 8.6 Billing & Mobile App Store Boundaries
- **Web vs. Native In-App Purchase Rules:**
  - If launched on the web / PWA: Traditional Indian payment gateways (Razorpay, Cashfree, PhonePe, Stripe) can be integrated with UPI, cards, and netbanking, complying with RBI two-factor authentication.
  - If distributed via Apple App Store or Google Play Store (via Capacitor or native wrapper):
    - Both Apple App Store Review Guideline 3.1.1 and Google Play Billing policy **strictly mandate the use of native In-App Purchases (IAP)** for all digital credits, virtual currency, and AI features consumed within the app.
    - Commission of 15% to 30% applies.
    - External payment links or alternative checkouts inside native store apps violate store anti-steering guidelines and will lead to app rejection.
  - **Required Action:** Establish an architectural billing boundary: keep top-up purchases exclusively on web/PWA or integrate native StoreKit/Google Play Billing adapters if releasing native builds.

---

## 9. Launch Security Checklist & Verification Matrix

| Area | Item Description | Responsible Role | Pre-Launch Gate Status |
| :--- | :--- | :--- | :--- |
| **Credentials** | Rotate Atlas DB credentials; eliminate fallback secret strings in `env.ts`. | DevOps / Lead Backend | **BLOCKED** (Pending rotation) |
| **Auth** | Eliminate ghost user auto-creation in `auth.middleware.ts`. | Backend Engineering | **BLOCKED** (Code fix needed) |
| **Auth** | Implement Role-Based Access Control (`STUDENT`, `EVALUATOR`, `ADMIN`). | Backend Engineering | **BLOCKED** (Code fix needed) |
| **Routes** | Secure admin routes & `POST /clarity/run-task` behind auth & credit deduction. | Backend Engineering | **BLOCKED** (Code fix needed) |
| **Abuse** | Install `express-rate-limit` across auth and LLM routes. | Backend Engineering | **BLOCKED** (Package missing) |
| **Filesystem** | Replace hardcoded `/Users/nithishkumar07/` path in `server.ts` with relative path. | Backend Engineering | **BLOCKED** (Code fix needed) |
| **Legal** | Formal trademark clearance for "AIIMS" vs. alternative mark. | Legal Counsel / Owner | **BLOCKED** (External action) |
| **Tax** | 18% GST review, tax invoicing format, and refund terms finalized. | Tax Advisor / Owner | **BLOCKED** (External action) |
| **Privacy** | DPDP Act compliance: Age 18+ gate enforced; Biometrics fully disabled. | Product / Legal | **BLOCKED** (Policy confirmation needed) |
| **Store** | Native IAP vs. Web Checkout boundary approved before payment flow launch. | Product Owner | **BLOCKED** (Policy confirmation needed) |

---
*Report compiled autonomously via Antigravity IDE Security Review Subsystem.*
