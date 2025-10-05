import { Request, Response, NextFunction } from 'express';
import { sql } from '../utils/db';

/**
 * Extend Express Request with user info
 */
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    userType: 'customer' | 'business' | 'admin';
    email: string;
    role?: string;
  };
}

/**
 * Audit logging for authorization attempts
 */
interface AuditLog {
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  result: 'success' | 'denied' | 'error';
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log authorization attempts for security monitoring
 */
async function logAuthorizationAttempt(log: AuditLog) {
  try {
    await sql`
      INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id,
        result, ip_address, user_agent, created_at
      ) VALUES (
        ${log.userId}, ${log.action}, ${log.resourceType}, ${log.resourceId},
        ${log.result}, ${log.ipAddress || null}, ${log.userAgent || null}, NOW()
      )
    `;
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Verify user owns the business
 * CRITICAL: Prevents Business A from accessing Business B's data
 */
export async function requireBusinessOwnership(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const businessId = req.params.id || req.params.businessId;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!businessId) {
      return res.status(400).json({ error: 'Business ID required' });
    }
    
    // Admin can access any business
    if (req.user?.userType === 'admin' || req.user?.role === 'admin') {
      return next();
    }
    
    // Check if user owns this business
    const result = await sql`
      SELECT id FROM users
      WHERE id = ${businessId}
      AND id = ${userId}
      AND user_type = 'business'
    `;
    
    if (result.length === 0) {
      // Log unauthorized access attempt
      await logAuthorizationAttempt({
        userId: userId,
        action: 'access_business',
        resourceType: 'business',
        resourceId: businessId,
        result: 'denied',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      
      return res.status(403).json({ 
        error: 'Access denied: You do not have permission to access this business'
      });
    }
    
    // Log successful access
    await logAuthorizationAttempt({
      userId: userId,
      action: 'access_business',
      resourceType: 'business',
      resourceId: businessId,
      result: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

/**
 * Verify user is accessing their own data
 * CRITICAL: Prevents User A from accessing User B's data
 */
export async function requireSelfOrAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const targetUserId = req.params.id || req.params.userId || req.params.customerId;
    const currentUserId = req.user?.userId;
    
    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Admin can access any user
    if (req.user?.userType === 'admin' || req.user?.role === 'admin') {
      return next();
    }
    
    // User can only access their own data
    if (currentUserId !== targetUserId) {
      await logAuthorizationAttempt({
        userId: currentUserId,
        action: 'access_user_data',
        resourceType: 'user',
        resourceId: targetUserId || 'unknown',
        result: 'denied',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      
      return res.status(403).json({ 
        error: 'Access denied: You can only access your own data'
      });
    }
    
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

/**
 * Verify user has admin role
 * CRITICAL: Prevents privilege escalation
 */
export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check user type from token
    if (req.user?.userType === 'admin' || req.user?.role === 'admin') {
      return next();
    }
    
    // Verify in database as fallback
    const result = await sql`
      SELECT user_type, role FROM users
      WHERE id = ${userId}
      AND (user_type = 'admin' OR role = 'admin')
    `;
    
    if (result.length === 0) {
      await logAuthorizationAttempt({
        userId: userId,
        action: 'admin_access',
        resourceType: 'admin',
        resourceId: 'system',
        result: 'denied',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      
      return res.status(403).json({ 
        error: 'Access denied: Admin privileges required'
      });
    }
    
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

/**
 * Verify user is a business
 */
export async function requireBusiness(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.user?.userType !== 'business' && req.user?.userType !== 'admin' && req.user?.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied: Business account required'
      });
    }
    
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

/**
 * Verify user is a customer
 */
export async function requireCustomer(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.user?.userType !== 'customer' && req.user?.userType !== 'admin' && req.user?.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied: Customer account required'
      });
    }
    
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

/**
 * Verify customer is enrolled in program
 * CRITICAL: Prevents unauthorized program access
 */
export async function requireProgramEnrollment(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const programId = req.params.programId || req.params.id;
    const customerId = req.user?.userId;
    
    if (!customerId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!programId) {
      return res.status(400).json({ error: 'Program ID required' });
    }
    
    // Admin can access any program
    if (req.user?.userType === 'admin' || req.user?.role === 'admin') {
      return next();
    }
    
    // Check enrollment
    const result = await sql`
      SELECT id FROM program_enrollments
      WHERE customer_id = ${customerId}
      AND program_id = ${programId}
      AND status = 'active'
    `;
    
    if (result.length === 0) {
      await logAuthorizationAttempt({
        userId: customerId,
        action: 'access_program',
        resourceType: 'program',
        resourceId: programId,
        result: 'denied',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      
      return res.status(403).json({ 
        error: 'Access denied: You are not enrolled in this program'
      });
    }
    
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

/**
 * Verify business serves this customer
 * CRITICAL: Prevents Business A from accessing Business B's customers
 */
export async function requireBusinessCustomerRelationship(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const customerId = req.params.customerId || req.params.id;
    const businessId = req.user?.userId;
    
    if (!businessId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID required' });
    }
    
    // Admin can access any relationship
    if (req.user?.userType === 'admin' || req.user?.role === 'admin') {
      return next();
    }
    
    // Check if customer is enrolled in any business program
    const result = await sql`
      SELECT DISTINCT pe.id
      FROM program_enrollments pe
      JOIN loyalty_programs lp ON pe.program_id = lp.id
      WHERE pe.customer_id = ${customerId}
      AND lp.business_id = ${businessId}
      AND pe.status = 'active'
    `;
    
    if (result.length === 0) {
      await logAuthorizationAttempt({
        userId: businessId,
        action: 'access_customer',
        resourceType: 'customer',
        resourceId: customerId,
        result: 'denied',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      
      return res.status(403).json({ 
        error: 'Access denied: This customer is not enrolled in your programs'
      });
    }
    
    next();
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

/**
 * Verify user can access program (owner or enrolled)
 */
export async function requireProgramAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const programId = req.params.id || req.params.programId;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!programId) {
      return res.status(400).json({ error: 'Program ID required' });
    }
    
    // Admin can access any program
    if (req.user?.userType === 'admin' || req.user?.role === 'admin') {
      return next();
    }
    
    // Check if user owns the business that owns this program
    if (req.user?.userType === 'business') {
      const result = await sql`
        SELECT id FROM loyalty_programs
        WHERE id = ${programId}
        AND business_id = ${userId}
      `;
      
      if (result.length > 0) {
        return next();
      }
    }
    
    // Check if customer is enrolled
    if (req.user?.userType === 'customer') {
      const result = await sql`
        SELECT id FROM program_enrollments
        WHERE program_id = ${programId}
        AND customer_id = ${userId}
        AND status = 'active'
      `;
      
      if (result.length > 0) {
        return next();
      }
    }
    
    await logAuthorizationAttempt({
      userId: userId,
      action: 'access_program',
      resourceType: 'program',
      resourceId: programId,
      result: 'denied',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.status(403).json({ 
      error: 'Access denied: You do not have access to this program'
    });
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}

/**
 * Verify user can access loyalty card
 */
export async function requireCardAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const cardId = req.params.id || req.params.cardId;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!cardId) {
      return res.status(400).json({ error: 'Card ID required' });
    }
    
    // Admin can access any card
    if (req.user?.userType === 'admin' || req.user?.role === 'admin') {
      return next();
    }
    
    const card = await sql`
      SELECT customer_id, business_id FROM loyalty_cards
      WHERE id = ${cardId}
    `;
    
    if (card.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    const { customer_id, business_id } = card[0];
    
    // Customer can access their own card
    if (req.user?.userType === 'customer' && customer_id === userId) {
      return next();
    }
    
    // Business can access cards for their programs
    if (req.user?.userType === 'business' && business_id === userId) {
      return next();
    }
    
    await logAuthorizationAttempt({
      userId: userId,
      action: 'access_card',
      resourceType: 'card',
      resourceId: cardId,
      result: 'denied',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.status(403).json({ 
      error: 'Access denied: You do not have access to this card'
    });
  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
}
