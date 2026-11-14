# AIIMS — Consolidated Manual Acceptance Testing Tracker (M-01 through M-35)
## Final Release Verification & User Journey Test Protocol

> **Document Version:** 2.0.0 (Consolidated Release Readiness Edition)  
> **Auditor / Tester:** System Owner / QA Lead  
> **Platform Scope:** Full-Stack Web & Mobile (Frontend React + Vite, Backend Express, PostgreSQL via Prisma)  
> **Environment Targets:** Desktop Chrome, Desktop Edge, Mobile Web (iOS / Android viewports)  
> **Testing Protocol:** Sequential Manual Verification  
> **Overall Execution Status:** **ALL TESTS PENDING (Awaiting Manual Execution)**  
> **Governance Note:** Manual browser tests are intentionally deferred until release approval. No automated test results may be used to mark manual tests as passed.

---

## 1. Testing Protocol & Safety Guidelines

1. **Safety First:** Never test with production credentials, real credit cards, or live personal financial data.
2. **Disposable Accounts:** Use unique disposable test accounts for manual runs (e.g. `manual.student.01@aiims.test`, `manual.founder.01@aiims.test`, `disposable.del@aiims.test`).
3. **No Automated Overwrites:** Do not alter manual test statuses without user-verified execution evidence and browser screenshots.
4. **Defect Logging:** Record exact HTTP error codes, UI discrepancies, and browser console warnings in the Notes field.
5. **Session Isolation:** Use clean Incognito/Private browser windows or separate profiles when testing multi-role or multi-user isolation scenarios.

---

## 2. Summary Dashboard (M-01 through M-35)

