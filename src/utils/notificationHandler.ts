import { CustomerNotificationService } from '../services/customerNotificationService';
import { logger } from './logger';
import { LoyaltyCardService } from '../services/loyaltyCardService';
import { createCardSyncEvent } from './realTimeSync';

/**
 * Handler for customer point notifications
 * This is called after points are successfully awarded to trigger UI notifications
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
      points
    });

    // Create notification in customer notification system
    const notification = await CustomerNotificationService.createNotification({
      customerId,
      businessId,
      type: 'POINTS_ADDED',
      title: 'Points Added',
      message: `You've received ${points} points from ${businessName} in ${programName}`,
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

    // Set localStorage event to trigger UI updates
    if (typeof window !== 'undefined') {
      try {
        // Store in localStorage for persistence across page refreshes
        localStorage.setItem(`points_notification_${Date.now()}`, JSON.stringify({
          type: 'POINTS_ADDED',
          customerId,
          businessId,
          points,
          programName,
          timestamp: new Date().toISOString(),
          notificationId: notification?.id
        }));

        // Dispatch custom event for real-time UI updates
        const event = new CustomEvent('customer-notification', {
          detail: {
            type: 'POINTS_ADDED',
            customerId,
            businessId,
            points,
            programName,
            cardId
          }
        });
        window.dispatchEvent(event);
        
        // Also dispatch the specific points-awarded event
        const pointsEvent = new CustomEvent('points-awarded', {
          detail: {
            customerId,
            businessId,
            programId,
            programName,
            businessName,
            points,
            cardId,
            source
          }
        });
        window.dispatchEvent(pointsEvent);
        
        // Trigger card refresh
        triggerCardRefresh(customerId);
      } catch (storageError) {
        logger.warn('Failed to save notification to localStorage', {
          error: storageError instanceof Error ? storageError.message : 'Unknown error'
        });
      }
    }

    // Ensure card is properly updated and synced
    try {
      // Create sync event for React Query invalidation
      createCardSyncEvent(
        cardId,
        customerId,
        businessId,
        'UPDATE',
        {
          pointsAdded: points,
          programId,
          programName
        }
      );
    } catch (syncError) {
      logger.warn('Failed to create card sync event', {
        error: syncError instanceof Error ? syncError.message : 'Unknown error'
      });
    }

    return !!notification;
  } catch (error) {
    logger.error('Failed to create points notification', {
      error: error instanceof Error ? error.message : 'Unknown error',
      customerId,
      businessId,
      programId
    });
    
    // Even if we fail to create a notification, try a fallback method
    try {
      // Try importing sql directly
      const { default: sql } = await import('../utils/db');
      
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
          ${`You've received ${points} points from ${businessName} in ${programName}`},
          false,
          false,
          false,
          ${new Date().toISOString()}
        )
      `;
      
      logger.info('Created fallback notification successfully');
    } catch (fallbackError) {
      logger.error('Fallback notification creation also failed', {
        error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error'
      });
    }
    return false;
  }
}

/**
 * Fallback method to create a notification
 */
async function createFallbackNotification(
  customerId: string,
  businessId: string,
  points: number,
  programName: string,
  businessName: string
): Promise<void> {
  try {
    // Try importing sql directly
    const { default: sql } = await import('../utils/db');
    
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
        ${`You've received ${points} points from ${businessName} in ${programName}`},
        false,
        false,
        false,
        ${new Date().toISOString()}
      )
    `;
    
    logger.info('Created fallback notification successfully');
  } catch (error) {
    logger.error('Failed to create fallback notification', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
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
      // Invalidate card queries if React Query is available
      if (typeof window.queryClient !== 'undefined' && window.queryClient.invalidateQueries) {
        window.queryClient.invalidateQueries({ queryKey: ['loyaltyCards'] });
        window.queryClient.invalidateQueries({ queryKey: ['customerCards'] });
      }
      
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

// Add a global type declaration for queryClient
declare global {
  interface Window {
    queryClient?: any;
  }
} 