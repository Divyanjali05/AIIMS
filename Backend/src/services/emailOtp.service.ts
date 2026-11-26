import crypto from 'crypto';

export interface EmailOtpChallenge {
  id: string;
  userId: string;
  email: string;
  role: string;
  track: string;
  hashedOtp: string;
  salt: string;
  expiresAt: number;
  attemptsRemaining: number;
  lastSentAt: number;
}

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;

// In-memory challenge store (ephemeral, zero database schema changes required)
const challenges = new Map<string, EmailOtpChallenge>();

// Clean up expired challenges every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [id, challenge] of challenges.entries()) {
    if (now > challenge.expiresAt) {
      challenges.delete(id);
    }
  }
}, 60000).unref();

/**
 * Masks an email address for safe display in the UI without exposing the full address.
 * E.g., "alexander@example.com" -> "a*******r@example.com"
 */
export function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***@***.***';
  const [local, domain] = parts;

  if (local.length <= 2) {
    return `${local[0] || '*'}***@${domain}`;
  }

  const firstChar = local[0];
  const lastChar = local[local.length - 1];
  const maskedLocal = `${firstChar}***${lastChar}`;
  return `${maskedLocal}@${domain}`;
}

/**
 * Hashes an OTP with a random salt using SHA-256 HMAC.
 * The plain OTP is never stored in memory or databases.
 */
function hashOtp(otp: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(otp).digest('hex');
}

export class EmailOtpService {
  /**
   * Generates a cryptographically secure 6-digit OTP challenge.
   * Invalidates any existing challenge for the same user.
   */
  createChallenge(user: { id: string; email: string; role?: string; track?: string }): {
    challengeId: string;
    plainOtp: string;
    maskedEmail: string;
    expiresInSeconds: number;
    resendCooldownSeconds: number;
  } {
    const userId = String(user.id);
    const normalizedEmail = user.email.toLowerCase().trim();

    // Invalidate any existing challenge for this user (single active challenge per user)
    for (const [existingId, ch] of challenges.entries()) {
      if (ch.userId === userId || ch.email === normalizedEmail) {
        challenges.delete(existingId);
      }
    }

    // Cryptographically secure 6-digit random number (100000..999999)
    const plainOtp = crypto.randomInt(100000, 1000000).toString();
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedOtp = hashOtp(plainOtp, salt);
    const challengeId = crypto.randomUUID();
    const now = Date.now();

    const challenge: EmailOtpChallenge = {
      id: challengeId,
      userId,
      email: normalizedEmail,
      role: user.role || 'learner',
      track: user.track || 'Student',
      hashedOtp,
      salt,
      expiresAt: now + OTP_EXPIRY_MS,
      attemptsRemaining: MAX_ATTEMPTS,
      lastSentAt: now,
    };

    challenges.set(challengeId, challenge);

    return {
      challengeId,
      plainOtp,
      maskedEmail: maskEmail(normalizedEmail),
      expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
      resendCooldownSeconds: Math.floor(RESEND_COOLDOWN_MS / 1000),
    };
  }

  /**
   * Retrieves an active challenge by challengeId.
   */
  getChallenge(challengeId: string): EmailOtpChallenge | undefined {
    const ch = challenges.get(challengeId);
    if (!ch) return undefined;
    if (Date.now() > ch.expiresAt) {
      challenges.delete(challengeId);
      return undefined;
    }
    return ch;
  }

