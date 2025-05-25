import type { PromoCode, PromoCodeRedemption, PromoCodeStats } from '../types/promo';
import { CurrencyService } from './currencyService';
import type { CurrencyCode } from '../types/currency';

export class PromoService {
  // Mock data stores
  private static promoCodes: PromoCode[] = [];
  private static redemptions: PromoCodeRedemption[] = [];
  
  static async generateCode(
    businessId: string,
    type: PromoCode['type'],
    value: number,
    currency: CurrencyCode,
    maxUses: number | null = null,
    expiresAt: string | null = null
  ): Promise<{ code: PromoCode; error?: string }> {
    try {
      const code = this.generateUniqueCode();
      
      const newPromoCode: PromoCode = {
        id: Date.now().toString(),
        businessId,
        code,
        type,
        value,
        currency,
        maxUses,
        usedCount: 0,
        expiresAt,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      this.promoCodes.push(newPromoCode);
      return { code: newPromoCode };
    } catch (error) {
      return { 
        code: null as unknown as PromoCode,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async validateCode(
    code: string,
    customerId: string
  ): Promise<{ valid: boolean; code?: PromoCode; error?: string }> {
    try {
      // Get code details
      const promoCode = this.promoCodes.find(pc => pc.code === code);
      
      if (!promoCode) return { valid: false, error: 'Code not found' };

      // Check if code is active
      if (promoCode.status !== 'ACTIVE') {
        return { valid: false, error: `Code is ${promoCode.status.toLowerCase()}` };
      }

      // Check expiration
      if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
        await this.updateCodeStatus(promoCode.id, 'EXPIRED');
        return { valid: false, error: 'Code has expired' };
      }

      // Check usage limit
      if (promoCode.maxUses && promoCode.usedCount >= promoCode.maxUses) {
        await this.updateCodeStatus(promoCode.id, 'DEPLETED');
        return { valid: false, error: 'Code has reached maximum uses' };
      }

      // Check if customer has already used this code
      const existingRedemption = this.redemptions.find(
        r => r.codeId === promoCode.id && r.customerId === customerId
      );

      if (existingRedemption) {
        return { valid: false, error: 'Code already used by this customer' };
      }

      return { valid: true, code: promoCode };
    } catch (error) {
      return { 
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async redeemCode(
    code: string,
    customerId: string,
    transactionId?: string
  ): Promise<{ success: boolean; redemption?: PromoCodeRedemption; error?: string }> {
    try {
      const { valid, code: promoCode, error: validationError } = await this.validateCode(code, customerId);
      
      if (!valid || !promoCode) {
        throw new Error(validationError || 'Invalid code');
      }

      // Create redemption record
      const redemption: PromoCodeRedemption = {
        id: Date.now().toString(),
        codeId: promoCode.id,
        customerId,
        businessId: promoCode.businessId,
        redeemedAt: new Date().toISOString(),
        value: promoCode.value,
        currency: promoCode.currency,
        transactionId
      };
      
      this.redemptions.push(redemption);

      // Update code usage count
      const index = this.promoCodes.findIndex(pc => pc.id === promoCode.id);
      if (index !== -1) {
        this.promoCodes[index] = {
          ...this.promoCodes[index],
          usedCount: this.promoCodes[index].usedCount + 1,
          updatedAt: new Date().toISOString()
        };
      }

      return { success: true, redemption };
    } catch (error) {
      return { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async getBusinessCodes(
    businessId: string
  ): Promise<{ codes: PromoCode[]; error?: string }> {
    try {
      const businessCodes = this.promoCodes.filter(code => code.businessId === businessId);
      
      return { codes: businessCodes };
    } catch (error) {
      return {
        codes: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async getCodeStats(
    businessId: string
  ): Promise<{ stats: PromoCodeStats; error?: string }> {
    try {
      const businessCodes = this.promoCodes.filter(code => code.businessId === businessId);
      const businessRedemptions = this.redemptions.filter(redemption => redemption.businessId === businessId);
      
      const totalCodes = businessCodes.length;
      const activeCodes = businessCodes.filter(code => code.status === 'ACTIVE').length;
      const totalRedemptions = businessRedemptions.length;
      
      // Calculate redemption value
      const redemptionValue = businessRedemptions.reduce((sum, redemption) => {
        // Convert all values to a common currency (e.g., USD)
        const valueInUSD = CurrencyService.convert(
          redemption.value,
          redemption.currency || 'USD', // Provide a default if currency is undefined
          'USD'
        );
        return sum + valueInUSD;
      }, 0);
      
      // Group by code type
      const byType = businessCodes.reduce(
        (acc, code) => {
          acc[code.type] = (acc[code.type] || 0) + 1;
          return acc;
        },
        {} as Record<PromoCode['type'], number>
      );
      
      return {
        stats: {
          totalCodes,
          activeCodes,
          totalRedemptions,
          redemptionRate: totalCodes > 0 ? totalRedemptions / totalCodes : 0,
          redemptionValue,
          byType
        }
      };
    } catch (error) {
      return {
        stats: {
          totalCodes: 0,
          activeCodes: 0,
          totalRedemptions: 0,
          redemptionRate: 0,
          redemptionValue: 0,
          byType: {} as Record<PromoCode['type'], number>
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async updateCodeStatus(
    codeId: string,
    status: PromoCode['status']
  ): Promise<boolean> {
    const index = this.promoCodes.findIndex(code => code.id === codeId);
    if (index !== -1) {
      this.promoCodes[index] = {
        ...this.promoCodes[index],
        status,
        updatedAt: new Date().toISOString()
      };
      return true;
    }
    return false;
  }

  private static generateUniqueCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if code already exists
    const exists = this.promoCodes.some(code => code.code === result);
    if (exists) {
      return this.generateUniqueCode(); // Recursively try again
    }
    
    return result;
  }
  
  // Method to initialize mock data for testing
  static initMockData(promoCodes: PromoCode[] = [], redemptions: PromoCodeRedemption[] = []) {
    this.promoCodes = [...promoCodes];
    this.redemptions = [...redemptions];
  }
} 