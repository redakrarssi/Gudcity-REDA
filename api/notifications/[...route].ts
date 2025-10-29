import { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  withCors, 
  withErrorHandler, 
  withAuth,
  withRateLimit,
  sendSuccess, 
  sendError,
  sendCreated,
  sendPaginated,
  getPaginationParams,
  sql,
  sanitizeInput,
  AuthenticatedRequest
} from '../_middleware/index.js';

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  const { route } = req.query;
  const routeArray = Array.isArray(route) ? route : [route];
  
  if (routeArray.length === 0) {
    return handleNotifications(req, res);
  }
  
  if (routeArray.length === 1) {
    const [action] = routeArray;
    return handleNotificationAction(req, res, action as string);
  }
  
  if (routeArray.length === 2) {
    const [id, action] = routeArray;
    return handleNotificationById(req, res, id as string, action as string);
  }
  
  return sendError(res, 'Invalid route', 404);
}

async function handleNotifications(req: AuthenticatedRequest, res: VercelResponse) {
  switch (req.method) {
    case 'GET':
      return await getNotifications(req, res);
    case 'POST':
      return await createNotification(req, res);
    default:
      return sendError(res, 'Method not allowed', 405);
  }
}

async function handleNotificationAction(req: AuthenticatedRequest, res: VercelResponse, action: string) {
  switch (action) {
    case 'mark-all-read':
      return await markAllAsRead(req, res);
    case 'preferences':
      return await getNotificationPreferences(req, res);
    case 'send-bulk':
      return await sendBulkNotification(req, res);
    case 'stats':
      return await getNotificationStats(req, res);
    default:
      return sendError(res, 'Invalid action', 404);
  }
}

async function handleNotificationById(req: AuthenticatedRequest, res: VercelResponse, id: string, action: string) {
  switch (action) {
    case 'read':
      return await markAsRead(req, res, id);
    case 'delete':
      return await deleteNotification(req, res, id);
    case 'action':
      return await performNotificationAction(req, res, id);
    default:
      return sendError(res, 'Invalid action', 404);
  }
}

async function getNotifications(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { customerId, businessId, type, isRead, requiresAction } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    // Filter by customer if specified
    if (customerId) {
      whereClause += ` AND customer_id = $${params.length + 1}`;
      params.push(customerId);
    }
    
    // Filter by business if specified
    if (businessId) {
      whereClause += ` AND business_id = $${params.length + 1}`;
      params.push(businessId);
    }
    
    // Filter by type
    if (type) {
      whereClause += ` AND type = $${params.length + 1}`;
      params.push(type);
    }
    
    // Filter by read status
    if (isRead !== undefined) {
      whereClause += ` AND is_read = $${params.length + 1}`;
      params.push(isRead === 'true');
    }
    
    // Filter by action requirement
    if (requiresAction !== undefined) {
      whereClause += ` AND requires_action = $${params.length + 1}`;
      params.push(requiresAction === 'true');
    }
    
    // Get notifications with business and customer details
    const query = `
      SELECT 
        cn.*,
        c.name as customer_name,
        c.email as customer_email,
        b.name as business_name
      FROM customer_notifications cn
      LEFT JOIN customers c ON cn.customer_id = c.id
      LEFT JOIN businesses b ON cn.business_id = b.id
      ${whereClause}
      ORDER BY cn.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);
    
    const notifications = await sql.query(query, params);
    
    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM customer_notifications cn ${whereClause}`;
    const totalResult = await sql.query(countQuery, params.slice(0, -2));
    const total = parseInt(totalResult[0].total);
    
    return sendPaginated(res, notifications, page, limit, total);
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return sendError(res, 'Failed to fetch notifications', 500);
  }
}

async function createNotification(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const { 
      customerId, businessId, type, title, message, data, 
      requiresAction = false, scheduledFor 
    } = sanitizeInput(req.body);
    
    if (!customerId || !businessId || !type || !title || !message) {
      return sendError(res, 'Customer ID, business ID, type, title, and message are required', 400);
    }
    
    const notifications = await sql`
      INSERT INTO customer_notifications (
        id, customer_id, business_id, type, title, message, data,
        requires_action, is_read, action_taken, scheduled_for, created_at
      )
      VALUES (
        gen_random_uuid(), ${customerId}, ${businessId}, ${type}, ${title}, ${message}, 
        ${JSON.stringify(data || {})}, ${requiresAction}, false, false, 
        ${scheduledFor || null}, NOW()
      )
      RETURNING *
    `;
    
    return sendCreated(res, notifications[0], 'Notification created successfully');
    
  } catch (error) {
    console.error('Error creating notification:', error);
    return sendError(res, 'Failed to create notification', 500);
  }
}

