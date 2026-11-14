# AIIMS — Dynamic Student Academic Registration & Entrepreneur-Specific Onboarding Report

**Document Version:** 1.0.0
**Date:** 12 November 2026
**Auditor / Architect:** Senior Full-Stack & Database Architect
**Project:** AIIMS (AI Intelligence & Mentoring System)
**Database Architecture:** PostgreSQL + Prisma ORM ONLY

---

## 1. Executive Summary

This engineering report documents the architectural redesign, implementation, and automated verification of the AIIMS Registration and Onboarding System under **PROMPT 8**.

Prior to this implementation, the onboarding process exhibited three fundamental architectural limitations:
1. **Hardcoded Graduation Assumptions:** Academic graduation years and study years were static, failing to accommodate 2-year programs (MBA, MCA, M.Tech), 3-year degrees (BCA, B.Sc, BBA), 5-year programs (MBBS, Dual Degrees), gap-year students, or academic extensions.
2. **Entrepreneur Flow Contamination:** Entrepreneurs were forced through an academic student taxonomy (stream, degree, specialization, study year, and college), polluting academic cohort benchmarks with synthetic founder records.
3. **Rigid College Selection:** Students whose colleges were not in the pre-seeded partner directory lacked a structured free-text entry mechanism without risking database foreign-key violations.

### Key Architectural Solutions Implemented
- **Dynamic Program Duration Engine:** Bounded study years `[1..D]` and dynamic expected graduation year derivation based on formal program metadata.
- **Calendar-Agnostic Year Generation:** Dynamic admission year selection and graduation options generated relative to `new Date().getFullYear()`, eliminating year-boundary obsolescence.
- **Dedicated Entrepreneur Profile & Journey:** Independent `EntrepreneurProfile` Prisma model, dedicated database migration, and a customized 3-stage founder onboarding flow with zero mandatory academic fields.
- **Custom College Free-Text Support:** Clean support for "My college is not listed" setting `instituteName` while leaving `instituteId: null` to preserve database relational integrity.
- **Cross-Track Contamination Defense:** Strict Zod runtime and controller-level guards rejecting student fields in entrepreneur payloads and vice versa.
- **Authoritative Credits Integrity:** Atomic PostgreSQL transactions guaranteeing a single idempotent +500 AC welcome grant in the immutable `CreditLedger` and `User.aiimsCredits`.

---

## 2. PostgreSQL Database Architecture & Schema Changes

### 2.1 Prisma Schema Enhancements (`Backend/prisma/schema.prisma`)

A dedicated `EntrepreneurProfile` entity was introduced with a 1-to-1 relation to `User`:

```prisma
model User {
  id                   String                @id @default(uuid())
  email                String                @unique
  // ... core authentication fields ...
  track                String                @default("Student") // "Student" | "Entrepreneur"
  studentProfile       StudentProfile?
  entrepreneurProfile  EntrepreneurProfile?
  creditLedgers        CreditLedger[]
  // ...
}

model EntrepreneurProfile {
  id                 String   @id @default(uuid())
  userId             String   @unique @map("user_id")
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  fullName           String   @map("full_name")
  ventureName        String   @map("venture_name")
  industry           String
  problemStatement   String?  @map("problem_statement") @db.Text
  ventureStage       String   @map("venture_stage")
  primaryGoal        String?  @map("primary_goal")
  skillsToDevelop    String[] @default([]) @map("skills_to_develop")
  businessChallenges String[] @default([]) @map("business_challenges")
  preferredSupport   String[] @default([]) @map("preferred_support")
  isComplete         Boolean  @default(true) @map("is_complete")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  @@index([industry])
  @@index([ventureStage])
  @@map("entrepreneur_profiles")
}
```

### 2.2 Additive Migration Script (`Backend/prisma/migrations/0002_entrepreneur_profile/migration.sql`)

A non-destructive PostgreSQL migration script was authored:
- Created the table `entrepreneur_profiles` with `ON DELETE CASCADE` foreign-key constraint referencing `users(id)`.
- Added performance indexes on `industry` and `venture_stage`.
- Verified strictly zero destructive statements (`NO DROP`, `NO ALTER` destructive changes).

