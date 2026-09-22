import { UserProfile, DimensionScore, CapabilityGap, FocusArea, RadarSignal, CreditTransaction, AITool, UserToolItem } from '../types';

export const mockUser: UserProfile = {
  id: 'usr-101',
  name: 'Divya',
  email: 'divya@example.com',
  role: 'AI Product Lead / Engineer',
  targetGoal: 'Master Agentic Workflows & Multi-Modal AI Deployment',
  stage: 'Recognising',
  xpPoints: 1250,
  aiimsCredits: 420 // Initial Account Balance
};

// Track level completions that have already received credit rewards (prevents duplicate rewards)
export const rewardedLevelIds: Set<number> = new Set<number>();

export const mockDimensionScores: DimensionScore[] = [
  { dimension: 'Generative AI Tech', score: 82, benchmark: 75 },
  { dimension: 'Prompt Engineering', score: 88, benchmark: 80 },
  { dimension: 'Agentic Workflows', score: 62, benchmark: 78 },
  { dimension: 'AI Ethics & Alignment', score: 70, benchmark: 72 },
  { dimension: 'ML Fundamentals', score: 65, benchmark: 70 },
  { dimension: 'Tool Integration', score: 78, benchmark: 74 }
];

export const mockCapabilityGaps: CapabilityGap[] = [
  {
    id: 'gap-1',
    capabilityArea: 'Agentic Workflow Orchestration',
    currentLevel: 62,
    targetLevel: 85,
    aiInterpretation: 'Learner exhibits strong prompt design but struggles with multi-agent state persistence and tool execution loops.',
    isOverridden: false
  },
  {
    id: 'gap-2',
    capabilityArea: 'ML Foundation Model Fine-Tuning',
    currentLevel: 65,
    targetLevel: 80,
    aiInterpretation: 'Basic intuition of RAG pipelines present, but lacks hands-on experience with LoRA adapter tuning.',
    mentorOverride: 'Mentor Note: Focus on RAG evaluation metrics (Ragas framework) before deep-diving into parameter fine-tuning.',
    isOverridden: true
  }
];

export const mockFocusAreas: FocusArea[] = [
  {
    id: 'focus-1',
    title: 'Master Multi-Agent Routing (LangGraph / Autogen)',
    priority: 'High',
    aiReasoning: 'Critical gap identified in agentic state persistence. Closing this increases overall capability by 22%.',
    estimatedCredits: 50,
    status: 'In Progress'
  },
  {
    id: 'focus-2',
    title: 'Evaluate RAG Triad Metrics (Context Precision & Recall)',
    priority: 'High',
    aiReasoning: 'Aligns directly with target goal of enterprise-grade RAG deployment.',
    estimatedCredits: 40,
    status: 'Pending'
  }
];

