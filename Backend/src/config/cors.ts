import { CorsOptions } from 'cors';
import { Request, Response, NextFunction } from 'express';
import { config } from './env';

/**
 * Validates whether an IPv4 string strictly represents an RFC 1918 private address:
 * - 10.0.0.0/8     (10.0.0.0    – 10.255.255.255)
 * - 172.16.0.0/12  (172.16.0.0   – 172.31.255.255)
 * - 192.168.0.0/16 (192.168.0.0  – 192.168.255.255)
 * - 127.0.0.0/8    (127.0.0.0    – 127.255.255.255 loopback)
 *
 * Enforces strict 4-octet numerical bounds [0-255] and forbids leading zeros (e.g. 01)
 * to prevent octal ambiguity and spoofing.
 */
export function isPrivateOrLoopbackIPv4(hostname: string): boolean {
  const octets = hostname.split('.');
  if (octets.length !== 4) return false;

  // Each octet must be 1-3 digits with no leading zeros (except single 0) and value <= 255
  if (!octets.every((o) => /^(?:0|[1-9]\d{0,2})$/.test(o) && Number(o) <= 255)) {
    return false;
  }

  const [a, b] = octets.map(Number);
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 127) return true; // 127.0.0.0/8 Loopback
  return false;
}

/**
 * Centralized, secure origin authorization evaluation.
 *
 * Security Model:
 * 1. Missing Origin (e.g. mobile apps using native HTTP clients, same-origin without header, curl):
 *    -> ALLOWED (true).
 * 2. Production Environment (NODE_ENV === 'production'):
 *    -> Strictly verified against explicit config.allowedOrigins (from ALLOWED_ORIGINS env).
 *    -> Wildcard '*' is filtered out; dynamic LAN matching is strictly disabled.
 * 3. Development / Test Environment (NODE_ENV !== 'production'):
 *    -> Allowed if explicitly present in config.allowedOrigins (or explicit allowed list).
 *    -> Allowed if localhost / loopback ('localhost', '127.0.0.1' on any port, 'capacitor://localhost').
 *    -> Allowed if matching a valid RFC 1918 private IPv4 address (192.168.x.x, 10.x.x.x, 172.16-31.x.x).
 *    -> Rejects public Internet IPs, arbitrary external domain names, and malformed URIs.
 *
 * @param origin - Incoming Origin header value
 * @param nodeEnv - Current runtime environment (defaults to config.nodeEnv or process.env.NODE_ENV)
 * @param explicitAllowed - Explicit allowed origins array (defaults to config.allowedOrigins)
 */
export function isAllowedOrigin(
  origin?: string | null,
  nodeEnv: string = config?.nodeEnv || process.env.NODE_ENV || 'development',
  explicitAllowed: string[] = config?.allowedOrigins || []
): boolean {
  // Requests without origin header (mobile native apps, server-to-server, curl)
  if (!origin || typeof origin !== 'string' || !origin.trim()) {
    return true;
  }

  const trimmed = origin.trim();
  const isProd = nodeEnv === 'production';

  // 1. Explicit allowlist check (always takes precedence)
  if (explicitAllowed.includes(trimmed)) {
    return true;
  }

  // In production, strictly enforce explicit allowlist only
  if (isProd) {
    return false;
  }

  // 2. Development / Test dynamic evaluation
  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol;
    const hostname = parsed.hostname;
    const port = parsed.port;

    // Mobile / Capacitor local bridge scheme
    if (protocol === 'capacitor:' && hostname === 'localhost') {
      return true;
    }

    // Must use http or https
    if (protocol !== 'http:' && protocol !== 'https:') {
      return false;
    }

    // Port check if specified: must be valid TCP port (1-65535)
    if (port !== '') {
      const portNum = Number(port);
      if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
        return false;
      }
    }

    // Loopback / localhost names
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('127.')) {
      return true;
    }

    // RFC 1918 Private IPv4 address evaluation (LAN development access)
    if (isPrivateOrLoopbackIPv4(hostname)) {
      return true;
    }

    // All other origins in development (external public domains, public IPs) are rejected
    return false;
  } catch {
    // Malformed URI string
    return false;
  }
}

/**
 * Standardized CORS Configuration options for Express.
 */
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: Origin ${origin} is not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Client',
    'X-CSRF-Token',
    'CSRF-Token',
    'X-Device-Id',
    'X-Device-Name',
    'X-Platform',
    'X-Request-Id',
  ],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After', 'X-CSRF-Token'],
  maxAge: 86400, // 24 hours preflight cache to eliminate redundant OPTIONS traffic
  optionsSuccessStatus: 204,
};

/**
 * Safe Express error handler for blocked CORS attempts.
 * Returns HTTP 403 Forbidden with standard code CORS_FORBIDDEN.
 */
export const corsErrorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message?: unknown }).message)
        : '';

  if (message.startsWith('CORS blocked:')) {
    return res.status(403).json({
      error: 'Access denied by CORS policy',
      code: 'CORS_FORBIDDEN',
    });
  }
  next(err);
};
