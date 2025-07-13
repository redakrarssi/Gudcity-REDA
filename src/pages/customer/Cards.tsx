import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { CreditCard, Coffee, Gift, Award, Clock, RotateCw, QrCode, Zap, ChevronDown, Shield, Crown, Check, AlertCircle, Info, Tag, Copy, X, Bell } from 'lucide-react';
import LoyaltyCardService, { LoyaltyCard, CardActivity } from '../../services/loyaltyCardService';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToEvents, Event } from '../../utils/telemetry';
import { subscribeToSync, SyncEvent } from '../../utils/realTimeSync';
import { queryClient } from '../../utils/queryClient';
import { LOYALTY_EVENT } from '../../utils/loyaltyEvents';
import NotificationList from '../../components/customer/NotificationList';
import { CustomerNotificationService } from '../../services/customerNotificationService';
import { useEnrollmentNotifications } from '../../hooks/useEnrollmentNotifications';
import PointsNotificationHandler from '../../components/notifications/PointsNotificationHandler';
import { ensureCardSync } from '../../utils/cardSyncUtil';

// Local interface for card UI notifications
interface CardNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'scan';
  message: string;
  timestamp: Date;
}

// Interface for promo code modal
interface PromoCodeState {
  isOpen: boolean;
  cardId: string | null;
  promoCode: string | null;
  businessName: string | null;
  isLoading: boolean;
}

// Interface for enrollment request modal
interface EnrollmentRequestState {
  isOpen: boolean;
  businessId: string | null;
  businessName: string | null;
  programId: string | null;
  programName: string | null;
  notificationId: string | null;
  approvalId: string | null;
}

// Safe wrapper component for CustomerCards
const CustomerCardsSafeWrapper = () => {
  // Try/catch to handle the case when AuthProvider isn't available
  try {
    // Test if we can access the auth context
    const { user } = useAuth();
    // If we can access it, render the actual component
    return <CustomerCards />;
  } catch (error) {
    // If we can't access the auth context, show a fallback
    console.error('Auth context not available:', error);
    return (
      <CustomerLayout>
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="mb-6">Please log in to view your loyalty cards</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </CustomerLayout>
    );
  }
};

