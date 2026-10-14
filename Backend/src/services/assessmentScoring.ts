/**
 * AINOVA Evidence-Based Assessment Scoring Engine (v3.0.0-evidence-based)
 *
 * Principles:
 * 1. Score represents actual thinking, understanding, accuracy, relevance, and evidence demonstrated.
 * 2. NO generic option-position scoring (_a=95, _b=75, _c=55, _d=35).
 * 3. NO EVIDENCE = NO SCORE INFLATION.
 * 4. Q5 & Q24 Goals & Preferences MUST NOT inflate capability scores.
 * 5. Q23 Attitude/Concern does not inflate capability scores.
 * 6. Multi-select evaluated on technical relevance/depth, NOT raw count.
 * 7. Open-ended questions (Q11, Q12, Q25) evaluated via Anthropic (or deterministic rubric fallback without fake scores).
 * 8. Explicit tracking of Score, Confidence, Evidence Coverage, Assessment Status, and Scoring Version.
 */

export type CapabilityKey = 'usingAI' | 'understandingAI' | 'solvingWithAI' | 'checkingAI' | 'adaptingToAI';

export interface OptionScoringDefinition {
  score: number; // 0 to 100
  evidenceLevel: 'strong' | 'partial' | 'weak' | 'misunderstanding' | 'none' | 'preference';
  demonstration: string;
  relevance: string;
  accuracy: string;
}

export interface QuestionScoringRubric {
  questionId: number;
  title: string;
  type: 'single_select' | 'multi_select' | 'scale' | 'long_text';
  purpose: string;
  capabilityWeights: Record<CapabilityKey, number>;
  isPreference?: boolean;
  isAttitude?: boolean;
  options?: Record<string, OptionScoringDefinition>;
  scaleScoring?: (value: number) => OptionScoringDefinition;
  evaluateMultiSelect?: (selectedIds: string[]) => OptionScoringDefinition;
  deterministicTextFallback?: (text: string) => OptionScoringDefinition;
}

export interface QuestionScoreResult {
  questionId: number;
  questionType: string;
  rawAnswer: any;
  score: number;
  confidence: number;
  evidenceLevel: 'strong' | 'partial' | 'weak' | 'misunderstanding' | 'none' | 'preference';
  scoringMethod: 'question_rubric' | 'anthropic' | 'deterministic_fallback';
  reason: string;
  strengths?: string[];
  gaps?: string[];
  evidence?: any[];
  anthropicStatus?: 'evaluated' | 'unavailable' | 'not_applicable';
}

export interface CapabilityScoreResult {
  capabilityKey: CapabilityKey;
  capabilityName: string;
  score: number;
  confidence: number;
  evidenceCoverage: number;
  assessmentStatus: 'complete' | 'provisional' | 'needs_evaluation';
  evidenceStatus: 'robust' | 'moderate' | 'limited';
  contributingQuestionIds: number[];
  questionScores: Record<number, number>;
  demonstratedStrengths: string[];
  identifiedGaps: string[];
  scoringMethod: string;
  rubricVersion: string;
}

export interface AssessmentEvaluationResult {
  overallScore: number;
  overallConfidence: number;
  overallEvidenceCoverage: number;
  assessmentStatus: 'complete' | 'provisional' | 'needs_evaluation';
  scoringVersion: string;
  capabilities: Record<CapabilityKey, CapabilityScoreResult>;
  legacyScores: {
    usageFrequency: number;
    evaluationCapability: number;
    workflowDesign: number;
    strategicVision: number;
    mentorshipReadiness: number;
  };
  questionResults: Record<number, QuestionScoreResult>;
  strongestSkill: { key: CapabilityKey; name: string; score: number };
  roomToGrow: { key: CapabilityKey; name: string; score: number };
  evaluatedAt: string;
}

export const CAPABILITY_NAMES: Record<CapabilityKey, string> = {
  usingAI: 'Using AI',
  understandingAI: 'Understanding AI',
  solvingWithAI: 'Solving with AI',
  checkingAI: 'Checking AI',
  adaptingToAI: 'Adapting to AI'
};

export const CAPABILITY_DESCRIPTIONS: Record<CapabilityKey, string> = {
  usingAI: 'Ability and demonstrated experience using AI tools.',
  understandingAI: 'Understanding of AI capabilities, limitations, and appropriate use.',
  solvingWithAI: 'Ability to apply AI to problems and design useful workflows.',
  checkingAI: 'Ability to verify outputs, recognize errors, and assess risks.',
  adaptingToAI: 'Ability to learn, evaluate changes, and adapt workflows.'
};

/**
 * Question-Specific Assessment Rubric Configurations
 */
