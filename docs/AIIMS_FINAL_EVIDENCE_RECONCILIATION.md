# AIIMS — Final Evidence Reconciliation Report

> **Document Version:** 1.0.0 (Comprehensive Forensic Audit & Evidence Closure Edition)
> **Evaluation Date:** 14 November 2026
> **Auditors & Roles:** Principal Software Architect, Senior Full-Stack Engineer, PostgreSQL Database Architect, Application Security Engineer, Release Manager
> **Target Platform:** AIIMS Full-Stack Platform (Node.js/Express + React/Vite + PostgreSQL 17/Prisma 6.19.3 + Cloudflare R2)
> **Audit Classification:** **`READ-ONLY FORENSIC AUDIT & EVIDENCE RECONCILIATION COMPLETE`**
> **Production Gate Status:** **`STRICTLY BLOCKED`** — Zero application code changes, zero database mutations, zero `.env` reads, zero automated deployments, zero simulated manual test sign-offs.

---

## 1. Executive Summary & Verification Classification

This document represents the definitive, read-only forensic verification of the remaining evidence gaps identified following Phase 9 and the initial pre-acceptance reconciliation.

Every item has been investigated directly against live source code, TypeScript AST definitions, Prisma migration scripts, and test runner implementations.

### Master Reconciliation Matrix

