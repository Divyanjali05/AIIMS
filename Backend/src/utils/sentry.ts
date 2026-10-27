/**
 * sentry.ts
 * =========================================================
 * Production Error Monitoring (Optional Sentry Hooks for Backend)
 *
 * Enabled ONLY when SENTRY_DSN environment variable is configured.
 * When enabled, strictly scrubs all personal data (IP addresses, emails,
 * cookies, authorization headers, passwords, tokens) before transmission.
 */

import { Request, Response, NextFunction } from 'express';
import { redactSensitiveData } from './logger';

export interface SentryContext {
  req?: Request;
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
}

interface ParsedDsn {
  publicKey: string;
  host: string;
  projectId: string;
  endpoint: string;
}

const parseDsn = (dsn: string): ParsedDsn | null => {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const host = url.host;
    const pathParts = url.pathname.split('/').filter(Boolean);
    const projectId = pathParts[0];

    if (!publicKey || !host || !projectId) {
      return null;
    }

    return {
      publicKey,
      host,
      projectId,
      endpoint: `${url.protocol}//${host}/api/${projectId}/store/`,
    };
  } catch {
    return null;
  }
};

const dsnString = process.env.SENTRY_DSN?.trim() || '';
const parsedDsn = dsnString ? parseDsn(dsnString) : null;
const isEnabled = Boolean(parsedDsn);

/**
 * Returns true if Sentry error monitoring is configured and enabled.
 */
export function isSentryEnabled(): boolean {
  return isEnabled;
}

/**
 * Scrubs all personal data and secrets from Sentry event payloads.
 */
export function scrubSentryEvent(event: Record<string, any>): Record<string, any> {
  const scrubbed = { ...event };

  // 1. Scrub User personal data
  if (scrubbed.user) {
    scrubbed.user = {
      id: scrubbed.user.id ? '[ANONYMIZED_USER_ID]' : undefined,
      // Strictly scrub IP, email, username
      ip_address: undefined,
      email: undefined,
      username: undefined,
    };
  }

  // 2. Scrub Request sensitive headers & cookies
  if (scrubbed.request) {
    const cleanRequest = { ...scrubbed.request };
    if (cleanRequest.headers) {
      const headers = { ...cleanRequest.headers };
      delete headers['authorization'];
      delete headers['cookie'];
      delete headers['x-auth-token'];
      cleanRequest.headers = headers;
    }
    delete cleanRequest.cookies;
    if (cleanRequest.data) {
      cleanRequest.data = redactSensitiveData(cleanRequest.data);
    }
    scrubbed.request = cleanRequest;
  }

  // 3. Scrub extra metadata
  if (scrubbed.extra) {
    scrubbed.extra = redactSensitiveData(scrubbed.extra);
  }

  return scrubbed;
}

/**
 * Captures an exception and safely forwards it to Sentry if enabled.
 */
export async function captureException(err: any, context?: SentryContext): Promise<void> {
  if (!isEnabled || !parsedDsn) {
    return;
  }

  try {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    const rawEvent: Record<string, any> = {
      event_id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      timestamp: new Date().toISOString(),
      platform: 'node',
      level: context?.level || 'error',
      logger: 'aiims-backend',
      environment: process.env.NODE_ENV || 'production',
      exception: {
        values: [
          {
            type: errorObj.name || 'Error',
            value: errorObj.message || 'Unknown error',
            stacktrace: {
              frames: (errorObj.stack || '').split('\n').map((line) => ({ filename: line.trim() })),
            },
          },
        ],
      },
      tags: {
        ...(context?.tags || {}),
        service: 'aiims-backend',
      },
      extra: context?.extra ? redactSensitiveData(context.extra) : undefined,
    };

    if (context?.req) {
      const req = context.req;
      rawEvent.request = {
        url: req.originalUrl || req.url,
        method: req.method,
        headers: { ...(req.headers || {}) },
      };
    }

    const safePayload = scrubSentryEvent(rawEvent);

    await fetch(parsedDsn.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=aiims-backend/1.0.0, sentry_key=${parsedDsn.publicKey}`,
      },
      body: JSON.stringify(safePayload),
    }).catch(() => {
      // Network failures to Sentry must never disrupt the backend application
    });
  } catch {
    // Sentry capture errors are suppressed
  }
}

/**
 * Captures an informational or warning message to Sentry if enabled.
 */
export async function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: SentryContext
): Promise<void> {
  if (!isEnabled || !parsedDsn) {
    return;
  }

  try {
    const rawEvent = {
      event_id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      timestamp: new Date().toISOString(),
      platform: 'node',
      level,
      message: redactSensitiveData(message),
      environment: process.env.NODE_ENV || 'production',
      tags: context?.tags,
      extra: context?.extra ? redactSensitiveData(context.extra) : undefined,
    };

    const safePayload = scrubSentryEvent(rawEvent);

    await fetch(parsedDsn.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=aiims-backend/1.0.0, sentry_key=${parsedDsn.publicKey}`,
      },
      body: JSON.stringify(safePayload),
    }).catch(() => {});
  } catch {
    // Suppress Sentry capture errors
  }
}

/**
 * Express error monitoring middleware.
 * Attaches to Express error pipeline and notifies Sentry with scrubbed payload.
 */
export const sentryErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (isEnabled) {
    captureException(err, { req }).catch(() => {});
  }
  next(err);
};
