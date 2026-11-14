import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { prisma, isDatabaseConnected } from '../config/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { creditsLedgerService } from '../services/creditsLedger.service';
import { ToolCatalogService, aiToolRowToDomain } from '../services/wallet/toolCatalog.service';
import { ToolMatchingService } from '../services/wallet/toolMatching.service';
import { ToolComparisonService } from '../services/wallet/toolComparison.service';
import { ToolDiscoveryService } from '../services/wallet/toolDiscovery.service';
import { DomainTaxonomyService } from '../services/wallet/domainTaxonomy.service';
import { ToolEvidenceService } from '../services/wallet/toolEvidence.service';
import { ToolChangeDetectionService } from '../services/wallet/toolChangeDetection.service';
import { ToolIntelligenceService } from '../services/wallet/toolIntelligence.service';
import { ToolSourceService } from '../services/wallet/toolSource.service';
import { toolVerificationService } from '../services/toolVerification.service';
import { isValidId, toArray, toRecord, withLegacyId } from '../utils/id';
import { toJsonInput } from '../utils/userMapper';

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
 * POST /wallet/match
 * Intelligent task-first tool matching grounded in the verified AIIMS catalog
 */
export const matchTools = (req: Request, res: Response) => {
  const { taskDescription, desiredOutput, inputFormat, freeOnly, category } = req.body;
  if (
    !taskDescription ||
    typeof taskDescription !== 'string' ||
    taskDescription.trim().length < 3
  ) {
    return res
      .status(400)
      .json({ error: 'Valid taskDescription of at least 3 characters is required.' });
  }

  const queryParts = [taskDescription.trim()];
  if (desiredOutput) queryParts.push(`output: ${desiredOutput.trim()}`);
  if (inputFormat) queryParts.push(`input: ${inputFormat.trim()}`);
  if (freeOnly) queryParts.push('free');
  if (category) queryParts.push(`category: ${category.trim()}`);

  const enrichedQuery = queryParts.join(' ');
  const searchResult = ToolMatchingService.searchTools(enrichedQuery);

  let matches = searchResult.matches || [];

  if (freeOnly) {
    matches = matches.filter(
      (m) => m.tool.pricingDetails.type === 'FREE' || m.tool.pricingDetails.freeTierAvailable
    );
  }

  const formattedMatches = matches.map((m) => ({
    toolId: m.tool.id,
    name: m.tool.name,
    provider: m.tool.provider,
    category: m.tool.category,
    description: m.tool.description,
    matchScore: m.matchScore,
    matchLabel: m.matchLabel,
    confidence: m.confidence,
    whyMatches: m.whyMatches || [m.matchReason],
    limitations: m.tool.limitations || [],
    pricing: m.tool.pricingDetails.summary || m.tool.pricing,
    freeTierAvailable: m.tool.pricingDetails.freeTierAvailable ?? false,
    pricingType: m.tool.pricingDetails.type,
    isIntegrated: m.tool.capabilities.some(
      (c) => c.toLowerCase().includes('sandbox') || c.toLowerCase().includes('interactive')
    ),
    officialWebsite: m.tool.officialWebsite,
    learningTrackLevel1: m.tool.learningTrack?.[0]?.title || null,
  }));

  return res.json({
    success: true,
    taskDescription: taskDescription.trim(),
    desiredOutput: desiredOutput || null,
    inputFormat: inputFormat || null,
    totalMatches: formattedMatches.length,
    matches: formattedMatches,
    toolCombinations: searchResult.toolCombinations || [],
    suggestionsIfNoMatches: searchResult.suggestionsIfNoMatches,
  });
};

/**
 * GET /wallet/catalog
 */
