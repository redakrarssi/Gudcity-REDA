import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { CreditCard, Coffee, Gift, Award, Clock, RotateCw, QrCode, Zap, ChevronDown, Shield, Crown, Check, AlertCircle, Info, Tag, Copy, X, Bell, RefreshCw } from 'lucide-react';
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
import { triggerCardRefresh } from '../../utils/notificationHandler';

// Local interface for card UI notifications
interface CardNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'scan';
  message: string;
  timestamp: Date;
}

// Interface for point animation
interface PointAnimation {
  cardId: string;
  points: number;
  timestamp: number;
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
  const [pointAnimations, setPointAnimations] = useState<PointAnimation[]>([]);
  const [cardPointsCache, setCardPointsCache] = useState<Record<string, number>>({});
  const [isProcessingResponse, setIsProcessingResponse] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  // Function to trigger point animation for a specific card
  const triggerPointAnimation = useCallback((cardId: string, points: number) => {
    const animation: PointAnimation = {
      cardId,
      points,
      timestamp: Date.now()
    };
    
    setPointAnimations(prev => [...prev, animation]);
    
    // Remove animation after 3 seconds
    setTimeout(() => {
      setPointAnimations(prev => prev.filter(anim => anim.timestamp !== animation.timestamp));
    }, 3000);
  }, []);

