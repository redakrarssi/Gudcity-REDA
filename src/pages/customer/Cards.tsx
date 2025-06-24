import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { CreditCard, Coffee, Gift, Award, Clock, RotateCw, QrCode, Zap, ChevronDown, Shield, Crown, Check, AlertCircle, Info, Tag, Copy, X } from 'lucide-react';
import LoyaltyCardService, { LoyaltyCard, CardActivity } from '../../services/loyaltyCardService';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeToEvents, Event } from '../../utils/telemetry';
import { queryClient } from '../../utils/queryClient';
import { LOYALTY_EVENT } from '../../utils/loyaltyEvents';
import NotificationList from '../../components/customer/NotificationList';

// Local interface for card UI notifications
interface CardNotification {
  id: string;
  type: 'success' | 'error' | 'info';
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
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [animateIn, setAnimateIn] = useState(false);
  const [rotateCard, setRotateCard] = useState('');
  const [cardActivities, setCardActivities] = useState<Record<string, CardActivity[]>>({});
  const [notifications, setNotifications] = useState<CardNotification[]>([]);
  const [promoCodeState, setPromoCodeState] = useState<PromoCodeState>({
    isOpen: false,
    cardId: null,
    promoCode: null,
    businessName: null,
    isLoading: false
  });
  
  // Function to add notification
  const addNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
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
  
  const { data: loyaltyCards = [], isLoading: loading, error } = useQuery({
    queryKey: ['loyaltyCards', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const cards = await LoyaltyCardService.getCustomerCards(String(user.id));
        const activities: Record<string, CardActivity[]> = {};
        for (const card of cards) {
          const cardActivities = await LoyaltyCardService.getCardActivities(card.id);
          activities[card.id] = cardActivities;
        }
        setCardActivities(activities);
      return cards;
    },
    enabled: !!user?.id,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Subscribe to real-time events 
  useEffect(() => {
    if (!user?.id) return;
    
    // Listen for database events that might affect loyalty cards
    const unsubscribe = subscribeToEvents((event: Event) => {
      // Check if the event is relevant to this customer's cards
      if (event.name === 'error' && 
          event.data && 
          event.data.type === LOYALTY_EVENT.POINTS_ADDED && 
          event.data.customerId === user.id) {
        // Points were added to a card
        addNotification('success', `${event.data.points} points added to your ${event.data.businessName || 'loyalty'} card!`);
        
        // Refresh card data
        queryClient.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
      }
      
      if (event.name === 'error' && 
          event.data && 
          event.data.type === LOYALTY_EVENT.POINTS_REDEEMED && 
          event.data.customerId === user.id) {
        // Points were redeemed
        addNotification('info', `${event.data.points} points redeemed from your ${event.data.businessName || 'loyalty'} card.`);
        
        // Refresh card data
        queryClient.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
      }
      
      if (event.name === 'error' && 
          event.data && 
          event.data.type === LOYALTY_EVENT.ENROLLMENT_NEW && 
          event.data.customerId === user.id) {
        // Customer enrolled in a new loyalty program
        addNotification('success', `You've joined the ${event.data.programName || 'loyalty'} program!`);
        
        // Refresh card data
        queryClient.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
      }
      
      if (event.name === 'error' && 
          event.data && 
          event.data.type === LOYALTY_EVENT.PROMO_CODE_GENERATED && 
          event.data.customerId === user.id) {
        // Business granted a promo code
        addNotification('success', `${event.data.businessName || 'A business'} has granted you a promo code!`);
        
        // Refresh card data
        queryClient.invalidateQueries({ queryKey: ['loyaltyCards', user.id] });
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [user?.id, addNotification]);

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

  if (loading) {
    return <CustomerLayout><div>Loading...</div></CustomerLayout>;
  }

  if (error) {
    return <CustomerLayout><div>Error: {error.message}</div></CustomerLayout>;
  }

  return (
    <CustomerLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-8">
        {/* Total Enrollment Count */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-md mb-4">
          <div className="flex items-center">
            <Info className="h-5 w-5 text-blue-500 mr-2" />
            <p className="text-blue-700">
              You are currently enrolled in <span className="font-bold">{loyaltyCards.length}</span> program{loyaltyCards.length !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>
      
        {/* Notifications */}
        <AnimatePresence>
          {notifications.map(note => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className={`p-4 rounded-md shadow-lg mb-2 ${
                note.type === 'success' ? 'bg-green-100 border-l-4 border-green-500 text-green-700' :
                note.type === 'error' ? 'bg-red-100 border-l-4 border-red-500 text-red-700' :
                'bg-blue-100 border-l-4 border-blue-500 text-blue-700'
              }`}
              role="alert"
            >
              <div className="flex justify-between items-center">
                <p className="font-medium">{note.message}</p>
                <button 
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== note.id))}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
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
                        {/* Left Side - Business Info */}
                        <div className="flex items-center">
                          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl mr-4 shadow-inner">
                            {getIconForCard(card)}
                          </div>
                          <div>
                            <h3 className="font-bold text-xl tracking-wide">{card.businessName}</h3>
                            <div className="flex items-center mt-1">
                              <span className="text-white/80 text-sm uppercase tracking-wider font-medium">{card.cardType}</span>
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
                                      activity.activity_type === 'EARN_POINTS' ? 'bg-green-100' :
                                      activity.activity_type === 'REDEEM_POINTS' ? 'bg-amber-100' :
                                      'bg-blue-100'
                                    }`}>
                                      <Award className={`w-3.5 h-3.5 ${
                                        activity.activity_type === 'EARN_POINTS' ? 'text-green-600' :
                                        activity.activity_type === 'REDEEM_POINTS' ? 'text-amber-600' :
                                        'text-blue-600'
                                      }`} />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-800">
                                        {activity.activity_type === 'EARN_POINTS' 
                                          ? `Earned ${activity.points} points`
                                          : activity.activity_type === 'REDEEM_POINTS'
                                            ? `Redeemed ${activity.points} points`
                                            : 'Card used'
                                        }
                                        {activity.description ? ` - ${activity.description}` : ''}
                                      </p>
                                      <p className="text-xs text-gray-500">{formatDate(activity.created_at)}</p>
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
                                {card.availableRewards.map((reward, idx) => (
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
    </CustomerLayout>
  );
};

// Export the safe wrapper instead of the component directly
export default CustomerCardsSafeWrapper; 