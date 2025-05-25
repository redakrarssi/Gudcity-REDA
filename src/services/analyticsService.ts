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

// Mock data - replace with actual API calls in production
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
    const retention = await this.calculateRetentionMetrics(businessId, period);
    const performance = await this.calculateProgramPerformance(businessId, currency);
    const segments = await this.analyzeCustomerSegments(businessId);
    const revenue = await this.analyzeRevenue(businessId, currency);
    const comparison = await this.getBusinessPeriodComparison(businessId, period);

    return {
      retention,
      programPerformance: performance,
      customerSegments: segments,
      revenue,
      periodComparison: comparison
    };
  }

  static async getAdminAnalytics(
    currency: CurrencyCode,
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<AdminAnalytics> {
    const platform = await this.calculatePlatformMetrics(currency);
    const regional = await this.analyzeRegionalPerformance(currency);
    const engagement = await this.calculateUserEngagement();
    const comparison = await this.getPlatformPeriodComparison(period);

    return {
      platform,
      regional,
      engagement,
      periodComparison: comparison
    };
  }

  private static async calculateRetentionMetrics(
    businessId: string,
    period: 'day' | 'week' | 'month' | 'year'
  ): Promise<RetentionMetrics> {
    // Mock data - in production this would fetch from an API
    return {
      activeCustomers: 1248,
      churnRate: 0.05,
      repeatVisitRate: 0.68,
      averageVisitFrequency: 2.3,
      customerLifetimeValue: 342.5
    };
  }

  private static async calculateProgramPerformance(
    businessId: string,
    currency: CurrencyCode
  ): Promise<ProgramPerformance[]> {
    // Mock data - in production this would fetch from an API
    const mockPrograms = [
      {
        programId: '1',
        programName: 'Coffee Club',
        activeCustomers: 450,
        redemptionRate: 0.28,
        averagePointsPerCustomer: 187
      },
      {
        programId: '2',
        programName: 'Lunch Rewards',
        activeCustomers: 320,
        redemptionRate: 0.35,
        averagePointsPerCustomer: 145
      },
      {
        programId: '3',
        programName: 'Weekend Special',
        activeCustomers: 280,
        redemptionRate: 0.18,
        averagePointsPerCustomer: 95
      }
    ];

    return mockPrograms;
  }

  private static async analyzeCustomerSegments(
    businessId: string
  ): Promise<CustomerSegment[]> {
    // Mock data - in production this would fetch from an API
    return [
      { name: 'Frequent', size: 320, averageSpend: 75.50, loyaltyScore: 8.7 },
      { name: 'Regular', size: 480, averageSpend: 45.75, loyaltyScore: 6.4 },
      { name: 'Occasional', size: 650, averageSpend: 28.25, loyaltyScore: 4.2 },
      { name: 'New', size: 230, averageSpend: 32.80, loyaltyScore: 3.5 }
    ];
  }

  private static async analyzeRevenue(
    businessId: string,
    currency: CurrencyCode
  ): Promise<RevenueAnalysis> {
    // Mock data - in production this would fetch from an API
    const mockTopProducts = [
      { name: 'Product A', revenue: 12450, quantity: 458 },
      { name: 'Product B', revenue: 9870, quantity: 354 },
      { name: 'Product C', revenue: 8540, quantity: 287 },
      { name: 'Product D', revenue: 6790, quantity: 198 },
      { name: 'Product E', revenue: 4320, quantity: 145 }
    ];

    return {
      totalRevenue: 45870,
      revenueGrowth: 0.12,
      topProducts: mockTopProducts
    };
  }

  private static async calculatePlatformMetrics(
    currency: CurrencyCode
  ): Promise<PlatformMetrics> {
    // Mock data - in production this would fetch from an API
    return {
      totalUsers: MOCK_DATA.users.total,
      activeUsers: MOCK_DATA.users.active,
      userGrowth: MOCK_DATA.users.growth,
      businessGrowth: MOCK_DATA.businesses.growth,
      totalRevenue: MOCK_DATA.revenue.total,
      revenueGrowth: MOCK_DATA.revenue.growth,
      averageUserValue: MOCK_DATA.revenue.total / MOCK_DATA.users.active,
      transactionVolume: MOCK_DATA.transactions.volume
    };
  }

  private static async analyzeRegionalPerformance(
    currency: CurrencyCode
  ): Promise<RegionalPerformance[]> {
    // Mock data - in production this would fetch from an API
    return [
      { region: 'North America', customers: 8500, businesses: 450, revenue: 425000 },
      { region: 'Europe', customers: 6400, businesses: 380, revenue: 385000 },
      { region: 'Middle East', customers: 5200, businesses: 310, revenue: 265000 },
      { region: 'Asia Pacific', customers: 3800, businesses: 280, revenue: 185000 },
      { region: 'Africa', customers: 2100, businesses: 210, revenue: 95000 }
    ];
  }

  private static async calculateUserEngagement(): Promise<UserEngagement> {
    // Mock data - in production this would fetch from an API
    const interactionsByFeature = {
      'loyalty-programs': 1200,
      'rewards-redemption': 800,
      'qr-scanning': 600,
      'promo-codes': 400
    };

    const retentionByDay = Array(7).fill(0).map((_, i) => 100 - i * 10);

    return {
      dailyActiveUsers: 12500,
      monthlyActiveUsers: MOCK_DATA.users.active,
      averageSessionDuration: 300, // 5 minutes in seconds
      interactionsByFeature,
      retentionByDay,
      topFeatures: Object.entries(interactionsByFeature)
        .sort(([, a], [, b]) => b - a)
        .map(([feature]) => feature)
    };
  }

  private static async getBusinessPeriodComparison(
    businessId: string,
    period: 'day' | 'week' | 'month' | 'year'
  ) {
    // Mock data - in production this would fetch from an API
    return {
      customers: 1248,
      revenue: 12876,
      transactions: 384,
      redemptions: 87
    };
  }

  private static async getPlatformPeriodComparison(
    period: 'day' | 'week' | 'month' | 'year'
  ) {
    // Mock data - in production this would fetch from an API
    return {
      users: 24521,
      businesses: 1845,
      revenue: 1248500,
      programsCreated: 320
    };
  }
} 