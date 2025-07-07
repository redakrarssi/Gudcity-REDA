/**
 * This file contains utility functions for ensuring proper approval request handling 
 * and persistence to prevent notifications reappearing after page refresh.
 */

import sql from '../utils/db';
import { logger } from '../utils/logger';

/**
 * Ensures that an approval request is properly marked as processed in the database
 * This prevents notifications from reappearing after page refresh
 * 
 * @param requestId The ID of the approval request
 * @param status The status to set ('APPROVED' or 'REJECTED')
 */
export async function ensureApprovalRequestProcessed(
  requestId: string,
  status: 'APPROVED' | 'REJECTED'
): Promise<boolean> {
  try {
    // First check if the request still exists and its status
    const checkResult = await sql`
      SELECT id, status FROM customer_approval_requests
      WHERE id = ${requestId}
    `;
    
    // If request doesn't exist or is already processed, we're done
    if (!checkResult.length) {
      logger.info('Approval request not found, already processed', { requestId });
      return true;
    }
    
    if (checkResult[0].status !== 'PENDING') {
      logger.info('Approval request already processed', { requestId, currentStatus: checkResult[0].status });
      return true;
    }
    
    // Update the request status and set response time
    const result = await sql`
      UPDATE customer_approval_requests
      SET 
        status = ${status}, 
        updated_at = NOW(), 
        response_at = NOW()
      WHERE id = ${requestId}
      RETURNING id
    `;
    
    const success = result && result.length > 0;
    
    if (success) {
      logger.info('Successfully updated approval request status', { requestId, status });
      
      // Also update any linked notifications
      await sql`
        UPDATE customer_notifications
        SET action_taken = TRUE, requires_action = FALSE
        WHERE reference_id = ${requestId}
      `;
    } else {
      logger.warn('Failed to update approval request status', { requestId, status });
    }
    
    return success;
  } catch (error) {
    logger.error('Error ensuring approval request processed', { error, requestId });
    return false;
  }
}

/**
 * Cleans up any stale approval requests that might be causing reappearing notifications
 * 
 * @param customerId Customer ID to clean up approvals for
 */
export async function cleanupStaleApprovalRequests(customerId: string): Promise<number> {
  try {
    // Get all pending requests that have actioned notifications
    const staleRequests = await sql`
      SELECT ar.id 
      FROM customer_approval_requests ar
      JOIN customer_notifications cn ON ar.id = cn.reference_id
      WHERE ar.customer_id = ${customerId}
      AND ar.status = 'PENDING'
      AND cn.action_taken = TRUE
    `;
    
    if (!staleRequests.length) {
      return 0;
    }
    
    // Extract request IDs
    const requestIds = staleRequests.map(r => r.id);
    
    // Mark all these requests as processed (using REJECTED is safer as a default)
    const result = await sql`
      UPDATE customer_approval_requests
      SET 
        status = 'REJECTED', 
        updated_at = NOW(), 
        response_at = NOW()
      WHERE id = ANY(${requestIds})
      RETURNING id
    `;
    
    logger.info('Cleaned up stale approval requests', { 
      customerId, 
      count: result.length,
      requestIds
    });
    
    return result.length;
  } catch (error) {
    logger.error('Error cleaning up stale approval requests', { error, customerId });
    return 0;
  }
} 