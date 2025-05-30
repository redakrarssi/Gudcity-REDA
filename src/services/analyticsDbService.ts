import sql, { DatabaseRow } from '../utils/db';
import { CurrencyService } from './currencyService';
import type { CurrencyCode } from '../types/currency';
import type {
  BusinessAnalytics,
  AdminAnalytics,
  RetentionMetrics,
  ProgramPerformance,
  CustomerSegment,
  RevenueAnalysis,
  PlatformMetrics,
  RegionalPerformance,
  UserEngagement
} from '../types/analytics';

interface ProgramAnalyticsRow extends DatabaseRow {
  program_id: string;
  program_name: string;
  total_customers: number;
  active_customers: number;
  points_issued: number;
  points_redeemed: number;
  redemption_rate: number;
  avg_transaction_value: number;
  revenue: number;
}

interface CustomerSegmentRow extends DatabaseRow {
  segment_name: string;
  segment_size: number;
  avg_spend: number;
  visit_frequency: number;
  loyalty_score: number;
}

interface ProductRow extends DatabaseRow {
  product_name: string;
  revenue: number;
  quantity: number;
}

interface RegionRow extends DatabaseRow {
  region: string;
  businesses: number;
  customers: number;
  revenue: number;
  business_growth: number;
  customer_growth: number;
  revenue_growth: number;
}

interface TopProgramRow extends DatabaseRow {
  region: string;
  program_id: string;
  program_name: string;
  customers: number;
  revenue: number;
}

interface FeatureRow extends DatabaseRow {
  feature_name: string;
  interaction_count: number;
}