| Test ID | Module / Feature Name | Target Persona / Role | Category | Status | Severity if Failed |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **M-01** | Student Track Registration & Welcome Bonus (+500 AC) | Student Learner | Auth & Economy | **PENDING** | Critical |
| **M-01B**| Dynamic Program Duration & Date Validation Bounds | Student Learner | Auth Validation | **PENDING** | High |
| **M-02** | Entrepreneur Track Registration & Venture Onboarding (+500 AC) | Entrepreneur Learner | Auth & Economy | **PENDING** | Critical |
| **M-02B**| Cross-Track Pollution Guard (Venture Fields on Student / Vice Versa) | Both Tracks | Security & Auth | **PENDING** | High |
| **M-03** | Single-Device Hardware Binding & Secondary Device Block (403) | Multi-Device User | Device Security | **PENDING** | High |
| **M-03B**| User Logout, Session Invalidation & Re-Login Persistence | Learner | Session Lifecycle | **PENDING** | High |
| **M-04** | 25-Question Calibrated Diagnostic Assessment Submission (100 AC) | Learner | Assessment Economy | **PENDING** | Critical |
| **M-04B**| Diagnostic Score > 95% High-Score Bonus (+50 AC Exact-Once) | Learner | Credits Incentive | **PENDING** | High |
| **M-05** | 5-Dimension Radar Profile & Benchmark Visualization | Learner | Profile Diagnostics | **PENDING** | High |
| **M-06** | Progressive Entitlements & Level 1 Active Workspace Access | Learner | Entitlements | **PENDING** | Critical |
| **M-07** | Locked Journey Stages (Levels 2–4 Workspace Educational Banners) | Learner | Locked Boundaries | **PENDING** | Medium |
| **M-08** | AI Wallet Tool Catalog Browsing & Grounded Tool Matching | Learner | AI Discovery | **PENDING** | High |
| **M-09** | Clarity AI Task Lab First-Free Attempt Grant (0 AC) | Learner | Clarity Economy | **PENDING** | High |
| **M-10** | Focus Module Pomodoro Deep Work Timer & Audio Controls | Learner | Focus Module | **PENDING** | Medium |
| **M-11** | Staff Evaluator Review Queue, Grading & Rubric Scoring | Evaluator Role | Staff Governance | **PENDING** | High |
| **M-12** | Admin Single-Device Binding Reset via Governance Console | Admin Role | Staff Governance | **PENDING** | High |
| **M-13** | GDPR Account Deletion & Credit Ledger Anonymization (`userId: null`) | Disposable Learner | Privacy & Compliance| **PENDING** | Critical |
| **M-14** | Password Recovery & Reset Flow (Email Token Dispatch) | Learner | Auth Security | **PENDING** | High |
| **M-15** | Login Rate Limiter (5 Failed Attempts Trigger HTTP 429) | Public Auth | Security & Abuse | **PENDING** | High |
| **M-16** | Monetization Honest Preview Mode (`status: 'PREVIEW'`) | Learner | FinTech & Payments | **PENDING** | Critical |
| **M-17** | API Error Handling, Overdraft Protection & Non-Negative Balance | Learner | Financial Integrity | **PENDING** | Critical |
| **M-18** | Mobile Viewports (iPhone SE / Pixel), 44px Touch Targets & Drawer | Mobile Web | UX & Accessibility | **PENDING** | Medium |
| **M-19** | AI Profile Synthesis Modal (50 AC Cost & Remaining Balance Display) | Learner | Profile Generation | **PENDING** | High |
| **M-20** | Atomic 50 AC Profile Deduction & Qualitative Synthesis Generation | Learner | Profile Generation | **PENDING** | Critical |
| **M-21** | AI Profile Refresh Persistence (No Re-Prompt on F5, Version 1 Active) | Learner | Persistence | **PENDING** | High |
| **M-22** | View A: Peer Branch Comparison & K-Anonymity Notice ($N < 5$) | Learner | Comparative Intel | **PENDING** | Medium |
| **M-23** | View B: Overall Cohort Intelligence & Normalization Disclaimer | Learner | Comparative Intel | **PENDING** | Medium |
| **M-24** | AI Wallet Search & Semantic Persona Filtering (Student vs. Founder) | Learner | Tool Discovery | **PENDING** | Medium |
| **M-25** | AI Wallet Operation Confirmation Modal & 100 AC Spend Execution | Learner | Wallet Economy | **PENDING** | High |
| **M-26** | Clarity Task Lab Subsequent Attempt Pre-Charge (10 AC) & Rubric | Learner | Clarity Economy | **PENDING** | High |
| **M-27** | Clarity Automatic 10 AC Refund on AI Provider Network Timeout | Learner | Fault Tolerance | **PENDING** | High |
| **M-28** | Focus Practice Challenge First-Free Attempt (0 AC) | Learner | Focus Economy | **PENDING** | High |
| **M-29** | Focus Subsequent Challenge Pre-Charge (20 AC) & Auto-Refund on Error | Learner | Focus Economy | **PENDING** | High |
| **M-30** | Focus Server-Authoritative Timer Expiry Enforcement (Overtime Rules)| Learner | Focus Integrity | **PENDING** | Medium |
| **M-31** | Cloudflare R2 / Secure File Attachment Upload (10MB & MIME Check) | Learner | Object Storage | **PENDING** | High |
| **M-32** | Unified Journey Activity Feed & Cross-Session Timeline Rendering | Learner | Journey Tracking | **PENDING** | Medium |
| **M-33** | Header Theme Toggle (Light / Dark Mode) & LocalStorage Persistence | Learner | UX & Theming | **PENDING** | Low |
| **M-34** | Cross-Browser Session Persistence & Refresh (Chrome vs. Edge) | Learner | Cross-Browser | **PENDING** | High |
| **M-35** | Admin Financial Ledger Inspection (`GET /admin/billing/summary`) | Admin Role | Audit & Governance | **PENDING** | High |

---

## 3. Detailed Manual Test Specifications

### M-01: Student Track Registration & Welcome Bonus
- **Preconditions:** Clean browser session (Incognito). Dev backend and frontend running.
- **Exact Steps:**
  1. Open frontend (`http://localhost:3000`) and click **"Get Started"** (`/register`).
  2. Select track **"Student"** (ensure card highlights).
  3. Enter Name: `Test Student`, Email: `student.manual@aiims.test`, Password: `Password@1234` (Confirm: `Password@1234`).
  4. On Stage 2 (Academics): Stream: `Technology & Engineering`, Level: `Undergraduate`, Program: `B.Tech`, Specialization: `Computer Science`, Study Year: `3`, Admission Year: `2023`, Graduation Year: `2027`. Select or enter college name: `Apex Autonomous Institute`.
  5. On Stage 3 (AI Preferences): Familiarity: `Exploring AI`, Goal: `Build Software & Real-World AI Apps`.
  6. Click **"Complete Registration"**.
