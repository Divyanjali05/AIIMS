/**
 * logger.ts
 * =========================================================
 * Production-Safe Structured Logging & Redaction System
 *
 * Ensures:
 *  1. Secrets, tokens, passwords, API keys, and personal data are NEVER logged.
 *  2. Full request bodies are NEVER logged.
 *  3. Noisy emoji debug logs are suppressed in production.
 *  4. Structured, standardized output format.
 */

import { Request, Response, NextFunction } from 'express';

// Keys that must always have their values redacted (case-insensitive check)
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passwordhash/i,
  /confirmpassword/i,
  /token/i,
  /aiims_token/i,
  /authorization/i,
  /jwt/i,
  /apikey/i,
  /secret/i,
  /encryptedsecret/i,
  /totpencryptionkey/i,
  /invitetoken/i,
  /refreshtoken/i,
  /cookie/i,
  /cookies/i,
  /set-cookie/i,
  /creditcard/i,
  /ssn/i,
  /requestbody/i,
  /body/i,
];

// String pattern matchers for inline token/secret redaction
const JWT_REGEX = /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]*/g;
const BEARER_REGEX = /Bearer\s+[a-zA-Z0-9._~+/-]+=*/gi;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Recursively redacts sensitive keys and patterns from any data structure.
 * Creates a safe clone without mutating the input.
 */
export function redactSensitiveData(data: any, seen: WeakSet<object> = new WeakSet()): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Primitive types
  if (typeof data === 'string') {
    return data
      .replace(JWT_REGEX, '[REDACTED_JWT]')
      .replace(BEARER_REGEX, 'Bearer [REDACTED]')
      .replace(EMAIL_REGEX, '[REDACTED_EMAIL]');
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  // Prevent circular references
  if (typeof data === 'object') {
    if (seen.has(data)) {
      return '[CIRCULAR]';
    }
    seen.add(data);

    // Arrays
    if (Array.isArray(data)) {
      return data.map((item) => redactSensitiveData(item, seen));
    }

    // Errors
    if (data instanceof Error) {
      return {
        name: data.name,
        message: redactSensitiveData(data.message, seen),
        stack:
          process.env.NODE_ENV === 'production' ? undefined : redactSensitiveData(data.stack, seen),
      };
    }

    // Generic objects
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      const isSensitiveKey = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
      if (isSensitiveKey) {
        cleaned[key] = '[REDACTED]';
      } else {
        cleaned[key] = redactSensitiveData(data[key], seen);
      }
    }
    return cleaned;
  }

  return data;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';

  /**
   * Neutralizes carriage returns and newlines to prevent log injection / log forging (CWE-117).
   */
  private sanitizeForLog(val: unknown): string {
    if (typeof val !== 'string') {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return val.replace(/[\r\n]+/g, ' ');
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const redacted = typeof message === 'string' ? redactSensitiveData(message) : message;
    const sanitizedMsg = this.sanitizeForLog(redacted);

    if (this.isProduction) {
      const entry: Record<string, any> = {
        timestamp,
        level: level.toUpperCase(),
        message: sanitizedMsg,
      };
      if (meta !== undefined) {
        entry.meta = redactSensitiveData(meta);
      }
      return JSON.stringify(entry);
    }

    const metaStr =
      meta !== undefined
        ? ` ${this.sanitizeForLog(JSON.stringify(redactSensitiveData(meta)))}`
        : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${sanitizedMsg}${metaStr}`;
  }

  info(message: string, meta?: any): void {
    console.log(this.formatMessage('info', message, meta));
  }

  warn(message: string, meta?: any): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  error(message: string, error?: any, meta?: any): void {
    const combinedMeta = {
      ...(meta || {}),
      ...(error instanceof Error
        ? {
            errorName: error.name,
            errorMessage: error.message,
            stack: this.isProduction ? undefined : error.stack,
          }
        : error
          ? { rawError: String(error) }
          : {}),
    };
    console.error(this.formatMessage('error', message, combinedMeta));
  }

  debug(message: string, meta?: any): void {
    // In production, debug logs are suppressed to prevent noise and internal leakage
    if (this.isProduction) {
      return;
    }
    console.log(this.formatMessage('debug', message, meta));
  }
}

export const logger = new Logger();

/**
 * Express HTTP request logger middleware.
 * Logs method, sanitized path, status code, and latency.
 * NEVER logs request body, authorization headers, or cookies.
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const { method, originalUrl } = req;

  // Sanitize query string if it contains sensitive tokens
  const sanitizedUrl = originalUrl.replace(
    /([?&](?:token|key|secret|password)=)[^&]+/gi,
    '$1[REDACTED]'
  );

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // Use info for normal, warn for 4xx, error for 5xx
    if (status >= 500) {
      logger.error(`HTTP ${method} ${sanitizedUrl} ${status} - ${duration}ms`);
    } else if (status >= 400) {
      logger.warn(`HTTP ${method} ${sanitizedUrl} ${status} - ${duration}ms`);
    } else {
      logger.info(`HTTP ${method} ${sanitizedUrl} ${status} - ${duration}ms`);
    }
  });

  next();
};
