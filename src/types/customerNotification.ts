export type CustomerNotificationType = 
  | 'ENROLLMENT'  // When customer is enrolled in program
  | 'ENROLLMENT_REQUEST'  // When a business requests to enroll customer
  | 'ENROLLMENT_ACCEPTED'  // When a customer accepts an enrollment request
  | 'ENROLLMENT_REJECTED'  // When a customer rejects an enrollment request
  | 'POINTS_ADDED'  // When points are added to customer account
  | 'POINTS_DEDUCTED'  // When points are deducted from customer account
  | 'PROMO_CODE'  // When a promo code is granted to customer
  | 'REWARD_AVAILABLE'  // When customer has enough points for a reward
  | 'REWARD_DELIVERED'  // When business confirms delivery of a redeemed reward
  | 'CARD_EXPIRING'  // When loyalty card is about to expire
  | 'MILESTONE_REACHED'  // When customer reaches a milestone
  | 'PROGRAM_DELETED'  // When a program the customer is enrolled in gets deleted
  | 'QR_SCANNED';  // When customer QR code is scanned

export type ApprovalRequestType = 
  | 'ENROLLMENT'  // Request for customer to join a program
  | 'POINTS_DEDUCTION';  // Request to deduct points from customer

export interface CustomerNotification {
  id: string;
  customerId: string;
  businessId: string;
  type: CustomerNotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  referenceId?: string; // ID of related entity (card_id, program_id, etc.)
  requiresAction: boolean;
  actionTaken: boolean;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
  businessName?: string;
}

export interface ApprovalRequest {
  id: string;
  notificationId: string;
  customerId: string;
  businessId: string;
  requestType: ApprovalRequestType;
  entityId: string; // Related entity ID (card_id, program_id)
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  data?: Record<string, any>; // For storing request details
  requestedAt: string;
  responseAt?: string;
  expiresAt: string;
  businessName?: string;
}

export interface NotificationPreference {
  customerId: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
  sms: boolean;
  enrollmentNotifications: boolean;
  pointsEarnedNotifications: boolean;
  pointsDeductedNotifications: boolean;
  promoCodeNotifications: boolean;
  rewardAvailableNotifications: boolean;
}

export interface NotificationStats {
  total: number;
  unread: number;
  requiresAction: number;
} 