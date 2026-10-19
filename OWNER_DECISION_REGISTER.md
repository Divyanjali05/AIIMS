# AIIMS Owner Decision Register
**Document Status**: Official Architecture & Product Alignment Register  
**Audit Reference**: AIIMS Product Alignment & Coverage Audit  
**Rule**: These 12 open decisions require explicit owner determination. No code change that depends on an unresolved decision shall be committed until the respective choice is confirmed.

---

### Decision 1: Plan Access Model
- **Core Question**: Which plan-access model should govern product features and tool availability?
- **Available Options**:
  - **Option 1A (Pure Subscription Tiers)**: Fixed levels (Level 1 Free; Levels 2–4 Plan-based). Upgrading plan permanently unlocks higher interfaces.
  - **Option 1B (Feature Add-On / Bundle Model)**: Modular unlocks where users purchase individual tool bundles (e.g. AI Radar pass, Mentor Lab pass).
  - **Option 1C (Audience-Differentiated Plans)**: Dedicated "Student Pro" vs. "Startup Founder Enterprise" plans with distinct feature entitlements.
- **Consequences**:
  - *Option 1A*: Cleanest mental model, lowest technical complexity, easy to test and audit.
  - *Option 1B*: High catalog maintenance overhead, confusing checkout paths.
  - *Option 1C*: Strongest market segmentation, but requires maintaining dual role matrices.
- **Affected System Areas**:
  - *Screens*: `Sidebar.tsx`, `App.tsx`, `LockedInterfaceScreen.tsx`
  - *Services*: `learner.controller.ts`, `auth.middleware.ts`
  - *Data Models*: `User.model.ts` (`user.plan`)
  - *Tests*: `fullStackAuditTest.ts`
- **Current Baseline / Conflict Status**: Spec mentions 4 conceptual levels; codebase currently hardcodes `LOCKED_INTERFACES` without a persistent plan field on `IUser`.

---

### Decision 2: Premium Level Unlock Basis
- **Core Question**: Should premium levels (Levels 2–4) unlock strictly by plan subscription, credit top-up purchase, or a hybrid combination?
- **Available Options**:
  - **Option 2A (Pure Plan Subscription)**: Plan level is the sole unlock gate. Credits are purely consumptive fuel.
  - **Option 2B (Cumulative Credit Top-Up Gates)**: Reaching lifetime purchase thresholds (e.g. ₹299 for 500 AC) unlocks Level 2.
  - **Option 2C (Hybrid - Recommended)**: Plan subscription unlocks the workspace interfaces; spendable credit balance meters live AI tool execution.
- **Consequences**:
  - *Option 2A*: Predictable; users never lose workspace access when credits run low.
  - *Option 2B*: Risk of regressive lockout anti-pattern if usable balance drops below threshold, or free-rider abuse if earned credits count toward unlock.
  - *Option 2C*: Standard industry SaaS pattern (like ChatGPT Plus + API credits); eliminates credit vs entitlement conflict.
- **Affected System Areas**:
  - *Screens*: `CreditsScreen.tsx`, `LockedInterfaceScreen.tsx`, `App.tsx`
  - *Services*: `credits.controller.ts`, `credits.config.ts`
  - *Data Models*: `User.model.ts` (`aiimsCredits`, `transactions`, `plan`)
  - *Tests*: `verifyCreditsSystem.ts`
- **Current Baseline / Conflict Status**: Presentation implies plan levels; an earlier product request requested top-up unlocks.

---

### Decision 3: Baseline Assessment Cost
- **Core Question**: Should taking the initial baseline diagnostic assessment cost 100 credits, or should it be free?
- **Available Options**:
  - **Option 3A (100 Credits Upfront)**: Deduct 100 credits from user's starting balance before beginning the assessment.
  - **Option 3B (Free Entry Point - 0 Credits)**: Free diagnostic assessment for all new users; establishes baseline without paywall friction.
  - **Option 3C (Free Initial Take, Paid Retakes)**: Initial attempt is 100% free; subsequent retakes cost 50–100 credits.
- **Consequences**:
  - *Option 3A*: Depletes user starting balance immediately; if starting balance is under 100, blocks onboarding entirely.
  - *Option 3B*: Maximizes onboarding funnel conversion and initial data capture.
  - *Option 3C*: Protects against AI evaluation compute spam while preserving zero-friction onboarding.
- **Affected System Areas**:
  - *Screens*: `AssessmentScreen.tsx` (Pre-assessment cost modal / start button)
  - *Services*: `assessment.controller.ts`, `credits.controller.ts`
  - *Data Models*: `User.model.ts` (`assessment.status`, `aiimsCredits`)
  - *Tests*: `verifyCreditsSystem.ts`
