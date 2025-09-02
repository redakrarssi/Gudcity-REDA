/**
 * Fixed CustomerNotificationService implementation
 * This file provides a fixed version of the respondToApproval method
 * to properly handle enrollment approvals without errors
 */

import sql from '../utils/db';
import { v4 as uuidv4 } from 'uuid';
import * as serverFunctions from '../server';
import { log as logger } from '../utils/logger';
import { createNotificationSyncEvent, createEnrollmentSyncEvent, createCardSyncEvent } from '../utils/realTimeSync';
import type { CustomerNotification, ApprovalRequest, NotificationPreference, CustomerNotificationType } from '../types/customerNotification';
import { LoyaltyProgramService } from './loyaltyProgramService';
import { LoyaltyCardService } from './loyaltyCardService';

/**
 * Fixed version of respondToApproval that properly handles enrollment approvals
 * @param requestId The ID of the approval request
 * @param approved Whether the request was approved
 * @returns Promise<boolean> indicating success
 */
export async function fixedRespondToApproval(requestId: string, approved: boolean): Promise<boolean> {
  try {
    logger.info('Processing approval response', { requestId, approved });
    
    // 1. Get the approval request with proper error handling
    let approvalRequest: any;
    try {
      const approvalResult = await sql`
        SELECT * FROM customer_approval_requests 
        WHERE id = ${requestId}
      `;
      
      if (!approvalResult || approvalResult.length === 0) {
        logger.error('Approval request not found', { requestId });
        throw new Error('Approval request not found');
      }
      
      approvalRequest = approvalResult[0];
    } catch (error) {
      logger.error('Error fetching approval request', { error, requestId });
      throw new Error('Failed to fetch approval request');
    }
    
    // 2. Update the approval request status with proper error handling
    try {
      await sql`
        UPDATE customer_approval_requests 
        SET status = ${approved ? 'APPROVED' : 'REJECTED'}, 
            responded_at = NOW() 
        WHERE id = ${requestId}
      `;
    } catch (updateError) {
      logger.error('Error updating approval request status', { error: updateError, requestId });
      throw new Error('Failed to update approval status');
    }
    
    // 3. Get required data for notifications
    const customerId = approvalRequest.customer_id.toString();
    const businessId = approvalRequest.business_id.toString();
    const requestType = approvalRequest.request_type;
    const entityId = approvalRequest.entity_id;
    const notificationId = approvalRequest.notification_id;
    
    // Parse the data JSON safely
    let data = {};
    try {
      data = approvalRequest.data ? JSON.parse(approvalRequest.data) : {};
    } catch (jsonError) {
      logger.warn('Error parsing approval request data', { error: jsonError });
      // Continue with empty data object
    }
    
    // 4. Mark the original notification as actioned
    try {
      if (notificationId) {
        await sql`
          UPDATE customer_notifications 
          SET action_taken = true, 
              is_read = true, 
              read_at = NOW() 
          WHERE id = ${notificationId}
        `;
      }
    } catch (notificationError) {
      logger.warn('Error marking notification as actioned', { error: notificationError });
      // Continue execution even if this fails
    }
    
    // 5. Get additional data for notifications
    const programName = data.programName || 'program';
    const businessName = data.businessName || 'business';
    const points = data.points || 0;
    
    // 6. Determine notification titles and messages
    let customerNotificationTitle: string;
    let customerNotificationMessage: string;
    let businessNotificationTitle: string;
    let businessNotificationMessage: string;
    let businessNotificationType: CustomerNotificationType;
    
    if (approved) {
      if (requestType === 'ENROLLMENT') {
        customerNotificationTitle = 'Program Joined';
        customerNotificationMessage = `You've joined ${businessName}'s ${programName} program`;
        
        businessNotificationTitle = 'Enrollment Accepted';
        businessNotificationMessage = `A customer has joined your ${programName} program`;
        businessNotificationType = 'ENROLLMENT_ACCEPTED';
      } else {
        customerNotificationTitle = 'Points Deduction Approved';
        customerNotificationMessage = `You've approved the deduction of ${points} points`;
        
        businessNotificationTitle = 'Points Deduction Approved';
        businessNotificationMessage = `Customer approved deduction of ${points} points`;
        businessNotificationType = 'POINTS_DEDUCTION_ACCEPTED';
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
    
    // 7. Handle enrollment approval specifically
    let cardId: string | undefined;
    if (approved && requestType === 'ENROLLMENT') {
      try {
        // Use LoyaltyProgramService to handle the enrollment properly
        const enrollmentResult = await LoyaltyProgramService.handleEnrollmentApproval(requestId, true);
        
        if (enrollmentResult.success && enrollmentResult.cardId) {
          cardId = enrollmentResult.cardId;
          logger.info('Enrollment approval processed successfully', { 
            customerId, programId: entityId, cardId 
          });
        } else {
          // If the enrollment handler failed, try a direct approach
          logger.warn('Enrollment handler failed, attempting direct enrollment', {
            result: enrollmentResult
          });
          
          // Ensure enrollment record exists
          const enrollmentExists = await sql`
            SELECT id FROM program_enrollments
            WHERE customer_id = ${customerId}
            AND program_id = ${entityId}
          `;
          
          if (enrollmentExists.length === 0) {
            await sql`
              INSERT INTO program_enrollments (
                customer_id,
                program_id,
                business_id,
                status,
                current_points,
                total_points_earned,
                enrolled_at
              ) VALUES (
                ${customerId},
                ${entityId},
                ${businessId},
                'ACTIVE',
                0,
                0,
                NOW()
              )
            `;
          }
          
          // Ensure card exists by syncing enrollments to cards
          const syncResult = await LoyaltyCardService.syncEnrollmentsToCards(customerId);
          if (syncResult && syncResult.length > 0) {
            cardId = syncResult[0];
          }
        }
      } catch (enrollmentError) {
        logger.error('Error processing enrollment approval', { error: enrollmentError });
        // Continue to create notifications even if enrollment processing fails
      }
    }
    
    // 8. Create notification for customer with proper error handling
    try {
      const customerNotification = await createNotification({
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
          businessName,
          cardId
        }
      });

      // Emit real-time notification for customer
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
        } catch (emitError) {
          logger.error('Error emitting customer notification', { error: emitError });
        }
      }
    } catch (notificationError) {
      logger.error('Error creating customer notification', { error: notificationError });
      // Continue to create business notification even if customer notification fails
    }
    
    // 9. Create notification for business with proper error handling
    try {
      const businessNotification = await createNotification({
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

      // Emit real-time notification for business
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
            
            // Create card sync event if we have a card ID
            if (cardId && approved) {
              createCardSyncEvent(
                cardId,
                customerId,
                businessId,
                'INSERT',
                { programId: entityId, programName }
              );
            }
          }
        } catch (emitError) {
          logger.error('Error emitting business notification', { error: emitError });
        }
      }
    } catch (businessNotifError) {
      logger.error('Error creating business notification', { error: businessNotifError });
      // Continue execution even if business notification fails
    }

    return true;
  } catch (error) {
    logger.error('Error responding to approval', { error });
    return false;
  }
}

/**
 * Helper function to create a notification with proper error handling
 */
async function createNotification(notification: {
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
    logger.error('Error creating notification:', error);
    return null;
  }
}
