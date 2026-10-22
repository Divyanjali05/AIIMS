# Rule 02: Architecture Preservation & Asset Reuse

## 1. Focused Modifications vs. Monolithic Rewrites
- Prefer surgically precise diffs. Use targeted line modifications instead of replacing entire files.
- Preserve existing structure, variable naming conventions, and inline comments.
- Do not remove legacy compatibility shims or fallback stores (e.g. `Backend/src/models/userStore.ts`) unless explicitly instructed.
- Avoid introducing new paradigms (e.g., do not introduce Redux when `LearnerContext` is the established React state container).

## 2. Component and Utility Reuse Guidelines

### Frontend Reuse (`Frontend/src/`)
- **UI Components:** Reuse components from `components/` (e.g., `Header.tsx`, `Footer.tsx`, `Card.tsx`, `Button.tsx`).
- **Icons:** Use `lucide-react` icons consistently with existing screen designs.
- **Scoring & Recommendations:** Use existing algorithms in:
  - `services/assessmentScoring.ts`
  - `services/recommendationEngine.ts`
  - `services/relevanceEngine.ts`
- **Data Models:** Reference types in `types/index.ts`. Extend existing interfaces rather than creating parallel duplicates.

### Backend Reuse (`Backend/src/`)
- **Middleware:** Reuse `authMiddleware` from `middleware/auth.middleware.ts` for all protected routes.
- **Database Models:** Use existing Mongoose models in `models/` (`User.model.ts`, `CreditLedger.model.ts`, `aiTool.model.ts`, `Cohort.model.ts`).
- **Scripts:** Leverage established verification scripts in `scripts/` rather than authoring throwaway test harnesses.
- **Configuration:** Use `config/db.ts` for MongoDB connection management and in-memory fallbacks.

## 3. Dependency Discipline
- Re-use already installed packages. Do not add parallel libraries (e.g., do not add `axios` when `fetch` or `client.ts` is standard; do not add `dayjs` if `date-fns` or native `Date` suffices).
- Never introduce dependencies without confirming Node / React / TypeScript version compatibility.
