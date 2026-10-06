import { AITool, ToolPricing, ToolLearningTrackLevel, ToolLifecycleStatus, VerificationStatus, TaskCategory } from '../../types';
import { AIToolModel } from '../../models/aiTool.model';
import mongoose from 'mongoose';

/**
 * Tool Catalog Service — Core Database Layer & Persistence for AI Tool Catalog
 * Source of truth for verified AI tools, pricing, 5-level learning tracks, lifecycle status,
 * verification metadata, and multi-domain associations.
 */
export class ToolCatalogService {
  private static catalog: Map<string, AITool> = new Map<string, AITool>();
  private static isInitialized = false;

  public static initializeCatalog(): void {
    if (this.isInitialized) return;

    const seedTools: AITool[] = [
      {
        id: 'tool-chatgpt',
        name: 'ChatGPT (GPT-4o)',
        provider: 'OpenAI',
        description: 'Versatile conversational AI model optimized for general reasoning, brainstorming, coding snippets, and multi-turn task execution.',
        shortDescription: 'Multi-modal AI assistant for writing, coding, and general tasks.',
        officialWebsite: 'https://chatgpt.com',
        category: 'Reasoning & Writing',
        categories: ['Reasoning & Writing', 'Agentic Coding'],
        domains: ['Education & Learning', 'Software & Technology', 'Personal Productivity', 'Business & Operations'],
        subdomains: ['Academic Writing', 'Coding Assistants', 'Tutoring', 'Copywriting'],
        capabilities: ['General Reasoning', 'Creative Writing', 'Code Generation', 'Web Browsing', 'Voice Interaction'],
        useCases: ['Drafting documentation', 'General problem solving', 'Quick syntax lookup', 'Interactive Q&A'],
        tasks: ['Draft documentation', 'Summarize text', 'Generate boilerplate code', 'Brainstorm ideas'],
        strengths: ['High general knowledge', 'Extensive custom GPT ecosystem', 'Fast response times', 'Voice integration'],
        limitations: ['200k context limit on web', 'Strict safety alignment', 'Occasional hallucination on niche libraries'],
        pricingDetails: {
          type: 'FREEMIUM',
          summary: 'Free tier available • Plus at $20/mo',
          freeTierAvailable: true,
          freeTrialAvailable: false,
          freeTierLimitations: 'Rate-limited GPT-4o usage; fallback to mini model',
          startingPriceMonthlyUsd: 20,
          verified: true,
          lastVerifiedAt: new Date().toISOString()
        },
        pricing: 'Free tier available • Plus at $20/mo',
        learningTrack: [
          { level: 1, levelName: 'DISCOVER', title: 'Level 1 — Discover ChatGPT', description: 'Understand token generation, system prompts, and basic conversational boundaries.', keyTopics: ['Prompts', 'System Context'], suggestedWorkflow: 'Ask structured single-turn questions with clear context.' },
          { level: 2, levelName: 'EXPLORE', title: 'Level 2 — Explore Features', description: 'Master web search, custom GPTs, file uploads, and canvas editing.', keyTopics: ['File Uploads', 'Custom GPTs'], suggestedWorkflow: 'Upload reference text and request formatted markdown outputs.' },
          { level: 3, levelName: 'PRACTICE', title: 'Level 3 — Practice Workflows', description: 'Build repeatable multi-turn prompt templates for recurring tasks.', keyTopics: ['Repeatable Templates', 'Structured JSON'], suggestedWorkflow: 'Create standard input-output templates for weekly reporting.' },
          { level: 4, levelName: 'ADVANCED', title: 'Level 4 — Advanced Prompting', description: 'Leverage multi-modal vision inputs, Custom Instructions, and API GPT-4o integration.', keyTopics: ['API Integration', 'Vision Inputs'], suggestedWorkflow: 'Integrate API keys into automated Python scripts.' },
          { level: 5, levelName: 'MASTER', title: 'Level 5 — Systemic Optimization', description: 'Evaluate model context window limits, benchmark outputs, and design multi-agent workflows.', keyTopics: ['Context Limits', 'RAG Evaluation'], suggestedWorkflow: 'Build complex zero-shot multi-agent pipeline scripts.' }
        ],
        firstSeenAt: '2023-01-01T00:00:00.000Z',
        lastVerifiedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        sourceUrls: ['https://openai.com/chatgpt', 'https://openai.com/pricing'],
        tags: ['openai', 'gpt-4o', 'chat', 'reasoning', 'writing'],
        activeStatus: true,
        taskMappings: ['long-form document reasoning', 'brainstorming', 'general assistance'],
        relevantRoles: ['AI Product Lead', 'Generalist', 'Writer', 'Engineer'],
        skillLevel: 'Beginner-Advanced',
        familiarityGuidance: {
          exploring: 'Focus on prompt framing & interactive Q&A.',
          practicing: 'Apply to structured documentation and multi-turn problem solving.',
          proficient: 'Leverage custom GPTs, API integrations, and code snippet generation.',
          mastered: 'Evaluate advanced LLM routing and zero-shot reasoning limits.'
        },
        relatedTools: ['tool-claude', 'tool-gemini-pro'],
        alternatives: ['tool-claude', 'tool-perplexity']
      },
      {
        id: 'tool-claude',
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        description: 'Advanced reasoning model with 200k context window, exceptional technical writing, code architecture, and Computer Use OS automation.',
        shortDescription: 'State-of-the-art model for extended reasoning, technical writing, and OS GUI control.',
        officialWebsite: 'https://claude.ai',
        category: 'Reasoning & Writing',
        categories: ['Reasoning & Writing', 'Agentic Coding'],
        domains: ['Software & Technology', 'Research & Knowledge', 'Education & Learning', 'Business & Operations'],
        subdomains: ['Agentic Coding', 'Academic Research', 'Technical Writing', 'Process Optimization'],
        capabilities: ['Extended Context Processing', 'Complex Technical Reasoning', 'Artifact Rendering', 'Computer Use OS Control', 'System Prompt Following'],
        useCases: ['Analyzing 100+ page documents', 'Complex multi-file refactoring', 'Nuanced editorial writing', 'GUI automation'],
        tasks: ['Analyze 100-page PDF', 'Refactor code architecture', 'Write technical documentation', 'Automate desktop GUI'],
        strengths: ['Superior long-form coherence', 'Minimal fluff and hallucination', 'Artifacts live preview canvas', 'Precise instruction following'],
        limitations: ['Strict rate limits on free tier', 'No native live web browsing on standard interface'],
        pricingDetails: {
          type: 'FREEMIUM',
          summary: 'Free tier available • Pro at $20/mo',
          freeTierAvailable: true,
          freeTrialAvailable: false,
          freeTierLimitations: 'Daily message limits based on context size',
          startingPriceMonthlyUsd: 20,
          verified: true,
          lastVerifiedAt: new Date().toISOString()
        },
        pricing: 'Free tier available • Pro at $20/mo',
        learningTrack: [
          { level: 1, levelName: 'DISCOVER', title: 'Level 1 — Discover Claude', description: 'Understand Claude 3.5 Sonnet strengths in long document analysis and Artifact rendering.', keyTopics: ['Artifacts', '200k Context'], suggestedWorkflow: 'Paste long documents and request structured summaries.' },
          { level: 2, levelName: 'EXPLORE', title: 'Level 2 — Explore Artifacts', description: 'Use live HTML/React Artifact canvas previews for rapid UI & doc prototyping.', keyTopics: ['Live Canvas', 'Markdown Rendering'], suggestedWorkflow: 'Draft SVG diagrams and web components directly in Artifacts.' },
          { level: 3, levelName: 'PRACTICE', title: 'Level 3 — Practice Architecture', description: 'Refactor complex codebases by supplying entire file context into single prompts.', keyTopics: ['Code Architecture', 'System Prompts'], suggestedWorkflow: 'Provide full file sets for multi-file refactoring.' },
          { level: 4, levelName: 'ADVANCED', title: 'Level 4 — Advanced Computer Use', description: 'Deploy Claude Computer Use API for desktop OS GUI screenshot grounding.', keyTopics: ['Computer Use', 'GUI Loops'], suggestedWorkflow: 'Configure OS automation agent loops in Python.' },
          { level: 5, levelName: 'MASTER', title: 'Level 5 — Enterprise Deployment', description: 'Architect multi-agent Claude pipelines with custom function calling & safety rails.', keyTopics: ['Enterprise RAG', 'Safety Alignment'], suggestedWorkflow: 'Orchestrate production agentic loops.' }
        ],
        firstSeenAt: '2024-03-01T00:00:00.000Z',
        lastVerifiedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        sourceUrls: ['https://anthropic.com/claude', 'https://claude.ai'],
        tags: ['anthropic', 'claude-3.5', 'artifacts', 'computer-use', 'coding'],
        activeStatus: true,
        taskMappings: ['long-form document reasoning', 'architecture design', 'technical writing', 'deep analysis'],
        relevantRoles: ['Software Engineer', 'AI Product Lead', 'Workflow Specialist'],
        skillLevel: 'Intermediate-Advanced',
        familiarityGuidance: {
          exploring: 'Explore Artifacts canvas and long document ingestion.',
          practicing: 'Apply to multi-file architecture design and technical writing.',
          proficient: 'Leverage Computer Use OS automation and system prompt controls.',
          mastered: 'Design autonomous desktop execution loops and custom tooling.'
        },
        relatedTools: ['tool-chatgpt', 'tool-cursor'],
        alternatives: ['tool-chatgpt']
      },
      {
        id: 'tool-cursor',
        name: 'Cursor IDE',
        provider: 'Anysphere',
        description: 'AI-first code editor built on VS Code with workspace-wide semantic search, composer agentic edits, and inline code generation.',
        shortDescription: 'AI-first IDE with multi-file Agent Composer and codebase indexing.',
        officialWebsite: 'https://cursor.com',
        category: 'Agentic Coding',
        categories: ['Agentic Coding'],
        domains: ['Software & Technology'],
        subdomains: ['Coding Assistants', 'Agentic Coding', 'Debugging', 'Web Development'],
        capabilities: ['Workspace-wide Indexing', 'Multi-file Agent Composer', 'Terminal Error Debugging', 'Custom .cursorrules'],
        useCases: ['End-to-end feature implementation', 'Repository-wide refactoring', 'Bug fixing from terminal tracebacks'],
        tasks: ['Write Python code', 'Refactor code repository', 'Debug terminal error', 'Create web app'],
        strengths: ['Native VS Code keybindings & extension compatibility', 'Fast codebase indexing', 'Seamless agentic diff previews'],
        limitations: ['Requires subscription after free trial limit', 'Requires indexing step on large mono-repos'],
        pricingDetails: {
          type: 'FREEMIUM',
          summary: 'Free tier available (200 uses) • Pro at $20/mo',
          freeTierAvailable: true,
          freeTrialAvailable: true,
          trialDurationDays: 14,
          freeTierLimitations: 'Limited fast premium model requests per month',
          startingPriceMonthlyUsd: 20,
          verified: true,
          lastVerifiedAt: new Date().toISOString()
        },
        pricing: 'Free tier available • Pro at $20/mo',
        learningTrack: [
          { level: 1, levelName: 'DISCOVER', title: 'Level 1 — Discover Cursor', description: 'Install Cursor IDE, import VS Code settings, and index local repositories.', keyTopics: ['Repo Indexing', 'Cmd+K Chat'], suggestedWorkflow: 'Use Cmd+K to edit functions inline.' },
          { level: 2, levelName: 'EXPLORE', title: 'Level 2 — Explore Composer', description: 'Leverage Cmd+I Composer for multi-file feature additions and diff inspection.', keyTopics: ['Composer', 'Multi-file Edits'], suggestedWorkflow: 'Request feature implementation spanning 3 files simultaneously.' },
          { level: 3, levelName: 'PRACTICE', title: 'Level 3 — Practice Debugging', description: 'Pipe terminal error logs into Cursor to generate automated fix diffs.', keyTopics: ['Terminal Debugging', 'Error Fixing'], suggestedWorkflow: 'Paste stack traces and accept single-click patches.' },
          { level: 4, levelName: 'ADVANCED', title: 'Level 4 — Advanced .cursorrules', description: 'Define custom workspace rules and system prompts in .cursorrules file.', keyTopics: ['.cursorrules', 'Project Guidelines'], suggestedWorkflow: 'Enforce TypeScript strict typing and custom style guides.' },
          { level: 5, levelName: 'MASTER', title: 'Level 5 — Full Agentic Autonomy', description: 'Orchestrate repository refactoring and automated test execution loops.', keyTopics: ['Autonomous Coding', 'Test Generation'], suggestedWorkflow: 'Delegate full feature specs to Composer agent.' }
        ],
        firstSeenAt: '2024-01-15T00:00:00.000Z',
        lastVerifiedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        sourceUrls: ['https://cursor.com', 'https://cursor.com/pricing'],
        tags: ['cursor', 'ide', 'coding', 'agentic-coding', 'vs-code'],
        activeStatus: true,
        taskMappings: ['agentic coding', 'repository refactoring', 'automated debugging'],
        relevantRoles: ['Fullstack Engineer', 'Software Developer', 'DevOps'],
        skillLevel: 'Intermediate-Advanced',
        familiarityGuidance: {
          exploring: 'Practice inline edits and single-file chat guidance.',
          practicing: 'Apply multi-file Composer agent for end-to-end features.',
          proficient: 'Configure custom .cursorrules and automated terminal fix loops.',
          mastered: 'Master autonomous repository-wide refactoring workflows.'
        },
        relatedTools: ['tool-copilot', 'tool-claude'],
        alternatives: ['tool-copilot', 'tool-devin']
      },
      {
        id: 'tool-perplexity',
        name: 'Perplexity AI',
        provider: 'Perplexity AI',
        description: 'AI search engine combining real-time web retrieval, explicit citation mapping, and structured synthesis pages.',
        shortDescription: 'Search-grounded AI research engine with explicit live web citations.',
        officialWebsite: 'https://perplexity.ai',
        category: 'Research & RAG',
        categories: ['Research & RAG'],
        domains: ['Research & Knowledge', 'Education & Learning', 'Business & Operations', 'Media & Journalism'],
        subdomains: ['Academic Research', 'Market Research', 'Fact Checking', 'Literature Review'],
        capabilities: ['Live Web Citation Synthesis', 'Academic Paper Search', 'Pro Search Deep Reasoning', 'Collections Knowledge Hub'],
        useCases: ['Market research', 'Fact checking current news', 'Academic literature synthesis'],
        tasks: ['Search recent AI research papers', 'Fact check current news', 'Synthesize market trends', 'Literature review'],
        strengths: ['Verifiable source URLs for every claim', 'Live multi-source synthesis', 'Clean markdown citations'],
        limitations: ['Not optimized for raw codebase generation', 'Relies heavily on live web search indexing'],
        pricingDetails: {
          type: 'FREEMIUM',
          summary: 'Free version available • Pro at $20/mo',
          freeTierAvailable: true,
          freeTrialAvailable: false,
          freeTierLimitations: 'Standard searches unlimited; Pro Search queries limited per day',
          startingPriceMonthlyUsd: 20,
          verified: true,
          lastVerifiedAt: new Date().toISOString()
        },
        pricing: 'Free version available • Pro at $20/mo',
        learningTrack: [
          { level: 1, levelName: 'DISCOVER', title: 'Level 1 — Discover Perplexity', description: 'Perform live web queries and inspect linked source URLs.', keyTopics: ['Live Search', 'Citations'], suggestedWorkflow: 'Search for recent market developments and verify sources.' },
          { level: 2, levelName: 'EXPLORE', title: 'Level 2 — Explore Pro Search', description: 'Enable Pro Search for multi-step reasoning and guided follow-up questions.', keyTopics: ['Pro Search', 'Multi-step Queries'], suggestedWorkflow: 'Use Pro Search for deep comparative market reports.' },
          { level: 3, levelName: 'PRACTICE', title: 'Level 3 — Practice Academic Focus', description: 'Filter search strictly to ArXiv and academic paper databases.', keyTopics: ['Academic Focus', 'Literature Review'], suggestedWorkflow: 'Filter search focus to Academic for literature review.' },
          { level: 4, levelName: 'ADVANCED', title: 'Level 4 — Advanced Collections', description: 'Organize research findings into shareable Collections hubs.', keyTopics: ['Collections', 'Knowledge Hubs'], suggestedWorkflow: 'Build dedicated topic Collections for team knowledge sharing.' },
          { level: 5, levelName: 'MASTER', title: 'Level 5 — Enterprise Research', description: 'Integrate API search endpoints into custom research synthesis bots.', keyTopics: ['API Integration', 'Automated RAG'], suggestedWorkflow: 'Automate daily competitive intelligence reports.' }
        ],
        firstSeenAt: '2023-06-01T00:00:00.000Z',
        lastVerifiedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        sourceUrls: ['https://perplexity.ai', 'https://perplexity.ai/pro'],
        tags: ['perplexity', 'research', 'citations', 'search', 'rag'],
        activeStatus: true,
        taskMappings: ['web research', 'fact verification', 'market analysis'],
        relevantRoles: ['Market Researcher', 'Analyst', 'Journalist', 'Product Manager'],
        skillLevel: 'Beginner-Intermediate',
        familiarityGuidance: {
          exploring: 'Perform search-grounded research queries with citations.',
          practicing: 'Apply Pro Search for structured market intelligence.',
          proficient: 'Build Collections knowledge hubs and verify academic papers.',
          mastered: 'Design automated real-time retrieval & fact verification pipelines.'
        },
        relatedTools: ['tool-notebooklm', 'tool-chatgpt'],
        alternatives: ['tool-notebooklm', 'tool-genspark']
      },
      {
        id: 'tool-notebooklm',
        name: 'Google NotebookLM',
        provider: 'Google',
        description: 'Personalized AI research assistant grounded strictly in your uploaded PDF, audio, document, and slide sources with Audio Overview generation.',
        shortDescription: 'Zero-hallucination PDF research assistant with Audio Overview podcast synthesis.',
        officialWebsite: 'https://notebooklm.google.com',
        category: 'Research & RAG',
        categories: ['Research & RAG'],
        domains: ['Education & Learning', 'Research & Knowledge', 'Legal & Compliance'],
        subdomains: ['Academic Writing', 'Paper Summarization', 'Document RAG', 'Knowledge Discovery'],
        capabilities: ['Strict Source-grounded Q&A', 'Audio Overview Podcast Synthesis', 'Multi-document Cross Indexing', 'Citation Highlighting'],
        useCases: ['Studying complex textbooks', 'Synthesizing internal company docs', 'Generating podcast-style summaries'],
        tasks: ['Analyze textbook PDF', 'Summarize 100-page document', 'Generate podcast audio summary', 'Study exam material'],
        strengths: ['Zero hallucination outside uploaded sources', 'Automatic podcast-style audio discussions', '100% Free Google tool'],
        limitations: ['Cannot search external web outside uploaded docs', 'Document size limits per notebook'],
        pricingDetails: {
          type: 'FREE',
          summary: '100% Free by Google',
          freeTierAvailable: true,
          freeTrialAvailable: false,
          verified: true,
          lastVerifiedAt: new Date().toISOString()
        },
        pricing: '100% Free by Google',
        learningTrack: [
          { level: 1, levelName: 'DISCOVER', title: 'Level 1 — Discover NotebookLM', description: 'Create a notebook and upload your first PDF or Google Doc source.', keyTopics: ['Notebook Creation', 'PDF Ingestion'], suggestedWorkflow: 'Upload lecture slides or research paper PDFs.' },
          { level: 2, levelName: 'EXPLORE', title: 'Level 2 — Explore Audio Overview', description: 'Generate 2-person AI audio podcast discussions summarizing your documents.', keyTopics: ['Audio Overview', 'Podcast Generation'], suggestedWorkflow: 'Click Generate Audio Overview to listen to paper summaries on the go.' },
          { level: 3, levelName: 'PRACTICE', title: 'Level 3 — Practice Grounded Q&A', description: 'Ask specific questions and inspect inline text citations in original files.', keyTopics: ['Citation Inspection', 'Source Notes'], suggestedWorkflow: 'Pin study notes directly to the notebook workspace.' },
          { level: 4, levelName: 'ADVANCED', title: 'Level 4 — Advanced Synthesis', description: 'Cross-index up to 50 large PDF documents for comprehensive synthesis.', keyTopics: ['Multi-PDF RAG', 'Study Guides'], suggestedWorkflow: 'Generate auto-formatted study guides and FAQ sheets.' },
          { level: 5, levelName: 'MASTER', title: 'Level 5 — Mastery', description: 'Master zero-hallucination domain knowledge repositories for complex projects.', keyTopics: ['Domain Repositories', 'Zero-Hallucination'], suggestedWorkflow: 'Build legal and academic reference spaces.' }
        ],
        firstSeenAt: '2024-02-01T00:00:00.000Z',
        lastVerifiedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        sourceUrls: ['https://notebooklm.google.com'],
        tags: ['google', 'notebooklm', 'pdf', 'research', 'audio-overview', 'free'],
        activeStatus: true,
        taskMappings: ['document RAG', 'textbook study', 'grounded research'],
        relevantRoles: ['Student', 'Researcher', 'Legal Analyst', 'Product Manager'],
        skillLevel: 'Beginner-Intermediate',
        familiarityGuidance: {
          exploring: 'Upload PDF source material and ask grounded questions.',
          practicing: 'Synthesize multi-document research notes and Audio Overviews.',
          proficient: 'Analyze complex legal & technical domain source material.',
          mastered: 'Build zero-hallucination study and research synthesis spaces.'
        },
        relatedTools: ['tool-perplexity', 'tool-chatgpt'],
        alternatives: ['tool-perplexity']
      },
      {
        id: 'tool-julius',
        name: 'Julius AI',
        provider: 'Julius AI',
        description: 'Data science AI assistant that executes Python code in sandboxed environments to analyze CSVs, create charts, and build statistical models.',
        shortDescription: 'AI Python sandbox data analyst for CSVs, Excel, and chart rendering.',
        officialWebsite: 'https://julius.ai',
        category: 'Data Analysis',
        categories: ['Data Analysis'],
        domains: ['Data & Analytics', 'Business & Operations', 'Finance & Accounting'],
        subdomains: ['Excel & CSV Analysis', 'Data Visualization', 'Statistical Modeling'],
        capabilities: ['Automated Python Sandbox Execution', 'Interactive Chart Rendering', 'Statistical Hypothesis Testing', 'Data Cleaning'],
        useCases: ['Exploratory data analysis', 'Creating publication-ready charts', 'Statistical regression modeling'],
        tasks: ['Analyze Excel CSV file', 'Generate interactive charts', 'Automate repetitive Excel work', 'Statistical regression'],
        strengths: ['Executes actual Python data code', 'Exports downloadable clean datasets & plots', 'Supports Excel & SQL'],
        limitations: ['Requires subscription for large dataset compute limits'],
        pricingDetails: {
          type: 'FREEMIUM',
          summary: 'Free tier available (15 queries/mo) • Pro at $20/mo',
          freeTierAvailable: true,
          freeTrialAvailable: false,
          freeTierLimitations: '15 free data messages per month',
          startingPriceMonthlyUsd: 20,
          verified: true,
          lastVerifiedAt: new Date().toISOString()
        },
        pricing: 'Free tier available • Pro at $20/mo',
        learningTrack: [
          { level: 1, levelName: 'DISCOVER', title: 'Level 1 — Discover Julius', description: 'Upload a CSV file and ask Julius to calculate basic summary metrics.', keyTopics: ['CSV Upload', 'Summary Stats'], suggestedWorkflow: 'Upload sales or survey data for instant column summaries.' },
          { level: 2, levelName: 'EXPLORE', title: 'Level 2 — Explore Charts', description: 'Request bar charts, scatter plots, and box plots rendered dynamically.', keyTopics: ['Data Visualization', 'Plotly Charts'], suggestedWorkflow: 'Ask for publication-ready PNG/SVG chart exports.' },
          { level: 3, levelName: 'PRACTICE', title: 'Level 3 — Practice Data Cleaning', description: 'Clean missing values, normalize dates, and run correlation matrices.', keyTopics: ['Data Cleaning', 'Correlation'], suggestedWorkflow: 'Clean raw spreadsheet exports before reporting.' },
          { level: 4, levelName: 'ADVANCED', title: 'Level 4 — Advanced Modeling', description: 'Run linear regression, clustering, and forecasting models in Python sandbox.', keyTopics: ['Regression', 'Clustering'], suggestedWorkflow: 'Build predictive trend models from historical sales CSVs.' },
          { level: 5, levelName: 'MASTER', title: 'Level 5 — Data Pipeline Automation', description: 'Automate weekly spreadsheet auditing and custom Python statistical workflows.', keyTopics: ['Automated Analytics', 'Python Pipelines'], suggestedWorkflow: 'Establish automated end-to-end data reporting.' }
        ],
        firstSeenAt: '2023-09-01T00:00:00.000Z',
        lastVerifiedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        sourceUrls: ['https://julius.ai', 'https://julius.ai/pricing'],
        tags: ['julius', 'data-analysis', 'excel', 'csv', 'charts', 'python'],
        activeStatus: true,
        taskMappings: ['data analysis', 'chart visualization', 'python execution'],
        relevantRoles: ['Data Analyst', 'Business Lead', 'Researcher'],
        skillLevel: 'Intermediate',
        familiarityGuidance: {
          exploring: 'Upload CSV datasets and ask basic data summaries.',
          practicing: 'Execute Python sandbox code for interactive charts.',
          proficient: 'Perform statistical regression and automated data cleaning.',
          mastered: 'Build full data science notebook execution pipelines.'
        },
        relatedTools: ['tool-chatgpt'],
        alternatives: ['tool-chatgpt']
      },
      {
        id: 'tool-gamma',
        name: 'Gamma App',
        provider: 'Gamma Tech',
        description: 'AI presentation deck and web page generator that transforms text prompts or outlines into beautifully styled slide decks.',
        shortDescription: 'AI slide deck and presentation generator from text prompts.',
        officialWebsite: 'https://gamma.app',
        category: 'Presentation',
        categories: ['Presentation'],
        domains: ['Presentation & Decks', 'Education & Learning', 'Business & Operations'],
        subdomains: ['Slide Deck Generation', 'Pitch Decks', 'Interactive Presentation'],
        capabilities: ['Instant Slide Deck Generation', 'Interactive Web Cards', 'Brand Theme Customization', 'AI Slide Editing'],
        useCases: ['Pitch deck creation', 'Lecture presentations', 'Project status updates'],
        tasks: ['Create presentation deck from notes', 'Make college project presentation', 'Generate investor pitch deck'],
        strengths: ['Saves hours of PowerPoint formatting', 'Modern responsive layouts', 'Interactive embed support'],
        limitations: ['Free tier adds Gamma watermark on exports'],
        pricingDetails: {
          type: 'FREEMIUM',
          summary: 'Free tier (400 credits) • Plus at $10/mo',
          freeTierAvailable: true,
          freeTrialAvailable: false,
          freeTierLimitations: '400 initial AI credits; badge on export',
          startingPriceMonthlyUsd: 10,
          verified: true,
          lastVerifiedAt: new Date().toISOString()
        },
        pricing: 'Free tier available • Plus at $10/mo',
        learningTrack: [
          { level: 1, levelName: 'DISCOVER', title: 'Level 1 — Discover Gamma', description: 'Enter a topic prompt to generate a 10-slide draft deck in 30 seconds.', keyTopics: ['Prompt Decking', 'Themes'], suggestedWorkflow: 'Type a presentation topic to generate an outline.' },
          { level: 2, levelName: 'EXPLORE', title: 'Level 2 — Explore AI Card Editing', description: 'Use AI inline commands to rewrite text, split cards, and add visual layouts.', keyTopics: ['Card Editing', 'Inline AI'], suggestedWorkflow: 'Edit slide cards using natural language formatting commands.' },
          { level: 3, levelName: 'PRACTICE', title: 'Level 3 — Practice Custom Styling', description: 'Apply custom color palettes, Google Fonts, and interactive web embeds.', keyTopics: ['Custom Palettes', 'Web Embeds'], suggestedWorkflow: 'Embed live charts and videos inside slide cards.' },
          { level: 4, levelName: 'ADVANCED', title: 'Level 4 — Document Ingestion', description: 'Upload raw PDF notes or Word docs to transform directly into presentation decks.', keyTopics: ['Doc to Deck', 'Presentation RAG'], suggestedWorkflow: 'Transform project notes directly into client slides.' },
          { level: 5, levelName: 'MASTER', title: 'Level 5 — Executive Deck Design', description: 'Master production pitch decks, custom brand kits, and analytics tracking.', keyTopics: ['Pitch Decks', 'Brand Templates'], suggestedWorkflow: 'Establish automated presentation templates for your org.' }
        ],
        firstSeenAt: '2023-05-01T00:00:00.000Z',
        lastVerifiedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        sourceUrls: ['https://gamma.app', 'https://gamma.app/pricing'],
        tags: ['gamma', 'presentation', 'slides', 'powerpoint', 'deck'],
        activeStatus: true,
        taskMappings: ['presentation design', 'pitch decks', 'slide generation'],
        relevantRoles: ['Product Lead', 'Founder', 'Student', 'Consultant'],
        skillLevel: 'Beginner',
        familiarityGuidance: {
          exploring: 'Generate initial slide deck outlines from prompt topics.',
          practicing: 'Customize brand themes and interactive web cards.',
          proficient: 'Design comprehensive pitch decks and lecture presentations.',
          mastered: 'Establish automated document-to-presentation workflows.'
        },
        relatedTools: [],
        alternatives: ['tool-canva']
      },
      {
        id: 'tool-midjourney',
        name: 'Midjourney v6',
        provider: 'Midjourney Inc',
        description: 'State-of-the-art generative image model famous for photorealistic detail, artistic control, and stylization.',
        shortDescription: 'Photorealistic AI image generator and artistic stylization tool.',
        officialWebsite: 'https://midjourney.com',
        category: 'Image & Vision',
        categories: ['Image & Vision'],
        domains: ['Design & Creative', 'Marketing & Content', 'Architecture & Construction'],
        subdomains: ['Graphic Design', 'UI/UX Mockups', 'Concept Art', '3D & Illustration'],
        capabilities: ['Photorealistic Rendering', 'Style Transfer & Inpainting', 'Aspect Ratio Control', 'Character Consistency'],
        useCases: ['Marketing visual creation', 'UI mockup imagery', 'Concept art generation'],
        tasks: ['Generate marketing images', 'Create UI design mockups', 'Concept art creation', 'Floor plan rendering'],
        strengths: ['Unrivaled aesthetic quality', 'Detailed texture and lighting control'],
        limitations: ['Discord workflow (web editor rolling out)', 'No free tier available'],
        pricingDetails: {
          type: 'PAID',
          summary: 'Paid plans from $10/mo to $60/mo',
          freeTierAvailable: false,
          freeTrialAvailable: false,
          startingPriceMonthlyUsd: 10,
          verified: true,
          lastVerifiedAt: new Date().toISOString()
        },
        pricing: 'Paid plans from $10/mo',
        learningTrack: [
          { level: 1, levelName: 'DISCOVER', title: 'Level 1 — Discover Midjourney', description: 'Understand prompt parameter syntax (`--ar 16:9`, `--v 6.0`, `--style raw`).', keyTopics: ['Prompt Parameters', 'Aspect Ratios'], suggestedWorkflow: 'Use parameter tags for crisp photo prompts.' },
          { level: 2, levelName: 'EXPLORE', title: 'Level 2 — Explore Inpainting', description: 'Use Vary Region (inpainting) and Zoom Out for selective image modifications.', keyTopics: ['Vary Region', 'Zoom Out'], suggestedWorkflow: 'Inpaint specific visual details in draft generations.' },
          { level: 3, levelName: 'PRACTICE', title: 'Level 3 — Practice Character Consistency', description: 'Use `--cref` (character reference) and `--sref` (style reference) tags.', keyTopics: ['Character Ref', 'Style Ref'], suggestedWorkflow: 'Maintain identical character models across image series.' },
          { level: 4, levelName: 'ADVANCED', title: 'Level 4 — Advanced Lighting', description: 'Master photographic lighting parameters (octane render, volumetric, 85mm lens).', keyTopics: ['Photographic Control', 'Lens Specs'], suggestedWorkflow: 'Direct photorealistic product shoots.' },
          { level: 5, levelName: 'MASTER', title: 'Level 5 — Artistic Direction', description: 'Direct commercial campaign art, architectural renderings, and visual assets.', keyTopics: ['Commercial Direction', 'Asset Pipelines'], suggestedWorkflow: 'Deliver production marketing visuals.' }
        ],
        firstSeenAt: '2022-07-01T00:00:00.000Z',
        lastVerifiedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        sourceUrls: ['https://midjourney.com', 'https://docs.midjourney.com'],
        tags: ['midjourney', 'image-generation', 'art', 'design', 'photo'],
        activeStatus: true,
        taskMappings: ['image generation', 'visual design', 'concept art'],
        relevantRoles: ['UI/UX Designer', 'Marketing Lead', 'Concept Artist'],
        skillLevel: 'Intermediate',
        familiarityGuidance: {
          exploring: 'Experiment with basic prompt structures and stylization.',
          practicing: 'Apply aspect ratio controls, inpainting, and style references.',
          proficient: 'Maintain consistent character models across marketing suites.',
          mastered: 'Direct complex visual concept production and artistic direction.'
        },
        relatedTools: ['tool-runway'],
        alternatives: ['tool-dalle3']
      },
      {
        id: 'tool-runway',
        name: 'Runway Gen-3 Alpha',
        provider: 'Runway AI',
        description: 'AI video generation and visual effects platform for turning text prompts and static images into cinematic video clips.',
        shortDescription: 'Cinematic text-to-video and image-to-video motion generator.',
        officialWebsite: 'https://runwayml.com',
        category: 'Video',
        categories: ['Video'],
        domains: ['Video Production', 'Design & Creative', 'Marketing & Content'],
        subdomains: ['Text-to-Video', 'Image-to-Video Motion', 'Video Editing'],
        capabilities: ['Text-to-Video', 'Image-to-Video Motion', 'Camera Movement Control', 'Video Inpainting'],
        useCases: ['Product video teasers', 'Social media animations', 'Visual storytelling'],
        tasks: ['Create short AI video clips', 'Animate image to video', 'Generate product video teasers'],
        strengths: ['High cinematic fidelity', 'Fine control over camera motion'],
        limitations: ['Generation credits exhaust quickly on free tier'],
        pricingDetails: {
          type: 'FREEMIUM',
          summary: 'Free tier available (125 credits) • Standard at $15/mo',
          freeTierAvailable: true,
          freeTrialAvailable: false,
          freeTierLimitations: '125 one-time credits; cannot buy extra credits',
          startingPriceMonthlyUsd: 15,
          verified: true,
          lastVerifiedAt: new Date().toISOString()
        },
        pricing: 'Free tier available • Standard at $15/mo',
        learningTrack: [
          { level: 1, levelName: 'DISCOVER', title: 'Level 1 — Discover Runway', description: 'Generate your first 4-second Gen-3 text-to-video clip.', keyTopics: ['Text to Video', 'Clip Length'], suggestedWorkflow: 'Type descriptive motion prompts for video clips.' },
          { level: 2, levelName: 'EXPLORE', title: 'Level 2 — Image-to-Video', description: 'Upload static Midjourney images and animate camera motion.', keyTopics: ['Image to Video', 'Motion Brush'], suggestedWorkflow: 'Animate static product images into motion clips.' },
          { level: 3, levelName: 'PRACTICE', title: 'Level 3 — Camera Controls', description: 'Master pan, zoom, tilt, and speed controls for cinematic shots.', keyTopics: ['Camera Motion', 'Speed Controls'], suggestedWorkflow: 'Direct specific camera pans for commercial shots.' },
          { level: 4, levelName: 'ADVANCED', title: 'Level 4 — Video Editing', description: 'Combine multiple Gen-3 clips into sequential video teasers.', keyTopics: ['Sequence Editing', 'Video Inpainting'], suggestedWorkflow: 'Produce full 30-second animated video teasers.' },
          { level: 5, levelName: 'MASTER', title: 'Level 5 — Production Direction', description: 'Master commercial AI video production workflows.', keyTopics: ['Commercial Video', 'VFX Pipelines'], suggestedWorkflow: 'Deliver broadcast video campaigns.' }
        ],
        firstSeenAt: '2023-03-01T00:00:00.000Z',
        lastVerifiedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        sourceUrls: ['https://runwayml.com', 'https://runwayml.com/pricing'],
        tags: ['runway', 'gen-3', 'video', 'text-to-video', 'animation'],
        activeStatus: true,
        taskMappings: ['video generation', 'motion graphics', 'animation'],
        relevantRoles: ['Video Editor', 'Content Creator', 'Marketing Lead'],
        skillLevel: 'Intermediate',
        familiarityGuidance: {
          exploring: 'Generate short text-to-video motion clips.',
          practicing: 'Apply image-to-video motion and camera movement controls.',
          proficient: 'Execute video inpainting and cinematic sequence editing.',
          mastered: 'Produce full commercial video teasers and motion graphics.'
        },
        relatedTools: ['tool-midjourney'],
        alternatives: ['tool-pika']
      },
      {
        id: 'tool-make',
        name: 'Make.com AI',
        provider: 'Make.com',
        description: 'Visual workflow automation platform connecting 1,500+ apps with AI modules for automated webhooks and data pipelines.',
        shortDescription: 'Visual no-code workflow builder connecting 1,500+ SaaS apps to AI nodes.',
        officialWebsite: 'https://make.com',
        category: 'Automation',
        categories: ['Automation'],
        domains: ['Business & Operations', 'Software & Technology', 'Personal Productivity'],
        subdomains: ['Operations Automation', 'No-Code/Low-Code', 'APIs & Cloud'],
        capabilities: ['No-Code Workflow Builder', 'AI Agent Node Integration', 'Webhook Triggers', 'Data Mapping & Transformation'],
        useCases: ['Automating lead routing', 'Cross-app sync pipelines', 'Autonomous email processing'],
        tasks: ['Automate lead routing', 'Automate repetitive Excel work', 'No-code app building'],
        strengths: ['Visual drag-and-drop workflow canvas', 'Supports complex branching logic & error handling'],
        limitations: ['Learning curve for advanced data mapping formulas'],
        pricingDetails: {
          type: 'FREEMIUM',
          summary: 'Free tier available (1,000 ops/mo) • Core at $9/mo',
          freeTierAvailable: true,
          freeTrialAvailable: false,
          freeTierLimitations: '1,000 operations per month; 15-min check interval',
          startingPriceMonthlyUsd: 9,
          verified: true,
          lastVerifiedAt: new Date().toISOString()
        },
        pricing: 'Free tier available • Core at $9/mo',
        learningTrack: [
          { level: 1, levelName: 'DISCOVER', title: 'Level 1 — Discover Make', description: 'Create a simple 2-module scenario connecting a webhook to OpenAI.', keyTopics: ['Webhooks', 'Scenario Creation'], suggestedWorkflow: 'Trigger an AI summary whenever a web form is submitted.' },
          { level: 2, levelName: 'EXPLORE', title: 'Level 2 — Explore App Modules', description: 'Connect Google Sheets, Slack, and email to AI decision nodes.', keyTopics: ['App Integrations', 'Data Mapping'], suggestedWorkflow: 'Parse incoming emails and log structured data to Sheets.' },
          { level: 3, levelName: 'PRACTICE', title: 'Level 3 — Practice Routers', description: 'Implement Routers and Filters for conditional branching workflows.', keyTopics: ['Routers', 'Filters', 'JSON Parsing'], suggestedWorkflow: 'Route high-priority lead emails directly to Slack alerts.' },
          { level: 4, levelName: 'ADVANCED', title: 'Level 4 — Advanced Error Handling', description: 'Set up error handler directives (Resume, Ignore, Break) and iterator nodes.', keyTopics: ['Error Directives', 'Iterators'], suggestedWorkflow: 'Handle API rate limits gracefully with automatic retries.' },
          { level: 5, levelName: 'MASTER', title: 'Level 5 — Enterprise Automation', description: 'Architect multi-agent no-code infrastructure processing thousands of daily ops.', keyTopics: ['Enterprise Workflows', 'Custom Apps'], suggestedWorkflow: 'Build autonomous business operations pipelines.' }
        ],
        firstSeenAt: '2022-04-01T00:00:00.000Z',
        lastVerifiedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        sourceUrls: ['https://make.com', 'https://make.com/pricing'],
        tags: ['make', 'automation', 'no-code', 'webhooks', 'integrations'],
        activeStatus: true,
        taskMappings: ['workflow automation', 'app integration', 'no-code pipelines'],
        relevantRoles: ['Operations Lead', 'Automation Specialist', 'Product Manager'],
        skillLevel: 'Intermediate-Advanced',
        familiarityGuidance: {
          exploring: 'Build simple 2-node webhook integration scenarios.',
          practicing: 'Connect AI decision nodes with multi-app data mapping.',
          proficient: 'Implement complex branching logic and error handling loops.',
          mastered: 'Architect enterprise no-code automation infrastructure.'
        },
        relatedTools: ['tool-cursor'],
        alternatives: ['tool-zapier']
      },
      {
        id: 'tool-astra',
        name: 'Astra AI Assistant',
        provider: 'Astra Labs',
        description: 'Newly discovered autonomous multi-modal assistant specializing in real-time document analysis, multi-language speech generation, and interactive workflow execution.',
        shortDescription: 'NEW: Autonomous assistant for real-time document analysis and regional voice generation.',
        officialWebsite: 'https://astra-ai.example.com',
        category: 'Multi-Modal',
        categories: ['Multi-Modal', 'Audio & Voice', 'Research & RAG'],
        domains: ['Audio & Voice', 'Education & Learning', 'Research & Knowledge', 'Communication & Languages'],
        subdomains: ['Telugu & Regional Voice', 'Text-to-Speech', 'Document RAG', 'Academic Writing'],
        capabilities: ['Real-time PDF Parsing', 'Telugu & Regional Voice Generation', 'Multilingual Speech Synthesis', 'Zero-shot Document Summarization'],
        useCases: ['Telugu voiceover generation', 'Multi-language document Q&A', 'Audiobook creation'],
        tasks: ['Telugu voice generation', 'Analyze 100-page PDF', 'Practice spoken language'],
        strengths: ['Native high-fidelity Telugu and Indic voice generation', 'Instant PDF question answering'],
        limitations: ['New tool in open beta; limited regional language voice hours'],
        pricingDetails: {
          type: 'FREE_TRIAL',
          summary: 'Free trial available (14 days) • $12/mo Pro',
          freeTierAvailable: true,
          freeTrialAvailable: true,
          trialDurationDays: 14,
          startingPriceMonthlyUsd: 12,
          verified: true,
          lastVerifiedAt: new Date().toISOString()
        },
        pricing: 'Free trial available (14 days) • $12/mo',
        learningTrack: [
          { level: 1, levelName: 'DISCOVER', title: 'Level 1 — Discover Astra', description: 'Explore Astra regional Indic voice synthesis and multi-language parsing.', keyTopics: ['Regional Voice', 'PDF Ingestion'], suggestedWorkflow: 'Test Indic voiceover generation from text prompts.' },
          { level: 2, levelName: 'EXPLORE', title: 'Level 2 — Explore Voice Controls', description: 'Adjust pitch, tone, and pacing for Telugu and Hindi speech output.', keyTopics: ['Pitch & Speed', 'Emotion Controls'], suggestedWorkflow: 'Generate high quality Telugu voice notes.' },
          { level: 3, levelName: 'PRACTICE', title: 'Level 3 — Practice Document Audio', description: 'Convert research PDFs directly into multi-lingual audio explanations.', keyTopics: ['PDF to Speech', 'Academic Summaries'], suggestedWorkflow: 'Listen to Telugu audio summaries of research papers.' },
          { level: 4, levelName: 'ADVANCED', title: 'Level 4 — Advanced Integration', description: 'Deploy Astra API endpoints into web apps for live speech translation.', keyTopics: ['API Translation', 'Speech Loops'], suggestedWorkflow: 'Integrate Astra voice API into student learning apps.' },
          { level: 5, levelName: 'MASTER', title: 'Level 5 — Enterprise Multilingual', description: 'Master large scale regional language audio asset production.', keyTopics: ['Enterprise Audio', 'Multilingual RAG'], suggestedWorkflow: 'Build localized educational audio content suites.' }
        ],
        firstSeenAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        lastVerifiedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        status: 'NEW',
        verificationStatus: 'VERIFIED',
        sourceUrls: ['https://astra-ai.example.com/release-notes'],
        tags: ['astra', 'new', 'telugu', 'voice', 'indic-ai', 'pdf-rag'],
        activeStatus: true,
        taskMappings: ['telugu voice generation', 'regional audio', 'multilingual research'],
        relevantRoles: ['Content Creator', 'Student', 'Educator'],
        skillLevel: 'Beginner-Intermediate',
        familiarityGuidance: {
          exploring: 'Test Indic voiceover generation and PDF query responses.',
          practicing: 'Adjust regional voice pitch, tone, and pacing.',
          proficient: 'Convert document PDFs into regional audio podcasts.',
          mastered: 'Integrate Astra voice API into student web applications.'
        },
        relatedTools: ['tool-notebooklm'],
        alternatives: ['tool-notebooklm']
      },
      {
        id: 'tool-v0',
        name: 'v0 by Vercel',
        provider: 'Vercel',
        description: 'Generative UI system that transforms text prompts into production-ready React, Tailwind CSS, and Shadcn UI code components.',
        shortDescription: 'Text-to-React component generator powered by Vercel.',
        officialWebsite: 'https://v0.dev',
        category: 'Agentic Coding',
        categories: ['Agentic Coding'],
        domains: ['Software & Technology', 'Design & Creative'],
        subdomains: ['Web Development', 'UI/UX Mockups', 'No-Code/Low-Code'],
        capabilities: ['React & Tailwind UI Generation', 'Shadcn Component Integration', 'Live Web Preview', 'One-click Code Copy'],
        useCases: ['Rapid UI mockup prototyping', 'Generating accessible React components', 'Frontend dashboard building'],
        tasks: ['Create web app', 'Create UI design mockups', 'No-code app building'],
        strengths: ['Produces clean, modern Tailwind + Shadcn React code', 'Instant live web preview'],
        limitations: ['Focused on frontend UI; requires backend API wiring'],
        pricingDetails: {
          type: 'FREEMIUM',
          summary: 'Free tier (200 credits/mo) • Premium at $20/mo',
          freeTierAvailable: true,
          freeTrialAvailable: false,
          startingPriceMonthlyUsd: 20,
          verified: true,
          lastVerifiedAt: new Date().toISOString()
        },
        pricing: 'Free tier available • $20/mo Premium',
        learningTrack: [
          { level: 1, levelName: 'DISCOVER', title: 'Level 1 — Discover v0', description: 'Prompt v0 with UI requirements and inspect generated React components.', keyTopics: ['UI Prompts', 'React Components'], suggestedWorkflow: 'Type a dashboard UI prompt to view live previews.' },
          { level: 2, levelName: 'EXPLORE', title: 'Level 2 — Explore Iterative Refinement', description: 'Refine UI layouts inline with follow-up prompts.', keyTopics: ['Inline Refinement', 'Tailwind CSS'], suggestedWorkflow: 'Iterate on color themes and button states.' },
          { level: 3, levelName: 'PRACTICE', title: 'Level 3 — Practice Code Copy', description: 'Copy Shadcn React component code directly into Next.js projects.', keyTopics: ['Shadcn UI', 'Next.js Integration'], suggestedWorkflow: 'Paste generated UI cards into local apps.' },
          { level: 4, levelName: 'ADVANCED', title: 'Level 4 — Advanced Design Systems', description: 'Provide custom brand design tokens in system prompts.', keyTopics: ['Design Systems', 'Token Enforcing'], suggestedWorkflow: 'Enforce brand color tokens in generated UI components.' },
          { level: 5, levelName: 'MASTER', title: 'Level 5 — Production UI Workflows', description: 'Build entire web app frontend design suites in record time.', keyTopics: ['Production Frontend', 'Rapid Prototyping'], suggestedWorkflow: 'Deliver client web app frontends effortlessly.' }
        ],
        firstSeenAt: '2023-10-01T00:00:00.000Z',
        lastVerifiedAt: new Date().toISOString(),
        lastUpdatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'RECENTLY_UPDATED',
        verificationStatus: 'VERIFIED',
        sourceUrls: ['https://v0.dev', 'https://vercel.com/blog/v0'],
        tags: ['v0', 'vercel', 'react', 'tailwind', 'ui-generator'],
        activeStatus: true,
        taskMappings: ['frontend ui generation', 'react component mockup', 'web design'],
        relevantRoles: ['Frontend Engineer', 'UI/UX Designer', 'Product Manager'],
        skillLevel: 'Beginner-Intermediate',
        familiarityGuidance: {
          exploring: 'Prompt v0 for basic React button & card components.',
          practicing: 'Iterate inline on responsive dashboard layouts.',
          proficient: 'Integrate Shadcn React code into production Next.js apps.',
          mastered: 'Establish automated generative UI prototyping workflows.'
        },
        relatedTools: ['tool-cursor'],
        alternatives: ['tool-cursor']
      }
    ];

    for (const tool of seedTools) {
      this.catalog.set(tool.id, tool);
    }
    this.isInitialized = true;
  }

