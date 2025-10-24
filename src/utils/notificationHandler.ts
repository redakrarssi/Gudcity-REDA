import { CustomerNotificationService } from '../services/customerNotificationService';
import { logger } from './logger';
import { LoyaltyCardService } from '../services/loyaltyCardService';
import { createCardSyncEvent } from './realTimeSync';
import sql from '../dev-only/db';
import { secureSelect, validateDbInput } from './secureDb';
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
    
    // DISABLED: This was causing 3x multiplication by re-awarding points that were already awarded
    // The card points are already properly updated by awardPointsWithCardCreation
    // await ensureCardPointsUpdated(customerId, businessId, programId, points, cardId);
    
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

    // Resolve display names from DB if incoming names look like IDs or are missing
    let programNameSafe = programName;
    let businessNameSafe = businessName;
    try {
      if (!programNameSafe || /^\d+$/.test(programNameSafe)) {
        // SECURITY: Validate and sanitize programId
        const programIdValidation = validateDbInput(parseInt(programId), 'number');
        if (programIdValidation.isValid) {
          const p = await secureSelect('loyalty_programs', 'name', 'id = $1', [programIdValidation.sanitized], ['number']);
          if (p.length) programNameSafe = p[0].name || 'Loyalty Program';
        }
      }
      if (!businessNameSafe || /^\d+$/.test(businessNameSafe)) {
        // SECURITY: Validate and sanitize businessId
        const businessIdValidation = validateDbInput(parseInt(businessId), 'number');
        if (businessIdValidation.isValid) {
          const b = await secureSelect('users', 'name', 'id = $1', [businessIdValidation.sanitized], ['number']);
          if (b.length) businessNameSafe = b[0].name || 'Business';
        }
      }
    } catch (_) {
      // Non-critical: fall back to provided values
    }

    // Create notification in customer notification system
    const notification = await CustomerNotificationService.createNotification({
      customerId,
      businessId,
      type: 'POINTS_ADDED',
      title: 'Points Added',
      message: `You've received ${points} points from ${businessNameSafe} in the program ${programNameSafe}`,
      data: {
        points,
        cardId,
        programId,
        programName: programNameSafe,
        source,
        timestamp: new Date().toISOString()
      },
      requiresAction: false,
      actionTaken: false,
      isRead: false
    });

    if (notification) {
      // Trigger comprehensive real-time sync events for immediate UI updates
      try {
        if (typeof window !== 'undefined') {
          // Create immediate refresh flag with enhanced data
          const immediateKey = 'IMMEDIATE_CARDS_REFRESH';
          localStorage.setItem(immediateKey, JSON.stringify({
            customerId,
            businessId,
            programId,
            programName,
            cardId,
            points,
            timestamp: Date.now().toString()
          }));
          
          // Create multiple sync points events for redundancy
          const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          localStorage.setItem(`sync_points_${uniqueId}`, JSON.stringify({
            customerId,
            businessId,
            programId,
            programName,
            cardId,
            points,
            timestamp: new Date().toISOString()
          }));
          
          // Force card refresh flag
          localStorage.setItem('force_card_refresh', Date.now().toString());
          
          // Customer-specific refresh flag
          localStorage.setItem(`refresh_cards_${customerId}_${Date.now()}`, 'true');
          
          // Dispatch enhanced custom events for immediate response
          window.dispatchEvent(new CustomEvent('customer-notification', {
            detail: {
              type: 'POINTS_ADDED',
              customerId,
              programId,
              programName,
              points
            }
          }));
          
          window.dispatchEvent(new CustomEvent('refresh-customer-cards', {
            detail: {
              customerId,
              cardId,
              forceRefresh: true,
              timestamp: Date.now()
            }
          }));
          
          window.dispatchEvent(new CustomEvent('points-awarded', {
            detail: {
              customerId,
              businessId,
              programId,
              cardId,
              points,
              programName,
              force: true,
              timestamp: Date.now()
            }
          }));
        }
      } catch (syncError) {
        logger.warn('Failed to create UI notification', { error: syncError });
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
    const startingPoints = cardExists && cardExists.length > 0 ? parseFloat(String(cardExists[0].points) || '0') : 0;
    const expectedFinalPoints = startingPoints + points;
    
    logger.info('Starting points calculation', { 
      startingPoints, 
      pointsToAdd: points, 
      expectedFinalPoints 
    });
    
    // Simple approach: Update or create card with minimal complexity
    if (cardExists && cardExists.length > 0) {
      // Card exists, update it
      await sql`
        UPDATE loyalty_cards
        SET 
          points = ${expectedFinalPoints},
          updated_at = NOW()
        WHERE id = ${cardId}
      `;
      logger.info('Updated loyalty card points', { cardId, points: expectedFinalPoints });
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
    
    // Always ensure program_enrollments is updated
    const enrollmentExists = await sql`
      SELECT * FROM program_enrollments
      WHERE customer_id = ${customerId.toString()}
      AND program_id = ${programId.toString()}
    `;
    
    if (enrollmentExists && enrollmentExists.length > 0) {
      await sql`
        UPDATE program_enrollments
        SET 
          current_points = ${expectedFinalPoints},
          last_activity = NOW()
        WHERE customer_id = ${customerId.toString()}
        AND program_id = ${programId.toString()}
      `;
      logger.info('Updated program enrollment points', { customerId, programId, points: expectedFinalPoints });
    } else {
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
    
    // Create minimal localStorage event for UI update
    if (typeof window !== 'undefined') {
      localStorage.setItem(`points_notification_${Date.now()}`, JSON.stringify({
        customerId,
        businessId,
        programId,
        programName: 'Loyalty Program',
        cardId,
        points,
        timestamp: new Date().toISOString()
      }));
      
      // Dispatch a targeted customer notification event
      const event = new CustomEvent('customer-notification', {
        detail: {
          type: 'POINTS_ADDED',
          customerId,
          programId,
          programName: 'Loyalty Program',
          points
        }
      });
      window.dispatchEvent(event);
    }
    
    logger.info('Successfully updated all points records');
  } catch (error) {
    logger.error('Failed to update card points', { error });
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