export interface QuestionOption {
  id: string;
  label: string;
  sublabel?: string;
  icon?: string;
}

export interface QuestionData {
  id: number;
  levelId: number;
  levelTitle: string;
  challengeNumber: number; // 1 to 5 per level
  title: string;
  subtitle?: string;
  type: 'single_select' | 'multi_select' | 'scale' | 'long_text';
  options?: QuestionOption[];
  minScale?: number;
  maxScale?: number;
  minLabel?: string;
  maxLabel?: string;
  maxSelections?: number;
  placeholder?: string;
  labNotice?: string;
}

export interface QuestLevel {
  id: number; // 1 to 5
  title: string;
  subtitle: string;
  icon: string;
  challengeIds: number[];
  mentorQuote: string;
  completionMessage: string;
}

export const QUEST_LEVELS: QuestLevel[] = [
  {
    id: 1,
    title: 'AI Exposure',
    subtitle: 'Challenges 1–5: Discovering your AI workflow integration & frequency',
    icon: '⚡',
    challengeIds: [1, 2, 3, 4, 5],
    mentorQuote: "I'm getting to know how you work with AI in your daily routine.",
    completionMessage: "Good start! I'm beginning to understand how you currently work with AI."
  },
  {
    id: 2,
    title: 'AI Fluency',
    subtitle: 'Challenges 6–10: Testing your mental model of AI capability & mechanics',
    icon: '🧠',
    challengeIds: [6, 7, 8, 9, 10],
    mentorQuote: "Understanding how AI works under the hood unlocks smarter prompting.",
    completionMessage: "Great progress! I'm starting to see how you conceptualize AI model boundaries."
  },
  {
    id: 3,
    title: 'AI Thinking',
    subtitle: 'Challenges 11–15: AI Thinking Labs & problem-framing challenges',
    icon: '🧪',
    challengeIds: [11, 12, 13, 14, 15],
    mentorQuote: "How you frame prompts reveals your core problem-solving strategy.",
    completionMessage: "Impressive! Your raw prompt strategies give deep insight into your AI-thinking style."
  },
  {
    id: 4,
    title: 'Human Judgment',
    subtitle: 'Challenges 16–20: Verification, ethics, and human-in-the-loop oversight',
    icon: '⚖️',
    challengeIds: [16, 17, 18, 19, 20],
    mentorQuote: "True AI mastery combines high automation with uncompromised human judgment.",
    completionMessage: "Almost there! Your approach to human oversight and ethics is now clear."
  },
  {
    id: 5,
    title: 'Innovation Readiness',
    subtitle: 'Challenges 21–25: Growth mindset & adaptiveness to emerging AI shifts',
    icon: '🚀',
    challengeIds: [21, 22, 23, 24, 25],
    mentorQuote: "Final stretch! Exploring how fast you adapt as AI tools evolve.",
    completionMessage: "Quest Complete! Your multi-dimensional baseline is ready for analysis."
  }
];

