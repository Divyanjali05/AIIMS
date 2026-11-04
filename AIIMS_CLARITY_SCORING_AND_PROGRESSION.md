# AIIMS Clarity Scoring & Configurable Progression Specification

> **AIIMS Prompt 5 Technical Reference**
> **Topic:** Server-Authoritative Rubric Scoring, Progression State Engine, and Transition Rules

---

## 1. Rubric Scoring Architecture

Clarity task evaluation is entirely server-authoritative. The client never submits or calculates final capability scores.

### 1.1 Scoring Rubric Structure
Every question in the Question Bank contains a structured `scoringRubric` with weighted criteria:

```json
[
  {
    "criterion": "Role Definition & Persona Framing",
    "maxScore": 25,
    "description": "Establishes a precise, authoritative persona matching the domain."
  },
  {
    "criterion": "Negative Constraints & Boundary Rules",
    "maxScore": 25,
    "description": "Explicitly forbids extrapolation, hallucination, or speculation."
  },
  {
    "criterion": "Ground Truth Citation & Contrast",
    "maxScore": 25,
    "description": "Directly contrasts claims against permitted test scenario policy text."
  },
  {
    "criterion": "Output Structure & Formatting Standards",
    "maxScore": 25,
    "description": "Enforces deterministic formatting, binary verdict, or structured schema."
  }
]
```

### 1.2 Evaluation Algorithm
When a learner submits their prompt via `POST /api/clarity/submit`:
1. The backend parses and sanitizes the prompt text.
2. The prompt is evaluated against each rubric criterion:
   - Thorough demonstration with explicit constraints, grounding, and structure earns maximum score ($100\%$).
   - Competent demonstration earns $85\%$ of criterion maximum.
   - Incomplete demonstration ($< 30$ chars or lacking necessary criteria) receives baseline demonstration points ($40\%$).
3. Criterion scores are aggregated:
   $$\text{Final Score} = \text{round}\left(\frac{\sum \text{Score}_{\text{earned}}}{\sum \text{Score}_{\text{max}}} \times 100\right)$$
4. A criterion-by-criterion feedback payload is constructed, detailing points earned, max points, and qualitative feedback.
5. The immutable result is written to `QuestionAttempt` and the assignment transitions to `SUBMITTED`.

---

## 2. Configurable Level Progression Engine

Learner progression through difficulty tiers (`Easy` $\to$ `Medium` $\to$ `Hard`) is managed dynamically per topic by [`clarityProgression.service.ts`](file:///c:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/clarityProgression.service.ts).

### 2.1 Progression State Model
For each learner and topic, the system maintains:
- `currentLevel`: Current active tier (`'Easy' | 'Medium' | 'Hard'`).
- `consecutiveHighScores`: Number of consecutive qualifying high scores earned at the current level.
- `totalAttempts`: Total count of submitted attempts for this topic.
- `history`: Chronological record of all attempts, scores, and difficulty levels.

### 2.2 Default Progression Thresholds
The default administrative configuration (persisted in `ClarityProgressionConfig`):
- **Upward Threshold (`upwardThreshold`):** $80$
- **Consecutive High Scores Required (`consecutiveRequired`):** $2$
- **Downward Threshold (`downwardThreshold`):** $50$

### 2.3 State Transition State Machine

```
                        Score >= 80 (Streak = 1)
                       ┌─────────────────────────┐
                       │                         │
                       ▼                         │
   ┌───────────────────────────────────────────┐ │
   │                LEVEL: EASY                │─┘
   │  (Starting level for all topic tracks)    │
   └───────────────────────────────────────────┘
                       │
                       │ 2nd Consecutive Score >= 80
                       │ (Streak resets to 0)
                       ▼
   ┌───────────────────────────────────────────┐ ◄───┐
   │               LEVEL: MEDIUM               │     │
   │  (Intermediate workplace prompt design)   │     │ Score < 50
   └───────────────────────────────────────────┘     │ (Streak resets)
         │                               │           │
         │ 2nd Consecutive Score >= 80   └───────────┼────────┐
         │ (Streak resets to 0)                      │        │
         ▼                                           │        │
   ┌───────────────────────────────────────────┐     │        │
   │                LEVEL: HARD                │─────┘        │
   │  (Advanced autonomous & multi-point gate) │              │
   └───────────────────────────────────────────┘              │
                       ▲                                      │
                       │ Score >= 80                          │
                       └──────────────────────────────────────┘
```

### 2.4 Transition Rules & Edge Cases

| Attempt Score | Current Level | Consecutive High | New Level | New Consecutive High | Direction | Notes |
|---|---|---|---|---|---|---|
| $85$ | `Easy` | $0$ | `Easy` | $1$ | `NONE` | 1st qualifying high score. Remains on Easy. |
| $82$ | `Easy` | $1$ | `Medium` | $0$ | `UP` | 2nd consecutive high score. Level advances; streak resets. |
| $90$ | `Medium` | $0$ | `Medium` | $1$ | `NONE` | 1st qualifying high score in Medium tier. |
| $65$ | `Medium` | $1$ | `Medium` | $0$ | `NONE` | Neutral score ($50 \le \text{Score} < 80$). Streak broken and reset to 0. |
| **$50$** | `Medium` | $0$ | `Medium` | $0$ | `NONE` | **Exact boundary check:** $50$ is not $< 50$; does NOT drop level. |
| **$80$** | `Medium` | $0$ | `Medium` | $1$ | `NONE` | **Exact boundary check:** $80$ is $\ge 80$; counts as high score. |
| $45$ | `Medium` | $0$ | `Easy` | $0$ | `DOWN` | Score $< 50$ drops level to Easy; streak resets. |
| $30$ | `Easy` | $0$ | `Easy` | $0$ | `NONE` | **Lower boundary:** Cannot drop below Easy level. |
| $95$ | `Hard` | $1$ | `Hard` | $2$ | `NONE` | **Upper boundary:** Cannot progress beyond Hard level. |

---

## 3. Administrative Progression Configuration API

Administrators can dynamically adjust progression sensitivity without restarting the backend or redeploying code.

### Endpoint: `PUT /api/clarity/progression-config`
- **Authorization:** `requireAuth`, `requireRole('admin')`
- **Validation Schema:** `clarityProgressionConfigSchema`
  - `upwardThreshold`: Integer between $50$ and $100$.
  - `consecutiveRequired`: Integer between $1$ and $10$.
  - `downwardThreshold`: Integer between $0$ and $100$.
  - Invariant: `downwardThreshold` must be strictly less than `upwardThreshold`.

#### Example Request:
```bash
curl -X PUT http://localhost:5000/api/clarity/progression-config \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "upwardThreshold": 85,
    "consecutiveRequired": 3,
    "downwardThreshold": 45
  }'
```

#### Example Response:
```json
{
  "success": true,
  "config": {
    "upwardThreshold": 85,
    "consecutiveRequired": 3,
    "downwardThreshold": 45,
    "updatedBy": "admin-user-id",
    "updatedAt": "2026-11-02T19:40:00.000Z"
  }
}
```
Non-admin users (e.g. `student`, `evaluator`) are immediately rejected with `HTTP 403 Forbidden`.