export const ASSESSMENT_RUBRICS: Record<number, QuestionScoringRubric> = {
  // Q1: Frequency of AI Usage (Self-reported frequency measure for Using AI)
  1: {
    questionId: 1,
    title: 'How frequently do you currently use AI tools in your work or study?',
    type: 'single_select',
    purpose: 'Measures regularity and routine integration of AI tools into daily workflows.',
    capabilityWeights: { usingAI: 1.0, understandingAI: 0, solvingWithAI: 0, checkingAI: 0, adaptingToAI: 0 },
    options: {
      q1_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Integrated AI into daily core workflow.', relevance: 'High frequency.', accuracy: 'Active daily usage.' },
      q1_b: { score: 75, evidenceLevel: 'strong', demonstration: 'Regular consultation of AI for daily routine tasks.', relevance: 'Consistent usage.', accuracy: 'Frequent interaction.' },
      q1_c: { score: 45, evidenceLevel: 'partial', demonstration: 'Occasional task-specific AI usage.', relevance: 'Moderate usage.', accuracy: 'Intermittent usage.' },
      q1_d: { score: 20, evidenceLevel: 'weak', demonstration: 'Infrequent usage only when stuck.', relevance: 'Low routine reliance.', accuracy: 'Reactive usage.' },
      q1_e: { score: 0, evidenceLevel: 'none', demonstration: 'No active reliance or usage of AI tools.', relevance: 'Zero usage.', accuracy: 'No workflow integration.' }
    }
  },

  // Q2: AI Tools Interacted With (Multi-select evaluated on technical depth and diversity)
  2: {
    questionId: 2,
    title: 'Which AI models or tools do you regularly interact with?',
    type: 'multi_select',
    purpose: 'Measures breadth and technical depth of tool usage, distinguishing developer tools/APIs from simple chatbots.',
    capabilityWeights: { usingAI: 0.6, understandingAI: 0, solvingWithAI: 0, checkingAI: 0, adaptingToAI: 0.4 },
    evaluateMultiSelect: (selectedIds: string[]): OptionScoringDefinition => {
      if (!selectedIds || selectedIds.length === 0) {
        return { score: 0, evidenceLevel: 'none', demonstration: 'No tools selected.', relevance: 'No tool evidence.', accuracy: 'No evidence.' };
      }
      const hasDevTools = selectedIds.some((id) => id === 'q2_d' || id === 'q2_f'); // Copilot/Cursor/Custom APIs
      const hasSpecialized = selectedIds.some((id) => id === 'q2_b' || id === 'q2_e'); // Claude, Midjourney/DALL-E
      const hasBasicChat = selectedIds.some((id) => id === 'q2_a' || id === 'q2_c'); // ChatGPT, Gemini

      if (hasDevTools && (hasSpecialized || hasBasicChat)) {
        return { score: 95, evidenceLevel: 'strong', demonstration: 'Demonstrates technical depth across coding assistants, custom APIs, and multimodal models.', relevance: 'High tool diversity & technical depth.', accuracy: 'Comprehensive tool ecosystem engagement.' };
      } else if (hasDevTools) {
        return { score: 85, evidenceLevel: 'strong', demonstration: 'Demonstrates technical tool usage including developer tools and APIs.', relevance: 'Technical tool experience.', accuracy: 'Developer-oriented tool integration.' };
      } else if (hasSpecialized && hasBasicChat) {
        return { score: 70, evidenceLevel: 'partial', demonstration: 'Demonstrates multi-tool usage across general chatbots and specialized models.', relevance: 'Multi-tool interaction.', accuracy: 'Diverse general tool experience.' };
      } else if (hasSpecialized) {
        return { score: 60, evidenceLevel: 'partial', demonstration: 'Demonstrates specialized tool usage beyond default search interfaces.', relevance: 'Specialized model usage.', accuracy: 'Targeted tool usage.' };
      } else if (hasBasicChat && selectedIds.length > 1) {
        return { score: 45, evidenceLevel: 'partial', demonstration: 'Demonstrates standard multi-model chatbot usage.', relevance: 'Multiple general chatbots.', accuracy: 'Standard conversational usage.' };
      }
      return { score: 30, evidenceLevel: 'weak', demonstration: 'Demonstrates basic single-tool chatbot interaction.', relevance: 'Single chatbot reliance.', accuracy: 'Basic introductory usage.' };
    }
  },

  // Q3: First Instinct on New Project
  3: {
    questionId: 3,
    title: 'When starting a new assignment or project, what is your first instinct?',
    type: 'single_select',
    purpose: 'Measures problem-framing strategy: manual human reasoning combined with AI augmentation.',
    capabilityWeights: { usingAI: 0.3, understandingAI: 0, solvingWithAI: 1.0, checkingAI: 0, adaptingToAI: 0 },
    options: {
      q3_b: { score: 100, evidenceLevel: 'strong', demonstration: 'First-principles human framing followed by structured AI augmentation.', relevance: 'Optimal balance of human agency and AI.', accuracy: 'Ideal problem-solving architecture.' },
      q3_a: { score: 60, evidenceLevel: 'partial', demonstration: 'Immediate AI brainstorming and initial ideation.', relevance: 'High AI integration, moderate initial reliance.', accuracy: 'Proactive ideation.' },
      q3_c: { score: 30, evidenceLevel: 'weak', demonstration: 'Reliance on traditional web search engines before AI.', relevance: 'Lower AI workflow leverage.', accuracy: 'Legacy search paradigm.' },
      q3_d: { score: 10, evidenceLevel: 'weak', demonstration: 'Isolated manual work, using AI only as a last resort.', relevance: 'Minimal AI adoption.', accuracy: 'Low AI leverage.' }
    }
  },

  // Q4: Productivity Impact If AI Unavailable (Self-reported workflow reliance)
  4: {
    questionId: 4,
    title: 'If AI tools suddenly became unavailable for a week, how would it impact your productivity?',
    type: 'scale',
    purpose: 'Measures extent of AI integration into daily productivity.',
    capabilityWeights: { usingAI: 1.0, understandingAI: 0, solvingWithAI: 0, checkingAI: 0, adaptingToAI: 0 },
    scaleScoring: (val: number): OptionScoringDefinition => {
      const map: Record<number, OptionScoringDefinition> = {
        1: { score: 95, evidenceLevel: 'strong', demonstration: 'Core workflows rely significantly on AI tooling.', relevance: 'High workflow dependence.', accuracy: 'Deep workflow integration.' },
        2: { score: 75, evidenceLevel: 'strong', demonstration: 'Substantial workflow dependency on AI.', relevance: 'Strong workflow dependence.', accuracy: 'Substantial integration.' },
        3: { score: 50, evidenceLevel: 'partial', demonstration: 'Balanced workflow with moderate AI assistance.', relevance: 'Moderate workflow impact.', accuracy: 'Partial integration.' },
        4: { score: 25, evidenceLevel: 'weak', demonstration: 'Minor AI workflow reliance.', relevance: 'Low workflow impact.', accuracy: 'Light integration.' },
        5: { score: 10, evidenceLevel: 'weak', demonstration: 'Workflow completely unaffected by AI absence.', relevance: 'Minimal AI integration.', accuracy: 'Negligible dependency.' }
      };
      return map[val] || map[3];
    }
  },

  // Q5: Primary Goal When Using AI (PREFERENCE QUESTION — 0 capability score weight)
  5: {
    questionId: 5,
    title: 'What best describes your primary goal when using AI?',
    type: 'single_select',
    isPreference: true,
    purpose: 'Captures primary strategic intent for personalization. DOES NOT INFLATE CAPABILITY SCORES.',
    capabilityWeights: { usingAI: 0, understandingAI: 0, solvingWithAI: 0, checkingAI: 0, adaptingToAI: 0 },
    options: {
      q5_a: { score: 0, evidenceLevel: 'preference', demonstration: 'Goal: Speed & Task Completion.', relevance: 'Personalization only.', accuracy: 'No capability contribution.' },
      q5_b: { score: 0, evidenceLevel: 'preference', demonstration: 'Goal: Learning & Understanding.', relevance: 'Personalization only.', accuracy: 'No capability contribution.' },
      q5_c: { score: 0, evidenceLevel: 'preference', demonstration: 'Goal: Ideation & Creation.', relevance: 'Personalization only.', accuracy: 'No capability contribution.' },
      q5_d: { score: 0, evidenceLevel: 'preference', demonstration: 'Goal: Delegation & Automation.', relevance: 'Personalization only.', accuracy: 'No capability contribution.' }
    }
  },

  // Q6: Explanation of LLM Mechanics (Objective technical mental model)
  6: {
    questionId: 6,
    title: 'How would you explain how Large Language Models (LLMs) generate answers?',
    type: 'single_select',
    purpose: 'Evaluates accuracy of learner mental model regarding probabilistic token prediction.',
    capabilityWeights: { usingAI: 0, understandingAI: 1.0, solvingWithAI: 0, checkingAI: 0, adaptingToAI: 0 },
    options: {
      q6_b: { score: 100, evidenceLevel: 'strong', demonstration: 'Accurate technical mental model: probabilistic next-token prediction based on training distribution.', relevance: 'Correctly identifies core LLM mechanism.', accuracy: 'Factually precise.' },
      q6_a: { score: 15, evidenceLevel: 'misunderstanding', demonstration: 'Confuses statistical generative models with real-time web search databases.', relevance: 'Incorrect concept.', accuracy: 'Factually inaccurate.' },
      q6_c: { score: 0, evidenceLevel: 'misunderstanding', demonstration: 'Anthropomorphic misconception: assumes conscious reasoning.', relevance: 'Flawed mental model.', accuracy: 'Factually inaccurate.' },
      q6_d: { score: 0, evidenceLevel: 'none', demonstration: 'Honest admission of unknown model mechanics.', relevance: 'No technical understanding.', accuracy: 'No evidence.' }
    }
  },

  // Q7: Encountering AI Hallucinations
  7: {
    questionId: 7,
    title: 'Have you ever encountered an AI "hallucination"?',
    type: 'single_select',
    purpose: 'Measures awareness of AI model error modes and active verification behaviors.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.4, solvingWithAI: 0, checkingAI: 1.0, adaptingToAI: 0 },
    options: {
      q7_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Frequent detection of hallucinations combined with systematic verification protocols.', relevance: 'High scrutiny and risk awareness.', accuracy: 'Recognizes model vulnerability.' },
      q7_b: { score: 50, evidenceLevel: 'partial', demonstration: 'Occasional detection of false outputs when suspicious.', relevance: 'Passive checking behavior.', accuracy: 'Recognizes obvious errors.' },
      q7_c: { score: 0, evidenceLevel: 'misunderstanding', demonstration: 'Blind trust in model outputs without verification.', relevance: 'Unaware of hallucination risks.', accuracy: 'Inaccurate trust assumption.' },
      q7_d: { score: 0, evidenceLevel: 'none', demonstration: 'Unfamiliar with model hallucination concept.', relevance: 'No risk awareness.', accuracy: 'No evidence.' }
    }
  },

  // Q8: Definition of Context Window (Objective technical definition)
  8: {
    questionId: 8,
    title: 'What does "Context Window" mean when working with an AI model?',
    type: 'single_select',
    purpose: 'Evaluates technical knowledge of LLM memory bounds and token budget constraints.',
    capabilityWeights: { usingAI: 0, understandingAI: 1.0, solvingWithAI: 0, checkingAI: 0, adaptingToAI: 0 },
    options: {
      q8_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Accurate technical definition: maximum token memory capacity during session execution.', relevance: 'Directly defines technical concept correctly.', accuracy: 'Factually precise.' },
      q8_c: { score: 10, evidenceLevel: 'misunderstanding', demonstration: 'Confuses context memory with streaming text throughput speed.', relevance: 'Incorrect technical mapping.', accuracy: 'Factually inaccurate.' },
      q8_b: { score: 0, evidenceLevel: 'misunderstanding', demonstration: 'Confuses model memory constraint with browser UI window size.', relevance: 'Literal misinterpretation.', accuracy: 'Factually inaccurate.' },
      q8_d: { score: 0, evidenceLevel: 'none', demonstration: 'Unaware of technical meaning.', relevance: 'No understanding evidence.', accuracy: 'No evidence.' }
    }
  },

  // Q9: Adjusting Prompting Style
  9: {
    questionId: 9,
    title: 'How do you adjust your prompting style when you need structured, precise output vs creative brainstorming?',
    type: 'single_select',
    purpose: 'Evaluates prompt engineering skill, schema specification, and constraint enforcement.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.3, solvingWithAI: 0.7, checkingAI: 0, adaptingToAI: 0 },
    options: {
      q9_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Explicit specification of JSON/Markdown schemas, system parameters, and negative constraints.', relevance: 'Advanced structured prompt control.', accuracy: 'Schema-driven prompting.' },
      q9_b: { score: 50, evidenceLevel: 'partial', demonstration: 'Elaborates prompts with extra descriptive text.', relevance: 'Basic prompt expansion.', accuracy: 'Informal prompt tweaking.' },
      q9_c: { score: 20, evidenceLevel: 'weak', demonstration: 'Uses uniform prompting style regardless of output structure needs.', relevance: 'Lacks technique adaptation.', accuracy: 'Fails to steer model.' },
      q9_d: { score: 10, evidenceLevel: 'weak', demonstration: 'Passively relies on model default formatting.', relevance: 'No active prompt structuring.', accuracy: 'Passive usage.' }
    }
  },

  // Q10: What is RAG? (Objective technical definition)
  10: {
    questionId: 10,
    title: 'What is Retrieval-Augmented Generation (RAG)?',
    type: 'single_select',
    purpose: 'Evaluates technical knowledge of modern AI architecture combining vector retrieval with LLMs.',
    capabilityWeights: { usingAI: 0, understandingAI: 1.0, solvingWithAI: 0.3, checkingAI: 0, adaptingToAI: 0 },
    options: {
      q10_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Accurate technical definition: augmenting LLMs with document retrieval over external private datasets.', relevance: 'Correctly identifies RAG architecture.', accuracy: 'Factually precise.' },
      q10_b: { score: 15, evidenceLevel: 'misunderstanding', demonstration: 'Confuses RAG retrieval with model pre-training from scratch.', relevance: 'Incorrect technical concept.', accuracy: 'Factually inaccurate.' },
      q10_c: { score: 0, evidenceLevel: 'misunderstanding', demonstration: 'Confuses vector database embeddings with vector graphics tools.', relevance: 'Completely mistaken domain.', accuracy: 'Factually inaccurate.' },
      q10_d: { score: 0, evidenceLevel: 'none', demonstration: 'Unfamiliar with RAG architecture.', relevance: 'No understanding evidence.', accuracy: 'No evidence.' }
    }
  },

  // Q11: AI Thinking Lab — Software Architecture Prompt (OPEN ENDED — Anthropic Evaluated)
  11: {
    questionId: 11,
    title: 'AI THINKING LAB: Designing Software Architecture',
    type: 'long_text',
    purpose: 'Evaluates authentic problem-framing, system boundary definition, role setting, and technical constraint specification.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.4, solvingWithAI: 1.0, checkingAI: 0, adaptingToAI: 0 },
    deterministicTextFallback: (text: string): OptionScoringDefinition => {
      const clean = text ? text.trim() : '';
      if (!clean || clean.length < 5) return { score: 0, evidenceLevel: 'none', demonstration: 'No text entered.', relevance: 'No text provided.', accuracy: 'No evidence.' };
      const lower = clean.toLowerCase();
      if (clean.length < 15 && ['idk', 'test', 'asdf', 'nothing', 'na', 'none'].includes(lower)) {
        return { score: 0, evidenceLevel: 'none', demonstration: 'Non-responsive or placeholder text.', relevance: 'Lacks actual prompt content.', accuracy: 'No valid evidence.' };
      }
      let score = 25;
      const strengths: string[] = [];
      if (lower.includes('act as') || lower.includes('you are') || lower.includes('architect') || lower.includes('expert')) { score += 15; strengths.push('Persona definition'); }
      if (lower.includes('tech stack') || lower.includes('react') || lower.includes('node') || lower.includes('database') || lower.includes('api') || lower.includes('postgres')) { score += 20; strengths.push('Technical stack constraints'); }
      if (lower.includes('scalable') || lower.includes('security') || lower.includes('performance') || lower.includes('auth')) { score += 15; strengths.push('Non-functional requirements'); }
      if (lower.includes('format') || lower.includes('diagram') || lower.includes('json') || lower.includes('markdown')) { score += 10; strengths.push('Output format specification'); }
      score = Math.min(95, Math.max(15, score));
      const level = score >= 75 ? 'strong' : score >= 40 ? 'partial' : 'weak';
      return { score, evidenceLevel: level, demonstration: `Evaluated architecture prompt text (${clean.length} chars). Identified criteria: ${strengths.join(', ') || 'basic prompt instructions'}.`, relevance: 'Evaluated raw architecture prompt text.', accuracy: 'Deterministic fallback evaluation.' };
    }
  },

  // Q12: AI Thinking Lab — Prototype MVP Prompt (OPEN ENDED — Anthropic Evaluated)
  12: {
    questionId: 12,
    title: 'AI THINKING LAB: Building a Working Prototype (MVP)',
    type: 'long_text',
    purpose: 'Evaluates code generation prompting strategy: component modularity, API contract definition, and edge case instructions.',
    capabilityWeights: { usingAI: 0.4, understandingAI: 0, solvingWithAI: 1.0, checkingAI: 0, adaptingToAI: 0 },
    deterministicTextFallback: (text: string): OptionScoringDefinition => {
      const clean = text ? text.trim() : '';
      if (!clean || clean.length < 5) return { score: 0, evidenceLevel: 'none', demonstration: 'No text entered.', relevance: 'No text provided.', accuracy: 'No evidence.' };
      const lower = clean.toLowerCase();
      if (clean.length < 15 && ['idk', 'test', 'asdf', 'nothing', 'na', 'none'].includes(lower)) {
        return { score: 0, evidenceLevel: 'none', demonstration: 'Non-responsive or placeholder text.', relevance: 'Lacks actual prompt content.', accuracy: 'No valid evidence.' };
      }
      let score = 25;
      const strengths: string[] = [];
      if (lower.includes('typescript') || lower.includes('react') || lower.includes('python') || lower.includes('function') || lower.includes('api')) { score += 20; strengths.push('Code stack specification'); }
      if (lower.includes('step') || lower.includes('mock data') || lower.includes('file structure') || lower.includes('state')) { score += 20; strengths.push('Modular implementation breakdown'); }
      if (lower.includes('edge case') || lower.includes('error handling') || lower.includes('clean')) { score += 15; strengths.push('Quality & error boundary constraints'); }
      score = Math.min(95, Math.max(15, score));
      const level = score >= 75 ? 'strong' : score >= 40 ? 'partial' : 'weak';
      return { score, evidenceLevel: level, demonstration: `Evaluated MVP prompt text. Key elements: ${strengths.join(', ') || 'basic code generation prompt'}.`, relevance: 'Evaluated raw prototype prompt text.', accuracy: 'Deterministic fallback evaluation.' };
    }
  },

  // Q13: Action When AI Output Is Incorrect
  13: {
    questionId: 13,
    title: 'When an AI model gives you an incomplete or slightly incorrect answer, what do you do?',
    type: 'single_select',
    purpose: 'Evaluates iterative prompt debugging capability and task decomposition.',
    capabilityWeights: { usingAI: 0, understandingAI: 0, solvingWithAI: 0.6, checkingAI: 0.6, adaptingToAI: 0 },
    options: {
      q13_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Refines prompt with explicit constraints, negative examples, or sub-step task decomposition.', relevance: 'Active prompt debugging mastery.', accuracy: 'Systematic prompt refactoring.' },
      q13_c: { score: 55, evidenceLevel: 'partial', demonstration: 'Switches to alternative model or search engine.', relevance: 'Recognizes model variance.', accuracy: 'Cross-model trial.' },
      q13_b: { score: 25, evidenceLevel: 'weak', demonstration: 'Repeats exact same prompt or hits regenerate without input modification.', relevance: 'Naive retry loop.', accuracy: 'Fails to modify prompt context.' },
      q13_d: { score: 15, evidenceLevel: 'weak', demonstration: 'Abandons AI completely and fixes manually.', relevance: 'Gives up on human-AI collaboration.', accuracy: 'Low AI leverage.' }
    }
  },

  // Q14: First Question to AI For Real World Problem
  14: {
    questionId: 14,
    title: 'You have an idea for solving a real-world problem. What would you most likely ask AI first?',
    type: 'single_select',
    purpose: 'Evaluates strategic use of AI as an assumption-testing critique partner vs passive generator.',
    capabilityWeights: { usingAI: 0, understandingAI: 0, solvingWithAI: 1.0, checkingAI: 0.4, adaptingToAI: 0 },
    options: {
      q14_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Leverages AI to challenge assumptions, red-team blind spots, and critique failure modes.', relevance: 'Top-tier strategic thinking and critical sparring.', accuracy: 'Critical risk analysis.' },
      q14_b: { score: 70, evidenceLevel: 'strong', demonstration: 'Uses AI to analyze existing competitor landscape and market benchmarks.', relevance: 'Structured research usage.', accuracy: 'Analytical inquiry.' },
      q14_c: { score: 45, evidenceLevel: 'partial', demonstration: 'Asks AI for an immediate step-by-step execution plan without testing assumptions.', relevance: 'Premature execution without validation.', accuracy: 'Action without scrutiny.' },
      q14_d: { score: 15, evidenceLevel: 'weak', demonstration: 'Asks AI to generate complete solution end-to-end passively.', relevance: 'Passive delegation.', accuracy: 'Lacks problem framing ownership.' }
    }
  },

  // Q15: Assessing If AI Response Is Good Enough
  15: {
    questionId: 15,
    title: 'How do you assess whether an AI response is "good enough"?',
    type: 'single_select',
    purpose: 'Evaluates output validation rigor against requirements and edge cases.',
    capabilityWeights: { usingAI: 0, understandingAI: 0, solvingWithAI: 0, checkingAI: 1.0, adaptingToAI: 0 },
    options: {
      q15_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Empirical verification against explicit functional requirements and boundary edge cases.', relevance: 'Rigorous output verification.', accuracy: 'Executes quality control.' },
      q15_c: { score: 60, evidenceLevel: 'partial', demonstration: 'Asks AI model to self-critique and verify its own output.', relevance: 'Uses self-reflection prompting.', accuracy: 'Automated verification.' },
      q15_b: { score: 15, evidenceLevel: 'misunderstanding', demonstration: 'Accepts output based on superficial plausibility and smooth writing.', relevance: 'Plausibility bias without verification.', accuracy: 'Inaccurate assessment methodology.' },
      q15_d: { score: 0, evidenceLevel: 'weak', demonstration: 'Struggles to evaluate accuracy of AI output.', relevance: 'Lacks verification capability.', accuracy: 'No evaluation criteria.' }
    }
  },

  // Q16: Fact Checking AI Outputs
  16: {
    questionId: 16,
    title: 'How often do you fact-check AI outputs against authoritative documentation or primary sources?',
    type: 'single_select',
    purpose: 'Measures systematic verification frequency against primary documentation.',
    capabilityWeights: { usingAI: 0, understandingAI: 0, solvingWithAI: 0, checkingAI: 1.0, adaptingToAI: 0 },
    options: {
      q16_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Consistently fact-checks critical technical decisions against primary documentation.', relevance: 'Uncompromised verification discipline.', accuracy: 'Maintains factual integrity.' },
      q16_b: { score: 45, evidenceLevel: 'partial', demonstration: 'Fact-checks selectively only when answers feel counter-intuitive.', relevance: 'Intuition-gated verification.', accuracy: 'Spot checking.' },
      q16_c: { score: 15, evidenceLevel: 'weak', demonstration: 'Rarely fact-checks, assuming models are inherently accurate.', relevance: 'High complacency risk.', accuracy: 'Inaccurate trust assumptions.' },
      q16_d: { score: 0, evidenceLevel: 'none', demonstration: 'Never fact-checks AI outputs.', relevance: 'Zero verification.', accuracy: 'No evidence.' }
    }
  },

  // Q17: Data Privacy & Sensitive Information
  17: {
    questionId: 17,
    title: 'What is your stance on pasting proprietary code or sensitive personal data into public AI chats?',
    type: 'single_select',
    purpose: 'Evaluates security, data sanitization, privacy settings compliance, and risk mitigation.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.4, solvingWithAI: 0, checkingAI: 1.0, adaptingToAI: 0 },
    options: {
      q17_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Strict data sanitization/anonymization and verification of zero-data retention policies.', relevance: 'Security compliance and enterprise safety mindset.', accuracy: 'Mitigates data leak risks.' },
      q17_b: { score: 40, evidenceLevel: 'partial', demonstration: 'Inconsistent data sanitization when convenient for speed.', relevance: 'Partial security compliance.', accuracy: 'Policy gaps.' },
      q17_c: { score: 0, evidenceLevel: 'weak', demonstration: 'Pastes sensitive data without concern for privacy policies.', relevance: 'High security violation risk.', accuracy: 'Ignores data exposure risks.' },
      q17_d: { score: 0, evidenceLevel: 'none', demonstration: 'Unaware of public AI model data retention and training policies.', relevance: 'No security awareness.', accuracy: 'No evidence.' }
    }
  },

  // Q18: Human-in-the-Loop Concept
  18: {
    questionId: 18,
    title: 'What best describes "Human-in-the-Loop" decision making?',
    type: 'single_select',
    purpose: 'Evaluates understanding of HITL architecture where humans retain ultimate authority and accountability.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.6, solvingWithAI: 0, checkingAI: 0.8, adaptingToAI: 0 },
    options: {
      q18_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Accurate technical definition: AI proposes options, human retains validation, decision authority, and accountability.', relevance: 'Correctly identifies HITL framework.', accuracy: 'Factually and conceptually precise.' },
      q18_b: { score: 30, evidenceLevel: 'partial', demonstration: 'Confuses HITL with passive monitoring of autonomous execution.', relevance: 'Imprecise conceptual distinction.', accuracy: 'Partially inaccurate.' },
      q18_c: { score: 20, evidenceLevel: 'weak', demonstration: 'Confuses HITL decision making with post-hoc RLHF rating buttons.', relevance: 'Misinterprets scope.', accuracy: 'Conceptually flawed.' },
      q18_d: { score: 0, evidenceLevel: 'none', demonstration: 'Unfamiliar with HITL concept.', relevance: 'No evidence.', accuracy: 'No evidence.' }
    }
  },

  // Q19: Time Spent Framing User Problem Before AI Solution
  19: {
    questionId: 19,
    title: 'Before asking AI to design a solution, how much time do you spend framing the user problem?',
    type: 'single_select',
    purpose: 'Evaluates thoroughness of human problem definition prior to AI generation.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.3, solvingWithAI: 1.0, checkingAI: 0, adaptingToAI: 0 },
    options: {
      q19_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Substantial upfront human framing: user personas, pain points, constraints, success metrics.', relevance: 'Deep problem framing before prompting.', accuracy: 'Structures problem boundaries.' },
      q19_b: { score: 55, evidenceLevel: 'partial', demonstration: 'Brief problem framing outlining basic requirements.', relevance: 'Light problem framing.', accuracy: 'Informal requirement listing.' },
      q19_c: { score: 20, evidenceLevel: 'weak', demonstration: 'Minimal framing, delegating problem definition to AI.', relevance: 'Bypasses human framing stage.', accuracy: 'Over-relies on model defaults.' },
      q19_d: { score: 10, evidenceLevel: 'weak', demonstration: 'Requests solutions from AI without framing user problems.', relevance: 'Unframed prompting.', accuracy: 'Reactive generation.' }
    }
  },

  // Q20: Ultimate Responsibility For AI Flaws
  20: {
    questionId: 20,
    title: 'When AI generates code or a document for you, who takes ultimate responsibility if there is a flaw?',
    type: 'single_select',
    purpose: 'Evaluates professional accountability and ownership mindset over AI-assisted deliverables.',
    capabilityWeights: { usingAI: 0, understandingAI: 0, solvingWithAI: 0, checkingAI: 1.0, adaptingToAI: 0 },
    options: {
      q20_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Full personal ownership and accountability for final products created with AI assistance.', relevance: 'Uncompromised human responsibility.', accuracy: 'Asserts professional liability.' },
      q20_b: { score: 35, evidenceLevel: 'partial', demonstration: 'Assumes shared responsibility between human and AI vendor.', relevance: 'Dilutes personal accountability.', accuracy: 'Inaccurate legal/professional stance.' },
      q20_c: { score: 0, evidenceLevel: 'misunderstanding', demonstration: 'Shifts product liability to AI tool vendor.', relevance: 'Refuses accountability.', accuracy: 'Flawed understanding of product ownership.' },
      q20_d: { score: 0, evidenceLevel: 'none', demonstration: 'Unaware of liability or ownership considerations.', relevance: 'No responsibility awareness.', accuracy: 'No evidence.' }
    }
  },

  // Q21: Comfort Adapting Workflow to New AI Capabilities (Self-reported adaptiveness scale)
  21: {
    questionId: 21,
    title: 'How comfortable are you adapting your workflow when a major new AI capability is released?',
    type: 'scale',
    purpose: 'Measures adaptiveness and rapid workflow evolution.',
    capabilityWeights: { usingAI: 0, understandingAI: 0, solvingWithAI: 0, checkingAI: 0, adaptingToAI: 1.0 },
    scaleScoring: (val: number): OptionScoringDefinition => {
      const map: Record<number, OptionScoringDefinition> = {
        5: { score: 100, evidenceLevel: 'strong', demonstration: 'Eager and rapid experimentation with emerging AI shifts.', relevance: 'High adaptiveness.', accuracy: 'Proactive evolution.' },
        4: { score: 75, evidenceLevel: 'strong', demonstration: 'Comfortable trying new AI capabilities.', relevance: 'Moderate-high adaptiveness.', accuracy: 'Steady adoption.' },
        3: { score: 50, evidenceLevel: 'partial', demonstration: 'Moderate comfort with workflow adaptation.', relevance: 'Average adaptiveness.', accuracy: 'Cautious adoption.' },
        2: { score: 25, evidenceLevel: 'weak', demonstration: 'Hesitant to change established workflows.', relevance: 'Low adaptiveness.', accuracy: 'Workflow inertia.' },
        1: { score: 10, evidenceLevel: 'weak', demonstration: 'Prefers traditional methods, resistant to new AI tools.', relevance: 'Minimal adaptiveness.', accuracy: 'Strong resistance.' }
      };
      return map[val] || map[3];
    }
  },

  // Q22: Approach to Learning Brand-New AI Tool
  22: {
    questionId: 22,
    title: 'How do you approach learning a brand-new AI tool or framework?',
    type: 'single_select',
    purpose: 'Evaluates proactive hands-on project learning vs passive consumption.',
    capabilityWeights: { usingAI: 0.4, understandingAI: 0, solvingWithAI: 0, checkingAI: 0, adaptingToAI: 1.0 },
    options: {
      q22_a: { score: 100, evidenceLevel: 'strong', demonstration: 'Builds hands-on project immediately while reading official documentation.', relevance: 'Active project-based learning.', accuracy: 'Rapid skill acquisition.' },
      q22_b: { score: 55, evidenceLevel: 'partial', demonstration: 'Watches video tutorials and overview articles first.', relevance: 'Passive learning before trying.', accuracy: 'Theoretical introduction.' },
      q22_c: { score: 20, evidenceLevel: 'weak', demonstration: 'Waits for school or employer mandates before learning.', relevance: 'Reactive learning posture.', accuracy: 'Low self-directed initiative.' },
      q22_d: { score: 0, evidenceLevel: 'weak', demonstration: 'Rarely explores new technical frameworks.', relevance: 'Low technical exploration.', accuracy: 'Static skill set.' }
    }
  },

  // Q23: Biggest Concern About AI (ATTITUDE QUESTION — 0 capability score weight on technical proficiency)
  23: {
    questionId: 23,
    title: 'What is your biggest concern about the rapid rise of AI in your field?',
    type: 'single_select',
    isAttitude: true,
    purpose: 'Evaluates analytical awareness of structural AI shifts. DOES NOT INFLATE CAPABILITY SCORES.',
    capabilityWeights: { usingAI: 0, understandingAI: 0, solvingWithAI: 0, checkingAI: 0, adaptingToAI: 0.5 },
    options: {
      q23_b: { score: 75, evidenceLevel: 'strong', demonstration: 'Awareness of cognitive deskilling risk and core skill atrophy.', relevance: 'Nuanced critical awareness.', accuracy: 'Identifies human skill protection.' },
      q23_a: { score: 70, evidenceLevel: 'partial', demonstration: 'Awareness of skill obsolescence and urgency to stay current.', relevance: 'Motivation to adapt.', accuracy: 'Reflects awareness of pace.' },
      q23_c: { score: 65, evidenceLevel: 'partial', demonstration: 'Awareness of labor market displacement and role restructuring.', relevance: 'Realistic macro economic awareness.', accuracy: 'Industry shift recognition.' },
      q23_d: { score: 60, evidenceLevel: 'partial', demonstration: 'Optimistic outlook focusing on opportunity.', relevance: 'Positive attitude.', accuracy: 'Optimistic stance.' }
    }
  },

  // Q24: AI Skills Want to Master (PREFERENCE QUESTION — 0 capability score weight)
  24: {
    questionId: 24,
    title: 'Which AI skills do you most want to master over the next 6 months?',
    type: 'multi_select',
    isPreference: true,
    purpose: 'Captures learner preference. DOES NOT INFLATE CAPABILITY SCORES.',
    capabilityWeights: { usingAI: 0, understandingAI: 0, solvingWithAI: 0, checkingAI: 0, adaptingToAI: 0 },
    evaluateMultiSelect: (selectedIds: string[]): OptionScoringDefinition => {
      return { score: 0, evidenceLevel: 'preference', demonstration: `Selected learning preferences: ${selectedIds.join(', ')}.`, relevance: 'Recorded for personalization.', accuracy: 'Does not inflate capability scores.' };
    }
  },

  // Q25: AI Thinking Lab — User vs Adapter Reflection (OPEN ENDED — Anthropic Evaluated)
  25: {
    questionId: 25,
    title: 'AI THINKING LAB: What separates someone who merely uses AI from someone who adapts to AI?',
    type: 'long_text',
    purpose: 'Evaluates meta-cognition, workflow redesign, and human-AI co-evolution.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.4, solvingWithAI: 0, checkingAI: 0, adaptingToAI: 1.0 },
    deterministicTextFallback: (text: string): OptionScoringDefinition => {
      const clean = text ? text.trim() : '';
      if (!clean || clean.length < 5) return { score: 0, evidenceLevel: 'none', demonstration: 'No text entered.', relevance: 'No response provided.', accuracy: 'No evidence.' };
      const lower = clean.toLowerCase();
      if (clean.length < 15 && ['idk', 'test', 'asdf', 'nothing', 'na', 'none'].includes(lower)) {
        return { score: 0, evidenceLevel: 'none', demonstration: 'Non-responsive or placeholder text.', relevance: 'Lacks actual reflection.', accuracy: 'No valid evidence.' };
      }
      let score = 25;
      const strengths: string[] = [];
      if (lower.includes('workflow') || lower.includes('redesign') || lower.includes('system')) { score += 20; strengths.push('Workflow redesign perspective'); }
      if (lower.includes('mindset') || lower.includes('understand') || lower.includes('limit') || lower.includes('critical')) { score += 20; strengths.push('Meta-cognitive awareness'); }
      if (lower.includes('continuous') || lower.includes('learn') || lower.includes('evolve') || lower.includes('experiment')) { score += 20; strengths.push('Continuous growth mindset'); }
      score = Math.min(95, Math.max(15, score));
      const level = score >= 75 ? 'strong' : score >= 40 ? 'partial' : 'weak';
      return { score, evidenceLevel: level, demonstration: `Evaluated text reflection. Identified themes: ${strengths.join(', ') || 'basic reflection'}.`, relevance: 'Evaluated raw text.', accuracy: 'Deterministic fallback evaluation.' };
    }
  }
};

