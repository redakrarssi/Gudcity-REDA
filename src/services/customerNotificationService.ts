// Customer Notification Service

import sql from '../utils/db';
import { v4 as uuidv4 } from 'uuid';
import * as serverFunctions from '../server';
import { logger } from '../utils/logger';
import { createNotificationSyncEvent, createEnrollmentSyncEvent } from '../utils/realTimeSync';
import type { CustomerNotification, ApprovalRequest, NotificationPreference, CustomerNotificationType } from '../types/customerNotification';

/**
 * Service for managing customer notifications and approval requests
 */
export class CustomerNotificationService {
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
  }): Promise<CustomerNotification | null> {
    try {
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
          ${parseInt(notification.customerId)},
          ${parseInt(notification.businessId)},
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
        SELECT name FROM users WHERE id = ${parseInt(notification.businessId)}
      `;
      
      const businessName = businessNameResult.length ? businessNameResult[0].name : undefined;
      
      const createdNotification: CustomerNotification = {
        id: result[0].id,
        customerId: result[0].customer_id.toString(),
        businessId: result[0].business_id.toString(),
        type: result[0].type,
        title: result[0].title,
        message: result[0].message,
        data: result[0].data,
        referenceId: result[0].reference_id,
        requiresAction: result[0].requires_action,
        actionTaken: result[0].action_taken,
        isRead: result[0].is_read,
        createdAt: result[0].created_at,
        readAt: result[0].read_at,
        expiresAt: result[0].expires_at,
        businessName
      };
      
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
        WHERE cn.customer_id = ${parseInt(customerId)}
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
          b.name as business_name
        FROM customer_notifications cn
        JOIN users b ON cn.business_id = b.id
        WHERE cn.customer_id = ${parseInt(customerId)} AND cn.is_read = FALSE
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
  static async createApprovalRequest(request: Omit<ApprovalRequest, 'id' | 'requestedAt'>): Promise<ApprovalRequest> {
    try {
      // First create notification
      const notification = await this.createNotification({
        customerId: request.customerId,
        businessId: request.businessId,
        type: request.requestType === 'ENROLLMENT' ? 'ENROLLMENT' : 'POINTS_DEDUCTED',
        title: request.requestType === 'ENROLLMENT' ? 'Program Enrollment Request' : 'Points Deduction Request',
        message: request.data?.message || `A business requested your approval for ${request.requestType.toLowerCase()}`,
        requiresAction: true,
        actionTaken: false,
        isRead: false,
        referenceId: request.entityId,
        data: request.data
      });

      // Then create approval request linked to notification
      const result = await sql`
        INSERT INTO customer_approval_requests (
          notification_id,
          customer_id,
          business_id,
          request_type,
          entity_id,
          status,
          data
        ) VALUES (
          ${notification.id},
          ${parseInt(request.customerId)},
          ${parseInt(request.businessId)},
          ${request.requestType},
          ${request.entityId},
          'PENDING',
          ${request.data ? JSON.stringify(request.data) : null}
        ) RETURNING *
      `;

      return this.mapApprovalRequest(result[0]);
    } catch (error) {
      console.error('Error creating approval request:', error);
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

      // Update the approval request status
      await sql`
        UPDATE customer_approval_requests
        SET status = ${approved ? 'APPROVED' : 'REJECTED'}, updated_at = NOW()
        WHERE id = ${requestId}
      `;

      // If this is an enrollment request, handle the enrollment process
      if (requestType === 'ENROLLMENT') {
        try {
          // For enrollment approvals, delegate to LoyaltyProgramService
          const { LoyaltyProgramService } = await import('./loyaltyProgramService');
          await LoyaltyProgramService.handleEnrollmentApproval(requestId, approved);
        } catch (error) {
          console.error('Error handling enrollment approval:', error);
          // Don't fail the whole process if the enrollment fails
        }
      } else if (requestType === 'POINTS_DEDUCTION' && approved) {
        // Handle points deduction if approved
        // You would implement this part based on your points system
      }

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
 