export interface SourceItem {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: 'RSS' | 'JSON' | 'API' | 'WEB';
  sourcePriority: number;
  title: string;
  url: string;
  content: string;
  publishedAt: string;
  hash: string;
  metadata?: Record<string, any>;
}

export interface ToolSource {
  id: string;
  name: string;
  type: 'RSS' | 'JSON' | 'API' | 'WEB';
  priority: number; // 1 = Highest (Official release/pricing), 7 = Secondary
  enabled: boolean;
  disabledReason?: string;
  fetch(): Promise<SourceItem[]>;
}

/**
 * Tool Source Service — Configurable Real External Source Collection Layer
 */
export class ToolSourceService {
  private static sources: Map<string, ToolSource> = new Map<string, ToolSource>();

  public static initializeSources(): void {
    if (this.sources.size > 0) return;

    // 1. Anthropic Official Release Feed Source — DISABLED
    // Reason: Nonexistent GitHub repository (anthropic-releases/feed). Anthropic provides no public JSON tool feed.
    this.registerSource({
      id: 'source-anthropic',
      name: 'Anthropic Official Technical Bulletins',
      type: 'JSON',
      priority: 1,
      enabled: false,
      disabledReason: 'Nonexistent GitHub repository (anthropic-releases/feed). No verified public JSON tools feed endpoint exists.',
      async fetch(): Promise<SourceItem[]> {
        return [];
      }
    });

    // 2. GitHub Releases Public AI Tool Source
    this.registerSource({
      id: 'source-github-ai',
      name: 'GitHub Public AI Tools & Agents Releases',
      type: 'API',
      priority: 2,
      enabled: true,
      async fetch(): Promise<SourceItem[]> {
        const url = process.env.GITHUB_AI_FEED_URL || 'https://api.github.com/repos/continuedev/continue/releases/latest';
        return ToolSourceService.fetchGitHubRelease(url, 'source-github-ai', 'GitHub AI Tool Releases', 2);
      }
    });

    // 3. HuggingFace Trending Spaces & AI Assistants
    this.registerSource({
      id: 'source-huggingface',
      name: 'Hugging Face Open AI Models & Assistants',
      type: 'JSON',
      priority: 3,
      enabled: true,
      async fetch(): Promise<SourceItem[]> {
        const url = process.env.HUGGINGFACE_FEED_URL || 'https://huggingface.co/api/trending';
        return ToolSourceService.fetchHuggingFaceTrending(url, 'source-huggingface', 'Hugging Face Trending AI', 3);
      }
    });

    // 4. Indic & Multi-Modal AI Release Source — DISABLED
    // Reason: Referenced placeholder domain astra-ai.example.com with static mock payload; no live HTTP endpoint.
    this.registerSource({
      id: 'source-indic-ai',
      name: 'Indic AI & Multi-Modal Speech Releases',
      type: 'WEB',
      priority: 2,
      enabled: false,
      disabledReason: 'Uses placeholder domain (astra-ai.example.com) with hardcoded payload; no live HTTP discovery endpoint.',
      async fetch(): Promise<SourceItem[]> {
        return [];
      }
    });
  }

  public static registerSource(source: ToolSource): void {
    this.sources.set(source.id, source);
  }

  public static getSources(): ToolSource[] {
    this.initializeSources();
    return Array.from(this.sources.values());
  }

  /**
   * Collect candidates from all enabled sources safely.
   * If a source fails, logs the error and continues with remaining sources.
   * Never injects fabricated records into the production pipeline.
   */
  public static async collectSources(): Promise<{ items: SourceItem[]; failedSources: string[] }> {
    this.initializeSources();
    const enabledSources = Array.from(this.sources.values()).filter(s => s.enabled);

    const items: SourceItem[] = [];
    const failedSources: string[] = [];

    for (const source of enabledSources) {
      try {
        console.log(`[ToolSource] Fetching enabled source: ${source.name} (Priority ${source.priority})`);
        const fetchedItems = await source.fetch();
        items.push(...fetchedItems);
        console.log(`[ToolSource] Source ${source.name} returned ${fetchedItems.length} item(s).`);
      } catch (err: any) {
        console.warn(`[ToolSource] Source ${source.name} failed (${err.message}). Continuing with other sources.`);
        failedSources.push(source.name);
      }
    }

    // Deduplicate source items by hash/url
    const uniqueItems: SourceItem[] = [];
    const seenHashes = new Set<string>();

    for (const item of items) {
      const key = item.hash || item.url || item.title;
      if (!seenHashes.has(key)) {
        seenHashes.add(key);
        uniqueItems.push(item);
      }
    }

    return { items: uniqueItems, failedSources };
  }

