/**
 * Notifications API Endpoint
 * GET /api/notifications - Get notifications for a user
 * POST /api/notifications - Create a new notification
 * PUT /api/notifications - Update notification status
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, verifyAuth } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // Log request for debugging
  console.log('🔍 [Notifications] Request received:', { 
    method: req.method,
    url: req.url,
    query: req.query
  });

  try {
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

      // Return placeholder response for now
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

      // Return placeholder response for now
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

      // Return placeholder response for now
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
  } catch (error) {
    console.error('[Notifications API] Error:', error);
    return res.status(500).json({ 
      error: 'Server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : 'An unexpected error occurred'
    });
  }
}