- **Current Baseline / Conflict Status**: Presentation slide deck explicitly lists "100 Credits" cost; earlier draft suggested free access.

---

### Decision 4: New User Starting Balance
- **Core Question**: What initial credit balance should be granted to a user upon registration?
- **Available Options**:
  - **Option 4A (500 Credits)**: Presentation deck value; covers 100 AC assessment + multiple Clarity AI tasks.
  - **Option 4B (100 Credits)**: Current active code default in `User.model.ts`.
  - **Option 4C (150 Credits)**: Earlier draft specification number.
  - **Option 4D (0 Credits)**: Strict pay-to-play requiring immediate top-up.
- **Consequences**:
  - *Option 4A*: Excellent first-session exploration; slightly higher unmonetized LLM compute cost.
  - *Option 4B*: If assessment costs 100 AC, leaves user at 0 AC immediately after the diagnostic.
  - *Option 4D*: Drastically reduces registration completion rate.
- **Affected System Areas**:
  - *Models*: `User.model.ts` (`aiimsCredits: { type: Number, default: ... }`)
  - *Services*: `auth.controller.ts`, `credits.config.ts` (`WELCOME_BONUS`)
  - *Tests*: `fullStackAuditTest.ts`, `verifyCreditsSystem.ts`
- **Current Baseline / Conflict Status**: Code currently initializes with 100 credits.

---

### Decision 5: First Task Free Trial
- **Core Question**: Should the learner's first Clarity AI task run and first Focus task run each be free (0 credit deduction)?
- **Available Options**:
  - **Option 5A (Yes - First Task Free)**: Grant 1 free execution on Clarity Lab and 1 free execution on Focus Track.
  - **Option 5B (No - Immediate Deduction)**: Standard credit deduction applies from the very first run.
- **Consequences**:
  - *Option 5A*: Encourages reluctant learners to test AI prompt execution; requires tracking `freeTrialClaimed` flags.
  - *Option 5B*: Simpler billing logic, but increases friction for zero-balance users.
- **Affected System Areas**:
  - *Screens*: `Level2AITaskLab.tsx`, `FocusScreen.tsx`
  - *Services*: `clarity.controller.ts` (`runTask`), `credits.controller.ts`
  - *Data Models*: `User.model.ts` (`clarity.trialRunsUsed`)
- **Current Baseline / Conflict Status**: Implemented & verified in Stage 1 (`clarity.controller.ts:runTask` grants 1st trial run at 0 AC and deducts 10 AC for subsequent runs, with atomic MongoDB balance guards). Focus Track trial pending Focus mode approval.

---

### Decision 6: Daily Check-In Earning Rewards
- **Core Question**: Should daily check-in / login streak rewards be included in v1?
- **Available Options**:
  - **Option 6A (Restore Daily Credit Rewards)**: Award +5 to +10 AC for consecutive daily logins.
  - **Option 6B (Deferred to Post-v1)**: No daily credit rewards; credits acquired purely via top-up or core milestones.
  - **Option 6C (Daily XP Only)**: Award gamification XP points for streaks, but zero spendable AI compute credits.
- **Consequences**:
  - *Option 6A*: Can lead to credit hoarding and free-rider load on expensive Claude/Gemini API calls.
  - *Option 6C*: Drives learner retention without exposing operational compute margins to inflation.
- **Affected System Areas**:
  - *Screens*: `HomeScreen.tsx`, `CreditsScreen.tsx`
  - *Services*: `learner.controller.ts`, `credits.config.ts`
  - *Data Models*: `User.model.ts` (`streakCount`, `lastLoginDate`)
- **Current Baseline / Conflict Status**: Existed in conceptual notes; not currently implemented in backend endpoints.

---

### Decision 7: Biometric Focus Tracking (Camera / Gaze / Blink)
- **Core Question**: Should the original vision for webcam-based gaze/blink/head-pose focus tracking remain parked, or should a formal feasibility & privacy study be prepared?
- **Available Options**:
  - **Option 7A (Keep Parked / Deprecate)**: Fully park and exclude from v1 and v2 roadmaps.
  - **Option 7B (Prepare Privacy & Feasibility Study)**: Commission technical benchmark and DPDP Act compliance review.
  - **Option 7C (Replace with Software Activity Tracking)**: Track tab focus, idle time, and task interaction velocity instead of camera video.
- **Consequences**:
  - *Option 7A*: Eliminates massive legal risks, student privacy backlash, and browser permission hurdles.
  - *Option 7C*: Provides 90% of the engagement signal with zero biometric liability.
- **Affected System Areas**:
  - *Documentation*: Architecture Review & Mobile Plan
  - *Code*: Zero active dependencies.

