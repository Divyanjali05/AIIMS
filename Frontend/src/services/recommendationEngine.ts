import { LearnerState } from '../context/LearnerContext';
import { AITool, ToolRecommendation, TaskCategory } from '../types';

/**
 * Transparent Rule-Based Recommendation Engine for AI Wallet
 *
 * Rules:
 * 1. ALTERNATIVE_TOOL: If user has a tool in a category (e.g., ChatGPT in Reasoning) and frequently performs relevant tasks, suggest an alternative workflow (e.g., Claude for long-form reasoning/artifacts).
 * 2. SKILL_GAP: If user's assessment/analysis indicates a growth area (e.g. Agentic Workflows), suggest a specialized tool (e.g. Cursor IDE).
 * 3. TASK_BASED: If user's active Focus track or Clarity topic involves specific tasks (e.g. RAG Triad Evaluation), suggest a grounded tool (e.g. NotebookLM).
 * 4. LEARNING_RECOMMENDATION: If user has minimal coverage in key productivity areas (e.g. Data Analysis), suggest an exploratory tool (e.g. Julius AI).
 * 5. RADAR_DISCOVERY: If user investigated or follows AI Radar market shifts, suggest relevant emerging tools (e.g. Perplexity AI or Make.com).
 *
 * STRICT UX PRINCIPLE:
 * Never say "Tool X is better than Tool Y".
 * Always use neutral, task-focused phrasing explaining WHY the tool is worth exploring.
 */

export const generateWalletRecommendations = (
  state: LearnerState,
  catalog: AITool[]
): ToolRecommendation[] => {
  const userTools = state.aiWallet?.userTools || [];
  const dismissedIds = new Set(state.aiWallet?.dismissedRecommendations || []);
  const currentToolIds = new Set(userTools.map((t) => t.toolId));

  const recommendations: ToolRecommendation[] = [];

  // 1. ALTERNATIVE_TOOL: If user has ChatGPT & not Claude
  if (currentToolIds.has('tool-chatgpt') && !currentToolIds.has('tool-claude')) {
    const id = 'rec-claude-alt';
    if (!dismissedIds.has(id)) {
      recommendations.push({
        id,
        toolId: 'tool-claude',
        type: 'ALTERNATIVE_TOOL',
        reason: "You frequently work with long-form documents and complex reasoning tasks. You currently use ChatGPT for similar workflows, so exploring another workflow optimized for extended 200k context windows and system instruction fidelity may be useful.",
        relatedTask: 'Long-form Document & System Prompt Reasoning',
        relatedSkill: 'Prompt Engineering & Technical Writing',
        relevance: 'Complements your current reasoning toolkit',
        status: 'active',
        createdAt: 'Just now'
      });
    }
  }

  // 2. SKILL_GAP: Agentic Workflows growth area -> Cursor IDE
  if (!currentToolIds.has('tool-cursor')) {
    const id = 'rec-cursor-gap';
    if (!dismissedIds.has(id)) {
      recommendations.push({
        id,
        toolId: 'tool-cursor',
        type: 'SKILL_GAP',
        reason: "Based on your AI Profile growth area in Agentic Workflows, exploring an AI-first editor with repository-wide indexers and composer agent loops can help accelerate your workflow design targets.",
        relatedTask: 'Agentic Coding & Multi-file Editing',
        relatedSkill: 'Agentic Workflows',
        relevance: 'Directly addresses your primary growth area',
        status: 'active',
        createdAt: 'Just now'
      });
    }
  }

  // 3. TASK_BASED: RAG / Grounded Research -> NotebookLM
  if (!currentToolIds.has('tool-notebooklm')) {
    const id = 'rec-notebooklm-task';
    if (!dismissedIds.has(id)) {
      recommendations.push({
        id,
        toolId: 'tool-notebooklm',
        type: 'TASK_BASED',
        reason: "When studying dense documentation or internal PDFs, exploring a grounded source-locked assistant can help eliminate hallucinations and generate clear audio overviews.",
        relatedTask: 'Source-Grounded Document Analysis',
        relatedSkill: 'RAG Triad & Context Precision',
        relevance: 'Ideal for grounded study & paper synthesis',
        status: 'active',
        createdAt: 'Just now'
      });
    }
  }

  // 4. LEARNING_RECOMMENDATION: Data Analysis -> Julius AI
  if (!currentToolIds.has('tool-julius')) {
    const id = 'rec-julius-learning';
    if (!dismissedIds.has(id)) {
      recommendations.push({
        id,
        toolId: 'tool-julius',
        type: 'LEARNING_RECOMMENDATION',
        reason: "Your current toolkit has limited coverage in sandboxed Python data execution. Exploring a data-focused AI tool can help automate chart rendering and statistical modeling.",
        relatedTask: 'Exploratory Data & Statistical Analysis',
        relatedSkill: 'Tool Integration & Data Analysis',
        relevance: 'Adds statistical Python execution capability',
        status: 'active',
        createdAt: 'Just now'
      });
    }
  }

  // 5. RADAR_DISCOVERY: Real-Time Web Research -> Perplexity AI
  if (!currentToolIds.has('tool-perplexity')) {
    const id = 'rec-perplexity-radar';
    if (!dismissedIds.has(id)) {
      recommendations.push({
        id,
        toolId: 'tool-perplexity',
        type: 'RADAR_DISCOVERY',
        reason: "Recent AI Radar signals highlight rapid evolution in live web citation search. Exploring real-time retrieval engines can provide verifiable source URLs for market analysis.",
        relatedTask: 'Live Web Citation & Market Research',
        relatedSkill: 'Generative AI Tech & Citation Verification',
        relevance: 'Connected to AI Radar opportunity signals',
        status: 'active',
        createdAt: 'Just now'
      });
    }
  }

  // 6. TASK_BASED: Presentation Deck Generation -> Gamma App
  if (!currentToolIds.has('tool-gamma')) {
    const id = 'rec-gamma-task';
    if (!dismissedIds.has(id)) {
      recommendations.push({
        id,
        toolId: 'tool-gamma',
        type: 'TASK_BASED',
        reason: "If you regularly communicate AI project milestones to mentors or executive stakeholders, exploring automated slide deck generators can streamline your presentations.",
        relatedTask: 'AI Presentation & Pitch Deck Design',
        relatedSkill: 'Strategic Vision & Communication',
        relevance: 'Saves time on visual layout creation',
        status: 'active',
        createdAt: 'Just now'
      });
    }
  }

  return recommendations;
};