export const mockRadarSignals: RadarSignal[] = [
  {
    id: 'sig-1',
    title: 'Claude 3.5 Sonnet & Computer Use OS Automation',
    summary: 'AI models can now interact directly with desktop OS environments via screenshot visual grounding and native mouse/keyboard emulation loops.',
    category: 'Agentic AI',
    impactLevel: 'Critical',
    publishedAt: 'September 2026',
    source: 'Anthropic Technical Release Bulletin',
    capabilities: ['Visual Screenshot Grounding', 'OS GUI Control', 'Multi-step Desktop Navigation', 'System Call Execution'],
    affectedDomains: ['QA Engineering', 'Workflow Automation', 'Software Development', 'Product Design'],
    recommendedTasks: ['Automated desktop GUI testing', 'Cross-application workflow execution', 'Multi-app data migration'],
    relatedTools: ['tool-claude', 'tool-make'],
    investigationAvailable: true,
    tags: ['agentic-ai', 'computer-use', 'gui-automation'],
    active: true,
    scaffold: {
      yesterday: 'AI models responded purely via text/JSON APIs requiring human developers to bind custom tool handlers.',
      today: 'Models interpret visual screenshots directly and execute native mouse/keyboard desktop GUI actions.',
      whatChanged: 'Transition from API-only function calling to direct OS GUI interaction loops.',
      whosAffected: 'QA Automation Engineers, Software Developers, Workflow Automation Specialists.'
    },
    isFollowed: true
  },
  {
    id: 'sig-2',
    title: 'Autonomous Coding Agents & SWE-Bench Benchmark Shifts',
    summary: 'Agentic coding platforms autonomously plan repository-wide diffs, execute shell build loops, and resolve failing unit test tracebacks.',
    category: 'Coding',
    impactLevel: 'High',
    publishedAt: 'September 2026',
    source: 'SWE-Bench Benchmark & ArXiv',
    capabilities: ['Workspace-wide File Indexing', 'Multi-file Agent Composer', 'Terminal Error Debugging', 'Automated Unit Test Fixing'],
    affectedDomains: ['Fullstack Engineering', 'DevOps', 'Technical Product Management'],
    recommendedTasks: ['End-to-end bug resolution', 'Multi-file architectural refactoring', 'Test coverage augmentation'],
    relatedTools: ['tool-cursor', 'tool-copilot'],
    investigationAvailable: true,
    tags: ['coding-agents', 'swe-bench', 'repository-refactoring'],
    active: true,
    scaffold: {
      yesterday: 'Copilot auto-completed code snippet-by-snippet inline inside single files.',
      today: 'Agents ingest full GitHub repositories, draft multi-file diffs, and iterate against terminal outputs.',
      whatChanged: 'Shift from single-line code completion to end-to-end task execution loops.',
      whosAffected: 'Fullstack Engineers, DevOps Engineers, Technical Product Managers.'
    },
    isFollowed: false
  },
  {
    id: 'sig-3',
    title: 'Context Windows Reach 2M Tokens with Needle-in-a-Haystack Recall',
    summary: 'Large language models now ingest 100+ page documents, hour-long video streams, and full codebases without context loss.',
    category: 'New Models',
    impactLevel: 'High',
    publishedAt: 'August 2026',
    source: 'Google DeepMind Technical Report',
    capabilities: ['2M Context Ingestion', 'Native Video/Audio Understanding', 'Zero-loss Information Retrieval'],
    affectedDomains: ['Academic Research', 'Legal & Compliance', 'Data Architecture'],
    recommendedTasks: ['Analyzing long-form video lectures', 'Cross-referencing massive slide decks', 'Deep legal doc analysis'],
    relatedTools: ['tool-gemini-pro', 'tool-claude'],
    investigationAvailable: true,
    tags: ['2m-context', 'long-form-reasoning', 'multimodal'],
    active: true,
    scaffold: {
      yesterday: 'Document chunking and vector truncation was mandatory to fit inside 8K-32K token windows.',
      today: 'Native 2M token context windows process full repositories and hour-long media files with zero loss.',
      whatChanged: 'Attention mechanism scale allows instant full-codebase context inclusion.',
      whosAffected: 'Technical Architects, Researchers, Legal Analysts.'
    },
    isFollowed: false
  },
  {
    id: 'sig-4',
    title: 'Live Web Citation Engines & Verifiable RAG Synthesis',
    summary: 'Search-grounded models synthesize real-time web retrieval with explicit source citation mapping to prevent hallucination.',
    category: 'Research',
    impactLevel: 'Medium',
    publishedAt: 'August 2026',
    source: 'AI Industry Benchmark Bulletin',
    capabilities: ['Live Web Index Retrieval', 'Explicit URL Citation Mapping', 'Academic Literature Synthesis'],
    affectedDomains: ['Market Research', 'Journalism', 'Competitive Intelligence'],
    recommendedTasks: ['Fact-checking current developments', 'Market trend synthesis', 'Academic paper discovery'],
    relatedTools: ['tool-perplexity', 'tool-notebooklm'],
    investigationAvailable: true,
    tags: ['live-web-search', 'citations', 'rag-synthesis'],
    active: true,
    scaffold: {
      yesterday: 'LLM training cutoffs produced hallucinations on current news and recent technical releases.',
      today: 'Real-time retrieval engines search the live web and attach verifiable URLs to every claim.',
      whatChanged: 'Transition from static model parameters to dynamic live web RAG pipelines.',
      whosAffected: 'Market Researchers, Analysts, Fact Checkers.'
    },
    isFollowed: true
  },
  {
    id: 'sig-5',
    title: 'No-Code Visual AI Workflow Automation Node Systems',
    summary: 'Visual drag-and-drop automation builders integrate multi-agent nodes with webhooks and enterprise cloud services.',
    category: 'Automation',
    impactLevel: 'Medium',
    publishedAt: 'July 2026',
    source: 'Enterprise Automation Report',
    capabilities: ['Visual Drag-and-Drop Workflow Canvas', 'AI Agent Node Integration', 'Webhook Triggers'],
    affectedDomains: ['Business Operations', 'Sales Engineering', 'Marketing Operations'],
    recommendedTasks: ['Automating lead routing', 'Cross-app sync pipelines', 'Autonomous email processing'],
    relatedTools: ['tool-make'],
    investigationAvailable: true,
    tags: ['no-code', 'workflow-automation', 'agent-nodes'],
    active: true,
    scaffold: {
      yesterday: 'Integrating AI required writing custom backend python scripts and managing OAuth infrastructure.',
      today: 'Visual drag-and-drop canvases connect 1,500+ SaaS apps directly into AI decision nodes.',
      whatChanged: 'Democratization of agentic pipelines from code-only to visual node builders.',
      whosAffected: 'Operations Leads, Automation Engineers, Product Managers.'
    },
    isFollowed: false
  }
];

