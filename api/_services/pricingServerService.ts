import sql from '../_lib/db';

export interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billingPeriod: 'monthly' | 'yearly' | 'one-time';
  features: string[];
  maxLocations?: number;
  maxPrograms?: number;
  maxCustomers?: number;
  isActive: boolean;
  isPopular?: boolean;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  businessId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial';
  startDate: Date;
  endDate?: Date;
  autoRenew: boolean;
  createdAt: Date;
}

/**
 * Server-side service for pricing and subscriptions
 * All database operations for pricing management
 */
export class PricingServerService {
  /**
   * Get all pricing plans
   */
  static async getAllPlans(activeOnly: boolean = true): Promise<PricingPlan[]> {
    try {
      let query;

      if (activeOnly) {
        query = await sql`
          SELECT 
            id::text,
            name,
            description,
            price,
            currency,
            billing_period as "billingPeriod",
            features,
            max_locations as "maxLocations",
            max_programs as "maxPrograms",
            max_customers as "maxCustomers",
            is_active as "isActive",
            is_popular as "isPopular",
            created_at as "createdAt"
          FROM pricing_plans
          WHERE is_active = true
          ORDER BY price
        `;
      } else {
        query = await sql`
          SELECT 
            id::text,
            name,
            description,
            price,
            currency,
            billing_period as "billingPeriod",
            features,
            max_locations as "maxLocations",
            max_programs as "maxPrograms",
            max_customers as "maxCustomers",
            is_active as "isActive",
            is_popular as "isPopular",
            created_at as "createdAt"
          FROM pricing_plans
          ORDER BY price
        `;
      }

      return query as unknown as PricingPlan[];
    } catch (error) {
      console.error('Error getting pricing plans:', error);
      return [];
    }
  }

  /**
   * Get plan by ID
   */
  static async getPlanById(planId: string): Promise<PricingPlan | null> {
    try {
      const planIdInt = parseInt(planId);

      const result = await sql`
        SELECT 
          id::text,
          name,
          description,
          price,
          currency,
          billing_period as "billingPeriod",
          features,
          max_locations as "maxLocations",
          max_programs as "maxPrograms",
          max_customers as "maxCustomers",
          is_active as "isActive",
          is_popular as "isPopular",
          created_at as "createdAt"
        FROM pricing_plans
        WHERE id = ${planIdInt}
      `;

      if (result.length === 0) {
        return null;
      }

      return result[0] as unknown as PricingPlan;
    } catch (error) {
      console.error('Error getting plan by ID:', error);
      return null;
    }
  }

  /**
   * Get business subscription
   */
  static async getBusinessSubscription(businessId: string): Promise<Subscription | null> {
    try {
      const businessIdInt = parseInt(businessId);

      const result = await sql`
        SELECT 
          id::text,
          business_id::text as "businessId",
          plan_id::text as "planId",
          status,
          start_date as "startDate",
          end_date as "endDate",
          auto_renew as "autoRenew",
          created_at as "createdAt"
        FROM subscriptions
        WHERE business_id = ${businessIdInt}
        AND status IN ('active', 'trial')
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (result.length === 0) {
        return null;
      }

      return result[0] as unknown as Subscription;
    } catch (error) {
      console.error('Error getting business subscription:', error);
      return null;
    }
  }

  /**
   * Create subscription
   */
  static async createSubscription(data: {
    businessId: string;
    planId: string;
    startDate?: Date;
    endDate?: Date;
    autoRenew?: boolean;
  }): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
    try {
      const businessIdInt = parseInt(data.businessId);
      const planIdInt = parseInt(data.planId);

      // Cancel any existing active subscriptions
      await sql`
        UPDATE subscriptions
        SET status = 'cancelled', updated_at = NOW()
        WHERE business_id = ${businessIdInt}
        AND status IN ('active', 'trial')
      `;

      const startDate = data.startDate || new Date();
      const result = await sql`
        INSERT INTO subscriptions (
          business_id,
          plan_id,
          status,
          start_date,
          end_date,
          auto_renew,
          created_at
        ) VALUES (
          ${businessIdInt},
          ${planIdInt},
          'active',
          ${startDate},
          ${data.endDate || null},
          ${data.autoRenew !== false},
          NOW()
        )
        RETURNING 
          id::text,
          business_id::text as "businessId",
          plan_id::text as "planId",
          status,
          start_date as "startDate",
          end_date as "endDate",
          auto_renew as "autoRenew",
          created_at as "createdAt"
      `;

      return {
        success: true,
        subscription: result[0] as unknown as Subscription
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(
    subscriptionId: string,
    businessId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const subscriptionIdInt = parseInt(subscriptionId);
      const businessIdInt = parseInt(businessId);

      // Verify subscription belongs to business
      const subscription = await sql`
        SELECT business_id FROM subscriptions WHERE id = ${subscriptionIdInt}
      `;

      if (subscription.length === 0) {
        return { success: false, error: 'Subscription not found' };
      }

      if (subscription[0].business_id !== businessIdInt) {
        return { success: false, error: 'Unauthorized' };
      }

      await sql`
        UPDATE subscriptions
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = ${subscriptionIdInt}
      `;

      return { success: true };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

