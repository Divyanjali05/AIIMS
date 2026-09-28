import { LearnerState } from '../context/LearnerContext';
import { buildLearnerProfileContext } from './learnerProfileContext';
import { AITool, ToolRecommendation, TaskCategory, RecommendationType, ToolFamiliarity } from '../types';

/**
 * Transparent Metadata-Driven Multi-Signal Recommendation Engine for AI Wallet
 *
 * PIPELINE FLOW:
 * Learner Context → Candidate Tools → Metadata Matching → Matched Signals → Familiarity Filtering → Recommendation Synthesis → Why You're Seeing This
 *
 * RECOMMENDATION TYPES:
 * 1. FOCUS_BASED: Matches active Focus track or growth area against tool focusTracks & categories.
 * 2. RADAR_DISCOVERY: Matches investigated/saved AI Radar opportunities against tool radarTopics & relatedTools.
 * 3. TASK_BASED: Matches Clarity goals, Problem Solver activity, or Build projects against tool clarityTopics & taskMappings.
 * 4. SKILL_GAP: Matches diagnostic profile growth areas against tool categories & focusTracks.
 * 5. TOOLKIT_GAP: Matches unrepresented TaskCategory domains in user's wallet against tool categories.
 * 6. ALTERNATIVE_TOOL: Matches tools currently in wallet against candidate alternative tools.
 * 7. LEARNING_RECOMMENDATION: Prompts practice for tools currently marked as 'exploring' or 'practicing'.
 *
 * UX & ARCHITECTURE PRINCIPLES:
 * - 1 TOOL → 1 COHERENT RECOMMENDATION CARD (multi-signal matchedSignals retained internally).
 * - Metadata-driven matching (operates on focusTracks, clarityTopics, radarTopics, etc. without hardcoded tool IDs).
 * - Neutral, natural copy: Zero prohibited terms ("Best", "#1", "Winner", "Superior", "Guaranteed", "Must use").
 * - No raw diagnostic precision exposure ("score 62/100").
 * - Familiarity-aware action labels and filtering (mastered/proficient suppression).
 * - Clear Radar boundary (explains why the tool helps with the opportunity, not the full news article).
 */

interface SignalMatch {
  type: RecommendationType;
  reasonSnippet: string;
  priority: number; // 1 (highest) to 7
  relatedTask?: string;
  relatedSkill?: string;
  relevance?: string;
}

