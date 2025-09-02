/**
 * Enrollment Helper Utility
 * 
 * This utility provides safer methods for handling program enrollments
 * and fixes the "Failed to create approval request" error.
 */

import { LoyaltyProgramService } from '../services/loyaltyProgramService';
import { CustomerNotificationService } from '../services/customerNotificationService';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';
import type { CustomerNotificationType } from '../types/customerNotification';

/**
 * Safely create an enrollment request with better error handling
 * 
 * @param customerId The customer ID
 * @param programId The program ID
 * @param businessId The business ID
 * @param businessName The business name
 * @param programName The program name
 * @returns Promise with the result of the enrollment request
 */
export async function safeCreateEnrollmentRequest(
  customerId: string,
  programId: string,
  businessId: string,
  businessName: string,
  programName: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // 1. Create notification first
    const notification = await CustomerNotificationService.createNotification({
      customerId: String(customerId),
      businessId: String(businessId),
      type: 'ENROLLMENT_REQUEST' as CustomerNotificationType,
      title: 'Program Enrollment Request',
      message: `${businessName} would like to enroll you in their ${programName} loyalty program. Would you like to join?`,
      requiresAction: true,
      actionTaken: false,
      isRead: false,
      referenceId: programId,
      data: {
        programId,
        programName,
        businessId,
        businessName
      }
    });
    
    if (!notification || !notification.id) {
      logger.error('Failed to create notification for enrollment request');
      return { success: false, error: 'Failed to create enrollment notification' };
    }
    
    // 2. Create an expiration date 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // 3. Create approval request with proper error handling
    try {
      // Generate a request ID
      const requestId = uuidv4();
      
      // Safely parse IDs to numbers
      const customerIdNum = parseInt(String(customerId));
      const businessIdNum = parseInt(String(businessId));
      
      if (isNaN(customerIdNum) || isNaN(businessIdNum)) {
        throw new Error('Invalid customer or business ID');
      }
      
      // Execute SQL directly to create the approval request
      // This avoids any type issues with the CustomerNotificationService
      const sql = (await import('../utils/db')).default;
      
      const result = await sql`
        INSERT INTO customer_approval_requests (
          id,
          notification_id,
          customer_id,
          business_id,
          request_type,
          entity_id,
          status,
          data,
          requested_at,
          expires_at
        ) VALUES (
          ${requestId},
          ${notification.id},
          ${customerIdNum},
          ${businessIdNum},
          ${'ENROLLMENT'},
          ${programId},
          ${'PENDING'},
          ${JSON.stringify({
            programId,
            programName,
            businessId,
            businessName,
            message: `${businessName} would like to enroll you in their ${programName} loyalty program. Would you like to join?`
          })},
          ${new Date().toISOString()},
          ${expiresAt.toISOString()}
        ) RETURNING *
      `;
      
      if (!result || result.length === 0) {
        throw new Error('Failed to insert approval request record');
      }
      
      // 4. Create notification sync events
      try {
        const { createEnrollmentSyncEvent, createNotificationSyncEvent } = await import('./realTimeSync');
        
        // Create notification sync event for real-time UI updates
        createEnrollmentSyncEvent(customerId, businessId, programId, 'INSERT');
        
        // Create notification sync event
        const notificationData = {
          type: 'ENROLLMENT_REQUEST',
          programName,
          businessId,
          customerId
        };
        createNotificationSyncEvent(requestId, customerId, businessId, 'INSERT', notificationData);
      } catch (syncError) {
        logger.error('Error creating sync events', { error: syncError });
        // Continue execution even if sync fails
      }
      
      // 5. Try to emit real-time notification
      try {
        // Use dynamic import to avoid type errors
        const server = await import('../server');
        
        // Use optional chaining and type casting to safely call the function
        (server as any)?.emitApprovalRequest?.(customerId, result[0]);
      } catch (emitError) {
        logger.error('Error emitting approval notification', { error: emitError });
        // Continue execution even if emit fails
      }
      
      return { 
        success: true, 
        message: 'Enrollment request sent to customer for approval' 
      };
    } catch (approvalError) {
      logger.error('Error creating approval request', { error: approvalError });
      return { success: false, error: 'Failed to create approval request. Please try again.' };
    }
  } catch (error) {
    logger.error('Error in safe enrollment request', { error });
    return { success: false, error: 'Failed to process enrollment request. Please try again.' };
  }
}

/**
 * Safe wrapper for the enrollCustomer method
 * 
 * @param customerId The customer ID
 * @param programId The program ID
 * @param requireApproval Whether to require approval
 * @returns Promise with the result of the enrollment
 */
export async function safeEnrollCustomer(
  customerId: string,
  programId: string,
  requireApproval: boolean = true
): Promise<{ success: boolean; message?: string; error?: string; cardId?: string }> {
  try {
    // If approval is not required, use the standard enrollment method
    if (!requireApproval) {
      return await LoyaltyProgramService.enrollCustomer(customerId, programId, false);
    }
    
    // Get program details to check business ID
    const program = await LoyaltyProgramService.getProgramById(programId);
    if (!program) {
      logger.error('Program not found', { programId });
      return { success: false, error: 'Program not found' };
    }

    const businessId = program.businessId;

    // Get business name for notifications
    const sql = (await import('../utils/db')).default;
    const businessResult = await sql`SELECT name FROM users WHERE id = ${businessId}`;
    const businessName = businessResult.length > 0 ? businessResult[0].name : 'Business';
    
    // Check if already enrolled
    const enrollment = await sql`
      SELECT * FROM program_enrollments
      WHERE customer_id = ${customerId}
      AND program_id = ${programId}
    `;

    if (enrollment.length > 0) {
      // Already enrolled
      const status = enrollment[0].status;
      
      if (status === 'ACTIVE') {
        logger.info('Customer already enrolled in program', { customerId, programId });
        return { success: false, error: 'Customer already enrolled in this program' };
      } else if (status === 'PENDING') {
        logger.info('Enrollment already pending', { customerId, programId });
        return { success: false, error: 'Enrollment request already pending' };
      } else if (status === 'INACTIVE') {
        // Reactivate enrollment
        await sql`
          UPDATE program_enrollments
          SET status = 'ACTIVE', updated_at = NOW()
          WHERE customer_id = ${customerId} AND program_id = ${programId}
        `;
        
        logger.info('Reactivated enrollment', { customerId, programId });
        return { success: true, message: 'Enrollment reactivated' };
      }
    }
    
    // Use our safe method to create the enrollment request
    return await safeCreateEnrollmentRequest(
      customerId,
      programId,
      businessId,
      businessName,
      program.name
    );
  } catch (error) {
    logger.error('Error in safe enrollment', { error });
    return { success: false, error: 'Failed to process enrollment. Please try again.' };
  }
} 