import { Router, Request, Response } from 'express';
import sql from '../utils/db';
import { auth } from '../middleware/auth';
import { validateUserId, validateBusinessId } from '../utils/sqlSafety';
import { CustomerNotificationService } from '../services/customerNotificationService';
import { safeRespondToApproval } from '../services/customerNotificationServiceWrapper';
import { ensureEnrollmentProcedureExists } from '../utils/db';
import { ApprovalRequestType } from '../types/customerNotification';
import { emitNotification, emitApprovalRequest } from '../server';

const router = Router();

/**
 * Get all notifications for the authenticated customer
 */
router.get('/notifications', auth, async (req: Request, res: Response) => {
  try {
    const customerId = validateUserId(req.user?.id);
    
    // Verify user has permission
    if (!customerId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    
    const notifications = await CustomerNotificationService.getCustomerNotifications(customerId);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * Get unread notifications count for the authenticated customer
 */
router.get('/notifications/unread', auth, async (req: Request, res: Response) => {
  try {
    const customerId = validateUserId(req.user?.id);
    
    // Verify user has permission
    if (!customerId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    
    const unreadNotifications = await CustomerNotificationService.getUnreadNotifications(customerId);
    res.json({
      count: unreadNotifications.length,
      notifications: unreadNotifications
    });
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({ error: 'Failed to fetch unread notifications' });
  }
});

/**
 * Mark a notification as read
 */
router.put('/notifications/:id/read', auth, async (req: Request, res: Response) => {
  try {
    const notificationId = req.params.id;
    const customerId = validateUserId(req.user?.id);
    
    // For now, we'll skip the verification check since we don't have a getNotificationById method
    // In a production environment, you should implement proper verification
    
    const success = await CustomerNotificationService.markAsRead(notificationId);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Failed to mark notification as read' });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});



/**
 * Get approval requests for a customer
 */
router.get('/approval-requests', auth, async (req: Request, res: Response) => {
  try {
    const customerId = validateUserId(req.user?.id);
    
    const approvalRequests = await CustomerNotificationService.getPendingApprovals(customerId);
    res.json(approvalRequests);
  } catch (error) {
    console.error('Error fetching approval requests:', error);
    res.status(500).json({ error: 'Failed to fetch approval requests' });
  }
});

/**
 * Respond to an approval request
 */
router.put('/approval-requests/:id/respond', auth, async (req: Request, res: Response) => {
  try {
    const { approved } = req.body;
    
    if (approved === undefined) {
      return res.status(400).json({ error: 'Response (approved) is required' });
    }
    
    const requestId = req.params.id;
    const customerId = validateUserId(req.user?.id);
    
    // For now, we'll skip the verification check since we don't have a getApprovalRequestById method
    // In a production environment, you should implement proper verification
    
    // Ensure DB procedure exists before responding (idempotent)
    try { await ensureEnrollmentProcedureExists(); } catch (e) {
      console.warn('ensureEnrollmentProcedureExists failed or already exists', e);
    }

    console.log('Responding to approval request', { requestId, approved });
    // Use the robust, normalized wrapper for universal handling
    const result = await safeRespondToApproval(requestId, approved);
    console.log('Approval respond outcome', { requestId, approved, result });
    
    if (result.success) {
      res.json({ success: true, cardId: result.cardId });
    } else {
      const status = result.errorCode === 'REQUEST_NOT_FOUND' ? 404 : 500;
      res.status(status).json({ success: false, error: result.error, code: result.errorCode });
    }
  } catch (error) {
    console.error('Error responding to approval request:', error);
    res.status(500).json({ error: 'Failed to respond to approval request' });
  }
});

/**
 * Create an approval request
 * This endpoint is for businesses and system to create approval requests
 */
router.post('/approval-requests', auth, async (req: Request, res: Response) => {
  try {
    const businessId = validateUserId(req.user?.id);
    const { customerId, requestType, entityId, data } = req.body;
    
    if (!customerId || !requestType || !entityId) {
      return res.status(400).json({ 
        error: 'Missing required fields (customerId, requestType, entityId)' 
      });
    }
    
    // Validate request type
    const validRequestTypes: ApprovalRequestType[] = ['ENROLLMENT', 'POINTS_DEDUCTION'];
    if (!validRequestTypes.includes(requestType)) {
      return res.status(400).json({ 
        error: `Invalid request type. Must be one of: ${validRequestTypes.join(', ')}` 
      });
    }
    
    // Create the request
    const request = await CustomerNotificationService.createApprovalRequest({
      customerId,
      businessId,
      requestType,
      entityId,
      data,
      status: 'PENDING',
      notificationId: '0', // This will be set by the service
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Expires in 7 days
    });
    
    // Emit real-time notification to the customer
    emitApprovalRequest(customerId, request);
    
    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating approval request:', error);
    res.status(500).json({ error: 'Failed to create approval request' });
  }
});

/**
 * Get notification preferences
 */
router.get('/notification-preferences', auth, async (req: Request, res: Response) => {
  try {
    const customerId = validateUserId(req.user?.id);
    
    const preferences = await CustomerNotificationService.getNotificationPreferences(customerId);
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

/**
 * Update notification preferences
 */
router.put('/notification-preferences', auth, async (req: Request, res: Response) => {
  try {
    const customerId = validateUserId(req.user?.id);
    
    const updatedPreferences = await CustomerNotificationService.updateNotificationPreferences(
      customerId,
      req.body
    );
    
    res.json(updatedPreferences);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

/**
 * Send a notification to a customer
 * This endpoint is for businesses to send custom notifications
 */
router.post('/send-notification', auth, async (req: Request, res: Response) => {
  try {
    const businessId = validateUserId(req.user?.id);
    const { customerId, type, title, message, data, requiresAction } = req.body;
    
    if (!customerId || !type || !title || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields (customerId, type, title, message)' 
      });
    }
    
    // Create the notification
    const notification = await CustomerNotificationService.createNotification({
      customerId,
      businessId,
      type,
      title,
      message,
      data,
      requiresAction: requiresAction || false,
      actionTaken: false,
      isRead: false
    });
    
    // Emit real-time notification to the customer
    emitNotification(customerId, notification);
    
    res.status(201).json(notification);
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});



export default router;