export const mockTransactions: CreditTransaction[] = [
  {
    id: 'tx-init-1',
    transactionType: 'SIGNAL_INVESTIGATION',
    source: 'RADAR',
    sourceId: 'sig-1',
    amount: 30,
    description: 'Investigated Computer Use Signal',
    timestamp: '2026-09-15 14:15',
    previousBalance: 390,
    newBalance: 420
  }
];

// ==========================================
// ADMIN-UPDATABLE AI TOOL CATALOG
// ==========================================

export const mockToolCatalog: AITool[] = [
  {
    id: 'tool-chatgpt',
    name: 'ChatGPT (GPT-4o)',
    description: 'Versatile conversational AI model optimized for general reasoning, brainstorming, coding snippets, and broad task execution.',
    category: 'Reasoning & Writing',
    capabilities: ['General Reasoning', 'Creative Writing', 'Code Generation', 'Web Browsing', 'Voice Interaction'],
    useCases: ['Drafting documentation', 'General problem solving', 'Quick syntax lookup', 'Interactive Q&A'],
    strengths: ['High general knowledge', 'Extensive ecosystem & custom GPTs', 'Fast response times', 'Voice integration'],
    limitations: ['200k context limit on standard web', 'Strict safety alignment can cause refusals', 'Occasional hallucination on niche libraries'],
    taskMappings: ['long-form document reasoning', 'brainstorming', 'general assistance'],
    websiteUrl: 'https://chatgpt.com',
    activeStatus: true,
    iconName: 'MessageSquare'
  },
  {
    id: 'tool-claude',
    name: 'Claude 3.5 Sonnet',
    description: 'Advanced reasoning model with 200k context window, exceptional technical writing, code architecture, and Computer Use OS automation.',
    category: 'Reasoning & Writing',
    capabilities: ['Extended Context Processing', 'Complex Technical Reasoning', 'Artifact Rendering', 'Computer Use OS Control', 'System Prompt Following'],
    useCases: ['Analyzing 100+ page documents', 'Complex multi-file refactoring', 'Nuanced editorial writing', 'GUI automation'],
    strengths: ['Superior long-form coherence', 'Minimal fluff/hallucination', 'Artifacts live preview canvas', 'Precise instruction following'],
    limitations: ['Strict rate limits on free tier', 'No native live web browsing on standard interface', 'Slightly higher latency on mega contexts'],
    taskMappings: ['long-form document reasoning', 'architecture design', 'technical writing', 'deep analysis'],
    websiteUrl: 'https://claude.ai',
    activeStatus: true,
    iconName: 'Sparkles'
  },
  {
    id: 'tool-cursor',
    name: 'Cursor IDE',
    description: 'AI-first code editor built on VS Code with workspace-wide semantic search, composer agentic edits, and inline code generation.',
    category: 'Agentic Coding',
    capabilities: ['Workspace-wide Indexing', 'Multi-file Agent Composer', 'Terminal Error Debugging', 'Custom .cursorrules'],
    useCases: ['End-to-end feature implementation', 'Repository-wide refactoring', 'Bug fixing from terminal tracebacks'],
    strengths: ['Native VS Code keybindings & extension compatibility', 'Fast codebase indexing', 'Seamless agentic diff previews'],
    limitations: ['Requires API keys or monthly subscription', 'Requires initial indexing step on large mono-repos'],
    taskMappings: ['agentic coding', 'repository refactoring', 'automated debugging'],
    websiteUrl: 'https://cursor.com',
    activeStatus: true,
    iconName: 'Code'
  },
  {
    id: 'tool-copilot',
    name: 'GitHub Copilot',
    description: 'IDE auto-completion assistant and workspace chat assistant integrated directly into major code editors.',
    category: 'Agentic Coding',
    capabilities: ['Real-time Auto-complete', 'IDE Inline Chat', 'Pull Request Summarization', 'CLI Command Help'],
    useCases: ['Boilerplate code typing', 'Inline line completions', 'Function docstring generation'],
    strengths: ['Tight integration with GitHub & VS Code', 'Zero latency inline suggestions', 'Enterprise compliance governance'],
    limitations: ['Less context-aware than multi-file composer editors for full repository changes'],
    taskMappings: ['code completion', 'inline suggestion', 'developer productivity'],
    websiteUrl: 'https://github.com/features/copilot',
    activeStatus: true,
    iconName: 'GitBranch'
  },
  {
    id: 'tool-perplexity',
    name: 'Perplexity AI',
    description: 'AI search engine combining real-time web retrieval, explicit citation mapping, and structured synthesis pages.',
    category: 'Research & RAG',
    capabilities: ['Live Web Citation Synthesis', 'Academic Paper Search', 'Pro Search Deep Reasoning', 'Collections Knowledge Hub'],
    useCases: ['Market research', 'Fact checking current news', 'Academic literature synthesis'],
    strengths: ['Verifiable source URLs for every claim', 'Live multi-source synthesis', 'Clean markdown citations'],
    limitations: ['Not optimized for private repo code generation', 'Relying heavily on web indexing accuracy'],
    taskMappings: ['web research', 'fact verification', 'market analysis'],
    websiteUrl: 'https://perplexity.ai',
    activeStatus: true,
    iconName: 'Search'
  },
  {
    id: 'tool-notebooklm',
    name: 'Google NotebookLM',
    description: 'Personalized AI research assistant grounded strictly in your uploaded PDF, audio, document, and slide sources with Audio Overview generation.',
    category: 'Research & RAG',
    capabilities: ['Strict Source-grounded Q&A', 'Audio Overview Podcast Synthesis', 'Multi-document Cross Indexing', 'Citation Highlighting'],
    useCases: ['Studying complex textbooks', 'Synthesizing internal company docs', 'Generating podcast-style summaries'],
    strengths: ['Zero hallucination outside uploaded sources', 'Automatic podcast-style audio discussions', 'Free Google integration'],
    limitations: ['Cannot query external web outside provided sources', 'Limit on total document size per notebook'],
    taskMappings: ['document RAG', 'textbook study', 'grounded research'],
    websiteUrl: 'https://notebooklm.google.com',
    activeStatus: true,
    iconName: 'BookOpen'
  },
  {
    id: 'tool-gemini-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Google multi-modal model with 2M token context window capable of ingesting full video streams, hour-long audio, and large repositories.',
    category: 'Multi-Modal',
    capabilities: ['2M Context Window', 'Native Native Video & Audio Ingestion', 'Google Workspace Integration', 'Multi-modal Code Synthesis'],
    useCases: ['Analyzing 1-hour video lectures', 'Cross-referencing massive slide decks', 'Deep multi-modal analysis'],
    strengths: ['Unmatched context window size', 'Direct YouTube and Drive integration', 'Strong multi-modal reasoning'],
    limitations: ['Web interface can feel cluttered', 'Response times scale with massive video files'],
    taskMappings: ['multi-modal analysis', 'video comprehension', 'large context processing'],
    websiteUrl: 'https://gemini.google.com',
    activeStatus: true,
    iconName: 'Cpu'
  },
  {
    id: 'tool-midjourney',
    name: 'Midjourney v6',
    description: 'State-of-the-art generative image model famous for photorealistic detail, artistic control, and stylization.',
    category: 'Image & Vision',
    capabilities: ['Photorealistic Rendering', 'Style Transfer & Inpainting', 'Aspect Ratio Control', 'Character Consistency'],
    useCases: ['Marketing visual creation', 'UI mockup imagery', 'Concept art generation'],
    strengths: ['Unrivaled aesthetic quality', 'Detailed texture and lighting control'],
    limitations: ['Discord interface workflow', 'Subscription required with no free tier'],
    taskMappings: ['image generation', 'visual design', 'concept art'],
    websiteUrl: 'https://midjourney.com',
    activeStatus: true,
    iconName: 'Image'
  },
  {
    id: 'tool-julius',
    name: 'Julius AI',
    description: 'Data science AI assistant that executes Python code in sandboxed environments to analyze CSVs, create charts, and build statistical models.',
    category: 'Data Analysis',
    capabilities: ['Automated Python Sandbox Execution', 'Interactive Chart Rendering', 'Statistical Hypothesis Testing', 'Data Cleaning'],
    useCases: ['Exploratory data analysis', 'Creating publication-ready charts', 'Statistical regression modeling'],
    strengths: ['Executes actual Python data code', 'Exports downloadable clean datasets & plots', 'Supports Excel & SQL'],
    limitations: ['Requires data privacy consideration for sensitive enterprise databases'],
    taskMappings: ['data analysis', 'chart visualization', 'python execution'],
    websiteUrl: 'https://julius.ai',
    activeStatus: true,
    iconName: 'BarChart'
  },
  {
    id: 'tool-gamma',
    name: 'Gamma App',
    description: 'AI presentation deck and web page generator that transforms text prompts or outlines into beautifully styled slide decks.',
    category: 'Presentation',
    capabilities: ['Instant Slide Deck Generation', 'Interactive Web Cards', 'Brand Theme Customization', 'AI Slide Editing'],
    useCases: ['Pitch deck creation', 'Lecture presentations', 'Project status updates'],
    strengths: ['Saves hours of PowerPoint formatting', 'Modern responsive layouts', 'Interactive embed support'],
    limitations: ['Free tier adds Gamma watermark', 'Custom corporate template support requires paid tiers'],
    taskMappings: ['presentation design', 'pitch decks', 'slide generation'],
    websiteUrl: 'https://gamma.app',
    activeStatus: true,
    iconName: 'Layout'
  },
  {
    id: 'tool-runway',
    name: 'Runway Gen-3',
    description: 'AI video generation and visual effects platform for turning text prompts and static images into cinematic video clips.',
    category: 'Video',
    capabilities: ['Text-to-Video', 'Image-to-Video Motion', 'Camera Movement Control', 'Video Inpainting'],
    useCases: ['Product video teasers', 'Social media animations', 'Visual storytelling'],
    strengths: ['High cinematic fidelity', 'Fine control over camera motion'],
    limitations: ['Generation credits exhaust quickly', 'Rerolls required for perfect physics'],
    taskMappings: ['video generation', 'motion graphics', 'animation'],
    websiteUrl: 'https://runwayml.com',
    activeStatus: true,
    iconName: 'Video'
  },
  {
    id: 'tool-make',
    name: 'Make.com AI',
    description: 'Visual workflow automation platform connecting 1,500+ apps with AI modules for automated webhooks and data pipelines.',
    category: 'Automation',
    capabilities: ['No-Code Workflow Builder', 'AI Agent Node Integration', 'Webhook Triggers', 'Data Mapping & Transformation'],
    useCases: ['Automating lead routing', 'Cross-app sync pipelines', 'Autonomous email processing'],
    strengths: ['Visual drag-and-drop workflow canvas', 'Supports complex branching logic & error handling'],
    limitations: ['Learning curve for advanced data mapping formulas'],
    taskMappings: ['workflow automation', 'app integration', 'no-code pipelines'],
    websiteUrl: 'https://make.com',
    activeStatus: true,
    iconName: 'Zap'
  }
];

