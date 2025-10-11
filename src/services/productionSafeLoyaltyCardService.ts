/**
 * Production-Safe Loyalty Card Service
 * Wrapper that uses ProductionSafeService in production and falls back to LoyaltyCardService in development
 * This fixes the critical production issue where direct database access is blocked
 */

import { ProductionSafeService } from '../utils/productionApiClient';

export class ProductionSafeLoyaltyCardService {
  /**
   * Get customer cards - production safe version
   */
  static async getCustomerCards(customerId: string): Promise<any[]> {
    // PRODUCTION: Use ProductionSafeService API client
    if (ProductionSafeService.shouldUseApi()) {
      try {
        console.log('🔒 Production mode: Getting customer cards via API');
        const cards = await ProductionSafeService.getCustomerCards(parseInt(customerId));
        return cards || [];
      } catch (error) {
        console.error('Failed to get customer cards via API:', error);
        return [];
      }
    }
    
    // DEVELOPMENT: Use direct database access (original LoyaltyCardService)
    try {
      console.log('🔧 Development mode: Getting customer cards via direct database');
      const { LoyaltyCardService } = await import('./loyaltyCardService');
      return await LoyaltyCardService.getCustomerCards(customerId);
    } catch (error) {
      console.error('Failed to get customer cards via database:', error);
      return [];
    }
  }

  /**
   * Get card details - production safe version
   */
  static async getCardDetails(cardId: string): Promise<any> {
    // PRODUCTION: Use ProductionSafeService API client
    if (ProductionSafeService.shouldUseApi()) {
      try {
        console.log('🔒 Production mode: Getting card details via API');
        const card = await ProductionSafeService.getCardDetails(parseInt(cardId));
        return card;
      } catch (error) {
        console.error('Failed to get card details via API:', error);
        return null;
      }
    }
    
    // DEVELOPMENT: Use direct database access (original LoyaltyCardService)
    try {
      const { LoyaltyCardService } = await import('./loyaltyCardService');
      return await LoyaltyCardService.getCardDetails(cardId);
    } catch (error) {
      console.error('Failed to get card details via database:', error);
      return null;
    }
  }

  /**
   * Get card activities - production safe version
   */
  static async getCardActivities(cardId: string): Promise<any[]> {
    // PRODUCTION: Not yet implemented via API
    if (ProductionSafeService.shouldUseApi()) {
      console.log('🔒 Production mode: Card activities API not yet implemented, returning empty array');
      return [];
    }
    
    // DEVELOPMENT: Use direct database access (original LoyaltyCardService)
    try {
      const { LoyaltyCardService } = await import('./loyaltyCardService');
      return await LoyaltyCardService.getCardActivities(cardId);
    } catch (error) {
      console.error('Failed to get card activities via database:', error);
      return [];
    }
  }

  /**
   * Award points to card - production safe version
   */
  static async awardPointsToCard(
    cardId: string,
    points: number,
    source: string = 'MANUAL',
    description: string = 'Points awarded'
  ): Promise<boolean> {
    // PRODUCTION: Not yet implemented via API
    if (ProductionSafeService.shouldUseApi()) {
      console.log('🔒 Production mode: Award points API not yet implemented');
      return false;
    }
    
    // DEVELOPMENT: Use direct database access (original LoyaltyCardService)
    try {
      const { LoyaltyCardService } = await import('./loyaltyCardService');
      return await LoyaltyCardService.awardPointsToCard(cardId, points, source, description);
    } catch (error) {
      console.error('Failed to award points via database:', error);
      return false;
    }
  }

  // Add other methods as needed - this is the template
  // All methods should follow the same pattern:
  // 1. Check if ProductionSafeService.shouldUseApi()
  // 2. If true, use ProductionSafeService API calls
  // 3. If false, dynamically import and use original LoyaltyCardService
}

export default ProductionSafeLoyaltyCardService;
