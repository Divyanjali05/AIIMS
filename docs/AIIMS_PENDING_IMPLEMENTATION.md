# AIIMS — Pending Implementation & Technical Debt Register

**Audit Date:** November 2, 2026
**Auditor:** Senior Software Architect & Full-Stack Lead
**Document Status:** Implementation Roadmap & Gap Register

---

## 1. Feature Implementation Matrix

| Module / Feature | Current Codebase Status | Missing / Incomplete Components | Required Layer Changes | Owner Decision Reference |
| :--- | :---: | :--- | :--- | :--- |
| **Authentication & RBAC** | **Implemented** | - 18+ age verification checkbox on registration<br>- Single-device / one-account-one-device session tracking | Backend (`auth.controller.ts`), Frontend (`RegisterScreen.tsx`), DB (`sessions` field) | [Decision 11](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-11-under-18-users--minor-safeguards) |
| **Home Dashboard** | **Implemented** | - Real-time cohort percentile feeds<br>- Multi-tenant institutional branding | Frontend (`HomeScreen.tsx`), Backend (`assessment.controller.ts`) | [Decision 1](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-1-plan-access-model) |
| **Assessment Diagnostic** | **Implemented** | - Dynamic retake cost policy (100 AC vs free retakes)<br>- Production aggregation for peer benchmarks (min 30 records) | Backend (`assessment.controller.ts`), DB (`AssessmentAttempt` history) | [Decision 3](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-3-baseline-assessment-cost) |
| **My AI Profile (Analysis)** | **Implemented** | - Server-side PDF / credential export<br>- Real cohort comparative metrics | Backend (`assessment.controller.ts`), Frontend (`AnalysisScreen.tsx`) | Open |
| **Clarity Prompt Lab** | **Implemented** | - First task free trial enforcement (0 AC vs 10 AC)<br>- Prompt version history persistence | Backend (`clarity.controller.ts`), DB (`User.clarity.trialRunsUsed`) | [Decision 5](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-5-first-task-free-trial) |
| **Focus Module** | **Partially Implemented** | - Privacy-safe Pomodoro timer implemented<br>- Camera / gaze biometric tracking strictly excluded<br>- Focus session credit rewards pending approval | Frontend (`FocusScreen.tsx`), Backend (`investigation.controller.ts`) | [Decision 7](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-7-biometric-focus-tracking-camera--gaze--blink), [Decision 9](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-9-focus-mode--session-timer) |
| **AI Radar Stream** | **Partially Implemented** | - Feed rendering works in UI<br>- Live signal scraping / ingest pipeline is currently mock<br>- Unauthenticated follow endpoint needs auth | Backend (`investigation.controller.ts`), DB (`Signal` schema) | [Decision 10](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-10-community-features-vs-monitored-cohorts) |
| **Signal Investigation** | **Partially Implemented** | - Evidence vault UI works<br>- Real LLM multi-angle synthesis needs API key wiring | Backend (`investigation.controller.ts`), Frontend (`InvestigationScreen.tsx`) | Open |
| **AI Wallet & Discovery** | **Partially Implemented** | - Catalog & filters work<br>- Unauthenticated write endpoints exist<br>- Duplicate services (`toolCatalog` & `toolDiscovery`) | Backend (`aiWallet.routes.ts`, `aiWallet.controller.ts`, service cleanup) | [Decision 4](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-4-new-user-starting-balance) |
| **Credits & Ledger** | **Implemented** | - Server-authoritative `CreditLedger` active<br>- Client-side `awardCredits` must be removed<br>- Razorpay/Stripe payment gateway integration pending | Frontend (`LearnerContext.tsx`), Backend (`credits.controller.ts`) | [Decision 2](file:///c:/Users/divya/OneDrive/Documents/AIIMS/OWNER_DECISION_REGISTER.md#decision-2-premium-level-unlock-basis) |
| **Evaluator & Review Queue**| **Implemented** | - Role-gated review queue, blind evaluation, rubric scores active<br>- Zod request validation needed | Backend (`evaluator.routes.ts`, `submission.routes.ts`) | Open |
| **Admin Dashboard** | **Implemented** | - Evaluator provisioning, task catalogue, audit logs active<br>- Zod request validation needed | Backend (`admin.routes.ts`, `admin.controller.ts`) | Open |

---

## 2. Required Database & Schema Changes

1. **User Model (`Backend/src/models/User.model.ts`):**
   - Add `plan` field: `plan: { type: String, enum: ['free', 'practitioner', 'specialist', 'mastery'], default: 'free' }` to support Plan Entitlements (Decisions 1 & 2).
   - Add `deviceSessions` array: `deviceSessions: [{ deviceId: String, userAgent: String, ipAddress: String, lastActive: Date }]` to support single-device binding (CWE-384).
   - Add `ageConfirmedAt: { type: Date }` to record explicit 18+ age verification.
   - Separate large sub-documents (`focus.sessionHistory`, `investigation.evidenceVault`) into dedicated sub-collections or optimize with projection to avoid single-document 16MB BSON limits.
2. **Tool Catalog Models (`aiTool.model.ts`):**
   - Clean up schema mismatches between `toolCatalog.service.ts` and `wallet/toolCatalog.service.ts`.
3. **Database Index Migration:**
   - Run `npm run db:index` during deployment to ensure all compound indexes are built before production traffic.

---

## 3. Required Backend Changes

1. **Fix Windows Build Script (`Backend/package.json`):**
   - Replace `"clean": "rm -rf dist"` with a cross-platform command (e.g., `"clean": "node -e \"require('fs').rmSync('dist', { recursive: true, force: true })\""` or `rimraf dist`).
2. **Security Remediation:**
   - **`learner.controller.ts`:** Strip `role`, `assessment`, and `credits` from `PUT /learner/state`. Prevent client-driven role escalation.
   - **`aiWallet.routes.ts`:** Add `requireAuth` to `/wallet/user`, `/wallet/add`, and `/wallet/update-familiarity`. Add `requireRole('admin')` to `/admin/sources` and `/admin/verify/:toolId`.
   - **`investigation.routes.ts`:** Add `requireAuth` to `POST /focus/override` and `POST /radar/follow`. Replace mock-array mutations with per-user DB writes.
   - **`auth.controller.ts`:** Remove plaintext password fallback `user.password === password`. Enforce bcrypt only.
   - **`assessment.controller.ts`:** Remove hardcoded mock responses from `getComparativeAnalysis` and `getOverallAnalysis`.
3. **Architecture & Service Deduplication:**
   - Remove orphaned `Backend/src/services/toolCatalog.service.ts` in favor of `Backend/src/services/wallet/toolCatalog.service.ts`.
   - Reconcile `services/toolDiscovery.service.ts` and `services/wallet/toolDiscovery.service.ts`.
   - Reconcile `services/toolVerification.service.ts` and `services/wallet/toolVerification.service.ts`.
4. **Zod Validation Middleware:**
   - Create and apply Zod schemas for `PUT /learner/state`, `POST /submissions`, `POST /evaluator/submissions/:id/review`, and all `/wallet/*` mutation endpoints.

---

## 4. Required Frontend Changes

1. **Remove Client-Side Credit Manipulation:**
   - Remove `awardCredits` from `LearnerContext.tsx`. Make `credits.balance` strictly read-only from `/api/credits/wallet`.
2. **State Sync & Hydration Architecture:**
   - Stop debounced bulk push of client `state` to `PUT /learner/state`. State updates must occur through focused server mutations, and the client must pull authoritative updates.
3. **Break Down Monolithic React Screens:**
   - Refactor `AIWalletScreen.tsx` (~3,737 lines) into modular sub-components: `WalletSearchBar`, `ToolCardGrid`, `ToolDetailModal`, `ToolComparisonView`.
   - Refactor `AssessmentScreen.tsx` (~2,601 lines) into `AssessmentIntro`, `QuestionPager`, `EvidenceRadarSummary`.
   - Refactor `HomeScreen.tsx` (~1,968 lines) into `HeroBanner`, `JourneyStageMap`, `QuickActionCards`.
4. **Registration Screen Age Gate:**
   - Add mandatory `"I confirm I am 18 years of age or older"` checkbox in `RegisterScreen.tsx`.

---

## 5. External Dependencies & Infrastructure Needs

1. **MongoDB Atlas Production Connectivity:**
   - Network firewall allowlist rules for backend production nodes.
2. **Third-Party AI API Credentials:**
   - Valid Anthropic API key (`ANTHROPIC_API_KEY`) for Claude rubric evaluations.
   - Valid Google Gemini API key (`GEMINI_API_KEY`) for Gemini flash completions.
3. **Payment Gateway Integration:**
   - Integration with Razorpay (India INR) or Stripe for credit top-up and plan subscriptions.

---

## 6. Owner Decision Register Alignment (12 Decisions)

| Decision # | Subject | Current Code Default | Unresolved Choices / Options | Action Needed |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Plan Access Model | Hardcoded lock screens | Option 1A (Pure Tiers) vs 1B (Add-ons) vs 1C (Audience Differentiated) | Select plan model |
| **2** | Premium Level Unlock Basis | Hardcoded lock screens | Option 2A (Subscription) vs 2B (Credits Top-up) vs 2C (Hybrid) | Confirm hybrid vs pure plan |
| **3** | Baseline Assessment Cost | Free (0 AC) in code | Option 3A (100 AC) vs 3B (Free) vs 3C (Free 1st take, Paid retakes) | Confirm 0 AC baseline |
| **4** | New User Starting Balance | 100 AC in `User.model.ts` | Option 4A (500 AC) vs 4B (100 AC) vs 4C (150 AC) | Confirm 100 AC vs 500 AC |
| **5** | First Task Free Trial | 1st trial free in Clarity | Option 5A (Yes - Free trial) vs 5B (Immediate deduction) | Approve 1st trial free policy |
| **6** | Daily Check-In Earning Rewards| Not implemented | Option 6A (+5 AC/day) vs 6B (Streaks) vs 6C (No daily rewards) | Decide if +5 AC daily check-in is active |
| **7** | Biometric Focus Tracking | Parked / Not in code | Exclude completely (Recommended) | Formalize exclusion in privacy policy |
| **8** | Regional Language (Telugu) | English-only in code | English-only for v1.0 (Recommended) | Defer to v1.1 |
| **9** | Focus Mode Session Timer | Privacy Pomodoro active | Client-side timer (Approved) | Formalize 25m/5m parameters |
| **10** | Community vs Cohorts | Monitored cohorts active | Monitored academic cohorts (Approved) | Restrict peer comparisons to verified cohorts |
| **11** | Under-18 / Minor Safeguards | Incomplete | Mandatory 18+ checkbox (Approved) | Implement age gate in UI & backend |
| **12** | Trademark & Brand Name | "AIIMS" throughout | AIIMS (Primary) with AINOVA defensive backup | Keep AIIMS everywhere |

