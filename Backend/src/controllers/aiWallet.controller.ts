import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AIToolModel } from '../models/aiTool.model';
import { ToolDiscoveryRunModel } from '../models/ToolDiscoveryRun.model';
import { ToolEvidenceModel } from '../models/toolEvidence.model';
import { ToolVersionHistoryModel } from '../models/toolVersionHistory.model';
import { ToolCatalogService } from '../services/wallet/toolCatalog.service';
import { ToolMatchingService } from '../services/wallet/toolMatching.service';
import { ToolComparisonService } from '../services/wallet/toolComparison.service';
import { ToolDiscoveryService } from '../services/wallet/toolDiscovery.service';
import { DomainTaxonomyService } from '../services/wallet/domainTaxonomy.service';
import { ToolEvidenceService } from '../services/wallet/toolEvidence.service';
import { ToolChangeDetectionService } from '../services/wallet/toolChangeDetection.service';
import { ToolIntelligenceService } from '../services/wallet/toolIntelligence.service';
import { ToolSourceService } from '../services/wallet/toolSource.service';
import { toolVerificationService } from '../services/toolVerification.service';
import { mockUserTools, mockToolCatalog, mockLearnerFullState } from '../models/aiims.models';

/**
 * POST /wallet/search
 */
export const searchTools = (req: Request, res: Response) => {
  const { query, userTools } = req.body;
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Search requirement query is required.' });
  }

  const userToolIds = Array.isArray(userTools) ? userTools.map((t: any) => t.toolId || t) : [];
  const searchResult = ToolMatchingService.searchTools(query, userToolIds);
  return res.json(searchResult);
};

/**
 * GET /wallet/catalog
 */
export const getCatalog = async (req: Request, res: Response) => {
  const { category, domain, status, pricing, search } = req.query;
  let tools = await ToolCatalogService.getCatalogAsync();

  if (category && category !== 'All') {
    tools = tools.filter(t => t.category === category || t.categories.includes(category as any));
  }
  if (domain && domain !== 'All') {
    tools = tools.filter(t => t.domains.some(d => d.toLowerCase() === (domain as string).toLowerCase()));
  }
  if (status && status !== 'All') {
    tools = tools.filter(t => t.status === status);
  }
  if (pricing && pricing !== 'All') {
    if (pricing === 'Free') tools = tools.filter(t => t.pricingDetails.type === 'FREE' || t.pricingDetails.freeTierAvailable);
    else if (pricing === 'Trial') tools = tools.filter(t => t.pricingDetails.freeTrialAvailable);
    else if (pricing === 'Paid') tools = tools.filter(t => t.pricingDetails.type === 'PAID');
  }
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    tools = tools.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.provider.toLowerCase().includes(q));
  }

  return res.json(tools.filter(t => t.activeStatus));
};

/**
 * GET /wallet/tools/:id
 */
export const getToolById = async (req: Request, res: Response) => {
  const tool = await ToolCatalogService.getToolByIdAsync(req.params.id);
  if (!tool) {
    return res.status(404).json({ error: 'AI Tool not found in catalog.' });
  }
  return res.json(tool);
};

/**
 * GET /wallet/taxonomy
 */
export const getTaxonomy = (req: Request, res: Response) => {
  return res.json(DomainTaxonomyService.getTaxonomy());
};

/**
 * POST /wallet/compare
 */
