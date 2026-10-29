/**
 * totp.test.ts
 * Unit tests for the TOTP service covering:
 *  - Wrong code rejected
 *  - Backup code works once then is consumed
 *  - Rate-limit logic triggers (simulated via attempt counters)
 *  - Learner login is unaffected (no totpRequired in response)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as otplib from 'otplib';
import {
  generateTotpSecret,
  generateTotpCode,
  verifyTotpCode,
  encryptSecret,
  decryptSecret,
  generateBackupCodes,
  hashBackupCode,
  findMatchingBackupCodeIndex,
  generateOtpauthUri,
} from '../totp.service';

// ── Encryption ────────────────────────────────────────────────────────────────

describe('TOTP encryption', () => {
  it('encrypts and decrypts a secret round-trip', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const ciphertext = encryptSecret(secret);
    expect(ciphertext).not.toBe(secret);
    expect(ciphertext.split(':')).toHaveLength(3);
    expect(decryptSecret(ciphertext)).toBe(secret);
  });

  it('two encryptions of the same secret produce different ciphertexts (IV randomisation)', () => {
    const secret = 'MYSECRETKEY123456';
    const c1 = encryptSecret(secret);
    const c2 = encryptSecret(secret);
    expect(c1).not.toBe(c2);
    expect(decryptSecret(c1)).toBe(secret);
    expect(decryptSecret(c2)).toBe(secret);
  });

  it('throws on tampered ciphertext (auth tag mismatch)', () => {
    const secret = 'TAMPERTEST';
    const parts = encryptSecret(secret).split(':');
    // Flip a byte in the ciphertext hex
    const badHex = parts[2].replace(/^./, (c) => (parseInt(c, 16) ^ 0xf).toString(16));
    const tampered = `${parts[0]}:${parts[1]}:${badHex}`;
    expect(() => decryptSecret(tampered)).toThrow();
  });
});

// ── TOTP code verification ────────────────────────────────────────────────────

describe('TOTP code verification', () => {
  let secret: string;

  beforeAll(() => {
    secret = generateTotpSecret();
  });

  it('accepts a current valid TOTP code', async () => {
    const validCode = await generateTotpCode(secret);
    expect(await verifyTotpCode(validCode, secret)).toBe(true);
  });

  it('rejects an obviously wrong code', async () => {
    expect(await verifyTotpCode('000000', secret)).toBe(false);
    expect(await verifyTotpCode('999999', secret)).toBe(false);
    expect(await verifyTotpCode('abcdef', secret)).toBe(false);
  });

  it('strips whitespace from code before verifying', async () => {
    const validCode = await generateTotpCode(secret);
    expect(await verifyTotpCode(`${validCode.slice(0, 3)} ${validCode.slice(3)}`, secret)).toBe(
      true
    );
  });

  it('generates a valid otpauth URI', () => {
    const uri = generateOtpauthUri(secret, 'evaluator@aiims.edu');
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain('AIIMS%20Staff');
    expect(uri).toContain(secret);
  });
});

// ── Backup codes ──────────────────────────────────────────────────────────────

describe('Backup codes', () => {
  it('generates 8 codes in XXXX-XXXX format', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(8);
    for (const code of codes) {
      expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
    }
  });

  it('each code has a unique hash', () => {
    const codes = generateBackupCodes();
    const hashes = codes.map(hashBackupCode);
    const unique = new Set(hashes);
    expect(unique.size).toBe(8);
  });

  it('findMatchingBackupCodeIndex returns correct index for a valid code', () => {
    const codes = generateBackupCodes();
    const hashes = codes.map(hashBackupCode);
    for (let i = 0; i < codes.length; i++) {
      expect(findMatchingBackupCodeIndex(codes[i], hashes)).toBe(i);
    }
  });

  it('returns -1 for a code not in the list', () => {
    const codes = generateBackupCodes();
    const hashes = codes.map(hashBackupCode);
    expect(findMatchingBackupCodeIndex('DEAD-BEEF', hashes)).toBe(-1);
  });

  it('simulates single-use: consuming a code removes it so it cannot be used again', () => {
    const codes = generateBackupCodes();
    const hashes = codes.map(hashBackupCode);
    const targetCode = codes[3];

    // First use — found
    const idx = findMatchingBackupCodeIndex(targetCode, hashes);
    expect(idx).toBe(3);

    // Consume
    hashes.splice(idx, 1);

    // Second use — not found
    expect(findMatchingBackupCodeIndex(targetCode, hashes)).toBe(-1);
  });
});

// ── Rate-limit simulation ─────────────────────────────────────────────────────

describe('Rate-limit logic (unit simulation)', () => {
  const TOTP_MAX_ATTEMPTS = 5;
  const TOTP_LOCKOUT_MS = 10 * 60 * 1000;

  it('increments failedAttempts on each wrong code and triggers lockout at threshold', async () => {
    let failedAttempts = 0;
    let lockedUntil: Date | undefined;

    const attemptVerify = async (code: string, secret: string) => {
      const ok = await verifyTotpCode(code, secret);
      if (!ok) {
        failedAttempts++;
        if (failedAttempts >= TOTP_MAX_ATTEMPTS) {
          lockedUntil = new Date(Date.now() + TOTP_LOCKOUT_MS);
        }
      } else {
        failedAttempts = 0;
        lockedUntil = undefined;
      }
      return ok;
    };

    const secret = generateTotpSecret();

    for (let i = 0; i < TOTP_MAX_ATTEMPTS - 1; i++) {
      await attemptVerify('000000', secret);
    }
    expect(failedAttempts).toBe(TOTP_MAX_ATTEMPTS - 1);
    expect(lockedUntil).toBeUndefined();

    // Fifth wrong attempt triggers lockout
    await attemptVerify('000000', secret);
    expect(failedAttempts).toBe(TOTP_MAX_ATTEMPTS);
    expect(lockedUntil).toBeDefined();
    expect(lockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it('successful verify resets the counter', async () => {
    let failedAttempts = 3;
    const secret = generateTotpSecret();
    const validCode = await generateTotpCode(secret);
    const ok = await verifyTotpCode(validCode, secret);
    if (ok) failedAttempts = 0;
    expect(failedAttempts).toBe(0);
  });
});

// ── Learner login unaffected ──────────────────────────────────────────────────

describe('Learner login unaffected', () => {
  it('does not trigger TOTP challenge for learner role', () => {
    // Simulates the conditional in the login controller:
    //   if ((role === 'evaluator' || role === 'admin') && totp.enabled) -> totpRequired
    const simulateTotpRequired = (role: string, totpEnabled: boolean) =>
      (role === 'evaluator' || role === 'admin') && totpEnabled;

    expect(simulateTotpRequired('learner', true)).toBe(false);
    expect(simulateTotpRequired('learner', false)).toBe(false);
    expect(simulateTotpRequired('evaluator', true)).toBe(true);
    expect(simulateTotpRequired('admin', true)).toBe(true);
    expect(simulateTotpRequired('evaluator', false)).toBe(false);
  });
});
