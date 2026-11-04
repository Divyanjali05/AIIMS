# AIIMS Clarity Module Architecture & Technical Specification

> **AIIMS Prompt 5 Technical Architecture Document**
> **Status:** Fully Implemented & Verified
> **Scope:** Full-Stack Clarity Learning Module, Question Bank Integration, Decoupled Execution, Submission Locking, and Configurable Level Progression

---

## 1. Executive Summary & Purpose

The **Clarity Module** is AIIMS's hands-on interactive prompt engineering laboratory. Its objective is to train learners to design, iterate, and verify effective AI prompts against real-world, practical scenarios.

### Core Architectural Decisions:
1. **Dynamic Question Bank Integration:** Replaced hardcoded client-side task arrays (`getTasksForTopic`) with server-authoritative question serving powered by Prompt 4's Question Bank (`QuestionBank.model.ts`, `QuestionAssignment.model.ts`, `QuestionAttempt.model.ts`).
2. **Default Non-Coder Track:** Non-coder practical everyday study and workplace scenarios (`track: 'General'`) are the default experience. Technical/coding questions are strictly opt-in.
3. **Run vs. Submit Decoupling:**
   - **Run:** Test prompt execution against the question's permitted test scenario without completing or locking the assignment. Costs 0 AC on complimentary first trial; costs 10 AC atomically on subsequent runs via `creditsLedgerService` with automatic atomic refunds on AI provider failure.
   - **Submit:** Server-authoritative rubric evaluation, immutable attempt logging in `QuestionAttempt`, task status transition to `SUBMITTED`, authoritative completion credit award (+15 AC / +50 XP), progression state update, and permanent locking.
4. **Lock After Submission:** When an assignment is submitted, the question prompt, editor, Run button, Submit button, and mentor doubt chat lock together into a read-only state. Locking is enforced server-side (HTTP 409 `TASK_LOCKED`) and persisted client-side across page reloads, remounts, and re-authentications.
5. **Configurable Level Progression:** Tracks consecutive high scores per topic and advances learners (`Easy` $\to$ `Medium` $\to$ `Hard`) or steps down on low scores (`< 50`) using configurable administrative thresholds (`ClarityProgressionConfig.model.ts`).
6. **Authoritative Elapsed Timer:** Computed client-side using `(Date.now() - new Date(assignedAt).getTime())` to prevent clock fraud and maintain continuity across browser refreshes and session restarts.

---

## 2. Visual Hierarchy & Screen Layout Architecture

The Clarity interface in [`Level2AITaskLab.tsx`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/clarity/Level2AITaskLab.tsx) is organized into 6 strictly ordered visual sections:

```
┌────────────────────────────────────────────────────────────────────────┐
│ SECTION 1: HEADER & STATUS BAR                                         │
│ • Topic Title ("Checking AI")                                          │
│ • Difficulty Chip (Level: Easy / Medium / Hard)                        │
│ • Authoritative Elapsed Timer (02:45) & Lock Status Badge              │
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│ SECTION 2: QUESTION CARD                                               │
│ • Clear Question Title                                                 │
│ • Concise Plain-Text Scenario (<= 4 lines with "Show More" expansion) │
│ • Permitted Test Input Context Card with 1-Click Copy                  │
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│ SECTION 3: HINT ACCORDION                                              │
│ • Collapsed by Default; Labeled exactly "Hint (optional)"              │
│ • Expandable on-demand for practical prompt engineering guidance       │
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│ SECTION 4: PROMPT EDITOR                                               │
│ • Starts EMPTY with placeholder: "Write your prompt here"              │
│ • No prefilled starter prompt; Auto-saved to localStorage drafts       │
│ • Character counter (X / 3000 chars); Disabled when locked             │
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│ SECTION 5: DECOUPLED ACTIONS                                           │
│ • [Run Prompt (10 AC / Free Trial)]: Test against AI scenario          │
│ • [Submit Task (+15 AC)]: Server rubric scoring & lock task            │
└────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────┐
│ SECTION 6: RESULTS, RUBRIC FEEDBACK & NEXT STEPS                       │
│ • Radial / Gauge Rubric Score (0-100)                                  │
│ • Multi-Dimensional Criteria Breakdown (Relevance, Constraints, etc.)  │
│ • Progression Transition Banner (Level Upgraded / Neutral / Downgraded)│
│ • [Next Practice Question →]: Serves next unrepeated question          │
│ • Read-Only Mentor Doubt Query & Submissions History                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Models & Schemas

### 3.1 Clarity Progression Configuration Model
Stored in MongoDB with in-memory fallback for local environments:
[`ClarityProgressionConfig.model.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/models/ClarityProgressionConfig.model.ts)