export const getCatalog = async (req: Request, res: Response) => {
  const { category, domain, status, pricing, search } = req.query;
  let tools = await ToolCatalogService.getCatalogAsync();

  if (category && category !== 'All') {
    tools = tools.filter((t) => t.category === category || t.categories.includes(category as any));
  }
  if (domain && domain !== 'All') {
    tools = tools.filter((t) =>
      t.domains.some((d) => d.toLowerCase() === (domain as string).toLowerCase())
    );
  }
  if (status && status !== 'All') {
    tools = tools.filter((t) => t.status === status);
  }
  if (pricing && pricing !== 'All') {
    if (pricing === 'Free')
      tools = tools.filter(
        (t) => t.pricingDetails.type === 'FREE' || t.pricingDetails.freeTierAvailable
      );
    else if (pricing === 'Trial') tools = tools.filter((t) => t.pricingDetails.freeTrialAvailable);
    else if (pricing === 'Paid') tools = tools.filter((t) => t.pricingDetails.type === 'PAID');
  }
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    tools = tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.provider.toLowerCase().includes(q)
    );
  }

  return res.json(
    tools.filter(
      (t) =>
        t.activeStatus &&
        t.verificationStatus !== 'UNVERIFIED' &&
        t.verificationStatus !== 'DISCOVERED' &&
        t.verificationStatus !== 'REJECTED'
    )
  );
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
export const getTaxonomy = (_req: Request, res: Response) => {
  return res.json(DomainTaxonomyService.getTaxonomy());
};

/**
 * POST /wallet/compare
 */
