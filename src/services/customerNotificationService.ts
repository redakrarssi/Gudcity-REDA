// Customer Notification Service

import sql from '../utils/db';
import { v4 as uuidv4 } from 'uuid';
import * as serverFunctions from '../server';
import { log as logger } from '../utils/logger';
import { createNotificationSyncEvent, createEnrollmentSyncEvent } from '../utils/realTimeSync';
import type { CustomerNotification, ApprovalRequest, NotificationPreference, CustomerNotificationType } from '../types/customerNotification';
import { normalizeCustomerId, normalizeProgramId, normalizeBusinessId } from '../utils/normalize';

/**
 * Service for managing customer notifications and approval requests
 */
export class CustomerNotificationService {
  
  /**
   * Mark notification as action taken (for business deliveries)
   */
  static async markNotificationAsActionTaken(businessId: string, trackingCode: string): Promise<void> {
    try {
      await sql`
        UPDATE customer_notifications 
        SET action_taken = TRUE, updated_at = NOW()
        WHERE customer_id = ${businessId}
        AND type = 'CUSTOMER_REDEMPTION'
        AND (data::jsonb)->>'trackingCode' = ${trackingCode}
      `;
    } catch (error) {
      console.error('Error marking notification as action taken:', error);
    }
  }
  /**
   * Create a new notification for a customer
   * @param notification The notification data to create
   */
  static async createNotification(notification: {
    customerId: string;
    businessId: string;
    type: string | CustomerNotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
    referenceId?: string;
    requiresAction: boolean;
    actionTaken: boolean;
    isRead: boolean;
    readAt?: string;
    expiresAt?: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH';
    style?: 'default' | 'success' | 'warning' | 'error';
  }): Promise<CustomerNotification | null> {
    try {
      // Normalize IDs to integers first
      const customerIdInt = normalizeCustomerId(notification.customerId);
      const businessIdInt = normalizeBusinessId(notification.businessId);

      // For POINTS_ADDED notifications, check if we already have a recent one from the same business
      if (notification.type === 'POINTS_ADDED' && notification.data?.programId) {
        // Look for notifications from the same business in the last 60 seconds
        const recentNotifications = await this.getRecentPointsNotifications(
          String(customerIdInt),
          String(businessIdInt),
          notification.data.programId.toString(),
          60 // 60 seconds window
        );
        
        if (recentNotifications.length > 0) {
          console.log('Found recent point notification, skipping duplicate');
          return recentNotifications[0]; // Return the existing notification
        }
      }
      
      const notificationId = uuidv4();
      const now = new Date();
      
      const result = await sql`
        INSERT INTO customer_notifications (
          id,
          customer_id,
          business_id,
          type,
          title,
          message,
          data,
          reference_id,
          requires_action,
          action_taken,
          is_read,
          created_at
        ) VALUES (
          ${notificationId},
          ${customerIdInt},
          ${businessIdInt},
          ${notification.type},
          ${notification.title},
          ${notification.message},
          ${notification.data ? JSON.stringify(notification.data) : null},
          ${notification.referenceId || null},
          ${notification.requiresAction},
          ${notification.actionTaken},
          ${notification.isRead},
          ${now.toISOString()}
        ) RETURNING *
      `;
      
      if (!result.length) {
        return null;
      }
      
      // Get business name for better context
      const businessNameResult = await sql`
        SELECT name FROM users WHERE id = ${businessIdInt}
      `;
      
      const businessName = businessNameResult.length ? businessNameResult[0].name : undefined;
      
      const createdNotification = this.mapNotification({
        ...result[0],
        business_name: businessName,
      });
      
      return createdNotification;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }

  /**
   * Get all notifications for a customer
   * @param customerId The customer ID
   */
  static async getCustomerNotifications(customerId: string): Promise<CustomerNotification[]> {
    try {
      // Check if the table exists first
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'customer_notifications'
        );
      `;
      
      if (!tableExists || !tableExists[0] || tableExists[0].exists === false) {
        console.warn('Table customer_notifications does not exist');
        return [];
      }
      
      const results = await sql`
        SELECT 
          cn.*,
          b.name as business_name
        FROM customer_notifications cn
        JOIN users b ON cn.business_id = b.id
        WHERE cn.customer_id = ${normalizeCustomerId(customerId)}
        ORDER BY cn.created_at DESC
      `;

      return results.map(this.mapNotification);
    } catch (error) {
      console.error('Error fetching customer notifications:', error);
      return [];
    }
  }

  /**
   * Get unread notifications for a customer
   * @param customerId The customer ID
   */
  static async getUnreadNotifications(customerId: string): Promise<CustomerNotification[]> {
    try {
      // Check if the table exists first
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'customer_notifications'
        );
      `;
      
      if (!tableExists || !tableExists[0] || tableExists[0].exists === false) {
        console.warn('Table customer_notifications does not exist');
        return [];
      }
      
      const results = await sql`
        SELECT 
          cn.*,
          b.name as business_name,
          COALESCE(lp.name, (cn.data::jsonb)->>'programName') as program_name
        FROM customer_notifications cn
        JOIN users b ON cn.business_id = b.id
        LEFT JOIN loyalty_programs lp ON ((cn.data::jsonb)->>'programId')::int = lp.id
        WHERE cn.customer_id = ${normalizeCustomerId(customerId)} AND cn.is_read = FALSE
        ORDER BY cn.created_at DESC
      `;

      return results.map(this.mapNotification);
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      return [];
    }
  }