---

### Decision 8: Telugu / Regional Language Support
- **Core Question**: Should regional Indic language support (Telugu / Tenglish) be included in v1 or deferred?
- **Available Options**:
  - **Option 8A (Deferred to Post-v1)**: UI and content strictly English in v1; Astra TTS catalogued as an external tool.
  - **Option 8B (Prompt / Mentor Bilingual Mode)**: UI remains English, but AI Mentor & Evaluator accept and answer in Telugu / Tenglish.
  - **Option 8C (Full Dual-Language UI)**: Full i18n localization for all navigation, assessment, and wallet screens.
- **Consequences**:
  - *Option 8A*: Fastest path to stable release.
  - *Option 8B*: High emotional resonance for regional learners with almost zero frontend overhead.
  - *Option 8C*: High localization and maintenance burden.
- **Affected System Areas**:
  - *Services*: `claude.service.ts`, `toolCatalog.service.ts` (Astra tool)
  - *Frontend*: Internationalization strings, typography.

---

### Decision 9: Focus Mode / Session Timer
- **Core Question**: Should an in-app focus session timer (e.g., distraction-free Pomodoro study timer with ambient audio) be part of v1?
- **Available Options**:
  - **Option 9A (Include in v1)**: Build a clean client-side session timer on the Focus screen.
  - **Option 9B (Park for v1)**: Focus exclusively on core AI intelligence, market signals, and tool discovery.
- **Consequences**:
  - *Option 9A*: Adds a practical utility for college students with low engineering cost.
  - *Option 9B*: Keeps product identity sharp as an AI intelligence platform rather than a generic productivity timer.
- **Affected System Areas**:
  - *Screens*: `FocusScreen.tsx`, `Sidebar.tsx`

---

### Decision 10: Mobile App Store Billing Approach
- **Core Question**: Which billing architecture should be adopted when distributing to mobile platforms?
- **Available Options**:
  - **Option 10A (PWA Web Billing First)**: Responsive web / PWA using web payment gateways (Razorpay / Stripe) to avoid 15–30% store cuts.
  - **Option 10B (Native Store In-App Purchases)**: Integrate Apple StoreKit and Google Play Billing for native app builds.
  - **Option 10C (Hybrid Multi-Platform)**: Web handles credit purchases and subscriptions; mobile apps operate as logged-in consumption clients.
- **Consequences**:
  - *Option 10A*: Retains 97–98% of revenue; zero store review friction for billing.
  - *Option 10B*: Complies with Google/Apple guidelines for native distribution, but sacrifices 15–30% margin on every credit top-up.
- **Affected System Areas**:
  - *Backend*: Webhook handlers, order verification endpoints.
  - *Frontend*: PWA manifest, payment redirection hooks.

---

### Decision 11: Under-18 Users & Minor Safeguards
- **Core Question**: Will minors (under 18) be permitted on AIIMS, and what compliance framework will be enacted?
- **Available Options**:
  - **Option 11A (18+ Higher Education Only for v1)**: Restrict registration to college/university students aged 18+ via self-declaration checkbox.
  - **Option 11B (Permit Minors 13–17 with Parental Consent)**: Implement verifiable parental consent flow under DPDP Act 2023.
- **Consequences**:
  - *Option 11A*: Drastically reduces regulatory compliance burden under Section 9 of India's DPDP Act (which strictly prohibits tracking/profiling minors without parental sign-off).
  - *Option 11B*: Requires complex parental email verification workflows, age-gated AI safety guardrails, and legal counsel review.
- **Affected System Areas**:
  - *Screens*: `RegisterScreen.tsx` (Age verification checkbox)
  - *Services*: `auth.controller.ts`
  - *Data Models*: `User.model.ts` (`isAdult`, `dateOfBirth`)
  - *Legal*: Terms of Service, Privacy Policy.

---

### Decision 12: Trademark Clearance
- **Core Question**: The brand name "AIIMS" presents substantial trademark conflict risk with the statutory All India Institute of Medical Sciences. How should brand clearance proceed?
- **Available Options**:
  - **Option 12A (Formal Clearance Search)**: Retain IP counsel to conduct clearance searches in Class 9 (software), Class 41 (education), Class 42 (SaaS).
  - **Option 12B (Prepare Defensive Brand Alternative)**: Formulate a ready-to-deploy alternate brand identity (e.g. AINOVA or an approved derivative) if opposition arises.
- **Consequences**:
  - *Option 12A*: Establishes definitive legal standing before marketing expenditure.
  - *Option 12B*: Eliminates business disruption if a trademark cease-and-desist or registry objection is issued.
- **Affected System Areas**:
  - Application headers, domain names, public metadata, onboarding brand copy.
