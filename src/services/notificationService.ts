import type { 
  Notification, 
  NotificationType, 
  NotificationPreferences,
  NotificationStats 
} from '../types/notification';

export class NotificationService {
  private static readonly DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'userId'> = {
    email: true,
    push: true,
    inApp: true,
    types: {
      POINTS_EARNED: true,
      REWARD_AVAILABLE: true,
      CODE_EXPIRING: true,
      PROGRAM_ENROLLED: true,
      NEW_CUSTOMER: true,
      MILESTONE_REACHED: true,
      HIGH_REDEMPTION_RATE: true,
      LOW_ENGAGEMENT_ALERT: true,
      NEW_BUSINESS_APPLICATION: true,
      SYSTEM_ALERT: true,
      SUSPICIOUS_ACTIVITY: true,
      PLATFORM_MILESTONE: true
    }
  };

  // Mock data store for notifications
  private static notifications: Notification[] = [];
  private static preferences: Record<string, NotificationPreferences> = {};

  static async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<{ success: boolean; notification?: Notification; error?: string }> {
    try {
      // Create a notification object
      const notification: Notification = {
        id: Date.now().toString(),
        userId,
        type,
        title,
        message,
        data,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      
      // Store notification in mock data
      this.notifications.push(notification);

      // Get user preferences
      const preferences = await this.getUserPreferences(userId);
      
      // Send notifications based on preferences
      if (preferences.email && preferences.types[type]) {
        await this.sendEmailNotification(userId, title, message);
      }
      
      if (preferences.push && preferences.types[type]) {
        await this.sendPushNotification(userId, title, message);
      }

      return { success: true, notification };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getUserNotifications(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<{ notifications: Notification[]; error?: string }> {
    try {
      // Filter notifications by user ID and sort by creation date
      const userNotifications = this.notifications
        .filter(notification => notification.userId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(offset, offset + limit);

      return { notifications: userNotifications };
    } catch (error) {
      return { 
        notifications: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async getNotificationStats(
    userId: string
  ): Promise<{ stats: NotificationStats; error?: string }> {
    try {
      const userNotifications = this.notifications.filter(
        notification => notification.userId === userId
      );
      
      const unreadCount = userNotifications.filter(
        notification => !notification.isRead
      ).length;
      
      const categoryBreakdown = {} as Record<NotificationType, number>;
      
      userNotifications.forEach(notification => {
        categoryBreakdown[notification.type] = (categoryBreakdown[notification.type] || 0) + 1;
      });
      
      return {
        stats: {
          totalUnread: unreadCount,
          recentNotifications: userNotifications.slice(0, 5),
          categoryBreakdown
        }
      };
    } catch (error) {
      return {
        stats: { 
          totalUnread: 0, 
          recentNotifications: [], 
          categoryBreakdown: {} as Record<NotificationType, number> 
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async markAsRead(
    notificationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const index = this.notifications.findIndex(n => n.id === notificationId);
      if (index !== -1) {
        this.notifications[index].isRead = true;
        return { success: true };
      }
      return { success: false, error: 'Notification not found' };
    } catch (error) {
      return { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async getUserPreferences(
    userId: string
  ): Promise<NotificationPreferences> {
    if (!this.preferences[userId]) {
      // Create default preferences if none exist
      this.preferences[userId] = {
        userId,
        ...this.DEFAULT_PREFERENCES
      };
    }

    return this.preferences[userId];
  }

  static async updatePreferences(
    preferences: NotificationPreferences
  ): Promise<{ success: boolean; error?: string }> {
    try {
      this.preferences[preferences.userId] = preferences;
      return { success: true };
    } catch (error) {
      return { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static async sendEmailNotification(
    userId: string,
    title: string,
    message: string
  ): Promise<void> {
    // Implement email notification using your preferred email service
    // Example: SendGrid, AWS SES, etc.
    console.log('Sending email notification:', { userId, title, message });
  }

  private static async sendPushNotification(
    userId: string,
    title: string,
    message: string
  ): Promise<void> {
    // Implement push notification using your preferred service
    // Example: Firebase Cloud Messaging, OneSignal, etc.
    console.log('Sending push notification:', { userId, title, message });
  }
} 