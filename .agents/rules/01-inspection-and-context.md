# Rule 01: Pre-Edit Inspection & Full-Stack Context Awareness

## 1. Inspection Before Modification
Prior to authoring or modifying any code in the AIIMS repository:
- **Inspect Package Manifests:** Review `Backend/package.json` and `Frontend/package.json` to confirm installed packages, versions, and scripts before considering new dependencies.
- **Inspect Type Declarations:** Check shared contracts in `Backend/src/types/index.ts` and `Frontend/src/types/index.ts`. Never guess property names or nullability.
- **Inspect Existing Handlers:** When fixing a route or component, view the existing implementation along with its imports and callers.
- **Inspect Configuration Files:** Respect ESLint Flat Config (`eslint.config.mjs`), Prettier configs (`.prettierrc.json`), and TypeScript compiler options (`tsconfig.json`).

## 2. Multi-Tier Full-Stack Awareness
AIIMS features span multiple application layers. When touching a capability, trace its complete data flow:

| Layer | Frontend Artifacts | Backend Artifacts |
| :--- | :--- | :--- |
| **Authentication & Profile** | `Frontend/src/context/LearnerContext.tsx`<br>`Frontend/src/screens/ProfileScreen.tsx` | `Backend/src/routes/auth.routes.ts`<br>`Backend/src/models/User.model.ts` |
| **Credits & Transactions** | `Frontend/src/context/LearnerContext.tsx`<br>`Frontend/src/screens/RewardsScreen.tsx` | `Backend/src/routes/credits.routes.ts`<br>`Backend/src/models/CreditLedger.model.ts` |
| **Assessments & Scoring** | `Frontend/src/screens/AssessmentScreen.tsx`<br>`Frontend/src/services/assessmentScoring.ts` | `Backend/src/routes/assessment.routes.ts`<br>`Backend/src/models/aiims.models.ts` |
| **Tool Catalog & AI Wallet** | `Frontend/src/screens/AIWalletScreen.tsx`<br>`Frontend/src/services/recommendationEngine.ts` | `Backend/src/routes/aiWallet.routes.ts`<br>`Backend/src/models/aiTool.model.ts` |
| **Clarity Tasks & Quests** | `Frontend/src/screens/ClarityScreen.tsx`<br>`Frontend/src/screens/QuestScreen.tsx` | `Backend/src/routes/clarity.routes.ts`<br>`Backend/src/controllers/clarity.controller.ts` |

Never modify a frontend API call without confirming the backend route signature, and never alter a backend response payload without checking all frontend consumer components.
