# AIIMS Real Intelligence Architecture & Readiness Matrix

This document defines the architectural classification, service contracts, data pipelines, privacy boundaries, and fallback strategies for the AIIMS Real Intelligence Layer.

---

## 1. System Architecture Overview

```
LearnerState (Source of Truth)
      ↓
LearnerProfileContext (Normalized Scoped Context)
      ↓
AI Intelligence Layer (MentorService, RelevanceEngine, SignalIngestionAdapter)
      ↓
Structured Response Contracts (MentorResponse, LearnerRelevanceResult, InvestigationEvidence)
      ↓
UI Layer (HomeScreen, AnalysisScreen, ClarityScreen, FocusScreen, RadarScreen, InvestigationScreen, RelevanceScreen)
```

---

## 2. Implemented Intelligence Service Contracts

### A. Learner Profile Context (`learnerProfileContext.ts`)
- **Purpose**: Dynamically derives a normalized, privacy-scoped context from `LearnerState` for AI consumption without creating parallel state.
- **Contract Schema**:
  - `profile`: `{ name, role, targetGoal, stage }`
  - `assessment`: `{ isCompleted, completedAt, scores, topCapability, growthArea, answeredQuestionsCount }`
  - `clarity`: `{ status, selectedTopic, completedTopics, reflectionsCount, latestReflection }`
  - `focus`: `{ status, activeFocusTrack, candidateFocusTrack, history, activatedAt }`
  - `radar`: `{ followedSignalCount, investigatedSignalIds }`
  - `investigation`: `{ isCompleted, selectedSignalId, userNotesCount, latestNote }`
  - `journeyProgress`: `{ completedStagesCount, currentStageName, progressPercent, statusLabel }`

### B. AIIMS Mentor Provider Boundary (`mentorProvider.ts`)
- **Contract Schema (`MentorResponse`)**:
  - `message`: string
  - `observationType`: `'orientation' | 'observation' | 'clarification' | 'encouragement' | 'connection' | 'investigation' | 'reflection' | 'nextStep'`
  - `relatedStage`: string
  - `relatedTopic`: string (optional)
  - `suggestedAction`: `{ text, targetTab }` (optional)
  - `provider`: `'deterministic' | 'ai_service'`
- **Providers**:
  - `DeterministicMentorProvider`: Evaluates `LearnerState` locally via `getMentorObservation`.
  - `AIMentorProvider`: Calls secure backend proxy endpoint `/api/ai/mentor`.
  - `MentorService`: Singleton orchestrator enforcing a 2.5-second timeout with automatic fallback to local deterministic observation if network/API fails.

### C. Technical Signal Ingestion Pipeline (`signalIngestionAdapter.ts` & `signalDataProvider.ts`)
- **Pipeline Flow**:
  `Signal Source -> Ingestion Adapter -> Normalizer -> RadarSignal -> Relevance Engine -> RadarScreen`
- **Adapters**:
  - `ArXivHuggingFaceIngestionAdapter`: Normalizes external technical release streams into the `RadarSignal` schema.
  - `FallbackStaticIngestionAdapter`: Provides development signals if network connections fail.

### D. Personal Relevance Engine & Traceability (`relevanceEngine.ts`)
- **Traceability Tiers**:
  1. `SOURCE DATA`: Original technical headline and summary.
  2. `AIIMS SYSTEM INTERPRETATION`: System technical shift scaffold (*what changed*).
  3. `YOUR REFLECTION & EVIDENCE`: Personal connection using `topCapability`, `growthArea`, `clarityReflection`, and `userInvestigationNote`.
  4. `RECOMMENDED ACTIONABLE NEXT STEP`: Tailored practical next step.

### E. Investigation Evidence Scaffold (`investigationEvidence.ts`)
- **Contract Schema (`InvestigationEvidence`)**:
  - `signalId`, `signalTitle`, `scaffold` (`yesterday`, `today`, `whatChanged`, `whosAffected`), `learnerObservation`, `completedAt`, `activeFocusTrack`, `topCapability`, `growthArea`.
- **Learner Authority**: The learner's reflection is recorded as authoritative evidence. AI assists but does not replace learner reasoning.

---

## 3. Privacy & Security Boundary

- **No Secrets in Frontend**: API keys (`ANTHROPIC_API_KEY`) are stored exclusively in backend environment variables (`Backend/src/config/env.ts`), never in client React bundles or Vite environment variables.
- **Task-Scoped Context Payload**: External AI calls receive only task-specific context parameters (e.g. `role`, `stage`, `topCapability`, `growthArea`, `activeFocus`), omitting account emails, user IDs, or unneeded activity logs.

---

## 4. Fallback & Degradation Matrix

| Scenario | Primary Handler | Fallback Handler | Learner Experience Impact |
| :--- | :--- | :--- | :--- |
| **Backend AI API Timeout** | `AIMentorProvider` | `DeterministicMentorProvider` | Seamless transition to local deterministic observation |
| **Malformed AI JSON Response** | `AIMentorProvider` | `DeterministicMentorProvider` | Discard bad payload; display valid structured observation |
| **External Signal Stream Down** | `ArXivHuggingFaceIngestionAdapter` | `FallbackStaticIngestionAdapter` | Displays structured development signals without error |
| **Offline / Airplane Mode** | Local React State | `localStorage` (`aiims_learner_state_v3`) | Full journey remains functional |
