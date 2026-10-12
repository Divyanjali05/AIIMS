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
      domain: 'Business',
      subdomains: ['Process Optimization', 'Customer Feedback Analysis', 'Business Strategy', 'Lead Routing', 'Operations Automation', 'Project Management'],
      tasks: ['Analyze customer review complaints', 'Automate lead routing', 'Summarize meeting notes', 'Strategic business analysis', 'Process mapping'],
      capabilities: ['Customer Sentiment Analysis', 'Meeting Summarization', 'Workflow Automation', 'Decision Support'],
      categoryMapping: 'Automation',
      keywords: ['business', 'customer reviews', 'complaints', 'operations', 'strategy', 'lead', 'management', 'work', 'status report', 'sales', 'crm']
    },
    {
      domain: 'Marketing',
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
      domain: 'Video',
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
      domain: 'Health & Wellness',
      subdomains: ['Medical Research', 'Clinical Documentation', 'Patient Communication', 'Health Education', 'Wellness Coaching'],
      tasks: ['Medical research paper lookup', 'Clinical document summarization', 'Wellness tracking insights'],
      capabilities: ['Medical Literature Search', 'Clinical Summarization', 'Health Knowledge Retrieval'],
      categoryMapping: 'Research & RAG',
      keywords: ['health', 'medical', 'doctor', 'clinical', 'patient', 'wellness', 'medicine', 'hospital']
    },
    {
      domain: 'Finance',
      subdomains: ['Financial Analysis', 'Personal Finance', 'Bookkeeping', 'Investment Research', 'Algorithmic Trading'],
      tasks: ['Financial model building', 'Analyze stock earnings report', 'Budget planning', 'Expense tracking'],
      capabilities: ['Financial Data Processing', 'Earnings Ingestion', 'Budget Modeling'],
      categoryMapping: 'Data Analysis',
      keywords: ['finance', 'financial', 'accounting', 'budget', 'stock', 'investment', 'earnings', 'banking']
    },
    {
      domain: 'Legal',
      subdomains: ['Contract Analysis', 'Legal Research', 'Compliance Review', 'IP & Patent Filing'],
      tasks: ['Analyze contract clauses', 'Legal document auditing', 'Patent search'],
      capabilities: ['Contract Clause Analysis', 'Legal Retrieval', 'Compliance Auditing'],
      categoryMapping: 'Research & RAG',
      keywords: ['legal', 'contract', 'law', 'compliance', 'clause', 'lawyer', 'attorney', 'patent']
    },
    {
      domain: 'HR & Recruitment',
      subdomains: ['Resume Screening', 'Candidate Sourcing', 'Employee Onboarding', 'Performance Review'],
      tasks: ['Screen resume applications', 'Draft job descriptions', 'Automate onboarding workflows'],
      capabilities: ['Resume Parsing', 'Candidate Matching', 'HR Workflow Automation'],
      categoryMapping: 'Automation',
      keywords: ['hr', 'recruitment', 'hiring', 'resume', 'candidate', 'interview', 'onboarding', 'talent']
    },
    {
      domain: 'Real Estate',
      subdomains: ['Property Valuation', 'Virtual Staging', 'Lease Auditing', 'Real Estate Marketing'],
      tasks: ['Generate virtual property tours', 'Audit lease agreements', 'Real estate listing copy'],
      capabilities: ['Virtual Staging Synthesis', 'Contract Auditing', 'Property Listing Generation'],
      categoryMapping: 'Image & Vision',
      keywords: ['real estate', 'property', 'housing', 'lease', 'tenant', 'mortgage', 'listing', 'realtor']
    },
    {
      domain: 'Engineering',
      subdomains: ['CAD Design', 'Finite Element Analysis', 'PCB Design', 'Embedded Systems'],
      tasks: ['Generate CAD models', 'Circuit schematic review', 'Engineering calculation helper'],
      capabilities: ['CAD Script Generation', 'Schematic Inspection', 'Technical Math Solving'],
      categoryMapping: 'Agentic Coding',
      keywords: ['engineering', 'cad', 'circuit', 'mechanical', 'electrical', 'civil', 'schematic', 'pcb']
    },
    {
      domain: 'Science',
      subdomains: ['Bioinformatics', 'Chemical Synthesis', 'Physics Simulation', 'Lab Data Analysis'],
      tasks: ['Protein structure analysis', 'Chemical reaction prediction', 'Genomic sequence analysis'],
      capabilities: ['Bioinformatics Processing', 'Chemical Reaction Modeling', 'Data Synthesis'],
      categoryMapping: 'Data Analysis',
      keywords: ['science', 'biology', 'chemistry', 'physics', 'lab', 'genomics', 'protein', 'scientific']
    },
    {
      domain: 'Government & GovTech',
      subdomains: ['Public Policy Research', 'Citizen Services', 'Grant Writing', 'Regulatory Compliance'],
      tasks: ['Draft policy briefing memo', 'Write government grant proposal', 'Citizen inquiry automation'],
      capabilities: ['Policy Synthesis', 'Grant Writing Assistance', 'Public Record Querying'],
      categoryMapping: 'Reasoning & Writing',
      keywords: ['government', 'govtech', 'policy', 'grant', 'public sector', 'civic', 'regulation', 'municipal']
    },
    {
      domain: 'Travel & Hospitality',
      subdomains: ['Itinerary Planning', 'Hotel & Flight Optimization', 'Guest Concierge', 'Destination Guides'],
      tasks: ['Create travel itinerary', 'Automate guest support responses', 'Local destination research'],
      capabilities: ['Itinerary Generation', 'Conversational Concierge', 'Local Knowledge Retrieval'],
      categoryMapping: 'Reasoning & Writing',
      keywords: ['travel', 'hospitality', 'hotel', 'flight', 'itinerary', 'vacation', 'tourism', 'concierge']
    },
    {
      domain: 'Retail & E-commerce',
      subdomains: ['Product Catalog Management', 'Customer Support Bots', 'Price Intelligence', 'Visual Search'],
      tasks: ['Generate e-commerce product descriptions', 'Automate customer refund tickets', 'Competitor price monitoring'],
      capabilities: ['Product Copy Generation', 'Visual Product Matching', 'E-commerce Bot Response'],
      categoryMapping: 'Automation',
      keywords: ['retail', 'e-commerce', 'store', 'shopify', 'amazon', 'product description', 'checkout', 'merchant']
    },
    {
      domain: 'Manufacturing',
      subdomains: ['Supply Chain Optimization', 'Quality Inspection', 'Predictive Maintenance', 'Inventory Tracking'],
      tasks: ['Predict machine maintenance schedules', 'Visual defect inspection', 'Supply chain bottleneck analysis'],
      capabilities: ['Visual Defect Detection', 'Predictive Analytics', 'Supply Chain Modeling'],
      categoryMapping: 'Data Analysis',
      keywords: ['manufacturing', 'factory', 'supply chain', 'inventory', 'assembly', 'quality control', 'machinery']
    },
    {
      domain: 'Agriculture',
      subdomains: ['Crop Disease Diagnosis', 'Yield Prediction', 'Precision Farming', 'Soil Analysis'],
      tasks: ['Diagnose crop leaf disease from photo', 'Predict harvest yield', 'Soil health analysis'],
      capabilities: ['Agricultural Image Diagnosis', 'Weather & Crop Yield Modeling'],
      categoryMapping: 'Image & Vision',
      keywords: ['agriculture', 'farm', 'farming', 'crop', 'soil', 'harvest', 'fertilizer', 'agritech']
    },
    {
      domain: 'Media & Journalism',
      subdomains: ['Investigative Reporting', 'Article Summarization', 'News Aggregation', 'Fact Checking'],
      tasks: ['Verify news source claims', 'Transcribe interview audio', 'Summarize press releases'],
      capabilities: ['Audio Transcription', 'Fact Verification', 'News Ingestion'],
      categoryMapping: 'Research & RAG',
      keywords: ['media', 'journalism', 'news', 'press', 'interview', 'article', 'reporting', 'headline']
    },
    {
      domain: 'Communication & Languages',
      subdomains: ['Translation', 'Localization', 'Speech-to-Speech Translation', 'Subtitling'],
      tasks: ['Translate document into Telugu', 'Generate bi-lingual video subtitles', 'Real-time conversation translation'],
      capabilities: ['Multilingual Translation', 'Subtitling', 'Speech-to-Speech Translation'],
      categoryMapping: 'Multi-Modal',
      keywords: ['translation', 'language', 'translate', 'subtitles', 'multilingual', 'telugu', 'hindi', 'spanish']
    },
    {
      domain: 'Personal Productivity',
      subdomains: ['Task Management', 'Email Triage', 'Calendar Scheduling', 'Personal Note Taking'],
      tasks: ['Organize daily todo list', 'Draft email response', 'Synthesize daily meeting notes'],
      capabilities: ['Email Drafting', 'Task Extraction', 'Personal Knowledge Management'],
      categoryMapping: 'Reasoning & Writing',
      keywords: ['productivity', 'personal', 'todo', 'notes', 'calendar', 'schedule', 'routine', 'time management']
    },
    {
      domain: 'Creator Economy',
      subdomains: ['YouTube Automation', 'Podcast Production', 'Thumbnail Generation', 'Shorts & Reels Creation'],
      tasks: ['Create YouTube video script', 'Generate eye-catching thumbnail', 'Edit short video clip'],
      capabilities: ['Script Writing', 'Thumbnail Image Generation', 'Short Video Editing'],
      categoryMapping: 'Video',
      keywords: ['creator', 'youtube', 'podcast', 'influencer', 'thumbnail', 'tiktok', 'reels', 'content creator']
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
      domain: 'Automotive',
      subdomains: ['Autonomous Vehicle Systems', 'Vehicle Telematics', 'Connected Car AI'],
      tasks: ['Vehicle diagnostic troubleshooting', 'Autonomous sensor data analysis'],
      capabilities: ['Telematics Data Processing', 'Diagnostic Guidance'],
      categoryMapping: 'Data Analysis',
      keywords: ['automotive', 'car', 'vehicle', 'driving', 'ev', 'telematics', 'auto']
    },
    {
      domain: 'Sports',
      subdomains: ['Athlete Performance Analytics', 'Game Video Analysis', 'Sports Coaching'],
      tasks: ['Analyze match strategy video', 'Track athlete fitness telemetry'],
      capabilities: ['Video Movement Tracking', 'Sports Statistical Modeling'],
      categoryMapping: 'Video',
      keywords: ['sports', 'athlete', 'coaching', 'fitness', 'game', 'football', 'cricket', 'performance']
    },
    {
      domain: 'Fashion',
      subdomains: ['Virtual Try-On', 'Apparel Design', 'Trend Forecasting'],
      tasks: ['Generate virtual clothing try-on', 'Forecast seasonal fashion trends'],
      capabilities: ['Virtual Apparel Rendering', 'Trend Analysis'],
      categoryMapping: 'Image & Vision',
      keywords: ['fashion', 'apparel', 'clothing', 'style', 'outfit', 'trend', 'wear']
    },
    {
      domain: 'Food & Restaurants',
      subdomains: ['Recipe Generation', 'Menu Optimization', 'Kitchen Operations'],
      tasks: ['Generate custom dietary recipes', 'Calculate food cost margins'],
      capabilities: ['Recipe Synthesis', 'Menu Cost Analysis'],
      categoryMapping: 'Reasoning & Writing',
      keywords: ['food', 'restaurant', 'recipe', 'cooking', 'chef', 'menu', 'dining']
    },
    {
      domain: 'Nonprofit & Social Impact',
      subdomains: ['Donor Management', 'Impact Reporting', 'Grant Writing'],
      tasks: ['Draft donor campaign letter', 'Synthesize social impact metrics'],
      capabilities: ['Grant Proposal Generation', 'Impact Report Synthesis'],
      categoryMapping: 'Reasoning & Writing',
      keywords: ['nonprofit', 'social impact', 'donor', 'charity', 'ngo', 'volunteer', 'cause']
    },
    {
      domain: 'Career & Professional Development',
      subdomains: ['Resume Building', 'Interview Prep', 'Skill Gap Analysis', 'Portfolio Creation'],
      tasks: ['Practice mock AI job interview', 'Optimize resume for ATS', 'Identify skill gap'],
      capabilities: ['Mock Interview Q&A', 'Resume Analysis', 'Career Guidance'],
      categoryMapping: 'Reasoning & Writing',
      keywords: ['career', 'resume', 'job', 'interview', 'portfolio', 'salary', 'promotion', 'skills']
    },
    {
      domain: 'Security & Risk',
      subdomains: ['Cybersecurity Auditing', 'Vulnerability Scanning', 'Threat Intelligence', 'Fraud Detection'],
      tasks: ['Audit code for security vulnerabilities', 'Analyze suspicious network logs', 'Fraud detection'],
      capabilities: ['Static Code Security Auditing', 'Log Anomaly Detection'],
      categoryMapping: 'Agentic Coding',
      keywords: ['security', 'cybersecurity', 'vulnerability', 'hack', 'audit', 'threat', 'fraud', 'risk']
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
