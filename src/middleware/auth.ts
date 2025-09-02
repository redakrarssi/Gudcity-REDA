import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/authService';
import { getUserById } from '../services/userService';

// Extend the Express Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        role: string;
        status?: string;
      };
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 * 
 * SECURITY NOTE: Logging has been sanitized to prevent exposure of sensitive
 * information including user emails, IDs, tokens, and detailed error messages.
 * All logs use generic success/failure messages for security compliance.
 */
export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Debug logging for auth issues
    console.log('AUTH MIDDLEWARE: Checking authentication');
    
    // Get token from Authorization header or cookies (transition support)
    const authHeader = req.headers.authorization;
    
    let token: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    // Fallback to cookie-based token if available
    if (!token && (req as any).cookies && (req as any).cookies.access_token) {
      token = (req as any).cookies.access_token;
    }
    if (!token) {
      console.error('AUTH ERROR: No token present');
      return res.status(401).json({ 
        error: 'Authentication required', 
        code: 'AUTH_TOKEN_MISSING',
        message: 'No authentication token was provided with the request'
      });
    }
    
    // If a header exists but is malformed, still attempt cookie token before failing handled above
    
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
      console.error('AUTH ERROR: Token payload missing required fields');
      return res.status(401).json({ 
        error: 'Invalid token payload', 
        code: 'AUTH_TOKEN_PAYLOAD_INVALID',
        message: 'Authentication token is missing required user information'
      });
    }
    
    // Fetch current user data from database to check status
    const currentUser = await getUserById(payload.userId);
    
    if (!currentUser) {
      console.error('AUTH ERROR: User not found in database');
      return res.status(401).json({ 
        error: 'User not found', 
        code: 'AUTH_USER_NOT_FOUND',
        message: 'User account no longer exists'
      });
    }
    
    // Check if user is banned
    if (currentUser.status === 'banned') {
      console.error('AUTH ERROR: Banned user attempted to access protected resource');
      return res.status(403).json({ 
        error: 'Account banned', 
        code: 'AUTH_USER_BANNED',
        message: 'Your account has been banned. Please contact support for assistance.'
      });
    }
    
    // Log if user is restricted (allow access but with warning)
    if (currentUser.status === 'restricted') {
      console.warn('AUTH WARNING: Restricted user accessing protected resource');
    }
    
    // Add user data to request object including current status
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      status: currentUser.status
    };
    
    console.log('AUTH SUCCESS: User authentication successful');
    next();
  } catch (error) {
    console.error('AUTH ERROR: Authentication failed - generic error occurred');
    res.status(401).json({ 
      error: 'Authentication failed', 
      code: 'AUTH_FAILED',
      message: 'Unable to authenticate request'
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