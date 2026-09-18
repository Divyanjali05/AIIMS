import { RadarSignal } from '../types';

/**
 * Signal Ingestion Pipeline Architecture:
 * Signal Source -> Ingestion Adapter -> Normalizer -> RadarSignal -> Relevance Engine -> RadarScreen
 */

export interface ISignalIngestionAdapter {
  fetchLatestSignals(): Promise<RadarSignal[]>;
}

export class FallbackStaticIngestionAdapter implements ISignalIngestionAdapter {
  public async fetchLatestSignals(): Promise<RadarSignal[]> {
    return [
      {
        id: 'sig-1',
        title: 'Autonomous Tool-Calling Agents Shift Core Prompting Models',
        category: 'Tech Shift',
        source: 'ArXiv AI & Tech Release Feed',
        dateTime: 'September 2026',
        summary: 'LLM providers are shipping native agent loop capabilities, reducing the need for line-by-line user instruction in favor of high-level goal specification.',
        scaffold: {
          yesterday: 'Single-prompt back-and-forth chat requiring manual step-by-step instructions for every action.',
          today: 'Goal-based agent execution with dynamic tool calling, autonomous file editing, and automated verification loops.',
          whatChanged: 'Models execute multi-turn function calls internally before returning a final verified result.',
          whosAffected: 'Software developers, product managers, and knowledge workers relying on repetitive multi-step workflows.'
        },
        previousState: 'Single-prompt manual execution',
        currentState: 'Autonomous goal delegation & tool calling',
        relevanceContext: 'Directly impacts your workflow design and agentic task delegation goals.',
        investigationStatus: 'uninvestigated',
        isFollowed: true
      },
      {
        id: 'sig-2',
        title: 'Context Windows Reach 2M Tokens with Instant Retrieval (RAG Hybrid)',
        category: 'Model Release',
        source: 'AI Industry Benchmark Bulletin',
        dateTime: 'September 2026',
        summary: 'Extremely large context windows combined with local vector RAG enable full repository reasoning without manual chunking.',
        scaffold: {
          yesterday: 'Frequent context loss and manual document truncation to fit 8K-32K token limits.',
          today: 'Native 2M token context windows with near 100% recall on needle-in-a-haystack benchmarks.',
          whatChanged: 'Attention mechanisms and sparse retrieval allow instant full-codebase context inclusion.',
          whosAffected: 'Technical architects and researchers managing large document stores or codebases.'
        },
        previousState: 'Manual chunking and limited prompt context',
        currentState: 'Full-repository zero-loss context reasoning',
        relevanceContext: 'High relevance for critical evaluation and large document analysis capabilities.',
        investigationStatus: 'uninvestigated',
        isFollowed: false
      },
      {
        id: 'sig-3',
        title: 'Systematic AI Output Benchmarking Becomes Standard Policy',
        category: 'Role Shift',
        source: 'Enterprise Tech Governance Report',
        dateTime: 'August 2026',
        summary: 'Organizations are instituting mandatory verification checklists and human-in-the-loop oversight before AI-generated code is deployed.',
        scaffold: {
          yesterday: 'Ad-hoc copy-pasting of AI outputs without structured verification or audit logs.',
          today: 'Formal evaluation protocols requiring human sign-off on security, compliance, and factual accuracy.',
          whatChanged: 'Emphasis shifted from prompt generation speed to output evaluation rigor.',
          whosAffected: 'All AI-assisted professionals responsibility-bound for operational compliance.'
        },
        previousState: 'Unverified copy-paste adoption',
        currentState: 'Mandatory human verification and auditability',
        relevanceContext: 'Essential context for evaluating AI accuracy and maintaining human judgment.',
        investigationStatus: 'uninvestigated',
        isFollowed: true
      }
    ];
  }
}

export class ArXivHuggingFaceIngestionAdapter implements ISignalIngestionAdapter {
  private fallbackAdapter = new FallbackStaticIngestionAdapter();

  public async fetchLatestSignals(): Promise<RadarSignal[]> {
    try {
      const response = await fetch('/api/radar/signals', { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Ingestion endpoint returned status ${response.status}`);
      }

      const rawItems = await response.json();
      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        return await this.fallbackAdapter.fetchLatestSignals();
      }

      // Normalizer: Convert raw external payloads into strict RadarSignal schema
      return rawItems.map((item: any, idx: number) => ({
        id: item.id || `sig-ingest-${idx + 1}`,
        title: item.title || 'Untitled Technical Shift',
        category: item.category || 'Tech Shift',
        source: item.source || 'Technical AI Feed',
        dateTime: item.dateTime || item.date || 'Recent',
        summary: item.summary || item.description || 'Technical development summary unavailable.',
        scaffold: {
          yesterday: item.scaffold?.yesterday || item.yesterday || 'Legacy approach requiring manual execution.',
          today: item.scaffold?.today || item.today || 'Modern approach utilizing AI assistance.',
          whatChanged: item.scaffold?.whatChanged || item.whatChanged || 'Automated capability upgrade.',
          whosAffected: item.scaffold?.whosAffected || item.whosAffected || 'Technical professionals.'
        },
        previousState: item.previousState || undefined,
        currentState: item.currentState || undefined,
        relevanceContext: item.relevanceContext || undefined,
        investigationStatus: item.investigationStatus || 'uninvestigated',
        isFollowed: !!item.isFollowed
      }));
    } catch (e) {
      console.warn('Signal Ingestion Adapter fallback activated:', e);
      return await this.fallbackAdapter.fetchLatestSignals();
    }
  }
}
