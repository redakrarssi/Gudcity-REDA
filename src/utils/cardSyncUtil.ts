/**
 * Card Sync Utility
 * 
 * This utility provides functions to ensure loyalty cards are properly synced
 * between the server and client, especially for points updates.
 */

import { LoyaltyCardService } from '../services/loyaltyCardService';
import { createCardSyncEvent } from './realTimeSync';
import { queryClient } from './queryClient';

/**
 * Force refresh a customer's loyalty cards
 * @param customerId The customer ID
 */
export const forceRefreshCards = async (customerId: string): Promise<void> => {
  if (!customerId) return;
  
  try {
    // Invalidate React Query cache for this customer's cards
    queryClient.invalidateQueries({ queryKey: ['loyaltyCards', customerId] });
    
    // Create a sync event
    const event = new CustomEvent('refresh-customer-cards', {
      detail: { customerId }
    });
    window.dispatchEvent(event);
    
    // Store in localStorage for persistence across page refreshes
    localStorage.setItem(`sync_cards_${Date.now()}`, JSON.stringify({
      customerId,
      timestamp: new Date().toISOString()
    }));
    
    console.log('Force refreshed cards for customer:', customerId);
  } catch (error) {
    console.error('Error forcing card refresh:', error);
  }
};

/**
 * Sync points for a specific card
 * @param cardId The card ID
 * @param customerId The customer ID
 * @param businessId The business ID
 * @param programId The program ID
 * @param points The points to add (positive) or subtract (negative)
 */
export const syncCardPoints = async (
  cardId: string,
  customerId: string,
  businessId: string,
  programId: string,
  points: number
): Promise<void> => {
  try {
    // Create sync event for React Query invalidation
    createCardSyncEvent(
      cardId,
      customerId,
      businessId,
      'UPDATE',
      {
        pointsAdded: points,
        programId
      }
    );
    
    // Store in localStorage for persistence across page refreshes
    localStorage.setItem(`sync_points_${Date.now()}`, JSON.stringify({
      cardId,
      customerId,
      businessId,
      programId,
      points,
      timestamp: new Date().toISOString()
    }));
    
    // Force refresh cards after a short delay
    setTimeout(() => {
      forceRefreshCards(customerId);
    }, 1000);
    
    // Schedule another refresh after 5 seconds to ensure points are updated
    setTimeout(() => {
      forceRefreshCards(customerId);
    }, 5000);
  } catch (error) {
    console.error('Error syncing card points:', error);
  }
};

/**
 * Ensure all cards are properly synced for a customer
 * @param customerId The customer ID
 */
export const ensureCardSync = async (customerId: string): Promise<void> => {
  if (!customerId) return;
  
  try {
    // First force a refresh
    forceRefreshCards(customerId);
    
    // Then try to sync enrollments to cards
    const createdCardIds = await LoyaltyCardService.syncEnrollmentsToCards(customerId);
    if (createdCardIds.length > 0) {
      console.log(`Created ${createdCardIds.length} new cards from enrollments`);
      
      // Force another refresh after cards are created
      forceRefreshCards(customerId);
    }
  } catch (error) {
    console.error('Error ensuring card sync:', error);
  }
};

export default {
  forceRefreshCards,
  syncCardPoints,
  ensureCardSync
}; 