| Domain & Finding | Exact Source Evidence & File Location | Actual Implemented Behavior | Expected / Spec Behavior | Status | Remaining Owner Decision |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **1. Clarity Entitlements & Idempotency** | [clarity.controller.ts#L254-L283](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/clarity.controller.ts#L254-L283)<br>[clarity.controller.ts#L470-L498](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/clarity.controller.ts#L470-L498)<br>[schema.prisma#L232](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma#L232) | **Two distinct endpoints with separate scopes:**<br>1. `POST /clarity/run` (interactive sandbox): 1 free trial run per learner (`clarity-first-free-${userId}`).<br>2. `POST /clarity/submit` (curriculum attempt): 1 free attempt per learning level (`clarity-first-free-${learnerId}-${question.topic}`).<br>Backed by DB unique constraint `@@unique([userId, idempotencyKey])`. Concurrent duplicates fail constraint and pay 10 AC. Multiple free attempts impossible. | Phase 4 build plan explicitly specifies: *"First attempt in each learning level is FREE (0 AC)"* for question submissions. The ad-hoc runner `/clarity/run` is an unrated sandbox playground tool retained with a 1-time complimentary run. | **PASS** ✅ | Formally ratify whether learners receive 1 free playground test run total + 1 free formal submission per learning level (3 total). |
| **2. Prisma Migration Application & Drift** | [Backend/prisma/migrations/](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/migrations/)<br>[schema.prisma](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma)<br>Prisma CLI 6.19.3 | Two migration folders exist (`0001_init` with 21 tables; `0002_entrepreneur_profile` with 1 table = 22 tables). `npx prisma validate` confirms 22 valid relational models with zero syntax drift. **However**, `prisma migrate status` requires `DATABASE_URL`, which is strictly isolated in `.env`. Under mandatory security rules (never open, read, or print `.env`), live database connectivity cannot be initiated from the runner. | Migration history must be applied and verified against the live PostgreSQL cluster prior to public release. | **NOT VERIFIED** ⚠️<br>*(Live DB Connection Gated by Secret Isolation)* | Owner must execute `npx prisma migrate status` with production `DATABASE_URL` during infrastructure provisioning. |
| **3. AI Wallet Domain Taxonomy & Catalog** | [domainTaxonomy.service.ts#L406-L537](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/domainTaxonomy.service.ts#L406-L537)<br>[aiimsCatalog.ts#L503-L2480](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/data/aiimsCatalog.ts#L503-L2480)<br>[aiWallet.controller.ts#L867-L878](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/aiWallet.controller.ts#L867-L878) | **13 Canonical Domain Cards & Exactly 20 Curated Seed Tools:**<br>9 original Phase 3 domains retained; 4 developer domains (`3d-spatial`, `security-apm`, `customer-support`, `search-intelligence`) were replaced during Phase 8 Multi-Track integration with `business-operations`, `marketing-growth`, `health-medical`, and `legal-compliance` to support entrepreneur and interdisciplinary tracks. Unverified candidates are strictly suppressed from learner endpoints. | Phase 3 defined technical developer domains; Phase 8 introduced multi-track personas (Student + Entrepreneur). | **PASS** ✅ | Ratify whether the 13 canonical cards reflect the Phase 8 persona-aware set or should revert to Phase 3 developer categories. |
| **4. Frontend Automated Test Classification** | [runFrontendTests.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/scripts/runFrontendTests.ts)<br>[Frontend/src/services/__tests__/](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/services/__tests__/)<br>[Frontend/package.json](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/package.json) | **All 176 frontend checks are pure TypeScript logic, state-machine calculations, design tokens, mathematical WCAG contrast formulas, and static file inspections.**<br>Zero React DOM component rendering (`@testing-library/react`), zero interactive event simulations, and zero browser/E2E executions occur in automated tests. | Automated test execution must never be misclassified as browser/E2E tests or simulated manual sign-offs. | **PASS** ✅ | Acknowledge test stratification (204 backend Vitest + 176 frontend logic/token checks = 380 automated tests; 0 React DOM component tests; 35 manual browser journeys). |

---

## 2. Clarity Entitlement & Idempotency Deep Dive

### 2.1 The Two Endpoints & Their Respective Idempotency Keys
Inspection of the current codebase in [Backend/src/controllers/clarity.controller.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/clarity.controller.ts) reveals that **both idempotency keys are actively implemented, belong to separate endpoints, and serve distinct purposes in the platform**:

```
                               ┌────────────────────────────────────────────────────────┐
                               │                 CLARITY AI MODULE                     │
                               └──────────────────────────┬─────────────────────────────┘
                                                          │
                       ┌──────────────────────────────────┴──────────────────────────────────┐
                       ▼                                                                     ▼
         ┌───────────────────────────┐                                         ┌───────────────────────────┐
         │     POST /clarity/run     │                                         │    POST /clarity/submit   │
         │   (Interactive Runner)    │                                         │  (Formal Level Submission)│
         └─────────────┬─────────────┘                                         └─────────────┬─────────────┘
                       │                                                                     │
          Evaluates: trialRunsUsed === 0                                        Evaluates: priorAttempts === 0
          Scope: Per-Learner (Lifetime)                                         Scope: Per-Topic / Level (x3)
          Key: clarity-first-free-${userId}                                     Key: clarity-first-free-${learnerId}-${topic}
```

#### A. Interactive Prompt Testing Playground: `POST /clarity/run` (and `/clarity/run-task`)
- **Route Definition:** [Backend/src/routes/clarity.routes.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/routes/clarity.routes.ts#L107-L114)
- **Controller Function:** `runTask` ([clarity.controller.ts#L194-L409](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/clarity.controller.ts#L194-L409))
- **Functional Purpose:** An exploratory prompt playground where a learner tests a prompt against a test scenario without grading rubrics, without progression updates, and without locking the assignment.
- **Entitlement Scope:** **Per Learner (Lifetime Single Use)**.
- **Implementation Mechanism:**
  - Evaluated against `User.clarityData.trialRunsUsed`.
  - If `trialRunsUsed === 0`, `isFreeTrial = true` and `costDeducted = 0`.
  - Atomically claims the 0 AC grant via:
    ```typescript
    idempotencyKey: `clarity-first-free-${userId}`
    ```
  - If `trialRunsUsed > 0`, deducts 10 AC (`CLARITY_TASK_COST = 10`).
  - Upon successful execution, increments `User.clarityData.trialRunsUsed` ([lines 354-355](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/clarity.controller.ts#L354-L355)).

#### B. Formal Curriculum Progression Submission: `POST /clarity/submit` (and `/clarity/attempts/submit`)
- **Route Definition:** [Backend/src/routes/clarity.routes.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/routes/clarity.routes.ts#L51-L56) and [line 117](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/routes/clarity.routes.ts#L117)
- **Controller Function:** `submitClarityTask` ([clarity.controller.ts#L430-L716](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/clarity.controller.ts#L430-L716))
- **Functional Purpose:** The official task submission that triggers the dynamic 100-point rubric evaluation via `rubricEvaluatorService`, logs an immutable record in `QuestionAttempt`, awards +50 XP, updates curriculum progression, and locks the task assignment (`status: 'SUBMITTED'`).
- **Entitlement Scope:** **Per Topic / Learning Level (Up to 3 Free Submissions Total)**.
  The 3 curriculum levels map 1:1 to topics ([clarity.controller.ts#L25-L59](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/clarity.controller.ts#L25-L59)):
  - Level 1: Topic `"Understanding"` (AI Prompt Understanding)
  - Level 2: Topic `"Workflow"` (AI Workflow Orchestration)
  - Level 3: Topic `"AI Agents"` (Autonomous AI Agents)
- **Implementation Mechanism:**
  - Evaluated against PostgreSQL `QuestionAttempt.count({ where: { learnerId, topic: question.topic } })`.
  - If `priorAttemptsCount === 0`, `isFirstAttemptFree = true` and `submissionCost = 0`.
  - Atomically reserves the 0 AC grant via:
    ```typescript
    idempotencyKey: `clarity-first-free-${learnerId}-${question.topic}`
    ```
  - If `priorAttemptsCount > 0`, `submissionCost = 10`.

### 2.2 Database Constraints & Race Condition Elimination
In [Backend/prisma/schema.prisma](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma#L232), the PostgreSQL database enforces a compound unique constraint:
```prisma
model CreditLedger {
  id             String    @id @default(uuid())
  userId         String?   @map("user_id")
  idempotencyKey String?   @map("idempotency_key")
  ...
  @@unique([userId, idempotencyKey])
}
```

#### Can a duplicate or concurrent request receive multiple free attempts?
**ABSOLUTELY NOT.** The database constraint prevents any circumvention:
1. When two concurrent requests arrive at the same millisecond, both read `priorAttemptsCount === 0` (or `trialRunsUsed === 0`).
2. Both dispatch a 0 AC interactive transaction via `creditsLedgerService.executeTransaction()` inside `prisma.$transaction`.
3. Request 1 acquires the table lock, successfully writes the ledger record with `(userId, idempotencyKey)`, and completes with `conflict: false`.
4. Request 2 attempts to write the duplicate `(userId, idempotencyKey)` pair, which immediately triggers PostgreSQL unique constraint violation **`P2002`**.
5. `creditsLedgerService` catches `P2002` and returns `{ conflict: true }`.
6. The controller detects `claimResult.conflict === true`:
   - In `runTask`: sets `isFreeTrial = false` and `costDeducted = 10` ([clarity.controller.ts#L278-L281](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/clarity.controller.ts#L278-L281)).
   - In `submitClarityTask`: sets `isFirstAttemptFree = false` and `submissionCost = 10` ([clarity.controller.ts#L492-L496](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/clarity.controller.ts#L492-L496)).
7. Request 2 is immediately redirected to the paid deduction logic, deducting 10 AC or throwing `HTTP 402 INSUFFICIENT_CREDITS`.
8. Under zero circumstances can any user obtain more than one free attempt per entitlement scope.

### 2.3 Original Product Specification Reconciliation
- **Phase 4 Specification:** The Phase 4 build plan explicitly mandated:
  > *"First attempt for each learning level: FREE (0 AC). Subsequent valid question submissions in this level: 10 AC each."*
  This specification corresponds directly to `submitClarityTask` with `clarity-first-free-${learnerId}-${question.topic}`.
- **Origin of `/clarity/run`:** The ad-hoc prompt testing runner (`/clarity/run`) was built prior to the 3-level Question Bank as an exploratory prompt engineering scratchpad. To prevent unauthenticated or free draining of external Claude API tokens, it was wrapped with a 1-time complimentary trial (`trialRunsUsed === 0`) and 10 AC thereafter.
- **Conclusion:** Neither key is outdated. However, `clarity-first-free-${learnerId}-${question.topic}` is the **canonical spec-mandated curriculum entitlement**, whereas `clarity-first-free-${userId}` is a **legacy playground runner safeguard**.
- **Owner Decision Required:** Confirm whether both entitlements should remain active, giving learners 1 complimentary playground trial plus 3 complimentary curriculum level submissions (4 free operations total).

---

## 3. Prisma Migration Verification & Database Drift Analysis

### 3.1 Migration Artifact Inspection
Direct inspection of `Backend/prisma/migrations/`:

| Migration Directory | Creation Timestamp | SQL File Size | Tables Established / Modified | Origin & Functional Purpose |
| :--- | :---: | :---: | :---: | :--- |
| **`0001_init`** | 11 Nov 2026 | 30,760 bytes | **21 Tables Created** | Foundational relational baseline for PostgreSQL 17 + Prisma 6.19.3. Completely replaced legacy MongoDB schemas with relational models (`users`, `student_profiles`, `assessments`, `assessment_scores`, `ai_profiles`, `cohort_benchmarks`, `ai_tools`, `tool_discovery_runs`, `tool_evidences`, `tool_version_histories`, `clarity_progression_configs`, `learner_clarity_progressions`, `question_banks`, `question_assignments`, `question_attempts`, `focus_sessions`, `focus_task_attempts`, `credit_ledger`, `audit_logs`, `sessions`, `device_reset_audits`). |
| **`0002_entrepreneur_profile`** | 12 Nov 2026 | 1,262 bytes | **1 Table Created** (Table #22) | Phase 8 strictly additive migration. Introduces `entrepreneur_profiles` as an optional 1-to-1 extension of `users` (`user_id` foreign key with `ON DELETE CASCADE`), isolating venture data without modifying existing tables. |
| **`migration_lock.toml`** | 11 Nov 2026 | 129 bytes | N/A | Locks provider to `"postgresql"`. |

### 3.2 Schema Validation vs. Live Database Migration Status
- **Schema Validation:** Executed `npx prisma validate --schema Backend/prisma/schema.prisma` — **Exit Code 0** (`The schema at Backend\prisma\schema.prisma is valid 🚀`).
- **Live Migration Status:** Executed `npx prisma migrate status --schema Backend/prisma/schema.prisma`.
  - **Result:**
    ```
    Error: Environment variable not found: DATABASE_URL.
      --> Backend\prisma\schema.prisma:7
       |
     6 |   provider = "postgresql"
     7 |   url      = env("DATABASE_URL")
    ```
- **Forensic Explanation:**
  The `DATABASE_URL` environment variable is stored strictly in `.env`. Under the mandatory agent rules:
  1. *Rule 8 & Prompt 0:* "NEVER open, print, copy, or modify any `.env` file."
  2. "If database status cannot be verified safely, explicitly report NOT VERIFIED."
  Because Prisma CLI requires a live database connection string to query the `_prisma_migrations` table in PostgreSQL, running `prisma migrate status` without violating the `.env` secret isolation boundary is physically impossible.
- **Classification:** **`NOT VERIFIED (Safe Database Connection Gated by Secret Isolation)`** ⚠️.
- **Owner Action Required:** During infrastructure setup, the system owner must supply the production `DATABASE_URL` in the hosting environment and execute `npx prisma migrate status` to confirm that `0001_init` and `0002_entrepreneur_profile` show `Database schema is up to date!`.

---

## 4. AI Wallet Taxonomy Reconciliation

### 4.1 Original Phase 3 Domains vs. Current Canonical Domains
The user noted that the Phase 3 specification listed 13 technical categories, while current reports list domains including Business Operations, Marketing, Health & Clinical Research, and Legal & Compliance.

Forensic inspection of [Backend/src/services/wallet/domainTaxonomy.service.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/domainTaxonomy.service.ts#L406-L537) against [docs/AIIMS_PHASE_3_COMPLETION_REPORT.md](file:///c:/Users/divya/OneDrive/Documents/AIIMS/docs/AIIMS_PHASE_3_COMPLETION_REPORT.md#L75-L90) establishes the complete genealogy:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 13 CANONICAL DOMAIN CARD EVOLUTION                              │
├─────┬──────────────────────────────────────┬──────────────────────────────────────┬─────────────┤
│  #  │ Original Phase 3 Domain Card         │ Current Domain Card in Taxonomy      │ Status      │
├─────┼──────────────────────────────────────┼──────────────────────────────────────┼─────────────┤
│  1  │ Video Editing                        │ Video Editing & Generation           │ RETAINED    │
│  2  │ Data Analytics                       │ Data Analytics & Intelligence        │ RETAINED    │
│  3  │ Graphic Design                       │ Graphic Design & Visual Arts         │ RETAINED    │
│  4  │ Reasoning & Writing                  │ Reasoning & Long-Form Writing        │ RETAINED    │
│  5  │ Agentic Coding                       │ Agentic Coding & Software Eng.       │ RETAINED    │
│  6  │ Research & Grounded Citations        │ Research & Grounded Citations        │ RETAINED    │
│  7  │ Presentation                         │ Presentation & Pitch Deck Generation │ RETAINED    │
│  8  │ Automation                           │ Workflow Automation & Integration    │ RETAINED    │
│  9  │ Audio & Voice (Audio & Speech)       │ Audio & Voice Synthesis              │ RETAINED    │
├─────┼──────────────────────────────────────┼──────────────────────────────────────┼─────────────┤
│ 10  │ 3D Spatial (3D & Spatial Design)     │ Business Operations & Strategy       │ REPLACED 🔄 │
│ 11  │ Security & APM                       │ Marketing & Growth Content           │ REPLACED 🔄 │
│ 12  │ Customer Support                     │ Health & Clinical Research           │ REPLACED 🔄 │
│ 13  │ Search Intelligence                  │ Legal & Contract Analysis            │ REPLACED 🔄 │
└─────┴──────────────────────────────────────┴──────────────────────────────────────┴─────────────┘
```

#### Why Were Domains 10–13 Replaced?
1. **Phase 8 Multi-Track Integration:** In Phase 8 ("Multi-Track Registration & Persona-Aware Discovery"), the product specification mandated adapting tool discovery to the **Entrepreneur Track** and non-technical academic fields without spinning up an unapproved separate portal (Decision D8).
2. **Audience Relevance:** The original developer-heavy domains (`3d-spatial`, `security-apm`, `customer-support`, `search-intelligence`) had virtually zero verified tools in the initial seed catalog and zero overlap with general student/entrepreneur needs.
3. **Multi-Track Replacement:** The 4 slots in `CANONICAL_DOMAINS` were repurposed for high-demand, cross-track disciplines:
   - `business-operations`: Specifically targeted at `targetAudience: 'entrepreneur'` ([domainTaxonomy.service.ts#L504](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/domainTaxonomy.service.ts#L504)).
   - `marketing-growth`: Targeted at both students and entrepreneurs ([line 514](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/domainTaxonomy.service.ts#L514)).
   - `health-medical`: Clinical research and literature analysis ([line 524](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/domainTaxonomy.service.ts#L524)).
   - `legal-compliance`: Contract analysis and IP auditing ([line 534](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/domainTaxonomy.service.ts#L534)).
4. **Broad Taxonomy Retention:** The original domains (`3D / Architecture`, `Security & Risk`) were **not deleted from the codebase**; they remain active in `DomainTaxonomyService.taxonomy` (the broad 35-domain keyword inferencing engine, lines 44–309).

### 4.2 Complete Curated Seed Tool Inventory (Exactly 20 Tools)
Extracted directly from [Backend/src/data/aiimsCatalog.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/data/aiimsCatalog.ts#L503-L2480) (`SEED_TOOL_CATALOG`):

| # | Tool ID | Tool Name | Primary Category | Assigned Domains | Verification Status | Active | Relevant Personas / Roles |
|---|---|---|---|---|:---:|:---:|---|
| 1 | `tool-chatgpt` | ChatGPT (GPT-4o) | Reasoning & Writing | Education & Learning, Software, Productivity, Business | VERIFIED | Yes | AI Product Lead, Generalist, Writer, Engineer |
| 2 | `tool-claude` | Claude 3.5 Sonnet | Reasoning & Writing | Software, Research & Knowledge, Education, Business | VERIFIED | Yes | Software Engineer, AI Product Lead, Workflow Specialist |
| 3 | `tool-cursor` | Cursor IDE | Agentic Coding | Software & Technology | VERIFIED | Yes | Fullstack Engineer, Software Developer, DevOps |
| 4 | `tool-copilot` | GitHub Copilot | Agentic Coding | Software & Technology | VERIFIED | Yes | Software Developer, DevOps Engineer |
| 5 | `tool-perplexity` | Perplexity AI | Research & RAG | Research & Knowledge, Education, Business, Journalism | VERIFIED | Yes | Market Researcher, Analyst, Journalist, Product Manager |
| 6 | `tool-notebooklm` | Google NotebookLM | Research & RAG | Education, Research, Legal & Compliance | VERIFIED | Yes | Student, Researcher, Legal Analyst, Product Manager |
| 7 | `tool-gemini-pro` | Gemini 1.5 Pro | Multi-Modal | Research & Knowledge, Education, Software | VERIFIED | Yes | Data Architect, Researcher, Creative Technologist |
| 8 | `tool-julius` | Julius AI | Data Analysis | Data & Analytics, Business, Finance & Accounting | VERIFIED | Yes | Data Analyst, Business Lead, Researcher |
| 9 | `tool-gamma` | Gamma App | Presentation | Presentation & Decks, Education, Business | VERIFIED | Yes | Product Lead, Founder, Student, Consultant |
| 10 | `tool-midjourney` | Midjourney v6 | Image & Vision | Design & Creative, Marketing & Content, Architecture | VERIFIED | Yes | UI/UX Designer, Marketing Lead, Concept Artist |
| 11 | `tool-runway` | Runway Gen-3 Alpha | Video | Video Production, Design & Creative, Marketing | VERIFIED | Yes | Video Editor, Content Creator, Marketing Lead |
| 12 | `tool-make` | Make.com AI | Automation | Business & Operations, Software, Productivity | VERIFIED | Yes | Operations Lead, Automation Specialist, Product Manager |
| 13 | `tool-v0` | v0 by Vercel | Agentic Coding | Software & Technology, Design & Creative | VERIFIED | Yes | Frontend Engineer, UI/UX Designer, Product Manager |
| 14 | `tool-descript` | Descript | Video | Video Editing, Video Production, Audio & Voice | VERIFIED | Yes | Content Creator, Video Editor, Student, Marketing |
| 15 | `tool-canva` | Canva Magic Studio | Image & Vision | Graphic Design, Design & Creative, Marketing & Growth | VERIFIED | Yes | Marketing Specialist, Student, Entrepreneur, Designer |
| 16 | `tool-elevenlabs` | ElevenLabs | Multi-Modal | Audio & Voice, Creator Economy, Education | VERIFIED | Yes | Content Creator, Educator, Student, Media Producer |
| 17 | `tool-notion-ai` | Notion AI | Automation | Business Operations, Personal Productivity | VERIFIED | Yes | Product Manager, Entrepreneur, Operations Lead, Student |
| 18 | `tool-copyai` | Copy.ai | Reasoning & Writing | Marketing & Growth, Social Media, Business Operations | VERIFIED | Yes | Marketing Specialist, Content Creator, Entrepreneur |
| 19 | `tool-openevidence` | OpenEvidence | Research & RAG | Health & Clinical Research, Science & Medicine | VERIFIED | Yes | Medical Student, Biomedical Researcher, Clinician |
| 20 | `tool-robin-ai` | Robin AI | Research & RAG | Legal & Contract Analysis, Legal & Compliance, Business | VERIFIED | Yes | Legal Counsel, Operations Lead, Entrepreneur, Student |

### 4.3 Suppression of Unverified Candidates from Learner APIs
In [Backend/src/services/wallet/domainTaxonomy.service.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/wallet/domainTaxonomy.service.ts#L543-L551):
```typescript
public static getThirteenDomainCards(allTools: AITool[] = []): DomainCard[] {
  const verifiedTools = allTools.filter(
    (t) =>
      t.activeStatus &&
      t.verificationStatus !== 'UNVERIFIED' &&
      t.verificationStatus !== 'DISCOVERED' &&
      t.verificationStatus !== 'REJECTED'
  );
  ...
```
Any candidate tool with status `UNVERIFIED`, `DISCOVERED`, or `REJECTED`, or with `activeStatus === false`, is strictly filtered out before domain cards are constructed. Furthermore, administrative candidate review routes (`POST /admin/candidates/approve`, `POST /admin/candidates/reject`) are protected by `requireRole('admin')`. Non-admin learners cannot see unverified tools.

- **Owner Decision Required:** Ratify the Phase 8 persona-aware 13 domain cards (`Business Operations`, `Marketing`, `Health & Clinical Research`, `Legal & Compliance`) for initial launch.

---

## 5. Frontend Automated Test Classification & Coverage Audit

### 5.1 Comprehensive Inventory of the 176 Frontend Checks
Executed via `npx ts-node --transpile-only ../Backend/src/scripts/runFrontendTests.ts` from `Frontend/package.json#L16`:

| Suite # & Name | Source Test File Location | Checks | Category & Execution Nature | Behaviors Verified |
| :---: | :--- | :---: | :--- | :--- |
| **Suite 1: Scoring Engine** | [assessmentScoring.test.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/services/__tests__/assessmentScoring.test.ts) | **17** | **Pure TypeScript Algorithmic Logic** | • Option semantic equivalence scoring (Q15/Q16 produce identical 100/100).<br>• Option A penalty guard (weak answer cannot score high solely because it is Option A).<br>• Technical depth evaluation over raw checkbox count.<br>• Non-evaluative questions (Q5/Q24) do not inflate capability dimensions.<br>• Deterministic fallback on AI failure.<br>• Peer benchmark threshold validation (insufficient if records < 30). |
| **Suite 2: Feature Access & Entitlements** | [featureAccess.test.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/services/__tests__/featureAccess.test.ts) | **59** | **Pure TypeScript State Machine Logic** | • My AI Profile lock/unlock state transitions based on assessment completion.<br>• Clarity lock/unlock based on profile viewing.<br>• Focus lock/unlock based on completing a Clarity task.<br>• Strict locking of all 6 advanced workspaces (`radar`, `investigation`, `relevance`, `solver`, `build`, `mentor`).<br>• Credit independence (500 AC balance cannot unlock Level 2/3/4 workspaces).<br>• Human-readable lock reason generation. |
| **Suite 3: Design Tokens & Theme Engine** | [theme.test.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/services/__tests__/theme.test.ts) | **12** | **Static Design Token Inspection** | • Brand primary color invariant (`#6366f1` / `#4f46e5`).<br>• Font family hierarchy (Inter heading, body, JetBrains Mono).<br>• Radii scale (sm to pill 9999px).<br>• Semantic color token definitions (Sky, Mint, Sunshine, Coral, Lavender).<br>• Light/dark CSS variable parity in `index.css`. |
| **Suite 4: WCAG AA Color Contrast** | [colorContrast.test.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/services/__tests__/colorContrast.test.ts) | **18** | **Mathematical Accessibility Formulas** | • Standard WCAG 2.1 relative luminance calculation algorithm.<br>• Normal text contrast ratio calculation ensuring >= 4.5:1.<br>• Large text/icon contrast ratio ensuring >= 3.0:1.<br>• Mathematical proof of readability across Sky, Mint, Sunshine, Coral, Lavender, and Levels 1–4. |
| **Suite 5: Evaluation Frontend & Routing** | [evaluationFrontend.test.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/services/__tests__/evaluationFrontend.test.ts) | **24** | **Validation Helper & Route Logic Mirrors** | • Send button guardian (`isEvaluationReviewFormValid`: disabled until all 4 criteria 1–5 filled + written feedback present).<br>• Staff route redirects (`resolveStaffRouteNavigation`: unauthenticated -> login; learner -> home; evaluator -> queue; admin -> admin).<br>• Learner feedback payload visibility structures. |
| **Suite 6: Home UI & Navigation System** | [homeAndDesignSystem.test.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/services/__tests__/homeAndDesignSystem.test.ts) | **22** | **Dashboard Logic & Token Breakpoints** | • Milestone calculation and next action resolution.<br>• Focus duration formatting (1500s -> 25 min).<br>• Mobile responsive breakpoint definitions (360px, 390px, 768px, 1024px, 1440px).<br>• Spacing scale (4px to 48px).<br>• All 9 Quick Access destination route mappings. |
| **Suite 7: Android & Mobile Standards** | [androidAndMobileExperience.test.ts](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/services/__tests__/androidAndMobileExperience.test.ts) | **24** | **Static Filesystem & Config Inspection** | • `capacitor.config.ts` inspection: appId `com.aiims.app`, app name `AIIMS`, target dir `dist`, HTTPS scheme.<br>• `AndroidManifest.xml` inspection: `android:allowBackup="false"`, `INTERNET` permission only (no camera/audio/location).<br>• `index.css` inspection: `safe-area-inset-top` and `bottom` declared.<br>• Minimum 44px tap target rule presence.<br>• `App.tsx` hardware back-button listener inspection. |

### 5.2 Critical Analysis: What Is NOT Covered by the 176 Checks
To maintain absolute architectural integrity, we must be completely truthful about what these tests do **not** do:
1. **Zero React DOM Component Mounting:** No React component (`<App />`, `<AssessmentScreen />`, `<ClarityScreen />`, `<FocusChallenges />`, `<Sidebar />`) is mounted in a virtual DOM environment (e.g., jsdom via `@testing-library/react`). Component render lifecycles, React hooks (`useState`, `useEffect`), and JSX tree diffing are **not** tested automatically.
2. **Zero Interactive Event Simulation:** No user interaction (typing in an `<input>`, clicking a `<button>`, opening a dropdown menu) is simulated via automated event emitters.
3. **Zero Browser / E2E / WebView Execution:** No tests run in an actual headless or headed browser (Playwright, Cypress) or Capacitor Android WebView. Network request mocking, browser cookie handling, and visual layout rendering are **not** covered by automated tests.

### 5.3 Formal Classification of the Six Testing & Verification Layers

```
                                  AIIMS VERIFICATION HIERARCHY
 ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
 │ Layer 1: Backend Automated Tests (204 Tests)                                                │
 │ • Vitest test runner executing against backend controllers, credits ledger, & Prisma models│
 ├─────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Layer 2: Frontend Automated Logic & Token Checks (176 Checks)                               │
 │ • ts-node test runner executing pure TypeScript functions, math formulas, & token checks   │
 ├─────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Layer 3: React Component Mounting Tests (0 Tests)                                           │
 │ • Not configured; no @testing-library/react harness in Frontend/package.json                │
 ├─────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Layer 4: Browser / End-to-End Automation Tests (0 Tests)                                    │
 │ • Not configured; no Playwright/Cypress runner                                              │
 ├─────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Layer 5: Static Typecheck Compilation (0 Errors)                                            │
 │ • Backend: tsc --noEmit (0 errors) | Frontend: tsc --noEmit (0 errors)                     │
 ├─────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Layer 6: Production Distribution Builds (0 Errors)                                          │
 │ • Backend: tsc -> Backend/dist/ | Frontend: vite build -> Frontend/dist/ (8.45s)           │
 ├─────────────────────────────────────────────────────────────────────────────────────────────┤
 │ Layer 7: Owner Manual Acceptance Protocols (35 Protocols: M-01 to M-35)                     │
 │ • Consolidates all real browser UI, DOM, and journey tests; currently PENDING owner sign-off│
 └─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Actionable Owner Decisions & Release Sign-Off Checklist

Before authorizing deployment to a staging or production cluster, the system owner must resolve:

1. **Ratify Clarity Entitlements:**
   - Formal Phase 4 submission (`/clarity/submit`): 1 free evaluation attempt per level across the 3 topics (Understanding, Workflow, AI Agents).
   - Ad-hoc playground runner (`/clarity/run`): 1 complimentary test execution per learner account.
2. **Execute Live Migration Verification with Production `DATABASE_URL`:**
   - Run `npx prisma migrate status --schema Backend/prisma/schema.prisma` in an environment provisioned with the production database credentials to confirm that migrations `0001_init` and `0002_entrepreneur_profile` are marked as applied in `_prisma_migrations`.
3. **Ratify 13 Canonical Domain Cards:**
   - Confirm that the Phase 8 persona-aware domain cards (`Business Operations & Strategy`, `Marketing & Growth Content`, `Health & Clinical Research`, `Legal & Contract Analysis`) remain in place for the initial release to serve both Students and Entrepreneurs.
4. **Execute Manual Acceptance Test Tracker (M-01 through M-35):**
   - Perform the 35 end-to-end browser journeys in [AIIMS_MANUAL_ACCEPTANCE_TEST_TRACKER.md](file:///c:/Users/divya/OneDrive/Documents/AIIMS/AIIMS_MANUAL_ACCEPTANCE_TEST_TRACKER.md) on actual desktop and mobile target devices. Automated logic checks cannot replace real browser acceptance.

---

## 7. Mandatory Stop Gate Certification

In accordance with strict release governance:
- [x] Read-only verification completed.
- [x] Zero application source code was modified.
- [x] Zero database schemas, migrations, or records were altered.
- [x] Zero `.env` files were opened, read, or exposed.
- [x] Zero production deployments were initiated.
- [x] Zero real payment transactions were processed.
- [x] Zero manual test statuses were forged or prematurely marked as passed.

```
========================================================================================
                      FINAL EVIDENCE RECONCILIATION SIGN-OFF
========================================================================================
  [X] Clarity Entitlements: Forensically separated (run: per-user vs submit: per-topic)
  [X] Concurrency Integrity: Database unique constraint prevents duplicate free attempts
  [!] Live Migration Status: NOT VERIFIED (Securely gated by .env secret isolation)
  [X] AI Wallet Taxonomy: 13 Canonical Cards & 20 Seed Tools forensically reconciled
  [X] Frontend Test Suite: 176 checks classified truthfully as logic/token checks
  [!] Owner Manual Testing: M-01 to M-35 remain PENDING owner browser execution
  [!] Production Release: STRICTLY BLOCKED awaiting owner acceptance sign-off
========================================================================================
```

**FINAL EVIDENCE RECONCILIATION IS COMPLETE. READY FOR OWNER REVIEW.**

