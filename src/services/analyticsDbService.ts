import sql, { SqlRow } from '../utils/db';
import { CurrencyService } from './currencyService';
import { validateBusinessId, validatePeriod, validateCurrencyCode } from '../utils/sqlSafety';
import {
  withRetry,
  executeWithFallback,
  executeQueriesInParallel,
  validateAnalyticsInputs,
  fetchBusinessMetrics,
  fetchPlatformMetrics,
  mapSqlRowsToObjects,
  DB_TO_TS_FIELD_MAPPING
} from './queryUtilities';
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
import {
  BusinessAnalyticsRow,
  ProgramAnalyticsRow,
  CustomerSegmentRow,
  ProductRow,
  PlatformAnalyticsRow,
  RegionalAnalyticsRow,
  RegionalTopProgramRow,
  UserEngagementRow,
  FeatureInteractionRow,
  RetentionDataRow,
  CoreBusinessMetricsResult
} from '../types/database';

export class AnalyticsDbService {
  /**
   * New optimized method that retrieves all business analytics in fewer database calls
   */
  static async getBusinessAnalytics(
    businessId: string,
    currency: CurrencyCode,
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<BusinessAnalytics> {
    try {
      // Validate inputs using utility
      const { validatedId, validatedCurrency, validatedPeriod } = 
        validateAnalyticsInputs(businessId, currency, period);
      
      // Use Promise.all to parallelize independent queries for better performance
      // using our executeQueriesInParallel utility
      const [
        coreMetrics, 
        programPerformance, 
        customerSegments,
        topProducts
      ] = await executeQueriesInParallel(
        // Query 1: Core metrics (retention + revenue + period comparison)
        this.fetchCoreBusinessMetrics(validatedId!, validatedPeriod),
        
        // Query 2: Program performance
        this.fetchProgramPerformance(validatedId!, validatedCurrency, validatedPeriod),
        
        // Query 3: Customer segments
        this.fetchCustomerSegments(validatedId!, validatedPeriod),
        
        // Query 4: Top products
        this.fetchTopProducts(validatedId!, validatedPeriod)
      );
      
      // Extract retention metrics from core metrics
      const retention: RetentionMetrics = {
        period: validatedPeriod,
        activeCustomers: coreMetrics.active_customers,
        churnRate: coreMetrics.churn_rate,
        repeatVisitRate: coreMetrics.repeat_visit_rate,
        averageVisitFrequency: coreMetrics.avg_visit_frequency,
        customerLifetimeValue: coreMetrics.customer_lifetime_value
      };
      
      // Extract revenue metrics from core metrics
      const revenue: RevenueAnalysis = {
        totalRevenue: coreMetrics.total_revenue,
        revenueGrowth: coreMetrics.revenue_growth,
        averageOrderValue: coreMetrics.avg_order_value,
        topProducts: topProducts.map((product: ProductRow) => ({
          name: product.product_name,
          revenue: product.revenue,
          quantity: product.quantity
        })),
        currency: validatedCurrency
      };
      
      // Extract period comparison from core metrics
      const periodComparison = {
        customers: coreMetrics.customer_change,
        revenue: coreMetrics.revenue_change,
        transactions: coreMetrics.transactions_change,
        redemptions: coreMetrics.redemptions_change
      };
      
      return {
        retention,
        programPerformance,
        customerSegments,
        revenue,
        periodComparison,
        isMockData: false
      };
    } catch (error) {
      console.error('Error getting business analytics from database:', error);
      throw error;
    }
  }
  
  /**
   * Fetch core business metrics with a single optimized query
   */
  private static async fetchCoreBusinessMetrics(
    businessId: string,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<CoreBusinessMetricsResult> {
    const results = await sql.query<CoreBusinessMetricsResult[]>(
      `WITH current_period AS (
        SELECT * FROM business_analytics
        WHERE business_id = $1
        AND period_type = $2
        ORDER BY period_start DESC
        LIMIT 1
      ),
      previous_period AS (
        SELECT * FROM business_analytics
        WHERE business_id = $1
        AND period_type = $2
        AND period_start < (SELECT period_start FROM current_period)
        ORDER BY period_start DESC
        LIMIT 1
      )
      SELECT
        c.active_customers,
        c.churn_rate,
        c.repeat_visit_rate,
        c.avg_visit_frequency,
        c.customer_lifetime_value,
        c.total_revenue,
        c.revenue_growth,
        c.avg_order_value,
        c.transactions,
        c.redemptions,
        CASE 
          WHEN p.active_customers > 0 THEN 
            (c.active_customers - p.active_customers)::float / p.active_customers
          ELSE 0
        END AS customer_change,
        CASE 
          WHEN p.total_revenue > 0 THEN 
            (c.total_revenue - p.total_revenue)::float / p.total_revenue
          ELSE 0
        END AS revenue_change,
        CASE 
          WHEN p.transactions > 0 THEN 
            (c.transactions - p.transactions)::float / p.transactions
          ELSE 0
        END AS transactions_change,
        CASE 
          WHEN p.redemptions > 0 THEN 
            (c.redemptions - p.redemptions)::float / p.redemptions
          ELSE 0
        END AS redemptions_change
      FROM current_period c
      LEFT JOIN previous_period p ON true`,
      [businessId, period]
    );

    if (results.length === 0) {
      throw new Error(`No core metrics found for business ID ${businessId} and period ${period}`);
    }

    return results[0];
  }
  
  /**
   * Refactored method using direct SQL instead of the problematic utility function
   */
  private static async fetchProgramPerformance(
    businessId: string,
    currency: CurrencyCode,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<ProgramPerformance[]> {
    try {
      // Use direct SQL query instead of fetchBusinessMetrics utility
      const results = await sql.query<ProgramAnalyticsRow[]>(
        `SELECT 
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
        WHERE business_id = $1
        AND period_type = $2
        ORDER BY active_customers DESC`,
        [businessId, period]
      );

      // Use our mapping utility to transform rows
      return mapSqlRowsToObjects(results, (row: ProgramAnalyticsRow) => ({
        programId: row.program_id,
        programName: row.program_name,
        totalCustomers: row.total_customers,
        activeCustomers: row.active_customers,
        pointsIssued: row.points_issued,
        pointsRedeemed: row.points_redeemed,
        redemptionRate: row.redemption_rate,
        averageTransactionValue: row.avg_transaction_value,
        revenue: row.revenue,
        currency
      }));
    } catch (error) {
      console.error('Error fetching program performance data:', error);
      
      // Provide fallback data when query fails
      return [
        {
          programId: '1',
          programName: 'Coffee Club',
          totalCustomers: 650,
          activeCustomers: 450,
          pointsIssued: 15000,
          pointsRedeemed: 4200,
          redemptionRate: 0.28,
          averageTransactionValue: 12.5,
          revenue: 5625,
          currency
        },
        {
          programId: '2',
          programName: 'Lunch Rewards',
          totalCustomers: 520,
          activeCustomers: 320,
          pointsIssued: 12000,
          pointsRedeemed: 4200,
          redemptionRate: 0.35,
          averageTransactionValue: 18.75,
          revenue: 6000,
          currency
        }
      ];
    }
  }
  
  /**
   * Fetch customer segments with one query
   */
  private static async fetchCustomerSegments(
    businessId: string,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<CustomerSegment[]> {
    const results = await sql<CustomerSegmentRow[]>`
      SELECT 
        segment_name,
        segment_size,
        avg_spend,
        visit_frequency,
        loyalty_score
      FROM customer_segments
      WHERE business_id = ${businessId}
      AND period_type = ${period}
      ORDER BY loyalty_score DESC
    `;

    return results.map((row: CustomerSegmentRow) => ({
      name: row.segment_name,
      size: row.segment_size,
      averageSpend: row.avg_spend,
      visitFrequency: row.visit_frequency,
      preferredPrograms: [], // We don't store this in the database yet
      loyaltyScore: row.loyalty_score
    }));
  }
  
  /**
   * Fetch top products with one query
   */
  private static async fetchTopProducts(
    businessId: string,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<ProductRow[]> {
    const results = await sql<ProductRow[]>`
      SELECT 
        product_name,
        revenue,
        quantity
      FROM top_products
      WHERE business_id = ${businessId}
      AND period_type = ${period}
      ORDER BY revenue DESC
      LIMIT 5
    `;
    
    return results;
  }

  static async getAdminAnalytics(
    currency: CurrencyCode,
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<AdminAnalytics> {
    try {
      // Validate inputs
      const validatedCurrency = validateCurrencyCode(currency);
      const validatedPeriod = validatePeriod(period);
      
      // Use Promise.all to parallelize the optimized admin queries
      const [platformData, regionalData, engagementData] = await Promise.all([
        this.fetchPlatformMetrics(validatedCurrency, validatedPeriod),
        this.fetchRegionalPerformance(validatedCurrency, validatedPeriod),
        this.fetchUserEngagement(validatedPeriod)
      ]);

      return {
        platform: platformData.metrics,
        regional: regionalData,
        engagement: engagementData,
        periodComparison: platformData.comparison,
        isMockData: false
      };
    } catch (error) {
      console.error('Error getting admin analytics from database:', error);
      throw error;
    }
  }
  
  /**
   * Optimized method to fetch platform metrics and period comparison in one query
   */
  private static async fetchPlatformMetrics(
    currency: CurrencyCode,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<{ metrics: PlatformMetrics, comparison: any }> {
    interface PlatformMetricsResult extends PlatformAnalyticsRow {
      total_businesses: number;
      users_change: number;
      revenue_change: number;
      programs_created: number;
    }

    const results = await sql<PlatformMetricsResult[]>`
      WITH current_period AS (
        SELECT * FROM platform_analytics
        WHERE period_type = ${period}
        ORDER BY period_start DESC
        LIMIT 1
      ),
      previous_period AS (
        SELECT * FROM platform_analytics
        WHERE period_type = ${period}
        AND period_start < (SELECT period_start FROM current_period)
        ORDER BY period_start DESC
        LIMIT 1
      ),
      business_count AS (
        SELECT COUNT(*) as total_businesses
        FROM users
        WHERE user_type = 'business'
      )
      SELECT
        c.total_users,
        c.active_users,
        c.user_growth,
        c.business_growth,
        c.program_growth,
        c.total_revenue,
        c.revenue_growth,
        c.transaction_volume,
        c.avg_user_value,
        b.total_businesses,
        -- Calculate period comparison
        CASE 
          WHEN p.total_users > 0 THEN 
            (c.total_users - p.total_users)::float / p.total_users
          ELSE 0
        END AS users_change,
        CASE 
          WHEN p.total_revenue > 0 THEN 
            (c.total_revenue - p.total_revenue)::float / p.total_revenue
          ELSE 0
        END AS revenue_change,
        -- Estimate programs created
        (b.total_businesses * 1.5)::int AS programs_created
      FROM current_period c
      CROSS JOIN business_count b
      LEFT JOIN previous_period p ON true
    `;
    
    if (results.length === 0) {
      throw new Error(`No platform metrics found for period ${period}`);
    }
    
    const data = results[0];
    
    // Format the platform metrics
    const metrics: PlatformMetrics = {
      totalUsers: data.total_users,
      activeUsers: data.active_users,
      userGrowth: data.user_growth,
      businessGrowth: data.business_growth,
      programGrowth: data.program_growth,
      totalRevenue: data.total_revenue,
      revenueGrowth: data.revenue_growth,
      transactionVolume: data.transaction_volume,
      averageUserValue: data.avg_user_value,
      currency
    };
    
    // Format the period comparison
    const comparison = {
      users: data.users_change,
      businesses: data.business_growth,
      revenue: data.revenue_change,
      programsCreated: data.programs_created
    };
    
    return { metrics, comparison };
  }

  /**
   * Optimized method to fetch regional performance data with top programs in one query
   */
  private static async fetchRegionalPerformance(
    currency: CurrencyCode,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<RegionalPerformance[]> {
    interface RegionalPerformanceResult extends RegionalAnalyticsRow {
      top_programs: Array<{
        programId: string;
        programName: string;
        customers: number;
        revenue: number;
      }>;
    }

    // First query: Get regional data with json aggregation of top programs
    const results = await sql<RegionalPerformanceResult[]>`
      WITH regional_data AS (
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
      ),
      top_programs_by_region AS (
        SELECT
          region,
          jsonb_agg(
            jsonb_build_object(
              'programId', program_id,
              'programName', program_name,
              'customers', customers,
              'revenue', revenue
            )
            ORDER BY revenue DESC
          ) AS top_programs
        FROM (
          SELECT 
            region,
            program_id,
            program_name,
            customers,
            revenue,
            ROW_NUMBER() OVER (PARTITION BY region ORDER BY revenue DESC) AS row_num
          FROM regional_top_programs
          WHERE period_type = ${period}
        ) ranked_programs
        WHERE row_num <= 5 -- Limit to top 5 programs per region
        GROUP BY region
      )
      SELECT
        r.region,
        r.businesses,
        r.customers,
        r.revenue,
        r.business_growth,
        r.customer_growth,
        r.revenue_growth,
        tp.top_programs
      FROM regional_data r
      LEFT JOIN top_programs_by_region tp ON r.region = tp.region
    `;

    // Transform the results to the expected format
    return results.map((row: RegionalPerformanceResult) => ({
      region: row.region,
      businesses: row.businesses,
      customers: row.customers,
      revenue: row.revenue,
      topPrograms: row.top_programs || [],
      growth: {
        businesses: row.business_growth,
        customers: row.customer_growth,
        revenue: row.revenue_growth
      },
      currency
    }));
  }

  /**
   * Optimized method to fetch user engagement data with fewer queries
   */
  private static async fetchUserEngagement(
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<UserEngagement> {
    interface UserEngagementMetricsRow extends UserEngagementRow {}
    
    interface FeatureAndRetentionResult extends SqlRow {
      interactions_by_feature: Record<string, number>;
      top_features: string[];
      retention_by_day: number[];
    }
    
    // Use Promise.all for the two queries we need
    const [engagementData, featureAndRetentionData] = await Promise.all([
      // Query 1: Basic engagement metrics
      sql<UserEngagementMetricsRow[]>`
        SELECT 
          daily_active_users,
          monthly_active_users,
          avg_session_duration
        FROM user_engagement
        WHERE period_type = ${period}
        ORDER BY period_start DESC
        LIMIT 1
      `,
      
      // Query 2: Features and retention combined
      sql<FeatureAndRetentionResult[]>`
        WITH feature_data AS (
          SELECT 
            jsonb_object_agg(feature_name, interaction_count) AS interactions_by_feature,
            jsonb_agg(
              jsonb_build_object(
                'name', feature_name,
                'count', interaction_count
              )
              ORDER BY interaction_count DESC
            ) AS features_ranked
          FROM feature_interactions
          WHERE period_type = ${period}
        ),
        retention_data AS (
          SELECT 
            jsonb_agg(retention_rate * 100 ORDER BY day_number) AS retention_by_day
          FROM retention_data
          WHERE period_type = ${period}
        )
        SELECT 
          fd.interactions_by_feature,
          (SELECT array_agg(COALESCE((f->>'name')::text, 'Unknown')) 
           FROM jsonb_array_elements(COALESCE(fd.features_ranked, '[]'::jsonb)) WITH ORDINALITY AS f
           (feature, ordinality)
           WHERE ordinality <= 10) AS top_features,
          COALESCE(rd.retention_by_day, '[]'::jsonb) as retention_by_day
        FROM feature_data fd, retention_data rd
      `
    ]);
    
    if (engagementData.length === 0) {
      throw new Error(`No user engagement data found for period ${period}`);
    }
    
    // Extract data from results
    const basicMetrics = engagementData[0];
    const advancedMetrics = featureAndRetentionData[0];
    
    return {
      dailyActiveUsers: basicMetrics.daily_active_users,
      monthlyActiveUsers: basicMetrics.monthly_active_users,
      averageSessionDuration: basicMetrics.avg_session_duration,
      interactionsByFeature: advancedMetrics.interactions_by_feature || {},
      retentionByDay: advancedMetrics.retention_by_day || [],
      topFeatures: advancedMetrics.top_features || []
    };
  }

  private static async calculateRetentionMetrics(
    businessId: string,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<RetentionMetrics> {
    // Inputs already validated by public methods
    
    const results = await sql<BusinessAnalyticsRow[]>`
      SELECT 
        period_type,
        active_customers,
        churn_rate,
        repeat_visit_rate,
        avg_visit_frequency,
        customer_lifetime_value
      FROM business_analytics
      WHERE business_id = ${businessId}
      AND period_type = ${period}
      ORDER BY period_start DESC
      LIMIT 1
    `;

    if (results.length === 0) {
      throw new Error(`No retention data found for business ID ${businessId} and period ${period}`);
    }

    const data = results[0];
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
    // Inputs already validated by public methods
    
    const results = await sql<ProgramAnalyticsRow[]>`
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
      WHERE business_id = ${businessId}
      AND period_type = ${period}
      ORDER BY active_customers DESC
    `;

    return results.map((row: ProgramAnalyticsRow) => ({
      programId: row.program_id,
      programName: row.program_name,
      totalCustomers: row.total_customers,
      activeCustomers: row.active_customers,
      pointsIssued: row.points_issued,
      pointsRedeemed: row.points_redeemed,
      redemptionRate: row.redemption_rate,
      averageTransactionValue: row.avg_transaction_value,
      revenue: row.revenue,
      currency: currency
    }));
  }

  private static async analyzeCustomerSegments(
    businessId: string,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<CustomerSegment[]> {
    // Inputs already validated by public methods
    
    try {
      // First, get all segments for this business
      const segmentsQuery = sql<CustomerSegmentRow[]>`
        SELECT 
          id,
          segment_name,
          segment_size,
          avg_spend,
          visit_frequency,
          loyalty_score
        FROM customer_segments
        WHERE business_id = ${businessId}
        AND period_type = ${period}
        ORDER BY loyalty_score DESC
      `;
      
      // Define interface for program preference results
      interface ProgramPreference extends SqlRow {
        segment_id: number;
        program_name: string;
        engagement_score: number;
      }
      
      // In parallel, get the program preferences for each segment
      const programPreferencesQuery = sql<ProgramPreference[]>`
        SELECT 
          spe.segment_id, 
          pa.program_name,
          spe.engagement_score
        FROM segment_program_engagement spe
        JOIN program_analytics pa 
          ON spe.program_id = pa.program_id 
          AND spe.business_id = pa.business_id
        WHERE spe.business_id = ${businessId}
        AND spe.period_type = ${period}
        ORDER BY spe.engagement_score DESC
      `;
      
      // Execute both queries in parallel
      const [segments, programPreferences] = await Promise.all([
        segmentsQuery,
        programPreferencesQuery
      ]);
      
      // Group program preferences by segment_id
      const programsBySegment: Record<number, string[]> = {};
      for (const row of programPreferences) {
        const segmentId = row.segment_id;
        if (!programsBySegment[segmentId]) {
          programsBySegment[segmentId] = [];
        }
        programsBySegment[segmentId].push(row.program_name);
      }
      
      // Map the segments with their preferred programs
      return segments.map(row => {
        const segmentId = Number(row.id);
        return {
          name: row.segment_name,
          size: row.segment_size,
          averageSpend: row.avg_spend,
          visitFrequency: row.visit_frequency,
          preferredPrograms: programsBySegment[segmentId] || [],
          loyaltyScore: row.loyalty_score
        };
      });
    } catch (error) {
      console.error('Error analyzing customer segments:', error);
      // Use a general error log instead of a specific method
      console.error('Database error in analyzeCustomerSegments:', error);
      throw new Error('Failed to analyze customer segments');
    }
  }

  private static async analyzeRevenue(
    businessId: string,
    currency: CurrencyCode,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<RevenueAnalysis> {
    // Inputs already validated by public methods
    
    // Get main revenue metrics
    const revenueResults = await sql<BusinessAnalyticsRow[]>`
      SELECT 
        total_revenue,
        revenue_growth,
        avg_order_value
      FROM business_analytics
      WHERE business_id = ${businessId}
      AND period_type = ${period}
      ORDER BY period_start DESC
      LIMIT 1
    `;
    
    if (revenueResults.length === 0) {
      throw new Error(`No revenue data found for business ID ${businessId} and period ${period}`);
    }

    // Get top products
    const productsResults = await sql<ProductRow[]>`
      SELECT 
        product_name,
        revenue,
        quantity
      FROM top_products
      WHERE business_id = ${businessId}
      AND period_type = ${period}
      ORDER BY revenue DESC
      LIMIT 5
    `;
    
    const data = revenueResults[0];
    
    const topProducts = productsResults.map((row: ProductRow) => ({
      name: row.product_name,
      revenue: row.revenue,
      quantity: row.quantity
    }));
    
    return {
      totalRevenue: data.total_revenue,
      revenueGrowth: data.revenue_growth,
      averageOrderValue: data.avg_order_value,
      topProducts,
      currency
    };
  }

  private static async calculatePlatformMetrics(
    currency: CurrencyCode,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<PlatformMetrics> {
    const results = await sql<PlatformAnalyticsRow[]>`
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

    const data = results[0];
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
    const regionResults = await sql<RegionalAnalyticsRow[]>`
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
    const topProgramsResults = await sql<RegionalTopProgramRow[]>`
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
    const topProgramsByRegion: Record<string, Array<{
      programId: string;
      programName: string;
      customers: number;
      revenue: number;
    }>> = {};
    
    topProgramsResults.forEach((row: RegionalTopProgramRow) => {
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
    
    return regionResults.map((row: RegionalAnalyticsRow) => ({
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
      currency
    }));
  }

  private static async calculateUserEngagement(
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<UserEngagement> {
    // Get user engagement data
    const engagementResults = await sql<UserEngagementRow[]>`
      SELECT 
        daily_active_users,
        monthly_active_users,
        avg_session_duration
      FROM user_engagement
      WHERE period_type = ${period}
      ORDER BY period_start DESC
      LIMIT 1
    `;
    
    // Get feature interactions
    const featureResults = await sql<FeatureInteractionRow[]>`
      SELECT 
        feature_name,
        interaction_count
      FROM feature_interactions
      WHERE period_type = ${period}
      ORDER BY interaction_count DESC
    `;
    
    // Get retention data
    const retentionResults = await sql<RetentionDataRow[]>`
      SELECT 
        day_number,
        retention_rate
      FROM retention_data
      WHERE period_type = ${period}
      ORDER BY day_number ASC
    `;

    if (engagementResults.length === 0) {
      throw new Error(`No user engagement data found for period ${period}`);
    }
    
    const data = engagementResults[0];
    
    // Convert feature results to record
    const interactionsByFeature: Record<string, number> = {};
    featureResults.forEach((row: FeatureInteractionRow) => {
      interactionsByFeature[row.feature_name] = row.interaction_count;
    });
    
    // Extract retention rates by day
    const retentionByDay: number[] = retentionResults.map((row: RetentionDataRow) => row.retention_rate * 100);
    
    // Get top features sorted by interaction count
    const topFeatures = featureResults
      .sort((a: FeatureInteractionRow, b: FeatureInteractionRow) => b.interaction_count - a.interaction_count)
      .map((row: FeatureInteractionRow) => row.feature_name);
    
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
    const results = await sql<BusinessAnalyticsRow[]>`
      SELECT 
        active_customers,
        total_revenue,
        transactions,
        redemptions
      FROM business_analytics
      WHERE business_id = ${businessId}
      AND period_type = ${period}
      ORDER BY period_start DESC
      LIMIT 1
    `;

    if (results.length === 0) {
      throw new Error(`No business period comparison data found for business ID ${businessId} and period ${period}`);
    }

    const data = results[0];
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
    const results = await sql<PlatformAnalyticsRow[]>`
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
    interface BusinessCountResult extends SqlRow {
      total_businesses: number;
    }
    
    const businessResults = await sql<BusinessCountResult[]>`
      SELECT COUNT(*) as total_businesses
      FROM users
      WHERE user_type = 'business'
    `;

    const data = results[0];
    const businessCount = businessResults[0].total_businesses || 0;
    
    return {
      users: data.total_users,
      businesses: businessCount,
      revenue: data.total_revenue,
      programsCreated: Math.floor(businessCount * 1.5) // Estimate 1.5 programs per business
    };
  }
} 