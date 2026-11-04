# AIIMS Question Bank & AI Question Generation Architecture

## Executive Summary
This document defines the architecture, data models, assignment lifecycle, institution protection, and security guarantees of the centralized **AIIMS Question Bank and AI Question Generation System** implemented for Prompt 4/12.

The system replaces shared static task arrays with an individual question assignment engine, ensuring that no learner ever repeats a question, institutions have repeat-exposure safeguards, non-coders receive everyday work/study scenarios by default, and backend AI generation synthesizes questions on-demand when banks are exhausted.

---

## 1. Core Principles

1. **Non-Coder Default (General Track):**
   - General learners work on practical everyday workplace and study scenarios:
     - Fact-checking automated announcements
     - Verifying vendor invoices and delivery notes
     - Planning study timetables and milestone reviews
     - Drafting executive communication and memos
     - Designing structured workflows with human supervisory checkpoints
     - Extracting action items and stopping conditions for autonomous agents
   - The Coding Track is strictly opt-in and covers API design, JSON contracts, and database logic. General learners are never defaulted to coding questions.

2. **No-Repeat Guarantee:**
   - Every served question is recorded atomically in the database (`QuestionAssignment` model).
   - Compound unique index `{ learnerId: 1, questionId: 1 }` guarantees that a learner never receives the same question twice.
   - Reloading the application or resending requests returns the existing in-progress assignment without duplicate assignments.
   - Abandoned or incomplete questions remain permanently in the learner's served history.

3. **Institution Exclusion Protection:**
   - Configurable repeat-exposure window (provisional default: 30 days).
   - Configurable scope: `college`, `batch`, or `cohort`.
   - Admin-configurable via protected API.
   - Unverified learners without institutional data are never misclassified into another learner's college.

4. **On-Demand AI Question Generation:**
   - Activated automatically when the approved bank is exhausted for a `(topic, level, track)` tuple.
   - Validated against strict Zod schema, difficulty complexity criteria, and similarity checks.
   - De-duplicated across concurrent learner requests using server-side concurrency locking.
   - Zero client-side API credential exposure.

5. **Immutable Attempt Records:**
   - Learner answers and server-authoritative rubric evaluations are stored in separate immutable records (`QuestionAttempt`).
   - Learner attempts are never overwritten.

---

## 2. Database Models & Schema Design

### 2.1 Question Bank (`QuestionBank.model.ts`)
Stores human-authored and AI-generated questions.

| Field | Type | Description |
|---|---|---|
| `questionId` | `String` (Unique, Indexed) | Deterministic ID (e.g. `qb-check-easy-01` or `qb-ai-...`) |
| `topic` | `String` (Indexed) | Domain topic (e.g. `Checking AI`, `AI Workflow Design`) |
| `level` | `String` (Indexed) | `'Easy' \| 'Medium' \| 'Hard'` |
| `track` | `String` (Indexed) | `'General'` (default) or `'Coding'` (opt-in) |
| `title` | `String` | Short scenario summary title (3–10 words) |
| `promptText` | `String` | Instructions and objective for the learner |
| `hint` | `String` (Optional) | Supervisory guidance or boundary reminder |
| `testScenario` | `String` | Raw email, meeting transcript, or workplace context |
| `expectedCriteria` | `[String]` | Array of key demonstration points required |
| `scoringRubric` | `[ScoringRubricCriterion]` | Specific criteria and max scores summing to 100 |
| `source` | `String` (Indexed) | `'Human' \| 'AI'` |
| `status` | `String` (Indexed) | `'DRAFT' \| 'PENDING_REVIEW' \| 'APPROVED' \| 'ACTIVE' \| 'REJECTED' \| 'INACTIVE'` |
| `version` | `Number` | Incremented on modification (default 1) |
| `aiMetadata` | `Object` (Optional) | Provider, model, similarity score, retry count |
| `timestamps` | `Date` | `createdAt`, `updatedAt` |

**Indexes:**
- `{ questionId: 1 }` (unique)
- `{ topic: 1, level: 1, track: 1, status: 1 }` (compound for fast candidate filtering)
- `{ source: 1, status: 1 }`

---

### 2.2 Question Assignment (`QuestionAssignment.model.ts`)
Tracks every question served to every learner.

| Field | Type | Description |
|---|---|---|
| `assignmentId` | `String` (Unique, Indexed) | Unique assignment UUID |
| `learnerId` | `String` (Indexed) | ID of the authenticated learner |
| `questionId` | `String` (Indexed) | Question served |
| `topic`, `level`, `track` | `String` | Taxonomy metadata |
| `college` | `String` (Indexed) | Normalized uppercase institution code/name |
| `institutionId` | `String` (Indexed) | Optional foreign key to Institute model |
| `cohortId` | `String` (Indexed) | Optional cohort group ID |
| `assignedAt` | `Date` (Indexed) | Timestamp of serving |
| `completedAt` | `Date` (Optional) | Timestamp when learner submitted answer |
| `status` | `String` (Indexed) | `'ASSIGNED' \| 'IN_PROGRESS' \| 'SUBMITTED' \| 'ABANDONED'` |

