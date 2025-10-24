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

    // Return placeholder response
    return res.status(200).json({ 
      success: true,
      logs: [],
      message: 'Security audit endpoint ready'
    });
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

    // Log the event (placeholder)
    console.log('📝 [Security Audit] Event logged:', {
      userId: user.id,
      event,
      ipAddress: ipAddress || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: userAgent || req.headers['user-agent'],
      metadata
    });

    return res.status(200).json({ success: true });
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

    // Return placeholder response
    return res.status(200).json({ 
      success: true,
      cards: [],
      customerId
    });
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

    // Return placeholder response
    return res.status(200).json({ 
      success: true,
      programs: [],
      customerId
    });
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

    // Return placeholder response
    return res.status(200).json({ 
      success: true,
      notifications: [],
      message: 'Notifications endpoint ready'
    });
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

    // Return placeholder response
    return res.status(200).json({ 
      success: true,
      promotions: [],
      businessId: businessId ? Number(businessId) : null
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
