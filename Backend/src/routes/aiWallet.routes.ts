import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { aiExecutionRateLimiter, generalApiRateLimiter } from '../middleware/rateLimit.middleware';
import { validateBody } from '../middleware/validate.middleware';
import {
  addToWalletSchema,
  updateFamiliaritySchema,
  searchToolsSchema,
  matchToolSchema,
  compareToolsSchema,
  registerSourceSchema,
} from '../schemas/wallet.schema';
import {
  searchTools,
  matchTools,
  getCatalog,
  getToolById,
  getTaxonomy,
  compareTools,
  getGaps,
  triggerDiscovery,
  getNewTools,
  getRecentlyUpdatedTools,
  getToolEvidence,
  getToolHistory,
  getIntelligenceStatus,
  getDiscoveryStatus,
  getUserWallet,
  getRecommendations,
  addToWallet,
  updateFamiliarity,
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

router.use(generalApiRateLimiter);

// Public / Read-only Catalog routes
router.post('/wallet/search', validateBody(searchToolsSchema), searchTools);
router.post('/wallet/match', validateBody(matchToolSchema), matchTools);
router.get('/wallet/catalog', getCatalog);
router.get('/wallet/tools/:id', getToolById);
router.get('/wallet/taxonomy', getTaxonomy);
router.post('/wallet/compare', validateBody(compareToolsSchema), compareTools);
router.get('/wallet/gaps', getGaps);
router.get('/wallet/tools/new', getNewTools);
router.get('/wallet/tools/recently-updated', getRecentlyUpdatedTools);
router.get('/wallet/tools/:id/evidence', getToolEvidence);
router.get('/wallet/tools/:id/history', getToolHistory);
router.get('/wallet/intelligence/status', getIntelligenceStatus);
router.get('/wallet/discovery/status', getDiscoveryStatus);

// Authenticated Wallet User routes
router.get('/wallet/user', requireAuth, getUserWallet);
router.get('/wallet/recommendations', requireAuth, getRecommendations);
router.post('/wallet/add', requireAuth, validateBody(addToWalletSchema), addToWallet);
router.post(
  '/wallet/update-familiarity',
  requireAuth,
  validateBody(updateFamiliaritySchema),
  updateFamiliarity
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