export class AnalyticsDbService {
  static async getBusinessAnalytics(
    businessId: string,
    currency: CurrencyCode,
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<BusinessAnalytics> {
    try {
      const retention = await this.calculateRetentionMetrics(businessId, period);
      const performance = await this.calculateProgramPerformance(businessId, currency, period);
      const segments = await this.analyzeCustomerSegments(businessId, period);
      const revenue = await this.analyzeRevenue(businessId, currency, period);
      const comparison = await this.getBusinessPeriodComparison(businessId, period);

      return {
        retention,
        programPerformance: performance,
        customerSegments: segments,
        revenue,
        periodComparison: comparison
      };
    } catch (error) {
      console.error('Error getting business analytics from database:', error);
      throw error;
    }
  }

  static async getAdminAnalytics(
    currency: CurrencyCode,
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<AdminAnalytics> {
    try {
      const platform = await this.calculatePlatformMetrics(currency, period);
      const regional = await this.analyzeRegionalPerformance(currency, period);
      const engagement = await this.calculateUserEngagement(period);
      const comparison = await this.getPlatformPeriodComparison(period);

      return {
        platform,
        regional,
        engagement,
        periodComparison: comparison
      };
    } catch (error) {
      console.error('Error getting admin analytics from database:', error);
      throw error;
    }
  }

  private static async calculateRetentionMetrics(
    businessId: string,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<RetentionMetrics> {
    const results = await sql`
      SELECT 
        period_type,
        active_customers,
        churn_rate,
        repeat_visit_rate,
        avg_visit_frequency,
        customer_lifetime_value
      FROM business_analytics
      WHERE business_id = ${parseInt(businessId)}
      AND period_type = ${period}
      ORDER BY period_start DESC
      LIMIT 1
    `;

    if (results.length === 0) {
      throw new Error(`No retention data found for business ID ${businessId} and period ${period}`);
    }

    const data = results[0] as DatabaseRow;
    return {
      period: period,
      activeCustomers: data.active_customers,
      churnRate: data.churn_rate,
      repeatVisitRate: data.repeat_visit_rate,
      averageVisitFrequency: data.avg_visit_frequency,
      customerLifetimeValue: data.customer_lifetime_value
    };
  }

  private static async calculateProgramPerformance(
    businessId: string,
    currency: CurrencyCode,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<ProgramPerformance[]> {
    const results = await sql`
      SELECT 
        program_id,
        program_name,
        total_customers,
        active_customers,
        points_issued,
        points_redeemed,
        redemption_rate,
        avg_transaction_value,
        revenue
      FROM program_analytics
      WHERE business_id = ${parseInt(businessId)}
      AND period_type = ${period}
      ORDER BY active_customers DESC
    `;

    return results.map((row) => {
      const typedRow = row as ProgramAnalyticsRow;
      return {
        programId: typedRow.program_id,
        programName: typedRow.program_name,
        totalCustomers: typedRow.total_customers,
        activeCustomers: typedRow.active_customers,
        pointsIssued: typedRow.points_issued,
        pointsRedeemed: typedRow.points_redeemed,
        redemptionRate: typedRow.redemption_rate,
        averageTransactionValue: typedRow.avg_transaction_value,
        revenue: typedRow.revenue,
        currency: currency
      };
    });
  }

  private static async analyzeCustomerSegments(
    businessId: string,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<CustomerSegment[]> {
    const results = await sql`
      SELECT 
        segment_name,
        segment_size,
        avg_spend,
        visit_frequency,
        loyalty_score
      FROM customer_segments
      WHERE business_id = ${parseInt(businessId)}
      AND period_type = ${period}
      ORDER BY loyalty_score DESC
    `;

    return results.map((row) => {
      const typedRow = row as CustomerSegmentRow;
      return {
        name: typedRow.segment_name,
        size: typedRow.segment_size,
        averageSpend: typedRow.avg_spend,
        visitFrequency: typedRow.visit_frequency,
        preferredPrograms: [], // We don't store this in the database yet
        loyaltyScore: typedRow.loyalty_score
      };
    });
  }

  private static async analyzeRevenue(
    businessId: string,
    currency: CurrencyCode,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<RevenueAnalysis> {
    // Get main revenue metrics
    const revenueResults = await sql`
      SELECT 
        total_revenue,
        revenue_growth,
        avg_order_value
      FROM business_analytics
      WHERE business_id = ${parseInt(businessId)}
      AND period_type = ${period}
      ORDER BY period_start DESC
      LIMIT 1
    `;
    
    if (revenueResults.length === 0) {
      throw new Error(`No revenue data found for business ID ${businessId} and period ${period}`);
    }

    // Get top products
    const productsResults = await sql`
      SELECT 
        product_name,
        revenue,
        quantity
      FROM top_products
      WHERE business_id = ${parseInt(businessId)}
      AND period_type = ${period}
      ORDER BY revenue DESC
      LIMIT 5
    `;
    
    const data = revenueResults[0] as DatabaseRow;
    
    const topProducts = productsResults.map((row) => {
      const typedRow = row as ProductRow;
      return {
        name: typedRow.product_name,
        revenue: typedRow.revenue,
        quantity: typedRow.quantity
      };
    });
    
    return {
      totalRevenue: data.total_revenue,
      revenueGrowth: data.revenue_growth,
      averageOrderValue: data.avg_order_value,
      topProducts: topProducts,
      currency: currency
    };
  }

  private static async calculatePlatformMetrics(
    currency: CurrencyCode,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<PlatformMetrics> {
    const results = await sql`
      SELECT 
        total_users,
        active_users,
        user_growth,
        business_growth,
        program_growth,
        total_revenue,
        revenue_growth,
        transaction_volume,
        avg_user_value
      FROM platform_analytics
      WHERE period_type = ${period}
      ORDER BY period_start DESC
      LIMIT 1
    `;

    if (results.length === 0) {
      throw new Error(`No platform metrics found for period ${period}`);
    }

    const data = results[0] as DatabaseRow;
    return {
      totalUsers: data.total_users,
      activeUsers: data.active_users,
      userGrowth: data.user_growth,
      businessGrowth: data.business_growth,
      programGrowth: data.program_growth,
      totalRevenue: data.total_revenue,
      revenueGrowth: data.revenue_growth,
      transactionVolume: data.transaction_volume,
      averageUserValue: data.avg_user_value,
      currency: currency
    };
  }

  private static async analyzeRegionalPerformance(
    currency: CurrencyCode,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<RegionalPerformance[]> {
    // Get regional data
    const regionResults = await sql`
      SELECT 
        region,
        businesses,
        customers,
        revenue,
        business_growth,
        customer_growth,
        revenue_growth
      FROM regional_analytics
      WHERE period_type = ${period}
      ORDER BY revenue DESC
    `;
    
    // Get top programs by region
    const topProgramsResults = await sql`
      SELECT 
        region,
        program_id,
        program_name,
        customers,
        revenue
      FROM regional_top_programs
      WHERE period_type = ${period}
      ORDER BY region, revenue DESC
    `;

    // Group top programs by region
    const topProgramsByRegion: Record<string, any[]> = {};
    
    topProgramsResults.forEach((row: TopProgramRow) => {
      if (!topProgramsByRegion[row.region]) {
        topProgramsByRegion[row.region] = [];
      }
      
      topProgramsByRegion[row.region].push({
        programId: row.program_id,
        programName: row.program_name,
        customers: row.customers,
        revenue: row.revenue
      });
    });
    
    return regionResults.map((row: RegionRow) => ({
      region: row.region,
      businesses: row.businesses,
      customers: row.customers,
      revenue: row.revenue,
      topPrograms: topProgramsByRegion[row.region] || [],
      growth: {
        businesses: row.business_growth,
        customers: row.customer_growth,
        revenue: row.revenue_growth
      },
      currency: currency
    }));
  }

  private static async calculateUserEngagement(
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<UserEngagement> {
    // Get user engagement data
    const engagementResults = await sql`
      SELECT 
        daily_active_users,
        monthly_active_users,
        avg_session_duration
      FROM user_engagement
      WHERE period_type = ${period}
      ORDER BY period_start DESC
      LIMIT 1
    `;
    
    if (engagementResults.length === 0) {
      throw new Error(`No user engagement data found for period ${period}`);
    }
    
    // Get feature interactions
    const featureResults = await sql`
      SELECT 
        feature_name,
        interaction_count
      FROM feature_interactions
      WHERE period_type = ${period}
      ORDER BY interaction_count DESC
    `;
    
    // Get retention data
    const retentionResults = await sql`
      SELECT 
        day_number,
        retention_rate
      FROM retention_data
      WHERE period_type = ${period}
      ORDER BY day_number ASC
    `;

    const data = engagementResults[0] as DatabaseRow;
    
    // Convert feature results to record
    const interactionsByFeature: Record<string, number> = {};
    featureResults.forEach((row: FeatureRow) => {
      interactionsByFeature[row.feature_name] = row.interaction_count;
    });
    
    // Extract retention rates by day
    const retentionByDay: number[] = retentionResults.map((row: DatabaseRow) => row.retention_rate * 100);
    
    // Get top features sorted by interaction count
    const topFeatures = featureResults
      .sort((a: FeatureRow, b: FeatureRow) => b.interaction_count - a.interaction_count)
      .map((row: FeatureRow) => row.feature_name);
    
    return {
      dailyActiveUsers: data.daily_active_users,
      monthlyActiveUsers: data.monthly_active_users,
      averageSessionDuration: data.avg_session_duration,
      interactionsByFeature,
      retentionByDay,
      topFeatures
    };
  }

  private static async getBusinessPeriodComparison(
    businessId: string,
    period: 'day' | 'week' | 'month' | 'year'
  ) {
    const results = await sql`
      SELECT 
        active_customers,
        total_revenue,
        transactions,
        redemptions
      FROM business_analytics
      WHERE business_id = ${parseInt(businessId)}
      AND period_type = ${period}
      ORDER BY period_start DESC
      LIMIT 1
    `;

    if (results.length === 0) {
      throw new Error(`No comparison data found for business ID ${businessId} and period ${period}`);
    }

    const data = results[0] as DatabaseRow;
    return {
      customers: data.active_customers,
      revenue: data.total_revenue,
      transactions: data.transactions,
      redemptions: data.redemptions
    };
  }

  private static async getPlatformPeriodComparison(
    period: 'day' | 'week' | 'month' | 'year'
  ) {
    const results = await sql`
      SELECT 
        total_users,
        total_revenue,
        transaction_volume
      FROM platform_analytics
      WHERE period_type = ${period}
      ORDER BY period_start DESC
      LIMIT 1
    `;
    
    if (results.length === 0) {
      throw new Error(`No platform comparison data found for period ${period}`);
    }
    
    // Get total businesses
    const businessResults = await sql`
      SELECT COUNT(*) as total_businesses
      FROM users
      WHERE user_type = 'business'
    `;

    const data = results[0] as DatabaseRow;
    const businessCount = businessResults[0].total_businesses || 0;
    
    return {
      users: data.total_users,
      businesses: businessCount,
      revenue: data.total_revenue,
      programsCreated: Math.floor(businessCount * 1.5) // Estimate 1.5 programs per business
    };
  }
} 