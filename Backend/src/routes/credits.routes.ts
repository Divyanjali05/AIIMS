import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { generalApiRateLimiter } from '../middleware/rateLimit.middleware';
import { validateBody, validateQuery } from '../middleware/validate.middleware';
import {
  awardLevelSchema,
  investCreditsSchema,
  ledgerQuerySchema,
} from '../schemas/credits.schema';
import {
  getWallet,
  getLedger,
  getBalance,
  reconcileBalance,
  awardLevel,
  investCredits,
} from '../controllers/credits.controller';

const router = Router();

router.use(generalApiRateLimiter);

router.get('/credits/wallet', requireAuth, getWallet);
router.get('/credits/ledger', requireAuth, validateQuery(ledgerQuerySchema), getLedger);
router.get('/credits/balance', requireAuth, getBalance);
router.get('/credits/reconcile', requireAuth, reconcileBalance);
router.post('/credits/award-level', requireAuth, validateBody(awardLevelSchema), awardLevel);
router.post('/credits/invest', requireAuth, validateBody(investCreditsSchema), investCredits);

export default router;
