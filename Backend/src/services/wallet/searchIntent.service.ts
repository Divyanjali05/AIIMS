import { SearchIntent, SearchIntentConstraints, TaskCategory } from '../../types';
import { DomainTaxonomyService } from './domainTaxonomy.service';
import { getAIProvider } from './aiProvider.service';

/**
 * Search Intent Service — Requirement-First Natural Language Intent Engine
 * Implements conceptual flow:
 * Natural Language Query -> Query Normalization -> Intent Understanding -> Task Extraction ->
 * Capability Extraction -> Constraint Extraction -> Ambiguity / Specificity Detection -> SearchIntent
 */
export class SearchIntentService {
  /**
   * Main entry point for intent extraction
   */
  public static extractIntent(query: string): SearchIntent {
    const raw = (query || '').trim();
    // Query Normalization
    const normalized = this.normalizeQuery(raw);
    const q = normalized.toLowerCase();

    // 1. Explicit Domain Detection (Conservative hierarchy)
    const explicitDomain = this.detectExplicitDomain(q);

    // 2. Constraint Extraction
    const constraints = this.extractConstraints(q);

    // 3. Known Tool & Comparison Intent Extraction
    const knownToolsList = ['chatgpt', 'gpt', 'claude', 'cursor', 'copilot', 'perplexity', 'notebooklm', 'midjourney', 'runway', 'gamma', 'julius', 'canva', 'make', 'zapier'];
    const detectedKnownTools: string[] = [];
    for (const kt of knownToolsList) {
      if (q.includes(kt)) {
        detectedKnownTools.push(kt);
      }
    }

    const isAlternative = q.includes('alternative') || q.includes('similar to') || q.includes('like ') || q.includes('instead of') || q.includes('better than');
    const isCompare = q.includes('compare') || q.includes(' vs ') || q.includes('difference between') || q.includes('which one');
    
    let comparisonType: 'alternative' | 'compare' | 'like_tool' | null = null;
    if (isAlternative) comparisonType = 'alternative';
    else if (isCompare) comparisonType = 'compare';
    else if (detectedKnownTools.length > 0 && (q.includes('like') || q.includes('for'))) comparisonType = 'like_tool';

    const referenceTool = detectedKnownTools[0] || undefined;

    // 4. Freshness Requirement Detection
    let freshnessRequirement: 'low' | 'normal' | 'high' = 'normal';
    if (q.includes('latest') || q.includes('newest') || q.includes('recent') || q.includes('new ') || q.includes('fresh')) {
      freshnessRequirement = 'high';
    }

    // 5. Workflow, Goal, Task & Capability Extraction
    const extraction = this.extractWorkflowGoalTasksCapabilities(q, raw);

    // 6. Domain Determination (Explicit > Conservative Fallback)
    const domains = explicitDomain.length > 0 ? explicitDomain : extraction.domains;
    const domainConfidence = explicitDomain.length > 0 ? 0.95 : (extraction.domains.includes('General') ? 0.6 : 0.8);

    // 7. Ambiguity & Specificity Detection
    const wordCount = q.split(/\s+/).filter(Boolean).length;
    const isBroad = wordCount <= 2 && !explicitDomain.length;
    const specificity: 'broad' | 'moderate' | 'specific' = isBroad ? 'broad' : (explicitDomain.length > 0 || extraction.tasks.length >= 3 ? 'specific' : 'moderate');

    const missingInfo: string[] = [];
    if (!explicitDomain.length) {
      missingInfo.push('Specific domain (academic, market, technical, medical, legal, etc.)');
    }
    if (specificity === 'broad') {
      missingInfo.push('Target output format or workflow constraints');
    }

    const legacyCategories: TaskCategory[] = extraction.categories;
    const primaryGoal = extraction.primaryGoal;

    return {
      originalQuery: raw,
      intent: extraction.intentSummary,
      primaryGoal,
      domain: domains,
      domainConfidence,
      tasks: extraction.tasks,
      requiredCapabilities: extraction.requiredCapabilities,
      optionalCapabilities: extraction.optionalCapabilities,
      inputTypes: extraction.inputTypes,
      outputTypes: extraction.outputTypes,
      constraints,
      knownTools: detectedKnownTools,
      comparisonIntent: comparisonType ? {
        type: comparisonType,
        referenceTool
      } : undefined,
      ambiguity: {
        isAmbiguous: missingInfo.length > 0,
        missingInformation: missingInfo,
        clarificationNeeded: false // Do not block user recommendations
      },
      specificity,
      freshnessRequirement,
      keywords: q.split(/\s+/).filter(w => w.length > 2 && !['for', 'the', 'and', 'with', 'from', 'tool', 'tools', 'make', 'making', 'find', 'want', 'like'].includes(w)),
      exclusions: [],

      // Backward compatibility fields
      task: extraction.tasks[0] || 'AI Task Execution',
      desiredOutcome: primaryGoal,
      categories: legacyCategories,
      subdomains: extraction.subdomains,
      alternativeIntent: isAlternative
    };
  }

