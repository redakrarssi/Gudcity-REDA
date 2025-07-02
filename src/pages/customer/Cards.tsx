import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { CreditCard, Coffee, Gift, Award, Clock, RotateCw, QrCode, Zap, ChevronDown, Shield, Crown, Check, AlertCircle, Info, Tag, Copy, X } from 'lucide-react';
import LoyaltyCardService, { LoyaltyCard, CardActivity } from '../../services/loyaltyCardService';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToEvents, Event } from '../../utils/telemetry';
import { subscribeToSync, SyncEvent } from '../../utils/realTimeSync';
import { queryClient } from '../../utils/queryClient';
import { LOYALTY_EVENT } from '../../utils/loyaltyEvents';
import NotificationList from '../../components/customer/NotificationList';
import { CustomerNotificationService } from '../../services/customerNotificationService';

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
  
  // Function to add notification
  const addNotification = useCallback((type: 'success' | 'error' | 'info' | 'scan', message: string) => {
    const newNotification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      message,
      timestamp: new Date()
    };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 5000);
  }, []);

  // Function to hide enrollment info
  const handleHideEnrollmentInfo = useCallback(() => {
    setHideEnrollmentInfo(true);
    localStorage.setItem('hideEnrollmentInfo', 'true');
  }, []);

  // Function to sync enrollments to cards
  const syncEnrollments = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      console.log('Syncing enrollments to cards for customer:', user.id);
      const createdCardIds = await LoyaltyCardService.syncEnrollmentsToCards(String(user.id));
      
      if (createdCardIds.length > 0) {
        console.log(`Created ${createdCardIds.length} new cards from enrollments`);
        addNotification('success', `${createdCardIds.length} new loyalty card(s) created from your program enrollments`);
        
        // Refresh card data
        queryClientInstance.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
      }
    } catch (error) {
      console.error('Error syncing enrollments to cards:', error);
      addNotification('error', 'Failed to sync enrollments to cards');
    }
  }, [user?.id, addNotification, queryClientInstance]);
  
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

  // Check for pending enrollment requests and show modal
  useEffect(() => {
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
  }, [pendingApprovals, enrollmentRequestState.isOpen]);

  // Subscribe to real-time events and sync updates
  useEffect(() => {
    if (!user?.id) return;
    
    // 1. Listen to telemetry events for notifications
    const telemetryUnsubscribe = subscribeToEvents((event: Event) => {
      // Check if the event is relevant to this customer's cards
      if (event.name && 
          event.data && 
          event.data.type === LOYALTY_EVENT.POINTS_ADDED && 
          event.data.customerId === user.id) {
        // Points were added to a card
        addNotification('success', `${event.data.points} points added to your ${event.data.businessName || 'loyalty'} card!`);
        
        // Refresh card data
        queryClientInstance.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
      }
      
      if (event.name && 
          event.data && 
          event.data.type === LOYALTY_EVENT.POINTS_REDEEMED && 
          event.data.customerId === user.id) {
        // Points were redeemed
        addNotification('info', `${event.data.points} points redeemed from your ${event.data.businessName || 'loyalty'} card.`);
        
        // Refresh card data
        queryClientInstance.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
      }
      
      if (event.name && 
          event.data && 
          event.data.type === LOYALTY_EVENT.ENROLLMENT_NEW && 
          event.data.customerId === user.id) {
        // Customer enrolled in a new loyalty program
        addNotification('success', `You've joined the ${event.data.programName || 'loyalty'} program!`);
        
        // Sync enrollments to cards
        syncEnrollments();
      }
      
      if (event.name && 
          event.data && 
          event.data.type === LOYALTY_EVENT.PROMO_CODE_GENERATED && 
          event.data.customerId === user.id) {
        // Business granted a promo code
        addNotification('success', `${event.data.businessName || 'A business'} has granted you a promo code!`);
        
        // Refresh card data
        queryClientInstance.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
      }
      
      // New event for QR code scanning
      if (event.name && 
          event.name.toString() === 'qr_scan' && 
          event.data && 
          event.data.customerId === user.id) {
        // Customer QR code is being scanned by a business
        addNotification('scan', `${event.data.businessName || 'A business'} is scanning your QR code`);
      }
    });
    
    // 2. Subscribe to loyalty card real-time sync events
    const cardSyncUnsubscribe = subscribeToSync('loyalty_cards', (event: SyncEvent) => {
      if (event.customer_id && user.id && event.customer_id === String(user.id)) {
        console.log('Loyalty card sync event received:', event);
        
        // Refresh cards data
        queryClientInstance.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
        
        // Show notification based on operation type
        if (event.operation === 'INSERT') {
          addNotification('success', 'New loyalty card added! Pull down to refresh.');
        } else if (event.operation === 'UPDATE') {
          const businessName = event.data?.businessName || 'A business';
          const pointsChange = event.data?.pointsChange;
          
          if (pointsChange && pointsChange > 0) {
            addNotification('success', `${pointsChange} points added to your ${businessName} card!`);
          } else {
            addNotification('info', `Your ${businessName} loyalty card has been updated.`);
          }
        }
      }
    }, String(user.id));
    
    // 3. Subscribe to customer notifications real-time sync events
    const notificationSyncUnsubscribe = subscribeToSync('customer_notifications', (event: SyncEvent) => {
      if (event.customer_id && user.id && event.customer_id === String(user.id)) {
        console.log('Customer notification sync event received:', event);
        
        // Show notification based on event data
        if (event.data?.type === 'QR_SCAN') {
          const businessName = event.data?.businessName || 'A business';
          addNotification('scan', `${businessName} scanned your QR code`);
        } else if (event.data?.type === 'POINTS_ADDED') {
          const businessName = event.data?.businessName || 'A business';
          const points = event.data?.points || 0;
          addNotification('success', `${points} points added to your ${businessName} card!`);
          
          // Refresh card data
          queryClientInstance.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
        }
        
        // Refresh notifications data
        queryClientInstance.invalidateQueries({ queryKey: ['customerNotifications', user.id] });
      }
    }, String(user.id));
    
    // 4. Subscribe to program enrollments real-time sync events
    const enrollmentSyncUnsubscribe = subscribeToSync('program_enrollments', (event: SyncEvent) => {
      if (event.customer_id && user.id && event.customer_id === String(user.id)) {
        console.log('Program enrollment sync event received:', event);
        
        // When a new enrollment is created, sync it to cards
        if (event.operation === 'INSERT') {
          syncEnrollments();
        }
      }
    }, String(user.id));
    
    // Run initial sync on component mount
    syncEnrollments();
    
    // Clean up subscriptions
    return () => {
      telemetryUnsubscribe();
      cardSyncUnsubscribe();
      notificationSyncUnsubscribe();
      enrollmentSyncUnsubscribe();
    };
  }, [user?.id, addNotification, queryClientInstance, syncEnrollments]);

  // Handle manual refresh
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
          
          // Refresh card data
          await queryClientInstance.invalidateQueries({ queryKey: ['loyaltyCards', user?.id] });
          await queryClientInstance.invalidateQueries({ queryKey: ['customerNotifications', user?.id] });
          await queryClientInstance.invalidateQueries({ queryKey: ['customerApprovals', user?.id] });
          await refetch();
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
        addNotification('error', result.error || 'Failed to process your response');
        
        // Close the modal on error too
        setEnrollmentRequestState(prev => ({
          ...prev,
          isOpen: false
        }));
      }
    } catch (error) {
      console.error('Error responding to enrollment request:', error);
      addNotification('error', 'An error occurred while processing your response');
      
      // Close the modal on error too
      setEnrollmentRequestState(prev => ({
        ...prev,
        isOpen: false
      }));
    } finally {
      setIsProcessingResponse(false);
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
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
            >
              Decline
            </button>
            <button
              onClick={() => handleEnrollmentResponse(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Join Program
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
            </h1>
          
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

// Export the safe wrapper instead of the component directly
export default CustomerCardsSafeWrapper; 