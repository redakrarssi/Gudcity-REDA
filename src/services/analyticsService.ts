import { CurrencyService } from './currencyService';
import { AnalyticsDbService } from './analyticsDbService';
import sql, { ConnectionState, getConnectionState, isConnected, forceReconnect, SqlRow } from '../utils/db';
import { validateBusinessId, validatePeriod, validateCurrencyCode } from '../utils/sqlSafety';
import { executeWithFallback, validateAnalyticsInputs } from './queryUtilities';
import { getMockBusinessAnalytics, getMockAdminAnalytics } from './mockDataService';
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

// Mock data - used as fallback if database queries fail
const MOCK_DATA = {
  users: {
    total: 24521,
    active: 18349,
    growth: 0.125
  },
  businesses: {
    total: 1845,
    active: 1523,
    growth: 0.072
  },
  revenue: {
    total: 1248500,
    growth: 0.18
  },
  transactions: {
    volume: 78432,
    growth: 0.073
  }
};

export class AnalyticsService {
  static async getBusinessAnalytics(
    businessId: string,
    currency: CurrencyCode,
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<BusinessAnalytics> {
    try {
      // Validate inputs using the utility
      const { validatedId, validatedCurrency, validatedPeriod } = 
        validateAnalyticsInputs(businessId, currency, period);
      
      if (!validatedId) {
        throw new Error('Invalid business ID');
      }
      
      console.log(`Fetching business analytics for business ID: ${validatedId}, currency: ${validatedCurrency}, period: ${validatedPeriod}`);
      
      // If database is currently not connected, try to reconnect
      if (!isConnected()) {
        console.log('Database not connected. Attempting to reconnect...');
        forceReconnect();
        
        // Wait a bit for reconnection attempt
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // If still not connected, use mock data
        if (!isConnected()) {
          console.log('Could not reconnect to database. Using mock data.');
          return getMockBusinessAnalytics(validatedId, validatedCurrency);
        }
      }
      
      // Try to fetch from database with fallback to mock data if needed
      return executeWithFallback(
        async () => {
          const data = await AnalyticsDbService.getBusinessAnalytics(validatedId, validatedCurrency, validatedPeriod);
          console.log('Successfully retrieved business analytics from database');
          return data;
        },
        getMockBusinessAnalytics(validatedId, validatedCurrency),
        'Error getting business analytics from database'
      );
    } catch (error) {
      console.error('Unexpected error in getBusinessAnalytics:', error);
      
      // If it's a validation error, propagate it upward
      if (error instanceof Error && 
          (error.message.includes('ID') || 
           error.message.includes('currency') || 
           error.message.includes('period'))) {
        throw error;
      }
      
      // Otherwise use mock data as a fallback
      return getMockBusinessAnalytics(businessId, currency);
    }
  }

  static async getAdminAnalytics(
    currency: CurrencyCode,
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<AdminAnalytics> {
    try {
      // Validate inputs using the utility
      const { validatedCurrency, validatedPeriod } = 
        validateAnalyticsInputs(undefined, currency, period);
      
      console.log(`Fetching admin analytics, currency: ${validatedCurrency}, period: ${validatedPeriod}`);
      
      // If database is currently not connected, try to reconnect
      if (!isConnected()) {
        console.log('Database not connected. Attempting to reconnect...');
        forceReconnect();
        
        // Wait a bit for reconnection attempt
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // If still not connected, use mock data
        if (!isConnected()) {
          console.log('Could not reconnect to database. Using mock data.');
          return getMockAdminAnalytics(validatedCurrency);
        }
      }
      
      // Try to fetch from database with fallback to mock data if needed
      return executeWithFallback(
        async () => {
          const data = await AnalyticsDbService.getAdminAnalytics(validatedCurrency, validatedPeriod);
          console.log('Successfully retrieved admin analytics from database');
          // Mark as real database data, not mock data
          return { ...data, isMockData: false };
        },
        getMockAdminAnalytics(validatedCurrency),
        'Error getting admin analytics from database'
      );
    } catch (error) {
      console.error('Unexpected error in getAdminAnalytics:', error);
      
      // If it's a validation error, propagate it upward
      if (error instanceof Error && 
          (error.message.includes('currency') || 
           error.message.includes('period'))) {
        throw error;
      }
      
      // Otherwise use mock data as a fallback
      return getMockAdminAnalytics(currency);
    }
  }

  private static async calculateRetentionMetrics(
    businessId: string,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<RetentionMetrics> {
    try {
      const results = await sql`
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

      if (results.length > 0) {
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
      
      // Fallback to mock data if no results
      return {
        period: period,
        activeCustomers: 1248,
        churnRate: 0.05,
        repeatVisitRate: 0.68,
        averageVisitFrequency: 2.3,
        customerLifetimeValue: 342.5
      };
    } catch (error) {
      console.error('Error fetching retention metrics:', error);
      throw error;
    }
  }

  private static async calculateProgramPerformance(
    businessId: string,
    currency: CurrencyCode,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<ProgramPerformance[]> {
    try {
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
        WHERE business_id = ${businessId}
        AND period_type = ${period}
        ORDER BY active_customers DESC
      `;

      if (results.length > 0) {
        return results.map((row: SqlRow) => ({
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
      
      // Fallback to mock data if no results
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
          currency: currency
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
          currency: currency
        }
      ];
    } catch (error) {
      console.error('Error fetching program performance:', error);
      throw error;
    }
  }

  private static async analyzeCustomerSegments(
    businessId: string,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<CustomerSegment[]> {
    try {
      const results = await sql`
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

      // Define interface for program preference results
      interface ProgramPreference extends SqlRow {
        segment_id: number;
        program_name: string;
        engagement_score: number;
      }

      // Define interface for segment results
      interface CustomerSegmentRow extends SqlRow {
        id: number;
        segment_name: string;
        segment_size: number;
        avg_spend: number;
        visit_frequency: number;
        loyalty_score: number;
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
      const [segmentResults, programPreferences] = await Promise.all([
        results,
        programPreferencesQuery
      ]);
      
      // Cast the results to the correct types
      const segments = segmentResults as CustomerSegmentRow[];
      
      if (segments.length > 0) {
        // Group program preferences by segment_id
        const programsBySegment: Record<number, string[]> = {};
        for (const row of programPreferences) {
          const segmentId = Number(row.segment_id);
          if (!programsBySegment[segmentId]) {
            programsBySegment[segmentId] = [];
          }
          programsBySegment[segmentId].push(row.program_name);
        }
        
        return segments.map(row => {
          return {
            name: row.segment_name,
            size: row.segment_size,
            averageSpend: row.avg_spend,
            visitFrequency: row.visit_frequency,
            preferredPrograms: programsBySegment[row.id] || [],
            loyaltyScore: row.loyalty_score
          };
        });
      }
      
      // Fallback to mock data if no results
      return [
        { name: 'Frequent', size: 320, averageSpend: 75.50, visitFrequency: 4.2, preferredPrograms: ['Coffee Club', 'Lunch Rewards', 'Weekend Special'], loyaltyScore: 8.7 },
        { name: 'Regular', size: 480, averageSpend: 45.75, visitFrequency: 2.1, preferredPrograms: ['Lunch Rewards', 'Coffee Club'], loyaltyScore: 6.4 },
        { name: 'Occasional', size: 650, averageSpend: 28.25, visitFrequency: 1.0, preferredPrograms: ['Happy Hour', 'Weekend Special'], loyaltyScore: 4.2 },
        { name: 'New', size: 230, averageSpend: 32.80, visitFrequency: 0.5, preferredPrograms: ['Welcome Bonus'], loyaltyScore: 3.5 }
      ];
    } catch (error) {
      console.error('Error fetching customer segments:', error);
      throw error;
    }
  }

  private static async analyzeRevenue(
    businessId: string,
    currency: CurrencyCode,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<RevenueAnalysis> {
    try {
      // Get main revenue metrics
      const revenueResults = await sql`
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
      
      // Get top products
      const productsResults = await sql`
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

      if (revenueResults.length > 0) {
        const data = revenueResults[0];
        
        const topProducts = productsResults.map(row => ({
          name: row.product_name,
          revenue: row.revenue,
          quantity: row.quantity
        }));
        
        return {
          totalRevenue: data.total_revenue,
          revenueGrowth: data.revenue_growth,
          averageOrderValue: data.avg_order_value,
          topProducts: topProducts,
          currency: currency
        };
      }
      
      // Fallback to mock data if no results
      return {
        totalRevenue: 45870,
        revenueGrowth: 0.12,
        averageOrderValue: 35.75,
        topProducts: [
          { name: 'Product A', revenue: 12450, quantity: 458 },
          { name: 'Product B', revenue: 9870, quantity: 354 },
          { name: 'Product C', revenue: 8540, quantity: 287 }
        ],
        currency: currency
      };
    } catch (error) {
      console.error('Error fetching revenue analysis:', error);
      throw error;
    }
  }

  private static async calculatePlatformMetrics(
    currency: CurrencyCode,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<PlatformMetrics> {
    try {
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

      if (results.length > 0) {
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
      
      // Fallback to mock data if no results
      return {
        totalUsers: 24521,
        activeUsers: 18349,
        userGrowth: 0.125,
        businessGrowth: 0.072,
        programGrowth: 0.095,
        totalRevenue: 1248500,
        revenueGrowth: 0.18,
        transactionVolume: 78432,
        averageUserValue: 68.04,
        currency: currency
      };
    } catch (error) {
      console.error('Error fetching platform metrics:', error);
      throw error;
    }
  }

  private static async analyzeRegionalPerformance(
    currency: CurrencyCode,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<RegionalPerformance[]> {
    try {
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

      if (regionResults.length > 0) {
        // Group top programs by region
        const topProgramsByRegion: Record<string, any[]> = {};
        
        topProgramsResults.forEach(row => {
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
        
        return regionResults.map(row => ({
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
      
      // Fallback to mock data if no results
      return [
        { 
          region: 'North America', 
          businesses: 450, 
          customers: 8500, 
          revenue: 425000,
          topPrograms: [
            { programId: '1', programName: 'Coffee Rewards', customers: 3200, revenue: 125000 }
          ],
          growth: { businesses: 0.08, customers: 0.12, revenue: 0.15 },
          currency: currency
        },
        { 
          region: 'Europe', 
          businesses: 380, 
          customers: 6400, 
          revenue: 385000,
          topPrograms: [
            { programId: '2', programName: 'Lunch Specials', customers: 2800, revenue: 115000 }
          ],
          growth: { businesses: 0.06, customers: 0.09, revenue: 0.11 },
          currency: currency
        }
      ];
    } catch (error) {
      console.error('Error fetching regional performance:', error);
      throw error;
    }
  }

  private static async calculateUserEngagement(
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<UserEngagement> {
    try {
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

      if (engagementResults.length > 0) {
        const data = engagementResults[0];
        
        // Convert feature results to record
        const interactionsByFeature: Record<string, number> = {};
        featureResults.forEach(row => {
          interactionsByFeature[row.feature_name] = row.interaction_count;
        });
        
        // Extract retention rates by day
        const retentionByDay: number[] = retentionResults.map(row => row.retention_rate * 100);
        
        // Get top features sorted by interaction count
        const topFeatures = featureResults
          .sort((a, b) => b.interaction_count - a.interaction_count)
          .map(row => row.feature_name);
        
        return {
          dailyActiveUsers: data.daily_active_users,
          monthlyActiveUsers: data.monthly_active_users,
          averageSessionDuration: data.avg_session_duration,
          interactionsByFeature,
          retentionByDay,
          topFeatures
        };
      }
      
      // Fallback to mock data if no results
      const interactionsByFeature = {
        'loyalty-programs': 1200,
        'rewards-redemption': 800,
        'qr-scanning': 600,
        'promo-codes': 400
      };
      
      return {
        dailyActiveUsers: 12500,
        monthlyActiveUsers: 18349,
        averageSessionDuration: 300,
        interactionsByFeature,
        retentionByDay: [100, 80, 65, 55, 48, 44, 42],
        topFeatures: Object.entries(interactionsByFeature)
          .sort(([, a], [, b]) => b - a)
          .map(([feature]) => feature)
      };
    } catch (error) {
      console.error('Error fetching user engagement:', error);
      throw error;
    }
  }

  private static async getBusinessPeriodComparison(
    businessId: string,
    period: 'day' | 'week' | 'month' | 'year'
  ) {
    try {
      const results = await sql`
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

      if (results.length > 0) {
        const data = results[0];
        return {
          customers: data.active_customers,
          revenue: data.total_revenue,
          transactions: data.transactions,
          redemptions: data.redemptions
        };
      }
      
      // Fallback to mock data if no results
      return {
        customers: 1248,
        revenue: 12876,
        transactions: 384,
        redemptions: 87
      };
    } catch (error) {
      console.error('Error fetching business period comparison:', error);
      throw error;
    }
  }

  private static async getPlatformPeriodComparison(
    period: 'day' | 'week' | 'month' | 'year'
  ) {
    try {
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
      
      // Get total businesses
      const businessResults = await sql`
        SELECT COUNT(*) as total_businesses
        FROM users
        WHERE user_type = 'business'
      `;

      if (results.length > 0 && businessResults.length > 0) {
        const data = results[0];
        const businessCount = businessResults[0].total_businesses || 0;
        
        return {
          users: data.total_users,
          businesses: businessCount,
          revenue: data.total_revenue,
          programsCreated: Math.floor(businessCount * 1.5) // Estimate 1.5 programs per business
        };
      }
      
      // Fallback to mock data if no results
      return {
        users: 24521,
        businesses: 1845,
        revenue: 1248500,
        programsCreated: 320
      };
    } catch (error) {
      console.error('Error fetching platform period comparison:', error);
      throw error;
    }
  }
} 