/**
 * Customer type definitions
 */

import { EnrollmentErrorCode } from '../utils/enrollmentErrorReporter';

/**
 * Customer notification types
 */
export type CustomerNotificationType = 
  | 'ENROLLMENT' 
  | 'ENROLLMENT_REQUEST' 
  | 'ENROLLMENT_ACCEPTED' 
  | 'ENROLLMENT_REJECTED'
  | 'POINTS_ADDED'
  | 'POINTS_DEDUCTED'
  | 'REWARD_AVAILABLE'
  | 'REWARD_DELIVERED'
  | 'CARD_CREATED'
  | 'PROMO_CODE'
  | 'PROGRAM_DELETED'
  | 'GENERAL';

/**
 * Customer notification interface
 */
export interface CustomerNotification {
  id: string;
  customerId: string;
  businessId: string;
  type: CustomerNotificationType;
  title: string;
  message: string;
  data?: any;
  referenceId?: string;
  requiresAction: boolean;
  actionTaken: boolean;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  expiresAt?: string;
  businessName?: string;
}

/**
 * Response for approval operations
 */
export interface ApprovalResponse {
  success: boolean;
  message?: string;
  error?: string;
  errorCode?: EnrollmentErrorCode;
  errorLocation?: string;
  details?: any;
  cardId?: string;
  status?: string;
}

/**
 * Customer approval request
 */
export interface CustomerApprovalRequest {
  id: string;
  notificationId: string;
  customerId: string;
  businessId: string;
  requestType: string;
  entityId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  data?: any;
  requestedAt: string;
  respondedAt?: string;
  expiresAt?: string;
  businessName?: string;
  customerName?: string;
  programName?: string;
} 