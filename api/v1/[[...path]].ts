/**
 * Consolidated API Handler for Multiple Endpoints
 * This file handles multiple API endpoints to bypass the Vercel Hobby plan's 12 function limit
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, verifyAuth } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Parse the path from the URL
  const fullPath = req.url || '';
  const pathWithoutApi = fullPath.replace(/^\/api\/v1\//, '');
  const pathSegments = pathWithoutApi.split('/').filter(Boolean);
  
  // Get the first segment to determine the endpoint type
  const endpointType = pathSegments[0] || '';

  // Log request for debugging
  console.log('🔍 [Consolidated API] Request received:', { 
    method: req.method,
    url: req.url,
    pathSegments,
    endpointType,
    query: req.query
  });

  try {
    // SECURITY AUDIT ENDPOINT
    if (endpointType === 'security' && pathSegments[1] === 'audit') {
      return handleSecurityAudit(req, res);
    }
    
    // LOYALTY CARDS ENDPOINT
    else if (endpointType === 'loyalty' && pathSegments[1] === 'cards' && 
             pathSegments[2] === 'customer' && pathSegments[3]) {
      return handleCustomerCards(req, res, pathSegments[3]);
    }
    
    // CUSTOMER PROGRAMS ENDPOINT
    else if (endpointType === 'customers' && pathSegments[1] && 
             pathSegments[2] === 'programs') {
      return handleCustomerPrograms(req, res, pathSegments[1]);
    }
    
    // NOTIFICATIONS ENDPOINT
    else if (endpointType === 'notifications') {
      return handleNotifications(req, res);
    }
    
    // PROMOTIONS ENDPOINT
    else if (endpointType === 'promotions') {
      return handlePromotions(req, res);
    }
    
    // If no handler matches, return 404
    return res.status(404).json({ 
      error: 'Not found', 
      path: fullPath,
      segments: pathSegments
    });
  } catch (error) {
    console.error('[Consolidated API] Error:', error);
    console.error('[Consolidated API] Error stack:', (error as Error).stack);
    return res.status(500).json({ 
      error: 'Server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'An unexpected error occurred'
    });
  }
}

// HANDLER FUNCTIONS

/**
 * Handle Security Audit endpoints
 */
