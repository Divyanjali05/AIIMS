import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models/User.model';
import { mockUser } from '../models/aiims.models';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  userEmail?: string;
}

/**
 * Extracts student identity from Bearer token or x-user-email header,
 * and loads their active document from MongoDB Atlas.
 */
export const authenticateStudent = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let email: string | null = null;

    // 1. Check Authorization header
    const authHeader = req.headers.authorization || (req.headers['x-auth-token'] as string);
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
      
      // Check for token pattern: aiims-jwt-<base64email>-<timestamp>
      if (token.startsWith('aiims-jwt-')) {
        const parts = token.split('-');
        if (parts.length >= 4) {
          try {
            const decodedEmail = Buffer.from(parts[2], 'base64').toString('utf-8');
            if (decodedEmail && decodedEmail.includes('@')) {
              email = decodedEmail.toLowerCase().trim();
            }
          } catch {
            // Ignore decoding failure
          }
        }
      }
    }

    // 2. Check x-user-email header as secondary option
    if (!email && req.headers['x-user-email']) {
      const headerEmail = String(req.headers['x-user-email']).trim().toLowerCase();
      if (headerEmail.includes('@')) {
        email = headerEmail;
      }
    }

    // 3. If email identified, fetch student from MongoDB Atlas
    if (email) {
      req.userEmail = email;
      const dbUser = await User.findOne({ email });
      if (dbUser) {
        req.user = dbUser;
        return next();
      }
    }

    // 4. If no specific user token provided, fall back to last active or mock user
    const fallbackUser = await User.findOne().sort({ createdAt: -1 });
    if (fallbackUser) {
      req.user = fallbackUser;
      req.userEmail = fallbackUser.email;
    }

    next();
  } catch (error) {
    console.error('Error in authenticateStudent middleware:', error);
    next();
  }
};
