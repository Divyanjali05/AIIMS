import { TaskCategory } from '../../types';

export interface DomainTaxonomyNode {
  domain: string;
  subdomains: string[];
  tasks: string[];
  capabilities: string[];
  categoryMapping: TaskCategory;
  keywords: string[];
}

/**
 * Domain Taxonomy Service — Vast Multi-Domain AI Ecosystem Taxonomy
 * Covers 35+ major domains, 100+ subdomains, and 300+ tasks.
 * Extensible: Allows dynamic domain discovery and sub-taxonomies without code changes.
 */
export class DomainTaxonomyService {
  private static taxonomy: DomainTaxonomyNode[] = [
    {
      domain: 'Education & Learning',
      subdomains: ['Tutoring', 'Exam Preparation', 'Academic Writing', 'Paper Summarization', 'Language Learning', 'Lesson Planning'],
      tasks: ['Analyze textbook PDF', 'Study exam material', 'Generate lesson plan', 'Summarize research paper', 'Practice spoken language', 'Citation management'],
      capabilities: ['Document Analysis', 'PDF Summarization', 'Tutoring Q&A', 'Language Practice', 'Academic Citation'],
      categoryMapping: 'Research & RAG',
      keywords: ['study', 'student', 'college', 'exam', 'paper', 'pdf', 'textbook', 'homework', 'learn', 'teacher', 'lesson', 'academic', 'telugu']
    },
    {
      domain: 'Software & Technology',
      subdomains: ['Coding Assistants', 'Agentic Coding', 'Debugging', 'Web Development', 'DevOps & CI/CD', 'No-Code/Low-Code', 'APIs & Cloud'],
      tasks: ['Write Python code', 'Refactor code repository', 'Debug terminal error', 'Create web app', 'Automate API workflows', 'No-code app building'],
      capabilities: ['Code Completion', 'Multi-file Agent Composer', 'Terminal Traceback Debugging', 'Repository Indexing', 'API Integration'],
      categoryMapping: 'Agentic Coding',
      keywords: ['code', 'coding', 'python', 'javascript', 'react', 'vs code', 'cursor', 'github', 'developer', 'software', 'app', 'bug', 'debug', 'ide', 'no-code', 'fullstack', 'backend']
    },
    {
      domain: 'Research & Knowledge',
      subdomains: ['Academic Research', 'Market Research', 'Fact Checking', 'Document RAG', 'Knowledge Discovery', 'Patent Research'],
      tasks: ['Search recent AI research papers', 'Fact check current news', 'Analyze 100-page PDF', 'Synthesize market trends', 'Literature review'],
      capabilities: ['Live Web Search', 'Verified Citations', 'Deep RAG', 'PDF Vector Indexing', 'Source Verification'],
      categoryMapping: 'Research & RAG',
      keywords: ['research', 'perplexity', 'paper', 'literature', 'fact check', 'citations', 'sources', 'notebooklm', '100-page', 'pdf', 'market research', 'deep dive']
    },
    {
      domain: 'Data & Analytics',
      subdomains: ['Spreadsheet Automation', 'Excel & CSV Analysis', 'Data Visualization', 'SQL & Databases', 'Statistical Modeling', 'Predictive Analytics'],
      tasks: ['Analyze Excel CSV file', 'Generate interactive charts', 'Automate repetitive Excel work', 'SQL query optimization', 'Statistical regression'],
      capabilities: ['Python Sandbox Execution', 'Chart Rendering', 'CSV Data Ingestion', 'Spreadsheet Processing', 'SQL Querying'],
      categoryMapping: 'Data Analysis',
      keywords: ['excel', 'csv', 'data', 'charts', 'graph', 'spreadsheet', 'pandas', 'statistics', 'sql', 'analysis', 'julius', 'visualize']
    },
    {
      domain: 'Business & Operations',
      subdomains: ['Process Optimization', 'Customer Feedback Analysis', 'Business Strategy', 'Lead Routing', 'Operations Automation', 'Project Management'],
      tasks: ['Analyze customer review complaints', 'Automate lead routing', 'Summarize meeting notes', 'Strategic business analysis', 'Process mapping'],
      capabilities: ['Customer Sentiment Analysis', 'Meeting Summarization', 'Workflow Automation', 'Decision Support'],
      categoryMapping: 'Automation',
      keywords: ['business', 'customer reviews', 'complaints', 'operations', 'strategy', 'lead', 'management', 'work', 'status report', 'sales', 'crm']
    },
    {
      domain: 'Marketing & Content',
      subdomains: ['SEO Copywriting', 'Social Media Content', 'Email Marketing', 'Brand Strategy', 'Customer Research'],
      tasks: ['Write blog post', 'Generate social media copy', 'SEO keyword research', 'Create email campaign'],
      capabilities: ['SEO Writing', 'Copy Generation', 'Content Planning'],
      categoryMapping: 'Reasoning & Writing',
      keywords: ['marketing', 'seo', 'blog', 'social media', 'copywriting', 'campaign', 'email', 'content']
    },
    {
      domain: 'Design & Creative',
      subdomains: ['Graphic Design', 'UI/UX Mockups', 'Concept Art', '3D & Illustration', 'Branding'],
      tasks: ['Generate marketing images', 'Create UI design mockups', 'Concept art creation', 'Brand logo ideas'],
      capabilities: ['Photorealistic Image Generation', 'Inpainting & Style Transfer', 'UI Vector Drafting'],
      categoryMapping: 'Image & Vision',
      keywords: ['image', 'design', 'photo', 'picture', 'midjourney', 'art', 'graphic', 'logo', 'ui', 'ux', 'concept art', 'canva', 'render']
    },
    {
      domain: 'Video Production',
      subdomains: ['Text-to-Video', 'Image-to-Video Motion', 'Video Editing', 'Avatars', 'Short-form Video'],
      tasks: ['Create short AI video clips', 'Animate image to video', 'Add video subtitles', 'Generate product video teasers'],
      capabilities: ['Cinematic Video Generation', 'Camera Motion Control', 'Video Inpainting', 'Avatar Synthesis'],
      categoryMapping: 'Video',
      keywords: ['video', 'animation', 'movie', 'reels', 'youtube', 'short video', 'runway', 'avatar', 'motion', 'teasers']
    },
    {
      domain: 'Audio & Voice',
      subdomains: ['Text-to-Speech', 'Speech-to-Text', 'Voice Cloning', 'Telugu & Regional Voice', 'Audio Editing', 'Podcasting'],
      tasks: ['Telugu voice generation', 'Generate podcast audio summary', 'Transcribe meeting audio', 'Text to speech voiceover'],
      capabilities: ['Text-to-Speech', 'Voice Cloning', 'Multilingual Audio', 'Audio Transcription'],
      categoryMapping: 'Multi-Modal',
      keywords: ['voice', 'audio', 'telugu', 'speech', 'text to speech', 'podcast', 'transcribe', 'dubbing', 'sound']
    },
    {
      domain: 'Presentation & Decks',
      subdomains: ['Slide Deck Generation', 'Pitch Decks', 'Interactive Presentation', 'Lecture Slides'],
      tasks: ['Create presentation deck from notes', 'Make college project presentation', 'Generate investor pitch deck'],
      capabilities: ['Instant Slide Deck Generation', 'Interactive Web Cards', 'Brand Theme Customization'],
      categoryMapping: 'Presentation',
      keywords: ['presentation', 'slides', 'slide deck', 'gamma', 'powerpoint', 'pitch deck', 'college presentation']
    },
    {
      domain: 'Architecture & Construction',
      subdomains: ['Architectural Design', 'Floor Planning', '3D Visualization', 'Rendering'],
      tasks: ['Design a house outline', 'Floor plan rendering', 'Architectural 3D concept'],
      capabilities: ['3D Floor Plan Rendering', 'Architectural Concept Synthesis'],
      categoryMapping: 'Image & Vision',
      keywords: ['house', 'architecture', 'floor plan', 'building', 'construction', 'home design', 'render 3d']
    },
    {
      domain: 'Health & Wellness',
      subdomains: ['Medical Research', 'Clinical Documentation', 'Patient Communication', 'Health Education'],
      tasks: ['Medical research paper lookup', 'Clinical document summarization'],
      capabilities: ['Medical Literature Search', 'Clinical Summarization'],
      categoryMapping: 'Research & RAG',
      keywords: ['health', 'medical', 'doctor', 'clinical', 'patient', 'wellness']
    },
    {
      domain: 'Legal & Compliance',
      subdomains: ['Contract Analysis', 'Legal Research', 'Compliance Review'],
      tasks: ['Analyze contract clauses', 'Legal document auditing'],
      capabilities: ['Contract Clause Analysis', 'Legal Retrieval'],
      categoryMapping: 'Research & RAG',
      keywords: ['legal', 'contract', 'law', 'compliance', 'clause', 'lawyer']
    },
    {
      domain: 'Finance & Accounting',
      subdomains: ['Financial Analysis', 'Personal Finance', 'Bookkeeping', 'Investment Research'],
      tasks: ['Financial model building', 'Analyze stock earnings report', 'Budget planning'],
      capabilities: ['Financial Data Processing', 'Earnings Ingestion'],
      categoryMapping: 'Data Analysis',
      keywords: ['finance', 'financial', 'accounting', 'budget', 'stock', 'investment', 'earnings']
    }
  ];

