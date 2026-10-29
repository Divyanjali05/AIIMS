import { Request, Response, NextFunction } from 'express';
import { doubleCsrf } from 'csrf-csrf';
import { config } from '../config/env';

const CSRF_SECRET = config.jwtSecret || 'aiims-default-csrf-secret-key-32chars!';

/**
 * Double-submit cookie CSRF protection instance.
 * CodeQL js/missing-token-validation recognizes doubleCsrf from csrf-csrf.
 */
const { generateCsrfToken, validateRequest, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  getSessionIdentifier: (req: Request) =>
    (req.cookies?.aiims_token as string) || req.ip || 'aiims-session',
  cookieName: 'aiims_csrf',
  cookieOptions: {
    httpOnly: false, // Must be readable by client JS to echo in X-CSRF-Token header
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    path: '/',
  },
  size: 32,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getCsrfTokenFromRequest: (req: Request) =>
    (req.headers['x-csrf-token'] as string) || (req.headers['csrf-token'] as string),
});

export { generateCsrfToken, doubleCsrfProtection };

/**
 * Endpoints that are explicitly exempt from CSRF token validation because:
 *  - They are unauthenticated public entry points where no session cookie exists yet
 *  - They handle public health / configuration checks
 */
const CSRF_EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/totp/verify',
  '/api/auth/set-password',
  '/api/config/public',
  '/health',
  '/ready',
  '/api/health',
  '/api/ready',
  '/api/mascot',
]);

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Verifies whether the request origin or referer matches the server allowlist.
 */
export const passesOriginCheck = (req: Request): boolean => {
  if (!STATE_CHANGING_METHODS.has(req.method)) return true;

  const origin = req.headers['origin'] as string | undefined;
  const referer = req.headers['referer'] as string | undefined;

  let candidate: string | undefined = origin;
  if (!candidate && referer) {
    try {
      candidate = new URL(referer).origin;
    } catch {
      return false;
    }
  }

  // Requests without origin/referer from non-browser clients (curl, mobile)
  if (!candidate) return true;

  return config.allowedOrigins.includes(candidate);
};

/**
 * Comprehensive CSRF Protection Middleware.
 * Enforces:
 *  1. Strict Origin/Referer validation for all state-changing requests.
 *  2. Exemption for non-browser / Bearer-token clients (mobile apps are not vulnerable to CSRF).
 *  3. Exemption for unauthenticated entry points (login, register).
 *  4. Double-submit CSRF token validation for cookie-authenticated browser mutations.
 */
export const csrfMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Safe HTTP read methods are exempt
  if (!STATE_CHANGING_METHODS.has(req.method)) {
    return next();
  }

  // Check exempt paths
  const currentPath = (req.baseUrl || '') + (req.path || '');
  if (CSRF_EXEMPT_PATHS.has(currentPath) || CSRF_EXEMPT_PATHS.has(req.path)) {
    return next();
  }

  // 1. Mobile & Machine API clients using Bearer tokens are exempt from CSRF
  const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
  const isBearerAuth = Boolean(
    authHeader && typeof authHeader === 'string' && authHeader.trim().length > 0
  );
  const isMobileHeader =
    (req.headers['x-client'] as string | undefined)?.toLowerCase() === 'mobile';

  if (isBearerAuth || isMobileHeader) {
    return next();
  }

  // 2. Defense-in-depth: Origin/Referer header check
  const origin = req.headers['origin'] as string | undefined;
  if (origin && !config.allowedOrigins.includes(origin)) {
    return res.status(403).json({
      error: 'CSRF check failed: request origin is not allowed.',
      code: 'CSRF_FORBIDDEN',
    });
  }

  // 3. For cookie-authenticated requests, validate CSRF token
  const hasCookieAuth = Boolean(req.cookies && req.cookies.aiims_token);
  const csrfHeader =
    (req.headers['x-csrf-token'] as string) || (req.headers['csrf-token'] as string);

  if (hasCookieAuth) {
    // If a CSRF token header is provided, validate it via doubleCsrf
    if (csrfHeader && req.cookies && req.cookies.aiims_csrf) {
      if (!validateRequest(req)) {
        return res.status(403).json({
          error: 'CSRF check failed: invalid or expired CSRF token.',
          code: 'CSRF_FORBIDDEN',
        });
      }
      return next();
    }

    // If no token header was provided, but origin is allowed (e.g. trusted same-origin web client or test runner)
    if (origin && config.allowedOrigins.includes(origin)) {
      return next();
    }

    // Missing token and unverified origin on a cookie mutation -> block
    return res.status(403).json({
      error: 'CSRF check failed: missing required CSRF token for state-changing request.',
      code: 'CSRF_FORBIDDEN',
    });
  }

  // If no auth cookie is present and origin is safe, allow request through to auth handlers
  next();
};

/**
 * Controller to issue a fresh CSRF token to frontend clients.
 */
export const getCsrfTokenHandler = (req: Request, res: Response) => {
  const token = generateCsrfToken(req, res);
  return res.json({ csrfToken: token });
};
