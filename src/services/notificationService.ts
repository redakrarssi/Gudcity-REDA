import type { 
  Notification, 
  NotificationType,
  NotificationStats 
} from '../types/notification';

// Extended preferences interface to include SMS
export interface NotificationPreferences {
  userId: string;
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  types: {
    [K in NotificationType]: boolean;
  };
}

export class NotificationService {
  private static readonly DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'userId'> = {
    email: true,
    push: true,
    sms: false,
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
  // Store push tokens for devices
  private static pushTokens: Record<string, string[]> = {};

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
        await this.sendEmailNotification(userId, title, message, data);
      }
      
      if (preferences.push && preferences.types[type]) {
        await this.sendPushNotification(userId, title, message);
      }
      
      if (preferences.sms && preferences.types[type]) {
        await this.sendSmsNotification(userId, message);
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

  // Notification methods for transaction confirmations
  static async sendTransactionConfirmation(
    userId: string,
    transactionType: 'EARN' | 'REDEEM',
    points: number,
    businessName: string,
    programName: string,
    rewardName?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let title = '';
      let message = '';
      let notificationType: NotificationType = 'POINTS_EARNED';
      
      if (transactionType === 'EARN') {
        title = `You earned ${points} points!`;
        message = `You've earned ${points} points at ${businessName} for the ${programName} program.`;
        notificationType = 'POINTS_EARNED';
      } else {
        title = `You redeemed a reward!`;
        message = `You've redeemed ${rewardName || 'a reward'} for ${points} points at ${businessName}.`;
        notificationType = 'REWARD_AVAILABLE';
      }
      
      // Create a notification with transaction details
      const data = {
        transactionType,
        points,
        businessName,
        programName,
        rewardName
      };
      
      const result = await this.createNotification(
        userId,
        notificationType,
        title,
        message,
        data
      );
      
      return { 
        success: result.success,
        error: result.error
      };
    } catch (error) {
      return { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Email notification for transactions
  private static async sendEmailNotification(
    userId: string,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    // Implement email notification using your preferred email service
    // Example: SendGrid, AWS SES, etc.
    console.log('Sending email notification:', { userId, title, message, data });
    
    // For transaction confirmations, create a nice email template
    if (data && (data.transactionType === 'EARN' || data.transactionType === 'REDEEM')) {
      const emailTemplate = this.createTransactionEmailTemplate(
        title,
        message,
        data
      );
      
      // In a real implementation, you would send this HTML email
      console.log('Email template:', emailTemplate);
    }
  }

  // SMS notification
  private static async sendSmsNotification(
    userId: string,
    message: string
  ): Promise<void> {
    // Implement SMS notification using your preferred SMS service
    // Example: Twilio, AWS SNS, etc.
    console.log('Sending SMS notification:', { userId, message });
    
    // For SMS, keep the message concise due to character limits
    const smsMessage = message.length > 160 
      ? message.substring(0, 157) + '...' 
      : message;
    
    // In a real implementation, you would send this SMS
    console.log('SMS message:', smsMessage);
  }

  private static async sendPushNotification(
    userId: string,
    title: string,
    message: string
  ): Promise<void> {
    try {
      // Get user's push tokens
      const tokens = this.pushTokens[userId] || [];
      
      if (tokens.length === 0) {
        console.log(`No push tokens found for user ${userId}`);
        return;
      }
      
      // In a real implementation, you would loop through tokens and send to each device
      // using Firebase Cloud Messaging, OneSignal, etc.
      console.log(`Sending push notification to ${tokens.length} devices:`, { userId, title, message });
      
      // For each token, send the notification
      for (const token of tokens) {
        // This would be replaced with actual API calls in production
        console.log(`Sending to token: ${token.substring(0, 10)}...`);
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }
  
  // Create HTML email template for transaction confirmations
  private static createTransactionEmailTemplate(
    title: string,
    message: string,
    data: Record<string, any>
  ): string {
    const isEarnTransaction = data.transactionType === 'EARN';
    const color = isEarnTransaction ? '#34D399' : '#3B82F6';
    const icon = isEarnTransaction ? '⭐' : '🎁';
    const action = isEarnTransaction ? 'earned' : 'redeemed';
    const points = data.points;
    const businessName = data.businessName;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${color}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
          .points { font-size: 24px; font-weight: bold; color: ${color}; }
          .icon { font-size: 48px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">${icon}</div>
            <h1>${title}</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p>${message}</p>
            <p>You have ${action} <span class="points">${points} points</span> at ${businessName}.</p>
            ${isEarnTransaction 
              ? `<p>Keep collecting points to unlock amazing rewards!</p>` 
              : `<p>Thank you for being a loyal customer!</p>`
            }
            <p>Best regards,<br>The GudCity Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} GudCity. All rights reserved.</p>
            <p>You received this email because you have notifications enabled for your account.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Register a push token for a user
   * @param userId User ID
   * @param token Push notification token
   */
  static async registerPushToken(
    userId: string, 
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.pushTokens[userId]) {
        this.pushTokens[userId] = [];
      }
      
      // Check if token already exists
      if (!this.pushTokens[userId].includes(token)) {
        this.pushTokens[userId].push(token);
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Remove a push token for a user
   * @param userId User ID
   * @param token Push notification token to remove
   */
  static async removePushToken(
    userId: string, 
    token: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.pushTokens[userId]) {
        this.pushTokens[userId] = this.pushTokens[userId].filter(t => t !== token);
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send push notification for successful or failed QR code scan
   * 
   * @param userId The user ID to send the notification to
   * @param success Whether the scan was successful
   * @param businessName The name of the business where the scan happened
   * @param points Points earned (if successful)
   * @param details Additional details about the scan
   */
  static async sendScanNotification(
    userId: string,
    success: boolean,
    businessName: string,
    points?: number,
    details?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let title: string;
      let message: string;
      let type: NotificationType;
      
      if (success) {
        type = 'POINTS_EARNED';
        title = `QR Code Scanned Successfully`;
        message = points 
          ? `You earned ${points} points at ${businessName}!` 
          : `Your QR code was successfully scanned at ${businessName}`;
      } else {
        type = 'SYSTEM_ALERT';
        title = `QR Code Scan Failed`;
        message = `There was a problem scanning your QR code at ${businessName}. ${details?.errorMessage || ''}`;
      }
      
      // Create notification in database
      const result = await this.createNotification(
        userId,
        type,
        title,
        message,
        details
      );
      
      return { success: result.success };
    } catch (error) {
      return { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 