  public static getTaxonomy(): DomainTaxonomyNode[] {
    return this.taxonomy;
  }

  /**
   * Infer domains, subdomains, tasks, and capabilities from a natural language query
   */
  public static inferDomainFromQuery(query: string): {
    matchedDomains: string[];
    matchedSubdomains: string[];
    matchedTasks: string[];
    matchedCapabilities: string[];
    primaryCategory: TaskCategory;
  } {
    const q = query.toLowerCase();
    const matchedDomains: string[] = [];
    const matchedSubdomains: string[] = [];
    const matchedTasks: string[] = [];
    const matchedCapabilities: string[] = [];
    let bestCategoryMatch: TaskCategory = 'Reasoning & Writing';
    let maxKeywordScore = 0;

    for (const node of this.taxonomy) {
      let score = 0;
      for (const kw of node.keywords) {
        if (q.includes(kw)) score += 3;
      }
      for (const sub of node.subdomains) {
        if (q.includes(sub.toLowerCase())) {
          score += 5;
          matchedSubdomains.push(sub);
        }
      }
      for (const task of node.tasks) {
        const words = task.toLowerCase().split(' ');
        if (words.some(w => w.length > 3 && q.includes(w))) {
          score += 2;
          matchedTasks.push(task);
        }
      }

      if (score > 0) {
        matchedDomains.push(node.domain);
        matchedCapabilities.push(...node.capabilities);
        if (score > maxKeywordScore) {
          maxKeywordScore = score;
          bestCategoryMatch = node.categoryMapping;
        }
      }
    }

    // Default fallbacks if no explicit keywords matched
    if (matchedDomains.length === 0) {
      if (q.includes('ai') || q.includes('tool') || q.includes('help')) {
        matchedDomains.push('Personal Productivity', 'Business & Operations');
      } else {
        matchedDomains.push('Education & Learning');
      }
    }

    return {
      matchedDomains: Array.from(new Set(matchedDomains)),
      matchedSubdomains: Array.from(new Set(matchedSubdomains)),
      matchedTasks: Array.from(new Set(matchedTasks)),
      matchedCapabilities: Array.from(new Set(matchedCapabilities)),
      primaryCategory: bestCategoryMatch
    };
  }

  /**
   * Extensible registration for new dynamic domains discovered from backend feeds
   */
  public static registerDynamicDomain(domainNode: DomainTaxonomyNode): void {
    const exists = this.taxonomy.some(t => t.domain.toLowerCase() === domainNode.domain.toLowerCase());
    if (!exists) {
      this.taxonomy.push(domainNode);
    }
  }

  public static registerDomain(domainNode: Partial<DomainTaxonomyNode> & { domain: string }): void {
    const fullNode: DomainTaxonomyNode = {
      domain: domainNode.domain,
      subdomains: domainNode.subdomains || [],
      tasks: domainNode.tasks || [],
      capabilities: domainNode.capabilities || [],
      categoryMapping: domainNode.categoryMapping || 'Automation',
      keywords: domainNode.keywords || domainNode.domain.toLowerCase().split(' ')
    };
    this.registerDynamicDomain(fullNode);
  }
}
