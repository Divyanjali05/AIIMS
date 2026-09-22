import { LearnerState } from '../context/LearnerContext';
import { buildLearnerProfileContext } from './learnerProfileContext';
import { AITool, ToolRecommendation, TaskCategory } from '../types';

/**
 * Transparent Multi-Signal Recommendation Engine for AI Wallet
 *
 * Recommendation Categories:
 * 1. FOCUS_BASED: Driven by active Focus track (e.g. Agentic Coding vs AI Workflow Design).
 * 2. RADAR_DISCOVERY: Driven by investigated or saved AI Radar opportunities.
 * 3. SKILL_GAP: Driven by diagnostic Assessment scores and growth areas.
 * 4. TASK_BASED: Driven by Clarity goals, completed topics, or Problem Solver activity.
 * 5. TOOLKIT_GAP: Driven by unrepresented TaskCategory domains in user's wallet.
 * 6. ALTERNATIVE_TOOL: Neutral comparison to complement existing tool usage.
 * 7. LEARNING_RECOMMENDATION: Recommendations to practice tools currently being explored.
 *
 * STRICT UX PRINCIPLES:
 * - Transparent, contextual phrasing answering "WHY AM I SEEING THIS?".
 * - Zero universal rankings ("Best AI", "Winner", "#1 AI").
 * - Respects familiarity levels: does not recommend tools the learner has already mastered.
 */

