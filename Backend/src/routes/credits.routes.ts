import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getWallet,
  getLedger,
  getBalance,
  reconcileBalance,
  awardLevel,
  investCredits
} from '../controllers/credits.controller';

const router = Router();

router.get('/credits/wallet', requireAuth, getWallet);
router.get('/credits/ledger', requireAuth, getLedger);
router.get('/credits/balance', requireAuth, getBalance);
router.get('/credits/reconcile', requireAuth, reconcileBalance);
router.post('/credits/award-level', requireAuth, awardLevel);
router.post('/credits/invest', requireAuth, investCredits);

export default router;