- **Expected Result:**
  - Registration returns HTTP 201.
  - Automatically redirects to Home Dashboard.
  - Header Wallet displays **500 AC**. User avatar and name render in header.
  - Database verification: User record created with `track: "Student"`, `aiimsCredits: 500`. Authoritative `CreditLedger` entry created for `+500 AC` (`WELCOME_BONUS`).
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach screenshot or network trace]`
- **Severity if Failed:** **CRITICAL**

---

### M-01B: Dynamic Program Duration Constraints & Date Validation (Negative Test)
- **Preconditions:** Fresh `/register` session.
- **Exact Steps:**
  1. Navigate to `/register` Stage 2 with track: **"Student"**.
  2. Select Program: **"MBA"** (Duration: 2 Years).
  3. Verify the Study Year dropdown only offers **"Year 1"** and **"Year 2"** (Years 3 and 4 are disabled/absent).
  4. Set Admission Year: `2024` and Expected Graduation Year: `2023` (prior to admission).
  5. Attempt to proceed.
- **Expected Result:** Form blocks submission with inline validation message: "Expected graduation year must be after admission year."
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach screenshot]`
- **Severity if Failed:** **HIGH**

---

### M-02: Entrepreneur Track Registration & Venture Onboarding
- **Preconditions:** Clean browser session (Incognito).
- **Exact Steps:**
  1. Navigate to `/register`.
  2. Select track: **"Entrepreneur"** (ensure entrepreneur card highlights).
  3. Enter Name: `Test Founder`, Email: `founder.manual@aiims.test`, Password: `Password@1234`.
  4. On Stage 2: Notice academic fields (Degree, Branch, Year of Study) are absent. Enter Venture Name: `HealthAI Labs`, Venture Stage: `Exploring Ideas`, Industry: `Healthcare & Lifesciences`, Problem Statement: `Automating clinical documentation`.
  5. On Stage 3: Goal: `Build an AI-Powered Product or SaaS`.
  6. Click **"Complete Registration"**.
- **Expected Result:**
  - Registration returns HTTP 201.
  - Redirects to Home Dashboard. Header Wallet shows **500 AC**.
  - Database verification: `User` created with `track: "Entrepreneur"`, `EntrepreneurProfile` record created with venture metadata. `CreditLedger` logs +500 AC.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach screenshot]`
- **Severity if Failed:** **CRITICAL**

---

### M-02B: Cross-Track Pollution Guard (Negative Test)
- **Preconditions:** API client (curl or Postman).
- **Exact Steps:**
  1. POST `/api/auth/register` with `track: "Student"` and body containing `ventureStage: "exploring_idea"`.
  2. POST `/api/auth/register` with `track: "Entrepreneur"` and body containing `stream: "TECH"` and `yearOfStudy: 3`.
- **Expected Result:** Both requests fail with HTTP 400 (`INVALID_INPUT`) stating cross-track fields are not permitted.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach API response]`
- **Severity if Failed:** **HIGH**

---

### M-03: Single-Device Hardware Binding & Secondary Device Block
- **Preconditions:** Registered user account (`student.manual@aiims.test`).
- **Exact Steps:**
  1. Log into Device 1 (Chrome Desktop). Device binds successfully.
  2. Without logging out of Device 1, open Device 2 (Edge Desktop or Mobile Browser).
  3. Attempt to log in with the same credentials on Device 2.
- **Expected Result:** Device 2 login is rejected with HTTP 403: "This account is already active on another device. Please log out from that device to continue."
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach error dialog screenshot]`
- **Severity if Failed:** **HIGH**

---

### M-03B: User Logout, Session Invalidation & Re-Login Persistence
- **Preconditions:** Active session on Device 1.
- **Exact Steps:**
  1. On Device 1, click profile menu $\rightarrow$ **"Sign Out"**.
  2. Verify redirect to login screen. Cookie `aiims_token` is cleared.
  3. Attempt to navigate back via browser back button $\rightarrow$ Protected routes redirect to `/login`.
  4. Now open Device 2 $\rightarrow$ Sign in with credentials.
- **Expected Result:** Sign in on Device 2 now succeeds smoothly since Device 1 has logged out. Device 2 becomes the bound device.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach screenshot]`
- **Severity if Failed:** **HIGH**

