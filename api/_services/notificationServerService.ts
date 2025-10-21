import sql from '../_lib/db';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata?: any;
  createdAt: Date;
}

export interface NotificationCreationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: any;
}

/**
 * Server-side service for handling notifications
 * All database operations for notifications
 */
export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(
    params: NotificationCreationParams
  ): Promise<{ success: boolean; notification?: Notification; error?: string }> {
    try {
      const userIdInt = parseInt(params.userId);

      if (isNaN(userIdInt)) {
        return { success: false, error: 'Invalid user ID' };
      }

      const result = await sql`
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          read,
          metadata,
          created_at
        )
        VALUES (
          ${userIdInt},
          ${params.type},
          ${params.title},
          ${params.message},
          false,
          ${params.metadata ? JSON.stringify(params.metadata) : null},
          NOW()
        )
        RETURNING id, user_id, type, title, message, read, metadata, created_at
      `;

      const notification: Notification = {
        id: result[0].id.toString(),
        userId: result[0].user_id.toString(),
        type: result[0].type,
        title: result[0].title,
        message: result[0].message,
        read: result[0].read,
        metadata: result[0].metadata,
        createdAt: result[0].created_at
      };

      return { success: true, notification };
    } catch (error) {
      console.error('Error creating notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(
    userId: string,
    filters?: { unreadOnly?: boolean; limit?: number }
  ): Promise<Notification[]> {
    try {
      const userIdInt = parseInt(userId);
      const limit = filters?.limit || 50;

      let query;
      if (filters?.unreadOnly) {
        query = await sql`
          SELECT 
            id::text,
            user_id::text as "userId",
            type,
            title,
            message,
            read,
            metadata,
            created_at as "createdAt"
          FROM notifications
          WHERE user_id = ${userIdInt}
          AND read = false
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
      } else {
        query = await sql`
          SELECT 
            id::text,
            user_id::text as "userId",
            type,
            title,
            message,
            read,
            metadata,
            created_at as "createdAt"
          FROM notifications
          WHERE user_id = ${userIdInt}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;
      }

      return query as unknown as Notification[];
    } catch (error) {
      console.error('Error getting user notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const notificationIdInt = parseInt(notificationId);

      await sql`
        UPDATE notifications
        SET read = true
        WHERE id = ${notificationIdInt}
      `;

      return { success: true };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const notificationIdInt = parseInt(notificationId);

      await sql`
        DELETE FROM notifications
        WHERE id = ${notificationIdInt}
      `;

      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const userIdInt = parseInt(userId);

      const result = await sql`
        SELECT COUNT(*) as count
        FROM notifications
        WHERE user_id = ${userIdInt}
        AND read = false
      `;

      return parseInt(result[0].count) || 0;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const userIdInt = parseInt(userId);

      await sql`
        UPDATE notifications
        SET read = true
        WHERE user_id = ${userIdInt}
        AND read = false
      `;

      return { success: true };
    } catch (error) {
      console.error('Error marking all as read:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

