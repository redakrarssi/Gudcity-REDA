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
 * Enhanced enrollment sync event creation
 */
export function createEnrollmentSyncEvent(
  customerId: string, 
  businessId: string, 
  programId: string, 
  action: 'APPROVED' | 'REJECTED' | 'PENDING',
  cardId?: string
): SyncEvent {
  return {
    table_name: 'program_enrollments',
    operation: action === 'APPROVED' ? 'INSERT' : 'UPDATE',
    record_id: programId,
    customer_id: customerId,
    business_id: businessId,
    data: { 
      action, 
      programId, 
      cardId,
      timestamp: new Date().toISOString() 
    },
    created_at: new Date().toISOString()
  };
}

/**
 * Enhanced card sync event creation
 */
export function createCardSyncEvent(
  cardId: string,
  customerId: string,
  businessId: string,
  programId: string,
  action: 'CREATED' | 'UPDATED' | 'DELETED'
): SyncEvent {
  return {
    table_name: 'loyalty_cards',
    operation: action === 'CREATED' ? 'INSERT' : 'UPDATED' ? 'UPDATE' : 'DELETE',
    record_id: cardId,
    customer_id: customerId,
    business_id: businessId,
    data: { 
      action, 
      programId, 
      cardId,
      timestamp: new Date().toISOString() 
    },
    created_at: new Date().toISOString()
  };
}

/**
 * Enhanced notification sync event creation
 */
export function createNotificationSyncEvent(
  notificationId: string,
  userId: string,
  businessId: string,
  action: 'CREATED' | 'READ' | 'ACTIONED' | 'DELETED',
  notificationType?: string
): SyncEvent {
  return {
    table_name: 'customer_notifications',
    operation: action === 'CREATED' ? 'INSERT' : 'UPDATED' ? 'UPDATE' : 'DELETE',
    record_id: notificationId,
    customer_id: userId,
    business_id: businessId,
    data: { 
      action, 
      notificationType,
      timestamp: new Date().toISOString() 
    },
    created_at: new Date().toISOString()
  };
}

/**
 * Enhanced business-customer relationship sync event
 */
export function createBusinessCustomerSyncEvent(
  customerId: string,
  businessId: string,
  action: 'LINKED' | 'UNLINKED' | 'STATUS_CHANGED',
  status?: string
): SyncEvent {
  return {
    table_name: 'customer_business_relationships',
    operation: action === 'LINKED' ? 'INSERT' : 'UPDATED' ? 'UPDATE' : 'DELETE',
    record_id: `${customerId}-${businessId}`,
    customer_id: customerId,
    business_id: businessId,
    data: { 
      action, 
      status,
      timestamp: new Date().toISOString() 
    },
    created_at: new Date().toISOString()
  };
}

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
 * Enhanced sync event processing with better error handling
 */
