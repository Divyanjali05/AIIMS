/**
 * totp.service.ts
 * ---------------------------------
 * TOTP (Time-based One-Time Password) helpers for AIIMS staff 2FA.
 *
 * Security characteristics:
 *  - Secrets are AES-256-GCM encrypted at rest with a key from TOTP_ENCRYPTION_KEY env var.
 *  - Backup codes are stored as SHA-256 hashes; each code is single-use.
 *  - TOTP verification window: ±1 step (30-second tolerance for slight clock drift).
 */

import crypto from 'crypto';
import * as otplib from 'otplib';
import QRCode from 'qrcode';

// ── Encryption constants ──────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const raw = process.env.TOTP_ENCRYPTION_KEY?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: TOTP_ENCRYPTION_KEY environment variable is not set in production.');
    }
    console.warn(
      '⚠️  [SECURITY WARNING] TOTP_ENCRYPTION_KEY not set; using dev-only fallback. DO NOT USE IN PRODUCTION.'
    );
    return Buffer.from('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 'hex');
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return crypto.createHash('sha256').update(raw).digest();
}

// ── Encrypt / decrypt helpers ─────────────────────────────────────────────────

/**
 * Encrypts a plain-text string and returns a colon-delimited string:
 *   <hex-iv>:<hex-authTag>:<hex-ciphertext>
 */
export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts a value previously produced by encryptSecret().
 * Throws if the ciphertext has been tampered with.
 */
export function decryptSecret(encoded: string): string {
  const parts = encoded.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted secret format.');
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

// ── TOTP helpers ──────────────────────────────────────────────────────────────

/** Generate a new TOTP secret (base32). */
export function generateTotpSecret(): string {
  return otplib.generateSecret();
}

/** Generate the otpauth:// URI consumed by authenticator apps. */
export function generateOtpauthUri(secret: string, userEmail: string): string {
  return otplib.generateURI({
    secret,
    label: userEmail,
    issuer: 'AIIMS Staff',
  });
}

/** Render a PNG data-URL QR code for the otpauth URI. */
export async function generateQrCodeDataUrl(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri, { errorCorrectionLevel: 'M', margin: 2, width: 256 });
}

/**
 * Verify a TOTP code against a plain-text secret.
 * Returns true if valid (window ±1 step).
 */
export async function verifyTotpCode(token: string, secret: string): Promise<boolean> {
  try {
    const normalised = token.replace(/\s/g, '');
    // otplib v12 default window is ±1
    const result = await otplib.verify({ token: normalised, secret });
    return result.valid === true;
  } catch {
    return false;
  }
}

/**
 * Generate a TOTP code for a secret (used in tests).
 */
export async function generateTotpCode(secret: string): Promise<string> {
  return otplib.generate({ secret });
}

// ── Backup codes ──────────────────────────────────────────────────────────────

const BACKUP_CODE_COUNT = 8;

/** Generate plain-text backup codes (shown once to the user). */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

/** Hash a backup code for storage (SHA-256, hex). */
export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code.replace(/-/g, '').toUpperCase()).digest('hex');
}

/**
 * Check whether a raw backup code matches any stored hash.
 * Returns the index of the matching hash (for deletion), or -1 if no match.
 */
export function findMatchingBackupCodeIndex(rawCode: string, storedHashes: string[]): number {
  const candidate = hashBackupCode(rawCode);
  return storedHashes.findIndex((h) => h === candidate);
}
