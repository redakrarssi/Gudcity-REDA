/**
 * Type definitions for database rows and query results
 */
import { SqlRow } from '../utils/db';

/**
 * Database row types for analytics tables
 */

export interface BusinessAnalyticsRow extends SqlRow {
  business_id: string | number;
  period_type: 'day' | 'week' | 'month' | 'year';
  period_start: string | Date;
  active_customers: number;
  churn_rate: number;
  repeat_visit_rate: number;
  avg_visit_frequency: number;
  customer_lifetime_value: number;
  total_revenue: number;
  revenue_growth: number;
  avg_order_value: number;
  transactions: number;
  redemptions: number;
}

export interface ProgramAnalyticsRow extends SqlRow {
  business_id: string | number;
  program_id: string;
  program_name: string;
  period_type: 'day' | 'week' | 'month' | 'year';
  period_start: string | Date;
  total_customers: number;
  active_customers: number;
  points_issued: number;
  points_redeemed: number;
  redemption_rate: number;
  avg_transaction_value: number;
  revenue: number;
}

export interface CustomerSegmentRow extends SqlRow {
  business_id: string | number;
  period_type: 'day' | 'week' | 'month' | 'year';
  segment_name: string;
  segment_size: number;
  avg_spend: number;
  visit_frequency: number;
  loyalty_score: number;
}

/**
 * Intersection table for segment-program relationships
 */
export interface SegmentProgramRow extends SqlRow {
  segment_id: number;
  program_id: string;
  business_id: string | number;
  engagement_score: number;
  period_type: 'day' | 'week' | 'month' | 'year';
  period_start: string | Date;
}

/**
 * Individual customer analytics data
 */
export interface CustomerAnalyticsRow extends SqlRow {
  customer_id: string;
  business_id: string | number;
  segment_id: number;
  total_spent: number;
  visit_count: number;
  last_visit_date: string | Date;
  points_balance: number;
  loyalty_score: number;
}

export interface ProductRow extends SqlRow {
  business_id: string | number;
  period_type: 'day' | 'week' | 'month' | 'year';
  product_name: string;
  revenue: number;
  quantity: number;
}

export interface PlatformAnalyticsRow extends SqlRow {
  period_type: 'day' | 'week' | 'month' | 'year';
  period_start: string | Date;
  total_users: number;
  active_users: number;
  user_growth: number;
  business_growth: number;
  program_growth: number;
  total_revenue: number;
  revenue_growth: number;
  transaction_volume: number;
  avg_user_value: number;
}

export interface RegionalAnalyticsRow extends SqlRow {
  region: string;
  period_type: 'day' | 'week' | 'month' | 'year';
  businesses: number;
  customers: number;
  revenue: number;
  business_growth: number;
  customer_growth: number;
  revenue_growth: number;
}

export interface RegionalTopProgramRow extends SqlRow {
  region: string;
  period_type: 'day' | 'week' | 'month' | 'year';
  program_id: string;
  program_name: string;
  customers: number;
  revenue: number;
}

export interface UserEngagementRow extends SqlRow {
  period_type: 'day' | 'week' | 'month' | 'year';
  period_start: string | Date;
  daily_active_users: number;
  monthly_active_users: number;
  avg_session_duration: number;
}

export interface FeatureInteractionRow extends SqlRow {
  period_type: 'day' | 'week' | 'month' | 'year';
  feature_name: string;
  interaction_count: number;
}

export interface RetentionDataRow extends SqlRow {
  period_type: 'day' | 'week' | 'month' | 'year';
  day_number: number;
  retention_rate: number;
}

/**
 * Core metrics query result type from fetchCoreBusinessMetrics
 */
export interface CoreBusinessMetricsResult extends SqlRow {
  active_customers: number;
  churn_rate: number;
  repeat_visit_rate: number;
  avg_visit_frequency: number;
  customer_lifetime_value: number;
  total_revenue: number;
  revenue_growth: number;
  avg_order_value: number;
  transactions: number;
  redemptions: number;
  customer_change: number;
  revenue_change: number;
  transactions_change: number;
  redemptions_change: number;
} 