  public static getCatalog(): AITool[] {
    this.initializeCatalog();
    return Array.from(this.catalog.values());
  }

  public static getToolById(id: string): AITool | undefined {
    this.initializeCatalog();
    return this.catalog.get(id);
  }

  public static upsertTool(tool: AITool): void {
    this.initializeCatalog();
    const existing = this.catalog.get(tool.id);
    const updatedTool: AITool = existing
      ? {
          ...existing,
          ...tool,
          lastUpdatedAt: new Date().toISOString()
        }
      : {
          ...tool,
          firstSeenAt: tool.firstSeenAt || new Date().toISOString(),
          lastVerifiedAt: tool.lastVerifiedAt || new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString()
        };

    this.catalog.set(tool.id, updatedTool);

    // Persist to MongoDB if connection is active
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      AIToolModel.findOneAndUpdate({ id: tool.id }, updatedTool, { upsert: true, new: true })
        .catch(err => console.warn(`[ToolCatalog] MongoDB upsert warning (${tool.id}):`, err.message));
    }
  }

  public static removeTool(id: string): boolean {
    this.initializeCatalog();
    const deleted = this.catalog.delete(id);
    if (deleted && mongoose.connection && mongoose.connection.readyState === 1) {
      AIToolModel.deleteOne({ id }).catch(err => console.warn(`[ToolCatalog] MongoDB delete warning (${id}):`, err.message));
    }
    return deleted;
  }

  public static async syncFromDatabase(): Promise<void> {
    this.initializeCatalog();
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        const docs = await AIToolModel.find({}).exec();
        if (docs && docs.length > 0) {
          for (const doc of docs) {
            const rawObj = doc.toObject() as any;
            delete rawObj._id;
            delete rawObj.__v;
            this.catalog.set(doc.id, rawObj as AITool);
          }
          console.log(`[ToolCatalog] Synchronized ${docs.length} tools from MongoDB.`);
        }
      } catch (err: any) {
        console.warn('[ToolCatalog] MongoDB catalog sync failed:', err.message);
      }
    }
  }

  public static getNewAndRecentlyUpdatedTools(): AITool[] {
    this.initializeCatalog();
    const tools = Array.from(this.catalog.values());
    return tools.filter(t => t.status === 'NEW' || t.status === 'RECENTLY_UPDATED' || t.status === 'UPDATED');
  }
}
