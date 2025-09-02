import type { CurrencyCode } from './currency';

export interface RetentionMetrics {
  period: 'day' | 'week' | 'month' | 'year';
  activeCustomers: number;
  churnRate: number;
  repeatVisitRate: number;
  averageVisitFrequency: number;
  customerLifetimeValue: number;
}

export interface ProgramPerformance {
  programId: string;
  programName: string;
  totalCustomers: number;
  activeCustomers: number;
  pointsIssued: number;
  pointsRedeemed: number;
  redemptionRate: number;
  averageTransactionValue: number;
  revenue: number;
  currency: CurrencyCode;
}

export interface CustomerSegment {
  name: string;
  size: number;
  averageSpend: number;
  visitFrequency: number;
  preferredPrograms: string[];
  loyaltyScore: number;
}

export interface RevenueAnalysis {
  totalRevenue: number;
  revenueGrowth: number;
  averageOrderValue: number;
  topProducts: Array<{
    name: string;
    revenue: number;
    quantity: number;
  }>;
  currency: CurrencyCode;
}

export interface BusinessPeriodComparison {
  customers: number;
  revenue: number;
  transactions: number;
  redemptions: number;
}

export interface BusinessAnalytics {
  retention: RetentionMetrics;
  programPerformance: ProgramPerformance[];
  customerSegments: CustomerSegment[];
  revenue: RevenueAnalysis;
  periodComparison?: BusinessPeriodComparison;
  isMockData?: boolean;
}

export interface PlatformMetrics {
  totalUsers: number;
  activeUsers: number;
  userGrowth: number;
  businessGrowth: number;
  programGrowth: number;
  totalRevenue: number;
  revenueGrowth: number;
  transactionVolume: number;
  averageUserValue: number;
  currency: CurrencyCode;
}

export interface RegionalPerformance {
  region: string;
  businesses: number;
  customers: number;
  revenue: number;
  topPrograms: Array<{
    programId: string;
    programName: string;
    customers: number;
    revenue: number;
  }>;
  growth: {
    businesses: number;
    customers: number;
    revenue: number;
  };
  currency: CurrencyCode;
}

export interface UserEngagement {
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionDuration: number;
  interactionsByFeature: Record<string, number>;
  retentionByDay: number[];
  topFeatures: string[];
}

export interface AdminAnalytics {
  platform: PlatformMetrics;
  regional: RegionalPerformance[];
  engagement: UserEngagement;
  periodComparison: {
    users: number;
    businesses: number;
    revenue: number;
    programsCreated: number;
  };
  isMockData?: boolean;
} 