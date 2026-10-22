# AIIMS AI Development Guidelines & Agent Rules

You are working on **AIIMS** (AI Intelligence & Mentoring System), an AI capability diagnostic, tool discovery wallet, and prompt engineering mentoring platform.

## Technology Stack Overview
- **Frontend:** React 18, TypeScript, Vite, Vanilla CSS design tokens (`Frontend/`)
- **Backend:** Node.js, Express, TypeScript, Mongoose ODM (`Backend/`)
- **Database:** MongoDB Atlas with in-memory / local fallback support
- **IDE:** Antigravity IDE / VS Code

---

## 10 Mandatory Agent Rules

Every coding agent operating in this repository must strictly adhere to the following rules:

### Rule 1: Inspect Before Editing
- Always inspect existing implementations, types, and package manifests (`Backend/package.json`, `Frontend/package.json`) before modifying code.
- Check active function signatures, interfaces, and schemas. Never guess or assume contracts.

### Rule 2: Full-Stack Context Awareness
- Understand related code across all layers before applying changes:
  - Frontend UI (`Frontend/src/screens/`, `Frontend/src/components/`)
  - State & Context (`Frontend/src/context/LearnerContext.tsx`, `Frontend/src/context/ThemeContext.tsx`)
  - API Client (`Frontend/src/api/client.ts`)
  - Express Routes & Controllers (`Backend/src/routes/`, `Backend/src/controllers/`)
  - Mongoose Models & Schemas (`Backend/src/models/`)
- When modifying a feature (e.g., Clarity Tasks, Quests, Assessment, Wallet, Credits), verify that request payloads, response bodies, and database persistence remain synchronized.

### Rule 3: Focused, Non-Destructive Modifications
- Make minimal, targeted changes. Do not rewrite, refactor, or reorganize unrelated modules.
- Preserve existing comments, docstrings, and established architectural patterns.
- Never reformat an entire file or repository without explicit user approval.

### Rule 4: Maximize Reuse of Existing Assets
- **Frontend:** Reuse existing components in `Frontend/src/components/`, scoring services in `Frontend/src/services/assessmentScoring.ts`, recommendation engine in `Frontend/src/services/recommendationEngine.ts`, and types in `Frontend/src/types/index.ts`.
- **Backend:** Reuse authentication middleware (`Backend/src/middleware/auth.middleware.ts`), error handlers, validation helpers, models in `Backend/src/models/`, and types in `Backend/src/types/index.ts`.
- Do not introduce duplicate utility functions or parallel component implementations.

### Rule 5: Preserve Security, Credits Ledger, Contracts, and Themes
- **Authentication & RBAC:** Preserve JWT token validation and role checks (`Student`, `Entrepreneur`, `Evaluator`, `Admin`). Never disable or bypass authentication middleware.
- **Credits System Integrity:** Preserve atomic balance deductions, idempotency guards (`claimedActions`), overdraft protection, and dual-ledger synchronization (`User.aiimsCredits` + `CreditLedger.model.ts`). Never allow unverified balance overwrites via state updates.
- **AI Integrations:** Preserve external AI provider interfaces, prompt structures, and tool catalog metadata.
- **Theme System:** Maintain the light/dark theme CSS variable system defined in `Frontend/src/theme/theme.ts` and `Frontend/src/context/ThemeContext.tsx`. Never hardcode ad-hoc inline colors that break theming.
- **API Contracts:** Do not break existing endpoint URLs, HTTP methods, status codes, or response schemas.

### Rule 6: Test-Driven Changes & Coverage
- When modifying business logic, calculations, scoring, or credit rewards, update or create corresponding tests in:
  - `Backend/src/scripts/` (e.g., security tests, scoring tests, credits verification)
  - `Frontend/src/services/__tests__/` (e.g., scoring logic, recommendation engine)

### Rule 7: Execute Standard Verification Pipelines
Run the appropriate verification commands before declaring a task complete:
- **Backend:**
  - `npm run typecheck` (`tsc --noEmit`)
  - `npm run lint` (`eslint src`)
  - `npm run build` (`tsc`)
  - `npm run test:security`
  - `npm run test:scoring`
  - `npx ts-node src/scripts/verifyCreditsSystem.ts`
- **Frontend:**
  - `npm run typecheck` (`tsc --noEmit`)
  - `npm run lint` (`eslint src`)
  - `npm run build` (`tsc && vite build`)

### Rule 8: Comprehensive Diff & Secret Review
- Always run `git diff` before concluding work.
- Verify no secrets, `.env` files, API keys, or JWT tokens are committed or exposed.
- Verify no unintended whitespace or formatting changes were introduced.
- **Strict Zero Auto-Push:** Never execute `git push`, auto-commit, or remote publishing without explicit instruction.

### Rule 9: Transparent Reporting
Provide a clear, structured summary at the end of each task containing:
1. Every modified, created, or deleted file with clickable `file:///` links.
2. Every check and verification command actually executed, including exit codes.
3. Separation of pre-existing warnings from newly introduced issues.
4. Remaining technical risks or follow-up items.

### Rule 10: Mandatory Approval Gates
Always pause and request explicit user confirmation before:
- Executing destructive Git commands (`git reset --hard`, `git clean -fd`, `git push --force`).
- Running production database drops or destructive schema migrations.
- Installing heavy or unvetted external dependencies.
- Making major architectural shifts (e.g., replacing state management or swapping libraries).
- Invoking external endpoints that consume costly third-party API credits.

---

## Modular Rules Directory Reference
For detailed domain-specific standards, refer to `.agents/rules/`:
- `01-inspection-and-context.md`
- `02-architecture-and-reuse.md`
- `03-domain-contracts-and-security.md`
- `04-testing-and-verification.md`
- `05-safety-diffs-and-reporting.md`
