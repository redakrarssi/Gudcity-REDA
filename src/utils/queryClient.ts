import { QueryClient } from '@tanstack/react-query';

// Create a client with error handling
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute
      retry: 1,
      onError: (error) => {
        console.warn('Query error:', error);
      }
    },
    mutations: {
      onError: (error) => {
        console.warn('Mutation error:', error);
      }
    }
  },
});

// Define query keys for better organization and type safety
export const queryKeys = {
  // User related queries
  user: (userId?: string | number) => ['user', userId],
  
  // Transaction related queries
  transactions: {
    all: ['transactions'],
    byCustomer: (customerId: string | number) => ['transactions', 'customer', customerId],
    byProgram: (programId: string | number) => ['transactions', 'program', programId],
    byCustomerAndProgram: (customerId: string | number, programId: string | number) => 
      ['transactions', 'customer', customerId, 'program', programId],
  },
  
  // Programs related queries
  programs: {
    all: ['programs'],
    byBusiness: (businessId: string | number) => ['programs', 'business', businessId],
  },
  
  // Customer related queries
  customers: {
    all: ['customers'],
    byId: (customerId: string | number) => ['customers', customerId],
    byBusiness: (businessId: string | number) => ['customers', 'business', businessId],
    cards: (customerId: string | number) => ['customers', customerId, 'cards'],
    programs: (customerId: string | number) => ['customers', customerId, 'programs'],
    notifications: (customerId: string | number) => ['customers', customerId, 'notifications'],
    approvals: (customerId: string | number) => ['customers', customerId, 'approvals'],
  },
  
  // Business related queries
  business: {
    details: (businessId: string | number) => ['business', businessId],
    analytics: (businessId: string | number) => ['business', businessId, 'analytics'],
    settings: (businessId: string | number) => ['business', businessId, 'settings'],
  },
  
  // Dashboard related queries
  dashboard: {
    customerSummary: (customerId: string | number) => ['dashboard', 'customer', customerId],
    businessSummary: (businessId: string | number) => ['dashboard', 'business', businessId],
  },
  
  // Notifications related queries
  notifications: {
    all: ['notifications'],
    byCustomer: (customerId: string | number) => ['notifications', 'customer', customerId],
    unread: (customerId: string | number) => ['notifications', 'customer', customerId, 'unread'],
  },
};

// Function to invalidate all queries related to a specific customer
export function invalidateCustomerQueries(customerId: string | number) {
  try {
    queryClient.invalidateQueries({ queryKey: ['customers', customerId.toString()] });
    queryClient.invalidateQueries({ queryKey: ['transactions', 'customer', customerId.toString()] });
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'customer', customerId.toString()] });
  } catch (error) {
    console.warn('Error invalidating customer queries:', error);
  }
}

// Function to invalidate all queries related to a specific program
export function invalidateProgramQueries(programId: string | number) {
  try {
    queryClient.invalidateQueries({ queryKey: ['programs', programId.toString()] });
    queryClient.invalidateQueries({ queryKey: ['transactions', 'program', programId.toString()] });
  } catch (error) {
    console.warn('Error invalidating program queries:', error);
  }
} 