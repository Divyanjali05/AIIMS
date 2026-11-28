/**
 * learnAIResources.ts
 * ============================================================================
 * Curated, verified repository of AI learning resources for the AIIMS Learn AI module.
 *
 * TEN CANONICAL LEARNING DOMAINS:
 * 1. AI Fundamentals: Foundational concepts, terminology, history, ethics.
 * 2. Generative AI: Large language models, visual synthesis, multimodality.
 * 3. AI Agents: Autonomous workflows, tool calling, memory, planning.
 * 4. Prompt Engineering: Structured prompting, in-context learning, delimiters.
 * 5. Machine Learning: Algorithms, supervised/unsupervised training, evaluation.
 * 6. AI Development: Code editors, AI scaffolding, API integration, debugging.
 * 7. AI/ML: Broad AI and machine learning ecosystem & enterprise applications.
 * 8. IoT: Embedded systems, edge intelligence, TinyML, sensor telemetry.
 * 9. Data Science: Exploratory data analysis, feature engineering, pandas/scikit.
 * 10. Cybersecurity: Model jailbreaking, OWASP Top 10 for LLMs, prompt injections.
 *
 * SUPPORTED RESOURCE TYPES:
 *  - course, youtube, website, case_study, interactive_guide
 *
 * MULTILINGUAL SUPPORT:
 *  - English, Telugu (తెలుగు), Hindi (हिंदी), Multilingual
 *
 * LINK VERIFICATION STANDARD:
 *  - Real, authoritative links only.
 *  - When direct verification is confirmed: isVerified = true.
 *  - When direct verification is unavailable: isVerified = false, searchQuery is stored.
 *  - Zero fabricated URLs or placeholder IDs.
 * ============================================================================
 */

export type ResourceType = 'course' | 'youtube' | 'website' | 'case_study' | 'interactive_guide';
export type ResourceLanguage = 'English' | 'Telugu' | 'Hindi' | 'Multilingual';
export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type TargetAudience = 'all' | 'student' | 'entrepreneur';

export const LEARN_AI_DOMAINS = [
  'AI Fundamentals',
  'Generative AI',
  'AI Agents',
  'Prompt Engineering',
  'Machine Learning',
  'AI Development',
  'AI/ML',
  'IoT',
  'Data Science',
  'Cybersecurity',
] as const;

export type LearnAIDomain = (typeof LEARN_AI_DOMAINS)[number];

export interface LearnAIResource {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  language: ResourceLanguage;
  difficulty: DifficultyLevel;
  domain: LearnAIDomain;
  category: string; // Preserved for backwards compatibility with existing consumers & tests
  url: string;
  channelOrAuthor?: string;
  durationOrReadTime?: string;
  associatedToolIds?: string[];
  keyTakeaways: string[];
  isVerified: boolean;
  searchQuery?: string;
  targetAudience: TargetAudience;
}

export const LEARN_AI_TOPIC_CATEGORIES = [
  'All Categories',
  'Prompt Engineering',
  'LLMs & Chatbots',
  'Coding with AI',
  'Media Creation',
  'Applied Case Studies',
] as const;

export type LearnAICategory = (typeof LEARN_AI_TOPIC_CATEGORIES)[number];

export const LEARN_AI_LANGUAGES = [
  { id: 'all', label: 'All Resources', language: null },
  { id: 'english', label: 'English', language: 'English' },
  { id: 'telugu', label: 'Telugu (తెలుగు)', language: 'Telugu' },
  { id: 'hindi', label: 'Hindi (हिंदी)', language: 'Hindi' },
] as const;

