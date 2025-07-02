import { queryClient } from './queryClient';

// Define sync event types
export type SyncEventType = 
  | 'program_enrollments'
  | 'loyalty_cards'
  | 'customer_notifications'
  | 'customer_approval_requests'
  | 'customer_business_relationships';

export interface SyncEvent {
  table_name: SyncEventType;
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'DECLINED';
  record_id: string;
  customer_id?: string;
  business_id?: string;
  data?: any;
  created_at: string;
}

// Store for sync event listeners
const syncListeners = new Map<string, Set<(event: SyncEvent) => void>>();

// Polling interval for checking sync events
let pollingInterval: NodeJS.Timeout | null = null;
let lastSyncCheck = new Date();

/**
 * Subscribe to real-time sync events for a specific table
 */
export function subscribeToSync(
  tableType: SyncEventType,
  listener: (event: SyncEvent) => void,
  customerId?: string
): () => void {
  const key = customerId ? `${tableType}:${customerId}` : tableType;
  
  if (!syncListeners.has(key)) {
    syncListeners.set(key, new Set());
  }
  
  syncListeners.get(key)!.add(listener);
  
  // Start polling if this is the first listener
  if (!pollingInterval) {
    startSyncPolling();
  }
  
  // Return unsubscribe function
  return () => {
    const listeners = syncListeners.get(key);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        syncListeners.delete(key);
      }
    }
    
    // Stop polling if no more listeners
    if (syncListeners.size === 0 && pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };
}

/**
 * Start polling for sync events
 */
function startSyncPolling() {
  if (pollingInterval) return;
  
  pollingInterval = setInterval(async () => {
    try {
      await checkForSyncEvents();
    } catch (error) {
      console.error('Error checking sync events:', error);
    }
  }, 5000); // Check every 5 seconds
}

/**
 * Check for new sync events from the database
 */
async function checkForSyncEvents() {
  try {
    // In a real implementation, this would make an API call to fetch sync events
    // For now, we'll use localStorage to simulate real-time updates
    const storageKeys = Object.keys(localStorage);
    const syncKeys = storageKeys.filter(key => key.startsWith('sync_'));
    
    for (const key of syncKeys) {
      const eventData = localStorage.getItem(key);
      if (eventData) {
        try {
          const event: SyncEvent = JSON.parse(eventData);
          
          // Check if this event is newer than our last check
          if (new Date(event.created_at) > lastSyncCheck) {
            processSyncEvent(event);
          }
        } catch (parseError) {
          console.error('Error parsing sync event:', parseError);
        }
        
        // Clean up processed events
        localStorage.removeItem(key);
      }
    }
    
    lastSyncCheck = new Date();
  } catch (error) {
    console.error('Error in checkForSyncEvents:', error);
  }
}

/**
 * Process a sync event and notify relevant listeners
 */
function processSyncEvent(event: SyncEvent) {
  // Notify table-specific listeners
  const tableListeners = syncListeners.get(event.table_name);
  if (tableListeners) {
    tableListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }
  
  // Notify customer-specific listeners
  if (event.customer_id) {
    const customerKey = `${event.table_name}:${event.customer_id}`;
    const customerListeners = syncListeners.get(customerKey);
    if (customerListeners) {
      customerListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in customer sync listener:', error);
        }
      });
    }
  }
  
  // Invalidate relevant React Query caches based on the event
  invalidateQueriesForEvent(event);
}

/**
 * Invalidate React Query caches based on sync events
 */