---

### M-04: 25-Question Calibrated Diagnostic Assessment Submission
- **Preconditions:** Logged-in learner with initial 500 AC.
- **Exact Steps:**
  1. Open `/assessment`. Confirm starting balance is 500 AC.
  2. Complete all 25 diagnostic assessment questions across 5 dimensions.
  3. On final review screen, observe fee notice: **100 AC submission fee**.
  4. Click **"Submit Assessment"**.
- **Expected Result:**
  - Assessment is scored server-side.
  - Header Wallet decreases from 500 AC to **400 AC**.
  - `CreditLedger` logs SPEND 100 AC (`assessment_submission`).
  - Redirects to `/analysis` displaying 5-dimension radar profile.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach screenshot of radar & wallet balance]`
- **Severity if Failed:** **CRITICAL**

---

### M-04B: Diagnostic Score > 95% High-Score Bonus
- **Preconditions:** Learner submitting assessment with perfect/near-perfect answers (>95%).
- **Exact Steps:**
  1. Submit assessment yielding overall score of 96%.
  2. Inspect balance after submission.
- **Expected Result:**
  - Fee of 100 AC is deducted, and bonus of +50 AC is awarded. Net balance: $500 - 100 + 50 = 450\text{ AC}$.
  - `CreditLedger` records exact-once bonus transaction.
  - Retrying submission or refreshing does NOT award a second +50 AC bonus.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach ledger screenshot]`
- **Severity if Failed:** **HIGH**

---

### M-05: 5-Dimension Radar Profile & Benchmark Visualization
- **Preconditions:** Assessment completed.
- **Exact Steps:**
  1. Navigate to `/analysis`.
  2. Inspect the 5-dimension radar chart: Usage Frequency, Evaluation Capability, Workflow Design, Strategic Vision, Mentorship Readiness.
  3. Verify each dimension displays a calculated score (0–100%) against industry benchmark.
- **Expected Result:** Radar polygon renders cleanly with high contrast, displaying strengths and growth areas.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach radar chart screenshot]`
- **Severity if Failed:** **HIGH**

---

### M-06: Progressive Entitlements & Level 1 Active Workspace Access
- **Preconditions:** Assessment completed.
- **Exact Steps:**
  1. Inspect sidebar navigation.
  2. Verify Level 1 tabs are unlocked and accessible: Home, Assessment, AI Profile, AI Wallet, Clarity, Focus, Journey.
  3. Click between tabs and verify each screen loads without permission error.
- **Expected Result:** All Level 1 screens are responsive, render learner context, and show accurate balances.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach screenshot]`
- **Severity if Failed:** **CRITICAL**

---

### M-07: Locked Journey Stages (Levels 2–4 Workspace Educational Banners)
- **Preconditions:** Level 1 learner account.
- **Exact Steps:**
  1. Navigate directly to `/radar`, `/investigation`, `/relevance`, `/solver`, `/build`, `/mentor`.
  2. Inspect the screen content.
- **Expected Result:**
  - Screen displays [LockedInterfaceScreen.tsx](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/components/common/LockedInterfaceScreen.tsx).
  - Clear lock icon, feature tagline, educational description, and milestone prerequisite instructions are shown.
  - No broken pages, blank screens, or unauthorized data access occurs.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach locked screen screenshot]`
- **Severity if Failed:** **MEDIUM**

---

### M-08: AI Wallet Tool Catalog Browsing & Grounded Matching
- **Preconditions:** Logged-in learner with completed assessment.
- **Exact Steps:**
  1. Navigate to `/wallet`.
  2. Review the Tool Catalog. Verify verified active tools (ChatGPT, Claude, Cursor, GitHub Copilot, Gamma, NotebookLM, Perplexity, Julius AI) are displayed.
  3. View tool detail cards: categories, domains, capability tags, pricing model.
- **Expected Result:** Tools render with high-contrast badges, pricing tier indicators, and verified external website links.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach wallet screen screenshot]`
- **Severity if Failed:** **HIGH**

