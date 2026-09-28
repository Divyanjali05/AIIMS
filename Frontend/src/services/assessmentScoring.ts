/**
 * AINOVA Assessment Scoring Engine (v2.0)
 *
 * Principles:
 * 1. Score represents actual thinking, understanding, accuracy, relevance, and evidence demonstrated.
 * 2. NO generic option-position scoring (_a=95, _b=75, _c=55, _d=35).
 * 3. NO EVIDENCE = NO SCORE INFLATION.
 * 4. Q24 Preferences MUST NOT inflate capability scores.
 * 5. Q23 Attitude/Concern does not artificially inflate or deflate capability.
 * 6. Multi-select evaluated on technical relevance/depth, NOT raw count.
 * 7. Open-ended questions (Q11, Q12, Q25) evaluated via Anthropic (or deterministic rubric fallback with NO fake scores).
 * 8. Full traceability retained for all 5 capabilities: Using AI, Understanding AI, Solving with AI, Checking AI, Adapting to AI.
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
  evidence?: string[];
  anthropicStatus?: 'evaluated' | 'unavailable' | 'not_applicable';
}

export interface CapabilityScoreResult {
  capabilityKey: CapabilityKey;
  capabilityName: string;
  score: number;
  confidence: number;
  evidenceStatus: 'robust' | 'moderate' | 'limited';
  contributingQuestionIds: number[];
  questionScores: Record<number, number>;
  scoringMethod: string;
  rubricVersion: string;
}

export interface AssessmentEvaluationResult {
  overallScore: number;
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
  rubricVersion: string;
}

export const CAPABILITY_NAMES: Record<CapabilityKey, string> = {
  usingAI: 'Using AI',
  understandingAI: 'Understanding AI',
  solvingWithAI: 'Solving with AI',
  checkingAI: 'Checking AI',
  adaptingToAI: 'Adapting to AI'
};

export const CAPABILITY_DESCRIPTIONS: Record<CapabilityKey, string> = {
  usingAI: 'How regularly and confidently the learner uses AI.',
  understandingAI: 'How well the learner understands what AI can and cannot do.',
  solvingWithAI: 'How well the learner uses AI to think through problems and create solutions.',
  checkingAI: 'How well the learner verifies AI outputs and handles risks.',
  adaptingToAI: 'How well the learner learns and adapts as AI changes.'
};

/**
 * Question-Specific Assessment Rubric Configurations
 */
