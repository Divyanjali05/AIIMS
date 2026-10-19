# AIIMS — Product Specification (Version 3.0)

**Document Status:** Formal Architecture & Product Specification Baseline  
**Date:** 18 October 2026  
**Version:** 3.0.0 (Reconciled from Engineering Baseline, Presentation Deck, and Owner Decision Register)  
**Governance Link:** All unresolved options link directly to [OWNER_DECISION_REGISTER.md](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md).  
**Source Materials Notice:** Comparison with the Teacher's ChatGPT conversation and early NOVA transcripts remains incomplete pending file upload.

---

## 1. Discrepancy & Change Summary (v1 / Presentation / Current Baseline vs. v3)

Before establishing the v3 specification, the following reconciliation matrix details every discrepancy identified between earlier sprint instructions, the presentation deck, and the active codebase.

| Functional Area | Earlier Instructions / Spec Draft | Presentation Deck | Current Codebase Implementation | Reconciled v3 Specification Baseline |
| :--- | :--- | :--- | :--- | :--- |
| **Product Name** | AINOVA / NOVA | AINOVA (Deck reported unrenamed) | Mixed: Header displays "AIIMS", backend prompts reference "AINOVA" | **AIIMS (Working Title)**; AINOVA retained as defensive trademark backup ([Decision 12](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-12-trademark-clearance)). |
| **New User Starting Balance** | 150 Credits | 500 Credits | 100 Credits (`User.model.ts:L79`) | **100 Credits baseline** in code; pending owner confirmation of 500 AC ([Decision 4](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-4-new-user-starting-balance)). |
| **Baseline Assessment Cost** | Free (0 Credits) | 100 Credits | Free in code (no deduction triggered on submit) | **Free baseline take (0 AC)**; retake pricing open to owner decision ([Decision 3](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-3-baseline-assessment-cost)). |
| **Level 2–4 Unlocks** | Credit purchase unlock (e.g. ₹299 = 500 AC) | Plan-based level progression | Hardcoded mock lock screen; no plan schema in DB | **Hybrid model proposed**: Workspace unlocked by Plan/Level; tools metered by Credit balance ([Decision 2](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-2-premium-level-unlock-basis)). |
| **First Task Free Trial** | 1 free Clarity task + 1 free Focus task | Not specified (assumed paid) | `POST /clarity/run-task` currently unmetered (0 credits deducted) | **Proposed 1 Free Clarity & 1 Free Focus trial**, followed by mandatory credit deduction ([Decision 5](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-5-first-task-free-trial)). |
| **Daily Check-In Rewards** | Daily check-in (+5 AC) & login streaks | Removed / absent | Not implemented in backend | **Proposed +5 AC / day with server-side UTC lock** pending owner approval ([Decision 6](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-6-daily-check-in-earning-rewards)). |
| **Biometric Focus Tracking** | Webcam gaze/blink tracking | Concept slide present | Zero implementation (no camera code) | **STRICTLY PARKED / EXCLUDED from v1** pending legal & privacy study ([Decision 7](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-7-biometric-focus-tracking-camera--gaze--blink)). |
| **Focus Mode / Session Timer** | Missing / parked | Conceptual productivity timer | Not implemented | **Proposed client-side 25m/5m privacy-safe timer** without biometrics ([Decision 9](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-9-focus-mode--session-timer)). |
| **Regional Language (Telugu)** | Telugu & Tenglish support | Deferred to v1.1 | English-only; Astra TTS catalogued | **Proposed bilingual AI Mentor/Evaluator mode**; UI remains English for v1 ([Decision 8](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-8-telugu--regional-language-support)). |
| **Evaluator Account** | Single learner view | Evaluator mentioned | Zero evaluator role/login in code | **Evaluator role specification defined** (MFA, blind review, prompt execution) ([Section 11](#11-evaluator-account-role-permissions-and-review-workflow)). |

---

## 2. Product Name, Audiences, and Personas

### 2.1 Product Identity
- **Working Name:** AIIMS (AI Intelligence & Mentoring System).
- **Defensive Name:** AINOVA (retained in codebase prompts and legal fallback).
- **Core Mission:** An evidence-based AI capability diagnostic, tool discovery wallet, and hands-on prompt engineering mentoring environment for higher education learners and startup builders.

### 2.2 Primary Target Audiences
1. **Student / AI Learner (Undergraduate & Postgraduate):**
   - *Goal:* Benchmark AI literacy against industry rubrics, discover sanctioned AI tools for research and coursework, overcome prompt design weaknesses, and build verifiable capability.
2. **Entrepreneur / Startup Builder:**
   - *Goal:* Discover production AI tooling, automate venture workflows (market research, pitch drafting, competitive intelligence), and manage team AI token/credit spend.
3. **Academic Evaluator / Mentor:**
   - *Goal:* Perform blind reviews of student prompt submissions, assign rubric scores, execute authorized verification prompts, and provide contextual feedback.
4. **Platform Administrator:**
   - *Goal:* Curate the AI tool catalog, review daily automated tool discovery runs, verify sources, and inspect telemetry.

---

## 3. Onboarding, Registration, and Goal Selection

- **Status:** `[APPROVED - CODE IMPLEMENTED]` (with Age Verification Gate `[PROPOSED - CODE FIX NEEDED]`)
- **Workflow:**
  1. **Landing & Identity Selection:** User registers via `/register` specifying: Full Name, Email, Password, College/Institution, and Primary Persona (`Student` vs. `Entrepreneur`).
  2. **Age Gate Enforcement:** Mandatory checkbox: *"I confirm I am 18 years of age or older"* ([Decision 11](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-11-under-18-users--minor-safeguards)).
  3. **Target Goal Selection:**
     - *Student Goals:* Academic Research & Literature Review, Coding & Software Development, Career Prep & Interview Simulation, Creative & Multimedia AI.
     - *Entrepreneur Goals:* Venture Ideation & Validation, Growth Marketing & Copywriting, Automation & Operations, Financial Modeling & Pitching.
  4. **Initial Account Endowments:**
     - User record created in MongoDB Atlas with `stage: 'Knowing'`, `xpPoints: 100`, and `aiimsCredits: 100` (or 500 if confirmed by Owner) ([Decision 4](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-4-new-user-starting-balance)).
- **Acceptance Criteria:**
  - Password hashed with bcrypt (cost factor 10).
  - Duplicate email registrations rejected with `409 Conflict`.
  - Welcome bonus transaction logged in user's credit ledger.

---

## 4. Student / Entrepreneur Wallet Switch

- **Status:** `[APPROVED - CODE IMPLEMENTED]`
- **Screens:** [Frontend/src/screens/discover/DiscoverScreen.tsx](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/discover/DiscoverScreen.tsx)
- **Functional Behavior:**
  - Header toggle permits seamless switching between **Student View** and **Entrepreneur View**.
  - **Dynamic Filtering:**
    * *Student View:* Ranks and filters tools tailored to coursework, thesis synthesis, citation verification, and academic integrity (e.g. Scite.ai, Claude 3.5 Sonnet, Consensus).
    * *Entrepreneur View:* Emphasizes market intelligence, customer discovery, pitch decks, workflow automation, and financial analysis (e.g. Perplexity Pro, v0 by Vercel, Zapier Central).
  - **Tool Detail Card:** Displays audience badges (`Student`, `Entrepreneur`, or `Both`), credit cost per run, access tier (`Free`, `Freemium`, `Paid`), verification status, and bookmark/wallet save toggle.
- **Dependencies:** Backend catalog taxonomy endpoint `GET /api/wallet/taxonomy`.

---

## 5. Levels, Plans, Feature Entitlements, and Credit Metering

- **Status:** `[PROPOSED - PENDING OWNER DECISIONS 1 & 2]`
- **Governance Link:** [Decision 1](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-1-plan-access-model) & [Decision 2](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-2-premium-level-unlock-basis)

### 5.1 Plan Hierarchy & Entitlements

| Level / Tier | Plan Name | Target Audience | Feature Entitlements | Unlock Prerequisite |
| :--- | :--- | :--- | :--- | :--- |
| **Level 1** | **Explorer (Free)** | All New Users | - Baseline 15-Question Diagnostic<br>- Capability Radar Chart<br>- Browse AI Tool Catalog<br>- 1 Free Clarity & Focus Trial Run | Automatic on registration |
| **Level 2** | **Practitioner** | Active Students | - Full Clarity Prompt Lab (Unlimited Practice)<br>- AI Radar Technical Signals Stream<br>- Personal Reflection Journal<br>- AI Mentor Guidance | Plan Subscription or Approved Milestone |
| **Level 3** | **Specialist** | Advanced Learners & Founders | - Deep Technical Signal Investigation<br>- Sandbox Multi-Model Prompt Execution<br>- Capability Growth Roadmap<br>- Custom Workflow Exports | Plan Subscription |
| **Level 4** | **Mastery / Enterprise** | Evaluators & Institutional Teams | - Human Evaluator Scoring & Review Queue<br>- Cohort Analytics & Assessment Export<br>- Institutional LMS Integration | Institutional License / Admin Grant |

### 5.2 Metering vs. Entitlement Boundary
- **Workspace Entitlement:** Governed strictly by Plan level (Levels 1–4). Users never lose access to their interface when credit balance runs low.
- **Execution Metering:** Live AI calls (running Claude 3.5 Sonnet, Gemini Flash, or candidate tool evaluations) consume spendable **AIIMS Credits (AC)** from the user's wallet.

---

## 6. Purchase & Top-Up Placeholders (No Live Payment Processing)

- **Status:** `[APPROVED - CODE IMPLEMENTED AS PLACEHOLDER / PAYMENT PROCESSING BLOCKED]`
- **Screens:** [Frontend/src/screens/credits/CreditsScreen.tsx](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/credits/CreditsScreen.tsx)
- **Functional Requirements:**
  - Displays credit balance and credit transaction history ledger.
  - **Top-Up Pack Cards (Display Only):**
    * *Starter Pack:* ₹99 → 150 AC
    * *Popular Pack:* ₹299 → 500 AC
    * *Pro Pack:* ₹599 → 1,200 AC
  - **Non-Functional Safe Boundary:** Clicking "Buy Credits" triggers a safe informational modal: *"Payment integration is currently inactive in development preview. Test credits may be earned via diagnostics and challenges."*
  - **Launch Blocker:** No live Razorpay, Stripe, or StoreKit payment gateways may be enabled until 18% GST review, credit refund terms, and mobile store IAP policies are legally cleared ([Security Review Section 8](file:///c:/Users/divya/OneDrive/Documents/AIIMS/SECURITY_LAUNCH_SAFEGUARDS_REVIEW.md#8-external-launch-requirements--regulatory-safeguards)).

---

## 7. Credit Ledger & Approved Earning Events

- **Status:** `[APPROVED - CODE IMPLEMENTED IN CREDITS.CONFIG.TS]`

### 7.1 Single Source of Truth (`CREDIT_RULES`)
Defined in [Backend/src/config/credits.config.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/config/credits.config.ts):

| Event Key | Trigger Condition | Credit Reward (AC) | XP Points | Idempotency & Frequency Rules |
| :--- | :--- | :--- | :--- | :--- |
| `WELCOME_BONUS` | Account Registration | +100 AC *(or +500 AC)* | +0 XP | Exactly once per user lifecycle. |
| `ASSESSMENT_COMPLETION` | Baseline Diagnostic Submission | +50 AC | +100 XP | Exactly once for initial diagnostic take. |
| `LEVEL_QUEST_COMPLETION` | Level Challenge Passed | +10 AC | +50 XP | Exactly once per distinct Level ID (`LEVEL_01`, `LEVEL_02`, etc.). |
| `SIGNAL_INVESTIGATION` | Technical Signal Personal Notes Saved | +30 AC | +100 XP | Exactly once per distinct Signal ID. |
| `CLARITY_TASK_EASY` | Clarity AI Prompt Execution Passed | +15 AC | +50 XP | Once per distinct topic/difficulty/task tuple. |
| `DAILY_CHECKIN` *(Proposed)* | First login of the calendar day | +5 AC *(Proposed)* | +25 XP | Capped at 1 claim per 24h window (server-side UTC lock) ([Decision 6](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-6-daily-check-in-earning-rewards)). |

### 7.2 Ledger Transaction Schema
All balance mutations append an immutable record to `user.transactions`:
```typescript
interface ICreditTransaction {
  id: string;                    // Unique UUID / timestamp-random id
  transactionType: 'EARN' | 'SPEND' | 'LEVEL_COMPLETION' | 'DIAGNOSTIC_REWARD';
  type: 'EARN' | 'SPEND';
  source: 'ASSESSMENT' | 'RADAR' | 'CLARITY' | 'MENTOR' | 'SYSTEM';
  sourceId: string;              // Deterministic idempotency key
  amount: number;
  description: string;
  timestamp: string;             // ISO-8601 UTC string
  previousBalance: number;
  newBalance: number;
}
```

---

## 8. Baseline Assessment & The Five AI Capability Areas

- **Status:** `[APPROVED - CODE IMPLEMENTED]`
- **Services:** [Backend/src/services/assessmentScoring.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/assessmentScoring.ts), [claude.service.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/anthropic/claude.service.ts)
- **Screens:** [Frontend/src/screens/assessment/AssessmentScreen.tsx](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/assessment/AssessmentScreen.tsx)

### 8.1 The Five Capability Dimensions
The diagnostic benchmarks learner responses across five dimensions:
1. **Usage Frequency & Habituation (UF):** Practical familiarity with AI tools in daily workflows.
2. **Evaluation Capability & Critical Judgment (EC):** Ability to detect hallucinations, verify citations, and audit AI outputs.
3. **Workflow Design & Chaining (WD):** Multi-step prompt design, system role prompting, and process automation.
4. **Strategic Vision & Contextual Awareness (SV):** Ethical boundaries, copyright, intellectual property, and architectural trade-offs.
5. **Mentorship Readiness & Knowledge Transfer (MR):** Ability to instruct and mentor others in safe, productive AI utilization.

### 8.2 Assessment Mechanics & Rubric Scoring
- **15 Questions Total:** 12 Multiple Choice Questions (scored via deterministic evidence rubrics) + 3 Open-Ended Response Prompts.
- **Evidence-Based Open-Ended Scoring:** Open-ended answers are evaluated by [claude.service.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/anthropic/claude.service.ts) against strict rubric criteria.
- **Strict Scoring Principles:**
  * No generous bias; no artificial motivational inflation; no forcing into middle range (60–74).
  * Concise, accurate answers are graded on substance, not word length.
  * Score generates a radar profile mapping **Top Capability** and **Primary Growth Area**.

---

## 9. Clarity Lab, Focus Tasks, and Free Trial Rules

- **Status:** `[APPROVED & IMPLEMENTED IN STAGE 1]`
- **Screens:** [Frontend/src/screens/clarity/Level2AITaskLab.tsx](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/clarity/Level2AITaskLab.tsx)
- **Backend Services:** [Backend/src/controllers/clarity.controller.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/clarity.controller.ts) (`runTask`), [Backend/src/routes/clarity.routes.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/routes/clarity.routes.ts)

### 9.1 Clarity Lab Workflow
1. Learner selects an AI capability challenge (e.g. *Checking AI Hallucinations*, *Constructing System Guardrails*).
2. System presents task scenario, objective, and reference context data.
3. Learner drafts an optimized prompt in the Prompt Editor.
4. Clicking **"Run & Evaluate"** transmits prompt to backend.
5. Backend executes prompt against Claude 3.5 / Gemini Flash and evaluates output across 4 rubric dimensions (Clarity, Constraints, Structure, Reliability; 25 points each).

### 9.2 Free-First-Task Trial Rules ([Decision 5](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-5-first-task-free-trial))
- **Trial Rule:** The learner's **very first Clarity execution** and **very first Focus task execution** are complimentary (0 credit deduction).
- **Subsequent Runs:** Mandatory deduction of **10 AIIMS Credits** per execution.
- **Security Guard:** `POST /api/clarity/run-task` must enforce `requireAuth` and verify `user.aiimsCredits >= 10` before triggering external LLM APIs.

---

## 10. Prompt Sandbox & Approved Resource Limits

- **Status:** `[PROPOSED - ENHANCEMENT TO CLARITY LAB]`
- **Purpose:** Provide an exploratory prompt testing sandbox for students and founders to experiment with model behaviors.
- **Enforced Execution Limits:**
  - Maximum user prompt length: **2,500 characters** (prevents token inflation).
  - Maximum output generation: **1,200 tokens**.
  - Rate limiting: Maximum **15 prompt executions per user per minute**.
  - Execution timeout: **30 seconds** via `AbortController`.
  - Content boundary: Input wrapped in `<learner_prompt>` XML delimiters to mitigate prompt injection.

---

## 11. Evaluator Account, Role Permissions, and Review Workflow

- **Status:** `[PROPOSED ARCHITECTURE - CODE IMPLEMENTATION NEEDED]`
- **Governance Link:** [Security Review Section 3.2](file:///c:/Users/divya/OneDrive/Documents/AIIMS/SECURITY_LAUNCH_SAFEGUARDS_REVIEW.md#32-evaluator-access-architecture--least-privilege-workflow)

### 11.1 Evaluator Identity & Permissions
- **Role Definition:** `UserRole.EVALUATOR`. Provisioned strictly via administrator invitation (no self-registration).
- **Mandatory MFA:** Multi-factor authentication (TOTP RFC 6238 / WebAuthn) required upon login.
- **Least-Privilege Scoping:** Evaluators can only access submissions assigned to their cohort queue.

### 11.2 Double-Blind Review Workflow
1. **Submission Queue:** Evaluator logs into `/evaluator/dashboard` to view pending student submissions.
2. **PII Masking:** Student personal identifiers (Name, Email, College, Financial Transactions) are masked with an opaque `SubmissionId` (e.g. `SUB-8942`).
3. **Review & Scoring:** Evaluator reviews the learner's prompt, AI output, and system rubric score. Evaluator can override scores, adjust criteria breakdown, and enter qualitative feedback.
4. **Evaluator-Priced Main Tasks:** Evaluators have authority to set custom credit bounties or assessment costs for advanced institutional milestone tasks.
5. **Immutable Audit Trail:** All evaluator adjustments logged to `EvaluatorAuditLog` collection.

---

## 12. Home Page, Visual System, Icons, Images, and Mentor Guidance

- **Status:** `[APPROVED - CODE IMPLEMENTED WITH REFINEMENTS]`
- **Screens:** [Frontend/src/screens/home/HomeScreen.tsx](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/home/HomeScreen.tsx)

### 12.1 Visual System & Navigation Hierarchy
- **Design Tokens:** Slate/Navy background palette (`#0B1120`, `#1E293B`), Teal/Emerald accents (`#10B981`, `#06B6D4`), and Gold highlights (`#F59E0B`).
- **Typography:** Modern sans-serif (Inter / Outfit) with accessible contrast ratios (WCAG 2.1 AA compliant).
- **Navigation:** Clear sidebar/bottom navigation with semantic icons (Lucide React): Home (`LayoutDashboard`), Assessment (`CheckCircle2`), Wallet (`Compass`), Clarity (`Lightbulb`), Focus (`Target`), Radar (`Radio`), Credits (`Coins`).

### 12.2 Mentor Card & Visual Mascot
- **3D Learner Mascot:** Served via `/api/mascot`. (Must be updated to relative path `public/assets/mascot.jpg` to resolve hardcoded path vulnerability).
- **Dynamic Contextual Mentor:** Evaluates learner state dynamically to surface stage-appropriate advice:
  * Stage 1 (*Knowing*): Prompts user to take baseline diagnostic.
  * Stage 2 (*Clarifying*): Recommends addressing identified growth areas in Clarity Lab.
  * Stage 3 (*Focusing*): Highlights newly ingested technical radar shifts.
- **Resilience:** Automatic fallback to local deterministic mentor observations if backend AI service times out (> 2.5s).

---

## 13. Regional Language Support (Telugu & Tenglish)

- **Status:** `[PROPOSED FOR v1.1 - OWNER DECISION 8]`
- **Governance Link:** [Decision 8](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-8-telugu--regional-language-support)
- **v1 Baseline:** User interface, assessment questions, and navigation remain strictly in **English**.
- **Astra Telugu TTS Tool:** Catalogued in the AI Wallet as an external regional voice tool.
- **Proposed Bilingual Mode (v1.1):** When toggled, AI Mentor and Clarity Evaluator accept learner prompts in Telugu / Tenglish and deliver dual-language feedback without requiring complete UI string re-translation.

---

## 14. Mobile & PWA Plan: Screen Mapping

- **Status:** `[APPROVED ARCHITECTURE - PWA-FIRST STAGED ROLLOUT]`
- **Deployment Strategy:** Responsive PWA-first (manifest, service worker cache) followed by optional Capacitor shell for mobile packaging.

### 14.1 Phone-Sized Screen Mapping

| Screen / Feature | Desktop Layout | Mobile Layout (Phone < 640px) | Touch Target & Accessibility |
| :--- | :--- | :--- | :--- |
| **Home Dashboard** | 3-column grid + Mascot banner | Single-column vertical scroll; sticky top credit chip; collapsible mentor observation card | 48px minimum touch target for CTA buttons. |
| **AI Wallet** | Multi-column filter sidebar + 3-card tool grid | Horizontal filter chips (Student/Entrepreneur pill); full-width tool cards; bottom sheet modal for tool details | Swipe-friendly suggestion chips; sticky search bar. |
| **Diagnostic Assessment** | Split screen (question left, radar preview right) | Full-screen stepper (1 question per screen); sticky bottom "Next / Previous" navigation | Large tap targets for options A–D; clear focus rings. |
| **Clarity Prompt Lab** | Side-by-side prompt editor & AI execution terminal | Tabbed view (*"1. Draft Prompt"* ↔ *"2. AI Result"*); full-screen code/prompt input | Mobile-optimized textarea with auto-capitalization disabled. |
| **Credits & Wallet** | 2-column ledger & pack selector | Vertical cards for top-up placeholders; chronological scroll for transaction history | Native tap feedback on list items. |

---

## 15. Tool Catalogue & Demo Seed Requirements

- **Status:** `[APPROVED - CODE IMPLEMENTED IN SEED SCRIPTS]`
- **Source Files:** [Backend/src/scripts/seedToolCatalog.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/scripts/seedToolCatalog.ts), [toolCatalog.service.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/toolCatalog.service.ts)
- **Catalogue Integrity Requirements:**
  - Every tool entry must provide: `id`, `name`, `category`, `description`, `shortDescription`, `audienceRelevance` (`Student`, `Entrepreneur`, `Both`), `pricingModel` (`Free`, `Freemium`, `Paid`), `creditCost` (AC), and verified `externalUrl`.
  - **Deterministic Demo Seeding:** Executing `npm run seed:tools` must be **strictly idempotent** (`upsert` based on `id` / `url`), preserving real user bookmark data while guaranteeing all standard tools are populated.
  - **Zero-Tool Empty State:** If the database contains zero tools, the frontend must render an instructive empty state with a "Refresh Catalog" button, rather than a blank white screen.

---

## 16. Security, Privacy, Accessibility, and Observability

- **Status:** `[CORE SAFEGUARDS IMPLEMENTED IN STAGE 1]`
- **Security Mandates:**
  - **Secret Rotation:** Proof of rotation required for MongoDB Atlas URI, JWT Secret, Anthropic Key, and Gemini Key ([Security Review Section 2](file:///c:/Users/divya/OneDrive/Documents/AIIMS/SECURITY_LAUNCH_SAFEGUARDS_REVIEW.md#2-credentials--secrets-audit-zero-exposure-policy)).
  - **Ghost Account Removal:** `[RESOLVED IN STAGE 1]` Eliminated user auto-creation in [auth.middleware.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/middleware/auth.middleware.ts).
  - **Route Protection:** `[RESOLVED IN STAGE 1]` Protected `/api/clarity/run-task`, `/api/wallet/discover/trigger`, and `/api/admin/*` behind `requireAuth`.
  - **Rate Limiting:** `[RESOLVED IN STAGE 1]` Implemented in-memory rate limiting middleware ([rateLimit.middleware.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/middleware/rateLimit.middleware.ts)).
  - **Filesystem Security:** `[RESOLVED IN STAGE 1]` Replaced hardcoded machine path in [server.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/server.ts) with relative path to [robot_mascot.jpg](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/public/robot_mascot.jpg).
- **Privacy & Accessibility:**
  - WCAG 2.1 AA contrast compliance across all text and radar charts.
  - Full keyboard accessibility (`Tab`, `Enter`, `Escape`) across modals, tool filters, and prompt editor.
  - Zero storage of webcam or biometric data.
- **Observability:**
  - Structured JSON application logging.
  - Health check endpoints active at `/health` and `/api/health`.

---

## 17. Analytics & Data Retention

- **Status:** `[PROPOSED ARCHITECTURE]`
- **Telemetry Boundaries:**
  - Event tracking strictly limited to product usability metrics: question completion rate, tool bookmarking events, clarity prompt execution counts.
  - **Zero Tracking of Minors:** If minors are ever admitted in future phases, behavioral tracking and profiling are strictly prohibited by Section 9 of the DPDP Act 2023.
- **Data Retention Windows:**
  - Assessment answer histories: Retained for the duration of the student's active account.
  - Transaction ledger: Immutably retained for 7 years to comply with Indian financial and tax auditing standards.
  - Transient prompt execution logs: Flushed after 30 days.

---

## 18. Unresolved Decisions & External Launch Requirements

The following requirements are active launch blockers pending external legal, tax, or owner determination:

| Item | Nature of Requirement | Blocking Impact | Action / Responsibility |
| :--- | :--- | :--- | :--- |
| **Trademark Clearance** | Trademark check on "AIIMS" vs. All India Institute of Medical Sciences | Public marketing and App Store release blocked | Retain IP counsel for CGPDTM search; keep AINOVA ready ([Decision 12](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-12-trademark-clearance)). |
| **18% GST Compliance** | Tax review of credit purchases (SAC 9984) and tax invoices | Top-up checkout launch blocked | Retain chartered accountant to configure GSTIN rules. |
| **Under-18 Gate** | DPDP Act 2023 parental consent mandate | Registration launch blocked without age check | Enforce 18+ age checkbox in v1 ([Decision 11](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-11-under-18-users--minor-safeguards)). |
| **Biometric Ban** | Camera/gaze tracking privacy classification | Parked for v1; no blocker | Feature remains absent from v1 code ([Decision 7](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-7-biometric-focus-tracking-camera--gaze--blink)). |
| **Store Billing Rules** | Apple StoreKit / Google Play Billing IAP rules (15-30% cut) | Mobile app credit purchase blocked | Deploy PWA web billing first; defer native store IAP ([Decision 10](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-10-mobile-app-store-billing-approach)). |

---

## 19. Explicit Out-of-Scope Products & Funding Topics

As codified in [OUT_OF_SCOPE_AND_FUNDING_ISOLATION.md](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OUT_OF_SCOPE_AND_FUNDING_ISOLATION.md), the following topics are **strictly out of scope** and must never be committed to the AIIMS codebase or product backlog:

1. **Expired Funding Applications:** SISFS Seed Fund, UNICEF Venture Fund, Google for Startups Immersion (deadlines passed as of 18 Oct 2026).
2. **Cloud Credit Programs:** Microsoft Founders Hub, AWS Activate, Google Cloud Startup credits (corporate perks, not product features).
3. **Incubator Evaluations & Unsourced Claims:** IIMV FIELD, ā-hub, AIC-SKU, T-Hub; grant success-rate claims.
4. **Financial Projections:** ₹20 Lakh grant budget model and revenue projections.
5. **Proprietary Theory & Patent Drafts:** RDT, ALBE, cognitive formulas (must remain in confidential legal channels to protect international patent novelty).
6. **Auxiliary Products:** Separate Medical ALBE product (healthcare regulatory domain) and separate Climate Module (carbon/ESG tracking).

---
*Maintained under AIIMS Product Architecture & Engineering Governance.*
