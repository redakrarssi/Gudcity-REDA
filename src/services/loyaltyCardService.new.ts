/**
 * Loyalty Card Service - API Only
 * 
 * This service handles all loyalty card operations through API calls.
 * No direct database access - all operations go through the backend API.
 */

import { apiGetCustomerCards, apiGetCardById, apiGetCardActivities } from './apiClient';
import type { LoyaltyCard } from '../types/loyalty';

/**
 * Loyalty Card Service
 * Manages loyalty cards through secure API endpoints
 */
export class LoyaltyCardService {
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  /**
   * Get all loyalty cards for a customer
   */
  static async getCustomerCards(customerId: string): Promise<LoyaltyCard[]> {
    const cacheKey = `customer-cards-${customerId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await apiGetCustomerCards(customerId);
      const cards = response.data || response || [];
      
      // Cache the result
      this.cache.set(cacheKey, { data: cards, timestamp: Date.now() });
      
      return cards;
    } catch (error) {
      console.error('Error getting customer cards:', error);
      return [];
    }
  }

  /**
   * Get a specific loyalty card by ID
   */
  static async getCardById(cardId: string): Promise<LoyaltyCard | null> {
    const cacheKey = `card-${cardId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await apiGetCardById(cardId);
      const card = response.data || response || null;
      
      if (card) {
        this.cache.set(cacheKey, { data: card, timestamp: Date.now() });
      }
      
      return card;
    } catch (error) {
      console.error('Error getting card by ID:', error);
      return null;
    }
  }

  /**
   * Get activities/history for a loyalty card
   */
  static async getCardActivities(cardId: string): Promise<any[]> {
    try {
      const response = await apiGetCardActivities(cardId);
      return response.data || response || [];
    } catch (error) {
      console.error('Error getting card activities:', error);
      return [];
    }
  }

  /**
   * Invalidate cache for a customer's cards
   */
  static invalidateCustomerCache(customerId: string): void {
    const cacheKey = `customer-cards-${customerId}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Invalidate cache for a specific card
   */
  static invalidateCardCache(cardId: string): void {
    const cacheKey = `card-${cardId}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Clear all cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get loyalty card for a customer and program
   * Filters the customer's cards to find the one for a specific program
   */
  static async getCustomerProgramCard(
    customerId: string,
    programId: string
  ): Promise<LoyaltyCard | null> {
    try {
      const cards = await this.getCustomerCards(customerId);
      const card = cards.find(c => c.programId === programId || c.programId === parseInt(programId));
      return card || null;
    } catch (error) {
      console.error('Error getting customer program card:', error);
      return null;
    }
  }

  /**
   * Get total points for a customer across all cards
   */
  static async getCustomerTotalPoints(customerId: string): Promise<number> {
    try {
      const cards = await this.getCustomerCards(customerId);
      return cards.reduce((total, card) => total + (card.points || 0), 0);
    } catch (error) {
      console.error('Error getting customer total points:', error);
      return 0;
    }
  }
}

export default LoyaltyCardService;