const CustomerCards = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClientInstance = useQueryClient();
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [animateIn, setAnimateIn] = useState(false);
  const [rotateCard, setRotateCard] = useState('');
  const [cardActivities, setCardActivities] = useState<Record<string, CardActivity[]>>({});
  const [notifications, setNotifications] = useState<CardNotification[]>([]);
  const [isProcessingResponse, setIsProcessingResponse] = useState(false);
  const [hideEnrollmentInfo, setHideEnrollmentInfo] = useState<boolean>(
    localStorage.getItem('hideEnrollmentInfo') === 'true'
  );
  const [promoCodeState, setPromoCodeState] = useState<PromoCodeState>({
    isOpen: false,
    cardId: null,
    promoCode: null,
    businessName: null,
    isLoading: false
  });
  const [enrollmentRequestState, setEnrollmentRequestState] = useState<EnrollmentRequestState>({
    isOpen: false,
    businessId: null,
    businessName: null,
    programId: null,
    programName: null,
    notificationId: null,
    approvalId: null
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Use our new enrollment notifications hook
  const { pendingEnrollments, hasUnhandledRequests } = useEnrollmentNotifications();

  // Function to add notification
  const addNotification = useCallback((type: 'success' | 'error' | 'info' | 'scan', message: string) => {
    const newNotification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      message,
      timestamp: new Date()
    };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto-remove notification after 8 seconds (increased from 5 seconds)
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 8000);
  }, []);

  // Function to hide enrollment info
  const handleHideEnrollmentInfo = useCallback(() => {
    setHideEnrollmentInfo(true);
    localStorage.setItem('hideEnrollmentInfo', 'true');
  }, []);

  // Function to sync enrollments to cards
  const syncEnrollments = useCallback(async () => {
    if (!user?.id) return [];
    
    try {
      console.log('Syncing enrollments to cards for customer:', user.id);
      const createdCardIds = await LoyaltyCardService.syncEnrollmentsToCards(String(user.id));
      
      if (createdCardIds.length > 0) {
        console.log(`Created ${createdCardIds.length} new cards from enrollments`);
        addNotification('success', `${createdCardIds.length} new loyalty card(s) created from your program enrollments`);
        
        // Return created card IDs for further processing
        return createdCardIds;
      }
      return [];
    } catch (error) {
      console.error('Error syncing enrollments to cards:', error);
      addNotification('error', 'Failed to sync enrollments to cards');
      return [];
    }
  }, [user?.id, addNotification]);
  
  // Fetch loyalty cards with sync
  const { data: loyaltyCards = [], isLoading: loyaltyCardsLoading, error, refetch } = useQuery({
    queryKey: ['loyaltyCards', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First synchronize enrollments to cards to ensure all enrolled programs have cards
      await syncEnrollments();
      
      // Then get all customer cards
      const cards = await LoyaltyCardService.getCustomerCards(String(user.id));
      
      // Fetch activities for each card
      const activities: Record<string, CardActivity[]> = {};
      for (const card of cards) {
        const cardActivities = await LoyaltyCardService.getCardActivities(card.id);
        activities[card.id] = cardActivities;
      }
      setCardActivities(activities);
      
      return cards;
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch pending approval requests
  const { data: pendingApprovals = [] } = useQuery({
    queryKey: ['customerApprovals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return CustomerNotificationService.getPendingApprovals(String(user.id));
    },
    enabled: !!user?.id,
    refetchInterval: 15000, // Check for new approvals every 15 seconds
  });

  // Auto refresh trigger for when coming back to the page
  useEffect(() => {
    // Fetch data immediately when the component mounts
    if (user?.id) {
      // Force sync enrollments to cards
      syncEnrollments().then(() => {
        // Then refresh the cards data
        refetch();
      });
      
      // Also ensure card sync using our utility
      ensureCardSync(user.id.toString());
    }

    // Setup visibility change listener to refresh when returning to the page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user?.id) {
        console.log('Page became visible, refreshing cards');
        syncEnrollments().then(() => refetch());
        ensureCardSync(user.id.toString());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, syncEnrollments, refetch]);
  
  // Schedule regular refresh attempts to ensure cards are displayed
  useEffect(() => {
    if (!user?.id) return;
    
    // Create a recurring check for any missing cards
    const intervalId = setInterval(() => {
      // Only run if we have enrollments but no cards
      const shouldSync = loyaltyCards.length === 0 || hasUnhandledRequests;
      
      if (shouldSync) {
        console.log('Scheduled card sync check running');
        syncEnrollments().then(() => {
          if (loyaltyCards.length === 0) {
            refetch();
          }
        });
      }
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [user?.id, syncEnrollments, refetch, loyaltyCards.length, hasUnhandledRequests]);

  // Monitor for sync events and recent approvals
  useEffect(() => {
    if (!user?.id) return;
    
    // Set up a sync listener for loyalty card changes
    const unsubscribeCardSync = subscribeToSync('loyalty_cards', (event: SyncEvent) => {
      // Check if this is a card that belongs to this user
      if (event.customer_id === user.id.toString()) {
        console.log('Received card sync event:', event);
        
        // Refetch cards on INSERT or UPDATE events
        if (event.operation === 'INSERT' || event.operation === 'UPDATE') {
          queryClientInstance.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
          
          // If this is a new card, show notification
          if (event.operation === 'INSERT') {
            const businessName = event.data?.businessName || 'Business';
            const programName = event.data?.programName || 'Program';
            
            addNotification(
              'success', 
              `New card created for ${programName} from ${businessName}`
            );
          }
        }
      }
    });
    
    // Set up a sync listener for enrollment changes
    const unsubscribeEnrollmentSync = subscribeToSync('program_enrollments', (event: SyncEvent) => {
      // Check if this is an enrollment that belongs to this user
      if (event.customer_id === user.id.toString()) {
        console.log('Received enrollment sync event:', event);
        
        // Refetch all related data
        queryClientInstance.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
        queryClientInstance.invalidateQueries({ queryKey: ['customers', user.id.toString(), 'programs'] });
        
        // Force sync enrollments to cards on INSERT events
        if (event.operation === 'INSERT') {
          // Delay slightly to ensure backend processes have completed
          setTimeout(() => {
            syncEnrollments().then(() => {
              // Then force a full refetch of cards to show new ones
              refetch();
            });
          }, 500);
        }
      }
    });
    
    return () => {
      unsubscribeCardSync();
      unsubscribeEnrollmentSync();
    };
  }, [user?.id, addNotification, queryClientInstance, syncEnrollments, refetch]);

  // Handle pending approvals becoming active in the system
  useEffect(() => {
    // Track approval IDs that have been processed
    const processedApprovalIds = new Set<string>();
    
    // Check for recently completed approvals
    const checkForCompletedEnrollments = async () => {
      if (!user?.id) return;
      
      // Get current pending approvals
      const currentPendingIds = new Set(pendingApprovals.map(a => a.id));
      
      // Look for approvals that are no longer pending (were processed)
      const recentlyProcessed = Array.from(processedApprovalIds).filter(id => !currentPendingIds.has(id));
      
      if (recentlyProcessed.length > 0) {
        console.log('Detected recently processed enrollments:', recentlyProcessed);
        
        // Force sync to ensure we get newly created cards
        await syncEnrollments();
        
        // Refetch cards to show new ones
        await refetch();
        
        // Clear processed IDs that we've now handled
        recentlyProcessed.forEach(id => processedApprovalIds.delete(id));
      }
      
      // Update our tracking of current pending IDs
      pendingApprovals.forEach(a => processedApprovalIds.add(a.id));
    };
    
    checkForCompletedEnrollments();
    
    // Rerun this effect whenever pendingApprovals changes
  }, [pendingApprovals, user?.id, syncEnrollments, refetch]);

  // Check for pending enrollment requests and show modal
  useEffect(() => {
    // Disable automatic popup of enrollment requests
    // Users will access enrollment requests through the notification system instead
    
    // Keep this commented code for reference
    /*
    if (pendingApprovals.length > 0) {
      // Find the first enrollment request that hasn't been shown yet
      const enrollmentRequest = pendingApprovals.find(
        approval => approval.requestType === 'ENROLLMENT' && !enrollmentRequestState.isOpen
      );
      
      if (enrollmentRequest && !enrollmentRequestState.isOpen) {
        // Show the enrollment request modal
        setEnrollmentRequestState({
          isOpen: true,
          businessId: enrollmentRequest.businessId,
          businessName: enrollmentRequest.data?.businessName || 'Business',
          programId: enrollmentRequest.entityId,
          programName: enrollmentRequest.data?.programName || 'Loyalty Program',
          notificationId: enrollmentRequest.notificationId,
          approvalId: enrollmentRequest.id
        });
      }
    }
    */
  }, [pendingApprovals, enrollmentRequestState.isOpen]);

  // Listen for real-time updates
  useEffect(() => {
    // Listen for customer notifications
    const handleCustomerNotification = (event: CustomEvent) => {
      const detail = event.detail;
      if (!detail) return;
      
      console.log('Received customer notification:', detail);
      
      // Check if this notification is for the current user
      if (user && detail.customerId === user.id.toString()) {
        if (detail.type === 'POINTS_ADDED') {
          // Show notification
          addNotification('success', `You've received ${detail.points} points in ${detail.programName || 'your loyalty program'}`);
          
          // Refresh cards data
          refetch();
        }
      }
    };
    
    // Listen for refresh events
    const handleRefreshCards = (event: CustomEvent) => {
      console.log('Received refresh cards event');
      refetch();
    };
    
    // Register event listeners
    window.addEventListener('customer-notification', handleCustomerNotification as EventListener);
    window.addEventListener('refresh-customer-cards', handleRefreshCards as EventListener);
    window.addEventListener('points-awarded', handleRefreshCards as EventListener);
    
    // Check localStorage for recent notifications
    const checkLocalStorage = () => {
      // Look for points notifications
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('points_notification_') || key.startsWith('sync_points_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            
            // Check if this notification is for the current user and is recent (last 30 seconds)
            const timestamp = new Date(data.timestamp || 0);
            const isRecent = Date.now() - timestamp.getTime() < 30000; // 30 seconds
            
            if (user && data.customerId === user.id.toString() && isRecent) {
              addNotification('success', `You've received ${data.points} points in ${data.programName || 'your loyalty program'}`);
              refetch();
              
              // Remove the notification to prevent showing it again
              localStorage.removeItem(key);
            }
          } catch (error) {
            console.warn('Error parsing notification from localStorage:', error);
          }
        }
      });
    };
    
    // Check for notifications on mount
    checkLocalStorage();
    
    // Set up periodic checking
    const intervalId = setInterval(checkLocalStorage, 5000);
    
    return () => {
      // Clean up event listeners
      window.removeEventListener('customer-notification', handleCustomerNotification as EventListener);
      window.removeEventListener('refresh-customer-cards', handleRefreshCards as EventListener);
      window.removeEventListener('points-awarded', handleRefreshCards as EventListener);
      clearInterval(intervalId);
    };
  }, [user, addNotification, refetch]);
  
  // Listen for storage events (for cross-tab synchronization)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (!event.key) return;
      
      // Check for card refresh events
      if (event.key === 'force_card_refresh' || 
          (event.key.startsWith('refresh_cards_') && user && event.key.includes(user.id.toString()))) {
        console.log('Storage event triggered card refresh');
        refetch();
      }
      
      // Check for point notifications
      if (event.key.startsWith('points_notification_') || event.key.startsWith('sync_points_')) {
        try {
          const data = JSON.parse(event.newValue || '{}');
          
          // Check if this notification is for the current user
          if (user && data.customerId === user.id.toString()) {
            addNotification('success', `You've received ${data.points} points in ${data.programName || 'your loyalty program'}`);
            refetch();
          }
        } catch (error) {
          console.warn('Error parsing notification from storage event:', error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, addNotification, refetch]);

  const handleRefresh = useCallback(() => {
    if (!user?.id) return;
    
    // Show loading animation
    setAnimateIn(true);
    
    // Sync enrollments to cards first
    syncEnrollments().then(() => {
      // Then refresh the cards data
      refetch();
      
      // Hide loading animation after a short delay
      setTimeout(() => {
        setAnimateIn(false);
      }, 1000);
    });
  }, [user?.id, refetch, syncEnrollments]);

  // Handle enrollment request response
  const handleEnrollmentResponse = async (approved: boolean) => {
    if (!enrollmentRequestState.approvalId) return;
    
    try {
      // Show loading state
      setIsProcessingResponse(true);
      setIsLoading(true);
      addNotification('info', 'Processing enrollment request...');
      
      // Import the safer wrapper service
      const { safeRespondToApproval } = await import('../../services/customerNotificationServiceWrapper');
      
      // Call the wrapper service with proper error handling
      const result = await safeRespondToApproval(
        enrollmentRequestState.approvalId,
        approved
      );
      
      if (result.success) {
        if (approved) {
          addNotification('success', `You've joined ${enrollmentRequestState.programName}`);
          
          // Explicitly sync enrollments to cards to ensure the new card appears
          await syncEnrollments();
          
          // Refresh all related data with proper cache invalidation
          await queryClientInstance.invalidateQueries({ queryKey: ['loyaltyCards', user?.id] });
          await queryClientInstance.invalidateQueries({ queryKey: ['customerNotifications', user?.id] });
          await queryClientInstance.invalidateQueries({ queryKey: ['customerApprovals', user?.id] });
          await queryClientInstance.invalidateQueries({ queryKey: ['enrolledPrograms', user?.id] });
          await queryClientInstance.invalidateQueries({ queryKey: ['customerBusinessRelationships', user?.id] });
          
          // Force refetch immediately
          await refetch();
          
          // Schedule additional fetches to ensure all data is updated
          setTimeout(() => {
            syncEnrollments().then(() => refetch());
          }, 1000);
          
          setTimeout(() => {
            syncEnrollments().then(() => refetch());
          }, 3000);
        } else {
          addNotification('info', `Declined to join ${enrollmentRequestState.programName}`);
          
          // Refresh notifications to remove the declined one
          await queryClientInstance.invalidateQueries({ queryKey: ['customerNotifications', user?.id] });
          await queryClientInstance.invalidateQueries({ queryKey: ['customerApprovals', user?.id] });
        }
        
        // Close the modal
        setEnrollmentRequestState({
          isOpen: false,
          businessId: null,
          businessName: null,
          programId: null,
          programName: null,
          notificationId: null,
          approvalId: null
        });
      } else {
        // Show error using the EnrollmentErrorDisplay component
        const { EnrollmentErrorCode } = await import('../../utils/enrollmentErrorReporter');
        const errorCode = result.errorCode || EnrollmentErrorCode.GENERIC_ERROR;
        
        addNotification('error', result.error || 'Failed to process your response');
        
        // Close the modal on error too
        setEnrollmentRequestState(prev => ({
          ...prev,
          isOpen: false
        }));
        
        // After a delay, try to sync again in case the error was temporary
        setTimeout(() => {
          syncEnrollments().then(() => refetch());
        }, 3000);
      }
    } catch (error) {
      console.error('Error responding to enrollment request:', error);
      addNotification('error', 'An error occurred while processing your response');
      
      // Close the modal on error too
      setEnrollmentRequestState(prev => ({
        ...prev,
        isOpen: false
      }));
      
      // After a delay, try to sync again in case the error was temporary
      setTimeout(() => {
        syncEnrollments().then(() => refetch());
      }, 3000);
    } finally {
      setIsProcessingResponse(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Trigger animation after a short delay
    const timer = setTimeout(() => {
      setAnimateIn(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  const handleCardClick = (cardId: string | number) => {
    const cardIdString = cardId.toString();
    setActiveCard(cardIdString === activeCard ? null : cardIdString);
  };

  const handleCardFlip = (cardId: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    const cardIdString = cardId.toString();
    setRotateCard(cardIdString === rotateCard ? '' : cardIdString);
  };
  
  // Handle promo code button click to view (not generate) a promo code
  const handlePromoCodeClick = (e: React.MouseEvent, card: LoyaltyCard) => {
    e.stopPropagation(); // Prevent card expansion
    
    if (!card.promoCode) {
      // No promo code assigned yet
      addNotification('info', 'No promo code has been assigned to this card yet.');
      return;
    }
    
    setPromoCodeState({
      isOpen: true,
      cardId: card.id,
      promoCode: card.promoCode,
      businessName: card.businessName || 'Business',
      isLoading: false
    });
  };
  
  // Close promo code modal
  const closePromoCodeModal = () => {
    setPromoCodeState(prev => ({
      ...prev,
      isOpen: false
    }));
  };
  
  // Copy promo code to clipboard
  const copyPromoCode = () => {
    if (promoCodeState.promoCode) {
      navigator.clipboard.writeText(promoCodeState.promoCode)
        .then(() => {
          addNotification('success', 'Promo code copied to clipboard');
        })
        .catch(() => {
          addNotification('error', 'Failed to copy promo code');
        });
    }
  };
  
  const getIconForCard = (card: LoyaltyCard) => {
    const businessName = card.businessName?.toLowerCase() || '';
    
    if (businessName.includes('coffee') || businessName.includes('cafe')) {
      return <Coffee className="w-6 h-6" />;
    } else if (businessName.includes('bakery') || businessName.includes('treats') || businessName.includes('food')) {
      return <Gift className="w-6 h-6" />;
    } else if (businessName.includes('fitness') || businessName.includes('gym')) {
      return <Zap className="w-6 h-6" />;
    } else if (businessName.includes('tech') || businessName.includes('store')) {
      return <Shield className="w-6 h-6" />;
    } else {
      return <Crown className="w-6 h-6" />;
    }
  };
  
  const getCardGradient = (card: LoyaltyCard) => {
    const businessName = card.businessName?.toLowerCase() || '';
    const cardType = card.cardType?.toLowerCase() || '';
    
    if (cardType === 'premium' || businessName.includes('tech')) {
      return 'from-blue-600 via-blue-700 to-indigo-800';
    } else if (cardType === 'gold') {
      return 'from-amber-500 via-amber-600 to-orange-700';
    } else if (cardType === 'fitness' || businessName.includes('fitness')) {
      return 'from-emerald-500 via-emerald-600 to-teal-700';
    } else if (businessName.includes('coffee')) {
      return 'from-amber-700 via-amber-800 to-brown-900';
    } else {
      return 'from-purple-600 via-purple-700 to-indigo-800';
    }
  };
  
  // Function to format date
  const formatDate = (dateString: string | Date | null): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };
  
  // Function to format timestamp for activities
  const formatTimestamp = (timestamp: string | Date): string => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString();
  };

  // Render enrollment request modal
  const renderEnrollmentRequestModal = () => {
    if (!enrollmentRequestState.isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-semibold">Program Enrollment Request</h3>
            <button 
              onClick={() => setEnrollmentRequestState(prev => ({ ...prev, isOpen: false }))}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="mb-4">
            <span className="font-medium">{enrollmentRequestState.businessName}</span> invites you to join their 
            <span className="font-medium"> {enrollmentRequestState.programName}</span> loyalty program.
          </p>
          <p className="text-sm text-gray-600 mb-6">
            Joining will allow you to earn points and rewards when you visit.
          </p>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => handleEnrollmentResponse(false)}
              disabled={isProcessingResponse}
              className={`px-4 py-2 border border-gray-300 rounded text-gray-700 ${
                isProcessingResponse ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'
              }`}
            >
              {isProcessingResponse ? 'Processing...' : 'Decline'}
            </button>
            <button
              onClick={() => handleEnrollmentResponse(true)}
              disabled={isProcessingResponse}
              className={`px-4 py-2 bg-blue-600 text-white rounded ${
                isProcessingResponse ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
              }`}
            >
              {isProcessingResponse ? 'Processing...' : 'Join Program'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <CustomerLayout><div>Loading...</div></CustomerLayout>;
  }

  if (error) {
    return <CustomerLayout><div>Error: {error.message}</div></CustomerLayout>;
  }

  return (
    <CustomerLayout>
      {/* Add the PointsNotificationHandler */}
      <PointsNotificationHandler addNotification={addNotification} />
      
      {/* Rest of the component */}
      <div className="p-4 md:p-6 lg:p-8 space-y-8">
        {/* Total Enrollment Count */}
        <AnimatePresence>
          {!hideEnrollmentInfo && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md mb-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Info className="h-5 w-5 text-blue-500 mr-2" />
                  <p className="text-blue-700">
                    You are currently enrolled in <span className="font-bold">{loyaltyCards.length}</span> program{loyaltyCards.length !== 1 ? 's' : ''}.
                  </p>
                </div>
                <button 
                  onClick={handleHideEnrollmentInfo} 
                  className="text-blue-500 hover:text-blue-700 focus:outline-none"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      
        {/* Notifications */}
        <AnimatePresence>
          {notifications.map(notification => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`mb-3 p-3 rounded-lg shadow-md flex items-center ${
                notification.type === 'success' ? 'bg-green-100 text-green-800' :
                notification.type === 'error' ? 'bg-red-100 text-red-800' :
                notification.type === 'scan' ? 'bg-blue-100 text-blue-800' :
                'bg-blue-50 text-blue-800'
              }`}
            >
              {notification.type === 'success' && <Check className="w-5 h-5 mr-2" />}
              {notification.type === 'error' && <AlertCircle className="w-5 h-5 mr-2" />}
              {notification.type === 'info' && <Info className="w-5 h-5 mr-2" />}
              {notification.type === 'scan' && <QrCode className="w-5 h-5 mr-2" />}
              <span>{notification.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Customer Notifications and Approvals */}
        <NotificationList />

        {/* Loyalty Cards Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center mb-4">
            <CreditCard className="mr-3 text-indigo-500" />
            {t('cards.myCards')}
            
            {/* Notification badge for pending enrollment requests */}
            {hasUnhandledRequests && pendingEnrollments && pendingEnrollments.length > 0 && (
              <div className="ml-3 relative">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 animate-pulse-slow">
                  <Bell className="w-3.5 h-3.5 mr-1" />
                  {pendingEnrollments.length} {pendingEnrollments.length === 1 ? 'request' : 'requests'}
                </div>
              </div>
            )}
          </h1>
          
          {/* Enrollment requests notification */}
          {hasUnhandledRequests && pendingEnrollments && pendingEnrollments.length > 0 && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
              <div className="flex items-start">
                <div className="flex-shrink-0 p-1.5 bg-blue-100 rounded-full">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    You have {pendingEnrollments.length} pending enrollment {pendingEnrollments.length === 1 ? 'request' : 'requests'}
                  </h3>
                  <p className="mt-1 text-sm text-blue-600">
                    Check your notifications to join new loyalty programs and get rewards!
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loyaltyCards.map(card => (
                <motion.div 
                  key={card.id}
                  className={`transition-all duration-700 ease-out ${
                    animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`}
                  style={{ transitionDelay: `${loyaltyCards.indexOf(card) * 150}ms` }}
                  whileHover={{ scale: 1.02 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* Main Card */}
                  <div 
                    className="bg-gradient-to-br shadow-xl rounded-2xl cursor-pointer overflow-hidden"
                    onClick={() => handleCardClick(card.id)}
                  >
                    {/* Card Header */}
                    <div className={`bg-gradient-to-r ${getCardGradient(card)} p-6 text-white relative overflow-hidden`}>
                      {/* Background Elements */}
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mt-16 -mr-16"></div>
                      <div className="absolute bottom-0 left-0 w-64 h-64 bg-black opacity-10 rounded-full -mb-16 -ml-16"></div>
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/5 to-transparent"></div>
                      
                      <div className="flex justify-between items-start relative z-10">
                        {/* Left Side - Program Info */}
                        <div className="flex items-center">
                          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl mr-4 shadow-inner">
                            {getIconForCard(card)}
                          </div>
                          <div>
                            <h3 className="font-bold text-xl tracking-wide">{card.programName || 'Loyalty Program'}</h3>
                            <div className="flex items-center mt-1">
                              <span className="text-white/80 text-sm uppercase tracking-wider font-medium">{card.businessName}</span>
                              {card.cardType?.toLowerCase() === 'premium' && (
                                <Crown className="w-4 h-4 ml-1 text-amber-300" />
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Right Side - Actions */}
                        <div className="flex space-x-2">
                          {/* Only show promo code button if one has been assigned */}
                          {card.promoCode && (
                            <button 
                              onClick={(e) => handlePromoCodeClick(e, card)}
                              className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                              aria-label="View promo code"
                            >
                              <Tag className="w-5 h-5" />
                            </button>
                          )}
                          <button 
                            onClick={(e) => handleCardFlip(card.id, e)}
                            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                          >
                            <RotateCw className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Points Display */}
                      <div className="mt-6 flex justify-between items-end relative z-10">
                        <div>
                          <div className="flex items-baseline">
                            <div className="text-4xl font-bold mr-2">{card.points}</div>
                            <div className="text-sm opacity-90">{t('points')}</div>
                          </div>
                          <div className="text-xs mt-1 opacity-80">
                            {card.pointsToNext} {t('more points for')} {card.nextReward}
                          </div>
                        </div>
                        
                        <ChevronDown 
                          className={`w-6 h-6 transition-transform duration-300 ${activeCard === card.id.toString() ? 'rotate-180' : ''}`} 
                        />
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-5 relative z-10">
                        <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
                            style={{ 
                              width: `${(card.points / (card.points + (card.pointsToNext || 1))) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Card Details (visible when expanded) */}
                  <AnimatePresence>
                    {activeCard === card.id.toString() && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-white rounded-b-2xl shadow-lg border border-gray-100 overflow-hidden"
                      >
                        <div className="p-5">
                          {/* Card Info */}
                          <div className="grid grid-cols-3 gap-4 mb-5">
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-xs text-gray-500 mb-1">{t('Expiry Date')}</p>
                              <p className="font-medium text-gray-800">{formatDate(card.expiryDate)}</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-xs text-gray-500 mb-1">{t('Last Used')}</p>
                              <p className="font-medium text-gray-800">{formatDate(card.lastUsed)}</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-xs text-gray-500 mb-1">{t('Card ID')}</p>
                              <p className="font-medium text-gray-800">{card.id}</p>
                            </div>
                          </div>
                          
                          {/* Card Activity */}
                          <div className="mb-5">
                            <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                              <Clock className="w-4 h-4 mr-2 text-gray-500" />
                              {t('Card Activity')}
                            </h4>
                            
                            {cardActivities[card.id]?.length ? (
                              <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                                {cardActivities[card.id].map((activity, idx) => (
                                  <div key={idx} className="flex items-start p-2 rounded-lg bg-gray-50">
                                    <div className={`p-1.5 rounded-full mr-3 ${
                                      activity.type === 'EARN_POINTS' ? 'bg-green-100' :
                                      activity.type === 'REDEEM_POINTS' ? 'bg-amber-100' :
                                      'bg-blue-100'
                                    }`}>
                                      <Award className={`w-3.5 h-3.5 ${
                                        activity.type === 'EARN_POINTS' ? 'text-green-600' :
                                        activity.type === 'REDEEM_POINTS' ? 'text-amber-600' :
                                        'text-blue-600'
                                      }`} />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-800">
                                        {activity.type === 'EARN_POINTS' 
                                          ? `Earned ${activity.points} points`
                                          : activity.type === 'REDEEM_POINTS'
                                            ? `Redeemed ${activity.points} points`
                                            : 'Card used'
                                        }
                                        {activity.description ? ` - ${activity.description}` : ''}
                                      </p>
                                      <p className="text-xs text-gray-500">{formatDate(activity.createdAt)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="bg-gray-50 p-3 rounded-lg text-center">
                                <p className="text-sm text-gray-500">{t('No recent activity')}</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Available Rewards */}
                          <div>
                            <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                              <Gift className="w-4 h-4 mr-2 text-gray-500" />
                              {t('Available Rewards')}
                            </h4>
                            
                            {card.availableRewards?.length ? (
                              <div className="space-y-2">
                                {card.availableRewards.map((reward: {name: string, points: number}, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center">
                                      <div className="p-1.5 bg-blue-100 rounded-full mr-3">
                                        <Gift className="w-3.5 h-3.5 text-blue-600" />
                                      </div>
                                      <span className="text-sm font-medium text-gray-800">{reward.name}</span>
                                    </div>
                                    <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                                      {reward.points} {t('points')}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="bg-gray-50 p-3 rounded-lg text-center">
                                <p className="text-sm text-gray-500">{t('No rewards available')}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
            ))}
          </div>
          {loyaltyCards.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <p>{t('cards.noCards')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Promo Code Modal */}
      <AnimatePresence>
        {promoCodeState.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="border-b border-gray-200 px-5 py-4 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-800">Your Promo Code</h3>
                <button 
                  onClick={closePromoCodeModal}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5">
                <div className="mb-5">
                  <p className="text-sm text-gray-600 mb-2">
                    Your unique promo code for {promoCodeState.businessName}:
                  </p>
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3 mr-2 font-mono text-lg text-center">
                      {promoCodeState.promoCode}
                    </div>
                    <button 
                      onClick={copyPromoCode}
                      className="p-2 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 transition-colors"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-700 flex">
                  <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  <p>This is a one-time use code unique to your account. Share with friends to earn bonus points when they use it!</p>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-4">
                <button
                  onClick={closePromoCodeModal}
                  className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enrollment request modal */}
      {renderEnrollmentRequestModal()}
    </CustomerLayout>
  );
};

export default CustomerCardsSafeWrapper; 