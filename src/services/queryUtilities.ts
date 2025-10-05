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
 * SECURITY: Allowlist of valid table names for analytics queries
 */
const ALLOWED_ANALYTICS_TABLES = [
  'business_analytics',
  'customer_analytics',
  'program_analytics',
  'transaction_analytics',
  'redemption_analytics',
  'engagement_analytics',
  'revenue_analytics',
  'retention_analytics',
  'customer_segments',
  'product_performance'
] as const;

/**
 * SECURITY: Allowlist of valid field names for analytics queries
 */
const ALLOWED_ANALYTICS_FIELDS = [
  'id', 'business_id', 'customer_id', 'program_id', 'period_type', 'period_start', 'period_end',
  'active_customers', 'new_customers', 'churn_rate', 'repeat_visit_rate', 'avg_visit_frequency',
  'customer_lifetime_value', 'total_revenue', 'revenue_growth', 'avg_order_value',
  'total_customers', 'points_issued', 'points_redeemed', 'redemption_rate',
  'avg_transaction_value', 'segment_name', 'segment_size', 'avg_spend', 'visit_frequency',
  'loyalty_score', 'product_name', 'total_users', 'active_users', 'user_growth',
  'business_growth', 'program_growth', 'transaction_volume', 'avg_user_value',
  'feature_name', 'interaction_count', 'day_number', 'retention_rate', 'created_at', 'updated_at'
] as const;

/**
 * SECURITY: Allowlist of valid ORDER BY clauses
 */
const ALLOWED_ORDER_BY = [
  'period_start DESC',
  'period_start ASC',
  'period_end DESC',
  'period_end ASC',
  'created_at DESC',
  'created_at ASC',
  'updated_at DESC',
  'updated_at ASC',
  'total_revenue DESC',
  'total_revenue ASC',
  'id DESC',
  'id ASC'
] as const;

/**
 * SECURITY: Validate table name against allowlist
 */
function validateTableName(table: string): string {
  if (!ALLOWED_ANALYTICS_TABLES.includes(table as any)) {
    throw new Error(`Invalid table name: ${table}. Must be one of: ${ALLOWED_ANALYTICS_TABLES.join(', ')}`);
  }
  return table;
}

/**
 * SECURITY: Validate field names against allowlist
 */
function validateFieldNames(fields: string[]): string[] {
  for (const field of fields) {
    if (!ALLOWED_ANALYTICS_FIELDS.includes(field as any)) {
      throw new Error(`Invalid field name: ${field}. Must be one of allowed analytics fields`);
    }
  }
  return fields;
}

/**
 * SECURITY: Validate ORDER BY clause against allowlist
 */
function validateOrderBy(orderBy: string): string {
  if (!ALLOWED_ORDER_BY.includes(orderBy as any)) {
    throw new Error(`Invalid ORDER BY clause: ${orderBy}. Must be one of: ${ALLOWED_ORDER_BY.join(', ')}`);
  }
  return orderBy;
}

/**
 * Generic function to fetch business analytics data by type
 * SECURITY: Now includes input validation with allowlists
 */
export async function fetchBusinessMetrics<T extends SqlRow>(
  businessId: string,
  period: 'day' | 'week' | 'month' | 'year',
  table: string,
  fields: string[],
  orderBy: string = 'period_start DESC',
  limit: number = 1
): Promise<T[]> {
  // SECURITY: Validate all inputs
  const validatedBusinessId = validateBusinessId(businessId);
  const validatedPeriod = validatePeriod(period);
  const validatedTable = validateTableName(table);
  const validatedFields = validateFieldNames(fields);
  const validatedOrderBy = validateOrderBy(orderBy);
  
  // SECURITY: Validate limit is a safe number
  const validatedLimit = Math.max(0, Math.min(1000, Math.floor(limit))); // Cap at 1000
  
  // Build field list - safe because validated
  const fieldList = validatedFields.join(', ');
  
  // Create dynamic query with proper handling of the LIMIT clause
  // SECURITY NOTE: We're using sql.query() with parameterized placeholders
  // Table names, fields, and ORDER BY are validated against allowlists, so string concatenation is safe here
  if (validatedLimit > 0) {
    const query = `
      SELECT ${fieldList}
      FROM ${validatedTable}
      WHERE business_id = $1
      AND period_type = $2
      ORDER BY ${validatedOrderBy}
      LIMIT $3
    `;
    return sql.query(query, [validatedBusinessId, validatedPeriod, validatedLimit]) as Promise<T[]>;
  } else {
    // When limit is 0 or negative, don't include the LIMIT clause at all
    const query = `
      SELECT ${fieldList}
      FROM ${validatedTable}
      WHERE business_id = $1
      AND period_type = $2
      ORDER BY ${validatedOrderBy}
    `;
    return sql.query(query, [validatedBusinessId, validatedPeriod]) as Promise<T[]>;
  }
}

/**
 * Generic function to fetch platform analytics data by type
 * SECURITY: Now includes input validation with allowlists
 */
export async function fetchPlatformMetrics<T extends SqlRow>(
  period: 'day' | 'week' | 'month' | 'year',
  table: string,
  fields: string[],
  orderBy: string = 'period_start DESC',
  limit: number = 1
): Promise<T[]> {
  // SECURITY: Validate all inputs
  const validatedPeriod = validatePeriod(period);
  const validatedTable = validateTableName(table);
  const validatedFields = validateFieldNames(fields);
  const validatedOrderBy = validateOrderBy(orderBy);
  
  // SECURITY: Validate limit is a safe number
  const validatedLimit = Math.max(0, Math.min(1000, Math.floor(limit))); // Cap at 1000
  
  // Build field list - safe because validated
  const fieldList = validatedFields.join(', ');
  
  // Create dynamic query with proper handling of the LIMIT clause
  // SECURITY NOTE: We're using sql.query() with parameterized placeholders
  // Table names, fields, and ORDER BY are validated against allowlists, so string concatenation is safe here
  if (validatedLimit > 0) {
    const query = `
      SELECT ${fieldList}
      FROM ${validatedTable}
      WHERE period_type = $1
      ORDER BY ${validatedOrderBy}
      LIMIT $2
    `;
    return sql.query(query, [validatedPeriod, validatedLimit]) as Promise<T[]>;
  } else {
    // When limit is 0 or negative, don't include the LIMIT clause at all
    const query = `
      SELECT ${fieldList}
      FROM ${validatedTable}
      WHERE period_type = $1
      ORDER BY ${validatedOrderBy}
    `;
    return sql.query(query, [validatedPeriod]) as Promise<T[]>;
  }
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