### 2.3 Prisma Test Double Sync (`Backend/src/services/__tests__/helpers/prismaTestDouble.ts`)

The in-memory test double used across Vitest suites was extended with `entrepreneurProfile` table definitions, unique indexes, and default column values to ensure 100% offline test parity with PostgreSQL.

---

## 3. Dynamic Academic Taxonomy & Calendar-Agnostic Algorithms

Implemented in both `Backend/src/config/academicTaxonomy.ts` and `Frontend/src/config/academicTaxonomy.ts`:

### 3.1 Program Duration Taxonomy
Durations are bound to official degree specifications:
- **4 Years:** B.Tech, B.E., B.Pharm, School (Class 9–12)
- **3 Years:** BCA, B.Sc, BBA, B.Com, BA, LLB
- **2 Years:** MBA, MCA, M.Tech, M.E., M.Sc, M.Com, MA, B.Ed
- **1 Year:** LLM, Executive MBA
- **5 Years:** MBBS, Ph.D, Integrated Dual Degrees

```typescript
export const getProgramDuration = (programId: string): number => {
  const p = PROGRAMS.find((item) => item.id === programId);
  return p?.normalDuration || 4;
};

export const getStudyYearsForProgram = (programId: string): number[] => {
  const duration = getProgramDuration(programId);
  return Array.from({ length: duration }, (_, i) => i + 1);
};
```

### 3.2 Dynamic Start & Graduation Year Derivation
Calculations are rooted in `baseCalendarYear ?? new Date().getFullYear()`:
- **Admission Start Years:** Window covering `[currentYear + 1, currentYear, ..., currentYear - duration - 3]`. Accommodates upcoming admissions, standard progression, and students with gap years or late entries.
- **Expected Graduation Year:** Calculated as `startYear + duration`, with extension options up to `+4` years for academic repeats, dual credentials, or semester breaks.
- **Date Consistency Validation:**
  - `studyYear` must be between `1` and `duration`.
  - `startYear` cannot exceed `currentYear + 1`.
  - `graduationYear` must be strictly greater than `startYear`.

---

## 4. Backend Registration API & Validation Guardrails

### 4.1 Zod Runtime Schemas (`Backend/src/schemas/auth.schema.ts`)
- **Student Track Validation:** Requires `stream`, `educationLevel`, `programId`, `specializationId`, `yearOfStudy`, `admissionYear`, `expectedGraduationYear`. Rejects any payload containing entrepreneur fields (`ventureStage`, `problemStatement`).
- **Entrepreneur Track Validation:** Requires `track: 'Entrepreneur'`. Enforces `ventureStage` validation when supplied. Strictly rejects student academic fields (`stream`, `educationLevel`, `programId`, `specializationId`, `yearOfStudy`).

### 4.2 Atomic Transaction Controller (`Backend/src/controllers/auth.controller.ts`)
Executes inside a single `prisma.$transaction`:
1. **Uniqueness Check:** Pre-verifies email uniqueness before user creation.
2. **User Creation:** Populates `User` table with role `learner` and starting credits (500 AC).
3. **Ledger Grant:** Inserts an authoritative `CreditLedger` entry with type `EARN`, category `REWARD`, and idempotency key `welcome-${userId}`.
4. **Student Track Branch:**
   - Resolves `instituteName` (falling back to user-supplied text when `instituteId` is null).
   - Upserts `Cohort` aggregating student count.
   - Inserts `StudentProfile`.
5. **Entrepreneur Track Branch:**
   - Inserts `EntrepreneurProfile` with venture stage, problem statement, and goals.
   - Configures `aiWalletData.audienceMode = 'entrepreneur'`.
   - **Guarantees zero Cohort and zero StudentProfile generation.**
6. **Session & Profile Return:**
   - `login` and `getMe` return `academicProfile` for students and `entrepreneurProfile` for entrepreneurs.

---

## 5. Frontend Multi-Step Registration UI Redesign

