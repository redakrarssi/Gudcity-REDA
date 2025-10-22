import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { requireSql } from './db.js';

export interface AuthUser {
  id: number;
  email?: string;
  role?: string;
  user_type?: string;
  businessId?: number;
}

// Extended request interface with authenticated user
export interface AuthenticatedRequest extends VercelRequest {
  user?: AuthUser;
}

export async function verifyAuth(req: VercelRequest): Promise<AuthUser | null> {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  
  if (!token) {
    console.log('[Auth] No token provided in request');
    return null;
  }
  
  const secret = process.env.JWT_SECRET || process.env.VITE_JWT_SECRET;
  if (!secret) {
    console.error('[Auth] JWT_SECRET not configured');
    return null;
  }

  try {
    const payload = jwt.verify(token, secret) as any;
    
    // Optional blacklist check
    try {
      const sql = requireSql();
      if (payload?.jti) {
        const rows = await sql`SELECT 1 FROM revoked_tokens WHERE jti = ${payload.jti} LIMIT 1`;
        if (rows && rows.length > 0) {
          console.log('[Auth] Token is blacklisted:', payload.jti);
          return null;
        }
      }
    } catch (err) {
      console.warn('[Auth] Failed to check token blacklist:', err);
    }

    const user: AuthUser = {
      id: Number(payload.userId),
      email: payload.email,
      role: payload.role,
      businessId: payload.businessId ? Number(payload.businessId) : undefined,
    };

    console.log('[Auth] User authenticated:', { userId: user.id, role: user.role });
    return user;
  } catch (error) {
    console.log('[Auth] Token verification failed:', (error as Error).message);
    return null;
  }
}

export async function verifyBusinessAccess(userId: number, businessId: string | number): Promise<boolean> {
  try {
    const sql = requireSql();
    const rows = await sql`
      SELECT 1 FROM users 
      WHERE id = ${Number(businessId)} 
        AND (id = ${userId} OR role IN ('admin','owner'))
      LIMIT 1
    `;
    return rows && rows.length > 0;
  } catch (_) {
    return false;
  }
}

export function cors(res: any, origin?: string) {
  const allowedOrigins = [
    process.env.VITE_APP_URL,
    process.env.APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ].filter(Boolean) as string[];
  const reqOrigin = origin || allowedOrigins[0] || '*';
  res.setHeader('Access-Control-Allow-Origin', reqOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

export function rateLimitFactory(limit: number, windowMs: number) {
  const store = new Map<string, { count: number; resetAt: number }>();
  return (key: string) => {
    const now = Date.now();
    const entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    entry.count++;
    return entry.count <= limit;
  };
}

/**
 * Authentication middleware for API endpoints
 * Verifies JWT token and attaches user to request
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: VercelResponse,
  next?: () => void
): Promise<boolean> {
  const user = await verifyAuth(req);
  
  if (!user) {
    console.log('[AuthMiddleware] Authentication failed for:', req.url);
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return false;
  }
  
  // Attach user to request
  req.user = user;
  
  // Log authenticated request
  console.log('[AuthMiddleware] Authenticated request:', {
    url: req.url,
    method: req.method,
    userId: user.id,
    role: user.role,
  });
  
  if (next) next();
  return true;
}

/**
 * Role-based authorization helper
 * Checks if authenticated user has required role
 */
export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: VercelResponse, next?: () => void): boolean => {
    if (!req.user) {
      console.log('[RequireRole] No user attached to request');
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return false;
    }
    
    const userRole = req.user.role || 'customer';
    
    if (!allowedRoles.includes(userRole)) {
      console.log('[RequireRole] Access denied:', {
        userId: req.user.id,
        userRole,
        requiredRoles: allowedRoles,
      });
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          details: {
            required: allowedRoles,
            current: userRole,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      });
      return false;
    }
    
    console.log('[RequireRole] Access granted:', {
      userId: req.user.id,
      role: userRole,
    });
    
    if (next) next();
    return true;
  };
}

/**
 * Check if user can access resource (owns it or is admin)
 */
export function canAccessResource(
  req: AuthenticatedRequest,
  resourceUserId: number | string
): boolean {
  if (!req.user) return false;
  
  const userId = req.user.id;
  const userRole = req.user.role || 'customer';
  
  // Admin can access any resource
  if (userRole === 'admin') return true;
  
  // User can access their own resource
  return userId === Number(resourceUserId);
}

