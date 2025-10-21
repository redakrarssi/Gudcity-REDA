import sql from '../_lib/db';

export interface PromoCode {
  id: string;
  businessId: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed' | 'points';
  discountValue: number;
  pointsValue?: number;
  maxUses?: number;
  currentUses: number;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Server-side service for promo code management
 * All database operations for promo codes
 */
export class PromoServerService {
  /**
   * Get business promo codes
   */
  static async getBusinessPromoCodes(businessId: string): Promise<PromoCode[]> {
    try {
      const businessIdInt = parseInt(businessId);

      const result = await sql`
        SELECT 
          id::text,
          business_id::text as "businessId",
          code,
          description,
          discount_type as "discountType",
          discount_percentage as "discountValue",
          points_value as "pointsValue",
          max_uses as "maxUses",
          current_uses as "currentUses",
          expires_at as "expiresAt",
          is_active as "isActive",
          created_at as "createdAt"
        FROM promo_codes
        WHERE business_id = ${businessIdInt}
        ORDER BY created_at DESC
      `;

      return result as unknown as PromoCode[];
    } catch (error) {
      console.error('Error getting business promo codes:', error);
      return [];
    }
  }

  /**
   * Get promo code by code string
   */
  static async getPromoCodeByCode(
    code: string,
    businessId?: string
  ): Promise<PromoCode | null> {
    try {
      let result;

      if (businessId) {
        const businessIdInt = parseInt(businessId);
        result = await sql`
          SELECT 
            id::text,
            business_id::text as "businessId",
            code,
            description,
            discount_type as "discountType",
            discount_percentage as "discountValue",
            points_value as "pointsValue",
            max_uses as "maxUses",
            current_uses as "currentUses",
            expires_at as "expiresAt",
            is_active as "isActive",
            created_at as "createdAt"
          FROM promo_codes
          WHERE code = ${code}
          AND business_id = ${businessIdInt}
          AND is_active = true
          AND (expires_at IS NULL OR expires_at > NOW())
        `;
      } else {
        result = await sql`
          SELECT 
            id::text,
            business_id::text as "businessId",
            code,
            description,
            discount_type as "discountType",
            discount_percentage as "discountValue",
            points_value as "pointsValue",
            max_uses as "maxUses",
            current_uses as "currentUses",
            expires_at as "expiresAt",
            is_active as "isActive",
            created_at as "createdAt"
          FROM promo_codes
          WHERE code = ${code}
          AND is_active = true
          AND (expires_at IS NULL OR expires_at > NOW())
        `;
      }

      if (result.length === 0) {
        return null;
      }

      return result[0] as unknown as PromoCode;
    } catch (error) {
      console.error('Error getting promo code by code:', error);
      return null;
    }
  }