---

### M-09: Clarity AI Task Lab First-Free Attempt Grant (0 AC)
- **Preconditions:** Learner who has not yet executed a Clarity task.
- **Exact Steps:**
  1. Navigate to `/clarity`.
  2. Select an active practice topic (e.g. "Prompt Engineering Fundamentals").
  3. In the Prompt Lab, draft an execution prompt and click **"Run Prompt"**.
  4. Notice the pre-charge indicator shows **"Free First Trial"**.
- **Expected Result:**
  - Task executes with AI model. Output and formative rubric guidance appear.
  - Credit balance remains unchanged ($400\text{ AC} \rightarrow 400\text{ AC}$).
  - `CreditLedger` logs atomic first-free claim (`amount: 0 AC`, idempotency key `clarity-first-free-${userId}`).
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach Prompt Lab screenshot and ledger balance]`
- **Severity if Failed:** **HIGH**

---

### M-10: Focus Module Pomodoro Deep Work Timer & Audio Controls
- **Preconditions:** Logged-in learner on `/focus`.
- **Exact Steps:**
  1. Open Focus Module. Select Pomodoro Deep Work session (25 minutes).
  2. Click **"Start Session"**. Verify countdown timer begins.
  3. Test **"Pause"** and **"Resume"**.
  4. Toggle ambient sound / audio chime controls.
- **Expected Result:** Timer updates monotonically every second. Audio controls toggle smoothly without throwing audio API exceptions.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach timer screenshot]`
- **Severity if Failed:** **MEDIUM**

---

### M-11: Staff Evaluator Review Queue & Grading Workflow
- **Preconditions:** Evaluator account (`evaluator@aiims.test`).
- **Exact Steps:**
  1. Sign in as Evaluator.
  2. Access `/evaluator/queue`. Verify pending learner task submissions appear.
  3. Click a submission. Review learner prompt and output against the 3-criteria scoring rubric.
  4. Enter scores (e.g. 25/30, 30/35, 30/35) and qualitative feedback comments.
  5. Click **"Submit Evaluation"**.
- **Expected Result:**
  - Submission status updates to `EVALUATED`.
  - Learner receives evaluation feedback in activity feed.
  - Evaluators cannot access `/admin/billing/summary` or `/admin/audit-logs` (HTTP 403 Forbidden).
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach evaluation queue screenshot]`
- **Severity if Failed:** **HIGH**

---

### M-12: Admin Single-Device Binding Reset via Governance Console
- **Preconditions:** Admin account (`admin@aiims.test`).
- **Exact Steps:**
  1. Sign in as Admin. Access `/admin/device-reset`.
  2. Enter target learner email (`student.manual@aiims.test`).
  3. Reason: `User replaced lost mobile device`.
  4. Click **"Reset Device Binding"**.
- **Expected Result:**
  - Device reset succeeds with HTTP 200.
  - Target user's `bindingStatus` resets to `UNBOUND`.
  - Target learner can now log in on a new device.
  - Audit trail record is created in `DeviceResetAudit` table.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach admin reset screenshot]`
- **Severity if Failed:** **HIGH**

---

### M-13: GDPR Account Deletion & Credit Ledger Anonymization
- **Preconditions:** Disposable learner account (`disposable.del@aiims.test`) with recorded transactions.
- **Exact Steps:**
  1. Sign in as disposable learner. Open `/settings` $\rightarrow$ Account Management.
  2. Click **"Delete Account"**. Confirm with password prompt.
  3. Query database directly or inspect financial ledger via admin.
- **Expected Result:**
  - User record, sessions, and device bindings are deleted from PostgreSQL.
  - Historical `CreditLedger` entries are preserved for financial audit consistency but anonymized with `userId: null` and metadata stripped.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach database query output or deletion screenshot]`
- **Severity if Failed:** **CRITICAL**

---

### M-14: Password Recovery & Reset Flow
- **Preconditions:** Logged-out browser session.
- **Exact Steps:**
  1. Open `/login` and click **"Forgot Password?"**.
  2. Enter registered email (`student.manual@aiims.test`).
  3. Click **"Send Reset Link"**.
- **Expected Result:**
  - API returns generic success message preventing email enumeration.
  - Reset token generated with cryptographic randomness and 1-hour expiry.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach screenshot]`
