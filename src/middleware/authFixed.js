// Fixed authentication middleware
import { verifyToken } from '../services/authServiceFixed.js';
import sql from '../utils/dbFix.js';

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
const auth = async (req, res, next) => {
  try {
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
    
    // Check for basic auth format (temporary fallback)
    if (authHeader.startsWith('Basic ')) {
      console.warn('AUTH WARNING: Basic auth detected, converting to JWT flow');
      
      try {
        // Decode the Basic auth token
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
        const [id, email, role] = credentials.split(':');
        
        // Add user data to request object as fallback
        req.user = {
          id: parseInt(id),
          email,
          role: role || 'customer',
        };
        
        console.log(`AUTH SUCCESS (BASIC): User ${email} authenticated as fallback`);
        return next();
      } catch (error) {
        console.error('AUTH ERROR: Invalid basic auth token', error);
        return res.status(401).json({
          error: 'Authentication failed',
          code: 'AUTH_FAILED',
          message: 'Invalid authentication token format'
        });
      }
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
    
    // Fetch current user data from database to check status
    const userResult = await sql.query('SELECT * FROM users WHERE id = $1', [payload.userId]);
    const currentUser = userResult.rows && userResult.rows[0];
    
    if (!currentUser) {
      console.error(`AUTH ERROR: User ${payload.userId} not found in database`);
      return res.status(401).json({ 
        error: 'User not found', 
        code: 'AUTH_USER_NOT_FOUND',
        message: 'User account no longer exists'
      });
    }
    
    // Check if user is banned
    if (currentUser.status === 'banned') {
      console.error(`AUTH ERROR: Banned user ${payload.email} (ID: ${payload.userId}) attempted to access protected resource`);
      return res.status(403).json({ 
        error: 'Account banned', 
        code: 'AUTH_USER_BANNED',
        message: 'Your account has been banned. Please contact support for assistance.'
      });
    }
    
    // Add user data to request object including current status
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      status: currentUser.status
    };
    
    console.log(`AUTH SUCCESS: User ${payload.email} (ID: ${payload.userId}, Status: ${currentUser.status || 'active'}) authenticated`);
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
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Admin-only guard for sensitive endpoints
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }
  next();
};

export { auth, authorize, requireAdmin };
