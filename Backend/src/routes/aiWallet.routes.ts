import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { requireWalletUnlock } from '../middleware/walletUnlock.middleware';
import { aiExecutionRateLimiter, generalApiRateLimiter } from '../middleware/rateLimit.middleware';
import { validateBody } from '../middleware/validate.middleware';
import {
  addToWalletSchema,
  updateFamiliaritySchema,
  searchToolsSchema,
  matchToolSchema,
  compareToolsSchema,
  registerSourceSchema,
  walletOperationSchema,
  confirmUsageSchema,
  personalizedMatchSchema,
  removeFromWalletSchema,
  createToolReportSchema,
} from '../schemas/wallet.schema';
import {
  searchTools,
  matchTools,
  getCatalog,
  getToolById,
  getTaxonomy,
  getDomainCards,
  compareTools,
  getGaps,
  triggerDiscovery,
  getNewTools,
  getRecentlyUpdatedTools,
  getToolEvidence,
  getToolHistory,
  getIntelligenceStatus,
  getDiscoveryStatus,
  getWalletUnlockStatus,
  getUserWallet,
  getRecommendations,
  addToWallet,
  removeFromWallet,
  updateFamiliarity,
  executeWalletOperation,
  confirmToolUsage,
  getUserConfirmations,
  getPersonalizedToolMatching,
  reportOutdatedTool,
  getDiscoveryRuns,
  getToolEvidenceAdmin,
  getToolHistoryAdmin,
  getAdminSources,
  registerAdminSource,
  getAdminCandidates,
  verifyCandidate,
  getAdminDashboard,
} from '../controllers/aiWallet.controller';

const router = Router();

// Public / Read-only Catalog routes
router.post('/wallet/search', validateBody(searchToolsSchema), searchTools);
router.post('/wallet/match', validateBody(matchToolSchema), matchTools);
router.get('/wallet/catalog', getCatalog);
router.get('/wallet/tools/:id', getToolById);
router.get('/wallet/taxonomy', getTaxonomy);
router.get('/wallet/domain-cards', getDomainCards);
router.post('/wallet/compare', validateBody(compareToolsSchema), compareTools);
router.get('/wallet/gaps', getGaps);
router.get('/wallet/tools/new', getNewTools);
router.get('/wallet/tools/recently-updated', getRecentlyUpdatedTools);
router.get('/wallet/tools/:id/evidence', getToolEvidence);
router.get('/wallet/tools/:id/history', getToolHistory);
router.get('/wallet/intelligence/status', getIntelligenceStatus);
router.get('/wallet/discovery/status', getDiscoveryStatus);

// Wallet status & lock verification
router.get('/wallet/status', requireAuth, getWalletUnlockStatus);

// Authenticated Wallet User routes (Gated by minimum 3 question attempts in Clarity & Focus)
router.get('/wallet/user', requireAuth, requireWalletUnlock, getUserWallet);
router.get('/wallet/recommendations', requireAuth, requireWalletUnlock, getRecommendations);
router.post(
  '/wallet/add',
  requireAuth,
  requireWalletUnlock,
  validateBody(addToWalletSchema),
  addToWallet
);
router.post(
  '/wallet/remove',
  requireAuth,
  requireWalletUnlock,
  validateBody(removeFromWalletSchema),
  removeFromWallet
);
router.post(
  '/wallet/tools/:id/report',
  requireAuth,
  validateBody(createToolReportSchema),
  reportOutdatedTool
);
router.post(
  '/wallet/update-familiarity',
  requireAuth,
  requireWalletUnlock,
  validateBody(updateFamiliaritySchema),
  updateFamiliarity
);
router.post(
  '/wallet/operate',
  requireAuth,
  requireWalletUnlock,
  validateBody(walletOperationSchema),
  executeWalletOperation
);
router.post(
  '/wallet/confirm-usage',
  requireAuth,
  requireWalletUnlock,
  validateBody(confirmUsageSchema),
  confirmToolUsage
);
router.get('/wallet/confirmations', requireAuth, requireWalletUnlock, getUserConfirmations);
router.post(
  '/wallet/personalized-match',
  requireAuth,
  requireWalletUnlock,
  validateBody(personalizedMatchSchema),
  getPersonalizedToolMatching
);
router.get(
  '/wallet/personalized-matching',
  requireAuth,
  requireWalletUnlock,
  getPersonalizedToolMatching
);
router.post('/wallet/discover/trigger', requireAuth, aiExecutionRateLimiter, triggerDiscovery);

// Admin-Only Discovery & Tool Management routes
router.get('/tools/discovery/runs', requireAuth, requireRole('admin'), getDiscoveryRuns);
router.get('/tools/evidence/:toolId', requireAuth, requireRole('admin'), getToolEvidenceAdmin);
router.get('/tools/history/:toolId', requireAuth, requireRole('admin'), getToolHistoryAdmin);

router.get('/admin/sources', requireAuth, requireRole('admin'), getAdminSources);
router.post(
  '/admin/sources',
  requireAuth,
  requireRole('admin'),
  validateBody(registerSourceSchema),
  registerAdminSource
);
router.get('/admin/candidates', requireAuth, requireRole('admin'), getAdminCandidates);
router.post('/admin/verify/:toolId', requireAuth, requireRole('admin'), verifyCandidate);
router.get('/admin/intelligence/dashboard', requireAuth, requireRole('admin'), getAdminDashboard);

export default router;
