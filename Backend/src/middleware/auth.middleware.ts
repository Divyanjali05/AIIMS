import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from '../config/env';
import { User, IUser } from '../models/User.model';
import { mockUser } from '../models/aiims.models';
import { registeredUsers } from '../models/userStore';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  userEmail?: string;
}

export interface JwtPayload {
  userId?: string;
  email?: string;
  iat?: number;
  exp?: number;
}

/**
 * Extracts and verifies JWT from Bearer Authorization header,
 * and attaches authenticated student document to req.user.
 */
export const authenticateStudent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
    if (!token) {
      return next();
    }

    // Verify token signature and expiration cryptographically
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    if (!decoded || !decoded.email) {
      return next();
    }

    const email = decoded.email.toLowerCase().trim();
    req.userEmail = email;

    let dbUser: IUser | null = null;

    if (mongoose.connection.readyState === 1) {
      try {
        if (decoded.userId && mongoose.Types.ObjectId.isValid(decoded.userId)) {
          dbUser = await User.findById(decoded.userId);
        }
        if (!dbUser && email) {
          dbUser = await User.findOne({ email });
        }
      } catch {
        // Fall back to memory document
      }
    }

    if (!dbUser && email) {
      // In offline development mode (when MongoDB is not connected) allow mockUser or registeredUsers fallback
      if (mongoose.connection.readyState !== 1) {
        if (email === mockUser.email.toLowerCase()) {
          const mockUserWithId = mockUser as unknown as {
            _id?: mongoose.Types.ObjectId | string;
            id: string;
          };
          if (!mockUserWithId._id) {
            mockUserWithId._id = new mongoose.Types.ObjectId('65d000000000000000000101');
          }
          mockUser.id = String(mockUserWithId._id);
          dbUser = mockUser as unknown as IUser;
        } else if (registeredUsers && registeredUsers[email]) {
          const regUser = registeredUsers[email];
          if (!regUser._id || !mongoose.Types.ObjectId.isValid(regUser._id)) {
            regUser._id =
              decoded.userId && mongoose.Types.ObjectId.isValid(decoded.userId)
                ? decoded.userId
                : new mongoose.Types.ObjectId().toHexString();
          }
          regUser.id = String(regUser._id);
          if (!regUser.radar)
            regUser.radar = { status: 'locked', investigatedSignalIds: [], followedSignalIds: [] };
          if (!regUser.assessment)
            regUser.assessment = {
              status: 'not_started',
              answers: {},
              scores: {},
              rewardClaimed: false,
            };
          if (!regUser.clarity)
            regUser.clarity = {
              status: 'locked',
              selectedAreas: [],
              completedTopics: [],
              reflections: {},
              taskScores: {},
            };
          if (!regUser.focus) regUser.focus = { status: 'locked', history: [], sessionHistory: [] };
          if (!regUser.aiWallet) regUser.aiWallet = { userTools: [], dismissedRecommendations: [] };
          dbUser = new User(regUser);
          const memoryUser = dbUser as unknown as { _id?: unknown; id?: string };
          memoryUser._id = regUser._id;
          memoryUser.id = regUser.id || String(regUser._id);
          Object.defineProperty(dbUser, 'aiimsCredits', {
            get() {
              return regUser.aiimsCredits;
            },
            set(v) {
              regUser.aiimsCredits = v;
            },
            configurable: true,
          });
          Object.defineProperty(dbUser, 'xpPoints', {
            get() {
              return regUser.xpPoints;
            },
            set(v) {
              regUser.xpPoints = v;
            },
            configurable: true,
          });
          Object.defineProperty(dbUser, 'transactions', {
            get() {
              return regUser.transactions;
            },
            set(v) {
              regUser.transactions = v;
            },
            configurable: true,
          });
          Object.defineProperty(dbUser, 'radar', {
            get() {
              return regUser.radar;
            },
            set(v) {
              regUser.radar = v;
            },
            configurable: true,
          });
          Object.defineProperty(dbUser, 'assessment', {
            get() {
              return regUser.assessment;
            },
            set(v) {
              regUser.assessment = v;
            },
            configurable: true,
          });
          Object.defineProperty(dbUser, 'clarity', {
            get() {
              return regUser.clarity;
            },
            set(v) {
              regUser.clarity = v;
            },
            configurable: true,
          });
          Object.defineProperty(dbUser, 'focus', {
            get() {
              return regUser.focus;
            },
            set(v) {
              regUser.focus = v;
            },
            configurable: true,
          });
          Object.defineProperty(dbUser, 'aiWallet', {
            get() {
              return regUser.aiWallet;
            },
            set(v) {
              regUser.aiWallet = v;
            },
            configurable: true,
          });
        }
      }
      // CRITICAL SECURITY FIX (SEC-01): Do NOT auto-create user documents in MongoDB Atlas for arbitrary tokens.
      // If the user record does not exist in the database, req.user remains undefined and requireAuth guards will return 401.
    }

    if (dbUser) {
      req.user = dbUser;
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
  if (!req.user) {
    return res.status(401).json({
      error: 'Invalid or expired session. Please sign in again.',
      code: 'UNAUTHORIZED',
    });
  }
  next();
};