export const compareTools = (req: Request, res: Response) => {
  const { toolIds, toolAId, toolBId, userRequirement, task } = req.body;
  const ids: string[] =
    Array.isArray(toolIds) && toolIds.length > 0 ? toolIds : [toolAId, toolBId].filter(Boolean);

  if (ids.length === 0) {
    return res.status(400).json({ error: 'At least 2 tool IDs are required for comparison.' });
  }

  try {
    const comparison = ToolComparisonService.compareToolsForRequirement(
      ids,
      userRequirement || task
    );
    return res.json(comparison);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

/**
 * GET /wallet/gaps
 */
export const getGaps = (req: AuthenticatedRequest, res: Response) => {
  const userTools = req.user?.aiWallet?.userTools || [];
  const catalog = ToolCatalogService.getCatalog();

  const coveredDomains = new Set<string>();
  for (const item of userTools) {
    const tool = catalog.find((c) => c.id === item.toolId);
    if (tool) {
      tool.domains.forEach((d) => coveredDomains.add(d));
    }
  }

  const allTaxonomy = DomainTaxonomyService.getTaxonomy();
  const gaps = allTaxonomy
    .filter((t) => !coveredDomains.has(t.domain))
    .map((t) => ({
      domain: t.domain,
      subdomains: t.subdomains,
      category: t.categoryMapping,
      recommendedQuery: `Show me ${t.domain} AI tools`,
    }));

  return res.json({
    coveredCount: coveredDomains.size,
    totalDomains: allTaxonomy.length,
    coveredDomains: Array.from(coveredDomains),
    gaps,
  });
};

/**
 * POST /wallet/discover/trigger
 */
export const triggerDiscovery = async (_req: Request, res: Response) => {
  const jobReport = await ToolDiscoveryService.runDiscoveryJob();
  return res.json({
    message: 'Automated AI Tool Discovery job completed successfully.',
    report: jobReport,
    newAndUpdatedTools: ToolCatalogService.getNewAndRecentlyUpdatedTools(),
  });
};

/**
 * GET /wallet/tools/new
 */
export const getNewTools = (_req: Request, res: Response) => {
  const tools = ToolCatalogService.getCatalog().filter((t) => t.status === 'NEW');
  return res.json(tools);
};

/**
 * GET /wallet/tools/recently-updated
 */
export const getRecentlyUpdatedTools = (_req: Request, res: Response) => {
  const tools = ToolCatalogService.getCatalog().filter(
    (t) => t.status === 'RECENTLY_UPDATED' || t.status === 'UPDATED'
  );
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
export const getIntelligenceStatus = (_req: Request, res: Response) => {
  return res.json(ToolIntelligenceService.getIntelligenceStatus());
};

/**
 * GET /wallet/discovery/status
 */
export const getDiscoveryStatus = (_req: Request, res: Response) => {
  const status = ToolDiscoveryService.getStatus();
  const newAndUpdated = ToolCatalogService.getNewAndRecentlyUpdatedTools();
  return res.json({
    status,
    newAndUpdatedCount: newAndUpdated.length,
    newAndUpdatedTools: newAndUpdated,
  });
};

/**
 * GET /wallet/user
 */
export const getUserWallet = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }
  if (req.user?.aiWallet) {
    return res.json(req.user.aiWallet.userTools || []);
  }
  return res.json([]);
};

/**
 * GET /wallet/recommendations
 */
export const getRecommendations = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }

  const userTools = req.user.aiWallet?.userTools || [];
  const userToolMap = new Map<string, string>();
  userTools.forEach((t: any) => userToolMap.set(t.toolId, t.familiarity));

  const catalog = ToolCatalogService.getCatalog();
  const recs = [];

  const walletCategories = new Set(userTools.map((t: any) => t.primaryCategory));
  const activeFocus =
    req.user.focus?.selectedTrack || req.user.analysis?.growthArea || 'AI Workflow Design';
  const growthArea = req.user.analysis?.growthArea || 'AI Workflow Design';
  const clarityTopic = req.user.clarity?.selectedTopic || '';
  const investigatedRadarIds = req.user.radar?.investigatedSignalIds || [];

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
      toolFocusTracks.some((ft) => containsMatch(ft, activeFocus)) ||
      toolCategories.some((cat) => containsMatch(cat, activeFocus))
    ) {
      matchedSignals.push({
        type: 'FOCUS_BASED',
        snippet: `aligns with your active focus on ${activeFocus}`,
        priority: 2,
      });
    }

    // 2. RADAR_DISCOVERY
    let matchedRadarTopic: string | null = null;
    if (investigatedRadarIds.length > 0) {
      for (const sigId of investigatedRadarIds) {
        if (toolRadarTopics.includes(sigId) || toolRelatedTools.includes(sigId)) {
          matchedRadarTopic = toolRadarTopics.find((t) => t !== sigId) || tool.category;
          break;
        }
      }
      if (!matchedRadarTopic) {
        const matchingTopic = toolRadarTopics.find((rt) =>
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
        priority: 1,
      });
    }

    // 3. TASK_BASED
    if (
      clarityTopic &&
      (toolClarityTopics.some((ct) => containsMatch(ct, clarityTopic)) ||
        toolCategories.some((cat) => containsMatch(cat, clarityTopic)))
    ) {
      matchedSignals.push({
        type: 'TASK_BASED',
        snippet: `directly supports your Clarity goal ("${clarityTopic}")`,
        priority: 3,
      });
    }

    // 4. SKILL_GAP
    if (
      growthArea &&
      (toolCategories.some((cat) => containsMatch(cat, growthArea)) ||
        toolFocusTracks.some((ft) => containsMatch(ft, growthArea)))
    ) {
      matchedSignals.push({
        type: 'SKILL_GAP',
        snippet: `strengthens your growth area in ${growthArea}`,
        priority: 4,
      });
    }

    // 5. TOOLKIT_GAP
    if (!walletCategories.has(tool.category) && !familiarity) {
      matchedSignals.push({
        type: 'TOOLKIT_GAP',
        snippet: `fills an unrepresented category (${tool.category}) in your current AI toolkit`,
        priority: 5,
      });
    }

    // 6. ALTERNATIVE_TOOL
    const isAlt = userTools.some((ut: any) => {
      const userToolObj = catalog.find((c) => c.id === ut.toolId);
      return (
        userToolObj &&
        (userToolObj.alternatives?.includes(tool.id) || tool.alternatives?.includes(ut.toolId))
      );
    });
    if (isAlt && !familiarity) {
      matchedSignals.push({
        type: 'ALTERNATIVE_TOOL',
        snippet: `offers a complementary workflow alternative to tools in your wallet`,
        priority: 6,
      });
    }

    if (matchedSignals.length === 0) continue;

    // Familiarity filtering
    if (familiarity === 'mastered') {
      const hasRadarOrAlt = matchedSignals.some(
        (s) => s.type === 'RADAR_DISCOVERY' || s.type === 'ALTERNATIVE_TOOL'
      );
      if (!hasRadarOrAlt) continue;
    } else if (familiarity === 'proficient') {
      const hasAdvancedSignal = matchedSignals.some(
        (s) =>
          s.type === 'RADAR_DISCOVERY' || s.type === 'ALTERNATIVE_TOOL' || s.type === 'FOCUS_BASED'
      );
      if (!hasAdvancedSignal) continue;
    }

    matchedSignals.sort((a, b) => a.priority - b.priority);
    const primarySignal = matchedSignals[0];
    const allSignalTypes = Array.from(new Set(matchedSignals.map((s) => s.type)));

    const snippets = matchedSignals.slice(0, 3).map((s) => s.snippet);
    let synthesizedReason = '';
    if (snippets.length === 1) {
      synthesizedReason = `You're seeing this because ${tool.name} ${snippets[0]}.`;
    } else if (snippets.length === 2) {
      synthesizedReason = `You're seeing this because ${tool.name} ${snippets[0]}, and ${snippets[1]}.`;
    } else {
      synthesizedReason = `You're seeing this because ${tool.name} ${snippets[0]}, ${snippets[1]}, and ${snippets[2]}.`;
    }

    let actionLabel = 'Add to Wallet & Explore';
    if (familiarity === 'exploring') actionLabel = 'Explore & Practice Tool';
    else if (familiarity === 'practicing') actionLabel = 'Practice a Real Task';
    else if (familiarity === 'proficient') actionLabel = 'Try an Advanced Workflow';
    else if (familiarity === 'mastered') actionLabel = 'View Advanced Opportunities';

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
      createdAt: 'Just now',
    });
  }

  return res.json(recs);
};