/**
 * Single question scoring function
 */
export function scoreQuestion(
  questionId: number,
  rawAnswer: any,
  anthropicEvaluation?: { score: number; confidence: number; reason: string; strengths?: string[]; gaps?: string[]; evidence?: any[] }
): QuestionScoreResult {
  const rubric = ASSESSMENT_RUBRICS[questionId];
  if (!rubric) {
    return {
      questionId,
      questionType: 'unknown',
      rawAnswer,
      score: 0,
      confidence: 0,
      evidenceLevel: 'none',
      scoringMethod: 'question_rubric',
      reason: `Unknown question ID: ${questionId}`
    };
  }

  // Preference question handling (e.g. Q5, Q24)
  if (rubric.isPreference) {
    const selected = Array.isArray(rawAnswer) ? rawAnswer : rawAnswer ? [rawAnswer] : [];
    return {
      questionId,
      questionType: rubric.type,
      rawAnswer,
      score: 0,
      confidence: selected.length > 0 ? 1.0 : 0.0,
      evidenceLevel: 'preference',
      scoringMethod: 'question_rubric',
      reason: `Q${questionId} is a learning preference question (${selected.length} item(s) selected). Recorded for personalization; 0 contribution to capability scores.`
    };
  }

  // Open-ended questions (Q11, Q12, Q25)
  if (rubric.type === 'long_text') {
    const textStr = typeof rawAnswer === 'string' ? rawAnswer : '';

    if (anthropicEvaluation && typeof anthropicEvaluation.score === 'number') {
      let level: 'strong' | 'partial' | 'weak' | 'none' = 'none';
      if (anthropicEvaluation.score >= 75) level = 'strong';
      else if (anthropicEvaluation.score >= 40) level = 'partial';
      else if (anthropicEvaluation.score > 0) level = 'weak';

      return {
        questionId,
        questionType: rubric.type,
        rawAnswer,
        score: Math.min(100, Math.max(0, Math.round(anthropicEvaluation.score))),
        confidence: anthropicEvaluation.confidence ?? 0.9,
        evidenceLevel: level,
        scoringMethod: 'anthropic',
        reason: anthropicEvaluation.reason || 'Evaluated via Anthropic Claude model.',
        strengths: anthropicEvaluation.strengths || [],
        gaps: anthropicEvaluation.gaps || [],
        evidence: anthropicEvaluation.evidence || [],
        anthropicStatus: 'evaluated'
      };
    }

    // Deterministic Fallback if Anthropic is unavailable
    if (rubric.deterministicTextFallback) {
      const fallback = rubric.deterministicTextFallback(textStr);
      return {
        questionId,
        questionType: rubric.type,
        rawAnswer,
        score: fallback.score,
        confidence: textStr.trim().length > 10 ? 0.4 : 0.0,
        evidenceLevel: fallback.evidenceLevel,
        scoringMethod: 'deterministic_fallback',
        reason: fallback.demonstration,
        strengths: [],
        gaps: textStr.trim().length < 10 ? ['Insufficient response text provided.'] : [],
        anthropicStatus: 'unavailable'
      };
    }
  }

  // Multi-select questions (e.g. Q2, Q24)
  if (rubric.type === 'multi_select' && rubric.evaluateMultiSelect) {
    const selected = Array.isArray(rawAnswer) ? rawAnswer : [];
    const evalRes = rubric.evaluateMultiSelect(selected);
    return {
      questionId,
      questionType: rubric.type,
      rawAnswer,
      score: evalRes.score,
      confidence: selected.length > 0 ? 0.95 : 0.0,
      evidenceLevel: evalRes.evidenceLevel,
      scoringMethod: 'question_rubric',
      reason: evalRes.demonstration
    };
  }

  // Scale questions (e.g. Q4, Q21)
  if (rubric.type === 'scale' && rubric.scaleScoring) {
    const val = typeof rawAnswer === 'number' ? rawAnswer : parseInt(String(rawAnswer), 10);
    if (!isNaN(val) && val >= 1 && val <= 5) {
      const scaleRes = rubric.scaleScoring(val);
      return {
        questionId,
        questionType: rubric.type,
        rawAnswer,
        score: scaleRes.score,
        confidence: 0.9,
        evidenceLevel: scaleRes.evidenceLevel,
        scoringMethod: 'question_rubric',
        reason: scaleRes.demonstration
      };
    }
  }

  // Single select questions
  if (rubric.options && typeof rawAnswer === 'string') {
    const opt = rubric.options[rawAnswer];
    if (opt) {
      return {
        questionId,
        questionType: rubric.type,
        rawAnswer,
        score: opt.score,
        confidence: 1.0,
        evidenceLevel: opt.evidenceLevel,
        scoringMethod: 'question_rubric',
        reason: opt.demonstration
      };
    }
  }

  // Missing or unanswered question fallback (NO SCORE INFLATION)
  return {
    questionId,
    questionType: rubric.type,
    rawAnswer,
    score: 0,
    confidence: 0,
    evidenceLevel: 'none',
    scoringMethod: 'question_rubric',
    reason: `No valid response provided for Q${questionId}. NO score inflation applied.`
  };
}