- **Severity if Failed:** **HIGH**

---

### M-15: Login Rate Limiter (5 Failed Attempts Trigger HTTP 429)
- **Preconditions:** Logged-out browser session.
- **Exact Steps:**
  1. Open `/login`.
  2. Submit incorrect password 5 consecutive times for the same email.
  3. Observe response on the 5th/6th attempt.
- **Expected Result:**
  - Rate limiter triggers HTTP 429: "Too many login attempts. Please try again after 15 minutes."
  - Successful logins do NOT increment the failure counter (`skipSuccessfulRequests: true`).
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach rate limit error screenshot]`
- **Severity if Failed:** **HIGH**

---

### M-16: Monetization Honest Preview Mode
- **Preconditions:** Logged-in learner account.
- **Exact Steps:**
  1. Open `/credits` or `/wallet` $\rightarrow$ Credit Plans.
  2. Inspect the payment gateway preview card.
- **Expected Result:**
  - UI displays honest status banner: **"PREVIEW MODE — Gateway Integration Pending"**.
  - No simulated "fake success" card charges exist. Zero real credit cards can be entered.
  - Available credit balance reflects only verified database ledger earnings.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach preview mode screenshot]`
- **Severity if Failed:** **CRITICAL**

---

### M-17: API Error Handling, Overdraft Protection & Non-Negative Balance
- **Preconditions:** Learner with low balance (e.g. 5 AC).
- **Exact Steps:**
  1. Attempt to execute an action costing 100 AC (e.g. AI Wallet deep operation or duplicate assessment).
  2. Observe network response and UI alert.
- **Expected Result:**
  - Request is rejected with HTTP 402: "Insufficient AIIMS Credits".
  - Balance remains strictly non-negative ($\ge 0$). Zero overdraft is permitted.
  - No raw SQL or stack traces are exposed in response.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach error dialog screenshot]`
- **Severity if Failed:** **CRITICAL**

---

### M-18: Mobile Viewports, 44px Touch Targets & Drawer Navigation
- **Preconditions:** Browser DevTools device emulation set to iPhone SE (375px width).
- **Exact Steps:**
  1. Open mobile viewport.
  2. Open mobile slide-out drawer menu.
  3. Test tap target sizes for buttons and navigation pills (measure minimum 44x44px).
  4. Press Escape / back button or swipe to close drawer.
- **Expected Result:** Drawer opens and dismisses cleanly. No horizontal scrollbar appears. Tap targets meet WCAG 2.5.5 touch target size standards.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach mobile screenshot]`
- **Severity if Failed:** **MEDIUM**

---

### M-19: AI Profile Synthesis Modal
- **Preconditions:** Learner with completed assessment on `/analysis`.
- **Exact Steps:**
  1. Navigate to `/analysis` $\rightarrow$ `'me'` tab.
  2. Locate the AI Profile card and click **"Generate AI Learner Profile (50 AC)"**.
- **Expected Result:** Modal appears displaying the 50 AC cost, current balance, remaining balance after deduction, and safe refund assurance.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach modal screenshot]`
- **Severity if Failed:** **HIGH**

---

### M-20: Atomic 50 AC Profile Deduction & Qualitative Synthesis Generation
- **Preconditions:** AI Profile modal open. Current balance: 400 AC.
- **Exact Steps:**
  1. Click **"Confirm & Generate"** inside modal.
  2. Observe loading animation during AI generation.
- **Expected Result:**
  - Balance decreases by exactly 50 AC ($400 \rightarrow 350\text{ AC}$).
  - `CreditLedger` logs SPEND 50 AC (`ai_profile_generation`).
  - Executive summary, strengths, growth areas, and recommended focus render cleanly.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach generated profile screenshot]`
- **Severity if Failed:** **CRITICAL**

---

### M-21: AI Profile Refresh Persistence
- **Preconditions:** Generated AI Profile active.
- **Exact Steps:**
  1. Refresh the page (F5) or log out and log back in.
  2. Navigate to `/analysis`.