function invalidateQueriesForEvent(event: SyncEvent) {
  switch (event.table_name) {
    case 'program_enrollments':
      if (event.customer_id) {
        queryClient.invalidateQueries({ queryKey: ['loyaltyCards', event.customer_id] });
        queryClient.invalidateQueries({ queryKey: ['customerPrograms', event.customer_id] });
      }
      if (event.business_id) {
        queryClient.invalidateQueries({ queryKey: ['businessCustomers', event.business_id] });
      }
      break;
      
    case 'loyalty_cards':
      if (event.customer_id) {
        queryClient.invalidateQueries({ queryKey: ['loyaltyCards', event.customer_id] });
      }
      if (event.business_id) {
        queryClient.invalidateQueries({ queryKey: ['businessCustomers', event.business_id] });
      }
      break;
      
    case 'customer_notifications':
      if (event.customer_id) {
        queryClient.invalidateQueries({ queryKey: ['customerNotifications', event.customer_id] });
        queryClient.invalidateQueries({ queryKey: ['customerApprovals', event.customer_id] });
      }
      break;
      
    case 'customer_approval_requests':
      if (event.customer_id) {
        queryClient.invalidateQueries({ queryKey: ['customerApprovals', event.customer_id] });
      }
      break;
      
    case 'customer_business_relationships':
      if (event.customer_id) {
        queryClient.invalidateQueries({ queryKey: ['customerBusinessRelationships', event.customer_id] });
      }
      break;
  }
}

/**
 * Manually trigger a sync event (useful for testing and immediate updates)
 */
export function triggerSyncEvent(event: Partial<SyncEvent>) {
  const fullEvent: SyncEvent = {
    table_name: event.table_name || 'loyalty_cards',
    operation: event.operation || 'UPDATE',
    record_id: event.record_id || '',
    customer_id: event.customer_id,
    business_id: event.business_id,
    data: event.data,
    created_at: new Date().toISOString()
  };
  
  // Store in localStorage to simulate database trigger
  const storageKey = `sync_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  localStorage.setItem(storageKey, JSON.stringify(fullEvent));
}

/**
 * Hook for components to listen to specific sync events
 */
export function useSyncEvents(
  tableType: SyncEventType,
  customerId?: string,
  onEvent?: (event: SyncEvent) => void
) {
  const [events, setEvents] = React.useState<SyncEvent[]>([]);
  
  React.useEffect(() => {
    const unsubscribe = subscribeToSync(tableType, (event) => {
      setEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events
      onEvent?.(event);
    }, customerId);
    
    return unsubscribe;
  }, [tableType, customerId, onEvent]);
  
  return events;
}

/**
 * Create a sync event for customer enrollment
 */
export function createEnrollmentSyncEvent(
  customerId: string,
  businessId: string,
  programId: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE' = 'INSERT'
) {
  triggerSyncEvent({
    table_name: 'program_enrollments',
    operation,
    record_id: `${customerId}-${programId}`,
    customer_id: customerId,
    business_id: businessId,
    data: {
      program_id: programId,
      customer_id: customerId,
      business_id: businessId
    }
  });
}

/**
 * Create a sync event for loyalty card updates
 */
export function createCardSyncEvent(
  cardId: string,
  customerId: string,
  businessId: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE' = 'UPDATE',
  data?: any
) {
  triggerSyncEvent({
    table_name: 'loyalty_cards',
    operation,
    record_id: cardId,
    customer_id: customerId,
    business_id: businessId,
    data: {
      card_id: cardId,
      ...data
    }
  });
}

/**
 * Create a sync event for notifications
 */
export function createNotificationSyncEvent(
  notificationId: string,
  customerId: string,
  businessId: string,
  operation: 'INSERT' | 'UPDATE' = 'INSERT',
  data?: any
) {
  triggerSyncEvent({
    table_name: 'customer_notifications',
    operation,
    record_id: notificationId,
    customer_id: customerId,
    business_id: businessId,
    data: {
      notification_id: notificationId,
      ...data
    }
  });
}

/**
 * Create a sync event for business-customer relationship
 * This is used to update the business dashboard with customer info
 */
export function createBusinessCustomerSyncEvent(
  customerId: string,
  businessId: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'DECLINED' = 'INSERT'
) {
  triggerSyncEvent({
    table_name: 'customer_business_relationships',
    operation: operation === 'DECLINED' ? 'UPDATE' : operation,
    record_id: `${customerId}-${businessId}`,
    customer_id: customerId,
    business_id: businessId,
    data: {
      customer_id: customerId,
      business_id: businessId,
      status: operation === 'DECLINED' ? 'DECLINED' : 'ACTIVE'
    }
  });
}