async function markAsRead(req: AuthenticatedRequest, res: VercelResponse, id: string) {
  try {
    const notifications = await sql`
      UPDATE customer_notifications 
      SET is_read = true, read_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    
    if (notifications.length === 0) {
      return sendError(res, 'Notification not found', 404);
    }
    
    return sendSuccess(res, notifications[0], 'Notification marked as read');
    
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return sendError(res, 'Failed to mark notification as read', 500);
  }
}

async function markAllAsRead(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const { customerId, businessId } = sanitizeInput(req.body);
    
    let whereClause = 'is_read = false';
    const params: any[] = [];
    
    if (customerId) {
      whereClause += ` AND customer_id = $${params.length + 1}`;
      params.push(customerId);
    }
    
    if (businessId) {
      whereClause += ` AND business_id = $${params.length + 1}`;
      params.push(businessId);
    }
    
    const query = `
      UPDATE customer_notifications 
      SET is_read = true, read_at = NOW()
      WHERE ${whereClause}
    `;
    
    await sql.query(query, params);
    
    return sendSuccess(res, null, 'All notifications marked as read');
    
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return sendError(res, 'Failed to mark all notifications as read', 500);
  }
}

async function deleteNotification(req: AuthenticatedRequest, res: VercelResponse, id: string) {
  try {
    const notifications = await sql`
      DELETE FROM customer_notifications WHERE id = ${id}
      RETURNING id
    `;
    
    if (notifications.length === 0) {
      return sendError(res, 'Notification not found', 404);
    }
    
    return sendSuccess(res, null, 'Notification deleted successfully');
    
  } catch (error) {
    console.error('Error deleting notification:', error);
    return sendError(res, 'Failed to delete notification', 500);
  }
}

async function performNotificationAction(req: AuthenticatedRequest, res: VercelResponse, id: string) {
  try {
    const { action, actionData } = sanitizeInput(req.body);
    
    if (!action) {
      return sendError(res, 'Action is required', 400);
    }
    
    // Mark notification as action taken
    const notifications = await sql`
      UPDATE customer_notifications 
      SET action_taken = true, is_read = true, read_at = NOW()
      WHERE id = ${id} AND requires_action = true
      RETURNING *
    `;
    
    if (notifications.length === 0) {
      return sendError(res, 'Notification not found or does not require action', 404);
    }
    
    // Here you would implement specific action logic based on notification type
    // For now, just mark as completed
    
    return sendSuccess(res, notifications[0], 'Notification action completed');
    
  } catch (error) {
    console.error('Error performing notification action:', error);
    return sendError(res, 'Failed to perform notification action', 500);
  }
}

async function getNotificationPreferences(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const { customerId } = req.query;
    
    if (!customerId) {
      return sendError(res, 'Customer ID is required', 400);
    }
    
    const customers = await sql`
      SELECT notification_preferences FROM customers WHERE id = ${customerId}
    `;
    
    if (customers.length === 0) {
      return sendError(res, 'Customer not found', 404);
    }
    
    return sendSuccess(res, customers[0].notification_preferences || {});
    
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return sendError(res, 'Failed to fetch notification preferences', 500);
  }
}

async function sendBulkNotification(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const { customerIds, businessId, type, title, message, data } = sanitizeInput(req.body);
    
    if (!customerIds || !Array.isArray(customerIds) || !businessId || !type || !title || !message) {
      return sendError(res, 'Customer IDs array, business ID, type, title, and message are required', 400);
    }
    
    // Create notifications for all customers
    const notifications = [];
    for (const customerId of customerIds) {
      const notification = await sql`
        INSERT INTO customer_notifications (
          id, customer_id, business_id, type, title, message, data,
          requires_action, is_read, action_taken, created_at
        )
        VALUES (
          gen_random_uuid(), ${customerId}, ${businessId}, ${type}, ${title}, ${message}, 
          ${JSON.stringify(data || {})}, false, false, false, NOW()
        )
        RETURNING *
      `;
      notifications.push(notification[0]);
    }
    
    return sendCreated(res, { 
      count: notifications.length, 
      notifications 
    }, 'Bulk notifications created successfully');
    
  } catch (error) {
    console.error('Error sending bulk notification:', error);
    return sendError(res, 'Failed to send bulk notification', 500);
  }
}

async function getNotificationStats(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const { businessId, customerId } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (businessId) {
      whereClause += ` AND business_id = $${params.length + 1}`;
      params.push(businessId);
    }
    
    if (customerId) {
      whereClause += ` AND customer_id = $${params.length + 1}`;
      params.push(customerId);
    }
    
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_read = true THEN 1 ELSE 0 END) as read_count,
        SUM(CASE WHEN requires_action = true THEN 1 ELSE 0 END) as action_required,
        SUM(CASE WHEN requires_action = true AND action_taken = true THEN 1 ELSE 0 END) as actions_taken
      FROM customer_notifications
      ${whereClause}
    `;
    
    const stats = await sql.query(query, params);
    
    return sendSuccess(res, {
      total: parseInt(stats[0].total),
      read: parseInt(stats[0].read_count),
      unread: parseInt(stats[0].total) - parseInt(stats[0].read_count),
      actionRequired: parseInt(stats[0].action_required),
      actionsTaken: parseInt(stats[0].actions_taken)
    });
    
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    return sendError(res, 'Failed to fetch notification stats', 500);
  }
}

export default withCors(
  withErrorHandler(
    withAuth(
      withRateLimit()(handler)
    )
  )
);