  // Function to update card points cache for smooth UI updates
  const updateCardPointsCache = useCallback((cardId: string, newPoints: number) => {
    setCardPointsCache(prev => ({
      ...prev,
      [cardId]: newPoints
    }));
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
      addNotification('error', t('cards.failedToSyncEnrollments'));
      return [];
    }
  }, [user?.id, addNotification]);
  
  // Fetch loyalty cards with sync
  const { data: loyaltyCards = [], isLoading: loyaltyCardsLoading, error, refetch } = useQuery({
    queryKey: ['loyaltyCards', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log(`🔄 Fetching loyalty cards for customer ${user.id}`);
      
      // First synchronize enrollments to cards to ensure all enrolled programs have cards
      await syncEnrollments();
      
      // Then get all customer cards with enhanced point verification
      const cards = await LoyaltyCardService.getCustomerCards(String(user.id));
      
      // Debug: Log each card's points for troubleshooting
      cards.forEach(card => {
        console.log(`📊 Card ${card.id} (Program: ${card.programId}): ${card.points} points`);
      });
      
      // Fetch activities for each card
      const activities: Record<string, CardActivity[]> = {};
      for (const card of cards) {
        const cardActivities = await LoyaltyCardService.getCardActivities(card.id);
        activities[card.id] = cardActivities;
      }
      setCardActivities(activities);
      
      // Clear any cached points since we have fresh data
      setCardPointsCache({});
      
      console.log(`✅ Loaded ${cards.length} loyalty cards with fresh points data`);
      return cards;
    },
    enabled: !!user?.id,
    // SUPER AGGRESSIVE refresh settings for immediate points updates
    staleTime: 0, // Always consider data stale
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
    refetchIntervalInBackground: true // Keep refreshing even when tab is not active
  });

  // Listen for point update notifications - the simple approach
  useEffect(() => {
    const handleCustomerNotification = (event: CustomEvent) => {
      const detail = event.detail;
      if (!detail) return;
      
      // Check if this notification is for the current user
      if (user && detail.customerId === user.id.toString()) {
        if (detail.type === 'POINTS_ADDED') {
          // Show notification toast
          addNotification('success', `You've received ${detail.points} points in ${detail.programName || 'your loyalty program'}`);
          
          // Just do a simple refetch - no complex state management
          refetch();
        }
      }
    };

    // Enhanced event listeners for multiple event types
    const handlePointsAwarded = (event: CustomEvent) => {
      const detail = event.detail;
      if (user && detail.customerId === user.id.toString()) {
        const programName = detail.programName || `Program ${detail.programId}`;
        addNotification('success', `You've received ${detail.points} points in ${programName}!`);
        console.log(`Points awarded event: ${detail.points} points to program ${detail.programId}, card ${detail.cardId}`);
        refetch();
      }
    };

    const handleCardUpdateRequired = (event: CustomEvent) => {
      const detail = event.detail;
      if (user && detail.customerId === user.id.toString()) {
        console.log('Card update required, refreshing...');
        refetch();
      }
    };

    const handleLoyaltyCardsRefresh = (event: CustomEvent) => {
      const detail = event.detail;
      if (user && detail.customerId === user.id.toString()) {
        console.log('Loyalty cards refresh requested, refreshing...');
        refetch();
      }
    };

    // NEW: Handle program-specific points updates
    const handleProgramPointsUpdated = (event: CustomEvent) => {
      const detail = event.detail;
      if (user && detail.customerId === user.id.toString()) {
        const programName = detail.programName || `Program ${detail.programId}`;
        console.log(`Program points updated: ${detail.points} points for program ${detail.programId}, card ${detail.cardId}`);
        addNotification('success', `Your ${programName} card has been updated with ${detail.points} points!`);
        refetch();
      }
    };

    // NEW: Handle QR points awarded events for real-time updates
    const handleQrPointsAwarded = (event: CustomEvent) => {
      const detail = event.detail;
      if (user && detail.customerId === user.id.toString()) {
        console.log(`QR points awarded: ${detail.pointsAwarded} points from ${detail.businessName}`);
        
        // Show immediate notification
        addNotification('success', `You've received ${detail.pointsAwarded} points from ${detail.businessName}!`);
        
        // Trigger point animations for all affected cards
        if (detail.cardUpdates && Array.isArray(detail.cardUpdates)) {
          detail.cardUpdates.forEach((update: any) => {
            if (update.cardId && update.pointsAwarded) {
              triggerPointAnimation(update.cardId, update.pointsAwarded);
              // Update cache immediately for smooth UI
              updateCardPointsCache(update.cardId, update.pointsAwarded);
            }
          });
        }
        
        // Force immediate refetch to get latest data
        refetch();
        
        // Schedule additional refetches for reliability
        setTimeout(() => refetch(), 1000);
        setTimeout(() => refetch(), 3000);
      }
    };

    const handleReactQueryInvalidate = (event: CustomEvent) => {
      const detail = event.detail;
      if (detail && detail.queryKeys && user) {
        // Check if any of the query keys match our current user
        const relevantKeys = detail.queryKeys.filter((key: any[]) => 
          key.length > 1 && key[1] === user.id.toString()
        );
        
        if (relevantKeys.length > 0) {
          console.log('React Query invalidation requested, refreshing...');
          refetch();
        }
      }
    };

    const handleDelayedPointsUpdate = (event: CustomEvent) => {
      const detail = event.detail;
      if (user && detail.customerId === user.id.toString()) {
        console.log('Delayed points update, refreshing...');
        refetch();
      }
    };

    // NEW: Handle ultimate backup refresh
    const handleUltimateCardsRefresh = (event: CustomEvent) => {
      const detail = event.detail;
      if (user && detail.customerId === user.id.toString()) {
        console.log('Ultimate cards refresh triggered, force refreshing...');
        refetch();
      }
    };

    // NEW: Handle immediate force reload events
    const handleForceReloadCustomerCards = (event: CustomEvent) => {
      const detail = event.detail;
      if (user && detail.customerId === user.id.toString()) {
        console.log('Force reload customer cards requested, refreshing immediately...');
        const programName = detail.programName || `Program ${detail.programId}`;
        addNotification('success', `You've received ${detail.points} points in ${programName}! Your cards are updating...`);
        refetch();
        
        // Double-check with a delayed refresh
        setTimeout(() => {
          refetch();
        }, 1000);
      }
    };

    // Listen for localStorage points events once on component mount
    const checkPointsNotifications = () => {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('points_notification_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            
            // Check if this is for the current user
            if (user && data.customerId === user.id.toString()) {
              // Show notification
              addNotification('success', `You've received ${data.points} points in ${data.programName || 'your loyalty program'}`);
              
              // Just do a simple refetch - no complex state management
              refetch();
              
              // Remove the notification to avoid showing it again
              localStorage.removeItem(key);
            }
          } catch (error) {
            console.warn(t('cards.errorParsingNotification'), error);
          }
        }
      });
    };
    
    // NEW: Handle refresh-customer-cards event from sync system
    const handleRefreshCustomerCards = (event: CustomEvent) => {
      const detail = event.detail;
      if (user && detail.customerId === user.id.toString()) {
        console.log('Refresh customer cards event received, force refreshing...');
        if (detail.forceRefresh) {
          refetch();
          setTimeout(() => refetch(), 500); // Double refresh for good measure
        } else {
          refetch();
        }
      }
    };

    // NEW: Check localStorage for sync events regularly
    const checkLocalStorageSync = () => {
      if (!user) return;

      // Check for force card refresh flag
      const forceRefreshFlag = localStorage.getItem('force_card_refresh');
      if (forceRefreshFlag) {
        console.log('Force card refresh flag found, refreshing...');
        refetch();
        localStorage.removeItem('force_card_refresh');
      }

      // Check for customer-specific refresh flags
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`refresh_cards_${user.id}_`)) {
          console.log('Customer-specific refresh flag found, refreshing...');
          refetch();
          localStorage.removeItem(key);
        }
        
        // Check for sync_points_ events
        if (key.startsWith('sync_points_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.customerId === user.id.toString()) {
              console.log('Sync points event found, refreshing cards...');
              addNotification('success', `You've received ${data.points} points in ${data.programName}!`);
              refetch();
              localStorage.removeItem(key);
            }
          } catch (error) {
            console.warn('Error parsing sync points data:', error);
          }
        }
      });
    };

    // Register event listeners
    window.addEventListener('customer-notification', handleCustomerNotification as EventListener);
    window.addEventListener('points-awarded', handlePointsAwarded as EventListener);
    window.addEventListener('card-update-required', handleCardUpdateRequired as EventListener);
    window.addEventListener('loyalty-cards-refresh', handleLoyaltyCardsRefresh as EventListener);
    window.addEventListener('program-points-updated', handleProgramPointsUpdated as EventListener);
    window.addEventListener('react-query-invalidate', handleReactQueryInvalidate as EventListener);
    window.addEventListener('delayed-points-update', handleDelayedPointsUpdate as EventListener);
    window.addEventListener('refresh-customer-cards', handleRefreshCustomerCards as EventListener);
      window.addEventListener('ultimate-cards-refresh', handleUltimateCardsRefresh as EventListener);
      window.addEventListener('force-reload-customer-cards', handleForceReloadCustomerCards as EventListener);
    
    // Check for notifications once on mount
    checkPointsNotifications();
    
    // Set up localStorage polling for sync events
    const syncInterval = setInterval(checkLocalStorageSync, 2000); // Check every 2 seconds
    
    // Register all event listeners
    window.addEventListener('customer-notification', handleCustomerNotification as EventListener);
    window.addEventListener('points-awarded', handlePointsAwarded as EventListener);
    window.addEventListener('card-update-required', handleCardUpdateRequired as EventListener);
    window.addEventListener('loyalty-cards-refresh', handleLoyaltyCardsRefresh as EventListener);
    window.addEventListener('program-points-updated', handleProgramPointsUpdated as EventListener);
    window.addEventListener('react-query-invalidate', handleReactQueryInvalidate as EventListener);
    window.addEventListener('delayed-points-update', handleDelayedPointsUpdate as EventListener);
    window.addEventListener('ultimate-cards-refresh', handleUltimateCardsRefresh as EventListener);
    window.addEventListener('force-reload-customer-cards', handleForceReloadCustomerCards as EventListener);
    window.addEventListener('refresh-customer-cards', handleRefreshCustomerCards as EventListener);
    
    // CRITICAL: Register the new QR points awarded event listener
    window.addEventListener('qrPointsAwarded', handleQrPointsAwarded as EventListener);
    
    // Initial check for localStorage sync
    checkLocalStorageSync();
    
    return () => {
      // Clean up event listeners
      window.removeEventListener('customer-notification', handleCustomerNotification as EventListener);
      window.removeEventListener('points-awarded', handlePointsAwarded as EventListener);
      window.removeEventListener('card-update-required', handleCardUpdateRequired as EventListener);
              window.removeEventListener('loyalty-cards-refresh', handleLoyaltyCardsRefresh as EventListener);
        window.removeEventListener('program-points-updated', handleProgramPointsUpdated as EventListener);
        window.removeEventListener('react-query-invalidate', handleReactQueryInvalidate as EventListener);
              window.removeEventListener('delayed-points-update', handleDelayedPointsUpdate as EventListener);
      window.removeEventListener('ultimate-cards-refresh', handleUltimateCardsRefresh as EventListener);
      window.removeEventListener('force-reload-customer-cards', handleForceReloadCustomerCards as EventListener);
      window.removeEventListener('refresh-customer-cards', handleRefreshCustomerCards as EventListener);
      
      // Clean up the new QR points awarded event listener
      window.removeEventListener('qrPointsAwarded', handleQrPointsAwarded as EventListener);
      
      // Clean up sync interval
      clearInterval(syncInterval);
    };
  }, [user, addNotification, refetch]);

  // Backup polling mechanism for localStorage-based updates
  useEffect(() => {
    if (!user) return;

    const pollForUpdates = () => {
      try {
        // NEW: Check for immediate refresh flag first
        const immediateRefreshFlag = localStorage.getItem('IMMEDIATE_CARDS_REFRESH');
        if (immediateRefreshFlag) {
          try {
            const refreshData = JSON.parse(immediateRefreshFlag);
            if (refreshData.customerId === user.id.toString()) {
              const flagTime = refreshData.timestamp;
              const now = Date.now();
              
              // If flag is newer than 10 seconds, refresh immediately
              if (now - flagTime < 10000) {
                console.log('Immediate refresh flag detected, refreshing cards NOW...');
                addNotification('success', `You've received ${refreshData.points} points! Updating your cards...`);
                refetch();
                // Remove the flag after processing
                localStorage.removeItem('IMMEDIATE_CARDS_REFRESH');
              }
            }
          } catch (parseError) {
            console.warn('Error parsing immediate refresh data:', parseError);
            // Remove corrupted flag
            localStorage.removeItem('IMMEDIATE_CARDS_REFRESH');
          }
        }

        // NEW: Check for program-specific update flags
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('program_') && key.endsWith('_points_updated')) {
            try {
              const updateData = JSON.parse(localStorage.getItem(key) || '{}');
              if (updateData.customerId === user.id.toString()) {
                const updateTime = new Date(updateData.timestamp).getTime();
                const now = Date.now();
                
                // Process updates from the last 2 minutes
                if (now - updateTime < 120000) {
                  const programId = key.replace('program_', '').replace('_points_updated', '');
                  console.log(`Program-specific update found: Program ${programId}, Card ${updateData.cardId}, ${updateData.points} points`);
                  addNotification('success', `Your Program ${programId} card has been updated with ${updateData.points} points!`);
                  refetch();
                  // Remove processed notification
                  localStorage.removeItem(key);
                }
              }
            } catch (parseError) {
              console.warn('Error parsing program update data:', parseError);
              localStorage.removeItem(key);
            }
          }
        });

        // NEW: Check for card-specific update flags  
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('card_') && key.endsWith('_points_updated')) {
            try {
              const updateData = JSON.parse(localStorage.getItem(key) || '{}');
              if (updateData.customerId === user.id.toString()) {
                const updateTime = new Date(updateData.timestamp).getTime();
                const now = Date.now();
                
                // Process updates from the last 2 minutes
                if (now - updateTime < 120000) {
                  const cardId = key.replace('card_', '').replace('_points_updated', '');
                  console.log(`Card-specific update found: Card ${cardId}, Program ${updateData.programId}, ${updateData.points} points`);
                  addNotification('success', `Your card ${cardId} has been updated with ${updateData.points} points!`);
                  refetch();
                  // Remove processed notification
                  localStorage.removeItem(key);
                }
              }
            } catch (parseError) {
              console.warn('Error parsing card update data:', parseError);
              localStorage.removeItem(key);
            }
          }
        });

        // Check for force refresh flag
        const forceRefreshFlag = localStorage.getItem('force_cards_refresh');
        if (forceRefreshFlag) {
          const flagTime = parseInt(forceRefreshFlag, 10);
          const now = Date.now();
          
          // If flag is newer than 30 seconds, refresh
          if (now - flagTime < 30000) {
            console.log('Force refresh flag detected, refreshing cards...');
            refetch();
            // Don't remove the flag immediately to allow other components to see it
          }
        }

        // Check for individual customer update flags (enhanced with program/card info)
        const customerUpdateKey = `customer_${user.id}_points_updated`;
        const customerUpdate = localStorage.getItem(customerUpdateKey);
        if (customerUpdate) {
          try {
            const updateData = JSON.parse(customerUpdate);
            const updateTime = new Date(updateData.timestamp).getTime();
            const now = Date.now();
            
            // If update is newer than 1 minute, refresh
            if (now - updateTime < 60000) {
              console.log(`Customer-specific points update detected: Program ${updateData.programId}, Card ${updateData.cardId}, ${updateData.points} points`);
              addNotification('success', `You've received ${updateData.points} points!`);
              refetch();
              // Remove the flag after processing
              localStorage.removeItem(customerUpdateKey);
            }
          } catch (parseError) {
            console.warn('Error parsing customer update data:', parseError);
          }
        }

        // Check for localStorage point update notifications
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('points_update_')) {
            try {
              const updateData = JSON.parse(localStorage.getItem(key) || '{}');
              if (updateData.customerId === user.id.toString()) {
                const updateTime = new Date(updateData.timestamp).getTime();
                const now = Date.now();
                
                // Process updates from the last 2 minutes
                if (now - updateTime < 120000) {
                  console.log(`Point update notification found: Program ${updateData.programId}, Card ${updateData.cardId}, ${updateData.points} points`);
                  addNotification('success', `You've received ${updateData.points} points in ${updateData.programName}!`);
                  refetch();
                  // Remove processed notification
                  localStorage.removeItem(key);
                }
              }
            } catch (parseError) {
              console.warn('Error parsing localStorage point update:', parseError);
            }
          }
        });
      } catch (error) {
        console.warn('Error in polling for updates:', error);
      }
    };

    // Poll every 5 seconds for updates
    const pollInterval = setInterval(pollForUpdates, 5000);

    // Initial poll
    pollForUpdates();

    // BroadcastChannel listener for cross-tab communication
    let broadcastChannel: BroadcastChannel | null = null;
    try {
      broadcastChannel = new BroadcastChannel('loyalty-updates');
      broadcastChannel.onmessage = (event) => {
        const data = event.data;
        if (data.type === 'POINTS_AWARDED' && data.customerId === user.id.toString()) {
          console.log(t('cards.pointsAwardedMessage'));
          
          // Enhanced logging with program-to-card mapping info
          if (data.mappingInfo) {
            console.log(`Program-to-card mapping: ${data.mappingInfo.programToCardMapping}`);
            console.log(`Original card ID: ${data.mappingInfo.originalCardId}, Resolved card ID: ${data.mappingInfo.resolvedCardId}`);
          }
          
          const programName = data.programName || `Program ${data.programId}`;
          addNotification('success', `You've received ${data.points} points in ${programName}!`);
          refetch();
        }
      };
    } catch (broadcastError) {
      console.warn('BroadcastChannel not supported:', broadcastError);
    }

    return () => {
      clearInterval(pollInterval);
      if (broadcastChannel) {
        broadcastChannel.close();
      }
    };
  }, [user, addNotification, refetch]);
  
  // Simple refresh button functionality
  const handleRefresh = useCallback(() => {
    if (!user?.id) return;
    
    // Show loading state
    setIsRefreshing(true);
    
    // Refresh the data
    refetch()
      .catch(error => {
        console.error('Error refreshing cards:', error);
        addNotification('error', 'Failed to refresh cards. Please try again.');
      })
      .finally(() => {
        // Hide loading state after a short delay
        setTimeout(() => {
          setIsRefreshing(false);
        }, 600);
      });
  }, [user?.id, refetch, addNotification]);

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
        
        addNotification('error', result.error || t('cards.failedToProcessResponse'));
        
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
      addNotification('error', t('cards.errorProcessingResponse'));
      
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
      businessName: card.businessName || t('cards.business'),
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

  // Handle reward redemption
  const handleRewardRedemption = async (cardId: string, rewardId: string, rewardName: string) => {
    try {
      setIsLoading(true);
      addNotification('info', `Redeeming ${rewardName}...`);
      
      console.log('🎯 REDEMPTION DEBUG:', {
        cardId,
        rewardId,
        rewardName,
        cardIdType: typeof cardId,
        rewardIdType: typeof rewardId
      });
      
      const result = await LoyaltyCardService.redeemReward(cardId, rewardId);
      
      console.log('🎯 REDEMPTION RESULT:', result);
      
      if (result.success) {
        // Show success message with tracking code
        const successMessage = result.trackingCode 
          ? `${result.message}\n\n🎫 Your tracking code: ${result.trackingCode}\n\nShow this code to the business to collect your reward!`
          : result.message;
          
        addNotification('success', successMessage);
        
        // Refresh the cards to show updated points and rewards
        await refetch();
        
        // Trigger refresh event for real-time sync
        const refreshEvent = new CustomEvent('qrPointsAwarded', {
          detail: { cardId, action: 'redemption' }
        });
        window.dispatchEvent(refreshEvent);
        
      } else {
        addNotification('error', result.message);
      }
    } catch (error) {
      console.error('Error redeeming reward:', error);
      
      // Show detailed error message for debugging
      let errorMessage = 'Failed to redeem reward. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = `Redemption Error: ${error.message}`;
        console.error('Detailed error:', error.stack);
      } else if (typeof error === 'string') {
        errorMessage = `Redemption Error: ${error}`;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = `Redemption Error: ${error.message}`;
      }
      
      addNotification('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Copy promo code to clipboard
  const copyPromoCode = () => {
    if (promoCodeState.promoCode) {
      navigator.clipboard.writeText(promoCodeState.promoCode)
        .then(() => {
          addNotification('success', t('cards.promoCodeCopied'));
        })
        .catch(() => {
          addNotification('error', t('cards.failedToCopyPromoCode'));
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
              aria-label={t('cards.close')}
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
              {isProcessingResponse ? t('cards.processing') : t('cards.decline')}
            </button>
            <button
              onClick={() => handleEnrollmentResponse(true)}
              disabled={isProcessingResponse}
              className={`px-4 py-2 bg-blue-600 text-white rounded ${
                isProcessingResponse ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
              }`}
            >
              {isProcessingResponse ? t('cards.processing') : t('cards.joinProgram')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Add UI elements at the appropriate place in the return statement
  if (loyaltyCardsLoading || isLoading) {
    return <CustomerLayout><div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div></div></CustomerLayout>;
  }

  if (error) {
    return <CustomerLayout><div>Error: {error.message}</div></CustomerLayout>;
  }

  return (
    <CustomerLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-8 cards-page">
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
                  aria-label={t('cards.close')}
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

        {/* Loyalty Cards Section with Refresh Button */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center">
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
            
            {/* Add Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all ${
                isRefreshing 
                  ? 'bg-blue-100 text-blue-400 cursor-not-allowed' 
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700'
              }`}
              aria-label={t('cards.refreshCardsAria')}
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? t('cards.refreshing') : t('cards.refreshCards')}
            </button>
          </div>
          
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

          {/* The rest of the component remains unchanged */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 cards-grid">
            {loyaltyCards.map(card => (
                <motion.div 
                  key={card.id}
                  className={`transition-all duration-700 ease-out card-item ${
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
                            <h3 className="font-bold text-xl tracking-wide">{card.programName || t('loyaltyProgram')}</h3>
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
                              aria-label={t('cards.viewPromoCode')}
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
                      
                      {/* Points Display with Animation */}
                      <div className="mt-6 flex justify-between items-end relative z-10">
                        <div className="relative">
                          <div className="flex items-baseline">
                            <div className="text-4xl font-bold mr-2 relative">
                              {/* Use cached points for immediate feedback, fallback to card.points */}
                              {cardPointsCache[card.id] ?? card.points}
                              
                              {/* Point Animation Overlay */}
                              <AnimatePresence>
                                {pointAnimations
                                  .filter(anim => anim.cardId === card.id)
                                  .map(anim => (
                                    <motion.div
                                      key={anim.timestamp}
                                      initial={{ opacity: 0, y: 0, scale: 1 }}
                                      animate={{ 
                                        opacity: 1, 
                                        y: -30, 
                                        scale: 1.2,
                                        transition: { duration: 0.5 }
                                      }}
                                      exit={{ 
                                        opacity: 0, 
                                        y: -50, 
                                        scale: 0.8,
                                        transition: { duration: 0.5 }
                                      }}
                                      className="absolute top-0 left-0 text-green-400 font-bold pointer-events-none"
                                    >
                                      +{anim.points}
                                    </motion.div>
                                  ))
                                }
                              </AnimatePresence>
                            </div>
                            <div className="text-sm opacity-90">{t('points')}</div>
                          </div>
                          <div className="text-xs mt-1 opacity-80">
                            {/* Show placeholder values since these properties might not exist */}
                            More points needed for next reward
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
                        <div className="p-5 card-content">
                          {/* Card Info */}
                          <div className="grid grid-cols-3 gap-4 mb-5 card-stats">
                            <div className="bg-gray-50 p-3 rounded-lg stat-item">
                              <p className="text-xs text-gray-500 mb-1 stat-label">{t('cards.expiryDate')}</p>
                              <p className="font-medium text-gray-800 stat-value">{formatDate(card.expiryDate)}</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg stat-item">
                              <p className="text-xs text-gray-500 mb-1 stat-label">{t('cards.lastUsed')}</p>
                              <p className="font-medium text-gray-800 stat-value">{formatDate(card.lastUsed)}</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg stat-item">
                              <p className="text-xs text-gray-500 mb-1 stat-label">{t('cards.cardId')}</p>
                              <p className="font-medium text-gray-800 stat-value">{card.id}</p>
                            </div>
                          </div>
                          
                          {/* Card Activity */}
                          <div className="mb-5 card-activity">
                            <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                              <Clock className="w-4 h-4 mr-2 text-gray-500" />
                              {t('cards.cardActivity')}
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
                                            ? t('cards.redeemedPoints', { points: activity.points })
                                            : t('cards.cardUsed')
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
                                <p className="text-sm text-gray-500">{t('cards.noRecentActivity')}</p>
                              </div>
                            )}
                          </div>
                          
                          {/* Available Rewards */}
                          <div className="card-rewards">
                            <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                              <Gift className="w-4 h-4 mr-2 text-gray-500" />
                              {t('cards.availableRewards')}
                            </h4>
                            
                            {card.availableRewards?.length ? (
                              <div className="space-y-3">
                                {card.availableRewards.map((reward: any, idx: number) => {
                                  const canRedeem = reward.isRedeemable;
                                  const pointsNeeded = reward.points - card.points;
                                  
                                  return (
                                    <div 
                                      key={idx} 
                                      className={`p-3 rounded-lg border-2 transition-all ${
                                        canRedeem 
                                          ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                                          : 'bg-gray-50 border-gray-200'
                                      }`}
                                    >
                                      <div className="flex justify-between items-center">
                                        <div className="flex items-center flex-1">
                                          <div className={`p-2 rounded-full mr-3 ${
                                            canRedeem ? 'bg-green-100' : 'bg-gray-100'
                                          }`}>
                                            <Gift className={`w-4 h-4 ${
                                              canRedeem ? 'text-green-600' : 'text-gray-400'
                                            }`} />
                                          </div>
                                          <div className="flex-1">
                                            <span className={`text-sm font-medium ${
                                              canRedeem ? 'text-green-800' : 'text-gray-600'
                                            }`}>
                                              {reward.name}
                                            </span>
                                            <div className="flex items-center mt-1">
                                              <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                canRedeem 
                                                  ? 'bg-green-100 text-green-700' 
                                                  : 'bg-gray-100 text-gray-600'
                                              }`}>
                                                {reward.points} {t('points')}
                                              </div>
                                              {!canRedeem && pointsNeeded > 0 && (
                                                <span className="text-xs text-orange-600 ml-2">
                                                  Need {pointsNeeded} more points
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {canRedeem && (
                                          <button
                                            onClick={() => handleRewardRedemption(card.id, reward.id, reward.name)}
                                            className="ml-3 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                                          >
                                            Redeem
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="bg-gray-50 p-4 rounded-lg text-center">
                                <Gift className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">{t('cards.noRewardsAvailableForProgram')}</p>
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