import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService';

// Extend the Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Debug logging for auth issues
    console.log('AUTH MIDDLEWARE: Checking authentication');
    
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.error('AUTH ERROR: No Authorization header present');
      return res.status(401).json({ 
        error: 'Authentication required', 
        code: 'AUTH_HEADER_MISSING',
        message: 'No Authorization header was provided with the request'
      });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      console.error('AUTH ERROR: Authorization header format invalid');
      return res.status(401).json({ 
        error: 'Invalid authentication format', 
        code: 'AUTH_FORMAT_INVALID',
        message: 'Authorization header must use Bearer scheme'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      console.error('AUTH ERROR: Token is empty');
      return res.status(401).json({ 
        error: 'Authentication token missing', 
        code: 'AUTH_TOKEN_EMPTY',
        message: 'Bearer token is empty or malformed'
      });
    }
    
    // Verify token
    const payload = await verifyToken(token);
    
    if (!payload) {
      console.error('AUTH ERROR: Invalid or expired token');
      return res.status(401).json({ 
        error: 'Invalid or expired token', 
        code: 'AUTH_TOKEN_INVALID',
        message: 'The provided authentication token is invalid or has expired'
      });
    }
    
    // Validate payload contains required fields
    if (!payload.userId || !payload.email) {
      console.error('AUTH ERROR: Token payload missing required fields', payload);
      return res.status(401).json({ 
        error: 'Invalid token payload', 
        code: 'AUTH_TOKEN_PAYLOAD_INVALID',
        message: 'Authentication token is missing required user information'
      });
    }
    
    // Add user data to request object
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role
    };
    
    console.log(`AUTH SUCCESS: User ${payload.email} (ID: ${payload.userId}) authenticated`);
    next();
  } catch (error) {
    console.error('AUTH ERROR: Authentication failed', error);
    res.status(401).json({ 
      error: 'Authentication failed', 
      code: 'AUTH_FAILED',
      message: error instanceof Error ? error.message : 'Unknown authentication error'
    });
  }
};

/**
 * Role-based authorization middleware
 * Requires auth middleware to be applied first
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}; 