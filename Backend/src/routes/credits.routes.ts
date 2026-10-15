import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  getWallet,
  awardLevel,
  investCredits
} from '../controllers/credits.controller';

const router = Router();

router.get('/credits/wallet', requireAuth, getWallet);
router.post('/credits/award-level', requireAuth, awardLevel);
router.post('/credits/invest', requireAuth, investCredits);

export default router;
