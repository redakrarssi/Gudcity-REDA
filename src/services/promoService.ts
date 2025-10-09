import type { PromoCode, PromoCodeRedemption, PromoCodeStats } from '../types/promo';
import { CurrencyService } from './currencyService';
import type { CurrencyCode } from '../types/currency';
import sql from '../utils/db';

interface RedemptionResponse {
  success: boolean;
  error?: string;
  redemption?: {
    id: string;
    value: number;
    currency: string;
    promotionName: string;
  };
}

export class PromoService {
  static async generateCode(
    businessId: string,
    type: PromoCode['type'],
    value: number,
    currency: CurrencyCode,
    maxUses: number | null = null,
    expiresAt: string | null = null,
    name: string = '',
    description: string = ''
  ): Promise<{ code: PromoCode; error?: string }> {
    try {
      const code = await this.generateUniqueCode();
      
      // Insert the new promo code into the database
      const result = await sql`
        INSERT INTO promo_codes (
          business_id,
          code,
          type,
          value,
          currency,
          max_uses,
          expires_at,
          name,
          description
        ) VALUES (
          ${parseInt(businessId)},
          ${code},
          ${type},
          ${value},
          ${currency || null},
          ${maxUses},
          ${expiresAt ? new Date(expiresAt) : null},
          ${name},
          ${description}
        )
        RETURNING *
      `;
      
      // Format the result to match our PromoCode interface
      const newPromoCode = this.dbPromoCodeToPromoCode(result[0]);
      return { code: newPromoCode };
    } catch (error) {
      console.error('Error generating code:', error);
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
      // Get code details from the database
      const promoCodeResult = await sql`
        SELECT * FROM promo_codes
        WHERE code = ${code}
      `;
      
      if (promoCodeResult.length === 0) {
        return { valid: false, error: 'Code not found' };
      }
      
      const promoCode = this.dbPromoCodeToPromoCode(promoCodeResult[0]);

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
      const existingRedemptionResult = await sql`
        SELECT * FROM promo_redemptions
        WHERE code_id = ${parseInt(promoCode.id)}
        AND customer_id = ${parseInt(customerId)}
      `;

      if (existingRedemptionResult.length > 0) {
        return { valid: false, error: 'Code already used by this customer' };
      }

      return { valid: true, code: promoCode };
    } catch (error) {
      console.error('Error validating code:', error);
      return { 
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async redeemCode(
    code: string,
    customerId: string
  ): Promise<RedemptionResponse> {
    try {
      if (!code || !customerId) {
        return {
          success: false,
          error: 'Invalid code or customer ID'
        };
      }

      const customerIdInt = parseInt(customerId);

      // Check if the promotion code exists and is active
      const promotionResult = await sql`
        SELECT * FROM promotions
        WHERE code = ${code.trim()}
        AND status = 'ACTIVE'
        AND expiry_date > NOW()
      `;

      if (promotionResult.length === 0) {
        return {
          success: false,
          error: 'Invalid or expired promotion code'
        };
      }

      const promotion = promotionResult[0];

      // Check if this code has reached its usage limit
      if (promotion.usage_limit) {
        const usageCount = await sql`
          SELECT COUNT(*) as count FROM redemptions
          WHERE promotion_id = ${promotion.id}
        `;

        if (usageCount[0].count >= promotion.usage_limit) {
          return {
            success: false,
            error: 'This promotion code has reached its usage limit'
          };
        }
      }

      // Check if customer has already redeemed this code
      if (!promotion.allow_multiple_use) {
        const customerRedemptions = await sql`
          SELECT * FROM redemptions
          WHERE promotion_id = ${promotion.id}
          AND customer_id = ${customerIdInt}
        `;

        if (customerRedemptions.length > 0) {
          return {
            success: false,
            error: 'You have already redeemed this promotion code'
          };
        }
      }

      // Record the redemption
      const redemptionResult = await sql`
        INSERT INTO redemptions (
          promotion_id,
          customer_id,
          redeemed_at,
          value,
          currency
        ) VALUES (
          ${promotion.id},
          ${customerIdInt},
          NOW(),
          ${promotion.value},
          ${promotion.currency || 'USD'}
        )
        RETURNING id
      `;

      return {
        success: true,
        redemption: {
          id: redemptionResult[0].id.toString(),
          value: parseFloat(promotion.value),
          currency: promotion.currency || 'USD',
          promotionName: promotion.name
        }
      };
    } catch (error) {
      console.error('Error redeeming code:', error);
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
      const businessIdInt = parseInt(businessId);
      const codesResult = await sql`
        SELECT * FROM promo_codes
        WHERE business_id = ${businessIdInt}
        ORDER BY created_at DESC
      `;
      
      const codes = codesResult.map(this.dbPromoCodeToPromoCode);
      return { codes };
    } catch (error) {
      console.error('Error getting business codes:', error);
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
      const businessIdInt = parseInt(businessId);
      
      // Get total and active codes
      const codesResult = await sql`
        SELECT
          COUNT(*) as total_codes,
          SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_codes
        FROM promo_codes
        WHERE business_id = ${businessIdInt}
      `;
      
      // Get redemption stats
      const redemptionsResult = await sql`
        SELECT COUNT(*) as total_redemptions
        FROM promo_redemptions
        WHERE business_id = ${businessIdInt}
      `;
      
      // Calculate redemption value
      const valueResult = await sql`
        SELECT SUM(value) as total_value, currency
        FROM promo_redemptions
        WHERE business_id = ${businessIdInt}
        GROUP BY currency
      `;
      
      // Get counts by type
      const typeResult = await sql`
        SELECT type, COUNT(*) as count
        FROM promo_codes
        WHERE business_id = ${businessIdInt}
        GROUP BY type
      `;
      
      const totalCodes = parseInt(codesResult[0]?.total_codes || '0');
      const activeCodes = parseInt(codesResult[0]?.active_codes || '0');
      const totalRedemptions = parseInt(redemptionsResult[0]?.total_redemptions || '0');
      
      // Calculate total value in USD
      let redemptionValue = 0;
      for (const row of valueResult) {
        const valueInUSD = CurrencyService.convert(
          parseFloat(row.total_value || '0'),
          row.currency || 'USD',
          'USD'
        );
        redemptionValue += valueInUSD;
      }
      
      // Format by type counts
      const byType: Record<PromoCode['type'], number> = {} as any;
      for (const row of typeResult) {
        byType[row.type as PromoCode['type']] = parseInt(row.count);
      }
      
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
      console.error('Error getting code stats:', error);
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
    try {
      const codeIdInt = parseInt(codeId);
      await sql`
        UPDATE promo_codes
        SET status = ${status},
            updated_at = NOW()
        WHERE id = ${codeIdInt}
      `;
      return true;
    } catch (error) {
      console.error('Error updating code status:', error);
      return false;
    }
  }

  private static async generateUniqueCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if code already exists in the database
    const existingCodeResult = await sql`
      SELECT id FROM promo_codes WHERE code = ${result}
    `;
    
    if (existingCodeResult.length > 0) {
      return this.generateUniqueCode(); // Recursively try again
    }
    
    return result;
  }
  
  // Helper method to convert database promo code to our interface
  private static dbPromoCodeToPromoCode(dbCode: any): PromoCode {
    return {
      id: String(dbCode.id),
      businessId: String(dbCode.business_id),
      businessName: String(dbCode.business_name || ''),
      code: String(dbCode.code),
      type: dbCode.type as PromoCode['type'],
      value: Number(dbCode.value),
      currency: dbCode.currency as CurrencyCode | undefined,
      maxUses: dbCode.max_uses ? Number(dbCode.max_uses) : null,
      usedCount: Number(dbCode.used_count || 0),
      expiresAt: dbCode.expires_at ? new Date(dbCode.expires_at).toISOString() : null,
      status: dbCode.status as PromoCode['status'],
      name: String(dbCode.name || ''),
      description: String(dbCode.description || ''),
      createdAt: new Date(dbCode.created_at).toISOString(),
      updatedAt: new Date(dbCode.updated_at).toISOString(),
    };
  }
  
  // Helper method to convert database redemption to our interface
  private static dbRedemptionToRedemption(dbRedemption: any): PromoCodeRedemption {
    return {
      id: dbRedemption.id.toString(),
      codeId: dbRedemption.code_id.toString(),
      customerId: dbRedemption.customer_id.toString(),
      businessId: dbRedemption.business_id.toString(),
      value: parseFloat(dbRedemption.value),
      currency: dbRedemption.currency,
      transactionId: dbRedemption.transaction_id,
      redeemedAt: dbRedemption.redeemed_at
    };
  }

  static async getAvailablePromotions(): Promise<{ promotions: PromoCode[]; error?: string }> {
    try {
      // Get all active promo codes
      const promoCodesResult = await sql`
        SELECT pc.*, u.business_name
        FROM promo_codes pc
        JOIN users u ON pc.business_id = u.id
        WHERE pc.status = 'ACTIVE'
        AND (pc.expires_at IS NULL OR pc.expires_at > NOW())
        AND (pc.max_uses IS NULL OR pc.used_count < pc.max_uses)
        ORDER BY pc.created_at DESC
      `;
      
      const promotions = promoCodesResult.map((row: any) => {
        const promo = this.dbPromoCodeToPromoCode(row);
        // Add business_name to the promo object
        return {
          ...promo,
          businessName: row.business_name || 'Unknown Business'
        };
      });
      
      return { promotions };
    } catch (error) {
      console.error('Error getting available promotions:', error);
      return {
        promotions: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async getBusinessPromotions(businessId: string) {
    try {
      const businessIdInt = parseInt(businessId);

      const promotions = await sql`
        SELECT * FROM promotions
        WHERE business_id = ${businessIdInt}
        ORDER BY created_at DESC
      `;

      return promotions.map((promo: any) => ({
        id: promo.id.toString(),
        businessId: promo.business_id.toString(),
        code: promo.code,
        name: promo.name,
        description: promo.description,
        value: parseFloat(promo.value),
        currency: promo.currency,
        type: promo.type,
        expiryDate: promo.expiry_date,
        usageLimit: promo.usage_limit,
        allowMultipleUse: !!promo.allow_multiple_use,
        status: promo.status,
        createdAt: promo.created_at
      }));
    } catch (error) {
      console.error('Error fetching business promotions:', error);
      return [];
    }
  }

  static async getCustomerCodes(
    customerId: string
  ): Promise<{ codes: PromoCode[]; error?: string }> {
    try {
      const customerIdInt = parseInt(customerId, 10);
      if (isNaN(customerIdInt)) {
        return { codes: [], error: 'Invalid customer ID' };
      }

      // This query is speculative and assumes a customer_promo_codes table exists.
      const codesResult = await sql`
        SELECT pc.*, b.name as business_name
        FROM promo_codes pc
        LEFT JOIN customer_promo_codes cpc ON pc.id = cpc.promo_code_id
        LEFT JOIN businesses b ON pc.business_id = b.id
        WHERE cpc.customer_id = ${customerIdInt}
          AND pc.status = 'ACTIVE'
          AND (pc.expires_at IS NULL OR pc.expires_at > NOW())
        ORDER BY pc.created_at DESC
      `;
      
      const codes = codesResult.map(this.dbPromoCodeToPromoCode);
      return { codes };
    } catch (error) {
      console.error('Error getting customer codes:', error);
      return {
        codes: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 