import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireSql } from '../_lib/db.js';
import { verifyAuth, cors, rateLimitFactory } from '../_lib/auth.js';

const allow = rateLimitFactory(120, 60_000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, (req.headers.origin as string) || undefined);
  if (req.method === 'OPTIONS') return res.status(200).end();
  
  const rlKey = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'ip';
  if (!allow(rlKey)) return res.status(429).json({ error: 'Too many requests' });

  const user = await verifyAuth(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const sql = requireSql();

  try {
    const { customerId, businessId, type, unread } = req.query;

    if (req.method === 'GET') {
      // Get notifications for customer or business
      if (customerId) {
        // Verify access to customer notifications
        if (user.role !== 'admin' && user.id !== parseInt(String(customerId))) {
          return res.status(403).json({ error: 'Access denied' });
        }

        let whereClause = `WHERE customer_id = ${parseInt(String(customerId))}`;
        if (unread === 'true') {
          whereClause += ` AND is_read = FALSE`;
        }
        if (type) {
          whereClause += ` AND type = '${type}'`;
        }

        const notifications = await sql`
          SELECT 
            id, customer_id, business_id, type, title, message, data,
            requires_action, action_taken, is_read, priority,
            expires_at, created_at, read_at, action_taken_at
          FROM customer_notifications
          ${sql.raw(whereClause)}
          ORDER BY created_at DESC
          LIMIT 50
        `;

        return res.status(200).json({ notifications });
      }

      if (businessId) {
        // Get notifications for business (like enrollment responses)
        if (user.role !== 'admin' && user.id !== parseInt(String(businessId))) {
          return res.status(403).json({ error: 'Access denied' });
        }

        const notifications = await sql`
          SELECT 
            cn.*, u.name as customer_name, u.email as customer_email
          FROM customer_notifications cn
          LEFT JOIN users u ON cn.customer_id = u.id
          WHERE cn.business_id = ${parseInt(String(businessId))}
            AND cn.type IN ('ENROLLMENT_ACCEPTED', 'ENROLLMENT_REJECTED', 'REDEMPTION_REQUEST')
          ORDER BY cn.created_at DESC
          LIMIT 50
        `;

        return res.status(200).json({ notifications });
      }

      // Get all notifications for admin
      if (user.role === 'admin') {
        const notifications = await sql`
          SELECT 
            cn.*, u.name as customer_name, b.name as business_name
          FROM customer_notifications cn
          LEFT JOIN users u ON cn.customer_id = u.id
          LEFT JOIN users b ON cn.business_id = b.id
          ORDER BY cn.created_at DESC
          LIMIT 100
        `;

        return res.status(200).json({ notifications });
      }

      return res.status(400).json({ error: 'customerId or businessId required' });
    }

    if (req.method === 'POST') {
      // Create new notification
      const { 
        customer_id, 
        business_id, 
        type, 
        title, 
        message, 
        data,
        requires_action = false,
        priority = 'NORMAL',
        expires_at 
      } = req.body;

      if (!customer_id || !type || !title) {
        return res.status(400).json({ error: 'customer_id, type, and title are required' });
      }

      // Verify permission to create notifications
      if (user.role !== 'admin' && business_id && user.id !== parseInt(business_id)) {
        return res.status(403).json({ error: 'Cannot create notifications for other businesses' });
      }

      const notification = await sql`
        INSERT INTO customer_notifications (
          customer_id, business_id, type, title, message, data,
          requires_action, priority, expires_at, created_at
        ) VALUES (
          ${parseInt(customer_id)}, ${business_id ? parseInt(business_id) : null}, 
          ${type}, ${title}, ${message || ''}, ${JSON.stringify(data || {})},
          ${requires_action}, ${priority}, ${expires_at ? new Date(expires_at) : null}, NOW()
        )
        RETURNING *
      `;

      return res.status(201).json({ notification: notification[0] });
    }

    if (req.method === 'PUT') {
      // Update notification (mark as read, take action, etc.)
      const { notificationId } = req.query;
      const { is_read, action_taken, action_data } = req.body;

      if (!notificationId) {
        return res.status(400).json({ error: 'notificationId is required' });
      }

      // Get notification to verify access
      const existingNotification = await sql`
        SELECT * FROM customer_notifications 
        WHERE id = ${notificationId}
      `;

      if (existingNotification.length === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      const notification = existingNotification[0];

      // Verify permission to update
      if (user.role !== 'admin' && 
          user.id !== notification.customer_id && 
          user.id !== notification.business_id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updated = await sql`
        UPDATE customer_notifications
        SET 
          is_read = COALESCE(${is_read}, is_read),
          action_taken = COALESCE(${action_taken}, action_taken),
          read_at = CASE WHEN ${is_read} THEN NOW() ELSE read_at END,
          action_taken_at = CASE WHEN ${action_taken} THEN NOW() ELSE action_taken_at END,
          data = CASE WHEN ${action_data} IS NOT NULL THEN 
                   COALESCE(data, '{}'::jsonb) || ${JSON.stringify(action_data || {})}::jsonb
                 ELSE data END
        WHERE id = ${notificationId}
        RETURNING *
      `;

      return res.status(200).json({ notification: updated[0] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Notifications API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
