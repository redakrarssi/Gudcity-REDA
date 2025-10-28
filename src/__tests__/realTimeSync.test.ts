import { subscribeToSync, triggerSyncEvent, createCardSyncEvent, createNotificationSyncEvent, createEnrollmentSyncEvent } from '../utils/realTimeSync';
import { queryClient } from '../utils/queryClient';

// Mock dependencies
jest.mock('../utils/queryClient', () => ({
  queryClient: {
    invalidateQueries: jest.fn()
  }
}));

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    getAllKeys: () => Object.keys(store),
    getAll: () => store
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('Real-time Synchronization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });

  test('should propagate updates between business and customer dashboards', async () => {
    // Create mock listeners
    const customerListener = jest.fn();
    const businessListener = jest.fn();
    
    // Subscribe to sync events
    const unsubscribeCustomer = subscribeToSync('loyalty_cards', customerListener, '4');
    const unsubscribeBusiness = subscribeToSync('loyalty_cards', businessListener);
    
    // Trigger a sync event
    triggerSyncEvent({
      table_name: 'loyalty_cards',
      operation: 'UPDATE',
      record_id: 'card-123',
      customer_id: '4',
      business_id: '1',
      data: {
        points: 100,
        businessName: 'Test Business'
      }
    });
    
    // Advance timers to trigger polling
    jest.advanceTimersByTime(6000);
    
    // Verify listeners were called
    expect(customerListener).toHaveBeenCalled();
    expect(businessListener).toHaveBeenCalled();
    
    // Verify queryClient was invalidated
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      { queryKey: ['loyaltyCards', '4'] }
    );
    
    // Clean up subscriptions
    unsubscribeCustomer();
    unsubscribeBusiness();
  });

  test('should handle multiple concurrent events', async () => {
    // Create mock listener
    const listener = jest.fn();
    
    // Subscribe to sync events
    const unsubscribe = subscribeToSync('loyalty_cards', listener, '4');
    
    // Trigger multiple sync events simultaneously
    for (let i = 0; i < 5; i++) {
      triggerSyncEvent({
        table_name: 'loyalty_cards',
        operation: 'UPDATE',
        record_id: `card-${i}`,
        customer_id: '4',
        business_id: '1',
        data: {
          points: i * 10,
          businessName: `Test Business ${i}`
        }
      });
    }
    
    // Advance timers to trigger polling
    jest.advanceTimersByTime(6000);
    
    // Verify listener was called multiple times
    expect(listener).toHaveBeenCalledTimes(5);
    
    // Verify queryClient was invalidated
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      { queryKey: ['loyaltyCards', '4'] }
    );
    
    // Clean up subscription
    unsubscribe();
  });

  test('should create card sync events correctly', () => {
    // Create card sync event
    createCardSyncEvent(
      'card-123',
      '4',
      '1',
      'INSERT',
      {
        programId: 'program-123',
        programName: 'Test Program',
        businessName: 'Test Business'
      }
    );
    
    // Check localStorage for the sync event
    const keys = mockLocalStorage.getAllKeys();
    const syncKey = keys.find(key => key.startsWith('sync_'));
    
    expect(syncKey).toBeDefined();
    
    // Parse the sync event data
    const syncEvent = JSON.parse(mockLocalStorage.getItem(syncKey!) || '{}');
    
    // Verify sync event properties
    expect(syncEvent.table_name).toBe('loyalty_cards');
    expect(syncEvent.operation).toBe('INSERT');
    expect(syncEvent.record_id).toBe('card-123');
    expect(syncEvent.customer_id).toBe('4');
    expect(syncEvent.business_id).toBe('1');
    expect(syncEvent.data).toEqual(expect.objectContaining({
      programId: 'program-123',
      programName: 'Test Program',
      businessName: 'Test Business'
    }));
  });

  test('should create notification sync events correctly', () => {
    // Create notification sync event
    createNotificationSyncEvent(
      'notif-123',
      '4',
      '1',
      'INSERT',
      {
        type: 'ENROLLMENT',
        programName: 'Test Program',
        businessName: 'Test Business'
      }
    );
    
    // Check localStorage for the sync event
    const keys = mockLocalStorage.getAllKeys();
    const syncKey = keys.find(key => key.startsWith('sync_'));
    
    expect(syncKey).toBeDefined();
    
    // Parse the sync event data
    const syncEvent = JSON.parse(mockLocalStorage.getItem(syncKey!) || '{}');
    
    // Verify sync event properties
    expect(syncEvent.table_name).toBe('customer_notifications');
    expect(syncEvent.operation).toBe('INSERT');
    expect(syncEvent.record_id).toBe('notif-123');
    expect(syncEvent.customer_id).toBe('4');
    expect(syncEvent.business_id).toBe('1');
    expect(syncEvent.data).toEqual(expect.objectContaining({
      type: 'ENROLLMENT',
      programName: 'Test Program',
      businessName: 'Test Business'
    }));
  });

  test('should create enrollment sync events correctly', () => {
    // Create enrollment sync event
    createEnrollmentSyncEvent(
      '4',
      '1',
      'program-123',
      'INSERT'
    );
    
    // Check localStorage for the sync event
    const keys = mockLocalStorage.getAllKeys();
    const syncKey = keys.find(key => key.startsWith('sync_'));
    
    expect(syncKey).toBeDefined();
    
    // Parse the sync event data
    const syncEvent = JSON.parse(mockLocalStorage.getItem(syncKey!) || '{}');
    
    // Verify sync event properties
    expect(syncEvent.table_name).toBe('program_enrollments');
    expect(syncEvent.operation).toBe('INSERT');
    expect(syncEvent.record_id).toBe('4-program-123');
    expect(syncEvent.customer_id).toBe('4');
    expect(syncEvent.business_id).toBe('1');
    expect(syncEvent.data).toEqual(expect.objectContaining({
      program_id: 'program-123',
      customer_id: '4',
      business_id: '1'
    }));
  });

  test('should stop polling when all listeners are unsubscribed', () => {
    // Create mock listener
    const listener = jest.fn();
    
    // Subscribe to sync events
    const unsubscribe = subscribeToSync('loyalty_cards', listener, '4');
    
    // Verify polling interval is set
    expect(setInterval).toHaveBeenCalled();
    
    // Unsubscribe from sync events
    unsubscribe();
    
    // Trigger a sync event
    triggerSyncEvent({
      table_name: 'loyalty_cards',
      operation: 'UPDATE',
      record_id: 'card-123',
      customer_id: '4',
      business_id: '1'
    });
    
    // Advance timers to trigger polling
    jest.advanceTimersByTime(6000);
    
    // Verify listener was not called
    expect(listener).not.toHaveBeenCalled();
  });

  test('should handle different event types for the same customer', async () => {
    // Create mock listeners
    const cardsListener = jest.fn();
    const enrollmentsListener = jest.fn();
    const notificationsListener = jest.fn();
    
    // Subscribe to different sync events for the same customer
    const unsubscribeCards = subscribeToSync('loyalty_cards', cardsListener, '4');
    const unsubscribeEnrollments = subscribeToSync('program_enrollments', enrollmentsListener, '4');
    const unsubscribeNotifications = subscribeToSync('customer_notifications', notificationsListener, '4');
    
    // Trigger different types of sync events
    triggerSyncEvent({
      table_name: 'loyalty_cards',
      operation: 'UPDATE',
      record_id: 'card-123',
      customer_id: '4',
      business_id: '1'
    });
    
    triggerSyncEvent({
      table_name: 'program_enrollments',
      operation: 'INSERT',
      record_id: 'enrollment-123',
      customer_id: '4',
      business_id: '1'
    });
    
    triggerSyncEvent({
      table_name: 'customer_notifications',
      operation: 'INSERT',
      record_id: 'notif-123',
      customer_id: '4',
      business_id: '1'
    });
    
    // Advance timers to trigger polling
    jest.advanceTimersByTime(6000);
    
    // Verify each listener was called once
    expect(cardsListener).toHaveBeenCalledTimes(1);
    expect(enrollmentsListener).toHaveBeenCalledTimes(1);
    expect(notificationsListener).toHaveBeenCalledTimes(1);
    
    // Clean up subscriptions
    unsubscribeCards();
    unsubscribeEnrollments();
    unsubscribeNotifications();
  });
}); 