/**
 * POST /wallet/add
 */
export const addToWallet = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'PostgreSQL database is unavailable.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const { toolId, familiarity, primaryCategory, userNotes } = req.body;
  if (!toolId || typeof toolId !== 'string' || !toolId.trim()) {
    return res.status(400).json({ error: 'Valid toolId is required', code: 'INVALID_TOOL_ID' });
  }

  const cleanToolId = toolId.trim();
  const catalogItem =
    ToolCatalogService.getToolById(cleanToolId) ||
    (await ToolCatalogService.getToolByIdAsync(cleanToolId));
  if (!catalogItem) {
    return res
      .status(404)
      .json({ error: `Tool '${cleanToolId}' not found in catalog`, code: 'TOOL_NOT_FOUND' });
  }

  const wallet = req.user.aiWallet || { userTools: [], dismissedRecommendations: [] };
  wallet.userTools = wallet.userTools || [];
  const userId = String(req.user.id || req.user._id);

  const existing = wallet.userTools.find((t: any) => t.toolId === cleanToolId);
  if (existing) {
    if (familiarity) existing.familiarity = familiarity;
    if (userNotes !== undefined) existing.userNotes = userNotes;
    req.user.aiWallet = wallet;
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { aiWalletData: toJsonInput(wallet) },
      });
    } catch (err: any) {
      return res
        .status(500)
        .json({ error: 'Failed to persist wallet update', details: err.message });
    }
    return res.json({ success: true, item: existing, action: 'updated' });
  }

  const resolvedCategory = primaryCategory || catalogItem.category || 'Reasoning & Writing';
  const newItem = {
    toolId: cleanToolId,
    addedAt: new Date().toISOString().split('T')[0],
    familiarity: familiarity || 'exploring',
    userNotes: userNotes || '',
    primaryCategory: resolvedCategory,
    customTags: ['my-toolkit'],
  };

  wallet.userTools.unshift(newItem as any);
  req.user.aiWallet = wallet;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { aiWalletData: toJsonInput(wallet) },
    });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: 'Failed to persist wallet addition', details: err.message });
  }

  return res.json({ success: true, item: newItem, action: 'added' });
};

