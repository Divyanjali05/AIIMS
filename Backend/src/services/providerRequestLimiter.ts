/**
 * providerRequestLimiter.ts
 *
 * Strict, per-run hard request counter enforcing explicit authorization bounds
 * on outbound AI provider requests.
 *
 * Guarantees:
 * - Increments immediately before any network transmission.
 * - Blocks a 3rd request before network access.
 * - Cannot be bypassed by application retries or fallback loops.
 */

export interface ProviderRequestEntry {
  attemptNumber: number;
  provider: string;
  model: string;
  timestamp: Date;
  latencyMs?: number;
  success?: boolean;
  error?: string;
}

export class ProviderRequestLimiter {
  private maxRequests: number;
  private currentRequests: number = 0;
  private requestLog: ProviderRequestEntry[] = [];

  constructor(maxRequests: number = 2) {
    this.maxRequests = maxRequests;
    this.currentRequests = 0;
  }

  public get count(): number {
    return this.currentRequests;
  }

  public get limit(): number {
    return this.maxRequests;
  }

  public get history(): ProviderRequestEntry[] {
    return [...this.requestLog];
  }

  /**
   * Called immediately before initiating an outbound HTTP/SDK provider call.
   * Throws if current request count has reached or exceeded maxRequests.
   */
  public recordAttemptBeforeOutbound(provider: string, model: string): number {
    if (this.currentRequests >= this.maxRequests) {
      throw new Error(
        `[ProviderRequestLimiter] BLOCKED: Maximum authorized request limit (${this.maxRequests}) reached. Outbound request aborted before network access.`
      );
    }

    this.currentRequests++;
    const attemptNumber = this.currentRequests;
    this.requestLog.push({
      attemptNumber,
      provider,
      model,
      timestamp: new Date(),
    });
    return attemptNumber;
  }

  public recordSuccess(attemptNumber: number, latencyMs: number): void {
    const entry = this.requestLog.find((e) => e.attemptNumber === attemptNumber);
    if (entry) {
      entry.latencyMs = latencyMs;
      entry.success = true;
    }
  }

  public recordFailure(attemptNumber: number, latencyMs: number, err: any): void {
    const entry = this.requestLog.find((e) => e.attemptNumber === attemptNumber);
    if (entry) {
      entry.latencyMs = latencyMs;
      entry.success = false;
      entry.error = err?.message || String(err);
    }
  }

  public reset(maxRequests: number = 2): void {
    this.maxRequests = maxRequests;
    this.currentRequests = 0;
    this.requestLog = [];
  }
}

export const providerRequestLimiter = new ProviderRequestLimiter(2);
