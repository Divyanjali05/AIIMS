import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  searchTools,
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
  getAdminDashboard
} from '../controllers/aiWallet.controller';

const router = Router();

// Wallet routes
router.post('/wallet/search', searchTools);
router.get('/wallet/catalog', getCatalog);
router.get('/wallet/tools/:id', getToolById);
router.get('/wallet/taxonomy', getTaxonomy);
router.post('/wallet/compare', compareTools);
router.get('/wallet/gaps', getGaps);
router.post('/wallet/discover/trigger', triggerDiscovery);
router.get('/wallet/tools/new', getNewTools);
router.get('/wallet/tools/recently-updated', getRecentlyUpdatedTools);
router.get('/wallet/tools/:id/evidence', getToolEvidence);
router.get('/wallet/tools/:id/history', getToolHistory);
router.get('/wallet/intelligence/status', getIntelligenceStatus);
router.get('/wallet/discovery/status', getDiscoveryStatus);
router.get('/wallet/user', getUserWallet);
router.get('/wallet/recommendations', getRecommendations);
router.post('/wallet/add', addToWallet);
router.post('/wallet/update-familiarity', updateFamiliarity);

// Tool admin & discovery monitoring
router.get('/tools/discovery/runs', requireAuth, getDiscoveryRuns);
router.get('/tools/evidence/:toolId', requireAuth, getToolEvidenceAdmin);
router.get('/tools/history/:toolId', requireAuth, getToolHistoryAdmin);

// Admin sources and verification
router.get('/admin/sources', getAdminSources);
router.post('/admin/sources', registerAdminSource);
router.get('/admin/candidates', getAdminCandidates);
router.post('/admin/verify/:toolId', verifyCandidate);
router.get('/admin/intelligence/dashboard', getAdminDashboard);

export default router;