export const generateWalletRecommendations = (
  state: LearnerState,
  catalog: AITool[]
): ToolRecommendation[] => {
  const profileCtx = buildLearnerProfileContext(state);
  const userTools = state.aiWallet?.userTools || [];
  const dismissedIds = new Set(state.aiWallet?.dismissedRecommendations || []);

  // Map user tool familiarity
  const userToolFamiliarityMap = new Map<string, ToolFamiliarity>();
  userTools.forEach((t: { toolId: string; familiarity: ToolFamiliarity }) => userToolFamiliarityMap.set(t.toolId, t.familiarity));

  // Extract Learner Context Signals
  const activeFocus = state.focus.selectedTrack || state.analysis.growthArea || 'AI Workflow Design';
  const clarityTopic = state.clarity.selectedTopic || (state.clarity.completedTopics && state.clarity.completedTopics[0]) || '';
  const growthArea = state.analysis.growthArea || 'AI Workflow Design';
  const investigatedRadarIds = state.radar.investigatedSignalIds || [];
  const walletCategories = profileCtx.aiWallet.primaryCategories || [];
  const toolkitGaps = profileCtx.aiWallet.toolkitGaps || [];
  const latestWorkflow = state.solver?.latestWorkflow;

  // Use provided catalog, fallback to empty array safely if null/undefined
  const candidateTools = catalog && catalog.length > 0 ? catalog : [];

  const toolRecommendations: ToolRecommendation[] = [];

  // Helper for case-insensitive keyword matching
  const containsMatch = (targetText: string, searchKey: string): boolean => {
    if (!targetText || !searchKey) return false;
    const normTarget = targetText.toLowerCase();
    const normSearch = searchKey.toLowerCase();
    return normTarget.includes(normSearch) || normSearch.includes(normTarget);
  };

  // Iterate Candidate Tools & Perform Pure Metadata Matching
  for (const tool of candidateTools) {
    if (!tool.activeStatus) continue;

    const matchedSignals: SignalMatch[] = [];
    const familiarity = userToolFamiliarityMap.get(tool.id);

    // Structured metadata arrays with fallbacks
    const toolFocusTracks = tool.focusTracks || [tool.category];
    const toolClarityTopics = tool.clarityTopics || tool.taskMappings || [];
    const toolRadarTopics = tool.radarTopics || [tool.category];
    const toolCategories = tool.categories || [tool.category];
    const toolRelatedTools = tool.relatedTools || [];

    // ------------------------------------------------------------------------
    // SIGNAL 1: FOCUS_BASED
    // Matches active Focus track or growth area against tool focusTracks & categories
    // ------------------------------------------------------------------------
    const matchesFocus = toolFocusTracks.some((ft) => containsMatch(ft, activeFocus)) ||
      toolCategories.some((cat) => containsMatch(cat, activeFocus)) ||
      containsMatch(tool.description, activeFocus);

    if (matchesFocus) {
      matchedSignals.push({
        type: 'FOCUS_BASED',
        priority: 2,
        reasonSnippet: `aligns with your active focus on ${activeFocus}`,
        relatedTask: tool.useCases[0] || `${activeFocus} Execution`,
        relatedSkill: tool.category,
        relevance: `Matches your primary focus on ${activeFocus}`
      });
    }

    // ------------------------------------------------------------------------
    // SIGNAL 2: RADAR_DISCOVERY (PURE METADATA MATCHING)
    // Matches investigated Radar signals against tool radarTopics, relatedTools, categories, & capabilities
    // ------------------------------------------------------------------------
    let matchedRadarTopic: string | null = null;
    if (investigatedRadarIds.length > 0) {
      // Check if tool metadata contains an investigated signal ID directly
      for (const sigId of investigatedRadarIds) {
        if (toolRadarTopics.includes(sigId) || toolRelatedTools.includes(sigId)) {
          matchedRadarTopic = toolRadarTopics.find((t) => t !== sigId) || tool.category;
          break;
        }
      }
      // Check keyword/topic overlap between tool radarTopics and investigated signal IDs or categories
      if (!matchedRadarTopic) {
        const matchingTopic = toolRadarTopics.find((rt) =>
          investigatedRadarIds.some((sigId: string) => containsMatch(rt, sigId))
        );
        if (matchingTopic) {
          matchedRadarTopic = matchingTopic;
        }
      }
      // Fallback: match category if user has active radar investigations in matching category
      if (!matchedRadarTopic && investigatedRadarIds.length > 0) {
        const hasCategoryOverlap = toolCategories.some(cat =>
          cat === 'Agentic Coding' || cat === 'Research & RAG' || cat === 'Reasoning & Writing' || cat === 'Automation'
        );
        if (hasCategoryOverlap) {
          matchedRadarTopic = toolRadarTopics[0] || tool.category;
        }
      }
    }

    if (matchedRadarTopic) {
      const displayTopic = matchedRadarTopic.toLowerCase().includes('sig-') ? tool.category : matchedRadarTopic;
      matchedSignals.push({
        type: 'RADAR_DISCOVERY',
        priority: 1, // High relevance when connected to investigated shift
        reasonSnippet: `supports ${displayTopic} capabilities you explored on AI Radar`,
        relatedTask: tool.useCases[0] || 'AI Radar Workflow Exploration',
        relatedSkill: tool.category,
        relevance: `Connected to your recent AI Radar investigation`
      });
    }

    // ------------------------------------------------------------------------
    // SIGNAL 3: TASK_BASED
    // Matches Clarity goals, Problem Solver activity, or Build projects
    // ------------------------------------------------------------------------
    const matchesClarity = clarityTopic && (
      toolClarityTopics.some((ct) => containsMatch(ct, clarityTopic)) ||
      toolCategories.some((cat) => containsMatch(cat, clarityTopic)) ||
      containsMatch(tool.description, clarityTopic)
    );

    const matchesSolverWorkflow = latestWorkflow && toolCategories.some((cat) =>
      containsMatch(cat, latestWorkflow.workflowSteps[0]?.toolCategory || '')
    );

    if (matchesClarity || matchesSolverWorkflow) {
      const taskContext = matchesSolverWorkflow
        ? `your recent Problem Solver workflow ("${latestWorkflow?.problemSummary.slice(0, 35)}...")`
        : `your Clarity goal ("${clarityTopic}")`;

      matchedSignals.push({
        type: 'TASK_BASED',
        priority: 3,
        reasonSnippet: `directly supports ${taskContext}`,
        relatedTask: matchesSolverWorkflow ? latestWorkflow?.problemSummary : clarityTopic,
        relatedSkill: tool.category,
        relevance: matchesSolverWorkflow ? 'Connected to Problem Solver activity' : 'Aligns with your Clarity goal'
      });
    }

    // ------------------------------------------------------------------------
    // SIGNAL 4: SKILL_GAP
    // Matches diagnostic profile growth areas against tool categories & focusTracks
    // ------------------------------------------------------------------------
    const matchesGrowthArea = growthArea && (
      toolCategories.some((cat) => containsMatch(cat, growthArea)) ||
      toolFocusTracks.some((ft) => containsMatch(ft, growthArea))
    );

    if (matchesGrowthArea) {
      matchedSignals.push({
        type: 'SKILL_GAP',
        priority: 4,
        reasonSnippet: `strengthens your growth area in ${growthArea}`,
        relatedTask: tool.useCases[0] || `${growthArea} Capability Development`,
        relatedSkill: growthArea,
        relevance: `Strengthens your growth area (${growthArea})`
      });
    }

    // ------------------------------------------------------------------------
    // SIGNAL 5: TOOLKIT_GAP
    // Matches unrepresented TaskCategory domains in user's wallet
    // ------------------------------------------------------------------------
    const isCategoryUnrepresented = toolkitGaps.includes(tool.category) ||
      !walletCategories.includes(tool.category);

    if (isCategoryUnrepresented && !familiarity) {
      matchedSignals.push({
        type: 'TOOLKIT_GAP',
        priority: 5,
        reasonSnippet: `fills an unrepresented category (${tool.category}) in your current AI toolkit`,
        relatedTask: tool.useCases[0] || `${tool.category} Capability`,
        relatedSkill: tool.category,
        relevance: `Fills your ${tool.category} toolkit gap`
      });
    }

    // ------------------------------------------------------------------------
    // SIGNAL 6: ALTERNATIVE_TOOL
    // Matches tools currently in wallet against candidate alternative tools
    // ------------------------------------------------------------------------
    const isAlternativeToWalletTool = userTools.some((ut: { toolId: string }) => {
      const userToolObj = candidateTools.find((c) => c.id === ut.toolId);
      return userToolObj && (
        userToolObj.alternatives?.includes(tool.id) ||
        tool.alternatives?.includes(ut.toolId)
      );
    });

    if (isAlternativeToWalletTool && !familiarity) {
      matchedSignals.push({
        type: 'ALTERNATIVE_TOOL',
        priority: 6,
        reasonSnippet: `offers a complementary workflow alternative to tools currently in your wallet`,
        relatedTask: tool.useCases[0] || 'Alternative Workflow Comparison',
        relatedSkill: tool.category,
        relevance: 'Complements your existing toolkit'
      });
    }

    // ------------------------------------------------------------------------
    // SIGNAL 7: LEARNING_RECOMMENDATION
    // Prompts practice for tools currently marked as 'exploring' or 'practicing'
    // ------------------------------------------------------------------------
    if (familiarity === 'exploring' || familiarity === 'practicing') {
      const practiceStage = familiarity === 'exploring' ? 'Exploring' : 'Practicing';
      const guidanceText = tool.familiarityGuidance?.[familiarity] || `Applying it to tasks in ${activeFocus} deepens your proficiency.`;

      matchedSignals.push({
        type: 'LEARNING_RECOMMENDATION',
        priority: 7,
        reasonSnippet: `you are currently ${practiceStage.toLowerCase()} ${tool.name}. ${guidanceText}`,
        relatedTask: `Practice task in ${tool.category}`,
        relatedSkill: tool.category,
        relevance: `Elevates your familiarity with ${tool.name}`
      });
    }

    // If no signals matched, skip this candidate tool
    if (matchedSignals.length === 0) continue;

    // ------------------------------------------------------------------------
    // FAMILIARITY FILTERING RULES
    // ------------------------------------------------------------------------
    if (familiarity === 'mastered') {
      // Suppress normal discovery recs; allow only if new Radar opportunity or alternative comparison
      const hasRadarOrAlt = matchedSignals.some((s) => s.type === 'RADAR_DISCOVERY' || s.type === 'ALTERNATIVE_TOOL');
      if (!hasRadarOrAlt) continue;
    } else if (familiarity === 'proficient') {
      // Suppress basic discovery / generic toolkit-gap recs; allow advanced signals
      const hasAdvancedSignal = matchedSignals.some(
        (s) => s.type === 'RADAR_DISCOVERY' || s.type === 'ALTERNATIVE_TOOL' || s.type === 'FOCUS_BASED' || s.type === 'TASK_BASED'
      );
      if (!hasAdvancedSignal) continue;
    }

    // Sort matched signals by priority (lowest priority number = highest importance)
    matchedSignals.sort((a, b) => a.priority - b.priority);

    const primarySignal = matchedSignals[0];
    const allSignalTypes = Array.from(new Set(matchedSignals.map((s) => s.type)));

    // ------------------------------------------------------------------------
    // RECOMMENDATION SYNTHESIS (1 TOOL → 1 COHERENT RECOMMENDATION)
    // Combine matched signals into a single, natural learner-facing explanation
    // ------------------------------------------------------------------------
    let synthesizedReason = '';

    if (matchedSignals.length === 1) {
      synthesizedReason = `You're seeing this because ${tool.name} ${matchedSignals[0].reasonSnippet}.`;
    } else {
      const snippets = matchedSignals.slice(0, 3).map((s) => s.reasonSnippet);
      if (snippets.length === 2) {
        synthesizedReason = `You're seeing this because ${tool.name} ${snippets[0]}, and ${snippets[1]}.`;
      } else {
        synthesizedReason = `You're seeing this because ${tool.name} ${snippets[0]}, ${snippets[1]}, and ${snippets[2]}.`;
      }
    }

    // Clean up double spaces or awkward formatting
    synthesizedReason = synthesizedReason.replace(/  +/g, ' ').trim();

    // ------------------------------------------------------------------------
    // FAMILIARITY MUST AFFECT THE ACTION LABEL
    // ------------------------------------------------------------------------
    let actionLabel = 'Add to Wallet & Explore';
    if (familiarity === 'exploring') {
      actionLabel = 'Explore & Practice Tool';
    } else if (familiarity === 'practicing') {
      actionLabel = 'Practice a Real Task';
    } else if (familiarity === 'proficient') {
      actionLabel = 'Try an Advanced Workflow';
    } else if (familiarity === 'mastered') {
      actionLabel = 'View Advanced Opportunities';
    }

    const recId = `rec-${tool.id}`;

    if (dismissedIds.has(recId)) continue;

    toolRecommendations.push({
      id: recId,
      toolId: tool.id,
      type: primarySignal.type,
      matchedSignals: allSignalTypes,
      reason: synthesizedReason,
      relatedTask: primarySignal.relatedTask || tool.useCases[0],
      relatedSkill: primarySignal.relatedSkill || tool.category,
      relevance: primarySignal.relevance || `Aligned with your ${activeFocus} workflow`,
      actionLabel,
      status: 'active',
      createdAt: 'Just now'
    });
  }

  return toolRecommendations;
};