export const mockUserTools: UserToolItem[] = [
  {
    toolId: 'tool-chatgpt',
    addedAt: '2026-08-10',
    familiarity: 'proficient',
    userNotes: 'Used daily for quick prompt queries, document drafting, and general coding assistance.',
    primaryCategory: 'Reasoning & Writing',
    customTags: ['daily-driver', 'writing']
  },
  {
    toolId: 'tool-copilot',
    addedAt: '2026-08-20',
    familiarity: 'practicing',
    userNotes: 'Used in VS Code for autocomplete and inline function generation.',
    primaryCategory: 'Agentic Coding',
    customTags: ['coding', 'ide']
  }
];

export const mockLearnerFullState: any = {
  profile: mockUser,
  assessment: {
    status: 'not_started',
    answers: {},
    currentQuestionIndex: 0,
    completedAt: null,
    rewardClaimed: false,
    scores: {
      usageFrequency: 0,
      evaluationCapability: 0,
      workflowDesign: 0,
      strategicVision: 0,
      mentorshipReadiness: 0
    }
  },
  analysis: {
    status: 'locked',
    topCapability: 'AI Evaluation & Critical Assessment',
    growthArea: 'AI Workflow Design'
  },
  clarity: {
    status: 'locked',
    selectedAreas: [],
    selectedTopic: null,
    completedTopics: [],
    reflections: {}
  },
  focus: {
    status: 'locked',
    selectedTrack: null,
    history: [],
    activatedAt: null
  },
  radar: {
    status: 'available',
    investigatedSignalIds: []
  },
  investigation: {
    status: 'locked',
    selectedSignalId: null,
    userNotes: {}
  },
  relevance: {
    status: 'locked'
  },
  credits: {
    balance: 420,
    transactions: mockTransactions,
    claimedActions: []
  },
  notifications: [],
  aiWallet: {
    userTools: mockUserTools,
    dismissedRecommendations: []
  }
};