### 5.1 Dynamic Stepper & Navigation (`Frontend/src/screens/auth/RegisterScreen.tsx`)
- **Student Stepper:** `Stage 1: Account` → `Stage 2: Academics` → `Stage 3: AI Profile`
- **Entrepreneur Stepper:** `Stage 1: Account` → `Stage 2: Venture Info` → `Stage 3: Growth & Goals`

### 5.2 Stage 2 Redesign
- **Student Academics:**
  - Dynamic duration badge next to program select: `Normal Duration: D Years`.
  - Dynamically bound Study Year options `[1..D]`.
  - Custom college toggle: *"My college or institute is not listed"* revealing free-text college entry input.
  - Auto-updating Expected Graduation Year dropdown with dynamic standard calculation and extension options.
- **Entrepreneur Venture Info:**
  - Venture Name with *"Not started yet / Exploring ideas"* quick-toggle.
  - Target Industry dropdown (12 comprehensive sectors).
  - Problem statement textarea.
  - Interactive Venture Stage selector cards with descriptive subtitles (7 distinct stages).

### 5.3 Stage 3 Redesign
- **Student:** AI Familiarity cards, AI usage context pills, and primary learning goal dropdown.
- **Entrepreneur:** Primary venture goal dropdown, skills to develop multi-select pills, business challenges multi-select pills, and preferred support area pills.

---

## 6. Comprehensive Automated Verification Evidence

### 6.1 Dedicated Vitest Suite (`Backend/src/services/__tests__/registrationRedesign.test.ts`)
18 tests covering all functional invariants:
- **1. Academic Taxonomy & Program Duration Functions (6 tests):**
  - Program duration resolution across B.Tech (4), BCA (3), MCA (2), MBBS (5), and fallback (4) — **PASS**
  - Study year arrays `[1..D]` generation — **PASS**
  - Dynamic graduation year derivation — **PASS**
  - Calendar-agnostic start year generation — **PASS**
  - Graduation year options with extension handling — **PASS**
  - Date consistency checks (duration bounds, future limits, ordering) — **PASS**
  - Venture stage and industry taxonomy integrity — **PASS**
- **2. Dynamic Student Registration Flow (4 tests):**
  - 4-year B.Tech student registration with cohort and +500 AC ledger grant — **PASS**
  - Custom college free-text entry (`instituteId: null` + `instituteName`) — **PASS**
  - Rejection of study year exceeding degree duration (Year 3 of MBA) — **PASS**
  - Rejection of graduation year less than or equal to start year — **PASS**
- **3. Independent Entrepreneur Onboarding Flow (3 tests):**
  - Complete venture registration, +500 AC grant, audienceMode, and zero cohort/student profile records — **PASS**
  - Ideation stage with optional / exploratory venture name — **PASS**
  - Rejection of invalid venture stage (HTTP 400 `INVALID_INPUT`) — **PASS**
- **4. Cross-Track Field Isolation & Validation Guards (2 tests):**
  - Rejection of student registration containing venture fields — **PASS**
  - Rejection of entrepreneur registration containing student academic fields — **PASS**
- **5. Session & Specialized Profile Retrieval (2 tests):**
  - Login & `getMe` returning `academicProfile` for Student — **PASS**
  - Login & `getMe` returning `entrepreneurProfile` for Entrepreneur — **PASS**

**Result:** `18 passed (18)` in `786ms`.

### 6.2 Full-System Integration & Regression Suites
- `Backend/src/services/__tests__/fullSystemLifecycle.test.ts`: **18 passed (18)**
- `Backend/src/services/__tests__/validation.test.ts`: **42 passed (42)**
- Combined regression run: **78 passed (78)**

### 6.3 TypeScript Compiler Verification
- **Backend Typecheck:** `npm --prefix Backend run typecheck` (`tsc --noEmit`) → **Exit code 0 (0 errors)**
- **Frontend Typecheck:** `npm --prefix Frontend run typecheck` (`tsc --noEmit`) → **Exit code 0 (0 errors)**

### 6.4 Production Builds
- **Backend Production Build:** `npm --prefix Backend run build` (`npm run clean && tsc`) → **Exit code 0**
- **Frontend Production Build:** `npm --prefix Frontend run build` (`tsc && vite build`) → **Exit code 0 (Built in 8.29s)**

