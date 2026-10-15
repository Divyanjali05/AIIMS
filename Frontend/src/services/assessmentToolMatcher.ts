import { AITool, TaskCategory, ToolFamiliarity, UserToolItem } from '../types';
import { LearnerState } from '../context/LearnerContext';

export interface AssessmentPromptMatch {
  toolId: string;
  toolName: string;
  provider: string;
  category: TaskCategory;
  pricing: string;
  matchScore: number; // e.g. 95%
  sourceChallengeId: number;
  sourceChallengeTitle: string;
  sourcePromptSnippet: string;
  reason: string;
  recommendedFamiliarity: ToolFamiliarity;
  isAutoAddCandidate: boolean;
}

export interface AssessmentToolInsights {
  hasAssessmentData: boolean;
  architecturePrompt: string;
  prototypePrompt: string;
  selectedToolIds: string[];
  autoAddTools: UserToolItem[];
  suggestedTools: AssessmentPromptMatch[];
}

/**
 * Extracts AI tool suggestions and auto-provisions based on the learner's raw assessment prompts
 * and responses (Challenge 2, 11, 12, 22, 24).
 */
export const getAssessmentToolInsights = (
  state: LearnerState,
  catalog: AITool[]
): AssessmentToolInsights => {
  const answers = state.assessment?.answers || {};
  const isCompleted = state.assessment?.status === 'completed';

  // Extract raw prompt text from Challenge 11 (Architecture) and Challenge 12 (Prototype)
  const rawArchPrompt = typeof answers[11] === 'string' && answers[11].trim()
    ? answers[11].trim()
    : 'Design software architecture with API schemas, authentication, and database models.';

  const rawProtoPrompt = typeof answers[12] === 'string' && answers[12].trim()
    ? answers[12].trim()
    : 'Build a full-stack working prototype with UI components and backend endpoints.';

  // Extract selected tool IDs from Challenge 2
  const rawQ2Answers = Array.isArray(answers[2]) ? answers[2] : [];

  const catalogMap = new Map<string, AITool>();
  catalog.forEach(t => catalogMap.set(t.id, t));

  const suggestedTools: AssessmentPromptMatch[] = [];
  const autoAddTools: UserToolItem[] = [];
  const addedToolIdSet = new Set<string>();

  const nowStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // 1. Process Explicit Tools selected in Challenge 2
  const q2ToolMappings: Record<string, { toolId: string; familiarity: ToolFamiliarity }> = {
    'q2_a': { toolId: 'tool-chatgpt', familiarity: 'proficient' },
    'q2_b': { toolId: 'tool-claude', familiarity: 'practicing' },
    'q2_c': { toolId: 'tool-gemini-pro', familiarity: 'practicing' },
    'q2_d': { toolId: 'tool-cursor', familiarity: 'practicing' },
    'q2_e': { toolId: 'tool-midjourney', familiarity: 'practicing' },
    'q2_f': { toolId: 'tool-ollama', familiarity: 'exploring' }
  };

  rawQ2Answers.forEach((ansId: string) => {
    const mapping = q2ToolMappings[ansId];
    if (mapping) {
      let toolObj = catalogMap.get(mapping.toolId);
      // Fallback for gemini
      if (!toolObj && mapping.toolId === 'tool-gemini-pro') {
        toolObj = catalogMap.get('tool-chatgpt');
      }
      if (toolObj && !addedToolIdSet.has(toolObj.id)) {
        addedToolIdSet.add(toolObj.id);
        autoAddTools.push({
          toolId: toolObj.id,
          addedAt: nowStr,
          familiarity: mapping.familiarity,
          primaryCategory: toolObj.category,
          userNotes: `Auto-added from Assessment: Selected in Challenge 2 (${toolObj.name})`,
          customTags: ['assessment-baseline', 'daily-driver']
        });

        suggestedTools.push({
          toolId: toolObj.id,
          toolName: toolObj.name,
          provider: toolObj.provider,
          category: toolObj.category,
          pricing: toolObj.pricing || 'Free tier available',
          matchScore: 98,
          sourceChallengeId: 2,
          sourceChallengeTitle: 'Challenge 2 — Daily AI Exposure',
          sourcePromptSnippet: `Selected ${toolObj.name} as a regular AI tool in your workflow`,
          reason: `Identified as one of your active tools in the AI Exposure baseline assessment.`,
          recommendedFamiliarity: mapping.familiarity,
          isAutoAddCandidate: true
        });
      }
    }
  });

  // 2. Analyze Challenge 12 Prompt (Building a Working Prototype / MVP)
  // Keywords indicating agentic coding, fullstack web, app prototyping
  const protoLower = rawProtoPrompt.toLowerCase();
  const hasCodingKeywords = /code|prototype|react|next|node|frontend|backend|api|database|app|mvp|ui|build|component/i.test(protoLower);

  const cursorTool = catalogMap.get('tool-cursor');
  if (cursorTool && !addedToolIdSet.has(cursorTool.id)) {
    addedToolIdSet.add(cursorTool.id);
    const snippet = rawProtoPrompt.length > 80 ? `${rawProtoPrompt.slice(0, 80)}...` : rawProtoPrompt;
    
    autoAddTools.push({
      toolId: cursorTool.id,
      addedAt: nowStr,
      familiarity: 'practicing',
      primaryCategory: cursorTool.category,
      userNotes: `Auto-added from Assessment: Matched Prototype Prompt (Challenge 12: "${snippet}")`,
      customTags: ['assessment-prompt', 'prototype-generator']
    });

    suggestedTools.push({
      toolId: cursorTool.id,
      toolName: cursorTool.name,
      provider: cursorTool.provider,
      category: cursorTool.category,
      pricing: cursorTool.pricing || 'Free tier available',
      matchScore: hasCodingKeywords ? 96 : 90,
      sourceChallengeId: 12,
      sourceChallengeTitle: 'Challenge 12 — MVP Prototype Lab',
      sourcePromptSnippet: `"${snippet}"`,
      reason: `Your prototype prompt directly required multi-file code generation and iterative feature building. Cursor IDE's Composer agent executes full-stack MVPs directly inside the codebase.`,
      recommendedFamiliarity: 'practicing',
      isAutoAddCandidate: true
    });
  }

  // 3. Analyze Challenge 11 Prompt (Designing Software Architecture)
  // Keywords indicating technical reasoning, long-context architecture, documents
  const archLower = rawArchPrompt.toLowerCase();
  const claudeTool = catalogMap.get('tool-claude');
  if (claudeTool && !addedToolIdSet.has(claudeTool.id)) {
    addedToolIdSet.add(claudeTool.id);
    const snippet = rawArchPrompt.length > 80 ? `${rawArchPrompt.slice(0, 80)}...` : rawArchPrompt;

    autoAddTools.push({
      toolId: claudeTool.id,
      addedAt: nowStr,
      familiarity: 'practicing',
      primaryCategory: claudeTool.category,
      userNotes: `Auto-added from Assessment: Matched Architecture Prompt (Challenge 11: "${snippet}")`,
      customTags: ['assessment-prompt', 'system-architect']
    });

    suggestedTools.push({
      toolId: claudeTool.id,
      toolName: claudeTool.name,
      provider: claudeTool.provider,
      category: claudeTool.category,
      pricing: claudeTool.pricing || 'Free tier available',
      matchScore: 94,
      sourceChallengeId: 11,
      sourceChallengeTitle: 'Challenge 11 — Software Architecture Lab',
      sourcePromptSnippet: `"${snippet}"`,
      reason: `Your architecture prompt required technical system design. Claude 3.5 Sonnet's 200k context window and technical reasoning excel at generating schemas, documentation, and Artifacts.`,
      recommendedFamiliarity: 'practicing',
      isAutoAddCandidate: true
    });
  }

  // 4. Research & Knowledge Synthesis suggestion (Perplexity / NotebookLM)
  const perplexityTool = catalogMap.get('tool-perplexity');
  if (perplexityTool && !addedToolIdSet.has(perplexityTool.id)) {
    const isResearchFocus = /research|search|compare|market|verify|data|competitor/i.test(archLower) ||
      (Array.isArray(answers[24]) && answers[24].includes('q24_c'));

    suggestedTools.push({
      toolId: perplexityTool.id,
      toolName: perplexityTool.name,
      provider: perplexityTool.provider,
      category: perplexityTool.category,
      pricing: perplexityTool.pricing || 'Free version available',
      matchScore: isResearchFocus ? 92 : 86,
      sourceChallengeId: 11,
      sourceChallengeTitle: 'Challenge 11 & 24 — Architecture & RAG Research',
      sourcePromptSnippet: `Grounded technical research & citation mapping`,
      reason: `Essential companion for researching live documentation, API changes, and benchmark citations while building your technical architecture.`,
      recommendedFamiliarity: 'exploring',
      isAutoAddCandidate: false
    });
  }

  // 5. Zero-Hallucination Document RAG (NotebookLM)
  const notebookTool = catalogMap.get('tool-notebooklm');
  if (notebookTool && !addedToolIdSet.has(notebookTool.id)) {
    suggestedTools.push({
      toolId: notebookTool.id,
      toolName: notebookTool.name,
      provider: notebookTool.provider,
      category: notebookTool.category,
      pricing: '100% Free by Google',
      matchScore: 89,
      sourceChallengeId: 10,
      sourceChallengeTitle: 'Challenge 10 — RAG & Document Intelligence',
      sourcePromptSnippet: `Grounded PDF study & Audio Overview generation`,
      reason: `Zero-hallucination research grounded strictly in your uploaded project requirements, PDFs, and technical specifications.`,
      recommendedFamiliarity: 'exploring',
      isAutoAddCandidate: false
    });
  }

  // Fallback: If no tools were added yet (e.g. fresh account with completed status), seed top 3 default tools
  if (autoAddTools.length === 0) {
    const defaultIds = ['tool-chatgpt', 'tool-cursor', 'tool-claude'];
    defaultIds.forEach((id) => {
      const tool = catalogMap.get(id);
      if (tool) {
        autoAddTools.push({
          toolId: tool.id,
          addedAt: nowStr,
          familiarity: id === 'tool-chatgpt' ? 'proficient' : 'practicing',
          primaryCategory: tool.category,
          userNotes: `Auto-added from Assessment: Core baseline AI toolkit matching your engineering profile`,
          customTags: ['assessment-baseline']
        });
      }
    });
  }

  return {
    hasAssessmentData: isCompleted || Object.keys(answers).length > 0,
    architecturePrompt: rawArchPrompt,
    prototypePrompt: rawProtoPrompt,
    selectedToolIds: rawQ2Answers,
    autoAddTools,
    suggestedTools
  };
};
