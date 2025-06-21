import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { CreditCard, Coffee, Gift, Award, Clock, RotateCw, QrCode, Zap, ChevronDown, Shield, Crown, Check, AlertCircle, Info } from 'lucide-react';
import LoyaltyCardService, { LoyaltyCard, CardActivity } from '../../services/loyaltyCardService';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// Local interface for card UI notifications
interface CardNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  timestamp: Date;
}

const CustomerCards = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [animateIn, setAnimateIn] = useState(false);
  const [rotateCard, setRotateCard] = useState('');
  const [cardActivities, setCardActivities] = useState<Record<string, CardActivity[]>>({});
  const [notifications, setNotifications] = useState<CardNotification[]>([]);
  
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
        {/* Notifications */}
        <AnimatePresence>
          {notifications.map(note => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md shadow-lg"
              role="alert"
            >
              <p className="font-bold">{note.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>

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
    </CustomerLayout>
  );
};

export default CustomerCards; 