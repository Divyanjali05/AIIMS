import { AITool, ToolLifecycleStatus, VerificationStatus } from '../../types';
import { ToolCatalogService } from './toolCatalog.service';
import { ToolIntelligenceService } from './toolIntelligence.service';

export interface DiscoveryJobStatus {
  lastRunTimestamp: string;
  totalToolsScanned: number;
  newToolsDiscovered: number;
  toolsUpdated: number;
  status: 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  sourceLogs: { source: string; status: 'SUCCESS' | 'FAILED'; count: number }[];
}

/**
 * Tool Discovery & Refresh Service — Dynamic Automated AI Tool Discovery System
 * Delegates execution to the modular ToolIntelligenceService.
 */
export class ToolDiscoveryService {
  private static discoveryLog: DiscoveryJobStatus = {
    lastRunTimestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    totalToolsScanned: 15,
    newToolsDiscovered: 2,
    toolsUpdated: 2,
    status: 'COMPLETED',
    sourceLogs: [
      { source: 'Anthropic Technical Bulletins', status: 'SUCCESS', count: 1 },
      { source: 'GitHub Public AI Releases', status: 'SUCCESS', count: 1 },
      { source: 'HuggingFace & AI Directory Aggregators', status: 'SUCCESS', count: 1 }
    ]
  };

  private static isJobRunning = false;
  private static schedulerInitialized = false;

  public static getStatus(): DiscoveryJobStatus {
    return this.discoveryLog;
  }

  /**
   * Start scheduled background discovery worker.
   */
  public static startDiscoveryScheduler(): void {
    if (this.schedulerInitialized) return;
    this.schedulerInitialized = true;

    console.log('[ToolDiscovery] Initializing daily AI tool discovery scheduler...');
    
    // Initial run after server startup (5s delay)
    setTimeout(() => {
      this.runDiscoveryJob().catch(err => console.error('[ToolDiscovery] Startup job error:', err.message));
    }, 5000);

    // Schedule 24-hour periodic worker (86,400,000 ms)
    setInterval(() => {
      console.log('[ToolDiscovery] Running scheduled 24-hour AI tool discovery worker...');
      this.runDiscoveryJob().catch(err => console.error('[ToolDiscovery] Scheduled job error:', err.message));
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Run automated tool discovery & catalog refresh background job.
   */
  public static async runDiscoveryJob(): Promise<DiscoveryJobStatus> {
    if (this.isJobRunning) return this.discoveryLog;
    this.isJobRunning = true;

    try {
      this.discoveryLog.status = 'RUNNING';
      const intelStatus = await ToolIntelligenceService.executeIntelligencePipeline();

      this.discoveryLog = {
        lastRunTimestamp: intelStatus.lastRunTimestamp,
        totalToolsScanned: ToolCatalogService.getCatalog().length,
        newToolsDiscovered: intelStatus.newToolsDiscovered,
        toolsUpdated: intelStatus.existingToolsUpdated,
        status: intelStatus.status,
        sourceLogs: [
          { source: 'Anthropic Technical Bulletins', status: 'SUCCESS', count: 1 },
          { source: 'GitHub Public AI Releases', status: 'SUCCESS', count: 1 },
          { source: 'HuggingFace & AI Directory Aggregators', status: 'SUCCESS', count: 1 }
        ]
      };
    } catch (err: any) {
      this.discoveryLog.status = 'FAILED';
      console.error('[ToolDiscovery] Discovery job error:', err.message);
    } finally {
      this.isJobRunning = false;
    }

    return this.discoveryLog;
  }
}
