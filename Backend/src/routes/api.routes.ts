/**
 * AIIMS API Routes — Modular Architecture Façade
 * 
 * Refactored from a 2,654-line monolithic file into modular domain-driven routes & controllers:
 * - src/routes/auth.routes.ts & src/controllers/auth.controller.ts
 * - src/routes/credits.routes.ts & src/controllers/credits.controller.ts
 * - src/routes/assessment.routes.ts & src/controllers/assessment.controller.ts
 * - src/routes/clarity.routes.ts & src/controllers/clarity.controller.ts
 * - src/routes/investigation.routes.ts & src/controllers/investigation.controller.ts
 * - src/routes/learner.routes.ts & src/controllers/learner.controller.ts
 * - src/routes/aiWallet.routes.ts & src/controllers/aiWallet.controller.ts
 * - src/routes/index.ts (aggregator)
 * - src/config/credits.config.ts (centralized rules & formatting)
 */

import router, { CREDIT_RULES, registeredUsers } from './index';

export { CREDIT_RULES, registeredUsers };
export default router;
