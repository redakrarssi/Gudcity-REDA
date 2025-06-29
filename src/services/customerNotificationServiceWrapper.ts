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
import { createNotificationSyncEvent, createEnrollmentSyncEvent, createCardSyncEvent } from '../utils/realTimeSync';

/**
 * Improved version of respondToApproval that uses a SQL transaction
 * @param requestId The ID of the approval request
 * @param approved Whether the request was approved
 * @returns Promise<boolean> indicating success
 */
export async function safeRespondToApproval(requestId: string, approved: boolean): Promise<boolean> {
  logger.info('Processing approval response with safe wrapper', { requestId, approved });
  
  try {
    // 1. Process the approval using our SQL function (in a transaction)
    const result = await sql`SELECT process_enrollment_approval(${requestId}, ${approved})`;
    const success = result[0]?.process_enrollment_approval === true;
    
    if (!success) {
      logger.error('SQL function failed to process enrollment approval', { requestId, approved });
      // Fall back to the original method if SQL function fails
      return await CustomerNotificationService.respondToApproval(requestId, approved);
    }
    
    // 2. Get the approval request details for notifications
    const approvalRequest = await sql`
      SELECT * FROM customer_approval_requests WHERE id = ${requestId}
    `;
    
    if (!approvalRequest.length) {
      logger.error('Approval request not found after processing', { requestId });
      return false;
    }
    
    const request = approvalRequest[0];
    const customerId = request.customer_id.toString();
    const businessId = request.business_id.toString();
    const programId = request.entity_id;
    
    // 3. If approved, ensure the loyalty card was created
    let cardId: string | undefined;
    if (approved && request.request_type === 'ENROLLMENT') {
      try {
        // Check if card exists
        const cardResult = await sql`
          SELECT id FROM loyalty_cards
          WHERE customer_id = ${customerId}
          AND program_id = ${programId}
        `;
        
        if (cardResult.length > 0) {
          cardId = cardResult[0].id;
          logger.info('Found existing loyalty card', { cardId, customerId, programId });
        } else {
          // Create card if not exists by syncing enrollments
          logger.info('No card found, syncing enrollments to cards', { customerId, programId });
          const syncResult = await LoyaltyCardService.syncEnrollmentsToCards(customerId);
          
          if (syncResult && syncResult.length > 0) {
            cardId = syncResult[0];
            logger.info('Created loyalty card through sync', { cardId, customerId, programId });
          } else {
            logger.warn('Failed to create loyalty card through sync', { customerId, programId });
          }
        }
      } catch (cardError) {
        logger.error('Error ensuring loyalty card exists', { error: cardError });
        // Continue execution even if card check fails
      }
    }
    
    // 4. Emit real-time notifications and sync events
    try {
      // Parse the data JSON safely
      let data = {};
      try {
        data = request.data ? JSON.parse(request.data) : {};
      } catch (jsonError) {
        logger.warn('Error parsing approval request data', { error: jsonError });
      }
      
      const programName = data.programName || 'program';
      const businessName = data.businessName || 'business';
      
      // Create notification sync event for real-time UI updates
      if (request.request_type === 'ENROLLMENT') {
        createEnrollmentSyncEvent(
          customerId,
          businessId,
          programId,
          approved ? 'INSERT' : 'DELETE'
        );
        
        // Create card sync event if we have a card ID
        if (cardId && approved) {
          createCardSyncEvent(
            cardId,
            customerId,
            businessId,
            'INSERT',
            { programId, programName }
          );
        }
      }
      
      // Emit notification to customer
      if (typeof serverFunctions.emitNotification === 'function') {
        // Get the notification we just created
        const notificationResult = await sql`
          SELECT * FROM customer_notifications
          WHERE reference_id = ${programId}
          AND customer_id = ${customerId}
          AND action_taken = true
          ORDER BY created_at DESC
          LIMIT 1
        `;
        
        if (notificationResult.length > 0) {
          const notification = notificationResult[0];
          serverFunctions.emitNotification(customerId, notification);
        }
      }
    } catch (emitError) {
      logger.error('Error emitting notifications', { error: emitError });
      // Continue execution even if notification emission fails
    }
    
    return true;
  } catch (error) {
    logger.error('Error in safe respond to approval', { error, requestId, approved });
    
    // Fall back to the original method if our wrapper fails
    try {
      return await CustomerNotificationService.respondToApproval(requestId, approved);
    } catch (fallbackError) {
      logger.error('Fallback to original method also failed', { error: fallbackError });
      return false;
    }
  }
} 