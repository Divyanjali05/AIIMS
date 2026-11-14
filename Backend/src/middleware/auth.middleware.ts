import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { prisma, isDatabaseConnected } from '../config/prisma';
import { IUser, UserRole } from '../types/models';
import { isSafeKey, isValidId } from '../utils/id';
import { userRecordToIUser } from '../utils/userMapper';
import { sessionService } from '../services/session.service';
import { extractDeviceInfo } from '../utils/deviceIdentifier';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  userEmail?: string;
  /** True when this request was authenticated via httpOnly cookie (not Bearer header) */
  cookieAuthenticated?: boolean;
  sessionId?: string;
  deviceIdHash?: string;
  authError?: {
    status: number;
    error: string;
    code: string;
  };
}

export interface JwtPayload {
  userId?: string;
  email?: string;
  role?: UserRole;
  sessionId?: string;
  deviceIdHash?: string;
  iat?: number;
  exp?: number;
}

/** State-changing methods that require CSRF origin check when authenticated via cookie. */
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * CSRF protection for cookie-authenticated state-changing requests.
 * Verifies that the Origin or Referer header matches an allowed origin.
 * Requests authenticated via Bearer header are exempt (mobile clients, CORS handles that).
 */
const passesOriginCheck = (req: Request): boolean => {
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
  if (!candidate) return false; // no valid origin on a mutation = reject

  return config.allowedOrigins.includes(candidate);
};

/**
 * Extracts and verifies JWT from:
 *   1. httpOnly cookie `aiims_token` (web)
 *   2. Authorization: Bearer <token> header (mobile)
 * Attaches authenticated user record from PostgreSQL to req.user.
 * For cookie-authenticated state-changing requests enforces Origin/Referer CSRF check.
 */
export const authenticateStudent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Extract token from Authorization header or httpOnly cookie
    const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
    const cookieToken =
      req.cookies && typeof req.cookies.aiims_token === 'string'
        ? req.cookies.aiims_token
        : undefined;
    const fromCookie = !authHeader && Boolean(cookieToken);
    const rawToken = authHeader || cookieToken || '';
    const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7).trim() : rawToken.trim();

    // 2. CSRF guard: cookie-authenticated state-changing requests must have a valid Origin/Referer
    if (fromCookie && STATE_CHANGING_METHODS.has(req.method) && !passesOriginCheck(req)) {
      return res.status(403).json({
        error: 'CSRF check failed: request origin is not allowed.',
        code: 'CSRF_FORBIDDEN',
      });
    }

    // 3. Verify token signature and expiration cryptographically (empty token fails to catch)
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    if (decoded && decoded.email && typeof decoded.email === 'string') {
      const email = decoded.email.toLowerCase().trim();
      req.userEmail = email;
      req.cookieAuthenticated = fromCookie;

      let dbUser: IUser | null = null;

      if (isDatabaseConnected() && isSafeKey(email)) {
        try {
          let row = null;
          if (decoded.userId && isValidId(decoded.userId)) {
            row = await prisma.user.findUnique({ where: { id: decoded.userId } });
          }
          if (!row && email) {
            row = await prisma.user.findUnique({ where: { email } });
          }
          if (row) {
            dbUser = userRecordToIUser(row);
          }
        } catch {
          dbUser = null;
        }
      }

      if (dbUser) {
        // 4. Inactive/Disabled Account Guard
        if (dbUser.isActive === false) {
          req.authError = {
            status: 403,
            error: 'Account has been disabled. Please contact support.',
            code: 'ACCOUNT_DISABLED',
          };
          return next();
        }

        // 5. Active Session Validation
        if (decoded.sessionId) {
          const session = await sessionService.getSession(decoded.sessionId);
          if (!session || session.status !== 'ACTIVE') {
            req.authError = {
              status: 401,
              error: 'Session has been revoked or expired. Please sign in again.',
              code: 'SESSION_REVOKED',
            };
            return next();
          }

          if (session.expiresAt < new Date()) {
            req.authError = {
              status: 401,
              error: 'Session has expired. Please sign in again.',
              code: 'SESSION_EXPIRED',
            };
            return next();
          }

          if (decoded.deviceIdHash && session.deviceIdHash !== decoded.deviceIdHash) {
            req.authError = {
              status: 401,
              error: 'Device binding is invalid or has been reset.',
              code: 'DEVICE_MISMATCH',
            };
            return next();
          }
        }

        // 6. Device Binding Validation against User Model
        if (
          decoded.deviceIdHash &&
          dbUser.deviceBinding &&
          dbUser.deviceBinding.bindingStatus === 'BOUND' &&
          dbUser.deviceBinding.deviceIdHash &&
          dbUser.deviceBinding.deviceIdHash !== decoded.deviceIdHash
        ) {
          req.authError = {
            status: 401,
            error: 'Device binding is invalid or has been reset. Please sign in again.',
            code: 'DEVICE_MISMATCH',
          };
          return next();
        }

        // 7. Device Spoofing Guard: Incoming request device header must match session device
        const incomingDevInfo = extractDeviceInfo(req);
        if (
          incomingDevInfo.deviceIdHash &&
          decoded.deviceIdHash &&
          incomingDevInfo.deviceIdHash !== decoded.deviceIdHash
        ) {
          req.authError = {
            status: 403,
            error: 'Request device does not match authenticated session device.',
            code: 'DEVICE_MISMATCH',
          };
          return next();
        }

        req.user = dbUser;
        if (decoded.sessionId) {
          req.sessionId = decoded.sessionId;
          req.deviceIdHash = decoded.deviceIdHash;
          sessionService.touchSession(decoded.sessionId).catch(() => {});
        }
      }
    }

    next();
  } catch {
    // Cryptographic validation failed (bad signature, expired, or malformed) -> req.user remains undefined
    next();
  }
};

/**
 * Strict authorization guard middleware for protected endpoints.
 * Returns 401 if unauthenticated or token is invalid/expired.
 */
export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.authError) {
    return res.status(req.authError.status).json({
      error: req.authError.error,
      code: req.authError.code,
    });
  }
  if (!req.user) {
    return res.status(401).json({
      error: 'Invalid or expired session. Please sign in again.',
      code: 'UNAUTHORIZED',
    });
  }
  next();
};

/**
 * Role-based access control guard middleware.
 * Returns 401 if unauthenticated.
 * Returns 403 if authenticated user's role is not within the permitted roles or if account is disabled.
 */
export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.authError) {
      return res.status(req.authError.status).json({
        error: req.authError.error,
        code: req.authError.code,
      });
    }
    if (!req.user) {
      return res.status(401).json({
        error: 'Invalid or expired session. Please sign in again.',
        code: 'UNAUTHORIZED',
      });
    }

    const userRole = (req.user.role as UserRole) || 'learner';

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        error: `Access denied. Role '${userRole}' is not authorized to access this resource. Required: ${roles.join(' or ')}.`,
        code: 'FORBIDDEN',
      });
    }

    if (req.user.isActive === false) {
      return res.status(403).json({
        error: 'Access denied. This account has been disabled.',
        code: 'ACCOUNT_DISABLED',
      });
    }

    next();
  };
};