- **Expected Result:** AI Profile displays immediately without re-prompting for 50 AC. "Version 1" badge is active.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach screenshot]`
- **Severity if Failed:** **HIGH**

---

### M-22: View A: Peer Branch Comparison & K-Anonymity Notice
- **Preconditions:** Learner on `/analysis`.
- **Exact Steps:**
  1. Switch to `'compare'` tab.
  2. Inspect branch cohort metrics.
- **Expected Result:** If cohort size $N < 5$, a privacy disclaimer is shown: "Cohort comparison requires at least 5 peers in your branch to protect student privacy." Zero individual peer PII is displayed.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach compare tab screenshot]`
- **Severity if Failed:** **MEDIUM**

---

### M-23: View B: Overall Cohort Intelligence & Normalization Disclaimer
- **Preconditions:** Learner on `/analysis`.
- **Exact Steps:**
  1. Switch to `'overall'` tab.
  2. Inspect cross-discipline percentile benchmarks.
- **Expected Result:** Renders overall institutional distribution with clear methodology disclaimer on academic normalization.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach overall tab screenshot]`
- **Severity if Failed:** **MEDIUM**

---

### M-24: AI Wallet Search & Semantic Persona Filtering
- **Preconditions:** Logged-in user on `/wallet`.
- **Exact Steps:**
  1. In the tool search box, enter keywords (e.g. "code", "finance", "presentation").
  2. Toggle persona filters (Student tools vs. Entrepreneur tools).
- **Expected Result:** Catalog filters in real time without lagging. Tools matching the selected persona and keywords appear with relevance scores.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach search screenshot]`
- **Severity if Failed:** **MEDIUM**

---

### M-25: AI Wallet Operation Confirmation Modal & 100 AC Spend
- **Preconditions:** Logged-in learner with balance $\ge 100\text{ AC}$.
- **Exact Steps:**
  1. Select an AI tool deep operation or grounded synthesis action costing 100 AC.
  2. Click **"Execute Operation"**. Review cost confirmation modal.
  3. Confirm execution.
- **Expected Result:** Balance decreases by 100 AC. Tool output generates with source evidence citations. `CreditLedger` records SPEND 100 AC.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach modal and output screenshot]`
- **Severity if Failed:** **HIGH**

---

### M-26: Clarity Task Lab Subsequent Attempt Pre-Charge (10 AC)
- **Preconditions:** Learner who has already consumed the free trial. Balance: 350 AC.
- **Exact Steps:**
  1. Open `/clarity` and select a practice task.
  2. Notice fee badge displays **"10 AC per attempt"**.
  3. Submit a new prompt.
- **Expected Result:**
  - Balance decreases from 350 AC to **340 AC**.
  - `CreditLedger` records SPEND 10 AC (`clarity_task_attempt`).
  - AI evaluation and rubric scoring render successfully.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach balance & rubric screenshot]`
- **Severity if Failed:** **HIGH**

---

### M-27: Clarity Automatic 10 AC Refund on AI Provider Timeout
- **Preconditions:** Simulated provider timeout or network disconnection during task evaluation.
- **Exact Steps:**
  1. Trigger an evaluation where AI provider throws 503 or timeout after credit deduction.
  2. Inspect balance and ledger history.
- **Expected Result:**
  - Controller catches error and automatically executes REFUND 10 AC with idempotency key `refund::${operationId}`.
  - Net balance remains unchanged. User receives friendly error: "AI provider timed out. Your 10 AC have been automatically refunded."
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach ledger refund entry]`
- **Severity if Failed:** **HIGH**

---

### M-28: Focus Practice Challenge First-Free Attempt (0 AC)
- **Preconditions:** Learner navigating to `/focus` challenges.
- **Exact Steps:**
  1. Select a category (e.g. "Prompt Engineering", "Evaluation & Auditing", or "Agentic Systems").
  2. Start an Easy Challenge (10 min timer).
  3. Notice first attempt in category is labeled **"Free First Attempt"**.
  4. Submit solution.
- **Expected Result:**
  - Solution is evaluated.
  - Credits are NOT deducted (0 AC charged).
  - First-free grant is claimed atomically via `CreditLedger`.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach challenge submission screenshot]`
