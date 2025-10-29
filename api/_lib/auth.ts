import jwt from 'jsonwebtoken';
import { VercelRequest, VercelResponse } from '@vercel/node';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT secrets must be configured in environment variables');
}

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends VercelRequest {
  user?: TokenPayload;
}

/**
 * JWT verification middleware for serverless functions
 */
export function withAuth(handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<any>) {
  return async (req: AuthenticatedRequest, res: VercelResponse) => {
    try {
      // Check for Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          error: 'Unauthorized: Missing or invalid authorization header' 
        });
      }

      // Extract token
      const token = authHeader.substring(7);
      
      // Verify token with proper type assertion
      if (!JWT_SECRET) {
        throw new Error('JWT_SECRET is not configured');
      }
      const decoded = jwt.verify(token, JWT_SECRET) as unknown as TokenPayload;
      req.user = decoded;
      
      // Continue to the actual handler
      return handler(req, res);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ 
          error: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ 
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }
      
      console.error('Auth middleware error:', error);
      return res.status(500).json({ 
        error: 'Internal authentication error' 
      });
    }
  };
}

/**
 * Role-based access control middleware
 */
export function withRole(requiredRole: string | string[]) {
  return function(handler: (req: AuthenticatedRequest, res: VercelResponse) => Promise<any>) {
    return withAuth(async (req: AuthenticatedRequest, res: VercelResponse) => {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: roles,
          current: req.user.role
        });
      }

      return handler(req, res);
    });
  };
}

/**
 * Generate JWT token
 */
export function generateToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '1h',
    issuer: 'gudcity-api'
  });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  if (!JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not configured');
  }
  return jwt.sign(payload, JWT_REFRESH_SECRET, { 
    expiresIn: '7d',
    issuer: 'gudcity-api'
  });
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload {
  if (!JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not configured');
  }
  return jwt.verify(token, JWT_REFRESH_SECRET) as unknown as TokenPayload;
}
