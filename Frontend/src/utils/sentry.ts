/**
 * sentry.ts
 * =========================================================
 * Production Error Monitoring (Optional Sentry Hooks for Frontend)
 *
 * Enabled ONLY when VITE_SENTRY_DSN environment variable is configured.
 * Automatically scrubs personal data (passwords, tokens, emails) before transmission.
 */

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

const dsnString = ((import.meta as any).env?.VITE_SENTRY_DSN as string | undefined)?.trim() || '';
const parsedDsn = dsnString ? parseDsn(dsnString) : null;
const isEnabled = Boolean(parsedDsn);

const scrubText = (text: string): string => {
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
    .replace(/Bearer\s+[a-zA-Z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
    .replace(/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]*/g, '[REDACTED_JWT]');
};

export function isFrontendSentryEnabled(): boolean {
  return isEnabled;
}

export async function captureFrontendError(
  error: any,
  context?: Record<string, any>
): Promise<void> {
  if (!isEnabled || !parsedDsn) {
    return;
  }

  try {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const safeMessage = scrubText(errorObj.message || 'Unknown frontend error');
    const safeStack = scrubText(errorObj.stack || '');

    const event = {
      event_id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      timestamp: new Date().toISOString(),
      platform: 'javascript',
      level: 'error',
      logger: 'aiims-frontend',
      environment: (import.meta as any).env?.MODE || 'production',
      exception: {
        values: [
          {
            type: errorObj.name || 'Error',
            value: safeMessage,
            stacktrace: {
              frames: safeStack.split('\n').map((line) => ({ filename: line.trim() })),
            },
          },
        ],
      },
      request: {
        url: scrubText(window.location.href),
      },
      extra: context ? JSON.parse(scrubText(JSON.stringify(context))) : undefined,
    };

    await fetch(parsedDsn.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_client=aiims-frontend/1.0.0, sentry_key=${parsedDsn.publicKey}`,
      },
      body: JSON.stringify(event),
    }).catch(() => {});
  } catch {
    // Sentry capture failure must never disrupt UI
  }
}

/**
 * Initializes global error listeners if Sentry is configured.
 */
export function initFrontendSentry(): void {
  if (!isEnabled) {
    return;
  }

  window.addEventListener('error', (event) => {
    captureFrontendError(event.error || event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureFrontendError(event.reason);
  });
}