  /**
   * Create promo code
   */
  static async createPromoCode(data: {
    businessId: string;
    code: string;
    description?: string;
    discountType: 'percentage' | 'fixed' | 'points';
    discountValue: number;
    pointsValue?: number;
    maxUses?: number;
    expiresAt?: Date;
  }): Promise<{ success: boolean; promoCode?: PromoCode; error?: string }> {
    try {
      const businessIdInt = parseInt(data.businessId);

      // Check if code already exists for this business
      const existing = await sql`
        SELECT id FROM promo_codes
        WHERE code = ${data.code}
        AND business_id = ${businessIdInt}
      `;

      if (existing.length > 0) {
        return { success: false, error: 'Promo code already exists' };
      }

      const result = await sql`
        INSERT INTO promo_codes (
          business_id,
          code,
          description,
          discount_type,
          discount_percentage,
          points_value,
          max_uses,
          current_uses,
          expires_at,
          is_active,
          created_at
        ) VALUES (
          ${businessIdInt},
          ${data.code.toUpperCase()},
          ${data.description || null},
          ${data.discountType},
          ${data.discountValue},
          ${data.pointsValue || null},
          ${data.maxUses || null},
          0,
          ${data.expiresAt || null},
          true,
          NOW()
        )
        RETURNING 
          id::text,
          business_id::text as "businessId",
          code,
          description,
          discount_type as "discountType",
          discount_percentage as "discountValue",
          points_value as "pointsValue",
          max_uses as "maxUses",
          current_uses as "currentUses",
          expires_at as "expiresAt",
          is_active as "isActive",
          created_at as "createdAt"
      `;

      return {
        success: true,
        promoCode: result[0] as unknown as PromoCode
      };
    } catch (error) {
      console.error('Error creating promo code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update promo code
   */
  static async updatePromoCode(
    promoCodeId: string,
    updates: Partial<Omit<PromoCode, 'id' | 'businessId' | 'currentUses' | 'createdAt'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const promoCodeIdInt = parseInt(promoCodeId);
      const setClauses = [];
      const values: any[] = [];

      if (updates.code !== undefined) {
        setClauses.push(`code = $${values.length + 1}`);
        values.push(updates.code.toUpperCase());
      }

      if (updates.description !== undefined) {
        setClauses.push(`description = $${values.length + 1}`);
        values.push(updates.description);
      }

      if (updates.discountType !== undefined) {
        setClauses.push(`discount_type = $${values.length + 1}`);
        values.push(updates.discountType);
      }

      if (updates.discountValue !== undefined) {
        setClauses.push(`discount_percentage = $${values.length + 1}`);
        values.push(updates.discountValue);
      }

      if (updates.pointsValue !== undefined) {
        setClauses.push(`points_value = $${values.length + 1}`);
        values.push(updates.pointsValue);
      }

      if (updates.maxUses !== undefined) {
        setClauses.push(`max_uses = $${values.length + 1}`);
        values.push(updates.maxUses);
      }

      if (updates.expiresAt !== undefined) {
        setClauses.push(`expires_at = $${values.length + 1}`);
        values.push(updates.expiresAt);
      }

      if (updates.isActive !== undefined) {
        setClauses.push(`is_active = $${values.length + 1}`);
        values.push(updates.isActive);
      }

      if (setClauses.length === 0) {
        return { success: true };
      }

      setClauses.push('updated_at = NOW()');

      await sql.unsafe(`
        UPDATE promo_codes
        SET ${setClauses.join(', ')}
        WHERE id = ${promoCodeIdInt}
      `);

      return { success: true };
    } catch (error) {
      console.error('Error updating promo code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete promo code
   */
  static async deletePromoCode(promoCodeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const promoCodeIdInt = parseInt(promoCodeId);

      await sql`
        DELETE FROM promo_codes
        WHERE id = ${promoCodeIdInt}
      `;

      return { success: true };
    } catch (error) {
      console.error('Error deleting promo code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Increment promo code usage
   */
  static async incrementPromoCodeUsage(promoCodeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const promoCodeIdInt = parseInt(promoCodeId);

      await sql`
        UPDATE promo_codes
        SET 
          current_uses = current_uses + 1,
          updated_at = NOW()
        WHERE id = ${promoCodeIdInt}
      `;

      return { success: true };
    } catch (error) {
      console.error('Error incrementing promo code usage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate promo code
   */
  static async validatePromoCode(code: string, businessId: string): Promise<{
    valid: boolean;
    promoCode?: PromoCode;
    reason?: string;
  }> {
    try {
      const promoCode = await this.getPromoCodeByCode(code, businessId);

      if (!promoCode) {
        return { valid: false, reason: 'Promo code not found' };
      }

      if (!promoCode.isActive) {
        return { valid: false, reason: 'Promo code is inactive' };
      }

      if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
        return { valid: false, reason: 'Promo code has expired' };
      }

      if (promoCode.maxUses && promoCode.currentUses >= promoCode.maxUses) {
        return { valid: false, reason: 'Promo code has reached maximum uses' };
      }

      return { valid: true, promoCode };
    } catch (error) {
      console.error('Error validating promo code:', error);
      return { valid: false, reason: 'Error validating promo code' };
    }
  }
}