- **Severity if Failed:** **HIGH**

---

### M-29: Focus Subsequent Challenge Pre-Charge (20 AC) & Auto-Refund
- **Preconditions:** Learner attempting a second challenge in the same category. Current balance: 340 AC.
- **Exact Steps:**
  1. Select a second challenge in the category. Notice fee badge: **20 AC**.
  2. Start and submit solution.
- **Expected Result:**
  - Balance decreases by 20 AC ($340 \rightarrow 320\text{ AC}$).
  - `CreditLedger` logs SPEND 20 AC.
  - If AI rubric generation encounters an error, 20 AC is automatically refunded.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach challenge ledger screenshot]`
- **Severity if Failed:** **HIGH**

---

### M-30: Focus Server-Authoritative Timer Expiry Enforcement
- **Preconditions:** Active Focus challenge with 600s duration.
- **Exact Steps:**
  1. Start challenge.
  2. Allow timer to expire past the allocated limit + grace period.
  3. Submit solution after expiration.
- **Expected Result:** Server recognizes overtime completion. Challenge is marked completed under overtime tier (0 XP overtime reward, preventing timer tampering via client clock manipulation).
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach overtime completion screenshot]`
- **Severity if Failed:** **MEDIUM**

---

### M-31: Cloudflare R2 / Secure File Attachment Upload
- **Preconditions:** Active Focus challenge supporting file attachments.
- **Exact Steps:**
  1. Upload a valid 2MB PDF document.
  2. Attempt to upload an invalid file extension (e.g. `.exe`, `.bat`).
  3. Attempt to upload a file exceeding 10MB.
- **Expected Result:**
  - Valid PDF uploads successfully with sanitized object key `focus-attachments/${userId}/${attemptId}/${fileName}`.
  - Invalid MIME types and oversized files are rejected on client and server with HTTP 400.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach upload screenshot]`
- **Severity if Failed:** **HIGH**

---

### M-32: Unified Journey Activity Feed & Cross-Session Timeline
- **Preconditions:** Learner with multiple completed actions (Assessment, Clarity, Focus, Profile).
- **Exact Steps:**
  1. Navigate to `/journey`.
  2. Review the chronological activity feed.
- **Expected Result:** All completed milestones appear in order with accurate timestamps, XP gained, AC spent/earned, and stage progression indicators.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach journey feed screenshot]`
- **Severity if Failed:** **MEDIUM**

---

### M-33: Header Theme Toggle & LocalStorage Persistence
- **Preconditions:** Logged-in learner.
- **Exact Steps:**
  1. Click the Sun/Moon theme toggle icon in the header.
  2. Verify UI transitions smoothly between Light theme and Dark theme.
  3. Refresh the page (F5) or close and reopen tab.
- **Expected Result:** Theme preference persists in `localStorage` and applies immediately on page reload without flash of unstyled content.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach theme toggle screenshot]`
- **Severity if Failed:** **LOW**

---

### M-34: Cross-Browser Session Persistence & Refresh (Chrome vs. Edge)
- **Preconditions:** User session active.
- **Exact Steps:**
  1. Verify login, navigation, and page reloads in Google Chrome.
  2. Verify login, navigation, and page reloads in Microsoft Edge.
- **Expected Result:** Both browsers handle httpOnly authentication cookies, local storage state, and WebGL 3D scenes consistently with zero rendering errors.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach screenshots in Chrome & Edge]`
- **Severity if Failed:** **HIGH**

---

### M-35: Admin Financial Ledger Inspection (`GET /admin/billing/summary`)
- **Preconditions:** Admin account (`admin@aiims.test`).
- **Exact Steps:**
  1. Sign in as Admin. Access `/admin/billing/summary`.
  2. Inspect the monetization status and ledger metrics.
- **Expected Result:**
  - Returns honest status: `paymentGatewayIntegrated: false`, `paymentGatewayStatus: "PREVIEW"`.
  - Displays total users, total ledger entries, circulating credits sum, total earned, total spent, and net balance with zero discrepancy.
- **Actual Result:** `[To be recorded by tester]`
- **Status:** **PENDING**
- **Evidence:** `[Attach billing summary screenshot]`
- **Severity if Failed:** **HIGH**