function processSyncEvent(event: SyncEvent) {
  try {
    console.log('Processing sync event:', event);
    
    // Invalidate relevant React Query caches based on event type
    switch (event.table_name) {
      case 'loyalty_cards':
        queryClient.invalidateQueries({ queryKey: ['loyaltyCards'] });
        queryClient.invalidateQueries({ queryKey: ['cardActivities'] });
        break;
        
      case 'program_enrollments':
        queryClient.invalidateQueries({ queryKey: ['programEnrollments'] });
        queryClient.invalidateQueries({ queryKey: ['loyaltyCards'] });
        break;
        
      case 'customer_notifications':
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
        break;
        
      case 'customer_approval_requests':
        queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
        break;
        
      case 'customer_business_relationships':
        queryClient.invalidateQueries({ queryKey: ['businessCustomers'] });
        queryClient.invalidateQueries({ queryKey: ['customerBusinesses'] });
        break;
    }
    
    // Notify all listeners for this event type
    const listeners = syncListeners.get(event.table_name);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Error in sync event listener:', error);
        }
      });
    }
    
    // Also notify customer-specific listeners if applicable
    if (event.customer_id) {
      const customerKey = `${event.table_name}:${event.customer_id}`;
      const customerListeners = syncListeners.get(customerKey);
      if (customerListeners) {
        customerListeners.forEach(listener => {
          try {
            listener(event);
          } catch (error) {
            console.error('Error in customer sync event listener:', error);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('Error processing sync event:', error);
  }
}

/**
 * Start polling for sync events with enhanced error handling
 */
function startSyncPolling() {
  if (pollingInterval) return;
  
  pollingInterval = setInterval(async () => {
    try {
      await checkForSyncEvents();
    } catch (error) {
      console.error('Error checking sync events:', error);
      
      // If we get too many errors, stop polling temporarily
      if (error instanceof Error && error.message.includes('timeout')) {
        console.warn('Sync polling timeout, stopping temporarily');
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
          
          // Restart after 30 seconds
          setTimeout(() => {
            if (syncListeners.size > 0) {
              startSyncPolling();
            }
          }, 30000);
        }
      }
    }
  }, 5000); // Check every 5 seconds
}

/**
 * Enhanced sync event checking with localStorage fallback
 */
async function checkForSyncEvents() {
  try {
    // Check localStorage for sync events (cross-tab communication)
    const storageKeys = Object.keys(localStorage);
    const syncKeys = storageKeys.filter(key => 
      key.startsWith('sync_') || 
      key.startsWith('enrollment_sync_') || 
      key.startsWith('notification_sync_')
    );
    
    for (const key of syncKeys) {
      const eventData = localStorage.getItem(key);
      if (eventData) {
        try {
          const event: SyncEvent = JSON.parse(eventData);
          
          // Check if this event is newer than our last check
          if (new Date(event.created_at) > lastSyncCheck) {
            processSyncEvent(event);
            
            // Clean up old sync events
            if (Date.now() - new Date(event.created_at).getTime() > 60000) { // 1 minute old
              localStorage.removeItem(key);
            }
          }
        } catch (parseError) {
          console.error('Error parsing sync event data:', parseError);
          localStorage.removeItem(key); // Clean up corrupted data
        }
      }
    }
    
    // Update last check time
    lastSyncCheck = new Date();
    
  } catch (error) {
    console.error('Error in checkForSyncEvents:', error);
    throw error;
  }
}

/**
 * Force immediate cache invalidation for specific data types
 */
export function forceCacheInvalidation(dataTypes: SyncEventType[]) {
  dataTypes.forEach(type => {
    switch (type) {
      case 'loyalty_cards':
        queryClient.invalidateQueries({ queryKey: ['loyaltyCards'] });
        break;
      case 'program_enrollments':
        queryClient.invalidateQueries({ queryKey: ['programEnrollments'] });
        break;
      case 'customer_notifications':
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        break;
      case 'customer_approval_requests':
        queryClient.invalidateQueries({ queryKey: ['approvalRequests'] });
        break;
    }
  });
}

/**
 * Create and dispatch a custom sync event for immediate UI updates
 */
export function dispatchSyncEvent(event: SyncEvent) {
  if (typeof window !== 'undefined') {
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('syncEvent', { detail: event }));
    
    // Store in localStorage for cross-tab sync
    const key = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(key, JSON.stringify(event));
    
    // Clean up old events
    setTimeout(() => {
      localStorage.removeItem(key);
    }, 60000); // Remove after 1 minute
  }
}

/**
 * Enhanced enrollment-specific sync utilities
 */
export const EnrollmentSync = {
  /**
   * Sync enrollment approval
   */
  syncApproval: (requestId: string, approved: boolean, cardId?: string) => {
    const event = createEnrollmentSyncEvent(
      'system', // Will be replaced by actual customer ID
      'system', // Will be replaced by actual business ID
      requestId,
      approved ? 'APPROVED' : 'REJECTED',
      cardId
    );
    
    dispatchSyncEvent(event);
    
    // Force immediate cache invalidation
    forceCacheInvalidation(['program_enrollments', 'loyalty_cards']);
  },
  
  /**
   * Sync card creation
   */
  syncCardCreation: (cardId: string, customerId: string, businessId: string, programId: string) => {
    const event = createCardSyncEvent(cardId, customerId, businessId, programId, 'CREATED');
    dispatchSyncEvent(event);
    
    // Force immediate cache invalidation
    forceCacheInvalidation(['loyalty_cards']);
  },
  
  /**
   * Sync notification creation
   */
  syncNotification: (notificationId: string, userId: string, businessId: string, type: string) => {
    const event = createNotificationSyncEvent(notificationId, userId, businessId, 'CREATED', type);
    dispatchSyncEvent(event);
    
    // Force immediate cache invalidation
    forceCacheInvalidation(['customer_notifications']);
  }
};