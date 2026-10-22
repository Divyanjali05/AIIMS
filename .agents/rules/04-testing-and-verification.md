# Rule 04: Testing Standards & Verification Commands

## 1. Regression & Behavior Testing
- Any alteration to scoring algorithms, credit transactions, or authentication must include automated test coverage.
- Add or update test scripts in `Backend/src/scripts/` or unit tests in `Frontend/src/services/__tests__/`.
- Ensure tests run cleanly against both connected MongoDB Atlas instances and isolated in-memory fallbacks.

## 2. Standard Verification Pipelines
Every change must be validated by running the appropriate commands.

### Backend Verification:
```bash
# 1. Typecheck (noEmit)
npm run typecheck --prefix Backend

# 2. Linting (ESLint 9 Flat Config)
npm run lint --prefix Backend

# 3. TypeScript compilation
npm run build --prefix Backend

# 4. Security Test Suite (Phase 1 authentication, authorization, token safety)
npm run test:security --prefix Backend

# 5. Scoring & Diagnostic Evaluation Suite
npm run test:scoring --prefix Backend

# 6. Credits System End-to-End Verification (Atomicity, concurrency, idempotency, ledger)
npx ts-node src/scripts/verifyCreditsSystem.ts (inside Backend/)
```

### Frontend Verification:
```bash
# 1. Typecheck (noEmit)
npm run typecheck --prefix Frontend

# 2. Linting (React 18 & Hook Rules)
npm run lint --prefix Frontend

# 3. Production Vite Bundle Build
npm run build --prefix Frontend
```

## 3. Strict Compiler & Linter Invariants
- Never set `"strict": false` in `Backend/tsconfig.json` or `Frontend/tsconfig.json`.
- Never disable `react-hooks/rules-of-hooks` or downgrade critical errors just to pass checks.
- If pre-existing warnings exist (e.g. legacy `any` types), report them separately from newly introduced errors.