---

## 7. Modified & Created Artifacts

| File Path | Description |
| :--- | :--- |
| [`Backend/prisma/schema.prisma`](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/schema.prisma) | Added `EntrepreneurProfile` model and `User.entrepreneurProfile` relation. |
| [`Backend/prisma/migrations/0002_entrepreneur_profile/migration.sql`](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/prisma/migrations/0002_entrepreneur_profile/migration.sql) | Additive PostgreSQL migration script for `entrepreneur_profiles` table and indexes. |
| [`Backend/src/config/academicTaxonomy.ts`](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/config/academicTaxonomy.ts) | Added duration lookup, dynamic year generators, date validators, and entrepreneur taxonomies. |
| [`Backend/src/schemas/auth.schema.ts`](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/schemas/auth.schema.ts) | Cross-track Zod validation rules and entrepreneur field schemas. |
| [`Backend/src/controllers/auth.controller.ts`](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/controllers/auth.controller.ts) | Atomic transaction registration handling, custom college resolution, and specialized profile retrieval. |
| [`Backend/src/services/__tests__/helpers/prismaTestDouble.ts`](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/__tests__/helpers/prismaTestDouble.ts) | Test double specification for `entrepreneurProfile` table. |
| [`Backend/src/services/__tests__/registrationRedesign.test.ts`](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/__tests__/registrationRedesign.test.ts) | 18-test comprehensive test suite for dynamic academic and entrepreneur onboarding. |
| [`Backend/src/services/__tests__/validation.test.ts`](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Backend/src/services/__tests__/validation.test.ts) | Synchronized validation tests with cross-track isolation rules. |
| [`Frontend/src/config/academicTaxonomy.ts`](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/config/academicTaxonomy.ts) | Frontend duration helpers, dynamic year derivations, and entrepreneur options. |
| [`Frontend/src/types/index.ts`](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/types/index.ts) | TypeScript interfaces for `EntrepreneurProfile` and updated `LearnerState`. |
| [`Frontend/src/context/LearnerContext.tsx`](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/context/LearnerContext.tsx) | Updated registration payload dispatcher and state management. |
| [`Frontend/src/screens/auth/RegisterScreen.tsx`](file:///C:/Users/divya/OneDrive/Documents/AIIMS/Frontend/src/screens/auth/RegisterScreen.tsx) | Redesigned multi-step form with dynamic steppers, duration tags, custom college toggle, and founder cards. |
| [`AIIMS_MANUAL_ACCEPTANCE_TEST_TRACKER.md`](file:///C:/Users/divya/OneDrive/Documents/AIIMS/AIIMS_MANUAL_ACCEPTANCE_TEST_TRACKER.md) | Updated test scenarios M-01, M-01B, and M-02 with exact browser steps. |

---

## 8. Manual Verification Instructions (M-01 & M-02)

To verify the updated user onboarding flows directly in the browser:

1. **Start the Development Servers:**
   - Terminal 1 (Backend): `npm --prefix Backend run dev`
   - Terminal 2 (Frontend): `npm --prefix Frontend run dev`
2. **Execute Test M-01 (Dynamic Student Registration):**
   - Open `http://localhost:3000/register`.
   - Select track **"Student"**, fill account credentials, and click Continue.
   - On Stage 2, select **"B.Tech / B.E."** and observe the `Normal Duration: 4 Years` tag.
   - Check **"My college or institute is not listed"** and enter a custom college name.
   - Select admission year and notice only Years 1 through 4 are available for study year.
   - Complete Stage 3 and verify redirection to dashboard with **500 AC** in the top navigation.
3. **Execute Test M-02 (Independent Entrepreneur Onboarding):**
   - In a private/incognito tab, navigate to `http://localhost:3000/register`.
   - Select track **"Entrepreneur"** and observe the stepper dynamically change to `['Account', 'Venture Info', 'Growth & Goals']`.
   - On Stage 2, verify zero academic fields appear. Enter venture name, industry, problem statement, and select a venture stage card.
   - Complete Stage 3 and verify successful registration with **500 AC** welcome grant and tailored founder orientation.

