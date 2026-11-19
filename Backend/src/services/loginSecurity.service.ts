/**
 * loginSecurity.service.ts
 * =========================================================
 * Adaptive brute-force and credential-stuffing protection service for AIIMS authentication.
 *
 * Designed specifically to support high-concurrency environments (e.g. university labs,
 * college Wi-Fi, institutional NAT proxies, and offices) where multiple legitimate users
 * share a single public IP address.
 *
 * Key Safeguards:
 * 1. Account-targeted protection: Limits failed attempts per email (10 failed attempts / 5m).
 *    Does NOT penalize other users sharing the same public IP.
 * 2. Credential stuffing detection: Limits failed attempts across distinct accounts per IP (20 accounts / 5m).
 * 3. Temporary, self-healing cooldowns: 5 minutes. No permanent account lockouts.
 * 4. Structured audit logging: Emits alerts when suspicious automated bursts are detected.
 */

interface AccountAttemptRecord {
  failedCount: number;
  firstFailedAt: number;
  lastFailedAt: number;
  lockedUntil: number | null;
}

interface IpAttemptRecord {
  distinctFailedEmails: Set<string>;
  totalFailedCount: number;
  firstFailedAt: number;
  lockedUntil: number | null;
}

export class LoginSecurityService {
  private accountStore = new Map<string, AccountAttemptRecord>();
  private ipStore = new Map<string, IpAttemptRecord>();

  // Thresholds
  private readonly MAX_ACCOUNT_FAILED_ATTEMPTS = 10;
  private readonly ACCOUNT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_DISTINCT_EMAILS_PER_IP = 20;
  private readonly IP_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Pre-authentication check. Returns whether the attempt is allowed to proceed.
   */
  public checkLoginAttempt(
    email: string,
    ip: string
  ): { allowed: boolean; retryAfterSeconds?: number; reason?: string } {
    const now = Date.now();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check IP-level credential stuffing lock
    const ipRecord = this.ipStore.get(ip);
    if (ipRecord && ipRecord.lockedUntil && ipRecord.lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((ipRecord.lockedUntil - now) / 1000);
      return {
        allowed: false,
        retryAfterSeconds,
        reason:
          'Too many failed login attempts from this network. Please wait a few minutes before trying again.',
      };
    }

    // 2. Check Account-level brute-force lock
    const accountRecord = this.accountStore.get(cleanEmail);
    if (accountRecord && accountRecord.lockedUntil && accountRecord.lockedUntil > now) {
      const retryAfterSeconds = Math.ceil((accountRecord.lockedUntil - now) / 1000);
      return {
        allowed: false,
        retryAfterSeconds,
        reason:
          'Too many failed login attempts for this account. Please wait 5 minutes before trying again.',
      };
    }

    return { allowed: true };
  }

  /**
   * Records a failed login attempt for the given account and IP.
   */
  public recordFailedLogin(email: string, ip: string): void {
    const now = Date.now();
    const cleanEmail = email.trim().toLowerCase();

    // 1. Update Account-level record
    let accountRecord = this.accountStore.get(cleanEmail);
    if (!accountRecord || (accountRecord.lockedUntil && accountRecord.lockedUntil <= now)) {
      accountRecord = {
        failedCount: 1,
        firstFailedAt: now,
        lastFailedAt: now,
        lockedUntil: null,
      };
    } else {
      // If outside sliding window, reset window
      if (now - accountRecord.firstFailedAt > this.ACCOUNT_COOLDOWN_MS) {
        accountRecord.failedCount = 1;
        accountRecord.firstFailedAt = now;
      } else {
        accountRecord.failedCount += 1;
      }
      accountRecord.lastFailedAt = now;
    }

    if (accountRecord.failedCount >= this.MAX_ACCOUNT_FAILED_ATTEMPTS) {
      accountRecord.lockedUntil = now + this.ACCOUNT_COOLDOWN_MS;
      console.warn(
        `[SecurityAudit] Account ${cleanEmail} temporarily throttled after ${accountRecord.failedCount} failed attempts from IP ${ip}`
      );
    }
    this.accountStore.set(cleanEmail, accountRecord);

    // 2. Update IP-level record for credential stuffing detection
    let ipRecord = this.ipStore.get(ip);
    if (!ipRecord || (ipRecord.lockedUntil && ipRecord.lockedUntil <= now)) {
      ipRecord = {
        distinctFailedEmails: new Set([cleanEmail]),
        totalFailedCount: 1,
        firstFailedAt: now,
        lockedUntil: null,
      };
    } else {
      if (now - ipRecord.firstFailedAt > this.IP_COOLDOWN_MS) {
        ipRecord.distinctFailedEmails = new Set([cleanEmail]);
        ipRecord.totalFailedCount = 1;
        ipRecord.firstFailedAt = now;
      } else {
        ipRecord.distinctFailedEmails.add(cleanEmail);
        ipRecord.totalFailedCount += 1;
      }
    }

    if (ipRecord.distinctFailedEmails.size >= this.MAX_DISTINCT_EMAILS_PER_IP) {
      ipRecord.lockedUntil = now + this.IP_COOLDOWN_MS;
      console.warn(
        `[SecurityAudit] Credential stuffing pattern detected from IP ${ip} across ${ipRecord.distinctFailedEmails.size} distinct accounts. Throttling IP.`
      );
    }
    this.ipStore.set(ip, ipRecord);
  }

  /**
   * Records a successful login. Clears account failed attempt counters.
   */
  public recordSuccessfulLogin(email: string, _ip: string): void {
    const cleanEmail = email.trim().toLowerCase();
    this.accountStore.delete(cleanEmail);
  }

  /**
   * Resets all tracking state (used in unit tests and maintenance).
   */
  public resetState(): void {
    this.accountStore.clear();
    this.ipStore.clear();
  }
}

export const loginSecurityService = new LoginSecurityService();