/**
 * POST /wallet/update-familiarity
 */
export const updateFamiliarity = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'PostgreSQL database is unavailable.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const { toolId, familiarity, userNotes } = req.body;
  if (!toolId || typeof toolId !== 'string' || !toolId.trim()) {
    return res.status(400).json({ error: 'Valid toolId is required', code: 'INVALID_TOOL_ID' });
  }

  const cleanToolId = toolId.trim();
  const wallet = req.user.aiWallet || { userTools: [], dismissedRecommendations: [] };
  wallet.userTools = wallet.userTools || [];

  const item = wallet.userTools.find((t: any) => t.toolId === cleanToolId);
  if (!item) {
    return res
      .status(404)
      .json({ error: 'Tool not found in user wallet', code: 'TOOL_NOT_IN_WALLET' });
  }

  if (familiarity) item.familiarity = familiarity;
  if (userNotes !== undefined) item.userNotes = userNotes;

  req.user.aiWallet = wallet;
  const userId = String(req.user.id || req.user._id);
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { aiWalletData: toJsonInput(wallet) },
    });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: 'Failed to persist familiarity update', details: err.message });
  }

  return res.json({ success: true, item });
};

/**
 * GET /tools/discovery/runs
 */
export const getDiscoveryRuns = async (req: Request, res: Response) => {
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'PostgreSQL database is unavailable.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const rows = await prisma.toolDiscoveryRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
    const runs = rows.map((r) => ({
      ...withLegacyId(r),
      errors: toArray(r.runErrors),
      runErrors: toArray(r.runErrors),
    }));
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
  if (!toolId || !isValidId(toolId)) {
    return res.status(400).json({ error: 'Valid toolId param is required.' });
  }
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'PostgreSQL database is unavailable.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }
  try {
    const rows = await prisma.toolEvidence.findMany({
      where: { toolId },
      orderBy: { fetchedAt: 'desc' },
    });
    const evidence = rows.map(withLegacyId);
    return res.json({
      toolId,
      evidence,
      counts: {
        total: evidence.length,
        pending: evidence.filter((e) => e.verificationStatus === 'PENDING').length,
        accepted: evidence.filter((e) => e.verificationStatus === 'ACCEPTED').length,
        rejected: evidence.filter((e) => e.verificationStatus === 'REJECTED').length,
      },
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
  if (!toolId || !isValidId(toolId)) {
    return res.status(400).json({ error: 'Valid toolId param is required.' });
  }
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'PostgreSQL database is unavailable.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }
  try {
    const rows = await prisma.toolVersionHistory.findMany({
      where: { toolId },
      orderBy: { detectedAt: 'desc' },
    });
    const history = rows.map(withLegacyId);
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
    const sources = ToolSourceService.getSources().map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      priority: s.priority,
      enabled: s.enabled,
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
      },
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
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'PostgreSQL database is unavailable.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }
  try {
    const rows = await prisma.aiTool.findMany({
      where: {
        OR: [
          { verificationStatus: 'DISCOVERED' },
          { verificationStatus: 'UNVERIFIED' },
          { verificationStatus: 'PENDING_VERIFICATION' },
          { activeStatus: false },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    const candidates = rows.map(aiToolRowToDomain);
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

  if (!toolId || !isValidId(toolId)) {
    return res.status(400).json({ error: 'Valid toolId is required.' });
  }

  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'PostgreSQL database is unavailable.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  try {
    if (acceptEvidenceId && isValidId(acceptEvidenceId)) {
      await toolVerificationService.acceptEvidence(acceptEvidenceId);
    }
    const verifyResult = await toolVerificationService.verifyTool(toolId);

    if (activate) {
      const nowIso = new Date().toISOString();
      await prisma.aiTool.updateMany({
        where: { id: toolId },
        data: {
          activeStatus: true,
          verificationStatus: 'VERIFIED',
          lastVerifiedAt: nowIso,
          lastUpdatedAt: nowIso,
        },
      });
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
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'PostgreSQL database is unavailable.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  try {
    const [totalTools, activeVerified, pendingCandidates, totalEvidence, recentRuns] =
      await Promise.all([
        prisma.aiTool.count(),
        prisma.aiTool.count({
          where: {
            activeStatus: true,
            verificationStatus: { in: ['VERIFIED', 'VERIFIED_SEED'] },
          },
        }),
        prisma.aiTool.count({ where: { activeStatus: false } }),
        prisma.toolEvidence.count(),
        prisma.toolDiscoveryRun.findMany({
          orderBy: { startedAt: 'desc' },
          take: 5,
        }),
      ]);

    const mappedRuns = recentRuns.map((r) => ({
      ...withLegacyId(r),
      errors: toArray(r.runErrors),
      runErrors: toArray(r.runErrors),
    }));

    return res.json({
      pipelineStatus: 'OPERATIONAL',
      mode: 'POSTGRESQL',
      totalToolsInCatalog: totalTools,
      activeVerifiedTools: activeVerified,
      pendingCandidates,
      totalEvidenceDocs: totalEvidence,
      recentRunsCount: mappedRuns.length,
      lastRun: mappedRuns[0] || null,
    });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: 'Failed to fetch intelligence dashboard', details: err.message });
  }
};

/**
 * GET /wallet/domain-cards
 * Returns the 13 canonical domain categories populated with verified tools.
 */
export const getDomainCards = async (_req: Request, res: Response) => {
  const tools = await ToolCatalogService.getCatalogAsync();
  const domainCards = DomainTaxonomyService.getThirteenDomainCards(tools);
  return res.json({
    success: true,
    totalDomains: domainCards.length,
    domains: domainCards,
  });
};

/**
 * POST /wallet/operate
 * Authoritative 100 AC charge for advanced wallet operations using centralized ledger.
 */
export const executeWalletOperation = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'PostgreSQL database is unavailable.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const userId = String(req.user.id || req.user._id);
  const { operationName, idempotencyKey, metadata } = req.body;
  const opName =
    typeof operationName === 'string' && operationName.trim()
      ? operationName.trim()
      : 'AI Wallet Operation';

  try {
    const chargeResult = await creditsLedgerService.chargeWalletOperation(
      userId,
      opName,
      idempotencyKey,
      metadata
    );

    if (!chargeResult.success) {
      if (chargeResult.code === 'INSUFFICIENT_CREDITS') {
        return res.status(402).json({
          error: 'Insufficient credits. AI Wallet operation requires 100 AC.',
          code: 'INSUFFICIENT_CREDITS',
          requiredAmount: 100,
          currentBalance: chargeResult.balance ?? 0,
        });
      }
      return res.status(400).json({
        error: chargeResult.error || 'Failed to authorize wallet operation charge.',
        code: chargeResult.code || 'CHARGE_FAILED',
      });
    }

    return res.json({
      success: true,
      duplicate: Boolean(chargeResult.duplicate),
      operationName: opName,
      cost: 100,
      balance: chargeResult.balance,
      transaction: chargeResult.transaction,
    });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: 'Internal wallet operation failure', details: err.message });
  }
};

/**
 * POST /wallet/confirm-usage
 * D6 Decision: Manual learner tool usage confirmation.
 * Zero automatic detection. Stores confirmation records in PostgreSQL.
 * Deduplicates to prevent double submissions.
 */
export const confirmToolUsage = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'PostgreSQL database is unavailable.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const { toolId, taskContext, notes, idempotencyKey } = req.body;
  if (!toolId || typeof toolId !== 'string' || !toolId.trim()) {
    return res.status(400).json({ error: 'Valid toolId is required', code: 'INVALID_TOOL_ID' });
  }

  const cleanToolId = toolId.trim();
  const catalogItem =
    ToolCatalogService.getToolById(cleanToolId) ||
    (await ToolCatalogService.getToolByIdAsync(cleanToolId));

  if (!catalogItem) {
    return res
      .status(404)
      .json({ error: `Tool '${cleanToolId}' not found in catalog`, code: 'TOOL_NOT_FOUND' });
  }

  const userId = String(req.user.id || req.user._id);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ error: 'User record not found', code: 'USER_NOT_FOUND' });
  }

  const walletData: any = user.aiWalletData ? toRecord(user.aiWalletData) : {};
  const confirmations: any[] = Array.isArray(walletData.usageConfirmations)
    ? [...walletData.usageConfirmations]
    : [];

  // Idempotency / duplicate prevention check
  const duplicate = confirmations.find(
    (c: any) =>
      (idempotencyKey && c.idempotencyKey === idempotencyKey) ||
      (c.toolId === cleanToolId &&
        (!taskContext || c.taskContext?.toLowerCase() === taskContext.trim().toLowerCase()))
  );

  if (duplicate) {
    return res.json({
      success: true,
      duplicate: true,
      message: 'Usage for this tool has already been manually confirmed.',
      confirmation: duplicate,
    });
  }

  const newConfirmation = {
    id: `confirm-${randomUUID()}`,
    userId,
    toolId: cleanToolId,
    toolName: catalogItem.name,
    provider: catalogItem.provider,
    taskContext: taskContext ? String(taskContext).trim() : 'Self-guided practice',
    notes: notes ? String(notes).trim() : '',
    confirmedAt: new Date().toISOString(),
    verificationMethod: 'MANUAL_LEARNER_CONFIRMATION',
    status: 'CONFIRMED',
    idempotencyKey: idempotencyKey || undefined,
  };

  confirmations.unshift(newConfirmation);
  walletData.usageConfirmations = confirmations;

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { aiWalletData: toJsonInput(walletData) },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to persist confirmation', details: err.message });
  }

  return res.status(201).json({
    success: true,
    duplicate: false,
    message: 'Tool usage successfully confirmed by learner.',
    confirmation: newConfirmation,
  });
};

