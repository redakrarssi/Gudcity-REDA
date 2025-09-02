import { useQuery as useReactQuery, useQueryClient, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useCallback, ReactNode } from 'react';
import { withRetry } from '../utils/withRetry';
import { queryKeys } from '../utils/queryClient';
import { FallbackIndicator } from '../components/FallbackIndicator';

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
      // Implement user data fetching
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user data');
      return response.json();
    },
    options
  );
}

// For customer programs
export function useCustomerProgramsQuery(customerId: string | number, options?: any) {
  return useQuery(
    queryKeys.customers.programs(customerId),
    async () => {
      // Implement program data fetching
      const response = await fetch(`/api/customers/${customerId}/programs`);
      if (!response.ok) throw new Error('Failed to fetch customer programs');
      return response.json();
    },
    options
  );
}

// For transaction history
export function useTransactionHistoryQuery(customerId: string | number, options?: any) {
  return useQuery(
    queryKeys.transactions.byCustomer(customerId),
    async () => {
      // Implement transaction history fetching
      const response = await fetch(`/api/transactions/customer/${customerId}`);
      if (!response.ok) throw new Error('Failed to fetch transaction history');
      return response.json();
    },
    options
  );
}

// For customer points totals
export function useCustomerPointsQuery(customerId: string | number, options?: any) {
  return useQuery(
    queryKeys.customers.points(customerId),
    async () => {
      // Implement points data fetching
      const response = await fetch(`/api/customers/${customerId}/points`);
      if (!response.ok) throw new Error('Failed to fetch customer points');
      return response.json();
    },
    options
  );
}

// For customer dashboard summary
export function useCustomerDashboardQuery(customerId: string | number, options?: any) {
  return useQuery(
    queryKeys.dashboard.customerSummary(customerId),
    async () => {
      // Implement dashboard data fetching
      const response = await fetch(`/api/customers/${customerId}/dashboard`);
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      return response.json();
    },
    options
  );
}

// For upcoming rewards
export function useUpcomingRewardsQuery(customerId: string | number, options?: any) {
  return useQuery(
    queryKeys.dashboard.upcomingRewards(customerId),
    async () => {
      // Implement upcoming rewards fetching
      const response = await fetch(`/api/customers/${customerId}/upcoming-rewards`);
      if (!response.ok) throw new Error('Failed to fetch upcoming rewards');
      return response.json();
    },
    options
  );
} 