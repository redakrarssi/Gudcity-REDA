import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CustomerNotificationService } from '../services/customerNotificationService';
import LoyaltyCardService from '../services/loyaltyCardService';
import { createCardSyncEvent, createNotificationSyncEvent, createEnrollmentSyncEvent } from '../utils/realTimeSync';
import { Cards } from '../pages/customer/Cards';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
jest.mock('../services/customerNotificationService');
jest.mock('../services/loyaltyCardService');
jest.mock('../utils/realTimeSync');

// Mock AuthContext
jest.mock('../contexts/AuthContext', () => ({
  useAuth: jest.fn().mockReturnValue({
    user: { id: '4', name: 'Test Customer', role: 'CUSTOMER' },
    isAuthenticated: true
  })
}));

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Customer Enrollment Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create card when enrollment is approved', async () => {
    // Mock the pending approvals data
    (CustomerNotificationService.getPendingApprovals as jest.Mock).mockResolvedValue([
      {
        id: 'approval-123',
        notificationId: 'notif-123',
        customerId: '4',
        businessId: '1',
        requestType: 'ENROLLMENT',
        entityId: 'program-123',
        status: 'PENDING',
        data: {
          businessName: 'Test Business',
          programName: 'Test Loyalty Program'
        }
      }
    ]);
    
    // Mock the respond to approval function
    (CustomerNotificationService.respondToApproval as jest.Mock).mockResolvedValue(true);
    
    // Mock the loyalty cards data
    (LoyaltyCardService.getCustomerCards as jest.Mock).mockResolvedValue([]);
    
    // Mock the syncEnrollmentsToCards function
    (LoyaltyCardService.syncEnrollmentsToCards as jest.Mock).mockResolvedValue(['card-123']);
    
    // Render the Cards component
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <Cards />
      </Wrapper>
    );
    
    // Wait for the enrollment request modal to appear
    await waitFor(() => {
      expect(screen.getByText(/Program Enrollment Request/i)).toBeInTheDocument();
    });
    
    // Click the Join Program button to approve enrollment
    fireEvent.click(screen.getByText(/Join Program/i));
    
    // Verify respondToApproval was called with correct parameters
    await waitFor(() => {
      expect(CustomerNotificationService.respondToApproval).toHaveBeenCalledWith(
        'approval-123',
        true
      );
    });
    
    // Verify syncEnrollmentsToCards was called to create the card
    await waitFor(() => {
      expect(LoyaltyCardService.syncEnrollmentsToCards).toHaveBeenCalledWith('4');
    });
  });

  test('should handle enrollment rejection gracefully', async () => {
    // Mock the pending approvals data
    (CustomerNotificationService.getPendingApprovals as jest.Mock).mockResolvedValue([
      {
        id: 'approval-123',
        notificationId: 'notif-123',
        customerId: '4',
        businessId: '1',
        requestType: 'ENROLLMENT',
        entityId: 'program-123',
        status: 'PENDING',
        data: {
          businessName: 'Test Business',
          programName: 'Test Loyalty Program'
        }
      }
    ]);
    
    // Mock the respond to approval function
    (CustomerNotificationService.respondToApproval as jest.Mock).mockResolvedValue(true);
    
    // Mock the loyalty cards data
    (LoyaltyCardService.getCustomerCards as jest.Mock).mockResolvedValue([]);
    
    // Render the Cards component
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <Cards />
      </Wrapper>
    );
    
    // Wait for the enrollment request modal to appear
    await waitFor(() => {
      expect(screen.getByText(/Program Enrollment Request/i)).toBeInTheDocument();
    });
    
    // Click the Decline button to reject enrollment
    fireEvent.click(screen.getByText(/Decline/i));
    
    // Verify respondToApproval was called with correct parameters
    await waitFor(() => {
      expect(CustomerNotificationService.respondToApproval).toHaveBeenCalledWith(
        'approval-123',
        false
      );
    });
    
    // Verify syncEnrollmentsToCards was not called
    expect(LoyaltyCardService.syncEnrollmentsToCards).not.toHaveBeenCalled();
  });

  test('should sync enrollments to cards for existing customers', async () => {
    // Mock the enrollments data
    const mockEnrollments = [
      {
        enrollment_id: 'enrollment-1',
        customer_id: '4',
        program_id: 'program-1',
        business_id: '1',
        program_name: 'Test Program 1',
        business_name: 'Test Business 1',
        current_points: 100
      },
      {
        enrollment_id: 'enrollment-2',
        customer_id: '4',
        program_id: 'program-2',
        business_id: '2',
        program_name: 'Test Program 2',
        business_name: 'Test Business 2',
        current_points: 50
      }
    ];
    
    // Mock the sql query to return enrollments without cards
    (LoyaltyCardService as any).sql = jest.fn().mockResolvedValue(mockEnrollments);
    
    // Mock the card creation
    (LoyaltyCardService as any).sql.mockResolvedValueOnce([{ id: 'card-1' }])
      .mockResolvedValueOnce([{ id: 'card-2' }]);
    
    // Mock the generateUniqueCardNumber function
    (LoyaltyCardService as any).generateUniqueCardNumber = jest.fn()
      .mockResolvedValueOnce('CARD-001')
      .mockResolvedValueOnce('CARD-002');
    
    // Mock CustomerNotificationService.createNotification
    (CustomerNotificationService.createNotification as jest.Mock)
      .mockResolvedValueOnce({ id: 'notif-1' })
      .mockResolvedValueOnce({ id: 'notif-2' });
    
    // Call syncEnrollmentsToCards directly
    const result = await LoyaltyCardService.syncEnrollmentsToCards('4');
    
    // Verify cards were created
    expect(result).toHaveLength(2);
    expect(result).toContain('card-1');
    expect(result).toContain('card-2');
    
    // Verify card sync events were created
    expect(createCardSyncEvent).toHaveBeenCalledTimes(2);
    expect(createCardSyncEvent).toHaveBeenCalledWith(
      'card-1',
      expect.any(String),
      expect.any(String),
      'INSERT',
      expect.objectContaining({
        programId: expect.any(String),
        programName: 'Test Program 1',
        businessName: 'Test Business 1'
      })
    );
    
    // Verify notifications were created
    expect(CustomerNotificationService.createNotification).toHaveBeenCalledTimes(2);
    
    // Verify notification sync events were created
    expect(createNotificationSyncEvent).toHaveBeenCalledTimes(2);
  });

  test('should add customer to business dashboard when enrollment is approved', async () => {
    // Mock the pending approvals data
    (CustomerNotificationService.getPendingApprovals as jest.Mock).mockResolvedValue([
      {
        id: 'approval-123',
        notificationId: 'notif-123',
        customerId: '4',
        businessId: '1',
        requestType: 'ENROLLMENT',
        entityId: 'program-123',
        status: 'PENDING',
        data: {
          businessName: 'Test Business',
          programName: 'Test Loyalty Program'
        }
      }
    ]);
    
    // Mock the respond to approval function
    (CustomerNotificationService.respondToApproval as jest.Mock).mockResolvedValue(true);
    
    // Mock the loyalty cards data
    (LoyaltyCardService.getCustomerCards as jest.Mock).mockResolvedValue([]);
    
    // Mock the syncEnrollmentsToCards function
    (LoyaltyCardService.syncEnrollmentsToCards as jest.Mock).mockResolvedValue(['card-123']);
    
    // Render the Cards component
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <Cards />
      </Wrapper>
    );
    
    // Wait for the enrollment request modal to appear
    await waitFor(() => {
      expect(screen.getByText(/Program Enrollment Request/i)).toBeInTheDocument();
    });
    
    // Click the Join Program button to approve enrollment
    fireEvent.click(screen.getByText(/Join Program/i));
    
    // Verify enrollment sync event was created for the business dashboard
    await waitFor(() => {
      expect(createEnrollmentSyncEvent).toHaveBeenCalledWith(
        '4',  // customerId
        '1',  // businessId
        'program-123',  // programId
        'INSERT'  // operation
      );
    });
  });
}); 