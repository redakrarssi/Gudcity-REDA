/**
 * Production-Safe Promo Service
 * Wrapper that uses ProductionSafeService in production and falls back to PromoService in development
 * This fixes the critical production issue where direct database access is blocked
 */

import { ProductionSafeService } from '../utils/productionApiClient';
import type { PromoCode } from '../types/promo';

export class ProductionSafePromoService {
  /**
   * Get available promotions - production safe version
   */
  static async getAvailablePromotions(): Promise<{ promotions: PromoCode[]; error?: string }> {
    // PRODUCTION: Use ProductionSafeService API client
    if (ProductionSafeService.shouldUseApi()) {
      try {
        console.log('🔒 Production mode: Getting promotions via API');
        const promotions = await ProductionSafeService.getAvailablePromotions();
        return { promotions: promotions || [] };
      } catch (error) {
        console.error('Failed to get promotions via API:', error);
        return { promotions: [], error: 'Failed to load promotions' };
      }
    }
    
    // DEVELOPMENT: Use direct database access (original PromoService)
    try {
      console.log('🔧 Development mode: Getting promotions via direct database');
      const { PromoService } = await import('./promoService');
      return await PromoService.getAvailablePromotions();
    } catch (error) {
      console.error('Failed to get promotions via database:', error);
      return { promotions: [], error: 'Failed to load promotions' };
    }
  }

  /**
   * Generate code - production safe version
   */
  static async generateCode(
    businessId: string,
    type: any,
    value: number,
    currency: any,
    maxUses: number | null = null,
    expiresAt: string | null = null,
    name: string = '',
    description: string = ''
  ): Promise<{ code: any; error?: string }> {
    // PRODUCTION: Not yet implemented via API
    if (ProductionSafeService.shouldUseApi()) {
      return {
        code: null as any,
        error: 'PromoService.generateCode() not yet implemented via API. Contact administrator.'
      };
    }
    
    // DEVELOPMENT: Use direct database access (original PromoService)
    try {
      const { PromoService } = await import('./promoService');
      return await PromoService.generateCode(businessId, type, value, currency, maxUses, expiresAt, name, description);
    } catch (error) {
      console.error('Failed to generate code via database:', error);
      return { code: null as any, error: 'Failed to generate promo code' };
    }
  }

  /**
   * Get business promotions - production safe version
   */
  static async getBusinessPromotions(businessId: string) {
    // PRODUCTION: Use ProductionSafeService API client
    if (ProductionSafeService.shouldUseApi()) {
      try {
        console.log('🔒 Production mode: Getting business promotions via API');
        const promotions = await ProductionSafeService.getAvailablePromotions(parseInt(businessId));
        return promotions || [];
      } catch (error) {
        console.error('Failed to get business promotions via API:', error);
        return [];
      }
    }
    
    // DEVELOPMENT: Use direct database access (original PromoService)
    try {
      const { PromoService } = await import('./promoService');
      return await PromoService.getBusinessPromotions(businessId);
    } catch (error) {
      console.error('Failed to get business promotions via database:', error);
      return [];
    }
  }
}

export default ProductionSafePromoService;