  /**
   * Normalizes raw natural language query
   */
  private static normalizeQuery(query: string): string {
    return query
      .trim()
      .replace(/[^\w\s\-\.\,\?]/gi, ' ')
      .replace(/\s+/g, ' ');
  }

  /**
   * Conservative explicit domain checker. Only includes narrow domains if user explicitly requested them.
   */
  private static detectExplicitDomain(q: string): string[] {
    const domains: string[] = [];
    if (q.includes('medical') || q.includes('clinical') || q.includes('health')) {
      domains.push('Health & Wellness');
    }
    if (q.includes('legal') || q.includes('lawyer') || q.includes('contract')) {
      domains.push('Legal & Compliance');
    }
    if (q.includes('academic') || q.includes('university') || q.includes('student') || q.includes('exam') || q.includes('literature paper')) {
      domains.push('Education & Learning');
    }
    if (q.includes('market') || q.includes('sales') || q.includes('finance') || q.includes('accounting') || q.includes('stock')) {
      domains.push('Business & Operations');
    }
    if (q.includes('code') || q.includes('coding') || q.includes('python') || q.includes('javascript') || q.includes('developer') || q.includes('app')) {
      domains.push('Software & Technology');
    }
    if (q.includes('video') || q.includes('movie') || q.includes('animation')) {
      domains.push('Video Production');
    }
    if (q.includes('design') || q.includes('image') || q.includes('photo') || q.includes('graphic')) {
      domains.push('Design & Creative');
    }
    if (q.includes('house') || q.includes('architecture') || q.includes('floor plan')) {
      domains.push('Architecture & Construction');
    }
    return Array.from(new Set(domains));
  }

  /**
   * Extracts constraints without assuming defaults
   */
  private static extractConstraints(q: string): SearchIntentConstraints {
    const constraints: SearchIntentConstraints = {};
    if (q.includes('free') || q.includes("don't want to pay") || q.includes('no cost') || q.includes('without paying')) {
      constraints.freeOnly = true;
    }
    if (q.includes('trial') || q.includes('free trial')) {
      constraints.freeTrial = true;
    }
    if (q.includes('no-code') || q.includes('no code') || q.includes('without coding')) {
      constraints.noCode = true;
    }
    if (q.includes('open source') || q.includes('opensource')) {
      constraints.openSource = true;
    }
    if (q.includes('telugu')) {
      constraints.language = ['Telugu'];
    } else if (q.includes('hindi')) {
      constraints.language = ['Hindi'];
    }
    if (q.includes('vscode') || q.includes('vs code')) {
      constraints.platform = ['VS Code'];
    }
    return constraints;
  }

