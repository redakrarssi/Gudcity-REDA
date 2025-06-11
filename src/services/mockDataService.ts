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

/**
 * Provides mock business analytics data when database queries fail
 * @param businessId The ID of the business
 * @param currency The currency to use for monetary values
 * @returns Mock business analytics data
 */
export function getMockBusinessAnalytics(
  businessId: string,
  currency: CurrencyCode
): BusinessAnalytics {
  // Create mock business analytics
  const mockData: BusinessAnalytics = {
    retention: {
      period: 'month',
      activeCustomers: 1248,
      churnRate: 0.05,
      repeatVisitRate: 0.68,
      averageVisitFrequency: 2.3,
      customerLifetimeValue: 342.5
    },
    programPerformance: [
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
    ],
    customerSegments: [
      { name: 'Frequent', size: 320, averageSpend: 75.50, visitFrequency: 4.2, preferredPrograms: ['Coffee Club', 'Lunch Rewards', 'Weekend Special'], loyaltyScore: 8.7 },
      { name: 'Regular', size: 480, averageSpend: 45.75, visitFrequency: 2.1, preferredPrograms: ['Lunch Rewards', 'Coffee Club'], loyaltyScore: 6.4 },
      { name: 'Occasional', size: 650, averageSpend: 28.25, visitFrequency: 1.0, preferredPrograms: ['Happy Hour', 'Weekend Special'], loyaltyScore: 4.2 },
      { name: 'New', size: 230, averageSpend: 32.80, visitFrequency: 0.5, preferredPrograms: ['Welcome Bonus'], loyaltyScore: 3.5 }
    ],
    revenue: {
      totalRevenue: 18625,
      revenueGrowth: 0.12,
      averageOrderValue: 24.75,
      topProducts: [
        { name: 'Espresso', revenue: 5250, quantity: 1050 },
        { name: 'Latte', revenue: 4200, quantity: 700 },
        { name: 'Lunch Combo', revenue: 3750, quantity: 250 },
        { name: 'Pastry', revenue: 3000, quantity: 600 },
        { name: 'Cold Brew', revenue: 2425, quantity: 485 }
      ],
      currency
    },
    periodComparison: {
      customers: 0.08,
      revenue: 0.12,
      transactions: 0.15,
      redemptions: 0.18
    },
    isMockData: true // Flag indicating this is mock data
  };
  
  return mockData;
}

/**
 * Provides mock admin analytics data when database queries fail
 * @param currency The currency to use for monetary values
 * @returns Mock admin analytics data
 */
export function getMockAdminAnalytics(currency: CurrencyCode): AdminAnalytics {
  return {
    platform: {
      totalUsers: MOCK_DATA.users.total,
      activeUsers: MOCK_DATA.users.active,
      userGrowth: MOCK_DATA.users.growth,
      businessGrowth: MOCK_DATA.businesses.growth,
      programGrowth: 0.095,
      totalRevenue: MOCK_DATA.revenue.total,
      revenueGrowth: MOCK_DATA.revenue.growth,
      transactionVolume: MOCK_DATA.transactions.volume,
      averageUserValue: MOCK_DATA.revenue.total / MOCK_DATA.users.active,
      currency: currency
    },
    regional: [
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
      },
      { 
        region: 'Middle East', 
        businesses: 310, 
        customers: 5200, 
        revenue: 265000,
        topPrograms: [
          { programId: '3', programName: 'Weekend Specials', customers: 2200, revenue: 95000 }
        ],
        growth: { businesses: 0.09, customers: 0.14, revenue: 0.16 },
        currency: currency
      },
      { 
        region: 'Asia Pacific', 
        businesses: 280, 
        customers: 3800, 
        revenue: 185000,
        topPrograms: [
          { programId: '4', programName: 'Loyalty Points', customers: 1800, revenue: 75000 }
        ],
        growth: { businesses: 0.11, customers: 0.15, revenue: 0.18 },
        currency: currency
      },
      { 
        region: 'Africa', 
        businesses: 210, 
        customers: 2100, 
        revenue: 95000,
        topPrograms: [
          { programId: '5', programName: 'Points Program', customers: 950, revenue: 35000 }
        ],
        growth: { businesses: 0.14, customers: 0.18, revenue: 0.21 },
        currency: currency
      }
    ],
    engagement: {
      dailyActiveUsers: 12500,
      monthlyActiveUsers: MOCK_DATA.users.active,
      averageSessionDuration: 300, // 5 minutes in seconds
      interactionsByFeature: {
        'loyalty-programs': 1200,
        'rewards-redemption': 800,
        'qr-scanning': 600,
        'promo-codes': 400,
        'customer-dashboard': 350,
        'business-analytics': 300,
        'profile-management': 250,
        'payment-processing': 200
      },
      retentionByDay: [100, 80, 65, 55, 48, 44, 42],
      topFeatures: ['loyalty-programs', 'rewards-redemption', 'qr-scanning', 'promo-codes']
    },
    periodComparison: {
      users: MOCK_DATA.users.total,
      businesses: MOCK_DATA.businesses.total,
      revenue: MOCK_DATA.revenue.total,
      programsCreated: 320
    },
    isMockData: true // Flag indicating this is mock data
  };
} 