export const ASSESSMENT_RUBRICS: Record<number, QuestionScoringRubric> = {
  // Q1: Frequency of AI Usage
  1: {
    questionId: 1,
    title: 'How frequently do you currently use AI tools in your work or study?',
    type: 'single_select',
    purpose: 'Measures regularity and routine integration of AI tools into daily workflows.',
    capabilityWeights: { usingAI: 1.0, understandingAI: 0, solvingWithAI: 0.2, checkingAI: 0, adaptingToAI: 0 },
    options: {
      q1_a: {
        score: 100,
        evidenceLevel: 'strong',
        demonstration: 'Seamlessly integrated AI into daily core workflow.',
        relevance: 'Directly answers frequency requirement with highest regular usage.',
        accuracy: 'Accurately reflects active daily execution.'
      },
      q1_b: {
        score: 80,
        evidenceLevel: 'strong',
        demonstration: 'Regular consultation of AI for daily routine tasks.',
        relevance: 'Demonstrates frequent usage.',
        accuracy: 'Accurately reflects consistent usage.'
      },
      q1_c: {
        score: 50,
        evidenceLevel: 'partial',
        demonstration: 'Occasional task-specific AI usage.',
        relevance: 'Demonstrates moderate usage.',
        accuracy: 'Reflects intermittent integration.'
      },
      q1_d: {
        score: 25,
        evidenceLevel: 'weak',
        demonstration: 'Infrequent usage only when stuck.',
        relevance: 'Demonstrates minimal routine reliance.',
        accuracy: 'Reflects reactive usage.'
      },
      q1_e: {
        score: 0,
        evidenceLevel: 'none',
        demonstration: 'No active reliance or usage of AI tools.',
        relevance: 'Demonstrates complete lack of usage.',
        accuracy: 'Accurately indicates zero workflow integration.'
      }
    }
  },

  // Q2: AI Tools Interacted With
  2: {
    questionId: 2,
    title: 'Which AI models or tools do you regularly interact with?',
    type: 'multi_select',
    purpose: 'Measures breadth and technical depth of tool usage, distinguishing developer/custom tools from simple chatbots.',
    capabilityWeights: { usingAI: 0.7, understandingAI: 0.3, solvingWithAI: 0, checkingAI: 0, adaptingToAI: 0.3 },
    evaluateMultiSelect: (selectedIds: string[]): OptionScoringDefinition => {
      if (!selectedIds || selectedIds.length === 0) {
        return {
          score: 0,
          evidenceLevel: 'none',
          demonstration: 'No tools selected.',
          relevance: 'No tool evidence provided.',
          accuracy: 'No evidence.'
        };
      }
      const hasDevTools = selectedIds.some((id) => id === 'q2_d' || id === 'q2_f'); // Copilot/Cursor/Custom APIs
      const hasSpecialized = selectedIds.some((id) => id === 'q2_b' || id === 'q2_e'); // Claude, Midjourney/DALL-E
      const hasBasicChat = selectedIds.some((id) => id === 'q2_a' || id === 'q2_c'); // ChatGPT, Gemini

      let score = 0;
      let level: 'strong' | 'partial' | 'weak' = 'weak';
      let demo = '';

      if (hasDevTools && (hasSpecialized || hasBasicChat)) {
        score = 95;
        level = 'strong';
        demo = 'Demonstrates technical depth across coding assistants, custom APIs, and multimodal/reasoning models.';
      } else if (hasDevTools) {
        score = 85;
        level = 'strong';
        demo = 'Demonstrates technical tool usage including developer tools and APIs.';
      } else if (hasSpecialized && hasBasicChat) {
        score = 70;
        level = 'partial';
        demo = 'Demonstrates multi-tool usage across general chatbots and specialized reasoning/image models.';
      } else if (hasSpecialized) {
        score = 60;
        level = 'partial';
        demo = 'Demonstrates specialized tool usage beyond default search/chat interfaces.';
      } else if (hasBasicChat && selectedIds.length > 1) {
        score = 50;
        level = 'partial';
        demo = 'Demonstrates standard multi-model chatbot usage.';
      } else {
        score = 35;
        level = 'weak';
        demo = 'Demonstrates basic single-tool chatbot interaction.';
      }

      return {
        score,
        evidenceLevel: level,
        demonstration: demo,
        relevance: 'Evaluated tool combination diversity and technical sophistication.',
        accuracy: 'Accurately reflects depth of tool ecosystem engagement.'
      };
    }
  },

  // Q3: First Instinct on New Project
  3: {
    questionId: 3,
    title: 'When starting a new assignment or project, what is your first instinct?',
    type: 'single_select',
    purpose: 'Measures problem-framing strategy: manual human reasoning combined with AI augmentation.',
    capabilityWeights: { usingAI: 0.5, understandingAI: 0.3, solvingWithAI: 1.0, checkingAI: 0, adaptingToAI: 0 },
    options: {
      q3_b: {
        score: 100,
        evidenceLevel: 'strong',
        demonstration: 'First-principles human framing followed by structured AI augmentation.',
        relevance: 'Demonstrates optimal balance between human agency and AI capabilities.',
        accuracy: 'Accurately identifies ideal AI problem-solving architecture.'
      },
      q3_a: {
        score: 75,
        evidenceLevel: 'strong',
        demonstration: 'Immediate AI brainstorming and initial ideation.',
        relevance: 'Demonstrates high AI integration, with moderate reliance for initial framing.',
        accuracy: 'Reflects proactive AI tool usage.'
      },
      q3_c: {
        score: 40,
        evidenceLevel: 'weak',
        demonstration: 'Reliance on traditional web search engines before AI.',
        relevance: 'Shows lower AI workflow integration.',
        accuracy: 'Reflects legacy search paradigm.'
      },
      q3_d: {
        score: 20,
        evidenceLevel: 'weak',
        demonstration: 'Isolated manual work, using AI only as a last resort.',
        relevance: 'Shows minimal AI adoption in problem-solving.',
        accuracy: 'Reflects low AI leverage.'
      }
    }
  },

  // Q4: Productivity Impact If AI Unavailable
  4: {
    questionId: 4,
    title: 'If AI tools suddenly became unavailable for a week, how would it impact your productivity?',
    type: 'scale',
    purpose: 'Measures extent of AI integration into daily productivity and workflow dependency.',
    capabilityWeights: { usingAI: 1.0, understandingAI: 0, solvingWithAI: 0.4, checkingAI: 0, adaptingToAI: 0 },
    scaleScoring: (val: number): OptionScoringDefinition => {
      // Scale 1 = struggle significantly (heavily integrated), 5 = unaffected (low integration)
      const map: Record<number, OptionScoringDefinition> = {
        1: { score: 95, evidenceLevel: 'strong', demonstration: 'Core workflows rely significantly on AI tooling.', relevance: 'High workflow dependence.', accuracy: 'Reflects deep integration.' },
        2: { score: 80, evidenceLevel: 'strong', demonstration: 'Substantial workflow dependency on AI.', relevance: 'Moderate-high workflow dependence.', accuracy: 'Reflects strong integration.' },
        3: { score: 60, evidenceLevel: 'partial', demonstration: 'Balanced workflow with moderate AI assistance.', relevance: 'Moderate workflow impact.', accuracy: 'Reflects partial integration.' },
        4: { score: 40, evidenceLevel: 'weak', demonstration: 'Minor AI workflow reliance.', relevance: 'Low workflow impact.', accuracy: 'Reflects light integration.' },
        5: { score: 20, evidenceLevel: 'weak', demonstration: 'Workflow completely unaffected by AI absence.', relevance: 'Minimal AI integration.', accuracy: 'Reflects negligible workflow dependence.' }
      };
      return map[val] || map[3];
    }
  },

  // Q5: Primary Goal When Using AI
  5: {
    questionId: 5,
    title: 'What best describes your primary goal when using AI?',
    type: 'single_select',
    purpose: 'Evaluates strategic intent and value proposition expected from AI tools.',
    capabilityWeights: { usingAI: 0.5, understandingAI: 0.3, solvingWithAI: 0.8, checkingAI: 0, adaptingToAI: 0.2 },
    options: {
      q5_c: {
        score: 95,
        evidenceLevel: 'strong',
        demonstration: 'Using AI for complex ideation, new perspectives, and technical architecture.',
        relevance: 'Demonstrates high-level cognitive leverage.',
        accuracy: 'Accurately targets strategic creative output.'
      },
      q5_b: {
        score: 90,
        evidenceLevel: 'strong',
        demonstration: 'Using AI for deep learning, conceptual explanations, and skill synthesis.',
        relevance: 'Demonstrates cognitive augmentation.',
        accuracy: 'Targeting intellectual growth.'
      },
      q5_d: {
        score: 85,
        evidenceLevel: 'strong',
        demonstration: 'Using AI for systemized delegation and repetitive workflow automation.',
        relevance: 'Demonstrates automation mindset.',
        accuracy: 'Targeting efficiency scaling.'
      },
      q5_a: {
        score: 65,
        evidenceLevel: 'partial',
        demonstration: 'Using AI primarily for quick task completion and time savings.',
        relevance: 'Demonstrates basic task-level productivity.',
        accuracy: 'Focusing on execution speed.'
      }
    }
  },

  // Q6: Explanation of LLM Mechanics
  6: {
    questionId: 6,
    title: 'How would you explain how Large Language Models (LLMs) generate answers?',
    type: 'single_select',
    purpose: 'Evaluates accuracy of learner mental model regarding statistical autoregressive token prediction.',
    capabilityWeights: { usingAI: 0, understandingAI: 1.0, solvingWithAI: 0, checkingAI: 0.3, adaptingToAI: 0 },
    options: {
      q6_b: {
        score: 100,
        evidenceLevel: 'strong',
        demonstration: 'Accurate technical mental model: probabilistic next-token prediction based on training distribution.',
        relevance: 'Directly explains core mechanism correctly.',
        accuracy: 'Factually and conceptually precise.'
      },
      q6_a: {
        score: 20,
        evidenceLevel: 'misunderstanding',
        demonstration: 'Confuses statistical generative models with real-time web search databases.',
        relevance: 'Incorrect conceptual explanation.',
        accuracy: 'Factually inaccurate.'
      },
      q6_c: {
        score: 10,
        evidenceLevel: 'misunderstanding',
        demonstration: 'Anthropomorphic misconception: assumes conscious reasoning and inherent truth verification.',
        relevance: 'Fundamentally flawed mental model.',
        accuracy: 'Factually inaccurate.'
      },
      q6_d: {
        score: 0,
        evidenceLevel: 'none',
        demonstration: 'Honest admission of unknown model mechanics.',
        relevance: 'No understanding evidence.',
        accuracy: 'No technical understanding.'
      }
    }
  },

  // Q7: Encountering AI Hallucinations
  7: {
    questionId: 7,
    title: 'Have you ever encountered an AI "hallucination" (a confident but false answer)?',
    type: 'single_select',
    purpose: 'Measures awareness of AI model error modes and active verification behaviors.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.6, solvingWithAI: 0, checkingAI: 1.0, adaptingToAI: 0 },
    options: {
      q7_a: {
        score: 100,
        evidenceLevel: 'strong',
        demonstration: 'Frequent detection of hallucinations combined with systematic verification protocols.',
        relevance: 'Demonstrates high scrutiny and risk awareness.',
        accuracy: 'Accurately recognizes model vulnerability.'
      },
      q7_b: {
        score: 60,
        evidenceLevel: 'partial',
        demonstration: 'Occasional detection of false outputs when suspicious.',
        relevance: 'Demonstrates passive checking behavior.',
        accuracy: 'Recognizes obvious hallucinations.'
      },
      q7_c: {
        score: 15,
        evidenceLevel: 'misunderstanding',
        demonstration: 'Blind trust in model outputs without verification.',
        relevance: 'Unaware of hallucination risks.',
        accuracy: 'Inaccurate assumption of AI perfection.'
      },
      q7_d: {
        score: 0,
        evidenceLevel: 'none',
        demonstration: 'Unfamiliar with the concept of model hallucination.',
        relevance: 'No risk awareness.',
        accuracy: 'No evidence.'
      }
    }
  },

  // Q8: Definition of Context Window
  8: {
    questionId: 8,
    title: 'What does "Context Window" mean when working with an AI model?',
    type: 'single_select',
    purpose: 'Evaluates technical knowledge of LLM memory bounds and token budget constraints.',
    capabilityWeights: { usingAI: 0, understandingAI: 1.0, solvingWithAI: 0.4, checkingAI: 0, adaptingToAI: 0 },
    options: {
      q8_a: {
        score: 100,
        evidenceLevel: 'strong',
        demonstration: 'Accurate technical definition: maximum token memory capacity during session execution.',
        relevance: 'Directly defines technical concept correctly.',
        accuracy: 'Factually precise.'
      },
      q8_c: {
        score: 15,
        evidenceLevel: 'misunderstanding',
        demonstration: 'Confuses token context memory with streaming text throughput speed.',
        relevance: 'Incorrect technical mapping.',
        accuracy: 'Factually inaccurate.'
      },
      q8_b: {
        score: 10,
        evidenceLevel: 'misunderstanding',
        demonstration: 'Confuses model memory constraint with browser window visual styling.',
        relevance: 'Literal misinterpretation.',
        accuracy: 'Factually inaccurate.'
      },
      q8_d: {
        score: 0,
        evidenceLevel: 'none',
        demonstration: 'Unaware of technical meaning.',
        relevance: 'No understanding evidence.',
        accuracy: 'No evidence.'
      }
    }
  },

  // Q9: Adjusting Prompting Style
  9: {
    questionId: 9,
    title: 'How do you adjust your prompting style when you need structured, precise output vs creative brainstorming?',
    type: 'single_select',
    purpose: 'Evaluates prompt engineering skill, schema specification, and constraint enforcement.',
    capabilityWeights: { usingAI: 0.3, understandingAI: 0.5, solvingWithAI: 1.0, checkingAI: 0, adaptingToAI: 0 },
    options: {
      q9_a: {
        score: 100,
        evidenceLevel: 'strong',
        demonstration: 'Explicit specification of JSON/Markdown schemas, system parameters, and explicit negative constraints.',
        relevance: 'Demonstrates advanced structured prompt control.',
        accuracy: 'Accurately applies schema-driven prompting.'
      },
      q9_b: {
        score: 55,
        evidenceLevel: 'partial',
        demonstration: 'Elaborates prompts with extra descriptive text.',
        relevance: 'Demonstrates basic prompt expansion.',
        accuracy: 'Reflects informal prompt tweaking.'
      },
      q9_c: {
        score: 25,
        evidenceLevel: 'weak',
        demonstration: 'Uses uniform prompting style regardless of output structure needs.',
        relevance: 'Lacks technique adaptation.',
        accuracy: 'Does not leverage model steering capabilities.'
      },
      q9_d: {
        score: 15,
        evidenceLevel: 'weak',
        demonstration: 'Passively relies on model default formatting.',
        relevance: 'No active prompt structuring.',
        accuracy: 'Reflects passive usage.'
      }
    }
  },

  // Q10: What is RAG?
  10: {
    questionId: 10,
    title: 'What is Retrieval-Augmented Generation (RAG)?',
    type: 'single_select',
    purpose: 'Evaluates technical knowledge of modern AI architecture combining vector retrieval with LLMs.',
    capabilityWeights: { usingAI: 0, understandingAI: 1.0, solvingWithAI: 0.5, checkingAI: 0, adaptingToAI: 0.3 },
    options: {
      q10_a: {
        score: 100,
        evidenceLevel: 'strong',
        demonstration: 'Accurate technical definition: augmenting LLMs with document retrieval over external private datasets.',
        relevance: 'Correctly identifies RAG architecture.',
        accuracy: 'Factually precise.'
      },
      q10_b: {
        score: 20,
        evidenceLevel: 'misunderstanding',
        demonstration: 'Confuses RAG retrieval with model pre-training from scratch.',
        relevance: 'Incorrect technical concept.',
        accuracy: 'Factually inaccurate.'
      },
      q10_c: {
        score: 0,
        evidenceLevel: 'misunderstanding',
        demonstration: 'Confuses vector database embeddings with vector graphics tools.',
        relevance: 'Completely mistaken domain.',
        accuracy: 'Factually inaccurate.'
      },
      q10_d: {
        score: 0,
        evidenceLevel: 'none',
        demonstration: 'Unfamiliar with RAG architecture.',
        relevance: 'No understanding evidence.',
        accuracy: 'No evidence.'
      }
    }
  },

  // Q11: AI Thinking Lab — Software Architecture Prompt (OPEN ENDED)
  11: {
    questionId: 11,
    title: 'AI THINKING LAB: Designing Software Architecture',
    type: 'long_text',
    purpose: 'Evaluates authentic problem-framing, system boundary definition, role setting, and technical constraint specification in open-ended architecture prompting.',
    capabilityWeights: { usingAI: 0.3, understandingAI: 0.5, solvingWithAI: 1.0, checkingAI: 0.2, adaptingToAI: 0 },
    deterministicTextFallback: (text: string): OptionScoringDefinition => {
      const clean = text ? text.trim() : '';
      if (!clean || clean.length < 5) {
        return {
          score: 0,
          evidenceLevel: 'none',
          demonstration: 'No prompt entered.',
          relevance: 'No text provided.',
          accuracy: 'No evidence.'
        };
      }
      if (clean.length < 15 && ['idk', 'test', 'asdf', 'nothing', 'na', 'none'].includes(clean.toLowerCase())) {
        return {
          score: 0,
          evidenceLevel: 'none',
          demonstration: 'Non-responsive or placeholder text.',
          relevance: 'Lacks actual prompt content.',
          accuracy: 'No valid evidence.'
        };
      }

      const lower = clean.toLowerCase();
      let score = 30; // base score for entering a readable prompt
      const strengths: string[] = [];

      // Check role framing
      if (lower.includes('act as') || lower.includes('you are') || lower.includes('senior architect') || lower.includes('expert')) {
        score += 15;
        strengths.push('Persona & role definition');
      }
      // Check structural / tech stack constraints
      if (lower.includes('tech stack') || lower.includes('react') || lower.includes('node') || lower.includes('database') || lower.includes('api') || lower.includes('schema') || lower.includes('postgres') || lower.includes('microservice')) {
        score += 20;
        strengths.push('Technical stack constraints');
      }
      // Check non-functional requirements
      if (lower.includes('scalable') || lower.includes('security') || lower.includes('performance') || lower.includes('latency') || lower.includes('auth') || lower.includes('error handling')) {
        score += 15;
        strengths.push('System constraints & non-functional requirements');
      }
      // Check output formatting instructions
      if (lower.includes('format') || lower.includes('step') || lower.includes('diagram') || lower.includes('json') || lower.includes('markdown') || lower.includes('table')) {
        score += 10;
        strengths.push('Output format specification');
      }

      score = Math.min(95, Math.max(15, score));
      let level: 'strong' | 'partial' | 'weak' = 'weak';
      if (score >= 70) level = 'strong';
      else if (score >= 40) level = 'partial';

      return {
        score,
        evidenceLevel: level,
        demonstration: `Evaluated architecture prompt content. Length: ${clean.length} chars. Key framing elements identified: ${strengths.join(', ') || 'basic prompt structure'}.`,
        relevance: 'Evaluated raw architecture prompt text against rubric.',
        accuracy: 'Deterministic fallback evaluation based strictly on text content.'
      };
    }
  },

  // Q12: AI THINKING LAB — Building a Working Prototype MVP Prompt (OPEN ENDED)
  12: {
    questionId: 12,
    title: 'AI THINKING LAB: Building a Working Prototype (MVP)',
    type: 'long_text',
    purpose: 'Evaluates code generation prompting strategy: component modularity, API contract definition, state handling, and explicit edge case instructions.',
    capabilityWeights: { usingAI: 0.5, understandingAI: 0.3, solvingWithAI: 1.0, checkingAI: 0.2, adaptingToAI: 0 },
    deterministicTextFallback: (text: string): OptionScoringDefinition => {
      const clean = text ? text.trim() : '';
      if (!clean || clean.length < 5) {
        return {
          score: 0,
          evidenceLevel: 'none',
          demonstration: 'No prompt entered.',
          relevance: 'No text provided.',
          accuracy: 'No evidence.'
        };
      }
      if (clean.length < 15 && ['idk', 'test', 'asdf', 'nothing', 'na', 'none'].includes(clean.toLowerCase())) {
        return {
          score: 0,
          evidenceLevel: 'none',
          demonstration: 'Non-responsive or placeholder text.',
          relevance: 'Lacks actual prompt content.',
          accuracy: 'No valid evidence.'
        };
      }

      const lower = clean.toLowerCase();
      let score = 30;
      const strengths: string[] = [];

      if (lower.includes('write code') || lower.includes('create a') || lower.includes('build') || lower.includes('component')) {
        score += 10;
      }
      if (lower.includes('typescript') || lower.includes('react') || lower.includes('html') || lower.includes('css') || lower.includes('python') || lower.includes('function') || lower.includes('api')) {
        score += 20;
        strengths.push('Explicit code stack specification');
      }
      if (lower.includes('step') || lower.includes('first') || lower.includes('mock data') || lower.includes('file structure') || lower.includes('state')) {
        score += 20;
        strengths.push('Modular step-by-step implementation breakdown');
      }
      if (lower.includes('edge case') || lower.includes('error handling') || lower.includes('clean') || lower.includes('comment')) {
        score += 15;
        strengths.push('Quality & error boundary constraints');
      }

      score = Math.min(95, Math.max(15, score));
      let level: 'strong' | 'partial' | 'weak' = 'weak';
      if (score >= 70) level = 'strong';
      else if (score >= 40) level = 'partial';

      return {
        score,
        evidenceLevel: level,
        demonstration: `Evaluated MVP prototype prompt content. Key elements: ${strengths.join(', ') || 'basic prompt instructions'}.`,
        relevance: 'Evaluated raw MVP code generation prompt against rubric.',
        accuracy: 'Deterministic fallback evaluation based strictly on text content.'
      };
    }
  },

  // Q13: Action When AI Output Is Incorrect
  13: {
    questionId: 13,
    title: 'When an AI model gives you an incomplete or slightly incorrect answer, what do you do?',
    type: 'single_select',
    purpose: 'Evaluates iterative prompt debugging capability and task decomposition.',
    capabilityWeights: { usingAI: 0.3, understandingAI: 0.4, solvingWithAI: 1.0, checkingAI: 0.3, adaptingToAI: 0.5 },
    options: {
      q13_a: {
        score: 100,
        evidenceLevel: 'strong',
        demonstration: 'Refines prompt with explicit constraints, negative examples, or sub-step task decomposition.',
        relevance: 'Demonstrates active prompt debugging mastery.',
        accuracy: 'Correctly applies systematic prompt refactoring.'
      },
      q13_c: {
        score: 60,
        evidenceLevel: 'partial',
        demonstration: 'Switches to alternative model or search engine.',
        relevance: 'Recognizes model variance, but bypasses prompt debugging.',
        accuracy: 'Reflects cross-model trial.'
      },
      q13_b: {
        score: 35,
        evidenceLevel: 'weak',
        demonstration: 'Repeats exact same prompt or hits regenerate without input modification.',
        relevance: 'Demonstrates naive retry loop.',
        accuracy: 'Fails to modify prompt context.'
      },
      q13_d: {
        score: 20,
        evidenceLevel: 'weak',
        demonstration: 'Abandons AI completely and fixes manually.',
        relevance: 'Gives up on human-AI collaboration.',
        accuracy: 'Reflects low AI leverage.'
      }
    }
  },

  // Q14: First Question to AI For Real World Problem
  14: {
    questionId: 14,
    title: 'You have an idea for solving a real-world problem. What would you most likely ask AI first?',
    type: 'single_select',
    purpose: 'Evaluates strategic use of AI as an assumption-testing critique partner vs passive generator.',
    capabilityWeights: { usingAI: 0.2, understandingAI: 0.5, solvingWithAI: 1.0, checkingAI: 0.4, adaptingToAI: 0 },
    options: {
      q14_a: {
        score: 100,
        evidenceLevel: 'strong',
        demonstration: 'Leverages AI to challenge assumptions, red-team blind spots, and critique failure modes.',
        relevance: 'Demonstrates top-tier strategic thinking and critical sparring.',
        accuracy: 'Accurately utilizes AI for critical risk analysis.'
      },
      q14_b: {
        score: 80,
        evidenceLevel: 'strong',
        demonstration: 'Uses AI to analyze existing competitor landscape and market benchmarks.',
        relevance: 'Demonstrates structured research usage.',
        accuracy: 'Reflects solid analytical inquiry.'
      },
      q14_c: {
        score: 60,
        evidenceLevel: 'partial',
        demonstration: 'Asks AI for an immediate step-by-step execution plan without testing assumptions.',
        relevance: 'Premature execution without validation.',
        accuracy: 'Reflects action orientation without critical scrutiny.'
      },
      q14_d: {
        score: 30,
        evidenceLevel: 'weak',
        demonstration: 'Asks AI to generate complete solution end-to-end passively.',
        relevance: 'Passive delegation.',
        accuracy: 'Reflects lack of problem framing ownership.'
      }
    }
  },

  // Q15: Assessing If AI Response Is Good Enough
  15: {
    questionId: 15,
    title: 'How do you assess whether an AI response is "good enough"?',
    type: 'single_select',
    purpose: 'Evaluates output validation rigor against requirements and edge cases.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.4, solvingWithAI: 0.5, checkingAI: 1.0, adaptingToAI: 0 },
    options: {
      q15_a: {
        score: 100,
        evidenceLevel: 'strong',
        demonstration: 'Empirical verification against explicit functional requirements and boundary edge cases.',
        relevance: 'Demonstrates rigorous output verification.',
        accuracy: 'Accurately executes quality control.'
      },
      q15_c: {
        score: 70,
        evidenceLevel: 'partial',
        demonstration: 'Asks AI model to self-critique and verify its own output.',
        relevance: 'Uses self-reflection prompting, though lacks independent human validation.',
        accuracy: 'Reflects automated verification technique.'
      },
      q15_b: {
        score: 20,
        evidenceLevel: 'misunderstanding',
        demonstration: 'Accepts output based on superficial plausibility and smooth writing.',
        relevance: 'Plausibility bias without verification.',
        accuracy: 'Inaccurate assessment methodology.'
      },
      q15_d: {
        score: 10,
        evidenceLevel: 'weak',
        demonstration: 'Struggles to evaluate accuracy of AI output.',
        relevance: 'Lacks verification capability.',
        accuracy: 'No evaluation criteria.'
      }
    }
  },

  // Q16: Fact Checking AI Outputs
  16: {
    questionId: 16,
    title: 'How often do you fact-check AI outputs against authoritative documentation or primary sources?',
    type: 'single_select',
    purpose: 'Measures systematic verification frequency against authoritative primary sources.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.3, solvingWithAI: 0, checkingAI: 1.0, adaptingToAI: 0 },
    options: {
      q16_a: {
        score: 100,
        evidenceLevel: 'strong',
        demonstration: 'Consistently fact-checks critical technical decisions against primary documentation.',
        relevance: 'Demonstrates uncompromised verification discipline.',
        accuracy: 'Accurately maintains factual integrity.'
      },
      q16_b: {
        score: 50,
        evidenceLevel: 'partial',
        demonstration: 'Fact-checks selectively only when answers feel counter-intuitive.',
        relevance: 'Intuition-gated verification.',
        accuracy: 'Reflects spot checking.'
      },
      q16_c: {
        score: 20,
        evidenceLevel: 'weak',
        demonstration: 'Rarely fact-checks, assuming models are inherently accurate.',
        relevance: 'High complacency risk.',
        accuracy: 'Inaccurate trust assumptions.'
      },
      q16_d: {
        score: 0,
        evidenceLevel: 'none',
        demonstration: 'Never fact-checks AI outputs.',
        relevance: 'Zero verification.',
        accuracy: 'No evidence.'
      }
    }
  },

  // Q17: Data Privacy & Sensitive Information
  17: {
    questionId: 17,
    title: 'What is your stance on pasting proprietary code or sensitive personal data into public AI chats?',
    type: 'single_select',
    purpose: 'Evaluates security, data sanitization, privacy settings compliance, and risk mitigation.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.5, solvingWithAI: 0, checkingAI: 1.0, adaptingToAI: 0 },
    options: {
      q17_a: {
        score: 100,
        evidenceLevel: 'strong',
        demonstration: 'Strict data sanitization/anonymization and verification of zero-data retention policies.',
        relevance: 'Demonstrates security compliance and enterprise safety mindset.',
        accuracy: 'Accurately mitigates data leak risks.'
      },
      q17_b: {
        score: 45,
        evidenceLevel: 'partial',
        demonstration: 'Inconsistent data sanitization when convenient for speed.',
        relevance: 'Partial security compliance.',
        accuracy: 'Reflects policy gaps.'
      },
      q17_c: {
        score: 10,
        evidenceLevel: 'weak',
        demonstration: 'Pastes sensitive data without concern for privacy policies.',
        relevance: 'High security violation risk.',
        accuracy: 'Ignores data exposure risks.'
      },
      q17_d: {
        score: 0,
        evidenceLevel: 'none',
        demonstration: 'Unaware of public AI model data retention and training policies.',
        relevance: 'No security awareness.',
        accuracy: 'No evidence.'
      }
    }
  },

  // Q18: Human-in-the-Loop Concept
  18: {
    questionId: 18,
    title: 'What best describes "Human-in-the-Loop" decision making?',
    type: 'single_select',
    purpose: 'Evaluates understanding of HITL architecture where humans retain ultimate authority and accountability.',
    capabilityWeights: { usingAI: 0, understandingAI: 1.0, solvingWithAI: 0, checkingAI: 0.8, adaptingToAI: 0 },
    options: {
      q18_a: {
        score: 100,
        evidenceLevel: 'strong',
        demonstration: 'Accurate technical definition: AI proposes options, human retains validation, decision authority, and accountability.',
        relevance: 'Correctly identifies HITL framework.',
        accuracy: 'Factually and conceptually precise.'
      },
      q18_b: {
        score: 35,
        evidenceLevel: 'partial',
        demonstration: 'Confuses HITL with human-on-the-loop passive monitoring of fully autonomous execution.',
        relevance: 'Imprecise conceptual distinction.',
        accuracy: 'Partially inaccurate.'
      },
      q18_c: {
        score: 25,
        evidenceLevel: 'weak',
        demonstration: 'Confuses HITL decision making with post-hoc RLHF rating buttons.',
        relevance: 'Misinterprets architectural scope.',
        accuracy: 'Conceptually flawed.'
      },
      q18_d: {
        score: 0,
        evidenceLevel: 'none',
        demonstration: 'Unfamiliar with HITL concept.',
        relevance: 'No understanding evidence.',
        accuracy: 'No evidence.'
      }
    }
  },

  // Q19: Time Spent Framing User Problem Before AI Solution
  19: {
    questionId: 19,
    title: 'Before asking AI to design a solution, how much time do you spend framing the user problem?',
    type: 'single_select',
    purpose: 'Evaluates thoroughness of human problem definition (personas, constraints, metrics) prior to AI generation.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.4, solvingWithAI: 1.0, checkingAI: 0.5, adaptingToAI: 0 },
    options: {
      q19_a: {
        score: 100,
        evidenceLevel: 'strong',
        demonstration: 'Substantial upfront human framing: user personas, pain points, constraints, success metrics.',
        relevance: 'Demonstrates deep problem framing before prompting.',
        accuracy: 'Accurately structures problem boundaries.'
      },
      q19_b: {
        score: 65,
        evidenceLevel: 'partial',
        demonstration: 'Brief problem framing outlining basic requirements.',
        relevance: 'Demonstrates light problem framing.',
        accuracy: 'Reflects informal requirement listing.'
      },
      q19_c: {
        score: 25,
        evidenceLevel: 'weak',
        demonstration: 'Minimal framing, delegating problem definition to AI.',
        relevance: 'Bypasses human framing stage.',
        accuracy: 'Over-relies on model defaults.'
      },
      q19_d: {
        score: 15,
        evidenceLevel: 'weak',
        demonstration: 'Requests solutions from AI without framing user problems.',
        relevance: 'Unframed prompting.',
        accuracy: 'Reflects reactive generation.'
      }
    }
  },

  // Q20: Ultimate Responsibility For AI Flaws
  20: {
    questionId: 20,
    title: 'When AI generates code or a document for you, who takes ultimate responsibility if there is a flaw?',
    type: 'single_select',
    purpose: 'Evaluates professional accountability and ownership mindset over AI-assisted deliverables.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.3, solvingWithAI: 0, checkingAI: 1.0, adaptingToAI: 0 },
    options: {
      q20_a: {
        score: 100,
        evidenceLevel: 'strong',
        demonstration: 'Full personal ownership and accountability for final products created with AI assistance.',
        relevance: 'Demonstrates uncompromised human responsibility.',
        accuracy: 'Accurately asserts professional liability.'
      },
      q20_b: {
        score: 40,
        evidenceLevel: 'partial',
        demonstration: 'Assumes shared responsibility between human and AI vendor.',
        relevance: 'Dilutes personal accountability.',
        accuracy: 'Inaccurate legal/professional stance.'
      },
      q20_c: {
        score: 10,
        evidenceLevel: 'misunderstanding',
        demonstration: 'Shifts product liability to AI tool vendor.',
        relevance: 'Refuses accountability.',
        accuracy: 'Fundamentally flawed understanding of product ownership.'
      },
      q20_d: {
        score: 0,
        evidenceLevel: 'none',
        demonstration: 'Unaware of liability or ownership considerations.',
        relevance: 'No responsibility awareness.',
        accuracy: 'No evidence.'
      }
    }
  },

  // Q21: Comfort Adapting Workflow to New AI Capabilities
  21: {
    questionId: 21,
    title: 'How comfortable are you adapting your workflow when a major new AI capability is released?',
    type: 'scale',
    purpose: 'Measures adaptiveness, curiosity, and rapid workflow evolution when AI paradigms shift.',
    capabilityWeights: { usingAI: 0.3, understandingAI: 0, solvingWithAI: 0, checkingAI: 0, adaptingToAI: 1.0 },
    scaleScoring: (val: number): OptionScoringDefinition => {
      const map: Record<number, OptionScoringDefinition> = {
        5: { score: 100, evidenceLevel: 'strong', demonstration: 'Eager and rapid experimentation with emerging AI shifts.', relevance: 'High adaptiveness.', accuracy: 'Reflects proactive evolution.' },
        4: { score: 80, evidenceLevel: 'strong', demonstration: 'Comfortable trying new AI capabilities.', relevance: 'Moderate-high adaptiveness.', accuracy: 'Reflects steady adoption.' },
        3: { score: 60, evidenceLevel: 'partial', demonstration: 'Moderate comfort with workflow adaptation.', relevance: 'Average adaptiveness.', accuracy: 'Reflects cautious adoption.' },
        2: { score: 40, evidenceLevel: 'weak', demonstration: 'Hesitant to change established workflows.', relevance: 'Low adaptiveness.', accuracy: 'Reflects inertia.' },
        1: { score: 20, evidenceLevel: 'weak', demonstration: 'Prefers traditional methods, resistant to new AI tools.', relevance: 'Minimal adaptiveness.', accuracy: 'Reflects strong resistance.' }
      };
      return map[val] || map[3];
    }
  },

  // Q22: Approach to Learning Brand-New AI Tool
  22: {
    questionId: 22,
    title: 'How do you approach learning a brand-new AI tool or framework (e.g. LangChain, Cursor, Agentic SDKs)?',
    type: 'single_select',
    purpose: 'Evaluates proactive hands-on project learning vs passive consumption.',
    capabilityWeights: { usingAI: 0.5, understandingAI: 0.3, solvingWithAI: 0, checkingAI: 0, adaptingToAI: 1.0 },
    options: {
      q22_a: {
        score: 100,
        evidenceLevel: 'strong',
        demonstration: 'Builds hands-on project immediately while reading official documentation.',
        relevance: 'Demonstrates active project-based learning.',
        accuracy: 'Accurately executes rapid skill acquisition.'
      },
      q22_b: {
        score: 65,
        evidenceLevel: 'partial',
        demonstration: 'Watches video tutorials and overview articles first.',
        relevance: 'Demonstrates passive learning before trying.',
        accuracy: 'Reflects theoretical introduction.'
      },
      q22_c: {
        score: 25,
        evidenceLevel: 'weak',
        demonstration: 'Waits for school or employer mandates before learning.',
        relevance: 'Reactive learning posture.',
        accuracy: 'Reflects low self-directed initiative.'
      },
      q22_d: {
        score: 10,
        evidenceLevel: 'weak',
        demonstration: 'Rarely explores new technical frameworks.',
        relevance: 'Low technical exploration.',
        accuracy: 'Reflects static skill set.'
      }
    }
  },

  // Q23: Biggest Concern About AI (ATTITUDE / REASONING QUESTION)
  23: {
    questionId: 23,
    title: 'What is your biggest concern about the rapid rise of AI in your field?',
    type: 'single_select',
    isAttitude: true,
    purpose: 'Evaluates analytical awareness of structural AI shifts without penalizing or artificially inflating skill scores based on concern.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.4, solvingWithAI: 0, checkingAI: 0.3, adaptingToAI: 0.5 },
    options: {
      q23_b: {
        score: 85,
        evidenceLevel: 'strong',
        demonstration: 'Deep awareness of cognitive deskilling risk and core skill atrophy.',
        relevance: 'Demonstrates highly nuanced critical awareness.',
        accuracy: 'Accurately identifies human skill protection need.'
      },
      q23_a: {
        score: 75,
        evidenceLevel: 'partial',
        demonstration: 'Awareness of skill obsolescence and urgency to stay current.',
        relevance: 'Demonstrates motivation to adapt.',
        accuracy: 'Reflects awareness of fast pace.'
      },
      q23_c: {
        score: 70,
        evidenceLevel: 'partial',
        demonstration: 'Awareness of labor market displacement and role restructuring.',
        relevance: 'Demonstrates realistic macro economic awareness.',
        accuracy: 'Reflects industry shift recognition.'
      },
      q23_d: {
        score: 60,
        evidenceLevel: 'partial',
        demonstration: 'Pure optimistic outlook without major risk concerns.',
        relevance: 'Demonstrates positive attitude, but less critical risk analysis.',
        accuracy: 'Reflects optimistic stance.'
      }
    }
  },

  // Q24: AI Skills Want to Master (PREFERENCE / GOAL QUESTION)
  24: {
    questionId: 24,
    title: 'Which AI skills do you most want to master over the next 6 months?',
    type: 'multi_select',
    isPreference: true,
    purpose: 'Captures learner preference for target learning goals. MUST NOT directly inflate capability scores.',
    capabilityWeights: { usingAI: 0, understandingAI: 0, solvingWithAI: 0, checkingAI: 0, adaptingToAI: 0 },
    evaluateMultiSelect: (selectedIds: string[]): OptionScoringDefinition => {
      return {
        score: 0, // 0 capability score contribution — preference only!
        evidenceLevel: 'preference',
        demonstration: `Selected learning preference skills: ${selectedIds.join(', ')}.`,
        relevance: 'Recorded for Clarity, Focus, and Wallet personalization.',
        accuracy: 'Does not inflate current capability score.'
      };
    }
  },

  // Q25: AI Thinking Lab — User vs Adapter Reflection (OPEN ENDED)
  25: {
    questionId: 25,
    title: 'AI THINKING LAB: What separates someone who merely uses AI from someone who adapts to AI?',
    type: 'long_text',
    purpose: 'Evaluates meta-cognition, understanding of paradigm shifts, workflow redesign, and human-AI co-evolution.',
    capabilityWeights: { usingAI: 0, understandingAI: 0.5, solvingWithAI: 0.3, checkingAI: 0, adaptingToAI: 1.0 },
    deterministicTextFallback: (text: string): OptionScoringDefinition => {
      const clean = text ? text.trim() : '';
      if (!clean || clean.length < 5) {
        return {
          score: 0,
          evidenceLevel: 'none',
          demonstration: 'No text entered.',
          relevance: 'No response provided.',
          accuracy: 'No evidence.'
        };
      }
      if (clean.length < 15 && ['idk', 'test', 'asdf', 'nothing', 'na', 'none'].includes(clean.toLowerCase())) {
        return {
          score: 0,
          evidenceLevel: 'none',
          demonstration: 'Non-responsive or placeholder text.',
          relevance: 'Lacks actual reflection.',
          accuracy: 'No valid evidence.'
        };
      }

      const lower = clean.toLowerCase();
      let score = 30;
      const strengths: string[] = [];

      if (lower.includes('workflow') || lower.includes('redesign') || lower.includes('integrate') || lower.includes('system')) {
        score += 20;
        strengths.push('Workflow redesign perspective');
      }
      if (lower.includes('mindset') || lower.includes('understand') || lower.includes('limit') || lower.includes('critical') || lower.includes('think')) {
        score += 20;
        strengths.push('Meta-cognitive & critical thinking awareness');
      }
      if (lower.includes('continuous') || lower.includes('learn') || lower.includes('evolve') || lower.includes('experiment') || lower.includes('change')) {
        score += 20;
        strengths.push('Continuous adaptation & learning growth mindset');
      }

      score = Math.min(95, Math.max(15, score));
      let level: 'strong' | 'partial' | 'weak' = 'weak';
      if (score >= 70) level = 'strong';
      else if (score >= 40) level = 'partial';

      return {
        score,
        evidenceLevel: level,
        demonstration: `Evaluated reflection on AI adaptation vs usage. Identified themes: ${strengths.join(', ') || 'basic reflection'}.`,
        relevance: 'Evaluated raw text reflection against rubric.',
        accuracy: 'Deterministic fallback evaluation based strictly on text content.'
      };
    }
  }
};

