# AIIMS AI Question Generation & Similarity Detection Report

## Executive Summary
This report documents the backend AI question generation infrastructure and duplicate-detection pipeline implemented for **AIIMS Prompt 4/12**.

The generator triggers on-demand when the human-reviewed question bank is exhausted for a requested topic, difficulty level, or track. It generates structured scenarios using the server's existing AI providers (Google Gemini / Anthropic Claude), validates outputs with Zod schemas, enforces non-coder guardrails, detects exact and near-duplicates against the existing bank, and guards against concurrency race conditions.

---

## 1. AI Generation Workflow

```
   1. Bank Exhaustion Detected (Eligible Candidates = 0)
                            │
                            ▼
   2. Check In-Flight Concurrency Mutex (Lock Key: topic::level::track)
      - If generation already in progress, join and await same Promise
      - If new, acquire lock and proceed
                            │
                            ▼
   3. Structured Prompt Assembly
      - Inject Topic, Difficulty Guide (Easy/Med/Hard), Track Rules (General vs Coding)
      - Inject Diversity Seed Variation
      - Inject Recent Existing Question Titles (Anti-Repetition Guide)
                            │
                            ▼
   4. Provider Call with JSON Schema Enforcement
      - Google Gemini (Candidate models: gemini-3.1-flash-lite, gemini-3.5-flash) with responseMimeType="application/json"
      - Anthropic Claude (claude-3-5-sonnet) with structured JSON prompt
      - Intelligent Deterministic Synthesizer (Zero-key offline fallback)
                            │
                            ▼
   5. Strict Schema Validation (aiGeneratedQuestionSchema)
      - Rejects missing fields, short scenarios, or invalid rubric scores
                            │
                            ▼
   6. Track & Complexity Consistency Check
      - General track: strictly forbids programming code blocks (```python, ```typescript)
      - Medium/Hard: enforces multiple requirements, constraints, or conflict resolution
                            │
                            ▼
   7. Similarity & Near-Duplicate Inspection
      - Compares candidate against all existing questions for topic
      - If similarity >= 0.70, rejects candidate and retries with new seed (max 3 retries)
                            │
                            ▼
   8. Save Accepted Question to Database
      - Sets source: "AI", status: "ACTIVE", version: 1
      - Records aiMetadata (provider, model, similarityScore, retryCount)
                            │
                            ▼
   9. Release Lock & Atomically Assign Question to Learner
```

---

## 2. Difficulty Level Guidelines Enforced

| Level | Thinking Complexity Requirements | Practical Workplace Examples (General Track) |
|---|---|---|
| **Easy** | One clear instruction, one defined output, minimal constraints. | Checking if an order meets promotional minimum cart value; extracting meeting date. |
| **Medium** | Multiple requirements, several constraints, specific expected output format, requires comparison or organization. | Auditing vendor invoices against AI summaries; prioritizing support transcripts into categories. |
| **Hard** | Multi-step reasoning, missing information check, conflicting facts, evaluation of alternatives, structured solution. | Resolving direct policy clash between HR contractor conversion and Finance headcount freeze; cross-department product launch communication with pending legal pricing. |

---

## 3. Similarity Detection Architecture

### 3.1 Multi-Metric Comparison Pipeline

1. **Exact String Match (100% Similarity):**
   - Normalizes prompt text and test scenario (lowercased, stripped punctuation, normalized whitespace). If identical, immediately returns similarity = 1.0.

2. **Stemmed Token Jaccard Similarity (Prompt & Title):**
   - Strips English stopwords (`about`, `after`, `because`, `which`, etc.).
   - Stems suffixes (`-ies` $\to$ `-y`, `-ing` $\to$ `""`, `-ed` $\to$ `""`, `-es` $\to$ `""`, `-s` $\to$ `""`).
   - Preserves numerical tokens (`15`, `50`, `200`) critical for scenario facts.
   - Computes Jaccard index:
     $$J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$

3. **Scenario Containment (Szymkiewicz–Simpson Overlap Coefficient):**
   - Measures subset containment when one question's scenario is embedded inside another with minor wording additions:
     $$O(A, B) = \frac{|A \cap B|}{\min(|A|, |B|)}$$
   - Catches rephrased scenarios where a standard invoice scenario is quoted with a minor header.

4. **Character N-Gram Similarity:**
   - Evaluates 3-grams across the test scenario text for fuzzy typo-tolerant matching.

5. **Composite Similarity Score:**
   - Weighted composite formula:
     $$\text{Score} = (\text{TitleSim} \times 0.20) + (\text{PromptSim} \times 0.40) + (\text{ScenarioSim} \times 0.30) + (\text{CriteriaSim} \times 0.10)$$
   - If both prompt similarity and scenario similarity exceed $0.60$, returns at least $0.75$, guaranteeing detection of substantially identical questions.

6. **Configurable Threshold:**
   - Configurable default threshold: `0.70` (70%).
   - Any generated question exceeding 70% similarity is rejected and re-attempted.

---

## 4. Concurrency Protection & Loop Prevention

1. **Active Generation Map:**
   - Map of active promises: `Map<string, Promise<GeneratedQuestionPayload>>`.
   - Key: `${topic}::${level}::${track}`.
   - Two learners requesting the same exhausted topic simultaneously share the same in-flight generation rather than making duplicate AI API calls.

2. **Loop Prevention:**
   - Fixed limit: `maxRetries = 3`.
   - Never enters an infinite loop.
   - If after 3 retries no unique question is accepted, returns a deterministic synthesized scenario or controlled HTTP 500 error without corrupting learner state.

---

## 5. Security & Secret Protection

- **Provider Key Isolation:**
  - AI API keys (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`) are accessed strictly on the backend via `Backend/src/config/env.ts`.
  - No AI keys are exposed in Vite client environment (`VITE_*`) or client-side bundles.
- **Client Output Sanitation:**
  - When serving questions to learners, internal scoring weights, similarity scores, and provider debug logs are stripped.
  - The learner receives only public scenario information (`questionId`, `topic`, `level`, `track`, `title`, `promptText`, `hint`, `testScenario`, `expectedCriteria`).

