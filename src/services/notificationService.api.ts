/**
 * Notification Service - API Version
 * 
 * This service replaces direct database connections with secure API calls.
 * All notification operations now go through the serverless API layer.
 * 
 * Migration Status: ✅ COMPLETE
 * Security Level: 🔒 SECURE - No direct DB access
 */

import { notificationApi } from '../utils/enhancedApiClient';
import { logger } from '../utils/logger';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt?: string;
  readAt?: string;
}

/**
 * Service for managing notifications with API integration
 */
export class NotificationService {
  /**
   * Get all notifications for a user
   */
  static async getUserNotifications(
    userId: string,
    params?: {
      type?: string;
      isRead?: boolean;
      page?: number;
      limit?: number;
    }
  ): Promise<Notification[]> {
    try {
      const response = await notificationApi.list({
        userId,
        ...params
      });

      if (!response.success) {
        logger.error('Failed to fetch notifications', { userId, error: response.error });
        return [];
      }

      return response.data || [];
    } catch (error) {
      logger.error('Error fetching notifications', { userId, error });
      return [];
    }
  }

  /**
   * Get a specific notification by ID
   */
  static async getNotificationById(notificationId: string): Promise<Notification | null> {
    try {
      const response = await notificationApi.get(notificationId);

      if (!response.success) {
        logger.error('Failed to fetch notification', { notificationId, error: response.error });
        return null;
      }

      return response.data || null;
    } catch (error) {
      logger.error('Error fetching notification', { notificationId, error });
      return null;
    }
  }

  /**
   * Create a new notification
   */
  static async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  }): Promise<Notification | null> {
    try {
      logger.info('Creating notification', { userId: data.userId, type: data.type });

      const response = await notificationApi.create(data);

      if (!response.success) {
        logger.error('Failed to create notification', { error: response.error });
        return null;
      }

      logger.info('Notification created successfully', { notificationId: response.data?.id });
      return response.data || null;
    } catch (error) {
      logger.error('Error creating notification', { error });
      return null;
    }
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const response = await notificationApi.markAsRead(notificationId);

      if (!response.success) {
        logger.error('Failed to mark notification as read', { notificationId, error: response.error });
        return false;
      }

      logger.info('Notification marked as read', { notificationId });
      return true;
    } catch (error) {
      logger.error('Error marking notification as read', { notificationId, error });
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const response = await notificationApi.markAllAsRead(userId);

      if (!response.success) {
        logger.error('Failed to mark all notifications as read', { userId, error: response.error });
        return false;
      }

      logger.info('All notifications marked as read', { userId });
      return true;
    } catch (error) {
      logger.error('Error marking all notifications as read', { userId, error });
      return false;
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const response = await notificationApi.delete(notificationId);

      if (!response.success) {
        logger.error('Failed to delete notification', { notificationId, error: response.error });
        return false;
      }

      logger.info('Notification deleted', { notificationId });
      return true;
    } catch (error) {
      logger.error('Error deleting notification', { notificationId, error });
      return false;
    }
  }

  /**
   * Dismiss a notification
   */
  static async dismissNotification(notificationId: string): Promise<boolean> {
    try {
      const response = await notificationApi.dismiss(notificationId);

      if (!response.success) {
        logger.error('Failed to dismiss notification', { notificationId, error: response.error });
        return false;
      }

      logger.info('Notification dismissed', { notificationId });
      return true;
    } catch (error) {
      logger.error('Error dismissing notification', { notificationId, error });
      return false;
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const response = await notificationApi.getUnread(userId);

      if (!response.success) {
        logger.error('Failed to get unread count', { userId, error: response.error });
        return 0;
      }

      return response.data?.count || 0;
    } catch (error) {
      logger.error('Error getting unread count', { userId, error });
      return 0;
    }
  }

  /**
   * Get notification preferences
   */
  static async getNotificationPreferences(userId: string): Promise<any | null> {
    try {
      const response = await notificationApi.getPreferences(userId);

      if (!response.success) {
        logger.error('Failed to get notification preferences', { userId, error: response.error });
        return null;
      }

      return response.data || null;
    } catch (error) {
      logger.error('Error getting notification preferences', { userId, error });
      return null;
    }
  }

  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(userId: string, preferences: any): Promise<boolean> {
    try {
      const response = await notificationApi.updatePreferences(userId, preferences);

      if (!response.success) {
        logger.error('Failed to update notification preferences', { userId, error: response.error });
        return false;
      }

      logger.info('Notification preferences updated', { userId });
      return true;
    } catch (error) {
      logger.error('Error updating notification preferences', { userId, error });
      return false;
    }
  }

  /**
   * Send bulk notifications
   */
  static async sendBulkNotifications(data: {
    userIds: string[];
    type: string;
    title: string;
    message: string;
  }): Promise<boolean> {
    try {
      logger.info('Sending bulk notifications', { userCount: data.userIds.length });

      const response = await notificationApi.sendBulk(data);

      if (!response.success) {
        logger.error('Failed to send bulk notifications', { error: response.error });
        return false;
      }

      logger.info('Bulk notifications sent successfully');
      return true;
    } catch (error) {
      logger.error('Error sending bulk notifications', { error });
      return false;
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(userId: string): Promise<any | null> {
    try {
      const response = await notificationApi.getStats(userId);

      if (!response.success) {
        logger.error('Failed to get notification stats', { userId, error: response.error });
        return null;
      }

      return response.data || null;
    } catch (error) {
      logger.error('Error getting notification stats', { userId, error });
      return null;
    }
  }

  /**
   * Perform action on a notification (approve, reject, etc.)
   */
  static async performNotificationAction(
    notificationId: string,
    action: string,
    data?: any
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      logger.info('Performing notification action', { notificationId, action });

      const response = await notificationApi.performAction(notificationId, action, data);

      if (!response.success) {
        logger.error('Failed to perform notification action', { notificationId, action, error: response.error });
        return { success: false, error: response.error || 'Action failed' };
      }

      logger.info('Notification action performed successfully', { notificationId, action });
      return { success: true, result: response.data };
    } catch (error) {
      logger.error('Error performing notification action', { notificationId, action, error });
      return { success: false, error: 'An error occurred while performing action' };
    }
  }

  /**
   * Create a redemption notification for business owners
   */
  static async createRedemptionNotification(data: {
    customerId: string;
    customerName: string;
    businessId: string;
    programId: string;
    programName: string;
    points: number;
    reward: string;
    rewardId: string;
  }): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      const notification = await this.createNotification({
        userId: data.businessId,
        type: 'REWARD_REDEMPTION',
        title: 'New Reward Redemption',
        message: `${data.customerName} redeemed ${data.points} points for ${data.reward}`,
        data: {
          customerId: data.customerId,
          customerName: data.customerName,
          programId: data.programId,
          programName: data.programName,
          points: data.points,
          reward: data.reward,
          rewardId: data.rewardId
        },
        priority: 'HIGH'
      });

      if (!notification) {
        return { success: false, error: 'Failed to create redemption notification' };
      }

      return { success: true, notificationId: notification.id };
    } catch (error) {
      logger.error('Error creating redemption notification', { error });
      return { success: false, error: 'An error occurred while creating redemption notification' };
    }
  }
}

