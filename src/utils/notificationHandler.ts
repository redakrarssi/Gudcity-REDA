import { CustomerNotificationService } from '../services/customerNotificationService';
import { logger } from './logger';
import { LoyaltyCardService } from '../services/loyaltyCardService';
import { createCardSyncEvent } from './realTimeSync';
import sql from './db';
import crypto from 'crypto';

/**
 * Handler for customer point notifications
 * This is called after points are successfully awarded to trigger UI notifications
 * It consolidates multiple point notifications from the same business/program
 * And ensures points are properly added to the card
 */
export async function handlePointsAwarded(
  customerId: string,
  businessId: string,
  programId: string,
  programName: string,
  businessName: string,
  points: number,
  cardId: string,
  source: string = 'SYSTEM'
): Promise<boolean> {
  try {
    logger.info('Creating points awarded notification', {
      customerId,
      businessId,
      programId,
      points,
      source
    });
    
    // First, ensure the card is properly updated with points
    await ensureCardPointsUpdated(customerId, businessId, programId, points, cardId);
    
    // Check for recent notifications to avoid duplication
    const recentNotifications = await CustomerNotificationService.getRecentPointsNotifications(
      customerId,
      businessId,
      programId,
      60 // Look back 60 seconds
    );

    if (recentNotifications.length > 0) {
      logger.info(`Found ${recentNotifications.length} recent notifications, skipping new notification`);
      return true;
    }

    // Create notification in customer notification system
    const notification = await CustomerNotificationService.createNotification({
      customerId,
      businessId,
      type: 'POINTS_ADDED',
      title: 'Points Added',
      message: `You've received ${points} points from ${businessName} in the program ${programName}`,
      data: {
        points,
        cardId,
        programId,
        programName,
        source,
        timestamp: new Date().toISOString()
      },
      requiresAction: false,
      actionTaken: false,
      isRead: false
    });

    if (notification) {
      // Trigger a real-time sync event for the customer's dashboard
      try {
        await createCardSyncEvent(customerId, cardId, businessId, 'UPDATE', {
          pointsAdded: points,
          programId,
          programName
        });
      } catch (syncError) {
        logger.warn('Failed to create sync event', { error: syncError });
      }
      
      return true;
    }
    
    // Fallback: If notification service fails, create a simplified notification
    await createFallbackNotification(
      customerId, businessId, programId, programName, businessName, points, cardId, source
    );
    
    return true;
  } catch (error) {
    logger.error('Failed to create points awarded notification', { error });
    
    // Try a direct database approach as last resort
    try {
      // Create a simplified notification directly in the database
      await sql`
        INSERT INTO customer_notifications (
          id,
          customer_id,
          business_id,
          type,
          title,
          message,
          requires_action,
          action_taken,
          is_read,
          created_at
        ) VALUES (
          ${crypto.randomUUID()},
          ${parseInt(customerId)},
          ${parseInt(businessId)},
          'POINTS_ADDED',
          'Points Added',
          ${`You've received ${points} points from ${businessName} in the program ${programName}`},
          false,
          false,
          false,
          ${new Date().toISOString()}
        )
      `;
      return true;
    } catch (dbError) {
      logger.error('Final fallback notification creation failed', { error: dbError });
      return false;
    }
  }
}

/**
 * Create a fallback notification when the main notification system fails
 */
async function createFallbackNotification(
  customerId: string,
  businessId: string,
  programId: string,
  programName: string,
  businessName: string,
  points: number,
  cardId: string,
  source: string
): Promise<void> {
  try {
    await sql`
      INSERT INTO customer_notifications (
        id,
        customer_id,
        business_id,
        type,
        title,
        message,
        requires_action,
        action_taken,
        is_read,
        created_at
      ) VALUES (
        ${crypto.randomUUID()},
        ${parseInt(customerId)},
        ${parseInt(businessId)},
        'POINTS_ADDED',
        'Points Added',
        ${`You've received ${points} points from ${businessName} in the program ${programName}`},
        false,
        false,
        false,
        ${new Date().toISOString()}
      )
    `;
  } catch (error) {
    logger.error('Failed to create fallback notification', { error });
  }
}

/**
 * Ensures that both the loyalty_cards and program_enrollments tables are updated with points
 */
async function ensureCardPointsUpdated(
  customerId: string,
  businessId: string,
  programId: string,
  points: number,
  cardId: string
): Promise<void> {
  try {
    logger.info('Ensuring card points are updated', { customerId, businessId, programId, points, cardId });
    
    // Get initial card state
    const cardExists = await sql`
      SELECT id, points FROM loyalty_cards 
      WHERE id = ${cardId}
    `;
    
    let cardIdToUse: string = cardId;
    const startingPoints = cardExists && cardExists.length > 0 ? parseFloat(cardExists[0].points || '0') : 0;
    const expectedFinalPoints = startingPoints + points;
    
    logger.info('Starting points calculation', { 
      startingPoints, 
      pointsToAdd: points, 
      expectedFinalPoints 
    });
    
    // 1. First attempt - Update or create card
    if (cardExists && cardExists.length > 0) {
      // Card exists, update it
      await sql`
        UPDATE loyalty_cards
        SET 
          points = ${expectedFinalPoints},
          updated_at = NOW()
        WHERE id = ${cardId}
      `;
      logger.info('Updated loyalty card points directly', { cardId, currentPoints: expectedFinalPoints });
    } else {
      // Get the next available ID if cardId is not provided or doesn't exist
      if (!cardId) {
        const maxIdResult = await sql`
          SELECT MAX(id) + 1 AS next_id FROM loyalty_cards
        `;
        cardIdToUse = maxIdResult[0].next_id?.toString() || '1';
      }
      
      // Create a new card
      await sql`
        INSERT INTO loyalty_cards (
          id,
          customer_id,
          business_id,
          program_id,
          card_type,
          points,
          created_at,
          updated_at,
          is_active,
          status,
          tier
        ) VALUES (
          ${cardIdToUse},
          ${parseInt(customerId)},
          ${parseInt(businessId)},
          ${parseInt(programId)},
          'STANDARD',
          ${points},
          NOW(),
          NOW(),
          true,
          'active',
          'STANDARD'
        )
      `;
      logger.info('Created new loyalty card with points', { cardId: cardIdToUse, points });
    }
    
    // 2. Update program_enrollments table
    const enrollmentExists = await sql`
      SELECT * FROM program_enrollments
      WHERE customer_id = ${customerId.toString()}
      AND program_id = ${programId.toString()}
    `;
    
    if (enrollmentExists && enrollmentExists.length > 0) {
      // Update existing enrollment with direct value
      await sql`
        UPDATE program_enrollments
        SET 
          current_points = ${expectedFinalPoints},
          last_activity = NOW()
        WHERE customer_id = ${customerId.toString()}
        AND program_id = ${programId.toString()}
      `;
      logger.info('Updated program enrollment points directly', { customerId, programId, points: expectedFinalPoints });
    } else {
      // Create new enrollment
      await sql`
        INSERT INTO program_enrollments (
          customer_id,
          program_id,
          current_points,
          status,
          enrolled_at,
          last_activity
        ) VALUES (
          ${customerId.toString()},
          ${programId.toString()},
          ${points},
          'ACTIVE',
          NOW(),
          NOW()
        )
      `;
      logger.info('Created new program enrollment with points', { customerId, programId, points });
    }
    
    // 3. Also update customer_programs if it's a separate table and not a view
    try {
      const customerProgramsTable = await sql`
        SELECT table_type
        FROM information_schema.tables
        WHERE table_name = 'customer_programs'
      `;
      
      if (customerProgramsTable && customerProgramsTable.length > 0 && 
          customerProgramsTable[0].table_type === 'BASE TABLE') {
        const customerProgramExists = await sql`
          SELECT * FROM customer_programs
          WHERE customer_id = ${customerId}
          AND program_id = ${programId}
        `;
        
        if (customerProgramExists && customerProgramExists.length > 0) {
          // Update existing record with direct value
          await sql`
            UPDATE customer_programs
            SET 
              current_points = ${expectedFinalPoints},
              updated_at = NOW()
            WHERE customer_id = ${customerId}
            AND program_id = ${programId}
          `;
        } else {
          // Create new record
          await sql`
            INSERT INTO customer_programs (
              customer_id,
              program_id,
              current_points,
              enrolled_at
            ) VALUES (
              ${customerId},
              ${programId},
              ${points},
              NOW()
            )
          `;
        }
        logger.info('Updated customer_programs table', { customerId, programId, points });
      }
    } catch (customerProgramsError) {
      // This might fail if customer_programs is a view or doesn't exist, which is fine
      logger.debug('Skipping customer_programs update', { error: customerProgramsError });
    }
    
    // 4. Verification - Check if points were correctly updated
    const verifyCard = await sql`
      SELECT points FROM loyalty_cards 
      WHERE id = ${cardIdToUse}
    `;
    
    // If verification fails, try again with a more direct approach
    if (!verifyCard || verifyCard.length === 0 || 
        Math.abs(parseFloat(verifyCard[0].points || '0') - expectedFinalPoints) > 0.01) {
      logger.warn('Card points verification failed. Retrying with direct update...', {
        expected: expectedFinalPoints,
        actual: verifyCard && verifyCard.length > 0 ? parseFloat(verifyCard[0].points || '0') : 'No card found'
      });
      
      // Final attempt - Direct updates without transaction
      try {
        // Try to update the card
        await sql`
          UPDATE loyalty_cards
          SET 
            points = ${expectedFinalPoints},
            updated_at = NOW()
          WHERE id = ${cardIdToUse}
        `;
        
        // Try to update the enrollment
        await sql`
          UPDATE program_enrollments
          SET 
            current_points = ${expectedFinalPoints},
            last_activity = NOW()
          WHERE customer_id = ${customerId.toString()}
          AND program_id = ${programId.toString()}
        `;
        
        logger.info('Forced direct update of card points', { 
          cardId: cardIdToUse, 
          points: expectedFinalPoints 
        });
      } catch (updateError) {
        logger.error('Direct update failed for card points', { error: updateError });
      }
    }
    
    // 5. Final verification - Get the actual points from the card
    const finalVerify = await sql`
      SELECT points FROM loyalty_cards 
      WHERE id = ${cardIdToUse}
    `;
    
    const actualFinalPoints = finalVerify && finalVerify.length > 0 
      ? parseFloat(finalVerify[0].points || '0') 
      : null;
    
    logger.info('Final points verification', { 
      expected: expectedFinalPoints, 
      actual: actualFinalPoints,
      success: actualFinalPoints !== null && Math.abs((actualFinalPoints || 0) - expectedFinalPoints) <= 0.01
    });
    
    // 6. Create sync event to ensure UI updates
    try {
      // Get timestamp as string for event data
      const timestampStr = new Date().toISOString();
      const currentTime = Date.now();
      const timeStr = currentTime.toString();
      
      createCardSyncEvent(
        cardIdToUse, 
        customerId, 
        businessId, 
        'UPDATE',
        {
          pointsAdded: points,
          programId: programId.toString(),
          programName: 'Loyalty Program', // Default name
          timestamp: timestampStr  // Add timestamp for cache-busting
        }
      );
      
      // Set multiple localStorage flags for UI refresh
      if (typeof window !== 'undefined') {
        const refreshKey = `refresh_cards_${customerId}_${timeStr}`;
        localStorage.setItem(refreshKey, 'true');
        
        // Set a direct force_card_refresh flag to bust any caching
        localStorage.setItem('force_card_refresh', timeStr);
        
        // Create a sync points event
        localStorage.setItem(`sync_points_${timeStr}`, JSON.stringify({
          customerId: customerId,
          businessId: businessId,
          programId: programId.toString(),
          cardId: cardIdToUse,
          points: points,
          timestamp: timestampStr
        }));
        
        // Create a custom event to force UI refresh
        const refreshEvent = new CustomEvent('refresh-customer-cards', {
          detail: { 
            timestamp: currentTime,
            customerId,
            cardId: cardIdToUse,
            forceRefresh: true
          }
        });
        window.dispatchEvent(refreshEvent);
        
        // Also dispatch a points-awarded event
        const pointsEvent = new CustomEvent('points-awarded', {
          detail: {
            timestamp: currentTime,
            customerId,
            businessId,
            programId,
            cardId: cardIdToUse,
            points,
            force: true
          }
        });
        window.dispatchEvent(pointsEvent);
      }
    } catch (syncError) {
      logger.warn('Failed to create sync events', { error: syncError });
    }
    
    logger.info('Successfully completed points update process');
  } catch (error) {
    logger.error('Failed to update card points', { error });
    // Continue execution even if this fails - the original points might have been updated already
  }
}

/**
 * Handler for reward redemption notifications
 * This is called when a customer redeems a reward to notify the business
 */
export async function handleRewardRedeemed(
  customerId: string,
  businessId: string,
  programId: string,
  programName: string,
  cardId: string,
  customerName: string,
  rewardName: string,
  points: number
): Promise<boolean> {
  try {
    const redemptionId = `redemption-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    logger.info('Creating reward redemption notification', {
      customerId,
      businessId,
      programId,
      rewardName
    });

    // 1. Notify the customer about successful redemption
    const customerNotification = await CustomerNotificationService.createNotification({
      customerId,
      businessId,
      type: 'REWARD_REDEEMED',
      title: 'Reward Redeemed',
      message: `You successfully redeemed your reward: ${rewardName}`,
      data: {
        rewardName,
        points,
        cardId,
        programId,
        programName,
        redemptionId,
        timestamp: new Date().toISOString()
      },
      requiresAction: false,
      actionTaken: true,
      isRead: false
    });

    // 2. Notify the business owner about the redemption that needs fulfillment
    const businessNotification = await CustomerNotificationService.createNotification({
      customerId: businessId, // Business receives this notification
      businessId,
      type: 'BUSINESS_REWARD_REDEMPTION',
      title: 'Reward Redemption',
      message: `Customer ${customerName} has redeemed a ${rewardName}. Please fulfill the reward.`,
      data: {
        rewardName,
        points,
        cardId,
        programId,
        programName,
        customerId,
        customerName,
        redemptionId,
        timestamp: new Date().toISOString()
      },
      requiresAction: true,
      actionTaken: false,
      isRead: false
    });

    // 3. Set localStorage and dispatch events for real-time UI updates
    if (typeof window !== 'undefined') {
      try {
        // For customer UI
        localStorage.setItem(`reward_redemption_${Date.now()}`, JSON.stringify({
          type: 'REWARD_REDEEMED',
          customerId,
          businessId,
          rewardName,
          points,
          programName,
          timestamp: new Date().toISOString()
        }));

        // Dispatch custom event
        const event = new CustomEvent('reward-redemption', {
          detail: {
            type: 'REWARD_REDEEMED',
            customerId,
            businessId,
            rewardName,
            customerName,
            points,
            cardId,
            programId,
            programName
          }
        });
        window.dispatchEvent(event);
        
        // Trigger card refresh for the customer
        triggerCardRefresh(customerId);
      } catch (storageError) {
        logger.warn('Failed to save redemption event to localStorage', {
          error: storageError instanceof Error ? storageError.message : 'Unknown error'
        });
      }
    }

    return !!(customerNotification && businessNotification);
  } catch (error) {
    logger.error('Failed to create reward redemption notifications', {
      error: error instanceof Error ? error.message : 'Unknown error',
      customerId,
      businessId,
      programId
    });
    return false;
  }
}

