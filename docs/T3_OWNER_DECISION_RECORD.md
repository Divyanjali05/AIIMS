# AIIMS – T3 Owner Decision Record

**Decision Status:** APPROVED  
**Decision Date:** 2026-11-07  
**Scope:** Focus Challenge rewards, server-side timing authority, and submission integrity for Task T3

---

### 1. Focus Challenge Reward Rules

Per-level thresholds are configured centrally in `Backend/src/config/credits.config.ts` under `FOCUS_CHALLENGE_RULES`. No reward thresholds are hardcoded in route controllers.

| Difficulty | Fast Threshold | Normal Threshold | Over-time Threshold |
|---|---:|---:|---:|
| **Easy** | $\le 5$ min (300s): **20 AC** | $\le 10$ min (600s): **15 AC** | $> 10$ min (600s): **0 AC** |
| **Medium** | $\le 10$ min (600s): **20 AC** | $\le 20$ min (1200s): **15 AC** | $> 20$ min (1200s): **0 AC** |
| **Hard** | $\le 15$ min (900s): **20 AC** | $\le 30$ min (1800s): **15 AC** | $> 30$ min (1800s): **0 AC** |

- XP Award: Standard 50 XP awarded for successful on-time completions (Fast and Normal). For over-time completions, 0 AC and 0 XP are awarded, while the genuine score and attempt history are preserved.
- **Decision:** **APPROVED**

---

### 2. Timing Authority

- The server authoritatively calculates elapsed time using:
  `serverDurationSeconds = Math.max(0, Math.floor((submittedAt.getTime() - assignedAt.getTime()) / 1000))`
- `submittedAt` is captured exactly once per submission on the server (`new Date()`).
- The same server-calculated duration is used for reward tier determination and stored in `QuestionAttempt.timeTakenSeconds`.
- Client-provided `timeTakenSeconds` is ignored for authoritative timing; client timer is display-only.
- **Decision:** **APPROVED**

---

### 3. Submission and Reward Integrity

- **Duplicate Submission Guard:** Submitting an already submitted assignment (`status === 'SUBMITTED'`) returns **HTTP 409 Conflict** (`code: 'TASK_LOCKED'`).
- **Idempotency:** AC and XP rewards are credited idempotently via `creditsLedgerService` using key format `focus::challenge::${assignmentId}`.
- **Reload State:** Submitted assignments remain locked after page reload or application restart.
- **Question Isolation & Uniqueness:** Questions previously served to a learner are excluded from future assignments for that learner (`getLearnerServedQuestionIds`).
- **Module Isolation:** Clarity and Focus assignment streams remain completely isolated.
- **Over-time Attempt Retention:** Over-time submissions retain full rubric scores, feedback, and attempt history in MongoDB, with 0 AC awarded.
- **Decision:** **APPROVED**

---

### 4. AI Provider Verification

- Live provider verification requires valid configured credentials.
- When live credentials are not present in test/sandbox environments, checks are explicitly marked **BLOCKED**; credentials are never exposed and offline heuristic scores are never substituted in production paths.
- **Decision:** **APPROVED**

---

### 5. Authorization

- **Product Owner:** Divya (Confirmed via AIIMS Agent Interactive Authorization)
- **Decision Date:** 2026-11-07
- **Approval:** **APPROVED**
- **Status:** Ratified for Task T3 end-to-end execution.
