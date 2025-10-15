import { useQuery as useReactQuery, useQueryClient, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useCallback, ReactNode } from 'react';
import { withRetry } from '../utils/withRetry';
import { queryKeys } from '../utils/queryClient';
import { FallbackIndicator } from '../components/FallbackIndicator';

// Ensure all requests include Authorization header for protected endpoints
async function authorizedJsonGet(endpoint: string): Promise<any> {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(endpoint, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint} (${response.status})`);
  }
  return response.json();
}

/**
 * Custom hook that enhances React Query with retry logic, 
 * error handling, and offline support
 */
export function useQuery<TData = unknown, TError = Error>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData, readonly unknown[]>, 'queryKey' | 'queryFn'>
): UseQueryResult<TData, TError> & {
  invalidateQuery: () => void;
  isStale: boolean;
  fallbackIndicator: ReactNode;
} {
  // Wrap query function with retry logic
  const enhancedQueryFn = useCallback(
    () => withRetry(queryFn, { maxRetries: 3 }),
    [queryFn]
  );
  
  // Get query client for invalidation
  const queryClient = useQueryClient();
  
  // Create invalidate function
  const invalidateQuery = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);
  
  // Use React Query with our enhanced function
  const query = useReactQuery<TData, TError>({
    queryKey,
    queryFn: enhancedQueryFn,
    ...options,
  });
  
  // Check if we're using stale data
  const isStale = query.isSuccess && query.isFetching;
  
  // Create fallback indicator element when stale
  const fallbackIndicator: ReactNode = isStale ? <FallbackIndicator /> : null;
  
  return {
    ...query,
    invalidateQuery,
    isStale,
    fallbackIndicator
  };
}

/**
 * Simplified hooks for common entity types
 */

// For user data
export function useUserQuery(userId: string | number, options?: any) {
  return useQuery(
    queryKeys.user(userId),
    async () => {
      // Use authorized request to access protected user endpoint
      return authorizedJsonGet(`/api/users/${userId}`);
    },
    options
  );
}

// For customer programs
export function useCustomerProgramsQuery(customerId: string | number, options?: any) {
  return useQuery(
    queryKeys.customers.programs(customerId),
    async () => {
      // Authorized fetch for protected customer programs endpoint
      return authorizedJsonGet(`/api/customers/${customerId}/programs`);
    },
    options
  );
}

// For transaction history
export function useTransactionHistoryQuery(customerId: string | number, options?: any) {
  return useQuery(
    queryKeys.transactions.byCustomer(customerId),
    async () => {
      // Authorized fetch for protected transactions endpoint
      return authorizedJsonGet(`/api/transactions/customer/${customerId}`);
    },
    options
  );
}

// For customer points totals
export function useCustomerPointsQuery(customerId: string | number, options?: any) {
  return useQuery(
    queryKeys.customers.points(customerId),
    async () => {
      // Authorized fetch for protected customer points endpoint
      return authorizedJsonGet(`/api/customers/${customerId}/points`);
    },
    options
  );
}

// For customer dashboard summary
export function useCustomerDashboardQuery(customerId: string | number, options?: any) {
  return useQuery(
    queryKeys.dashboard.customerSummary(customerId),
    async () => {
      // Authorized fetch for protected dashboard endpoint
      return authorizedJsonGet(`/api/customers/${customerId}/dashboard`);
    },
    options
  );
}

// For upcoming rewards
export function useUpcomingRewardsQuery(customerId: string | number, options?: any) {
  return useQuery(
    queryKeys.dashboard.upcomingRewards(customerId),
    async () => {
      // Authorized fetch for protected upcoming rewards endpoint
      return authorizedJsonGet(`/api/customers/${customerId}/upcoming-rewards`);
    },
    options
  );
} 