/**
 * Trigger a refresh of the customer's cards
 * This will force React Query to refetch card data
 */
export function triggerCardRefresh(customerId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const storageKey = `cards_update_${customerId}`;
    localStorage.setItem(storageKey, Date.now().toString());
    
    // Clean up after 5 seconds to avoid storage quota issues
    setTimeout(() => {
      try {
        localStorage.removeItem(storageKey);
      } catch (_) {
        // Ignore errors during cleanup
      }
    }, 5000);
  } catch (error) {
    logger.warn('Failed to trigger card refresh', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Register event listeners for real-time notifications
 * Call this function in app initialization to set up notification handling
 */
export function registerNotificationListeners(): void {
  if (typeof window === 'undefined') return;
  
  // Handle points awarded event
  window.addEventListener('points-awarded', (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (!detail) return;
    
    const { 
      customerId, businessId, programId, programName, 
      businessName, points, cardId, source = 'EVENT' 
    } = detail;
    
    if (customerId && businessId && programId && points) {
      handlePointsAwarded(
        customerId, 
        businessId, 
        programId, 
        programName || 'Loyalty Program',
        businessName || 'Business',
        points,
        cardId || 'unknown',
        source
      ).catch(error => {
        logger.error('Error handling points awarded event', { error });
      });
    }
  });
  
  // Handle reward redemption event
  window.addEventListener('reward-redeemed', (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (!detail) return;
    
    const { 
      customerId, businessId, programId, programName,
      cardId, customerName, rewardName, points 
    } = detail;
    
    if (customerId && businessId && programId && rewardName) {
      handleRewardRedeemed(
        customerId,
        businessId,
        programId,
        programName || 'Loyalty Program',
        cardId || 'unknown',
        customerName || 'Customer',
        rewardName,
        points || 0
      ).catch(error => {
        logger.error('Error handling reward redeemed event', { error });
      });
    }
  });
  
  // Listen for storage events to detect changes across tabs
  window.addEventListener('storage', (event) => {
    // Check for card refresh events
    if (event.key?.startsWith('refresh_cards_') || event.key === 'force_card_refresh') {
      // Dispatch refresh event
      const refreshEvent = new CustomEvent('refresh-customer-cards', {
        detail: { timestamp: Date.now() }
      });
      window.dispatchEvent(refreshEvent);
    }
    
    // Check for point notification events
    if (event.key?.startsWith('points_notification_') && event.newValue) {
      try {
        const data = JSON.parse(event.newValue);
        const pointsEvent = new CustomEvent('customer-notification', {
          detail: {
            type: 'POINTS_ADDED',
            ...data
          }
        });
        window.dispatchEvent(pointsEvent);
      } catch (error) {
        logger.warn('Error parsing points notification from storage event', { error });
      }
    }
  });
} 