export const generateWalletRecommendations = (
  state: LearnerState,
  catalog: AITool[]
): ToolRecommendation[] => {
  const profileCtx = buildLearnerProfileContext(state);
  const userTools = state.aiWallet?.userTools || [];
  const dismissedIds = new Set(state.aiWallet?.dismissedRecommendations || []);

  // Map of existing tools and their familiarity levels
  const userToolFamiliarityMap = new Map<string, string>();
  userTools.forEach((t) => userToolFamiliarityMap.set(t.toolId, t.familiarity));

  const recommendations: ToolRecommendation[] = [];

  const addRec = (rec: ToolRecommendation) => {
    const existingFam = userToolFamiliarityMap.get(rec.toolId);

    // Rule: Do NOT recommend tools the learner has already mastered or is proficient with,
    // unless it's a specific alternative comparison or radar discovery.
    if (existingFam === 'mastered' || existingFam === 'proficient') {
      if (rec.type !== 'ALTERNATIVE_TOOL' && rec.type !== 'RADAR_DISCOVERY') {
        return;
      }
    }

    if (!dismissedIds.has(rec.id)) {
      if (!recommendations.some((r) => r.toolId === rec.toolId)) {
        recommendations.push(rec);
      }
    }
  };

  const activeFocus = state.focus.selectedTrack || state.analysis.growthArea || 'AI Workflow Design';
  const clarityTopic = state.clarity.selectedTopic || (state.clarity.completedTopics && state.clarity.completedTopics[0]) || null;
  const growthArea = state.analysis.growthArea || 'AI Workflow Design';
  const investigatedIds = state.radar.investigatedSignalIds || [];
  const walletCategories = profileCtx.aiWallet.primaryCategories || [];
  const latestWorkflow = state.solver?.latestWorkflow;
  const projects = state.build?.projects || [];

  // --------------------------------------------------------------------------
  // RULE 1: FOCUS_BASED (Driven by active Focus track)
  // --------------------------------------------------------------------------
  if (activeFocus.includes('Coding') || activeFocus.includes('Developer')) {
    addRec({
      id: 'rec-cursor-focus',
      toolId: 'tool-cursor',
      type: 'FOCUS_BASED',
      reason: `You are currently focused on ${activeFocus}, but your toolkit has limited coverage for workspace-wide multi-file AI coding agents.`,
      relatedTask: 'Autonomous Multi-file Code Refactoring',
      relatedSkill: 'Agentic Coding & System Architecture',
      relevance: `Directly aligns with your active focus on ${activeFocus}`,
      status: 'active',
      createdAt: 'Just now'
    });
  } else if (activeFocus.includes('Workflow') || activeFocus.includes('Automation')) {
    addRec({
      id: 'rec-make-focus',
      toolId: 'tool-make',
      type: 'FOCUS_BASED',
      reason: `Your active focus track is ${activeFocus}. Exploring visual no-code workflow automation allows connecting 1,500+ apps into multi-step AI node pipelines.`,
      relatedTask: 'Cross-App Workflow Automation & Webhooks',
      relatedSkill: 'AI Workflow Design',
      relevance: `Matches your primary focus on ${activeFocus}`,
      status: 'active',
      createdAt: 'Just now'
    });
  }

  // --------------------------------------------------------------------------
  // RULE 2: RADAR_DISCOVERY (Driven by investigated Radar opportunities)
  // --------------------------------------------------------------------------
  if (investigatedIds.includes('sig-1')) {
    addRec({
      id: 'rec-claude-radar',
      toolId: 'tool-claude',
      type: 'RADAR_DISCOVERY',
      reason: 'You recently investigated the "Computer Use & OS Automation" opportunity on AI Radar. Claude 3.5 Sonnet provides direct OS interaction capabilities alongside 200k context reasoning.',
      relatedTask: 'Computer Use & GUI Workflow Automation',
      relatedSkill: 'Agentic Workflows & OS Control',
      relevance: 'Connected to your AI Radar Computer Use investigation',
      status: 'active',
      createdAt: 'Just now'
    });
  }

  if (investigatedIds.includes('sig-2')) {
    addRec({
      id: 'rec-copilot-radar',
      toolId: 'tool-copilot',
      type: 'RADAR_DISCOVERY',
      reason: 'You recently explored an AI Radar opportunity related to Autonomous Coding Agents. GitHub Copilot Workspace integrates agentic PR checks into VS Code.',
      relatedTask: 'Agentic PR Review & Inline Completion',
      relatedSkill: 'Agentic Coding & Code Inspection',
      relevance: 'Connected to your AI Radar Autonomous Coding investigation',
      status: 'active',
      createdAt: 'Just now'
    });
  }

  // --------------------------------------------------------------------------
  // RULE 3: TASK_BASED (Driven by Clarity goals, Problem Solver, or Build)
  // --------------------------------------------------------------------------
  if (latestWorkflow) {
    const matchedCategory = latestWorkflow.workflowSteps[0]?.toolCategory || 'Data Analysis';
    if (!walletCategories.includes(matchedCategory)) {
      addRec({
        id: 'rec-solver-task',
        toolId: matchedCategory === 'Agentic Coding' ? 'tool-cursor' : matchedCategory === 'Research & RAG' ? 'tool-perplexity' : 'tool-julius',
        type: 'TASK_BASED',
        reason: `You recently solved a problem in Problem Solver requiring ${matchedCategory} capabilities ("${latestWorkflow.problemSummary.slice(0, 45)}...").`,
        relatedTask: latestWorkflow.problemSummary,
        relatedSkill: latestWorkflow.requiredCapability,
        relevance: 'Connected to your latest Problem Solver workflow',
        status: 'active',
        createdAt: 'Just now'
      });
    }
  }

  if (clarityTopic && clarityTopic.includes('Research')) {
    addRec({
      id: 'rec-perplexity-clarity',
      toolId: 'tool-perplexity',
      type: 'TASK_BASED',
      reason: `Your Clarity goal emphasizes "${clarityTopic}". Real-time web retrieval engines provide verifiable citation sources for technical research.`,
      relatedTask: 'Live Citation & Market Research',
      relatedSkill: 'Research & RAG',
      relevance: `Supports your Clarity goal on ${clarityTopic}`,
      status: 'active',
      createdAt: 'Just now'
    });
  }

  // --------------------------------------------------------------------------
  // RULE 4: SKILL_GAP (Driven by Assessment scores & Analysis growth area)
  // --------------------------------------------------------------------------
  const scores = profileCtx.assessment.scores;

  if (scores.workflowDesign < 75 || growthArea.includes('Workflow')) {
    addRec({
      id: 'rec-cursor-gap',
      toolId: 'tool-cursor',
      type: 'SKILL_GAP',
      reason: `Your diagnostic assessment indicates an opportunity in ${growthArea} (score: ${scores.workflowDesign || 62}/100). An AI-first editor with composer loops helps streamline structured workflows.`,
      relatedTask: 'Agentic Coding & Repository Refactoring',
      relatedSkill: 'AI Workflow Design',
      relevance: `Addresses your primary growth area (${growthArea})`,
      status: 'active',
      createdAt: 'Just now'
    });
  }

  if (scores.evaluationCapability < 75 || growthArea.includes('Evaluation')) {
    addRec({
      id: 'rec-notebooklm-gap',
      toolId: 'tool-notebooklm',
      type: 'SKILL_GAP',
      reason: `Based on your diagnostic profile in AI Evaluation (${scores.evaluationCapability || 70}/100), exploring a source-locked RAG assistant helps verify source facts without hallucination risks.`,
      relatedTask: 'Source-Grounded Document Evaluation',
      relatedSkill: 'AI Evaluation & Critical Assessment',
      relevance: 'Strengthens source verification skills',
      status: 'active',
      createdAt: 'Just now'
    });
  }

  // --------------------------------------------------------------------------
  // RULE 5: ALTERNATIVE_TOOL (Neutral complementary comparison)
  // --------------------------------------------------------------------------
  if (userToolFamiliarityMap.has('tool-chatgpt') && !userToolFamiliarityMap.has('tool-claude')) {
    addRec({
      id: 'rec-claude-alt',
      toolId: 'tool-claude',
      type: 'ALTERNATIVE_TOOL',
      reason: 'You currently use ChatGPT for daily prompt tasks. Exploring Claude 3.5 Sonnet offers a complementary workflow for extended 200k context document reasoning and live Artifact rendering.',
      relatedTask: 'Long-Form Document & System Prompt Reasoning',
      relatedSkill: 'Prompt Engineering & Extended Context',
      relevance: 'Complements your current reasoning toolkit',
      status: 'active',
      createdAt: 'Just now'
    });
  }

  // --------------------------------------------------------------------------
  // RULE 6: TOOLKIT_GAP (Unrepresented TaskCategory domains in wallet)
  // --------------------------------------------------------------------------
  const gaps = profileCtx.aiWallet.toolkitGaps;

  if (gaps.includes('Research & RAG')) {
    addRec({
      id: 'rec-perplexity-gap',
      toolId: 'tool-perplexity',
      type: 'TOOLKIT_GAP',
      reason: 'Your current toolkit has no represented tool in Research & RAG. Exploring real-time web retrieval engines adds verifiable citation capabilities to your workflow.',
      relatedTask: 'Live Citation & Market Research',
      relatedSkill: 'Research & RAG',
      relevance: 'Fills your Research & RAG toolkit gap',
      status: 'active',
      createdAt: 'Just now'
    });
  }

  if (gaps.includes('Data Analysis')) {
    addRec({
      id: 'rec-julius-gap',
      toolId: 'tool-julius',
      type: 'TOOLKIT_GAP',
      reason: 'You do not currently have a data analysis tool in your wallet. Exploring sandboxed Python execution tools enables automated chart generation and statistical modeling.',
      relatedTask: 'Exploratory Data & Statistical Analysis',
      relatedSkill: 'Data Analysis & Python Execution',
      relevance: 'Fills your Data Analysis toolkit gap',
      status: 'active',
      createdAt: 'Just now'
    });
  }

  if (gaps.includes('Presentation')) {
    addRec({
      id: 'rec-gamma-gap',
      toolId: 'tool-gamma',
      type: 'TOOLKIT_GAP',
      reason: 'You currently have no presentation tool in your wallet. Exploring AI presentation deck generators can save hours when communicating project milestones to stakeholders.',
      relatedTask: 'AI Slide Deck & Pitch Design',
      relatedSkill: 'Strategic Communication & Vision',
      relevance: 'Fills your Presentation toolkit gap',
      status: 'active',
      createdAt: 'Just now'
    });
  }

  // --------------------------------------------------------------------------
  // RULE 7: LEARNING_RECOMMENDATION (Practice tools currently being explored)
  // --------------------------------------------------------------------------
  userTools.forEach((t) => {
    if (t.familiarity === 'exploring') {
      addRec({
        id: `rec-practice-${t.toolId}`,
        toolId: t.toolId,
        type: 'LEARNING_RECOMMENDATION',
        reason: `You are currently exploring ${t.toolId.replace('tool-', '').toUpperCase()}. Practice using this tool on tasks connected to ${activeFocus} to elevate your familiarity to Practicing.`,
        relatedTask: `Practice task in ${t.primaryCategory}`,
        relatedSkill: t.primaryCategory,
        relevance: `Elevates your familiarity with ${t.toolId.replace('tool-', '').toUpperCase()}`,
        status: 'active',
        createdAt: 'Just now'
      });
    }
  });

  return recommendations;
};
