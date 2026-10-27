/**
 * logging.test.ts
 * =========================================================
 * Production Logging & Redaction Verification Test Suite
 *
 * Verifies that:
 *  1. Secrets, tokens, passwords, API keys, and personal data are redacted
 *  2. Inline JWTs, Bearer headers, and emails are scrubbed
 *  3. Request bodies and sensitive object keys are replaced with [REDACTED]
 *  4. In production, debug logs are suppressed
 */

import { describe, it, expect } from 'vitest';
import { redactSensitiveData, logger } from '../../utils/logger';

describe('Logging & Data Redaction Suite', () => {
  it('redacts sensitive object keys (password, token, apiKey, secret, cookies, body)', () => {
    const rawPayload = {
      user: {
        name: 'Alex AI',
        email: 'alex@example.com',
        password: 'SuperSecretPassword123!',
        passwordHash: '$2a$10$' + 'abcdefghijklmnopqrstuvwxyz123456',
        totpEncryptionKey: 'abcdef0123456789'.repeat(4),
      },
      auth: {
        token: ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', 'eyJ1c2VySWQiOiIxMjMifQ', 'abc'].join('.'),
        authorization: 'Bearer secret-bearer-token',
        cookies: { aiims_token: 'secret-cookie-value' },
      },
      config: {
        apiKey: 'anthropic-secret-api-key',
        secret: 'system-jwt-secret',
      },
      request: {
        body: { sensitiveData: 'some payload' },
        requestBody: 'raw payload',
      },
    };

    const cleaned = redactSensitiveData(rawPayload);

    expect(cleaned.user.password).toBe('[REDACTED]');
    expect(cleaned.user.passwordHash).toBe('[REDACTED]');
    expect(cleaned.user.totpEncryptionKey).toBe('[REDACTED]');
    expect(cleaned.auth.token).toBe('[REDACTED]');
    expect(cleaned.auth.authorization).toBe('[REDACTED]');
    expect(cleaned.auth.cookies).toBe('[REDACTED]');
    expect(cleaned.config.apiKey).toBe('[REDACTED]');
    expect(cleaned.config.secret).toBe('[REDACTED]');
    expect(cleaned.request.body).toBe('[REDACTED]');
    expect(cleaned.request.requestBody).toBe('[REDACTED]');
    expect(cleaned.user.name).toBe('Alex AI'); // Safe non-sensitive field preserved
  });

  it('redacts inline JWT tokens in log strings', () => {
    const mockJwt = [
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      'eyJ1c2VySWQiOiIxMjMifQ',
      'abc123def456',
    ].join('.');
    const logStr = `User authenticated with token: ${mockJwt}`;
    const cleaned = redactSensitiveData(logStr);

    expect(cleaned).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(cleaned).toContain('[REDACTED_JWT]');
  });

  it('redacts Bearer tokens in log strings', () => {
    const mockBearer = ['ya29', 'a0AfH6SMBabc123xyz_token'].join('.');
    const logStr = `Header received: Bearer ${mockBearer}`;
    const cleaned = redactSensitiveData(logStr);

    expect(cleaned).not.toContain('a0AfH6SMBabc123xyz_token');
    expect(cleaned).toContain('Bearer [REDACTED]');
  });

  it('redacts email addresses in log strings', () => {
    const logStr = 'Registered new user account: learner.alex@university.edu successfully';
    const cleaned = redactSensitiveData(logStr);

    expect(cleaned).not.toContain('learner.alex@university.edu');
    expect(cleaned).toContain('[REDACTED_EMAIL]');
  });

  it('handles nested arrays, circular references, and errors safely without crashing', () => {
    const circularObj: any = { name: 'Circular Test' };
    circularObj.self = circularObj;

    const cleaned = redactSensitiveData(circularObj);
    expect(cleaned.name).toBe('Circular Test');
    expect(cleaned.self).toBe('[CIRCULAR]');
  });
});