/**
 * GET /wallet/confirmations
 * Retrieves all manual usage confirmation records for the authenticated learner.
 */
export const getUserConfirmations = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }
  if (!isDatabaseConnected()) {
    return res.status(503).json({
      error: 'PostgreSQL database is unavailable.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  const userId = String(req.user.id || req.user._id);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { aiWalletData: true },
  });

  const walletData: any = user?.aiWalletData ? toRecord(user.aiWalletData) : {};
  const confirmations = Array.isArray(walletData.usageConfirmations)
    ? walletData.usageConfirmations
    : [];

  return res.json({
    success: true,
    total: confirmations.length,
    confirmations,
  });
};

/**
 * POST /wallet/personalized-match & GET /wallet/personalized-matching
 * Personalized matching across Video Editing, Data Analytics, and Graphic Design.
 * Reuses Phase 2 Persistent AI Learner Profile from PostgreSQL (or general fallback if absent).
 */
export const getPersonalizedToolMatching = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
  }

  const userId = String(req.user.id || req.user._id);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      analysisData: true,
      targetGoal: true,
      studentProfile: true,
      entrepreneurProfile: true,
    },
  });

  const analysis: any = user?.analysisData ? toRecord(user.analysisData) : {};
  const persistentProfile = analysis.aiLearnerProfile || null;

  const domain = req.body?.domain || req.query?.domain || 'All';
  const freeOnly = Boolean(req.body?.freeOnly ?? req.query?.freeOnly === 'true');
  const preferredSkillLevel = req.body?.preferredSkillLevel || req.query?.preferredSkillLevel;

  const targetGoal = user?.targetGoal || req.user.targetGoal;

  const results = ToolMatchingService.getPersonalizedDomainRecommendations({
    domain: String(domain),
    learnerProfile: persistentProfile,
    targetGoal,
    skillLevel: preferredSkillLevel as any,
    freeOnly,
  });

  return res.json({
    success: true,
    isPersonalized: results.some((r) => r.isPersonalized),
    profileSource: results[0]?.profileSource || 'GENERAL_DOMAIN_FALLBACK',
    learnerGoal: results[0]?.learnerGoal || targetGoal || 'General Mastery',
    results,
  });
};
