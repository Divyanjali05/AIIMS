import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { config } from '../config/env';
import { User, IUser } from '../models/User.model';
import { mockUser } from '../models/aiims.models';

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
      } catch (err) {
        // Fall back to memory document
      }
    }

    if (!dbUser && email) {
      dbUser = new User({
        _id: decoded.userId || `usr-${email}`,
        name: email === 'alex.ai@example.com' ? 'Alex AI' : (mockUser.email.toLowerCase() === email ? mockUser.name : email.split('@')[0]),
        email: email,
        role: 'Student / AI Learner',
        college: email === 'alex.ai@example.com' ? 'Stanford University' : 'Engineering & Technology College',
        targetGoal: 'Master AI Intelligence & Mentoring',
        stage: 'Knowing',
        xpPoints: 100,
        aiimsCredits: 100
      });
    }

    if (dbUser) {
      req.user = dbUser;
    }

    next();
  } catch (error) {
    // Cryptographic validation failed (bad signature, expired, or malformed) -> req.user remains undefined
    next();
  }
};

/**
 * Strict authorization guard middleware for protected endpoints.
 * Returns 401 if unauthenticated or token is invalid/expired.
 */
export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Invalid or expired session. Please sign in again.',
      code: 'UNAUTHORIZED'
    });
  }
  next();
};
