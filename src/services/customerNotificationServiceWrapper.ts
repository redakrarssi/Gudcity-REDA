/**
 * CustomerNotificationService Wrapper
 * 
 * This file provides a wrapper for the CustomerNotificationService's respondToApproval method
 * that uses our new SQL function for better transaction handling.
 */

import sql from '../utils/db';
import { logger } from '../utils/logger';
import { CustomerNotificationService } from './customerNotificationService';
import { LoyaltyCardService } from './loyaltyCardService';
import * as serverFunctions from '../server';
import { createNotificationSyncEvent, createEnrollmentSyncEvent, createCardSyncEvent, createBusinessCustomerSyncEvent } from '../utils/realTimeSync';
import { 
  EnrollmentErrorCode, 
  createDetailedError, 
  reportEnrollmentError,
  formatEnrollmentErrorForUser
} from '../utils/enrollmentErrorReporter';
import { 
  ApprovalResponse, 
  CustomerNotification,
  CustomerNotificationType
} from '../types/customer';
import { ensureEnrollmentProcedureExists } from '../utils/db';

/**
 * Safely respond to an approval request with proper error handling and transaction support
 * Uses a stored procedure for enrollment approvals to ensure atomicity
 */
export async function safeRespondToApproval(requestId: string, approved: boolean): Promise<ApprovalResponse> {
  logger.info('Processing approval response', { requestId, approved });
  
  try {
    // Ensure our stored procedure exists
    await ensureEnrollmentProcedureExists();
    
    // Get the request details first
    const request = await sql`
      SELECT 
        r.id, 
        r.customer_id as "customerId", 
        r.business_id as "businessId", 
        r.entity_id as "entityId", 
        r.request_type as "requestType",
        r.data,
        n.id as "notificationId",
        u1.name as "businessName",
        u2.name as "customerName",
        lp.name as "programName"
      FROM customer_approval_requests r
      LEFT JOIN customer_notifications n ON r.notification_id = n.id
      LEFT JOIN users u1 ON r.business_id = u1.id
      LEFT JOIN users u2 ON r.customer_id = u2.id
      LEFT JOIN loyalty_programs lp ON r.entity_id = lp.id::text
      WHERE r.id = ${requestId}
    `;
    
    if (!request || request.length === 0) {
      const error = createDetailedError(
        EnrollmentErrorCode.REQUEST_NOT_FOUND,
        `Approval request not found: ${requestId}`,
        'request_lookup'
      );
      reportEnrollmentError(error);
      return { 
        success: false, 
        error: formatEnrollmentErrorForUser(error)
      };
    }
    
    const { customerId, businessId, entityId, requestType, programName, businessName, customerName } = request[0];
    
    // Call the stored procedure based on request type
    let cardId: string | undefined;
    
    if (requestType === 'ENROLLMENT') {
      try {
        // Use the stored procedure for enrollment approvals
        const result = await sql`
          SELECT process_enrollment_approval(${requestId}::uuid, ${approved})
        `;
        
        if (result && result[0] && result[0].process_enrollment_approval) {
          cardId = result[0].process_enrollment_approval;
        }
      } catch (dbError: any) {
        const error = createDetailedError(
          EnrollmentErrorCode.TRANSACTION_ERROR,
          `Database transaction error: ${dbError.message || 'Unknown error'}`,
          'multiple enrollment handler'
        );
        reportEnrollmentError(error, { requestId, approved });
        return { 
          success: false, 
          error: formatEnrollmentErrorForUser(error)
        };
      }
    } else {
      // For other request types, use the standard response method
      // This is for future expansion to other approval types
      const success = await CustomerNotificationService.respondToApproval(requestId, approved);
      if (!success) {
        const error = createDetailedError(
          EnrollmentErrorCode.GENERIC_ERROR,
          `Failed to process approval response`,
          'approval_handler'
        );
        reportEnrollmentError(error);
        return { 
          success: false, 
          error: formatEnrollmentErrorForUser(error)
        };
      }
    }
    
    // Create sync events for real-time updates
    try {
      // Generate appropriate titles and messages
      const customerNotificationTitle = approved 
        ? 'Enrollment Accepted' 
        : 'Enrollment Declined';
      const customerNotificationMessage = approved 
        ? `You have been enrolled in ${programName || 'the program'}`
        : `You have declined enrollment in ${programName || 'the program'}`;
        
      const businessNotificationTitle = approved 
        ? 'Customer Joined Program' 
        : 'Enrollment Declined';
      const businessNotificationMessage = approved 
        ? `${customerName || 'A customer'} has joined your ${programName || 'loyalty program'}`
        : `${customerName || 'A customer'} has declined to join your ${programName || 'loyalty program'}`;
      
      // Create sync events for real-time updates
      if (customerId && businessId && entityId) {
        // Create customer relationship sync event to update the business dashboard
        createBusinessCustomerSyncEvent(
          customerId,
          businessId,
          approved ? 'INSERT' : 'DECLINED'
        );
        
        // Create enrollment sync event
        createEnrollmentSyncEvent(
          customerId,
          businessId,
          String(entityId),
          approved ? 'INSERT' : 'DELETE'
        );
        
        // Create card sync event if a card was created
        if (approved && cardId) {
          createCardSyncEvent(
            cardId,
            customerId,
            businessId,
            'INSERT',
            {
              programId: entityId,
              programName: programName || 'Loyalty Program'
            }
          );
        }
      }
    } catch (notificationError) {
      logger.error('Error creating notifications after enrollment approval', { 
        error: notificationError,
        requestId,
        approved
      });
      // Continue execution even if notifications fail
    }
    
    // Return success response with card ID if available
    return {
      success: true,
      message: approved 
        ? 'Successfully enrolled in the program' 
        : 'Successfully declined the program enrollment',
      cardId: cardId ? String(cardId) : undefined
    };
  } catch (error: any) {
    logger.error('Unexpected error in safeRespondToApproval', { error });
    
    const detailedError = createDetailedError(
      EnrollmentErrorCode.GENERIC_ERROR,
      `Unexpected error: ${error.message || 'Unknown error'}`,
      'approval_response'
    );
    reportEnrollmentError(detailedError);
    
    return { 
      success: false, 
      error: formatEnrollmentErrorForUser(detailedError)
    };
  }
} 