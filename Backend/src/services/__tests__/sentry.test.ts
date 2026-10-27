/**
 * sentry.test.ts
 * =========================================================
 * Error Monitoring & Sentry Data Scrubbing Test Suite
 *
 * Verifies that:
 *  1. Sentry is disabled when SENTRY_DSN is not configured
 *  2. scrubSentryEvent strictly strips user IP, email, username
 *  3. scrubSentryEvent strips authorization headers, cookies, and auth tokens
 *  4. Sensitive metadata is passed through redaction
 */

import { describe, it, expect } from 'vitest';
import {
  isSentryEnabled,
  scrubSentryEvent,
  captureException,
  captureMessage,
} from '../../utils/sentry';

describe('Error Monitoring & Sentry Integration Suite', () => {
  it('is disabled by default when SENTRY_DSN is absent', () => {
    expect(isSentryEnabled()).toBe(false);
  });

  it('captureException and captureMessage resolve safely without errors when disabled', async () => {
    await expect(captureException(new Error('Test failure'))).resolves.not.toThrow();
    await expect(captureMessage('Test info message', 'info')).resolves.not.toThrow();
  });

  it('scrubs user personal data (IP address, email, username) from Sentry events', () => {
    const rawEvent = {
      event_id: 'test-event-1',
      user: {
        id: 'usr_12345',
        ip_address: '192.168.1.100',
        email: 'alex.student@aiims.edu',
        username: 'alex_ai',
      },
    };

    const scrubbed = scrubSentryEvent(rawEvent);

    expect(scrubbed.user.ip_address).toBeUndefined();
    expect(scrubbed.user.email).toBeUndefined();
    expect(scrubbed.user.username).toBeUndefined();
    expect(scrubbed.user.id).toBe('[ANONYMIZED_USER_ID]');
  });

  it('scrubs authorization headers, cookies, and request tokens from Sentry events', () => {
    const rawEvent = {
      event_id: 'test-event-2',
      request: {
        url: 'https://api.aiims.edu/auth/login',
        method: 'POST',
        headers: {
          authorization: 'Bearer secret-jwt-token-12345',
          cookie: 'aiims_token=cookie-jwt-secret-val',
          'x-auth-token': 'token-xyz',
          'content-type': 'application/json',
        },
        cookies: {
          aiims_token: 'cookie-jwt-secret-val',
        },
        data: {
          email: 'alex@example.com',
          password: 'SecretPassword99!',
        },
      },
    };

    const scrubbed = scrubSentryEvent(rawEvent);

    expect(scrubbed.request.headers.authorization).toBeUndefined();
    expect(scrubbed.request.headers.cookie).toBeUndefined();
    expect(scrubbed.request.headers['x-auth-token']).toBeUndefined();
    expect(scrubbed.request.headers['content-type']).toBe('application/json');
    expect(scrubbed.request.cookies).toBeUndefined();
    expect(scrubbed.request.data.password).toBe('[REDACTED]');
  });
});
