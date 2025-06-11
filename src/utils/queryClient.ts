import { QueryClient } from '@tanstack/react-query';

// Create a custom query client with optimal settings
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep cached data for 5 minutes before garbage collection
      gcTime: 5 * 60 * 1000,
      
      // Consider data fresh for 1 minute before refetching
      staleTime: 60 * 1000,
      
      // Retry failed queries 3 times with exponential backoff
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch data when window regains focus
      refetchOnWindowFocus: true,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
  },
});

// Custom query key factory to generate consistent keys
export const queryKeys = {
  // User data and authentication
  user: (userId?: string | number) => 
    userId ? ['user', userId.toString()] : ['user'],
  
  // Transaction history
  transactions: {
    all: ['transactions'],
    byCustomer: (customerId: string | number) => 
      ['transactions', 'customer', customerId.toString()],
    byProgram: (programId: string | number) => 
      ['transactions', 'program', programId.toString()],
    byCustomerAndProgram: (customerId: string | number, programId: string | number) => 
      ['transactions', 'customer', customerId.toString(), 'program', programId.toString()],
  },
  
  // Loyalty programs and rewards
  programs: {
    all: ['programs'],
    byId: (programId: string | number) => 
      ['programs', programId.toString()],
    byBusiness: (businessId: string | number) => 
      ['programs', 'business', businessId.toString()],
    rewards: (programId: string | number) => 
      ['programs', programId.toString(), 'rewards'],
  },
  
  // Customer data
  customers: {
    all: ['customers'],
    byId: (customerId: string | number) => 
      ['customers', customerId.toString()],
    programs: (customerId: string | number) => 
      ['customers', customerId.toString(), 'programs'],
    points: (customerId: string | number) => 
      ['customers', customerId.toString(), 'points'],
  },
  
  // Business data
  businesses: {
    all: ['businesses'],
    byId: (businessId: string | number) => 
      ['businesses', businessId.toString()],
  },

  // Dashboard data
  dashboard: {
    customerSummary: (customerId: string | number) => 
      ['dashboard', 'customer', customerId.toString(), 'summary'],
    totalPoints: (customerId: string | number) => 
      ['dashboard', 'customer', customerId.toString(), 'totalPoints'],
    upcomingRewards: (customerId: string | number) => 
      ['dashboard', 'customer', customerId.toString(), 'upcomingRewards'],
    recentActivity: (customerId: string | number) => 
      ['dashboard', 'customer', customerId.toString(), 'recentActivity'],
  },
};

// Function to invalidate all queries related to a specific customer
export function invalidateCustomerQueries(customerId: string | number) {
  queryClient.invalidateQueries({ queryKey: ['customers', customerId.toString()] });
  queryClient.invalidateQueries({ queryKey: ['transactions', 'customer', customerId.toString()] });
  queryClient.invalidateQueries({ queryKey: ['dashboard', 'customer', customerId.toString()] });
}

// Function to invalidate all queries related to a specific program
export function invalidateProgramQueries(programId: string | number) {
  queryClient.invalidateQueries({ queryKey: ['programs', programId.toString()] });
  queryClient.invalidateQueries({ queryKey: ['transactions', 'program', programId.toString()] });
} 