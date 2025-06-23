// Customer Notification Service

import sql from '../utils/db';
import type { CustomerNotification, ApprovalRequest, NotificationPreference } from '../types/customerNotification';

/**
 * Service for managing customer notifications and approval requests
 */
export class CustomerNotificationService {
  /**
   * Create a new notification for a customer
   * @param notification The notification data to create
   */
  static async createNotification(notification: Omit<CustomerNotification, 'id' | 'createdAt'>): Promise<CustomerNotification> {
    try {
      const result = await sql`
        INSERT INTO customer_notifications (
          customer_id,
          business_id,
          type,
          title,
          message,
          data,
          reference_id,
          requires_action,
          action_taken,
          is_read
        ) VALUES (
          ${parseInt(notification.customerId)},
          ${parseInt(notification.businessId)},
          ${notification.type},
          ${notification.title},
          ${notification.message},
          ${notification.data ? JSON.stringify(notification.data) : null},
          ${notification.referenceId || null},
          ${notification.requiresAction || false},
          ${notification.actionTaken || false},
          ${notification.isRead || false}
        ) RETURNING *
      `;

      return this.mapNotification(result[0]);
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get all notifications for a customer
   * @param customerId The customer ID
   */
  static async getCustomerNotifications(customerId: string): Promise<CustomerNotification[]> {
    try {
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
      await sql`
        UPDATE customer_notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE id = ${parseInt(notificationId)}
      `;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
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
   * Respond to an approval request
   * @param approvalId The approval request ID
   * @param approved Whether the request was approved
   */
  static async respondToApproval(approvalId: string, approved: boolean): Promise<boolean> {
    try {
      // Update the approval request status
      const result = await sql`
        UPDATE customer_approval_requests
        SET status = ${approved ? 'APPROVED' : 'REJECTED'}, response_at = NOW()
        WHERE id = ${parseInt(approvalId)}
        RETURNING notification_id
      `;

      if (!result.length) return false;
      
      // Update the linked notification
      await sql`
        UPDATE customer_notifications
        SET action_taken = TRUE, requires_action = FALSE
        WHERE id = ${result[0].notification_id}
      `;

      return true;
    } catch (error) {
      console.error('Error responding to approval request:', error);
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
      id: row.id.toString(),
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
      id: row.id.toString(),
      notificationId: row.notification_id.toString(),
      customerId: row.customer_id.toString(),
      businessId: row.business_id.toString(),
      requestType: row.request_type,
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
 