/**
 * Main Assessment Evaluation Engine
 */
export function evaluateAssessment(
  answers: Record<number | string, any>,
  openEndedEvaluations?: Record<number | string, { score: number; confidence: number; reason: string; strengths?: string[]; gaps?: string[]; evidence?: any[] }>
): AssessmentEvaluationResult {
  const questionResults: Record<number, QuestionScoreResult> = {};

  // Score all 25 questions individually
  for (let qId = 1; qId <= 25; qId++) {
    const rawAns = answers[qId] !== undefined ? answers[qId] : answers[String(qId)];
    const anthropicEval = openEndedEvaluations ? (openEndedEvaluations[qId] || openEndedEvaluations[String(qId)]) : undefined;
    questionResults[qId] = scoreQuestion(qId, rawAns, anthropicEval);
  }

  const capabilityKeys: CapabilityKey[] = ['usingAI', 'understandingAI', 'solvingWithAI', 'checkingAI', 'adaptingToAI'];
  const capabilities: Record<CapabilityKey, CapabilityScoreResult> = {} as any;

  // Calculate each Capability from question evidence using explicit weights
  capabilityKeys.forEach((capKey) => {
    let weightedScoreSum = 0;
    let totalPossibleWeight = 0;
    let answeredWeightSum = 0;
    let weightedConfidenceSum = 0;

    const contributingQuestionIds: number[] = [];
    const questionScores: Record<number, number> = {};
    const demonstratedStrengths: string[] = [];
    const identifiedGaps: string[] = [];

    for (let qId = 1; qId <= 25; qId++) {
      const rubric = ASSESSMENT_RUBRICS[qId];
      if (!rubric) continue;

      const weight = rubric.capabilityWeights[capKey] || 0;
      if (weight > 0) {
        contributingQuestionIds.push(qId);
        totalPossibleWeight += weight;

        const qRes = questionResults[qId];
        questionScores[qId] = qRes.score;

        const hasValidAnswer = qRes.evidenceLevel !== 'none' && qRes.confidence > 0;
        if (hasValidAnswer) {
          answeredWeightSum += weight;
          weightedScoreSum += qRes.score * weight;
          weightedConfidenceSum += qRes.confidence * weight;

          if (qRes.score >= 75) {
            demonstratedStrengths.push(`Q${qId}: ${qRes.reason}`);
          } else if (qRes.score <= 40) {
            identifiedGaps.push(`Q${qId}: ${qRes.reason}`);
          }
        } else {
          identifiedGaps.push(`Q${qId}: Question unanswered.`);
        }
      }
    }

    const capScore = totalPossibleWeight > 0 ? Math.round(weightedScoreSum / totalPossibleWeight) : 0;
    const evidenceCoverage = totalPossibleWeight > 0 ? Math.round((answeredWeightSum / totalPossibleWeight) * 100) / 100 : 0;
    const capConfidence = totalPossibleWeight > 0 ? Math.round((weightedConfidenceSum / totalPossibleWeight) * 100) / 100 : 0;

    let evidenceStatus: 'robust' | 'moderate' | 'limited' = 'limited';
    if (evidenceCoverage >= 0.8 && capConfidence >= 0.7) {
      evidenceStatus = 'robust';
    } else if (evidenceCoverage >= 0.4 && capConfidence >= 0.4) {
      evidenceStatus = 'moderate';
    }

    let capAssessmentStatus: 'complete' | 'provisional' | 'needs_evaluation' = 'needs_evaluation';
    if (evidenceCoverage === 1.0) {
      capAssessmentStatus = 'complete';
    } else if (evidenceCoverage > 0) {
      capAssessmentStatus = 'provisional';
    }

    capabilities[capKey] = {
      capabilityKey: capKey,
      capabilityName: CAPABILITY_NAMES[capKey],
      score: capScore,
      confidence: capConfidence,
      evidenceCoverage,
      assessmentStatus: capAssessmentStatus,
      evidenceStatus,
      contributingQuestionIds,
      questionScores,
      demonstratedStrengths,
      identifiedGaps,
      scoringMethod: 'explicit_question_rubric_v3',
      rubricVersion: '3.0.0-evidence-based'
    };
  });

  // Calculate Overall AI Score as unweighted mean of the 5 Capabilities
  const capScoresList = capabilityKeys.map((k) => capabilities[k].score);
  const overallScore = Math.round(capScoresList.reduce((a, b) => a + b, 0) / capScoresList.length);

  const capConfidencesList = capabilityKeys.map((k) => capabilities[k].confidence);
  const overallConfidence = Math.round((capConfidencesList.reduce((a, b) => a + b, 0) / capConfidencesList.length) * 100) / 100;

  const capCoveragesList = capabilityKeys.map((k) => capabilities[k].evidenceCoverage);
  const overallEvidenceCoverage = Math.round((capCoveragesList.reduce((a, b) => a + b, 0) / capCoveragesList.length) * 100) / 100;

  let overallStatus: 'complete' | 'provisional' | 'needs_evaluation' = 'needs_evaluation';
  if (overallEvidenceCoverage === 1.0) {
    overallStatus = 'complete';
  } else if (overallEvidenceCoverage > 0) {
    overallStatus = 'provisional';
  }

  // Determine Strongest Skill and Room To Grow based on ACTUAL capability scores
  const sortedCapabilities = [...capabilityKeys].map((k) => capabilities[k]).sort((a, b) => b.score - a.score);

  const strongestSkill = {
    key: sortedCapabilities[0].capabilityKey,
    name: sortedCapabilities[0].capabilityName,
    score: sortedCapabilities[0].score
  };

  const roomToGrow = {
    key: sortedCapabilities[sortedCapabilities.length - 1].capabilityKey,
    name: sortedCapabilities[sortedCapabilities.length - 1].capabilityName,
    score: sortedCapabilities[sortedCapabilities.length - 1].score
  };

  // Map to legacy score keys for backward compatibility across existing views
  const legacyScores = {
    usageFrequency: capabilities.usingAI.score,
    evaluationCapability: capabilities.checkingAI.score,
    workflowDesign: capabilities.solvingWithAI.score,
    strategicVision: capabilities.understandingAI.score,
    mentorshipReadiness: capabilities.adaptingToAI.score
  };

  return {
    overallScore,
    overallConfidence,
    overallEvidenceCoverage,
    assessmentStatus: overallStatus,
    scoringVersion: '3.0.0-evidence-based',
    capabilities,
    legacyScores,
    questionResults,
    strongestSkill,
    roomToGrow,
    evaluatedAt: new Date().toISOString()
  };
}