/**
 * Single question scoring function
 */
export function scoreQuestion(
  questionId: number,
  rawAnswer: any,
  anthropicEvaluation?: { score: number; confidence: number; reason: string; strengths?: string[]; gaps?: string[]; evidence?: string[] }
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

  // Preference question handling (e.g. Q24)
  if (rubric.isPreference) {
    const selected = Array.isArray(rawAnswer) ? rawAnswer : [];
    return {
      questionId,
      questionType: rubric.type,
      rawAnswer,
      score: 0,
      confidence: 1.0,
      evidenceLevel: 'preference',
      scoringMethod: 'question_rubric',
      reason: `Q${questionId} is a learning preference question (${selected.length} items selected). It influences personalization without inflating capability scores.`
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
        score: anthropicEvaluation.score,
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
        confidence: textStr.trim().length > 10 ? 0.7 : 0.2,
        evidenceLevel: fallback.evidenceLevel,
        scoringMethod: 'deterministic_fallback',
        reason: fallback.demonstration,
        strengths: [],
        gaps: [],
        anthropicStatus: 'unavailable'
      };
    }
  }

  // Multi-select questions (e.g. Q2)
  if (rubric.type === 'multi_select' && rubric.evaluateMultiSelect) {
    const selected = Array.isArray(rawAnswer) ? rawAnswer : [];
    const evalRes = rubric.evaluateMultiSelect(selected);
    return {
      questionId,
      questionType: rubric.type,
      rawAnswer,
      score: evalRes.score,
      confidence: selected.length > 0 ? 0.95 : 0.1,
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
  openEndedEvaluations?: Record<number | string, { score: number; confidence: number; reason: string; strengths?: string[]; gaps?: string[]; evidence?: string[] }>
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
    let weightedSum = 0;
    let totalWeight = 0;
    const contributingQuestionIds: number[] = [];
    const questionScores: Record<number, number> = {};
    let totalConfidenceSum = 0;
    let validQuestionCount = 0;

    for (let qId = 1; qId <= 25; qId++) {
      const rubric = ASSESSMENT_RUBRICS[qId];
      if (!rubric) continue;
      const weight = rubric.capabilityWeights[capKey] || 0;
      if (weight > 0) {
        contributingQuestionIds.push(qId);
        const qRes = questionResults[qId];
        questionScores[qId] = qRes.score;

        weightedSum += qRes.score * weight;
        totalWeight += weight;
        totalConfidenceSum += qRes.confidence;
        if (qRes.score > 0) validQuestionCount++;
      }
    }

    const capScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
    const avgConfidence = contributingQuestionIds.length > 0 ? totalConfidenceSum / contributingQuestionIds.length : 0;

    let evidenceStatus: 'robust' | 'moderate' | 'limited' = 'limited';
    if (validQuestionCount >= 3 && avgConfidence >= 0.7) {
      evidenceStatus = 'robust';
    } else if (validQuestionCount >= 1 && avgConfidence >= 0.4) {
      evidenceStatus = 'moderate';
    }

    capabilities[capKey] = {
      capabilityKey: capKey,
      capabilityName: CAPABILITY_NAMES[capKey],
      score: capScore,
      confidence: Math.round(avgConfidence * 100) / 100,
      evidenceStatus,
      contributingQuestionIds,
      questionScores,
      scoringMethod: 'explicit_question_rubric_v2',
      rubricVersion: '2.0.0-ainova'
    };
  });

  // Calculate Overall AI Score as unweighted or equal-weighted mean of the 5 Capabilities
  const capScoresList = capabilityKeys.map((k) => capabilities[k].score);
  const overallScore = Math.round(capScoresList.reduce((a, b) => a + b, 0) / capScoresList.length);

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
    capabilities,
    legacyScores,
    questionResults,
    strongestSkill,
    roomToGrow,
    evaluatedAt: new Date().toISOString(),
    rubricVersion: '2.0.0-ainova'
  };
}
