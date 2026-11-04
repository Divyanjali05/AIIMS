# AIIMS Assessment History & Performance Analytics

## 1. Multi-Source Assessment History Aggregation

The assessment history service (`JourneyService.getAssessmentHistory`) unifies all evaluative activities across AIIMS into an immutable, chronological, and filterable ledger.

### Data Sources & Field Mapping

| Activity Type | Origin Model | Type Tag | Score Extraction | Status Mapping |
|---|---|---|---|---|
| **Baseline Diagnostic** | `User.assessment` | `diagnostic` | Normalized percentage ($0–100\%$) across 5 dimensions | `completed` if `rewardClaimed: true`, else `in_progress` |
| **Clarity Task Submission** | `QuestionAttempt` | `clarity` | Evaluated rubric percentage ($0–100\%$) | `completed` if `evaluationStatus === 'EVALUATED'`, else `in_progress` |
| **Pending Clarity Task** | `QuestionAssignment` | `clarity` | `null` (unscored) | `in_progress` if active, `abandoned` if abandoned |
| **Applied Lab Evaluation** | `Submission` | `submission` | Average of evaluator rubric scores normalized to $100\%$ | `completed` if `accepted` or `feedback_given`, else `in_progress` |

---

## 2. Separate Attempt Immutability & Preservation

A core architectural requirement of Prompt 8 is that **historical attempts must never be overwritten**. When a learner attempts a Clarity task multiple times:
1. Each submission produces a new, immutable `QuestionAttempt` record identified by a cryptographically random UUID (`attemptId`).
2. The aggregation pipeline calculates an ascending attempt index (`attemptNumber`) for that specific topic and question.
3. Earlier attempts retain their exact submitted answers, timestamps, time taken, and rubric feedback breakdowns.
4. The frontend renders each attempt as an independent row in the Assessment History table, allowing learners and mentors to observe longitudinal improvement.

```json
{
  "id": "att_002",
  "attemptNumber": 2,
  "type": "clarity",
  "title": "Clarity Lab: Prompt Architecture",
  "topic": "Prompt Architecture",
  "level": "Medium",
  "score": 88,
  "maxScore": 100,
  "status": "completed",
  "date": "2026-10-17T11:20:00.000Z",
  "timeTakenSeconds": 1200,
  "rubricSummary": "2 rubric criteria evaluated",
  "rubrics": [
    {
      "criterion": "Step Deconstruction",
      "score": 5,
      "maxScore": 5,
      "comment": "Exemplary reasoning"
    },
    {
      "criterion": "Fallback Guidance",
      "score": 4,
      "maxScore": 5,
      "comment": "Strong handling"
    }
  ]
}
```

---

## 3. Query Validation, Filtering & Pagination

All incoming queries to `GET /api/journey/assessment-history` are validated through Zod via `assessmentHistoryQuerySchema`:

### Query Parameters

| Parameter | Type | Validation Rules & Defaults | Behavior |
|---|---|---|---|
| `page` | Integer | Min: 1, Default: 1. Non-numeric or negative values default to 1. | Sets pagination offset: `(page - 1) * limit`. |
| `limit` | Integer | Min: 1, Max: 50, Default: 10. Clamped to 50 to prevent DoS. | Sets maximum records returned per response. |
| `type` | Enum | `'all'` (default), `'diagnostic'`, `'clarity'`, `'submission'`. | Filters records by evaluative activity source. |
| `status` | Enum | `'all'` (default), `'completed'`, `'in_progress'`, `'abandoned'`. | Filters records by attempt completion status. |
| `startDate` | ISO String | Optional valid date string. | Excludes records submitted prior to timestamp. |
| `endDate` | ISO String | Optional valid date string. | Excludes records submitted after timestamp. |

---

## 4. Performance & Skill Analytics Engine

The skill analytics pipeline (`JourneyService.getPerformanceAnalytics`) derives evidence-backed insights from actual learner evaluations while enforcing strict statistical validity.

### 4.1 Data-Sufficiency Guard
To prevent fabricating skill mastery or growth advice from insufficient data:
- **Prerequisite Rule:** A learner must have completed either the **Baseline Diagnostic Assessment** OR at least **two evaluated Clarity task attempts**.
- **Behavior on Insufficient Data:**
  ```json
  {
    "hasSufficientData": false,
    "dataNotice": "Insufficient historical data to infer skill mastery. Complete your baseline diagnostic assessment and at least two Clarity tasks to generate reliable performance analytics.",
    "strongestSkills": [],
    "growthAreas": [],
    "scoreTimeline": []
  }
  ```
  The UI responds by rendering an informative educational state guiding the learner to complete the diagnostic assessment, rather than generating deceptive placeholder metrics.

### 4.2 Strengths vs. Growth Areas Classification
When sufficient data exists, dimensions and topics are classified deterministically:
- **Demonstrated Strengths:** Evaluated dimensions with normalized scores $\ge 70\%$.
- **Target Growth Opportunities:** Evaluated dimensions with normalized scores $< 70\%$.

### 4.3 Anti-Conflation Score Timeline
The system **never averages unrelated assessment scores together** into an arbitrary, unscientific aggregate. Instead, the timeline preserves the semantic meaning of each evaluation:
- Diagnostic assessment scores (evaluating broad cognitive habits across 5 foundational dimensions).
- Clarity task scores (evaluating execution on specific prompt and workflow challenges).
- The timeline presents these evaluations chronologically with explicit `scoreType` tags (`diagnostic` vs. `clarity`).

### 4.4 Plain-English Basis Explanation
Every analytics payload includes a transparent disclosure of how its metrics were derived:
> *"Scores reflect server-persisted records: Diagnostic assessment scores are normalized across 5 foundational dimensions (0-100%). Clarity scores represent multi-criteria rubric evaluations from final submitted tasks."*