  /**
   * Fetches GitHub release data and extracts normalized AI tool candidate metadata.
   * Ensures release tags (e.g. "v2.0.0-vscode") are not treated as tool names.
   */
  private static async fetchGitHubRelease(url: string, sourceId: string, sourceName: string, priority: number): Promise<SourceItem[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'AIIMS-ToolDiscovery/1.0' } });
      clearTimeout(timeoutId);

      if (res.ok) {
        const raw: any = await res.json();
        // Extract repo name if available
        const repoNameMatch = url.match(/repos\/([^/]+)\/([^/]+)/);
        const repoOrg = repoNameMatch ? repoNameMatch[1] : '';
        const repoBaseName = repoNameMatch ? repoNameMatch[2] : 'Continue';

        // Discard raw git tag version names like "v2.0.0-vscode" in favor of the actual tool name
        const rawTitle = raw.name || raw.tag_name || '';
        const isVersionTag = /^v?\d+\.\d+/.test(rawTitle);
        const title = isVersionTag
          ? `${repoBaseName.charAt(0).toUpperCase() + repoBaseName.slice(1)} AI Coding Assistant`
          : (rawTitle || `${repoBaseName} AI Assistant`);

        const itemUrl = raw.html_url || `https://github.com/${repoOrg}/${repoBaseName}`;
        const content = raw.body && raw.body.trim().length > 10
          ? `${title}: ${raw.body.slice(0, 500)}`
          : `${title} - Open-source AI code completion and chat assistant for developers.`;

        return [
          {
            id: `${sourceId}-0`,
            sourceId,
            sourceName,
            sourceType: 'API',
            sourcePriority: priority,
            title,
            url: itemUrl,
            content,
            publishedAt: raw.published_at || new Date().toISOString(),
            hash: ToolSourceService.generateHash(title + itemUrl)
          }
        ];
      }
    } catch (e: any) {
      console.warn(`[ToolSource] Real fetch to ${url} warning: ${e.message}`);
    }

    // Do NOT fabricate synthetic records on network failure
    return [];
  }

  /**
   * Fetches and parses Hugging Face trending spaces/assistants.
   */
  private static async fetchHuggingFaceTrending(url: string, sourceId: string, sourceName: string, priority: number): Promise<SourceItem[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'AIIMS-ToolDiscovery/1.0' } });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: any = await res.json();
        const rawItems: any[] = Array.isArray(data) ? data : (data.recentlyTrending || []);

        const spaces = rawItems.filter(item => item.repoType === 'space' && item.repoData);
        return spaces.slice(0, 5).map((space, idx) => {
          const rd = space.repoData;
          const title = rd.title || rd.id?.split('/')[1] || `Hugging Face Space ${idx + 1}`;
          const itemUrl = `https://huggingface.co/spaces/${rd.id}`;
          const content = rd.ai_short_description || rd.shortDescription || `${title} interactive AI space on Hugging Face.`;

          return {
            id: `${sourceId}-${idx}`,
            sourceId,
            sourceName,
            sourceType: 'JSON',
            sourcePriority: priority,
            title,
            url: itemUrl,
            content,
            publishedAt: rd.lastModified || new Date().toISOString(),
            hash: ToolSourceService.generateHash(title + itemUrl)
          };
        });
      }
    } catch (e: any) {
      console.warn(`[ToolSource] Real fetch to ${url} warning: ${e.message}`);
    }

    // Do NOT fabricate synthetic records on network failure
    return [];
  }

  public static generateHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `hash-${Math.abs(hash)}`;
  }
}