**Indexes:**
- `{ learnerId: 1, questionId: 1 }` (unique constraint enforcing no-repeat guarantee)
- `{ college: 1, questionId: 1, assignedAt: -1 }` (fast institution exclusion query)
- `{ cohortId: 1, questionId: 1, assignedAt: -1 }`

---

### 2.3 Question Attempt (`QuestionAttempt.model.ts`)
Stores immutable learner submissions and evaluations.

| Field | Type | Description |
|---|---|---|
| `attemptId` | `String` (Unique, Indexed) | Immutable attempt UUID |
| `assignmentId` | `String` (Indexed) | Associated assignment reference |
| `learnerId` | `String` (Indexed) | Authenticated learner |
| `questionId` | `String` (Indexed) | Question ID answered |
| `startedAt`, `submittedAt` | `Date` | Server-authoritative timestamps |
| `submittedAnswer` | `String` | Learner's actual prompt/response text |
| `score` | `Number` | Server-computed score (0–100) |
| `rubricFeedback` | `[Object]` | Array of `{ criterion, score, maxScore, comment }` |
| `evaluationStatus` | `String` | `'PENDING' \| 'EVALUATED'` |
| `timeTakenSeconds` | `Number` | Active elapsed time |
| `creditTransactionId` | `String` (Optional) | Linked credit ledger entry |

---

### 2.4 Institution Exclusion Config (`InstitutionExclusionConfig.model.ts`)
Stores configurable policy for same-institution repeat exclusion.

| Field | Type | Description |
|---|---|---|
| `scope` | `String` | `'college' \| 'batch' \| 'cohort'` (default: `'college'`) |
| `exclusionDays` | `Number` | Window in days (provisional default: `30`) |
| `updatedBy` | `String` | Admin user ID who altered policy |
| `updatedAt` | `Date` | Timestamp of configuration change |

---

## 3. Question Assignment & Serving Algorithm

```
                  Learner Request (topic, level, track="General")
                                       │
                                       ▼
                     Resolve Institutional Identity
                      (StudentProfile -> User.college)
                                       │
                                       ▼
                       Check Ongoing Assignment
              Does learner have active unsubmitted assignment?
                     ├── YES ──► Return Ongoing Assignment
                     │           (Reload Idempotency)
                     └── NO
                          │
                          ▼
             Compute Combined Exclusion Filter
     1. Learner Served Questions (All past IDs for this learner)
     2. Institution Questions (Served to same college within 30 days)
                          │
                          ▼
               Query Active Question Bank Candidates
             (status: ACTIVE, not in combined exclusions)
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
     [Candidates Found]        [Bank Exhausted]
            │                           │
    Select Candidate                    ▼
   (Random selection)        Trigger AI Question Generator
            │                  (De-duplicated, Validated,
            │                   Similarity Checked <= 0.70)
            │                           │
            │                  Save to QuestionBank
            │                  (source: "AI", status: "ACTIVE")
            │                           │
            └─────────────┬─────────────┘
                          │
                          ▼
          Atomically Create QuestionAssignment
          (unique index: learnerId + questionId)
                          │
                          ▼
            Return Assignment & Clean Question
            (Without internal answer keys or weights)
```

---

## 4. Question Status Lifecycle

```
[DRAFT] ──► [PENDING_REVIEW] ──► [APPROVED] ──► [ACTIVE] ──► [INACTIVE]
                                      │
                                      ▼
                                  [REJECTED]
```

- **Human Questions:** Can be created directly as `ACTIVE` by administrators or submitted as `DRAFT` / `PENDING_REVIEW`.
- **AI-Generated Questions:** Validated automatically against strict Zod schema, track rules, and similarity threshold (<= 0.70). Once passed, saved as `ACTIVE` with `source: 'AI'`.
- **Learner Serving Eligibility:** Only `ACTIVE` and `APPROVED` questions are eligible to be assigned to learners.

---

## 5. Security & RBAC Guardrails

1. **Learner Endpoints (`/api/questions/*`):**
   - Protected by `requireAuth` and rate limiter (`generalApiRateLimiter`).
   - Server resolves `learnerId` strictly from authenticated JWT token (`req.user.id`).
   - Client cannot supply or override learner ID, question scores, or approval status.
   - Ownership check prevents cross-user attempt history access.

2. **Admin Endpoints (`/api/admin/questions/*`):**
   - Protected by `requireAuth` + `requireRole('admin')` and `adminRateLimiter`.
   - Learners, evaluators, and unauthenticated clients receive HTTP 401/403.
   - All state updates recorded with admin ID and audit timestamps.

3. **AI Secret Isolation:**
   - Google Gemini and Anthropic API keys are strictly server-side in `env.ts`.
   - Zero exposure in client-facing bundles or frontend requests.