async function handleSecurityAudit(req: VercelRequest, res: VercelResponse) {
  console.log('✅ Matched security/audit route');
  
  if (req.method === 'GET') {
    // Authentication check
    const user = await verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { requireSql } = await import('../_lib/db.js');
      const sql = requireSql();
      
      const logs = await sql`
        SELECT * FROM security_audit_logs
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 100
      `;

      return res.status(200).json({ 
        success: true,
        logs
      });
    } catch (error) {
      console.error('Error getting security audit logs:', error);
      return res.status(500).json({ error: 'Failed to get audit logs' });
    }
  }

  if (req.method === 'POST') {
    // Authentication check
    const user = await verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { event, metadata, ipAddress, userAgent } = (req.body || {}) as any;

    if (!event) {
      return res.status(400).json({ error: 'event is required' });
    }

    try {
      const { requireSql } = await import('../_lib/db.js');
      const sql = requireSql();
      
      // Log security event
      await sql`
        INSERT INTO security_audit_logs (
          user_id, event, ip_address, user_agent, metadata, created_at
        ) VALUES (
          ${user.id}, ${event}, ${ipAddress || req.headers['x-forwarded-for'] || req.socket.remoteAddress},
          ${userAgent || req.headers['user-agent']}, ${JSON.stringify(metadata || {})}, NOW()
        )
      `;

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error logging security event:', error);
      return res.status(500).json({ error: 'Failed to log security event' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Handle Customer Loyalty Cards endpoints
 */
async function handleCustomerCards(req: VercelRequest, res: VercelResponse, customerId: string) {
  console.log('✅ Matched loyalty/cards/customer route:', customerId);
  
  if (req.method === 'GET') {
    // Authentication check
    const user = await verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Authorization check
    if (user.id !== Number(customerId) && user.role !== 'admin' && user.role !== 'business') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      // Import and use the loyalty card service
      const { getCustomerCards } = await import('../_services/loyaltyCardServerService.js');
      const cards = await getCustomerCards(Number(customerId));
      
      return res.status(200).json({ 
        success: true,
        cards,
        customerId: Number(customerId)
      });
    } catch (error) {
      console.error('Error getting customer cards:', error);
      return res.status(500).json({ error: 'Failed to get customer cards' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Handle Customer Programs endpoints
 */
async function handleCustomerPrograms(req: VercelRequest, res: VercelResponse, customerId: string) {
  console.log('✅ Matched customers/programs route:', customerId);
  
  if (req.method === 'GET') {
    // Authentication check
    const user = await verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Authorization check
    if (user.id !== Number(customerId) && user.role !== 'admin' && user.role !== 'business') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      const { requireSql } = await import('../_lib/db.js');
      const sql = requireSql();
      
      // Get customer's enrolled programs
      const programs = await sql`
        SELECT DISTINCT
          lp.id,
          lp.name,
          lp.description,
          lp.business_id,
          lp.points_per_dollar,
          lp.is_active,
          lp.created_at,
          u.name AS business_name,
          u.email AS business_email,
          lc.id AS card_id,
          lc.points,
          lc.points_balance,
          lc.total_points_earned,
          lc.card_number,
          lc.card_type,
          lc.tier,
          lc.status AS card_status,
          lc.created_at AS enrollment_date
        FROM loyalty_programs lp
        JOIN loyalty_cards lc ON lc.program_id = lp.id
        JOIN users u ON u.id = lp.business_id
        WHERE lc.customer_id = ${Number(customerId)}
          AND lc.status = 'ACTIVE'
        ORDER BY lc.created_at DESC
      `;

      return res.status(200).json({ 
        success: true,
        programs,
        customerId: Number(customerId)
      });
    } catch (error) {
      console.error('Error getting customer programs:', error);
      return res.status(500).json({ error: 'Failed to get customer programs' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Handle Notifications endpoints
 */
async function handleNotifications(req: VercelRequest, res: VercelResponse) {
  console.log('✅ Matched notifications route');
  
  if (req.method === 'GET') {
    // Authentication check
    const user = await verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { customerId, businessId, unread, type } = req.query as any;

    // Authorization check
    if (customerId && user.id !== Number(customerId) && user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (businessId && user.id !== Number(businessId) && user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      const { requireSql } = await import('../_lib/db.js');
      const sql = requireSql();
      
      if (customerId) {
        let whereClause = `WHERE customer_id = ${Number(customerId)}`;
        if (unread === 'true') whereClause += ` AND is_read = FALSE`;
        if (type) whereClause += ` AND type = '${type}'`;

        const notifications = await sql.unsafe(`
          SELECT 
            id, customer_id, business_id, type, title, message, data,
            requires_action, action_taken, is_read, priority,
            expires_at, created_at, read_at, action_taken_at
          FROM customer_notifications
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT 50
        `);

        return res.status(200).json({ 
          success: true,
          notifications
        });
      }

      // Return empty response for other cases
      return res.status(200).json({ 
        success: true,
        notifications: []
      });
    } catch (error) {
      console.error('Error getting notifications:', error);
      return res.status(500).json({ error: 'Failed to get notifications' });
    }
  }

  if (req.method === 'POST') {
    // Authentication check
    const user = await verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { 
      customer_id, 
      business_id, 
      type, 
      title, 
      message 
    } = (req.body || {}) as any;

    if (!customer_id || !type || !title) {
      return res.status(400).json({ error: 'customer_id, type, and title are required' });
    }

    // Authorization check
    if (business_id && user.id !== Number(business_id) && user.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot create notifications for other businesses' });
    }

    // Return placeholder response
    return res.status(201).json({ 
      success: true,
      notification: {
        id: Date.now(),
        customer_id,
        business_id,
        type,
        title,
        message,
        created_at: new Date().toISOString()
      }
    });
  }

  if (req.method === 'PUT') {
    // Authentication check
    const user = await verifyAuth(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { notificationId } = req.query as any;
    const { is_read, action_taken } = (req.body || {}) as any;

    if (!notificationId) {
      return res.status(400).json({ error: 'notificationId is required' });
    }

    // Return placeholder response
    return res.status(200).json({ 
      success: true,
      notification: {
        id: notificationId,
        is_read: is_read || false,
        action_taken: action_taken || false,
        updated_at: new Date().toISOString()
      }
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Handle Promotions endpoints
 */
async function handlePromotions(req: VercelRequest, res: VercelResponse) {
  console.log('✅ Matched promotions route');
  
  if (req.method === 'GET') {
    // This is a public route, no auth required
    const { businessId } = req.query;

    try {
      const { requireSql } = await import('../_lib/db.js');
      const sql = requireSql();
      
      let promoCodesResult;
      
      if (businessId) {
        promoCodesResult = await sql`
          SELECT pc.*, u.business_name, u.name as business_name
          FROM promo_codes pc
          JOIN users u ON pc.business_id = u.id
          WHERE pc.business_id = ${parseInt(String(businessId))}
            AND pc.status = 'ACTIVE'
            AND (pc.expires_at IS NULL OR pc.expires_at > NOW())
          ORDER BY pc.created_at DESC
        `;
      } else {
        promoCodesResult = await sql`
          SELECT pc.*, u.business_name, u.name as business_name
          FROM promo_codes pc
          JOIN users u ON pc.business_id = u.id
          WHERE pc.status = 'ACTIVE'
          AND (pc.expires_at IS NULL OR pc.expires_at > NOW())
          AND (pc.max_uses IS NULL OR pc.used_count < pc.max_uses)
          ORDER BY pc.created_at DESC
        `;
      }

      const promotions = promoCodesResult.map((row: any) => ({
        id: String(row.id),
        businessId: String(row.business_id),
        businessName: row.business_name || row.name || 'Unknown Business',
        code: String(row.code),
        type: row.type,
        value: Number(row.value),
        currency: row.currency,
        maxUses: row.max_uses ? Number(row.max_uses) : null,
        usedCount: Number(row.used_count || 0),
        expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
        status: row.status,
        name: String(row.name || ''),
        description: String(row.description || ''),
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      }));

      return res.status(200).json({ 
        success: true,
        promotions,
        businessId: businessId ? Number(businessId) : null
      });
    } catch (error) {
      console.error('Error getting promotions:', error);
      return res.status(500).json({ error: 'Failed to get promotions' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
