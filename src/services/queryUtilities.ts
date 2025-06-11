import sql, { SqlRow } from '../utils/db';
import { validateBusinessId, validatePeriod, validateCurrencyCode } from '../utils/sqlSafety';
import type { CurrencyCode } from '../types/currency';

/**
 * Utility functions for common database query patterns
 * This eliminates duplicated code across analytics services
 */

/**
 * Utility function to retry database operations with exponential backoff
 */
export async function withRetry<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Database operation failed (attempt ${attempt + 1}/${maxRetries}):`, error);
      
      // Only retry if this looks like a connection error
      const isConnectionError = error instanceof Error && 
        (error.message.includes('connection') || 
         error.message.includes('database') || 
         error.message.includes('sql') ||
         error.message.includes('timeout') ||
         error.message.includes('network'));
      
      if (!isConnectionError) {
        console.error('Non-connection error, not retrying:', error);
        throw error;
      }
      
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 500 + (Math.random() * 500);
        console.log(`Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error(`Operation failed after ${maxRetries} attempts`);
}

/**
 * Handle database connection and provide fallback to mock data
 */
export async function executeWithFallback<T>(
  dbOperation: () => Promise<T>,
  mockData: T,
  errorMessage: string
): Promise<T> {
  try {
    return await withRetry(dbOperation);
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    return mockData;
  }
}

/**
 * Execute multiple database queries in parallel
 */
export async function executeQueriesInParallel<T extends any[]>(...queries: Promise<any>[]): Promise<T> {
  return Promise.all(queries) as Promise<T>;
}

/**
 * Validate common analytics input parameters
 */
export function validateAnalyticsInputs(
  businessId?: string,
  currency?: CurrencyCode,
  period?: 'day' | 'week' | 'month' | 'year'
): { validatedId?: string, validatedCurrency: CurrencyCode, validatedPeriod: 'day' | 'week' | 'month' | 'year' } {
  const validatedId = businessId ? validateBusinessId(businessId) : undefined;
  const validatedCurrency = validateCurrencyCode(currency || 'USD');
  const validatedPeriod = validatePeriod(period || 'month');
  
  return { validatedId, validatedCurrency, validatedPeriod };
}

/**
 * Generic function to fetch business analytics data by type
 */
export async function fetchBusinessMetrics<T extends SqlRow>(
  businessId: string,
  period: 'day' | 'week' | 'month' | 'year',
  table: string,
  fields: string[],
  orderBy: string = 'period_start DESC',
  limit: number = 1
): Promise<T[]> {
  // Create dynamic query using tagged template and interpolated values
  return sql<T[]>`
    SELECT ${fields.join(', ')}
    FROM ${table}
    WHERE business_id = ${businessId}
    AND period_type = ${period}
    ORDER BY ${orderBy}
    ${limit > 0 ? `LIMIT ${limit}` : ''}
  `;
}

/**
 * Generic function to fetch platform analytics data by type
 */
export async function fetchPlatformMetrics<T extends SqlRow>(
  period: 'day' | 'week' | 'month' | 'year',
  table: string,
  fields: string[],
  orderBy: string = 'period_start DESC',
  limit: number = 1
): Promise<T[]> {
  // Create dynamic query using tagged template and interpolated values
  return sql<T[]>`
    SELECT ${fields.join(', ')}
    FROM ${table}
    WHERE period_type = ${period}
    ORDER BY ${orderBy}
    ${limit > 0 ? `LIMIT ${limit}` : ''}
  `;
}

/**
 * Utility function for mapping SQL rows to TypeScript objects with consistent property naming
 */
export function mapSqlRowsToObjects<T, U>(
  rows: T[],
  mappingFunction: (row: T) => U
): U[] {
  return rows.map(mappingFunction);
}

/**
 * Common database field mappings for consistent conversion
 */
export const DB_TO_TS_FIELD_MAPPING = {
  // Maps snake_case database fields to camelCase TypeScript fields
  active_customers: 'activeCustomers',
  churn_rate: 'churnRate',
  repeat_visit_rate: 'repeatVisitRate',
  avg_visit_frequency: 'averageVisitFrequency',
  customer_lifetime_value: 'customerLifetimeValue',
  total_revenue: 'totalRevenue',
  revenue_growth: 'revenueGrowth',
  avg_order_value: 'averageOrderValue',
  program_id: 'programId',
  program_name: 'programName',
  total_customers: 'totalCustomers', 
  points_issued: 'pointsIssued',
  points_redeemed: 'pointsRedeemed',
  redemption_rate: 'redemptionRate',
  avg_transaction_value: 'averageTransactionValue',
  segment_name: 'name',
  segment_size: 'size',
  avg_spend: 'averageSpend',
  visit_frequency: 'visitFrequency', 
  loyalty_score: 'loyaltyScore',
  product_name: 'name',
  total_users: 'totalUsers',
  active_users: 'activeUsers',
  user_growth: 'userGrowth',
  business_growth: 'businessGrowth',
  program_growth: 'programGrowth',
  transaction_volume: 'transactionVolume',
  avg_user_value: 'averageUserValue',
  feature_name: 'name',
  interaction_count: 'count',
  day_number: 'day',
  retention_rate: 'rate'
}; 