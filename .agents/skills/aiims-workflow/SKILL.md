---
name: aiims-workflow
description: >-
  Standard development, testing, and verification workflow for the AIIMS project.
  Use when developing, modifying, testing, or auditing features across the AIIMS
  React frontend, Express backend, credits system, or MongoDB data models.
---

# AIIMS Development & Verification Runbook

This skill outlines the standard operating procedure for implementing, reviewing, and verifying changes within the AIIMS codebase.

---

## Workflow Steps

### Step 1: Pre-Implementation Analysis & Inspection
1. Read the target files and their corresponding TypeScript interfaces in `Backend/src/types/index.ts` or `Frontend/src/types/index.ts`.
2. Inspect package dependencies in `Backend/package.json` or `Frontend/package.json`.
3. Check existing database models in `Backend/src/models/` to ensure schema consistency.
4. Verify if related tests exist in `Backend/src/scripts/` or `Frontend/src/services/__tests__/`.

### Step 2: Surgical, Targeted Implementation
1. Apply focused modifications. Avoid rewriting entire modules or altering unrelated code blocks.
2. Maintain existing utility and component reuse:
   - Use `Frontend/src/components/` and `Frontend/src/theme/theme.ts`.
   - Use `Backend/src/middleware/auth.middleware.ts` for route protection.
   - Use atomic credits ledger patterns from `Backend/src/controllers/credits.controller.ts`.
3. Preserve strict TypeScript compliance (`strict: true`). Do not add `@ts-ignore` or `any` unless absolutely necessary and documented.

### Step 3: Run Full Verification Pipeline

#### A. Backend Checks
Execute the following commands from the workspace root:
```bash
# Typecheck
npm run typecheck --prefix Backend

# Lint check
npm run lint --prefix Backend

# TypeScript compile verification
npm run build --prefix Backend

# Security test suite (36 tests)
npm run test:security --prefix Backend

# Scoring and evaluation suite (17 tests)
npm run test:scoring --prefix Backend

# End-to-end credits verification (Atomicity, concurrency, idempotency, ledger)
powershell -Command "cd Backend; npx ts-node src/scripts/verifyCreditsSystem.ts"
```

#### B. Frontend Checks
Execute the following commands from the workspace root:
```bash
# Typecheck
npm run typecheck --prefix Frontend

# Lint check
npm run lint --prefix Frontend

# Production Vite bundle build
npm run build --prefix Frontend
```

### Step 4: Post-Verification Diff & Security Audit
1. Run `git status` and `git diff` to inspect every modified line.
2. Confirm no `.env` files or hardcoded credentials were added.
3. Confirm that no auto-push was attempted (`git.autoPush: off`).
4. Ensure temporary test output files or logs are cleaned up.

### Step 5: Completion Report
Report results in the standard Senior Developer format:
- List of modified and created files with clickable markdown links (`file:///...`).
- Verification command results and exit codes.
- Clear separation of pre-existing warnings vs. newly introduced issues.
- Any remaining risks or follow-up recommendations.