export const ASSESSMENT_QUESTIONS: QuestionData[] = [
  // LEVEL 01 — AI EXPOSURE (Challenges 1–5)
  {
    id: 1,
    levelId: 1,
    levelTitle: 'AI Exposure',
    challengeNumber: 1,
    title: 'How frequently do you currently use AI tools in your work or study?',
    type: 'single_select',
    options: [
      { id: 'q1_a', label: 'Several times a day', sublabel: 'AI is integrated into my daily core workflow', icon: '⚡' },
      { id: 'q1_b', label: 'Once or twice a day', sublabel: 'I consult AI regularly for routine tasks', icon: '◷' },
      { id: 'q1_c', label: 'A few times a week', sublabel: 'Used for specific tasks or occasional assistance', icon: '📅' },
      { id: 'q1_d', label: 'Occasionally', sublabel: 'Used a few times a month when stuck', icon: '🔍' },
      { id: 'q1_e', label: 'Rarely or Never', sublabel: 'I do not currently rely on AI tools', icon: '🌱' }
    ]
  },
  {
    id: 2,
    levelId: 1,
    levelTitle: 'AI Exposure',
    challengeNumber: 2,
    title: 'Which AI models or tools do you regularly interact with?',
    subtitle: 'Select all tools you have hands-on experience with',
    type: 'multi_select',
    options: [
      { id: 'q2_a', label: 'ChatGPT (OpenAI / GPT-4o)', icon: '🤖' },
      { id: 'q2_b', label: 'Claude (Anthropic)', icon: '🧠' },
      { id: 'q2_c', label: 'Google Gemini', icon: '✨' },
      { id: 'q2_d', label: 'Cursor / GitHub Copilot / Coding Assistants', icon: '💻' },
      { id: 'q2_e', label: 'Midjourney / DALL-E / Visual AI', icon: '🎨' },
      { id: 'q2_f', label: 'Custom APIs / Local LLMs (Ollama / Llama)', icon: '⚙️' }
    ]
  },
  {
    id: 3,
    levelId: 1,
    levelTitle: 'AI Exposure',
    challengeNumber: 3,
    title: 'When starting a new assignment or project, what is your first instinct?',
    type: 'single_select',
    options: [
      { id: 'q3_a', label: 'Open an AI tool immediately to brainstorm, outline, or generate initial ideas', icon: '🚀' },
      { id: 'q3_b', label: 'Think through the problem manually first, then use AI to expand or refine', icon: '🧩' },
      { id: 'q3_c', label: 'Search traditional search engines (Google, StackOverflow) first', icon: '🔎' },
      { id: 'q3_d', label: 'Work entirely independently and only turn to AI if I hit a severe roadblock', icon: '🛑' }
    ]
  },
  {
    id: 4,
    levelId: 1,
    levelTitle: 'AI Exposure',
    challengeNumber: 4,
    title: 'If AI tools suddenly became unavailable for a week, how would it impact your productivity?',
    type: 'scale',
    minScale: 1,
    maxScale: 5,
    minLabel: 'Struggle significantly — My workflow heavily depends on AI',
    maxLabel: 'Continue confidently — My workflow remains unaffected'
  },
  {
    id: 5,
    levelId: 1,
    levelTitle: 'AI Exposure',
    challengeNumber: 5,
    title: 'What best describes your primary goal when using AI?',
    type: 'single_select',
    options: [
      { id: 'q5_a', label: 'Speed & Task Completion', sublabel: 'Getting work done faster and saving time', icon: '⏱️' },
      { id: 'q5_b', label: 'Learning & Understanding', sublabel: 'Explaining complex concepts and learning new topics', icon: '💡' },
      { id: 'q5_c', label: 'Ideation & Creation', sublabel: 'Unlocking new perspectives, designs, or technical architectures', icon: '🎨' },
      { id: 'q5_d', label: 'Delegation & Automation', sublabel: 'Offloading repetitive execution tasks', icon: '🤖' }
    ]
  },

  // LEVEL 02 — AI FLUENCY (Challenges 6–10)
  {
    id: 6,
    levelId: 2,
    levelTitle: 'AI Fluency',
    challengeNumber: 1,
    title: 'How would you explain how Large Language Models (LLMs) generate answers?',
    type: 'single_select',
    options: [
      { id: 'q6_a', label: 'They search a real-time database of factually verified facts like Google', icon: '🌐' },
      { id: 'q6_b', label: 'They predict the most probable next token/word based on patterns learned during training', icon: '📊' },
      { id: 'q6_c', label: 'They possess conscious reasoning ability and verify truth before answering', icon: '🧠' },
      { id: 'q6_d', label: 'I am not sure how they work under the hood', icon: '❓' }
    ]
  },
  {
    id: 7,
    levelId: 2,
    levelTitle: 'AI Fluency',
    challengeNumber: 2,
    title: 'Have you ever encountered an AI "hallucination" (a confident but false answer)?',
    type: 'single_select',
    options: [
      { id: 'q7_a', label: 'Yes, frequently — I systematically cross-verify critical AI outputs', icon: '🛡️' },
      { id: 'q7_b', label: 'Yes, occasionally — I notice when something looks suspicious', icon: '👁️' },
      { id: 'q7_c', label: 'No, I generally trust that top AI models provide accurate information', icon: '🤝' },
      { id: 'q7_d', label: 'I am unsure what a hallucination means in AI context', icon: '❓' }
    ]
  },
  {
    id: 8,
    levelId: 2,
    levelTitle: 'AI Fluency',
    challengeNumber: 3,
    title: 'What does "Context Window" mean when working with an AI model?',
    type: 'single_select',
    options: [
      { id: 'q8_a', label: 'The maximum amount of text/information the model can hold in memory during a chat session', icon: '📦' },
      { id: 'q8_b', label: 'The visual size of the browser chat window', icon: '💻' },
      { id: 'q8_c', label: 'The speed at which the AI streams text back to the user', icon: '⚡' },
      { id: 'q8_d', label: 'I have heard the term but am not sure of its exact technical meaning', icon: '❓' }
    ]
  },
  {
    id: 9,
    levelId: 2,
    levelTitle: 'AI Fluency',
    challengeNumber: 4,
    title: 'How do you adjust your prompting style when you need structured, precise output vs creative brainstorming?',
    type: 'single_select',
    options: [
      { id: 'q9_a', label: 'I specify exact formats (JSON/Markdown schemas), rules, constraints, and system parameters', icon: '🎯' },
      { id: 'q9_b', label: 'I write slightly longer prompts with more details', icon: '📝' },
      { id: 'q9_c', label: 'I use the same prompting style for all tasks', icon: '🔁' },
      { id: 'q9_d', label: 'I rely on the model to figure out what layout I need', icon: '🔮' }
    ]
  },
  {
    id: 10,
    levelId: 2,
    levelTitle: 'AI Fluency',
    challengeNumber: 5,
    title: 'What is Retrieval-Augmented Generation (RAG)?',
    type: 'single_select',
    options: [
      { id: 'q10_a', label: 'Combining an LLM with external document search so it answers using specific private data', icon: '📚' },
      { id: 'q10_b', label: 'Re-training an AI model from scratch on new datasets', icon: '🏋️' },
      { id: 'q10_c', label: 'A design tool for generating vector artwork', icon: '🎨' },
      { id: 'q10_d', label: 'I am unfamiliar with RAG', icon: '❓' }
    ]
  },

  // LEVEL 03 — AI THINKING (Challenges 11–15)
  {
    id: 11,
    levelId: 3,
    levelTitle: 'AI Thinking',
    challengeNumber: 1,
    title: 'AI THINKING LAB: Designing Software Architecture',
    subtitle: 'Imagine you have an idea for a software product and open ChatGPT, Gemini, or Claude right now. What would you actually type?',
    type: 'long_text',
    placeholder: 'Type your raw, exact prompt here...',
    labNotice: "Don't explain your prompt. Write what you would actually enter. Your raw prompt serves as authentic evidence of problem framing and AI-thinking behavior."
  },
  {
    id: 12,
    levelId: 3,
    levelTitle: 'AI Thinking',
    challengeNumber: 2,
    title: 'AI THINKING LAB: Building a Working Prototype (MVP)',
    subtitle: 'Now imagine you want the AI to write code or build a working prototype/MVP for your idea. What prompt would you enter?',
    type: 'long_text',
    placeholder: 'Type your raw prototype generation prompt here...',
    labNotice: 'Write what you would actually type into the prompt box.'
  },
  {
    id: 13,
    levelId: 3,
    levelTitle: 'AI Thinking',
    challengeNumber: 3,
    title: 'When an AI model gives you an incomplete or slightly incorrect answer, what do you do?',
    type: 'single_select',
    options: [
      { id: 'q13_a', label: 'Refine the prompt by giving explicit constraints, examples, or breaking the task into sub-steps', icon: '🛠️' },
      { id: 'q13_b', label: 'Ask the same question again or hit "Regenerate"', icon: '🔄' },
      { id: 'q13_c', label: 'Switch to a different AI model or search engine', icon: '🔀' },
      { id: 'q13_d', label: 'Abandon the AI approach and write/fix it manually', icon: '✋' }
    ]
  },
  {
    id: 14,
    levelId: 3,
    levelTitle: 'AI Thinking',
    challengeNumber: 4,
    title: 'You have an idea for solving a real-world problem. What would you most likely ask AI first?',
    type: 'single_select',
    options: [
      { id: 'q14_a', label: 'Ask AI to challenge my assumptions and critique why the idea might fail', icon: '🧠' },
      { id: 'q14_b', label: 'Ask AI to list 5 existing competitors or alternative solutions', icon: '🔎' },
      { id: 'q14_c', label: 'Ask AI to generate a step-by-step execution plan immediately', icon: '📋' },
      { id: 'q14_d', label: 'Ask AI to write the complete solution for me', icon: '⚡' }
    ]
  },
  {
    id: 15,
    levelId: 3,
    levelTitle: 'AI Thinking',
    challengeNumber: 5,
    title: 'How do you assess whether an AI response is "good enough"?',
    type: 'single_select',
    options: [
      { id: 'q15_a', label: 'I test/verify the output against explicit requirements and edge cases', icon: '🧪' },
      { id: 'q15_b', label: 'If it reads well and looks plausible at a glance, I accept it', icon: '👀' },
      { id: 'q15_c', label: 'I ask the AI to self-critique its own output', icon: '🪞' },
      { id: 'q15_d', label: 'I struggle to know if an AI output is fully accurate', icon: '❓' }
    ]
  },

  // LEVEL 04 — HUMAN JUDGMENT (Challenges 16–20)
  {
    id: 16,
    levelId: 4,
    levelTitle: 'Human Judgment',
    challengeNumber: 1,
    title: 'How often do you fact-check AI outputs against authoritative documentation or primary sources?',
    type: 'single_select',
    options: [
      { id: 'q16_a', label: 'Always for critical technical decisions, code, or factual claims', icon: '🔒' },
      { id: 'q16_b', label: 'Only when the answer seems surprising or counter-intuitive', icon: '🤔' },
      { id: 'q16_c', label: 'Rarely — I assume leading models are usually accurate', icon: '⏩' },
      { id: 'q16_d', label: 'Never', icon: '❌' }
    ]
  },
  {
    id: 17,
    levelId: 4,
    levelTitle: 'Human Judgment',
    challengeNumber: 2,
    title: 'What is your stance on pasting proprietary code or sensitive personal data into public AI chats?',
    type: 'single_select',
    options: [
      { id: 'q17_a', label: 'Strictly sanitize or anonymize data first, checking privacy settings & zero-retention policies', icon: '🛡️' },
      { id: 'q17_b', label: 'I avoid sensitive data when I remember, but sometimes paste snippets for speed', icon: '⚠️' },
      { id: 'q17_c', label: 'I paste whatever is needed to get the answer without worrying', icon: '🔓' },
      { id: 'q17_d', label: 'I was unaware that public AI models retain data for training', icon: '❓' }
    ]
  },
  {
    id: 18,
    levelId: 4,
    levelTitle: 'Human Judgment',
    challengeNumber: 3,
    title: 'What best describes "Human-in-the-Loop" decision making?',
    type: 'single_select',
    options: [
      { id: 'q18_a', label: 'AI proposes options or drafts, but a human retains ultimate judgment, validation, and accountability', icon: '🧑‍✈️' },
      { id: 'q18_b', label: 'A human monitors AI while it executes everything autonomously without intervention', icon: '👁️' },
      { id: 'q18_c', label: 'Humans providing thumbs up / thumbs down feedback on chat answers', icon: '👍' },
      { id: 'q18_d', label: 'I am unfamiliar with the concept', icon: '❓' }
    ]
  },
  {
    id: 19,
    levelId: 4,
    levelTitle: 'Human Judgment',
    challengeNumber: 4,
    title: 'Before asking AI to design a solution, how much time do you spend framing the user problem?',
    type: 'single_select',
    options: [
      { id: 'q19_a', label: 'Substantial time defining user personas, constraints, pain points, and success metrics', icon: '🎯' },
      { id: 'q19_b', label: 'A few minutes outlining key requirements', icon: '⏱️' },
      { id: 'q19_c', label: 'Very little time — I expect AI to define the problem for me', icon: '⚡' },
      { id: 'q19_d', label: 'I ask AI for solutions without framing the problem first', icon: '🚀' }
    ]
  },
  {
    id: 20,
    levelId: 4,
    levelTitle: 'Human Judgment',
    challengeNumber: 5,
    title: 'When AI generates code or a document for you, who takes ultimate responsibility if there is a flaw?',
    type: 'single_select',
    options: [
      { id: 'q20_a', label: 'I do — AI is an assistant; I own the final product and its consequences', icon: '👤' },
      { id: 'q20_b', label: 'Shared responsibility between me and the AI vendor', icon: '🤝' },
      { id: 'q20_c', label: 'The AI tool vendor', icon: '🤖' },
      { id: 'q20_d', label: 'I have not thought about liability or ownership', icon: '❓' }
    ]
  },

  // LEVEL 05 — INNOVATION READINESS (Challenges 21–25)
  {
    id: 21,
    levelId: 5,
    levelTitle: 'Innovation Readiness',
    challengeNumber: 1,
    title: 'How comfortable are you adapting your workflow when a major new AI capability is released?',
    type: 'scale',
    minScale: 1,
    maxScale: 5,
    minLabel: 'Hesitant — I prefer sticking to established traditional methods',
    maxLabel: 'Eager — I rapidly experiment and integrate new capabilities'
  },
  {
    id: 22,
    levelId: 5,
    levelTitle: 'Innovation Readiness',
    challengeNumber: 2,
    title: 'How do you approach learning a brand-new AI tool or framework (e.g. LangChain, Cursor, Agentic SDKs)?',
    type: 'single_select',
    options: [
      { id: 'q22_a', label: 'Build a small hands-on project immediately while reading official documentation', icon: '🛠️' },
      { id: 'q22_b', label: 'Watch video tutorials or read overview articles first', icon: '📺' },
      { id: 'q22_c', label: 'Wait until my school/company mandates or teaches it', icon: '⏳' },
      { id: 'q22_d', label: 'I rarely explore new technical frameworks', icon: '🔒' }
    ]
  },
  {
    id: 23,
    levelId: 5,
    levelTitle: 'Innovation Readiness',
    challengeNumber: 3,
    title: 'What is your biggest concern about the rapid rise of AI in your field?',
    type: 'single_select',
    options: [
      { id: 'q23_a', label: 'Falling behind if I do not master AI capabilities fast enough', icon: '📉' },
      { id: 'q23_b', label: 'Over-reliance leading to atrophy of core human skills and critical thinking', icon: '🧠' },
      { id: 'q23_c', label: 'Job displacement or changing skill demands', icon: '⚡' },
      { id: 'q23_d', label: 'I have no major concerns — I view AI purely as an opportunity', icon: '🌟' }
    ]
  },
  {
    id: 24,
    levelId: 5,
    levelTitle: 'Innovation Readiness',
    challengeNumber: 4,
    title: 'Which AI skills do you most want to master over the next 6 months?',
    subtitle: 'Select up to 3 priority areas',
    type: 'multi_select',
    maxSelections: 3,
    options: [
      { id: 'q24_a', label: 'Advanced Prompting & Chain-of-Thought Design', icon: '✍️' },
      { id: 'q24_b', label: 'Autonomous Agentic Workflows & Tool Calling', icon: '🤖' },
      { id: 'q24_c', label: 'RAG & Vector Database Search Architecture', icon: '🗂️' },
      { id: 'q24_d', label: 'AI Product Strategy & Design Thinking', icon: '🎯' },
      { id: 'q24_e', label: 'AI Safety, Ethics, and Evaluation Frameworks', icon: '🛡️' },
      { id: 'q24_f', label: 'Fine-Tuning & Open-Source LLMs (Llama/Mistral)', icon: '⚙️' }
    ]
  },
  {
    id: 25,
    levelId: 5,
    levelTitle: 'Innovation Readiness',
    challengeNumber: 5,
    title: 'AI THINKING LAB: What separates someone who merely uses AI from someone who adapts to AI?',
    subtitle: 'Share your authentic reflection in your own words',
    type: 'long_text',
    placeholder: 'Write your thoughts on what differentiates an AI user from an AI adapter...',
    labNotice: 'Preserve your raw reflection. This provides evidence of self-awareness and growth mindset.'
  }
];