  /**
   * Mark a notification as read
   * @param notificationId The notification ID
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const result = await sql`
        UPDATE customer_notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE id = ${notificationId}
        RETURNING id
      `;

      return result.length > 0;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a customer
   * @param customerId The customer ID
   */
  static async markAllAsRead(customerId: string): Promise<boolean> {
    try {
      const result = await sql`
        UPDATE customer_notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE customer_id = ${parseInt(customerId)} AND is_read = FALSE
        RETURNING id
      `;

      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  /**
   * Create a new approval request
   * @param request The approval request data
   */
  static async createApprovalRequest(request: {
    customerId: string;
    businessId: string;
    requestType: 'ENROLLMENT' | 'POINTS_DEDUCTION';
    entityId: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    data?: Record<string, any>;
    expiresAt?: string;
    notificationId?: string;
  }): Promise<ApprovalRequest> {
    try {
      // Generate IDs
      const requestId = uuidv4();
      const now = new Date().toISOString();
      
      // Validate inputs
      if (!request.customerId || !request.businessId || !request.entityId) {
        logger.error('Missing required parameters for approval request');
        throw new Error('Missing required parameters for approval request');
      }
      
      // Parse IDs to ensure they are numbers
      const customerId = parseInt(String(request.customerId));
      const businessId = parseInt(String(request.businessId));
      
      if (isNaN(customerId) || isNaN(businessId)) {
        logger.error('Invalid customer or business ID', { 
          customerId: request.customerId, 
          businessId: request.businessId 
        });
        throw new Error('Invalid customer or business ID');
      }

      // Create notification first if needed
      let notificationId = request.notificationId;
      
      if (!notificationId) {
        // Determine notification type and content based on request type
        let notificationType: CustomerNotificationType;
        let title: string;
        let message: string;
        
        if (request.requestType === 'ENROLLMENT') {
          notificationType = 'ENROLLMENT_REQUEST';
          title = 'Program Enrollment Request';
          message = request.data?.message || 'A business would like to enroll you in their loyalty program';
        } else {
          notificationType = 'POINTS_DEDUCTED';
          title = 'Points Deduction Request';
          message = request.data?.message || 'A business is requesting to deduct points from your account';
        }
        
        // Create the notification
        try {
          const notification = await this.createNotification({
            customerId: String(customerId),
            businessId: String(businessId),
            type: notificationType,
            title,
            message,
            requiresAction: true,
            actionTaken: false,
            isRead: false,
            referenceId: request.entityId,
            data: request.data || {}
          });
          
          if (!notification || !notification.id) {
            throw new Error('Failed to create notification');
          }
          
          notificationId = notification.id;
        } catch (notificationError) {
          logger.error('Error creating notification for approval request', notificationError);
          throw new Error('Failed to create notification for approval request');
        }
      }
      
      // Set expiration date if not provided (default 7 days)
      const expiresAt = request.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      
      // Create the approval request
      try {
        const result = await sql`
          INSERT INTO customer_approval_requests (
            id,
            notification_id,
            customer_id,
            business_id,
            request_type,
            entity_id,
            status,
            data,
            requested_at,
            expires_at
          ) VALUES (
            ${requestId},
            ${notificationId},
            ${customerId},
            ${businessId},
            ${request.requestType},
            ${request.entityId},
            ${'PENDING'},
            ${request.data ? JSON.stringify(request.data) : null},
            ${now},
            ${expiresAt}
          ) RETURNING *
        `;
        
        if (!result || result.length === 0) {
          throw new Error('Failed to insert approval request record');
        }
        
        return this.mapApprovalRequest(result[0]);
      } catch (dbError) {
        logger.error('Database error creating approval request', dbError);
        throw new Error('Failed to create approval request in database');
      }
    } catch (error) {
      logger.error('Error creating approval request:', error);
      throw error;
    }
  }

  /**
   * Get pending approval requests for a customer
   * @param customerId The customer ID
   */
  static async getPendingApprovals(customerId: string): Promise<ApprovalRequest[]> {
    try {
      // Check if the table exists first
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'customer_approval_requests'
        );
      `;
      
      if (!tableExists || !tableExists[0] || tableExists[0].exists === false) {
        console.warn('Table customer_approval_requests does not exist');
        return [];
      }
      
      const results = await sql`
        SELECT 
          ar.*,
          b.name as business_name
        FROM customer_approval_requests ar
        JOIN users b ON ar.business_id = b.id
        WHERE ar.customer_id = ${parseInt(customerId)} 
          AND ar.status = 'PENDING'
          AND ar.expires_at > NOW()
        ORDER BY ar.requested_at DESC
      `;

      return results.map(this.mapApprovalRequest);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return [];
    }
  }

  /**
   * Respond to an approval request (accept or reject)
   * @param requestId The approval request ID
   * @param approved Whether the request was approved
   * @returns Whether the response was successful
   */
  static async respondToApproval(requestId: string, approved: boolean): Promise<boolean> {
    try {
      // Get the approval request details
      const request = await sql`
        SELECT * FROM customer_approval_requests
        WHERE id = ${requestId}
      `;

      if (!request.length) {
        console.error('Approval request not found:', requestId);
        return false;
      }

      const customerId = request[0].customer_id.toString();
      const businessId = request[0].business_id.toString();
      const requestType = request[0].request_type as string;
      const entityId = request[0].entity_id.toString();
      const data = request[0].data as Record<string, any> || {};

      // If this is an enrollment request, use the stored procedure for atomic processing
      if (requestType === 'ENROLLMENT') {
        try {
          const { ensureEnrollmentProcedureExists } = await import('../utils/db');
          await ensureEnrollmentProcedureExists();
          // Look up customer/program from the approval request to call the 3-arg function
          const approvalRow = request[0];
          const customerIdInt = parseInt(String(approvalRow.customer_id));
          const programIdInt = parseInt(String(approvalRow.entity_id));
          console.log('Calling process_enrollment_approval with', customerIdInt, programIdInt, requestId);
          const result = await sql`
            SELECT process_enrollment_approval(${customerIdInt}, ${programIdInt}, ${requestId}::uuid) AS card_id
          `;
          console.log('Enrollment procedure result:', result);
          // Success if the call returned at least one row (card_id may be null only on errors)
          return Array.isArray(result) && result.length > 0;
        } catch (e) {
          logger.error('Stored procedure enrollment handling failed, falling back', e);
          const { LoyaltyProgramService } = await import('./loyaltyProgramService');
          // Fallback: ensure integer-safe IDs for DB writes
          const result = await LoyaltyProgramService.handleEnrollmentApproval(requestId, approved);
          return result.success;
        }
      }

      // Update the approval request status
      await sql`
        UPDATE customer_approval_requests
        SET status = ${approved ? 'APPROVED' : 'REJECTED'}, updated_at = NOW()
        WHERE id = ${requestId}
      `;

      // If this is a points deduction request, handle the points deduction process
      if (requestType === 'POINTS_DEDUCTION' && approved) {
        // Handle points deduction if approved
        // You would implement this part based on your points system
      }
      
      // Note: For enrollment requests, we let the LoyaltyProgramService.handleEnrollmentApproval
      // handle the entire process to avoid duplicate calls

      // Create a notification about the action for both customer and business
      let customerNotificationTitle = '';
      let customerNotificationMessage = '';
      let businessNotificationTitle = '';
      let businessNotificationMessage = '';
      let businessNotificationType = '';

      const programName = (data.programName as string) || 'the program';
      const businessName = (data.businessName as string) || 'the business';
      const points = (data.points as number) || 0;

      if (approved) {
        if (requestType === 'ENROLLMENT') {
          customerNotificationTitle = 'Program Joined';
          customerNotificationMessage = `You've joined ${businessName}'s ${programName} program`;
          
          businessNotificationTitle = 'Customer Joined Program';
          businessNotificationMessage = `A customer has joined your ${programName} program`;
          businessNotificationType = 'ENROLLMENT_ACCEPTED';
        } else {
          customerNotificationTitle = 'Points Deduction Approved';
          customerNotificationMessage = `You've approved the deduction of ${points} points`;
          
          businessNotificationTitle = 'Points Deduction Approved';
          businessNotificationMessage = `Customer approved deduction of ${points} points`;
          businessNotificationType = 'POINTS_DEDUCTION_APPROVED';
        }
      } else {
        if (requestType === 'ENROLLMENT') {
          customerNotificationTitle = 'Program Declined';
          customerNotificationMessage = `You've declined to join ${businessName}'s ${programName} program`;
          
          businessNotificationTitle = 'Enrollment Declined';
          businessNotificationMessage = `A customer has declined to join your ${programName} program`;
          businessNotificationType = 'ENROLLMENT_REJECTED';
        } else {
          customerNotificationTitle = 'Points Deduction Declined';
          customerNotificationMessage = `You've declined the deduction of ${points} points`;
          
          businessNotificationTitle = 'Points Deduction Declined';
          businessNotificationMessage = `Customer declined deduction of ${points} points`;
          businessNotificationType = 'POINTS_DEDUCTION_REJECTED';
        }
      }

      // Create notification for customer
      const customerNotification = await this.createNotification({
        customerId,
        businessId,
        type: approved ? 'ENROLLMENT' : 'ENROLLMENT_REJECTED',
        title: customerNotificationTitle,
        message: customerNotificationMessage,
        requiresAction: false,
        actionTaken: true,
        isRead: false,
        data: {
          programId: entityId,
          programName,
          businessName
        }
      });

      // Create notification for business
      const businessNotification = await this.createNotification({
        customerId: businessId,
        businessId,
        type: businessNotificationType,
        title: businessNotificationTitle,
        message: businessNotificationMessage,
        requiresAction: false,
        actionTaken: false,
        isRead: false,
        data: {
          programId: entityId,
          programName,
          customerId,
          approved
        }
      });

      // Emit real-time notifications
      if (customerNotification) {
        try {
          if (typeof serverFunctions.emitNotification === 'function') {
            serverFunctions.emitNotification(customerId, customerNotification);
          }
          
          // Create notification sync event for customer UI
          createNotificationSyncEvent(
            customerNotification.id,
            customerId,
            businessId,
            'INSERT'
          );
        } catch (error) {
          console.error('Error emitting customer notification:', error);
        }
      }
      
      if (businessNotification) {
        try {
          if (typeof serverFunctions.emitNotification === 'function') {
            serverFunctions.emitNotification(businessId, businessNotification);
          }
          
          // Create notification sync event for business UI
          createNotificationSyncEvent(
            businessNotification.id,
            businessId,
            businessId,
            'INSERT'
          );
          
          // Also create enrollment sync event if this was an enrollment
          if (requestType === 'ENROLLMENT') {
            createEnrollmentSyncEvent(
              customerId,
              businessId,
              entityId,
              approved ? 'INSERT' : 'DELETE'
            );
          }
        } catch (error) {
          console.error('Error emitting business notification:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('Error responding to approval:', error);
      return false;
    }
  }

  /**
   * Get or create notification preferences for a customer
   * @param customerId The customer ID
   */
  static async getNotificationPreferences(customerId: string): Promise<NotificationPreference> {
    try {
      // Check if preferences exist
      const existing = await sql`
        SELECT * FROM customer_notification_preferences
        WHERE customer_id = ${parseInt(customerId)}
      `;

      if (existing.length) {
        return this.mapNotificationPreference(existing[0]);
      }

      // Create default preferences
      const result = await sql`
        INSERT INTO customer_notification_preferences (
          customer_id,
          email,
          push,
          in_app,
          sms,
          enrollment_notifications,
          points_earned_notifications,
          points_deducted_notifications,
          promo_code_notifications,
          reward_available_notifications
        ) VALUES (
          ${parseInt(customerId)},
          TRUE,
          TRUE,
          TRUE,
          FALSE,
          TRUE,
          TRUE,
          TRUE,
          TRUE,
          TRUE
        ) RETURNING *
      `;

      return this.mapNotificationPreference(result[0]);
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return {
        customerId,
        email: true,
        push: true,
        inApp: true,
        sms: false,
        enrollmentNotifications: true,
        pointsEarnedNotifications: true,
        pointsDeductedNotifications: true,
        promoCodeNotifications: true,
        rewardAvailableNotifications: true
      };
    }
  }

  /**
   * Update notification preferences for a customer
   * @param customerId The customer ID
   * @param preferences The updated preferences
   */
  static async updateNotificationPreferences(
    customerId: string,
    preferences: Partial<Omit<NotificationPreference, 'customerId'>>
  ): Promise<NotificationPreference> {
    try {
      const updates = [];
      
      if (preferences.email !== undefined) {
        updates.push(`email = ${preferences.email}`);
      }

      if (preferences.push !== undefined) {
        updates.push(`push = ${preferences.push}`);
      }

      if (preferences.inApp !== undefined) {
        updates.push(`in_app = ${preferences.inApp}`);
      }

      if (preferences.sms !== undefined) {
        updates.push(`sms = ${preferences.sms}`);
      }

      if (preferences.enrollmentNotifications !== undefined) {
        updates.push(`enrollment_notifications = ${preferences.enrollmentNotifications}`);
      }

      if (preferences.pointsEarnedNotifications !== undefined) {
        updates.push(`points_earned_notifications = ${preferences.pointsEarnedNotifications}`);
      }

      if (preferences.pointsDeductedNotifications !== undefined) {
        updates.push(`points_deducted_notifications = ${preferences.pointsDeductedNotifications}`);
      }

      if (preferences.promoCodeNotifications !== undefined) {
        updates.push(`promo_code_notifications = ${preferences.promoCodeNotifications}`);
      }

      if (preferences.rewardAvailableNotifications !== undefined) {
        updates.push(`reward_available_notifications = ${preferences.rewardAvailableNotifications}`);
      }

      if (updates.length === 0) {
        // No fields to update
        return this.getNotificationPreferences(customerId);
      }

      // Use tagged template syntax instead of unsafe
      const updateResult = await sql`
        UPDATE customer_notification_preferences
        SET ${sql(updates.join(', '))}, updated_at = NOW()
        WHERE customer_id = ${parseInt(customerId)}
        RETURNING *
      `;

      return this.mapNotificationPreference(updateResult[0]);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a business, including enrollment responses
   * @param businessId The business ID
   */
  static async getBusinessNotifications(businessId: string): Promise<CustomerNotification[]> {
    try {
      // Check if the table exists first
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'customer_notifications'
        );
      `;
      
      if (!tableExists || !tableExists[0] || tableExists[0].exists === false) {
        console.warn('Table customer_notifications does not exist');
        return [];
      }
      
      // Get notifications where the business is the recipient
      const results = await sql`
        SELECT 
          cn.*,
          u.name as customer_name,
          lp.name as program_name
        FROM customer_notifications cn
        LEFT JOIN users u ON cn.customer_id = u.id
        LEFT JOIN loyalty_programs lp ON 
          ((cn.data::jsonb)->>'programId')::text = lp.id::text OR 
          CASE WHEN cn.reference_id IS NOT NULL THEN cn.reference_id::text = lp.id::text ELSE FALSE END
        WHERE cn.business_id = ${parseInt(businessId)}
        AND (
          cn.type = 'ENROLLMENT_ACCEPTED' OR
          cn.type = 'ENROLLMENT_REJECTED' OR
          cn.type = 'NEW_ENROLLMENT' OR
          cn.type = 'ENROLLMENT_REQUEST'
        )
        ORDER BY cn.created_at DESC
        LIMIT 50
      `;

      return results.map(row => this.mapNotification(row));
    } catch (error) {
      console.error('Error fetching business notifications:', error);
      return [];
    }
  }

  /**
   * Get recent points notifications for a customer from a specific business and program
   * @param customerId The customer ID
   * @param businessId The business ID
   * @param programId The program ID
   * @param secondsWindow Time window in seconds to look back for recent notifications
   */
  static async getRecentPointsNotifications(
    customerId: string,
    businessId: string,
    programId: string,
    secondsWindow: number = 60
  ): Promise<CustomerNotification[]> {
    try {
      // Check if the table exists first
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'customer_notifications'
        );
      `;
      
      if (!tableExists || !tableExists[0] || !tableExists[0].exists) {
        console.warn('Table customer_notifications does not exist');
        return [];
      }
      
      const customerIdInt = parseInt(customerId);
      const businessIdInt = parseInt(businessId);
      const windowTime = new Date(Date.now() - (secondsWindow * 1000)).toISOString();
      
      if (isNaN(customerIdInt) || isNaN(businessIdInt)) {
        console.error('Invalid customer or business ID');
        return [];
      }
      
      const results = await sql`
        SELECT 
          cn.*,
          b.name as business_name
        FROM customer_notifications cn
        JOIN users b ON cn.business_id = b.id
        WHERE cn.customer_id = ${customerIdInt}
        AND cn.business_id = ${businessIdInt}
        AND cn.type = 'POINTS_ADDED'
        AND ((cn.data::jsonb)->>'programId') = ${programId}
        AND cn.created_at > ${windowTime}
        ORDER BY cn.created_at DESC
      `;

      return results.map(this.mapNotification);
    } catch (error) {
      console.error('Error fetching recent points notifications:', error);
      return [];
    }
  }

  // Helper methods to map database results to typed objects
  private static mapNotification(row: any): CustomerNotification {
    return {
      id: row.id,
      customerId: row.customer_id.toString(),
      businessId: row.business_id.toString(),
      type: row.type,
      title: row.title,
      message: row.message,
      data: row.data || {},
      referenceId: row.reference_id,
      requiresAction: row.requires_action,
      actionTaken: row.action_taken,
      isRead: row.is_read,
      createdAt: row.created_at,
      readAt: row.read_at,
      expiresAt: row.expires_at,
      businessName: row.business_name
    };
  }

  private static mapApprovalRequest(row: any): ApprovalRequest {
    return {
      id: row.id,
      notificationId: row.notification_id,
      customerId: row.customer_id.toString(),
      businessId: row.business_id.toString(),
      requestType: row.request_type as ApprovalRequestType,
      entityId: row.entity_id,
      status: row.status,
      data: row.data || {},
      requestedAt: row.requested_at,
      responseAt: row.response_at,
      expiresAt: row.expires_at,
      businessName: row.business_name
    };
  }

  private static mapNotificationPreference(row: any): NotificationPreference {
    return {
      customerId: row.customer_id.toString(),
      email: row.email,
      push: row.push,
      inApp: row.in_app,
      sms: row.sms,
      enrollmentNotifications: row.enrollment_notifications,
      pointsEarnedNotifications: row.points_earned_notifications,
      pointsDeductedNotifications: row.points_deducted_notifications,
      promoCodeNotifications: row.promo_code_notifications,
      rewardAvailableNotifications: row.reward_available_notifications
    };
  }
}
 