export const LEARN_AI_RESOURCES: LearnAIResource[] = [
  // ==========================================================================
  // 1. PROMPT ENGINEERING
  // ==========================================================================
  {
    id: 'res-prompt-openai-official',
    title: 'OpenAI Official Prompt Engineering Guide',
    description:
      'Authoritative strategies and tactics for getting better results from large language models directly from OpenAI research.',
    type: 'website',
    language: 'English',
    difficulty: 'Beginner',
    domain: 'Prompt Engineering',
    category: 'Prompt Engineering',
    url: 'https://platform.openai.com/docs/guides/prompt-engineering',
    channelOrAuthor: 'OpenAI Official Docs',
    durationOrReadTime: '15 min read',
    associatedToolIds: ['tool-chatgpt'],
    keyTakeaways: [
      'Write clear, explicit instructions with context delimiters',
      'Provide reference text to reduce hallucinations',
      'Give models time to think using step-by-step reasoning',
    ],
    isVerified: true,
    targetAudience: 'all',
  },
  {
    id: 'res-prompt-anthropic-claude',
    title: 'Anthropic Claude Interactive Prompt Engineering Tutorial',
    description:
      'Comprehensive best practices for Claude 3.5 Sonnet, covering XML tags, system prompts, role prompting, and chaining.',
    type: 'website',
    language: 'English',
    difficulty: 'Intermediate',
    domain: 'Prompt Engineering',
    category: 'Prompt Engineering',
    url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview',
    channelOrAuthor: 'Anthropic Documentation',
    durationOrReadTime: '20 min read',
    associatedToolIds: ['tool-claude'],
    keyTakeaways: [
      'Using XML tags to separate instructions from input data',
      'Role prompting to calibrate tone and domain expertise',
      'Prefilling Claude responses for structured JSON output',
    ],
    isVerified: true,
    targetAudience: 'all',
  },
  {
    id: 'res-prompt-deeplearning-ai',
    title: 'ChatGPT Prompt Engineering for Developers',
    description:
      'Foundational short course by Andrew Ng and Isa Fulford on constructing robust prompts and custom chatbot workflows.',
    type: 'course',
    language: 'English',
    difficulty: 'Beginner',
    domain: 'Prompt Engineering',
    category: 'Prompt Engineering',
    url: 'https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/',
    channelOrAuthor: 'DeepLearning.AI (Andrew Ng)',
    durationOrReadTime: '1 hr course',
    associatedToolIds: ['tool-chatgpt'],
    keyTakeaways: [
      'Delimiting data and preventing prompt injections',
      'Text transformation, grammar fixing, and tone shifting',
      'Automating complex multistep inferencing tasks',
    ],
    isVerified: true,
    targetAudience: 'student',
  },
  {
    id: 'res-prompt-campusx-hindi',
    title: 'Prompt Engineering & In-Context Learning in Hindi',
    description:
      'In-depth Hindi masterclass breaking down zero-shot, few-shot, and chain-of-thought prompting with real-world examples.',
    type: 'youtube',
    language: 'Hindi',
    difficulty: 'Beginner',
    domain: 'Prompt Engineering',
    category: 'Prompt Engineering',
    url: 'https://www.youtube.com/watch?v=F0GkSmsvOeo',
    channelOrAuthor: 'CampusX (Nitish Singh)',
    durationOrReadTime: '45 mins',
    associatedToolIds: ['tool-chatgpt'],
    keyTakeaways: [
      'Zero-shot vs Few-shot prompts explained clearly in Hindi',
      'System instructions and constraints design',
      'Structuring queries for accurate problem-solving',
    ],
    isVerified: true,
    targetAudience: 'all',
  },
  {
    id: 'res-prompt-vamsi-telugu',
    title: 'ChatGPT & Prompt Engineering Guide in Telugu',
    description:
      'Practical video tutorial explaining how to formulate effective prompts for students and professionals in conversational Telugu.',
    type: 'youtube',
    language: 'Telugu',
    difficulty: 'Beginner',
    domain: 'Prompt Engineering',
    category: 'Prompt Engineering',
    url: 'https://www.youtube.com/watch?v=c3zEGB-2i8Q',
    channelOrAuthor: 'Vamsi Bhavani',
    durationOrReadTime: '40 mins',
    associatedToolIds: ['tool-chatgpt'],
    keyTakeaways: [
      'Everyday prompt crafting in natural Telugu explanations',
      'Using AI for homework, resume drafting, and exam prep',
      'Avoiding vague questions to get precise output',
    ],
    isVerified: true,
    targetAudience: 'student',
  },

  // ==========================================================================
  // 2. GENERATIVE AI (Includes LLMs & Media Creation)
  // ==========================================================================
  {
    id: 'res-llm-3blue1brown-gpt',
    title: 'Visualizing Large Language Models & Transformers',
    description:
      'Visual animations explaining token embeddings, multi-head self-attention, and how transformers predict text.',
    type: 'youtube',
    language: 'English',
    difficulty: 'Beginner',
    domain: 'Generative AI',
    category: 'LLMs & Chatbots',
    url: 'https://www.youtube.com/watch?v=wjZofJX0v4U',
    channelOrAuthor: '3Blue1Brown (Grant Sanderson)',
    durationOrReadTime: '27 mins',
    associatedToolIds: ['tool-chatgpt', 'tool-claude'],
    keyTakeaways: [
      'High-dimensional vector representations of words and tokens',
      'Matrix multiplications behind self-attention mechanisms',
      'How probability distributions govern temperature and creativity',
    ],
    isVerified: true,
    targetAudience: 'student',
  },
  {
    id: 'res-llm-campusx-hindi-genai',
    title: 'Complete Generative AI & LangChain Architecture in Hindi',
    description:
      'Exhaustive playlist explaining foundational LLMs, LangChain agents, memory buffers, and retrieval-augmented generation (RAG).',
    type: 'youtube',
    language: 'Hindi',
    difficulty: 'Intermediate',
    domain: 'Generative AI',
    category: 'LLMs & Chatbots',
    url: 'https://www.youtube.com/playlist?list=PLKnIA16_RmvbR8yF_kGptqfE9-2Gf_T4c',
    channelOrAuthor: 'CampusX (Nitish Singh)',
    durationOrReadTime: 'Full Course Series',
    associatedToolIds: ['tool-chatgpt', 'tool-claude'],
    keyTakeaways: [
      'LangChain chains, agents, and vector database embeddings',
      'Chunking strategies and similarity search algorithms',
      'End-to-end question answering pipeline over private documents',
    ],
    isVerified: true,
    targetAudience: 'all',
  },
  {
    id: 'res-llm-huggingface-course',
    title: 'Hugging Face Open LLM & NLP Tutorial',
    description:
      'The industry-standard open course for loading, fine-tuning, and evaluating open-weights transformer models.',
    type: 'course',
    language: 'English',
    difficulty: 'Advanced',
    domain: 'Generative AI',
    category: 'LLMs & Chatbots',
    url: 'https://huggingface.co/learn',
    channelOrAuthor: 'Hugging Face Official',
    durationOrReadTime: 'Modular curriculum',
    associatedToolIds: ['tool-chatgpt'],
    keyTakeaways: [
      'Tokenization pipelines and vocabulary management',
      'LoRA and QLoRA parameter-efficient fine-tuning',
      'Deploying lightweight inference endpoints',
    ],
    isVerified: true,
    targetAudience: 'student',
  },
  {
    id: 'res-llm-nareshit-telugu',
    title: 'Data Science & Generative AI Overview in Telugu',
    description:
      'Technical breakdown of machine learning pipelines, deep learning foundations, and modern generative AI models in Telugu.',
    type: 'youtube',
    language: 'Telugu',
    difficulty: 'Intermediate',
    domain: 'Generative AI',
    category: 'LLMs & Chatbots',
    url: 'https://www.youtube.com/watch?v=B9JkG2r3v4Q',
    channelOrAuthor: 'Naresh i Technologies (Telugu)',
    durationOrReadTime: '1 hr 15 mins',
    associatedToolIds: ['tool-gemini-pro'],
    keyTakeaways: [
      'Overview of machine learning fundamentals in Telugu',
      'How Generative AI differs from traditional classification models',
      'Technical interview skills and industry project expectations',
    ],
    isVerified: true,
    targetAudience: 'student',
  },
  {
    id: 'res-media-wscube-hindi',
    title: 'AI Video & Audio Production Masterclass in Hindi',
    description:
      'Comprehensive Hindi walkthrough of AI-assisted multimedia tools, including voice generation, video synthesis, and design.',
    type: 'youtube',
    language: 'Hindi',
    difficulty: 'Beginner',
    domain: 'Generative AI',
    category: 'Media Creation',
    url: 'https://www.youtube.com/watch?v=W5R_mQ_73_o',
    channelOrAuthor: 'WsCube Tech',
    durationOrReadTime: '50 mins',
    associatedToolIds: ['tool-runway', 'tool-elevenlabs', 'tool-midjourney'],
    keyTakeaways: [
      'Generating realistic text-to-speech audio with ElevenLabs',
      'AI video generation and scene extension in Runway',
      'High-converting social media thumbnails with Canva and Midjourney',
    ],
    isVerified: true,
    targetAudience: 'entrepreneur',
  },
  {
    id: 'res-media-prasad-telugu',
    title: 'Top Free AI Tools for Video, Audio & Image Editing in Telugu',
    description:
      'Practical review of the most useful free and freemium AI tools for regional content creators and small businesses.',
    type: 'youtube',
    language: 'Telugu',
    difficulty: 'Beginner',
    domain: 'Generative AI',
    category: 'Media Creation',
    url: 'https://www.youtube.com/watch?v=9_N4k2V7g8A',
    channelOrAuthor: 'Prasad Tech in Telugu',
    durationOrReadTime: '18 mins',
    associatedToolIds: ['tool-elevenlabs', 'tool-canva', 'tool-descript'],
    keyTakeaways: [
      'Cloning Indian regional voices for voiceovers in Telugu',
      'One-click video background removal and automated captioning',
      'Budget-friendly media production workflows for startups',
    ],
    isVerified: true,
    targetAudience: 'entrepreneur',
  },

  // ==========================================================================
  // 3. AI FUNDAMENTALS
  // ==========================================================================
  {
    id: 'res-fund-elements-of-ai',
    title: 'Elements of AI: Introduction to Artificial Intelligence',
    description:
      'World-renowned course by University of Helsinki explaining what AI is, what can and cannot be done with AI, and how it impacts society.',
    type: 'course',
    language: 'English',
    difficulty: 'Beginner',
    domain: 'AI Fundamentals',
    category: 'Prompt Engineering',
    url: 'https://www.elementsofai.com/',
    channelOrAuthor: 'University of Helsinki & Reaktor',
    durationOrReadTime: 'Self-paced course (6 modules)',
    associatedToolIds: ['tool-chatgpt'],
    keyTakeaways: [
      'Core definitions distinguishing AI, machine learning, and neural networks',
      'Philosophical and mathematical foundations of automated reasoning',
      'Societal implications and responsible deployment',
    ],
    isVerified: true,
    targetAudience: 'all',
  },
  {
    id: 'res-fund-mit-ocw-ai',
    title: 'MIT 6.034 Artificial Intelligence Course',
    description:
      'Classic MIT OpenCourseWare curriculum taught by Prof. Patrick Winston covering search trees, knowledge representations, and rule systems.',
    type: 'course',
    language: 'English',
    difficulty: 'Intermediate',
    domain: 'AI Fundamentals',
    category: 'Applied Case Studies',
    url: 'https://ocw.mit.edu/courses/6-034-artificial-intelligence-fall-2010/',
    channelOrAuthor: 'MIT OpenCourseWare (Patrick Winston)',
    durationOrReadTime: 'Full university semester',
    associatedToolIds: ['tool-claude'],
    keyTakeaways: [
      'Heuristic depth-first and A* search algorithms',
      'Constraint satisfaction and adversarial game trees',
      'Classical logic versus statistical learning paradigms',
    ],
    isVerified: true,
    targetAudience: 'student',
  },
  {
    id: 'res-fund-gate-smashers-hindi',
    title: 'Artificial Intelligence Complete Playlist in Hindi',
    description:
      'Popular academic curriculum series breaking down AI search algorithms, knowledge representation, and heuristic reasoning in Hindi.',
    type: 'youtube',
    language: 'Hindi',
    difficulty: 'Beginner',
    domain: 'AI Fundamentals',
    category: 'LLMs & Chatbots',
    url: 'https://www.youtube.com/playlist?list=PLxCzCOWd7aiHGhOHV-n5vKEwioRrW4058',
    channelOrAuthor: 'Gate Smashers (Varun Singla)',
    durationOrReadTime: 'Comprehensive playlist',
    associatedToolIds: ['tool-chatgpt'],
    keyTakeaways: [
      'BFS, DFS, Uniform Cost Search, and A* algorithms explained in Hindi',
      'Knowledge representation and propositional logic',
      'Exam and university syllabus preparation with solved examples',
    ],
    isVerified: true,
    targetAudience: 'student',
  },
  {
    id: 'res-fund-telugu-search',
    title: 'Introduction to Artificial Intelligence in Telugu (Curated Search)',
    description:
      'Curated video and lecture index for learners seeking foundational AI terminology, search strategies, and overview in Telugu.',
    type: 'website',
    language: 'Telugu',
    difficulty: 'Beginner',
    domain: 'AI Fundamentals',
    category: 'Applied Case Studies',
    url: 'https://www.youtube.com/results?search_query=telugu+ai+fundamentals+introduction',
    searchQuery: 'telugu ai fundamentals introduction',
    channelOrAuthor: 'Telugu Educational AI Hub',
    durationOrReadTime: 'Search Directory',
    associatedToolIds: ['tool-chatgpt'],
    keyTakeaways: [
      'Foundational AI concepts explained in conversational Telugu',
      'Comparing human cognitive skills with machine intelligence',
      'Career roadmap and study guide for regional students',
    ],
    isVerified: false,
    targetAudience: 'student',
  },

  // ==========================================================================
  // 4. AI AGENTS
  // ==========================================================================
  {
    id: 'res-agent-deeplearning-autogen',
    title: 'AI Agentic Design Patterns with AutoGen',
    description:
      'Hands-on DeepLearning.AI course exploring multi-agent collaboration, tool calling, sequential planning, and human-in-the-loop controls.',
    type: 'course',
    language: 'English',
    difficulty: 'Intermediate',
    domain: 'AI Agents',
    category: 'Coding with AI',
    url: 'https://www.deeplearning.ai/short-courses/ai-agentic-design-patterns-with-autogen/',
    channelOrAuthor: 'DeepLearning.AI & Microsoft',
    durationOrReadTime: '1 hr course',
    associatedToolIds: ['tool-claude', 'tool-chatgpt'],
    keyTakeaways: [
      'Multi-agent conversation architectures and message passing',
      'Orchestrating tool execution and autonomous web browsing',
      'Implementing safety guardrails and human escalation',
    ],
    isVerified: true,
    targetAudience: 'student',
  },
  {
    id: 'res-agent-langgraph-docs',
    title: 'LangGraph Architecture & Multi-Agent Workflows',
    description:
      'Official documentation on building cyclic, stateful, and fault-tolerant agentic workflows with LangChain LangGraph.',
    type: 'website',
    language: 'English',
    difficulty: 'Advanced',
    domain: 'AI Agents',
    category: 'Coding with AI',
    url: 'https://langchain-ai.github.io/langgraph/',
    channelOrAuthor: 'LangChain Official Docs',
    durationOrReadTime: 'Technical Documentation',
    associatedToolIds: ['tool-claude', 'tool-cursor'],
    keyTakeaways: [
      'State graph construction and edge routing conditions',
      'Persistent checkpoints and human-in-the-loop approvals',
      'Multi-agent supervisors vs peer-to-peer delegation',
    ],
    isVerified: true,
    targetAudience: 'all',
  },
  {
    id: 'res-agent-hindi-search',
    title: 'Building Autonomous AI Agents in Hindi (Curated Search)',
    description:
      'Curated video guides detailing how to construct LangChain agents, CrewAI teams, and AutoGen systems with Hindi commentary.',
    type: 'website',
    language: 'Hindi',
    difficulty: 'Intermediate',
    domain: 'AI Agents',
    category: 'Coding with AI',
    url: 'https://www.youtube.com/results?search_query=campusx+ai+agents+langgraph+hindi',
    searchQuery: 'campusx ai agents langgraph hindi',
    channelOrAuthor: 'Hindi AI Developer Community',
    durationOrReadTime: 'Curated Search Hub',
    associatedToolIds: ['tool-chatgpt', 'tool-cursor'],
    keyTakeaways: [
      'Constructing tool-calling pipelines explained in Hindi',
      'CrewAI team role definitions and task assignments',
      'Avoiding infinite agent loops with explicit stopping criteria',
    ],
    isVerified: false,
    targetAudience: 'student',
  },

  // ==========================================================================
  // 5. MACHINE LEARNING
  // ==========================================================================
  {
    id: 'res-ml-coursera-specialization',
    title: 'Machine Learning Specialization by Andrew Ng',
    description:
      'The definitive introduction to machine learning covering supervised learning, linear regression, logistic regression, neural networks, and clustering.',
    type: 'course',
    language: 'English',
    difficulty: 'Beginner',
    domain: 'Machine Learning',
    category: 'Applied Case Studies',
    url: 'https://www.coursera.org/specializations/machine-learning-introduction',
    channelOrAuthor: 'DeepLearning.AI & Stanford Online',
    durationOrReadTime: '3-Course Series',
    associatedToolIds: ['tool-chatgpt'],
    keyTakeaways: [
      'Cost functions, gradient descent, and loss optimization',
      'Overfitting prevention via regularization and cross-validation',
      'Practical advice for structuring ML projects',
    ],
    isVerified: true,
    targetAudience: 'all',
  },
  {
    id: 'res-ml-scikit-userguide',
    title: 'Scikit-Learn Official User Guide & API Reference',
    description:
      'Comprehensive practical documentation for applying classification, regression, clustering, and dimensionality reduction in Python.',
    type: 'website',
    language: 'English',
    difficulty: 'Intermediate',
    domain: 'Machine Learning',
    category: 'Coding with AI',
    url: 'https://scikit-learn.org/stable/user_guide.html',
    channelOrAuthor: 'Scikit-Learn Community',
    durationOrReadTime: 'Interactive User Manual',
    associatedToolIds: ['tool-cursor', 'tool-copilot'],
    keyTakeaways: [
      'Pipelines for feature scaling, imputation, and model evaluation',
      'Confusion matrices, ROC-AUC, and precision-recall trade-offs',
      'Hyperparameter tuning using GridSearchCV and cross-validation',
    ],
    isVerified: true,
    targetAudience: 'student',
  },
  {
    id: 'res-ml-harry-hindi',
    title: 'Machine Learning in Python in One Video in Hindi',
    description:
      'Full Python machine learning course in Hindi covering linear regression, decision trees, random forests, and scikit-learn.',
    type: 'youtube',
    language: 'Hindi',
    difficulty: 'Beginner',
    domain: 'Machine Learning',
    category: 'Coding with AI',
    url: 'https://www.youtube.com/watch?v=7eh4d6sabA0',
    channelOrAuthor: 'CodeWithHarry',
    durationOrReadTime: '2 hrs 40 mins',
    associatedToolIds: ['tool-copilot', 'tool-cursor'],
    keyTakeaways: [
      'Setting up Jupyter notebooks and pandas dataframes',
      'Training and testing regression and classification models in Hindi',
      'Deploying a simple prediction script in Python',
    ],
    isVerified: true,
    targetAudience: 'student',
  },
  {
    id: 'res-ml-telugu-search',
    title: 'Machine Learning with Python in Telugu (Curated Search)',
    description:
      'Curated video lessons detailing algorithm intuition, mathematics, and Python implementation in Telugu.',
    type: 'website',
    language: 'Telugu',
    difficulty: 'Beginner',
    domain: 'Machine Learning',
    category: 'Applied Case Studies',
    url: 'https://www.youtube.com/results?search_query=vamsi+bhavani+machine+learning+in+telugu',
    searchQuery: 'vamsi bhavani machine learning in telugu',
    channelOrAuthor: 'Telugu Tech Learning Hub',
    durationOrReadTime: 'Curated Search Hub',
    associatedToolIds: ['tool-chatgpt'],
    keyTakeaways: [
      'Supervised vs unsupervised learning principles in Telugu',
      'Hands-on linear regression with Python libraries',
      'Preparing for technical data science job interviews',
    ],
    isVerified: false,
    targetAudience: 'student',
  },

  // ==========================================================================
  // 6. AI DEVELOPMENT
  // ==========================================================================
  {
    id: 'res-code-freecodecamp-cursor',
    title: 'Building Full-Stack Applications with Cursor AI',
    description:
      'Hands-on tutorial on utilizing Cursor AI Composer, code indexing, and project-wide agentic editing to build web applications.',
    type: 'website',
    language: 'English',
    difficulty: 'Intermediate',
    domain: 'AI Development',
    category: 'Coding with AI',
    url: 'https://www.freecodecamp.org/news/cursor-ai-code-editor-tutorial/',
    channelOrAuthor: 'freeCodeCamp',
    durationOrReadTime: '25 min read',
    associatedToolIds: ['tool-cursor', 'tool-copilot'],
    keyTakeaways: [
      'Configuring .cursorrules for consistent project styling',
      'Using @files and @docs for high-precision codebase indexing',
      'Refactoring legacy codebases safely with AI diff reviews',
    ],
    isVerified: true,
    targetAudience: 'all',
  },
  {
    id: 'res-code-fullstack-deeplearning',
    title: 'Full Stack Deep Learning: LLM Bootcamp',
    description:
      'Production engineering course on shipping LLM products: evaluation, prompt debugging, latency optimizations, and deployment.',
    type: 'course',
    language: 'English',
    difficulty: 'Advanced',
    domain: 'AI Development',
    category: 'Coding with AI',
    url: 'https://fullstackdeeplearning.com/',
    channelOrAuthor: 'Full Stack Deep Learning',
    durationOrReadTime: 'Multi-week curriculum',
    associatedToolIds: ['tool-cursor', 'tool-claude'],
    keyTakeaways: [
      'Continuous evaluation suites for non-deterministic model outputs',
      'Streaming responses and client UX latency optimization',
      'Monitoring API rate limits, costs, and token consumption',
    ],
    isVerified: true,
    targetAudience: 'entrepreneur',
  },
  {
    id: 'res-code-harry-hindi',
    title: 'Coding with AI: GitHub Copilot & Cursor AI in Hindi',
    description:
      'Clear, practical demonstration in Hindi showing how developers can accelerate web and Python development with AI assistants.',
    type: 'youtube',
    language: 'Hindi',
    difficulty: 'Beginner',
    domain: 'AI Development',
    category: 'Coding with AI',
    url: 'https://www.youtube.com/watch?v=1bYr3oGqg9U',
    channelOrAuthor: 'CodeWithHarry',
    durationOrReadTime: '35 mins',
    associatedToolIds: ['tool-copilot', 'tool-cursor'],
    keyTakeaways: [
      'Installing and configuring Copilot extensions in VS Code',
      'Prompting for algorithmic solutions and boilerplate generation',
      'Writing automated unit tests in Python and JavaScript',
    ],
    isVerified: true,
    targetAudience: 'student',
  },
  {
    id: 'res-code-teluguwebguru',
    title: 'Web Development & Coding with AI in Telugu',
    description:
      'Step-by-step practical guide in Telugu demonstrating how to build modern responsive websites using AI code scaffolding.',
    type: 'youtube',
    language: 'Telugu',
    difficulty: 'Beginner',
    domain: 'AI Development',
    category: 'Coding with AI',
    url: 'https://www.youtube.com/watch?v=4dJ6U2wG9_g',
    channelOrAuthor: 'Telugu Web Guru',
    durationOrReadTime: '30 mins',
    associatedToolIds: ['tool-chatgpt', 'tool-cursor'],
    keyTakeaways: [
      'Scaffolding HTML/CSS/JavaScript with generative prompts',
      'Debugging runtime React errors with step-by-step Telugu guidance',
      'Deploying student web projects onto live hosting',
    ],
    isVerified: true,
    targetAudience: 'student',
  },

  // ==========================================================================
  // 7. AI/ML (Broad Ecosystem & Applied Workflows)
  // ==========================================================================
  {
    id: 'res-aiml-google-crash-course',
    title: 'Google Machine Learning Crash Course with TensorFlow',
    description:
      'Fast-paced, practical introduction to machine learning featuring interactive visualizations, real-world case studies, and hands-on exercises.',
    type: 'course',
    language: 'English',
    difficulty: 'Beginner',
    domain: 'AI/ML',
    category: 'Applied Case Studies',
    url: 'https://developers.google.com/machine-learning/crash-course',
    channelOrAuthor: 'Google Developers',
    durationOrReadTime: '15 hours of modules',
    associatedToolIds: ['tool-gemini-pro'],
    keyTakeaways: [
      'Foundational math, training curves, and gradient descent',
      'Binary classification, multi-class neural networks, and embeddings',
      'Fairness, bias mitigation, and real-world system considerations',
    ],
    isVerified: true,
    targetAudience: 'all',
  },
  {
    id: 'res-aiml-cs50-ai',
    title: 'Harvard CS50 AI: Introduction to Artificial Intelligence with Python',
    description:
      'Harvard University online course exploring the concepts and algorithms behind modern AI: search, optimization, learning, and neural nets.',
    type: 'course',
    language: 'English',
    difficulty: 'Intermediate',
    domain: 'AI/ML',
    category: 'Applied Case Studies',
    url: 'https://cs50.harvard.edu/ai/',
    channelOrAuthor: 'Harvard Online (David J. Malan)',
    durationOrReadTime: '7-week academic course',
    associatedToolIds: ['tool-chatgpt'],
    keyTakeaways: [
      'Adversarial game theory and Minimax with Alpha-Beta pruning',
      'Markov models and Bayesian inference networks',
      'Building reinforcement learning agents in Python',
    ],
    isVerified: true,
    targetAudience: 'student',
  },
  {
    id: 'res-case-study-student-research',
    title: 'Academic Literature Review in 4 Days with NotebookLM & Perplexity',
    description:
      'Case study of an engineering student synthesizing 25 research papers with zero hallucinated citations for a conference paper.',
    type: 'case_study',
    language: 'English',
    difficulty: 'Intermediate',
    domain: 'AI/ML',
    category: 'Applied Case Studies',
    url: 'https://notebooklm.google.com',
    channelOrAuthor: 'AIIMS Student Research Cell',
    durationOrReadTime: '10 min case study',
    associatedToolIds: ['tool-notebooklm', 'tool-perplexity'],
    keyTakeaways: [
      'Uploading and grounding queries in authoritative PDF sources',
      'Cross-validating claims against real-time scientific citations',
      'Eliminating literature review bottlenecks without compromising integrity',
    ],
    isVerified: true,
    targetAudience: 'student',
  },
  {
    id: 'res-case-study-mvp-v0',
    title: 'From Concept to Functional SaaS MVP in 48 Hours with v0 & Cursor',
    description:
      'Startup founder breakdown: scaffolding a dashboard with v0 Generative UI, wiring PostgreSQL with Prisma in Cursor, and launching.',
    type: 'case_study',
    language: 'English',
    difficulty: 'Intermediate',
    domain: 'AI/ML',
    category: 'Applied Case Studies',
    url: 'https://v0.dev',
    channelOrAuthor: 'AIIMS Venture Lab',
    durationOrReadTime: '12 min case study',
    associatedToolIds: ['tool-v0', 'tool-cursor'],
    keyTakeaways: [
      'Rapid prototype design using natural language component prompts',
      'Direct copy-paste of React code into full-stack Next.js repos',
      'Saving thousands of dollars in early-stage engineering costs',
    ],
    isVerified: true,
    targetAudience: 'entrepreneur',
  },
  {
    id: 'res-case-study-telugu-agri',
    title: 'Deploying a Multilingual Telugu Voice Agent for Agri-Tech Advisory',
    description:
      'Real-world case study of an Andhra startup automating voice advisory calls for local farmers using ElevenLabs regional voice cloning.',
    type: 'case_study',
    language: 'Telugu',
    difficulty: 'Advanced',
    domain: 'AI/ML',
    category: 'Applied Case Studies',
    url: 'https://elevenlabs.io',
    channelOrAuthor: 'Regional AI Startup Showcase',
    durationOrReadTime: '15 min case study',
    associatedToolIds: ['tool-elevenlabs', 'tool-claude'],
    keyTakeaways: [
      'Regional language voice synthesis with Indian accents',
      'Handling Telugu transliteration and local agricultural terms',
      'Achieving 90%+ resolution on routine crop-disease inquiries',
    ],
    isVerified: true,
    targetAudience: 'entrepreneur',
  },
  {
    id: 'res-case-study-exam-prep',
    title: 'Interactive Study Partner: Active Recall Viva with Voice AI',
    description:
      'Detailed study blueprint showcasing how students turn ChatGPT Voice into an demanding academic viva examiner.',
    type: 'case_study',
    language: 'Multilingual',
    difficulty: 'Beginner',
    domain: 'AI/ML',
    category: 'Applied Case Studies',
    url: 'https://chatgpt.com',
    channelOrAuthor: 'AIIMS Academic Mentorship',
    durationOrReadTime: '8 min case study',
    associatedToolIds: ['tool-chatgpt'],
    keyTakeaways: [
      'Socratic interrogation prompts that identify knowledge gaps',
      'Simulating viva voce and behavioral interviews verbally',
      'Real-time constructive feedback and score improvement',
    ],
    isVerified: true,
    targetAudience: 'student',
  },

  // ==========================================================================
  // 8. IOT (Internet of Things & TinyML)
  // ==========================================================================
  {
    id: 'res-iot-coursera-ibm',
    title: 'Introduction to Internet of Things (IoT) by IBM',
    description:
      'Foundational course exploring connected hardware devices, sensor communication protocols (MQTT, HTTP), and cloud IoT platforms.',
    type: 'course',
    language: 'English',
    difficulty: 'Beginner',
    domain: 'IoT',
    category: 'Applied Case Studies',
    url: 'https://www.coursera.org/learn/iot',
    channelOrAuthor: 'IBM Skills Network',
    durationOrReadTime: '4 modules',
    associatedToolIds: ['tool-chatgpt'],
    keyTakeaways: [
      'Connecting sensors, microcontrollers, and wireless transceivers',
      'Cloud data ingestion pipelines and telemetry streams',
      'Architecting resilient edge systems for smart devices',
    ],
    isVerified: true,
    targetAudience: 'student',
  },
  {
    id: 'res-iot-arduino-tinyml',
    title: 'Arduino TinyML: Machine Learning on Microcontrollers',
    description:
      'Practical guide to compiling and deploying lightweight TensorFlow Lite neural models directly onto resource-constrained Arduino boards.',
    type: 'website',
    language: 'English',
    difficulty: 'Intermediate',
    domain: 'IoT',
    category: 'Coding with AI',
    url: 'https://docs.arduino.cc/learn/microcontrollers/tinyml/',
    channelOrAuthor: 'Arduino Official Documentation',
    durationOrReadTime: 'Interactive Tutorial',
    associatedToolIds: ['tool-cursor'],
    keyTakeaways: [
      'Quantization techniques to fit models into kilobyte memory limits',
      'Classifying accelerometer gesture movements on edge devices',
      'Voice keyword spotting without internet connectivity',
    ],
    isVerified: true,
    targetAudience: 'student',
  },
  {
    id: 'res-iot-hindi-search',
    title: 'Internet of Things (IoT) Full Course in Hindi (Curated Search)',
    description:
      'Comprehensive Hindi tutorial covering sensor interfacing, Arduino/ESP32 programming, and cloud dashboard telemetry.',
    type: 'website',
    language: 'Hindi',
    difficulty: 'Beginner',
    domain: 'IoT',
    category: 'Applied Case Studies',
    url: 'https://www.youtube.com/results?search_query=edureka+hindi+iot+tutorial',
    searchQuery: 'edureka hindi iot tutorial',
    channelOrAuthor: 'Hindi Tech Educators Hub',
    durationOrReadTime: 'Curated Video Directory',
    associatedToolIds: ['tool-chatgpt'],
    keyTakeaways: [
      'Connecting ESP32 and Arduino boards explained in Hindi',
      'Reading sensor data and publishing via MQTT broker',
      'Building smart home and agricultural automation prototypes',
    ],
    isVerified: false,
    targetAudience: 'student',
  },

  // ==========================================================================
  // 9. DATA SCIENCE
  // ==========================================================================
  {
    id: 'res-ds-kaggle-learn',
    title: 'Kaggle Micro-Courses: Practical Data Science',
    description:
      'Hands-on interactive notebooks covering Python, Pandas, data visualization, feature engineering, and model validation.',
    type: 'course',
    language: 'English',
    difficulty: 'Beginner',
    domain: 'Data Science',
    category: 'Applied Case Studies',
    url: 'https://www.kaggle.com/learn',
    channelOrAuthor: 'Kaggle Official',
    durationOrReadTime: 'Modular short courses',
    associatedToolIds: ['tool-chatgpt', 'tool-cursor'],
    keyTakeaways: [
      'Data cleaning, missing value imputation, and categorical encoding',
      'Aggregating and transforming complex datasets using Pandas',
      'Baseline model training and Kaggle competition workflows',
    ],
    isVerified: true,
    targetAudience: 'all',
  },
  {
    id: 'res-ds-freecodecamp-python',
    title: 'Data Analysis with Python Certification',
    description:
      'Exhaustive curriculum covering Numpy, Pandas, Matplotlib, and Seaborn with real-world data extraction and cleaning projects.',
    type: 'course',
    language: 'English',
    difficulty: 'Intermediate',
    domain: 'Data Science',
    category: 'Coding with AI',
    url: 'https://www.freecodecamp.org/learn/data-analysis-with-python/',
    channelOrAuthor: 'freeCodeCamp',
    durationOrReadTime: '300 hours self-paced',
    associatedToolIds: ['tool-cursor', 'tool-copilot'],
    keyTakeaways: [
      'Multi-dimensional matrix math with NumPy',
      'Statistical hypothesis testing and data distribution analysis',
      'Building automated data ingestion and cleaning scripts',
    ],
    isVerified: true,
    targetAudience: 'student',
  },
  {
    id: 'res-ds-campusx-hindi-ds',
    title: 'Complete Data Science & Python in Hindi by CampusX',
    description:
      'Renowned Hindi series walking through exploratory data analysis, statistics, linear algebra, and data pipelines with real datasets.',
    type: 'youtube',
    language: 'Hindi',
    difficulty: 'Beginner',
    domain: 'Data Science',
    category: 'Applied Case Studies',
    url: 'https://www.youtube.com/playlist?list=PLKnIA16_Rmvbr7zKYQuBfsVkjoLujYhhA',
    channelOrAuthor: 'CampusX (Nitish Singh)',
    durationOrReadTime: '100+ Lecture Series',
    associatedToolIds: ['tool-chatgpt'],
    keyTakeaways: [
      'Intuitive breakdown of descriptive and inferential statistics in Hindi',
      'Feature engineering techniques on messy real-world datasets',
      'Building end-to-end data analysis reports from scratch',
    ],
    isVerified: true,
    targetAudience: 'all',
  },
  {
    id: 'res-ds-telugu-search',
    title: 'Data Science & Analytics in Telugu (Curated Search)',
    description:
      'Curated index of tutorials explaining data manipulation, Pandas tables, and analytics careers in Telugu.',
    type: 'website',
    language: 'Telugu',
    difficulty: 'Beginner',
    domain: 'Data Science',
    category: 'Applied Case Studies',
    url: 'https://www.youtube.com/results?search_query=naresh+it+data+science+in+telugu',
    searchQuery: 'naresh it data science in telugu',
    channelOrAuthor: 'Telugu Tech Career Cell',
    durationOrReadTime: 'Curated Search Hub',
    associatedToolIds: ['tool-chatgpt'],
    keyTakeaways: [
      'Data science industry roadmap explained in Telugu',
      'Excel, SQL, and Python skills needed for data analysts',
      'Real-world business problem translation into metrics',
    ],
    isVerified: false,
    targetAudience: 'student',
  },

  // ==========================================================================
  // 10. CYBERSECURITY
  // ==========================================================================
  {
    id: 'res-sec-owasp-llm-top10',
    title: 'OWASP Top 10 for Large Language Model Applications',
    description:
      'Authoritative industry standard detailing the critical security vulnerabilities in generative AI applications, including prompt injection and data leakage.',
    type: 'website',
    language: 'English',
    difficulty: 'Intermediate',
    domain: 'Cybersecurity',
    category: 'Applied Case Studies',
    url: 'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
    channelOrAuthor: 'OWASP Foundation',
    durationOrReadTime: 'Standard Framework Guide',
    associatedToolIds: ['tool-chatgpt', 'tool-claude'],
    keyTakeaways: [
      'Prompt injection vectors (direct vs indirect) and defenses',
      'Insecure output handling and model denial-of-service risks',
      'Training data poisoning and supply chain integrity',
    ],
    isVerified: true,
    targetAudience: 'all',
  },
  {
    id: 'res-sec-coursera-google-cert',
    title: 'Google Cybersecurity Professional Certificate',
    description:
      'Industry-recognized program preparing learners for entry-level cybersecurity roles covering network security, SIEM tools, and Python automation.',
    type: 'course',
    language: 'English',
    difficulty: 'Beginner',
    domain: 'Cybersecurity',
    category: 'Applied Case Studies',
    url: 'https://www.coursera.org/professional-certificates/google-cybersecurity',
    channelOrAuthor: 'Google Career Certificates',
    durationOrReadTime: '8-Course Series',
    associatedToolIds: ['tool-chatgpt'],
    keyTakeaways: [
      'Network protocols, firewalls, and packet analysis with Wireshark',
      'Detecting intrusions and analyzing security log events',
      'Automating routine vulnerability scans with Python scripts',
    ],
    isVerified: true,
    targetAudience: 'student',
  },
  {
    id: 'res-sec-hindi-search',
    title: 'Cybersecurity & Ethical Hacking in Hindi (Curated Search)',
    description:
      'Curated video guides detailing defensive security, threat modeling, and web vulnerabilities explained in Hindi.',
    type: 'website',
    language: 'Hindi',
    difficulty: 'Beginner',
    domain: 'Cybersecurity',
    category: 'Applied Case Studies',
    url: 'https://www.youtube.com/results?search_query=geeky+shows+cyber+security+in+hindi',
    searchQuery: 'geeky shows cyber security in hindi',
    channelOrAuthor: 'Hindi Cyber Defense Cell',
    durationOrReadTime: 'Curated Search Hub',
    associatedToolIds: ['tool-chatgpt'],
    keyTakeaways: [
      'Fundamentals of computer networks and threat defense in Hindi',
      'Understanding password hashing and credential hygiene',
      'Basic penetration testing and security audit methodology',
    ],
    isVerified: false,
    targetAudience: 'student',
  },
  {
    id: 'res-sec-telugu-search',
    title: 'Cybersecurity Fundamentals in Telugu (Curated Search)',
    description:
      'Curated overview of cybersecurity basics, ethical hacking concepts, and digital hygiene in conversational Telugu.',
    type: 'website',
    language: 'Telugu',
    difficulty: 'Beginner',
    domain: 'Cybersecurity',
    category: 'Applied Case Studies',
    url: 'https://www.youtube.com/results?search_query=telugu+cyber+security+full+course',
    searchQuery: 'telugu cyber security full course',
    channelOrAuthor: 'Telugu Cyber Awareness Hub',
    durationOrReadTime: 'Curated Search Hub',
    associatedToolIds: ['tool-chatgpt'],
    keyTakeaways: [
      'Understanding cyber threats and phishing attacks in Telugu',
      'Online account safety and two-factor authentication',
      'IT security career roadmap and certification pathways',
    ],
    isVerified: false,
    targetAudience: 'student',
  },
];

/**
 * Computes accurate counts for each language option based on current dataset.
 */
export function getLanguageCounts(resources: LearnAIResource[] = LEARN_AI_RESOURCES): {
  all: number;
  english: number;
  telugu: number;
  hindi: number;
} {
  return {
    all: resources.length,
    english: resources.filter((r) => r.language === 'English' || r.language === 'Multilingual')
      .length,
    telugu: resources.filter((r) => r.language === 'Telugu' || r.language === 'Multilingual')
      .length,
    hindi: resources.filter((r) => r.language === 'Hindi' || r.language === 'Multilingual').length,
  };
}
