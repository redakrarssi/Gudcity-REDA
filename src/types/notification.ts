export type NotificationType = 
  // Customer notifications
  | 'POINTS_EARNED'
  | 'REWARD_AVAILABLE'
  | 'CODE_EXPIRING'
  | 'PROGRAM_ENROLLED'
  | 'PROMO_CODE_RECEIVED'
  // Business notifications
  | 'NEW_CUSTOMER'
  | 'MILESTONE_REACHED'
  | 'HIGH_REDEMPTION_RATE'
  | 'LOW_ENGAGEMENT_ALERT'
  // Admin notifications
  | 'NEW_BUSINESS_APPLICATION'
  | 'SYSTEM_ALERT'
  | 'SUSPICIOUS_ACTIVITY'
  | 'PLATFORM_MILESTONE';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
  types: {
    [K in NotificationType]: boolean;
  };
}

export interface NotificationStats {
  totalUnread: number;
  recentNotifications: Notification[];
  categoryBreakdown: Record<NotificationType, number>;
} 