  /**
   * Verifies an OTP against an active challenge.
   * Single-use: The challenge is immediately destroyed upon successful verification or maximum attempts.
   */
  verifyOtp(
    challengeId: string,
    inputOtp: string
  ): {
    success: boolean;
    reason?: 'NOT_FOUND' | 'EXPIRED' | 'MAX_ATTEMPTS' | 'INVALID';
    attemptsRemaining?: number;
    userId?: string;
    email?: string;
    role?: string;
    track?: string;
  } {
    if (!challengeId || typeof challengeId !== 'string') {
      return { success: false, reason: 'NOT_FOUND' };
    }

    const challenge = challenges.get(challengeId);
    if (!challenge) {
      return { success: false, reason: 'NOT_FOUND' };
    }

    const now = Date.now();
    if (now > challenge.expiresAt) {
      challenges.delete(challengeId);
      return { success: false, reason: 'EXPIRED' };
    }

    if (challenge.attemptsRemaining <= 0) {
      challenges.delete(challengeId);
      return { success: false, reason: 'MAX_ATTEMPTS', attemptsRemaining: 0 };
    }

    const cleanInput = (inputOtp || '').trim();
    if (cleanInput.length !== 6 || !/^\d{6}$/.test(cleanInput)) {
      challenge.attemptsRemaining -= 1;
      if (challenge.attemptsRemaining <= 0) {
        challenges.delete(challengeId);
        return { success: false, reason: 'MAX_ATTEMPTS', attemptsRemaining: 0 };
      }
      return {
        success: false,
        reason: 'INVALID',
        attemptsRemaining: challenge.attemptsRemaining,
      };
    }

    const candidateHash = hashOtp(cleanInput, challenge.salt);
    const expectedBuf = Buffer.from(challenge.hashedOtp, 'hex');
    const actualBuf = Buffer.from(candidateHash, 'hex');

    const matches =
      expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);

    if (matches) {
      // Single-use: Destroy challenge immediately to prevent replay/reuse
      challenges.delete(challengeId);
      return {
        success: true,
        userId: challenge.userId,
        email: challenge.email,
        role: challenge.role,
        track: challenge.track,
      };
    }

    // Incorrect attempt
    challenge.attemptsRemaining -= 1;
    if (challenge.attemptsRemaining <= 0) {
      challenges.delete(challengeId);
      return { success: false, reason: 'MAX_ATTEMPTS', attemptsRemaining: 0 };
    }

    return {
      success: false,
      reason: 'INVALID',
      attemptsRemaining: challenge.attemptsRemaining,
    };
  }

  /**
   * Resends an OTP for an active challenge, enforcing a 60-second cooldown
   * and invalidating the previous OTP.
   */
  resendOtp(challengeId: string): {
    success: boolean;
    reason?: 'NOT_FOUND' | 'EXPIRED' | 'COOLDOWN';
    retryAfterSeconds?: number;
    plainOtp?: string;
    email?: string;
  } {
    const challenge = challenges.get(challengeId);
    if (!challenge) {
      return { success: false, reason: 'NOT_FOUND' };
    }

    const now = Date.now();
    if (now > challenge.expiresAt) {
      challenges.delete(challengeId);
      return { success: false, reason: 'EXPIRED' };
    }

    const elapsed = now - challenge.lastSentAt;
    if (elapsed < RESEND_COOLDOWN_MS) {
      const remaining = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return { success: false, reason: 'COOLDOWN', retryAfterSeconds: remaining };
    }

    // Invalidate previous OTP and generate a new one
    const newOtp = crypto.randomInt(100000, 1000000).toString();
    const newSalt = crypto.randomBytes(16).toString('hex');
    challenge.hashedOtp = hashOtp(newOtp, newSalt);
    challenge.salt = newSalt;
    challenge.expiresAt = now + OTP_EXPIRY_MS;
    challenge.attemptsRemaining = MAX_ATTEMPTS;
    challenge.lastSentAt = now;

    return {
      success: true,
      plainOtp: newOtp,
      email: challenge.email,
    };
  }

  /**
   * Deletes a challenge manually.
   */
  deleteChallenge(challengeId: string): void {
    challenges.delete(challengeId);
  }

  /**
   * Clears all stored challenges (used by automated tests).
   */
  clearAll(): void {
    challenges.clear();
  }
}

export const emailOtpService = new EmailOtpService();