  /**
   * Broad Workflow, Task, Capability, Input & Output Extractor
   */
  private static extractWorkflowGoalTasksCapabilities(q: string, raw: string): {
    primaryGoal: string;
    intentSummary: string;
    tasks: string[];
    requiredCapabilities: string[];
    optionalCapabilities: string[];
    inputTypes: string[];
    outputTypes: string[];
    domains: string[];
    subdomains: string[];
    categories: TaskCategory[];
  } {
    const tasks: string[] = [];
    const reqCap: string[] = [];
    const optCap: string[] = [];
    const inputTypes: string[] = [];
    const outputTypes: string[] = [];
    const domains: string[] = [];
    const subdomains: string[] = [];
    const categories: TaskCategory[] = [];
    let primaryGoal = 'AI Tool Recommendation';
    let intentSummary = 'Tool Search';

    // Query Pattern 1: PDF/Document Understanding ("understand this 100 page PDF")
    if ((q.includes('pdf') || q.includes('page') || q.includes('document')) && (q.includes('understand') || q.includes('read') || q.includes('summarize paper'))) {
      primaryGoal = 'Document Understanding & Reading';
      intentSummary = 'Understand and extract insights from long documents/PDFs';
      tasks.push('Document Understanding', 'PDF Vector Indexing', 'Information Extraction', 'Summarization');
      reqCap.push('document_analysis', 'pdf_summarization', 'vector_search', 'information_extraction');
      optCap.push('citation_support', 'q_and_a');
      inputTypes.push('pdf', 'document', 'text');
      outputTypes.push('summary', 'answers', 'key_points');
      domains.push('Research & Knowledge');
      categories.push('Research & RAG');
    }
    // Query Pattern 2: Research Document Creation ("for research document making", "research report")
    else if (q.includes('research') && (q.includes('document') || q.includes('making') || q.includes('report') || q.includes('write'))) {
      primaryGoal = 'Research Document Creation';
      intentSummary = 'Conduct research and create structured research documents';
      tasks.push('Research', 'Source Discovery', 'Source Verification', 'Analysis', 'Synthesis', 'Citation', 'Document Generation');
      reqCap.push('web_research', 'source_discovery', 'source_verification', 'document_analysis', 'synthesis', 'citation_support', 'structured_writing', 'document_generation');
      optCap.push('pdf_export', 'collaboration');
      inputTypes.push('topic_prompt', 'text', 'reference_links');
      outputTypes.push('research_document', 'report', 'citations');
      domains.push('Research & Knowledge');
      categories.push('Research & RAG', 'Reasoning & Writing');
    }
    // Query Pattern 3: Presentation Creation from Research ("make a presentation from my research")
    else if (q.includes('presentation') || q.includes('slides') || q.includes('pitch deck')) {
      if (q.includes('research')) {
        primaryGoal = 'Research Synthesis & Presentation Creation';
        intentSummary = 'Synthesize research materials into structured presentation slides';
        tasks.push('Research Synthesis', 'Content Structuring', 'Slide Deck Generation', 'Visual Presentation');
        reqCap.push('synthesis', 'content_structuring', 'slide_generation', 'theme_customization');
        optCap.push('export_pptx', 'presenter_notes');
        inputTypes.push('research_notes', 'text_prompt', 'document');
        outputTypes.push('presentation_slides', 'slide_deck');
        domains.push('Presentation & Decks', 'Research & Knowledge');
        categories.push('Presentation', 'Research & RAG');
      } else {
        primaryGoal = 'Presentation Creation';
        intentSummary = 'Generate styled presentation deck from prompt or topic';
        tasks.push('Slide Deck Generation', 'Visual Layout');
        reqCap.push('slide_generation', 'theme_customization');
        inputTypes.push('topic_prompt', 'notes');
        outputTypes.push('presentation_slides');
        domains.push('Presentation & Decks');
        categories.push('Presentation');
      }
    }
    // Query Pattern 4: Data Analysis & Visualization ("analyze my CSV and create charts")
    else if (q.includes('csv') || q.includes('excel') || q.includes('spreadsheet') || q.includes('data analysis') || q.includes('chart')) {
      primaryGoal = 'Data Analysis & Chart Visualization';
      intentSummary = 'Analyze structured tabular data and produce visual charts and insights';
      tasks.push('Data Ingestion', 'Statistical Analysis', 'Pattern Recognition', 'Chart Visualization', 'Insight Generation');
      reqCap.push('csv_ingestion', 'statistical_analysis', 'chart_rendering', 'insight_generation', 'python_execution');
      optCap.push('sql_querying', 'report_export');
      inputTypes.push('csv', 'excel', 'dataframe');
      outputTypes.push('charts', 'visualizations', 'insights_report');
      domains.push('Data & Analytics');
      categories.push('Data Analysis');
    }
    // Query Pattern 5: Multi-intent ("research AI agents, summarize papers, and create a presentation")
    else if (q.includes('and') && (q.includes('research') || q.includes('summarize') || q.includes('presentation') || q.includes('video'))) {
      primaryGoal = 'Multi-Task Workflow Execution';
      intentSummary = 'Execute multi-step workflow covering research, summarization, and content generation';
      if (q.includes('research')) {
        tasks.push('Research', 'Source Discovery');
        reqCap.push('web_research', 'source_discovery');
      }
      if (q.includes('summarize') || q.includes('paper')) {
        tasks.push('Paper Discovery', 'Document Analysis', 'Summarization');
        reqCap.push('pdf_summarization', 'document_analysis');
      }
      if (q.includes('presentation')) {
        tasks.push('Synthesis', 'Presentation Creation');
        reqCap.push('synthesis', 'slide_generation');
      }
      if (q.includes('video')) {
        tasks.push('Video Generation');
        reqCap.push('video_generation');
      }
      domains.push('Research & Knowledge', 'Presentation & Decks');
      categories.push('Research & RAG', 'Presentation');
    }
    // Query Pattern 6: Broad Research ("research", "something like ChatGPT for research")
    else if (q.includes('research')) {
      primaryGoal = 'General Research Assistance';
      intentSummary = 'Discover sources, verify facts, and synthesize research topics';
      tasks.push('Research', 'Source Discovery', 'Source Verification', 'Information Synthesis');
      reqCap.push('web_research', 'source_discovery', 'source_verification', 'synthesis');
      optCap.push('citations', 'pdf_analysis');
      inputTypes.push('query_prompt');
      outputTypes.push('verified_findings', 'summary');
      domains.push('Research & Knowledge');
      categories.push('Research & RAG');
    }
    // Pattern 7: Video Creation ("video creation", "make video")
    else if (q.includes('video')) {
      primaryGoal = 'AI Video Generation';
      intentSummary = 'Create and edit AI videos from text or image prompts';
      tasks.push('Text-to-Video', 'Motion Synthesis', 'Video Editing');
      reqCap.push('video_generation', 'camera_motion', 'animation');
      inputTypes.push('text_prompt', 'image');
      outputTypes.push('video_mp4', 'animation');
      domains.push('Video Production');
      categories.push('Video');
    }
    // Pattern 8: Coding / Software ("coding", "write python")
    else if (q.includes('code') || q.includes('coding') || q.includes('python') || q.includes('app')) {
      primaryGoal = 'Software Coding & Development';
      intentSummary = 'Write, refactor, and debug software code';
      tasks.push('Agentic Coding', 'Code Completion', 'Debugging');
      reqCap.push('code_generation', 'debugging', 'multi_file_composition');
      inputTypes.push('code_prompt', 'repository');
      outputTypes.push('code_files', 'diffs');
      domains.push('Software & Technology');
      categories.push('Agentic Coding');
    }
    // Fallback: Generic / Unspecified Intent
    else {
      primaryGoal = raw;
      intentSummary = `Assist with ${raw}`;
      tasks.push('General Task Execution');
      reqCap.push('task_execution', 'ai_assistance');
      inputTypes.push('text_prompt');
      outputTypes.push('text_response');
      domains.push('General');
      categories.push('Reasoning & Writing');
    }

    return {
      primaryGoal,
      intentSummary,
      tasks: Array.from(new Set(tasks)),
      requiredCapabilities: Array.from(new Set(reqCap)),
      optionalCapabilities: Array.from(new Set(optCap)),
      inputTypes: Array.from(new Set(inputTypes)),
      outputTypes: Array.from(new Set(outputTypes)),
      domains: Array.from(new Set(domains)),
      subdomains,
      categories: Array.from(new Set(categories))
    };
  }
}