export const compareTools = (req: Request, res: Response) => {
  const { toolIds, toolAId, toolBId, userRequirement, task } = req.body;
  const ids: string[] = Array.isArray(toolIds) && toolIds.length > 0
    ? toolIds
    : [toolAId, toolBId].filter(Boolean);

  if (ids.length === 0) {
    return res.status(400).json({ error: 'At least 2 tool IDs are required for comparison.' });
  }

  try {
    const comparison = ToolComparisonService.compareToolsForRequirement(ids, userRequirement || task);
    return res.json(comparison);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

/**
 * GET /wallet/gaps
 */
export const getGaps = (req: AuthenticatedRequest, res: Response) => {
  const userTools = req.user?.assessment ? mockUserTools : mockUserTools;
  const catalog = ToolCatalogService.getCatalog();
  
  const coveredDomains = new Set<string>();
  for (const item of userTools) {
    const tool = catalog.find(c => c.id === item.toolId);
    if (tool) {
      tool.domains.forEach(d => coveredDomains.add(d));
    }
  }

  const allTaxonomy = DomainTaxonomyService.getTaxonomy();
  const gaps = allTaxonomy
    .filter(t => !coveredDomains.has(t.domain))
    .map(t => ({
      domain: t.domain,
      subdomains: t.subdomains,
      category: t.categoryMapping,
      recommendedQuery: `Show me ${t.domain} AI tools`
    }));

  return res.json({
    coveredCount: coveredDomains.size,
    totalDomains: allTaxonomy.length,
    coveredDomains: Array.from(coveredDomains),
    gaps
  });
};

/**
 * POST /wallet/discover/trigger
 */
export const triggerDiscovery = async (req: Request, res: Response) => {
  const jobReport = await ToolDiscoveryService.runDiscoveryJob();
  return res.json({
    message: 'Automated AI Tool Discovery job completed successfully.',
    report: jobReport,
    newAndUpdatedTools: ToolCatalogService.getNewAndRecentlyUpdatedTools()
  });
};

/**
 * GET /wallet/tools/new
 */
export const getNewTools = (req: Request, res: Response) => {
  const tools = ToolCatalogService.getCatalog().filter(t => t.status === 'NEW');
  return res.json(tools);
};

/**
 * GET /wallet/tools/recently-updated
 */
export const getRecentlyUpdatedTools = (req: Request, res: Response) => {
  const tools = ToolCatalogService.getCatalog().filter(t => t.status === 'RECENTLY_UPDATED' || t.status === 'UPDATED');
  return res.json(tools);
};

/**
 * GET /wallet/tools/:id/evidence
 */
export const getToolEvidence = async (req: Request, res: Response) => {
  const evidence = await ToolEvidenceService.getEvidenceForTool(req.params.id);
  return res.json(evidence);
};

/**
 * GET /wallet/tools/:id/history
 */
export const getToolHistory = async (req: Request, res: Response) => {
  const history = await ToolChangeDetectionService.getVersionHistory(req.params.id);
  return res.json(history);
};

/**
 * GET /wallet/intelligence/status
 */
export const getIntelligenceStatus = (req: Request, res: Response) => {
  return res.json(ToolIntelligenceService.getIntelligenceStatus());
};

/**
 * GET /wallet/discovery/status
 */
export const getDiscoveryStatus = (req: Request, res: Response) => {
  const status = ToolDiscoveryService.getStatus();
  const newAndUpdated = ToolCatalogService.getNewAndRecentlyUpdatedTools();
  return res.json({
    status,
    newAndUpdatedCount: newAndUpdated.length,
    newAndUpdatedTools: newAndUpdated
  });
};

/**
 * GET /wallet/user
 */
export const getUserWallet = (req: AuthenticatedRequest, res: Response) => {
  if (req.user?.aiWallet) {
    return res.json(req.user.aiWallet.userTools || []);
  }
  return res.json(mockUserTools);
};

/**
 * GET /wallet/recommendations
 */
export const getRecommendations = (req: AuthenticatedRequest, res: Response) => {
  const userTools = (req.user as any)?.aiWallet?.userTools || mockLearnerFullState.aiWallet?.userTools || mockUserTools;
  const userToolMap = new Map<string, string>();
  userTools.forEach((t: any) => userToolMap.set(t.toolId, t.familiarity));

  const catalog = ToolCatalogService.getCatalog();
  const recs = [];

  const walletCategories = new Set(userTools.map((t: any) => t.primaryCategory));
  const activeFocus =
    req.user?.focus?.selectedTrack ||
    mockLearnerFullState.focus?.selectedTrack ||
    mockLearnerFullState.analysis?.growthArea ||
    'AI Workflow Design';
  const growthArea = mockLearnerFullState.analysis?.growthArea || 'AI Workflow Design';
  const clarityTopic =
    req.user?.clarity?.selectedTopic ||
    mockLearnerFullState.clarity?.selectedTopic || '';
  const investigatedRadarIds =
    req.user?.radar?.investigatedSignalIds ||
    mockLearnerFullState.radar?.investigatedSignalIds || [];

  const containsMatch = (targetText: string, searchKey: string): boolean => {
    if (!targetText || !searchKey) return false;
    return (
      targetText.toLowerCase().includes(searchKey.toLowerCase()) ||
      searchKey.toLowerCase().includes(targetText.toLowerCase())
    );
  };

  for (const tool of catalog) {
    if (!tool.activeStatus) continue;

    const familiarity = userToolMap.get(tool.id);
    const matchedSignals: { type: string; snippet: string; priority: number }[] = [];

    const toolFocusTracks = tool.focusTracks || [tool.category];
    const toolClarityTopics = tool.clarityTopics || tool.taskMappings || [];
    const toolRadarTopics = tool.radarTopics || [tool.category];
    const toolCategories = tool.categories || [tool.category];
    const toolRelatedTools = tool.relatedTools || [];

    // 1. FOCUS_BASED
    if (
      toolFocusTracks.some(ft => containsMatch(ft, activeFocus)) ||
      toolCategories.some(cat => containsMatch(cat, activeFocus))
    ) {
      matchedSignals.push({
        type: 'FOCUS_BASED',
        snippet: `aligns with your active focus on ${activeFocus}`,
        priority: 2
      });
    }

    // 2. RADAR_DISCOVERY
    let matchedRadarTopic: string | null = null;
    if (investigatedRadarIds.length > 0) {
      for (const sigId of investigatedRadarIds) {
        if (toolRadarTopics.includes(sigId) || toolRelatedTools.includes(sigId)) {
          matchedRadarTopic = toolRadarTopics.find(t => t !== sigId) || tool.category;
          break;
        }
      }
      if (!matchedRadarTopic) {
        const matchingTopic = toolRadarTopics.find(rt =>
          investigatedRadarIds.some((sigId: string) => containsMatch(rt, sigId))
        );
        if (matchingTopic) matchedRadarTopic = matchingTopic;
      }
    }
    if (matchedRadarTopic) {
      const displayTopic = matchedRadarTopic.toLowerCase().includes('sig-')
        ? tool.category
        : matchedRadarTopic;
      matchedSignals.push({
        type: 'RADAR_DISCOVERY',
        snippet: `supports ${displayTopic} capabilities you explored on AI Radar`,
        priority: 1
      });
    }

    // 3. TASK_BASED
    if (
      clarityTopic &&
      (
        toolClarityTopics.some(ct => containsMatch(ct, clarityTopic)) ||
        toolCategories.some(cat => containsMatch(cat, clarityTopic))
      )
    ) {
      matchedSignals.push({
        type: 'TASK_BASED',
        snippet: `directly supports your Clarity goal ("${clarityTopic}")`,
        priority: 3
      });
    }

    // 4. SKILL_GAP
    if (
      growthArea &&
      (
        toolCategories.some(cat => containsMatch(cat, growthArea)) ||
        toolFocusTracks.some(ft => containsMatch(ft, growthArea))
      )
    ) {
      matchedSignals.push({
        type: 'SKILL_GAP',
        snippet: `strengthens your growth area in ${growthArea}`,
        priority: 4
      });
    }

    // 5. TOOLKIT_GAP
    if (!walletCategories.has(tool.category) && !familiarity) {
      matchedSignals.push({
        type: 'TOOLKIT_GAP',
        snippet: `fills an unrepresented category (${tool.category}) in your current AI toolkit`,
        priority: 5
      });
    }

    // 6. ALTERNATIVE_TOOL
    const isAlt = userTools.some((ut: any) => {
      const userToolObj = catalog.find(c => c.id === ut.toolId);
      return (
        userToolObj &&
        (userToolObj.alternatives?.includes(tool.id) || tool.alternatives?.includes(ut.toolId))
      );
    });
    if (isAlt && !familiarity) {
      matchedSignals.push({
        type: 'ALTERNATIVE_TOOL',
        snippet: `offers a complementary workflow alternative to tools in your wallet`,
        priority: 6
      });
    }

    if (matchedSignals.length === 0) continue;

    // Familiarity filtering
    if (familiarity === 'mastered') {
      const hasRadarOrAlt = matchedSignals.some(
        s => s.type === 'RADAR_DISCOVERY' || s.type === 'ALTERNATIVE_TOOL'
      );
      if (!hasRadarOrAlt) continue;
    } else if (familiarity === 'proficient') {
      const hasAdvancedSignal = matchedSignals.some(
        s => s.type === 'RADAR_DISCOVERY' || s.type === 'ALTERNATIVE_TOOL' || s.type === 'FOCUS_BASED'
      );
      if (!hasAdvancedSignal) continue;
    }

    matchedSignals.sort((a, b) => a.priority - b.priority);
    const primarySignal = matchedSignals[0];
    const allSignalTypes = Array.from(new Set(matchedSignals.map(s => s.type)));

    const snippets = matchedSignals.slice(0, 3).map(s => s.snippet);
    let synthesizedReason = '';
    if (snippets.length === 1) {
      synthesizedReason = `You're seeing this because ${tool.name} ${snippets[0]}.`;
    } else if (snippets.length === 2) {
      synthesizedReason = `You're seeing this because ${tool.name} ${snippets[0]}, and ${snippets[1]}.`;
    } else {
      synthesizedReason = `You're seeing this because ${tool.name} ${snippets[0]}, ${snippets[1]}, and ${snippets[2]}.`;
    }

    let actionLabel = 'Add to Wallet & Explore';
    if (familiarity === 'exploring')  actionLabel = 'Explore & Practice Tool';
    else if (familiarity === 'practicing') actionLabel = 'Practice a Real Task';
    else if (familiarity === 'proficient') actionLabel = 'Try an Advanced Workflow';
    else if (familiarity === 'mastered')   actionLabel = 'View Advanced Opportunities';

    recs.push({
      id: `rec-${tool.id}`,
      toolId: tool.id,
      type: primarySignal.type as any,
      matchedSignals: allSignalTypes as any,
      reason: synthesizedReason,
      relatedTask: tool.useCases[0] || tool.category,
      relatedSkill: tool.category,
      relevance: `Aligned with your ${activeFocus} workflow`,
      actionLabel,
      status: 'active',
      createdAt: 'Just now'
    });
  }

  return res.json(recs);
};

/**
 * POST /wallet/add
 */
export const addToWallet = async (req: AuthenticatedRequest, res: Response) => {
  const { toolId, familiarity, primaryCategory, userNotes } = req.body;

  // Authenticated + DB path
  if (req.user) {
    try {
      const wallet = req.user.aiWallet || { userTools: [], dismissedRecommendations: [] };
      const existing = wallet.userTools.find((t: any) => t.toolId === toolId);

      if (existing) {
        if (familiarity) existing.familiarity = familiarity;
        if (userNotes !== undefined) existing.userNotes = userNotes;
        req.user.aiWallet = wallet;
        req.user.markModified('aiWallet');
        await req.user.save();
        return res.json({ success: true, item: existing, action: 'updated' });
      }

      // Resolve category from live catalog if not supplied
      let resolvedCategory = primaryCategory;
      if (!resolvedCategory) {
        const catalogItem = ToolCatalogService.getToolById(toolId);
        resolvedCategory = catalogItem?.category || 'Reasoning & Writing';
      }

      const newItem = {
        toolId,
        addedAt: new Date().toISOString().split('T')[0],
        familiarity: familiarity || 'exploring',
        userNotes: userNotes || '',
        primaryCategory: resolvedCategory,
        customTags: ['my-toolkit']
      };

      wallet.userTools.unshift(newItem as any);
      req.user.aiWallet = wallet;
      req.user.markModified('aiWallet');
      await req.user.save();
      return res.json({ success: true, item: newItem, action: 'added' });
    } catch (err: any) {
      console.error('[/wallet/add] DB error, falling back to mock:', err.message);
    }
  }

  // Offline / unauthenticated fallback — mutate in-memory mock only
  const existing = mockUserTools.find(t => t.toolId === toolId);
  if (existing) {
    existing.familiarity = (familiarity || existing.familiarity) as any;
    if (userNotes) existing.userNotes = userNotes;
    return res.json({ success: true, item: existing, action: 'updated' });
  }

  const catalogItem = ToolCatalogService.getToolById(toolId) || mockToolCatalog.find(t => t.id === toolId);
  const newItem = {
    toolId,
    addedAt: new Date().toISOString().split('T')[0],
    familiarity: familiarity || 'exploring',
    userNotes: userNotes || '',
    primaryCategory: primaryCategory || catalogItem?.category || 'Reasoning & Writing',
    customTags: ['my-toolkit']
  };
  mockUserTools.unshift(newItem as any);
  return res.json({ success: true, item: newItem, action: 'added' });
};

/**
 * POST /wallet/update-familiarity
 */
export const updateFamiliarity = async (req: AuthenticatedRequest, res: Response) => {
  const { toolId, familiarity, userNotes } = req.body;

  if (req.user) {
    try {
      const wallet = req.user.aiWallet || { userTools: [], dismissedRecommendations: [] };
      const item = wallet.userTools.find((t: any) => t.toolId === toolId);
      if (!item) {
        return res.status(404).json({ error: 'Tool not found in user wallet' });
      }
      if (familiarity) item.familiarity = familiarity;
      if (userNotes !== undefined) item.userNotes = userNotes;
      req.user.aiWallet = wallet;
      req.user.markModified('aiWallet');
      await req.user.save();
      return res.json({ success: true, item });
    } catch (err: any) {
      console.error('[/wallet/update-familiarity] DB error:', err.message);
    }
  }

  // Offline fallback
  const item = mockUserTools.find(t => t.toolId === toolId);
  if (!item) {
    return res.status(404).json({ error: 'Tool not found in user wallet' });
  }
  if (familiarity) item.familiarity = familiarity as any;
  if (userNotes !== undefined) item.userNotes = userNotes;
  return res.json({ success: true, item });
};

/**
 * GET /tools/discovery/runs
 */
export const getDiscoveryRuns = async (req: Request, res: Response) => {
  if (mongoose.connection.readyState !== 1) {
    return res.json({ runs: [], message: 'DB not connected — no run history available.' });
  }
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const runs = await ToolDiscoveryRunModel.find()
      .sort({ startedAt: -1 })
      .limit(limit)
      .lean();
    return res.json({ runs, total: runs.length });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch discovery runs.', details: err.message });
  }
};

/**
 * GET /tools/evidence/:toolId
 */
export const getToolEvidenceAdmin = async (req: Request, res: Response) => {
  const { toolId } = req.params;
  if (!toolId) {
    return res.status(400).json({ error: 'toolId param is required.' });
  }
  if (mongoose.connection.readyState !== 1) {
    return res.json({ evidence: [], message: 'DB not connected.' });
  }
  try {
    const evidence = await ToolEvidenceModel.find({ toolId })
      .sort({ fetchedAt: -1 })
      .lean();
    return res.json({
      toolId,
      evidence,
      counts: {
        total:    evidence.length,
        pending:  evidence.filter((e: any) => e.verificationStatus === 'PENDING').length,
        accepted: evidence.filter((e: any) => e.verificationStatus === 'ACCEPTED').length,
        rejected: evidence.filter((e: any) => e.verificationStatus === 'REJECTED').length
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch tool evidence.', details: err.message });
  }
};

/**
 * GET /tools/history/:toolId
 */
export const getToolHistoryAdmin = async (req: Request, res: Response) => {
  const { toolId } = req.params;
  if (!toolId) {
    return res.status(400).json({ error: 'toolId param is required.' });
  }
  if (mongoose.connection.readyState !== 1) {
    return res.json({ history: [], message: 'DB not connected.' });
  }
  try {
    const history = await ToolVersionHistoryModel.find({ toolId })
      .sort({ detectedAt: -1 })
      .lean();
    return res.json({ toolId, history, count: history.length });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch tool history.', details: err.message });
  }
};

/**
 * GET /admin/sources
 */
export const getAdminSources = async (_req: Request, res: Response) => {
  try {
    const sources = ToolSourceService.getSources().map(s => ({
      id: s.id,
      name: s.name,
      type: s.type,
      priority: s.priority,
      enabled: s.enabled
    }));
    return res.json({ sources, total: sources.length });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch sources', details: err.message });
  }
};

/**
 * POST /admin/sources
 */
export const registerAdminSource = async (req: Request, res: Response) => {
  const { id, name, type, priority, enabled } = req.body;
  if (!id || !name) {
    return res.status(400).json({ error: 'Source id and name are required.' });
  }
  try {
    ToolSourceService.registerSource({
      id,
      name,
      type: type || 'JSON',
      priority: priority || 2,
      enabled: enabled !== false,
      async fetch() {
        return [];
      }
    });
    return res.json({ success: true, message: `Source "${name}" registered.` });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to register source', details: err.message });
  }
};

/**
 * GET /admin/candidates
 */
export const getAdminCandidates = async (_req: Request, res: Response) => {
  if (mongoose.connection.readyState !== 1) {
    return res.json({ candidates: [] });
  }
  try {
    const candidates = await AIToolModel.find({
      $or: [
        { verificationStatus: 'DISCOVERED' },
        { verificationStatus: 'UNVERIFIED' },
        { verificationStatus: 'PENDING_VERIFICATION' },
        { activeStatus: false }
      ]
    }).sort({ createdAt: -1 }).lean();
    return res.json({ candidates, count: candidates.length });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch candidates', details: err.message });
  }
};

/**
 * POST /admin/verify/:toolId
 */
export const verifyCandidate = async (req: Request, res: Response) => {
  const { toolId } = req.params;
  const { acceptEvidenceId, activate } = req.body;

  if (mongoose.connection.readyState !== 1) {
    return res.json({ success: true, message: 'Offline mode simulation' });
  }

  try {
    if (acceptEvidenceId) {
      await toolVerificationService.acceptEvidence(acceptEvidenceId);
    }
    const verifyResult = await toolVerificationService.verifyTool(toolId);

    if (activate) {
      await AIToolModel.updateOne({ id: toolId }, { $set: { activeStatus: true, verificationStatus: 'VERIFIED' } });
    }

    return res.json({ success: true, verification: verifyResult });
  } catch (err: any) {
    return res.status(500).json({ error: 'Verification failed', details: err.message });
  }
};

/**
 * GET /admin/intelligence/dashboard
 */
export const getAdminDashboard = async (_req: Request, res: Response) => {
  if (mongoose.connection.readyState !== 1) {
    const catalog = ToolCatalogService.getCatalog();
    return res.json({
      pipelineStatus: 'OPERATIONAL',
      mode: 'OFFLINE_MOCK',
      totalToolsInCatalog: catalog.length,
      activeVerifiedTools: catalog.filter(t => t.activeStatus).length,
      pendingCandidates: 0,
      totalEvidenceDocs: 12,
      recentRunsCount: 1,
      lastRunAt: new Date().toISOString()
    });
  }

  try {
    const [totalTools, activeVerified, pendingCandidates, totalEvidence, recentRuns] = await Promise.all([
      AIToolModel.countDocuments({}),
      AIToolModel.countDocuments({ activeStatus: true, verificationStatus: { $in: ['VERIFIED', 'VERIFIED_SEED'] } }),
      AIToolModel.countDocuments({ activeStatus: false }),
      ToolEvidenceModel.countDocuments({}),
      ToolDiscoveryRunModel.find().sort({ startedAt: -1 }).limit(5).lean()
    ]);

    return res.json({
      pipelineStatus: 'OPERATIONAL',
      mode: 'LIVE_MONGODB',
      totalToolsInCatalog: totalTools,
      activeVerifiedTools: activeVerified,
      pendingCandidates,
      totalEvidenceDocs: totalEvidence,
      recentRunsCount: recentRuns.length,
      lastRun: recentRuns[0] || null
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch intelligence dashboard', details: err.message });
  }
};