```typescript
export interface IClarityProgressionConfig extends Document {
  upwardThreshold: number;     // Default: 80 (score required to count as high)
  consecutiveRequired: number; // Default: 2 (consecutive high scores required to advance)
  downwardThreshold: number;   // Default: 50 (score below which level drops)
  updatedBy: string;
  updatedAt: Date;
}
```

### 3.2 Learner Clarity Progression Model
Tracks per-learner, per-topic progression state:
[`LearnerClarityProgression.model.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/models/LearnerClarityProgression.model.ts)

```typescript
export interface ILearnerClarityProgression extends Document {
  learnerId: string;
  topic: string;
  currentLevel: 'Easy' | 'Medium' | 'Hard';
  consecutiveHighScores: number;
  totalAttempts: number;
  lastScore?: number;
  history: Array<{
    attemptId: string;
    score: number;
    level: 'Easy' | 'Medium' | 'Hard';
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.3 Question Assignment & Attempt Integration
Reuses Prompt 4 Question Bank models:
- **`QuestionAssignment.model.ts`:** Tracks assignment lifecycle (`ASSIGNED` $\to$ `IN_PROGRESS` $\to$ `SUBMITTED`), authoritative `assignedAt` timestamp, learner ID, question ID, topic, level, and college.
- **`QuestionAttempt.model.ts`:** Immutable attempt log containing learner's final prompt, normalized score (0-100), detailed criterion-by-criterion rubric feedback, and completion timestamp.

---

## 4. API Endpoints Specification

| Method | Endpoint | Auth Guard | Description |
|---|---|---|---|
| `POST` | `/api/clarity/active-task` | `requireAuth` | Retrieves active or latest assignment for topic. If none exists, automatically serves next eligible question. |
| `POST` | `/api/clarity/run` | `requireAuth`, Rate Limited | Decoupled test prompt execution. Meters 10 AC (0 on trial). Refunds on failure. Rejects with 409 if locked. |
| `POST` | `/api/clarity/submit` | `requireAuth` | Final submission. Evaluates rubric, logs immutable attempt, awards credits/XP, updates progression, locks assignment. |
| `POST` | `/api/clarity/next-task` | `requireAuth` | Serves next unrepeated question at learner's updated level with 30-day institution exclusion. |
| `GET` | `/api/clarity/progression` | `requireAuth` | Retrieves learner's progression status and consecutive score streaks for topic. |
| `GET` | `/api/clarity/progression-config` | `requireAuth` | Retrieves active progression thresholds. |
| `PUT` | `/api/clarity/progression-config` | `requireAuth`, `requireRole('admin')` | Updates progression thresholds (Admin only). |

---

## 5. Security & Locking Invariants

1. **Server-Side Submission Lock:** When `assignment.status === 'SUBMITTED'`, any subsequent requests to `/api/clarity/run` or `/api/clarity/submit` return `HTTP 409 Conflict` with error code `TASK_LOCKED`. Client cannot tamper with local state to re-run or re-score a finalized attempt.
2. **Credit Ledger Metering Integrity:**
   - Pre-deduction: Subsequent runs deduct 10 AC atomically via `creditsLedgerService` before dispatching external AI calls.
   - Provider Failure Safeguard: If AI execution fails, an atomic `REFUND` transaction restores 10 AC with audit trail metadata.
   - Submission Award Idempotency: Completion credits (+15 AC) are keyed by `clarity::submit::${assignmentId}`, preventing duplicate credit rewards on replay.
3. **Institutional Question Isolation:** Learners from the same institution will not receive the same question within the configurable 30-day exclusion window. Personal history prevents a learner from ever receiving the same question twice.
4. **Draft Protection:** In-progress drafts are auto-saved to scoped `localStorage` keys (`aiims_clarity_draft_${assignmentId}`), preventing accidental loss of learner input across tab switches or accidental refreshes.

