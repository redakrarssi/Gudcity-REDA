import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { CreditCard, Coffee, Gift, Award, Clock, RotateCw, QrCode, Zap, ChevronDown, Shield, Crown } from 'lucide-react';
import { QRCard } from '../../components/QRCard';
import LoyaltyCardService, { LoyaltyCard, CardActivity } from '../../services/loyaltyCardService';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const CustomerCards = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [animateIn, setAnimateIn] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [rotateCard, setRotateCard] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loyaltyCards, setLoyaltyCards] = useState<LoyaltyCard[]>([]);
  const [cardActivities, setCardActivities] = useState<Record<string, CardActivity[]>>({});
  const [selectedCardForQR, setSelectedCardForQR] = useState<LoyaltyCard | null>(null);

  // Load loyalty cards from database
  const fetchCards = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Get customer ID from user ID
      let userId = user.id;
      console.log('User ID:', userId);
      
      let customerId = await LoyaltyCardService.getCustomerIdByUserId(userId);
      console.log('Found customer ID:', customerId);
      
      if (customerId) {
        console.log('Loading loyalty cards for customer:', customerId);
        // Get loyalty cards for this customer
        const cards = await LoyaltyCardService.getCustomerCards(customerId);
        console.log('Loaded loyalty cards:', cards);
        
        // If no cards were found for this customer, try to create them
        if (!cards || cards.length === 0) {
          console.log('No cards found for customer, attempting to create default cards...');
          try {
            // Create standard card if doesn't exist (via enrollment API)
            await LoyaltyCardService.enrollCustomerInProgram(customerId, "1", "1");
            
            // Create fitness card if doesn't exist
            await LoyaltyCardService.enrollCustomerInProgram(customerId, "10", "10");
            
            // Fetch cards again after creation
            const updatedCards = await LoyaltyCardService.getCustomerCards(customerId);
            setLoyaltyCards(updatedCards);
            console.log('Created and loaded default cards:', updatedCards);
          } catch (createError) {
            console.error('Error creating default cards:', createError);
            setLoyaltyCards([]); // Still set empty array to avoid undefined
          }
        } else {
          setLoyaltyCards(cards);
        }
        
        // Get activities for each card
        const activities: Record<string, CardActivity[]> = {};
        
        for (const card of cards) {
          const cardActivities = await LoyaltyCardService.getCardActivities(card.id);
          activities[card.id] = cardActivities;
        }
        
        setCardActivities(activities);
      } else {
        console.error('No customer account found for user ID:', userId);
        setLoyaltyCards([]);
        setError('No customer account associated with this user. Please contact support.');
      }
    } catch (err) {
      console.error('Error loading loyalty cards:', err);
      setError('Failed to load your loyalty cards. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  useEffect(() => {
    if (!user) return;
    const storageKey = `cards_update_${user.id}`;
    const handler = (e: StorageEvent) => {
      if (e.key === storageKey) {
        fetchCards();
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [user, fetchCards]);

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

  const handleShowQR = (card: LoyaltyCard | null, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCardForQR(card);
    setShowQR(true);
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
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading && !loyaltyCards.length) {
    return (
      <CustomerLayout>
        <div className="h-64 flex items-center justify-center">
          <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full text-blue-600" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="space-y-6 pb-20">
        <div className={`transition-all duration-500 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
              <CreditCard className="w-6 h-6 text-blue-500 mr-2" />
              {t('My Loyalty Cards')}
            </h1>
            <div className="bg-blue-50 px-4 py-2 rounded-lg text-blue-700 text-sm font-medium flex items-center">
              {loyaltyCards.length} {t('active cards')}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-600">
              {error}
            </div>
          )}

          {/* QR Code Modal */}
          {showQR && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={() => setShowQR(false)}>
              <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full transform transition-all scale-in-center" onClick={e => e.stopPropagation()}>
                <div className="mb-4 text-center">
                  <h2 className="text-xl font-bold text-gray-800">
                    {selectedCardForQR ? `${selectedCardForQR.businessName} Card` : t('Your QR Code')}
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {selectedCardForQR 
                      ? t('Scan to redeem points or rewards') 
                      : t('Scan to collect points')}
                  </p>
                </div>
                <QRCard 
                  userId={user?.id.toString() || ''} 
                  userName={user?.name || ''} 
                  cardId={selectedCardForQR?.id || ''}
                  businessId={selectedCardForQR?.businessId || ''}
                  points={selectedCardForQR?.points || 0}
                />
                {selectedCardForQR && (
                  <div className="mt-4 bg-blue-50 rounded-lg p-3 text-center text-blue-700">
                    <p className="font-medium">{t('Current Points')}: {selectedCardForQR.points}</p>
                    <p className="text-sm mt-1">{t('Card ID')}: {selectedCardForQR.id}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Virtual Cards Wallet */}
          <div className="space-y-5">
            {loyaltyCards.length === 0 && !loading ? (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-8 text-center">
                <div className="flex justify-center mb-4">
                  <CreditCard className="w-16 h-16 text-gray-300" />
                </div>
                <h2 className="text-xl font-medium text-gray-600 mb-2">{t('No Loyalty Cards Yet')}</h2>
                <p className="text-gray-500 mb-6">{t("You don't have any loyalty cards yet. Visit participating businesses to start collecting points!")}</p>
              </div>
            ) : (
              loyaltyCards.map((card) => (
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
                          <button 
                            onClick={(e) => handleShowQR(card, e)}
                            className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                          >
                            <QrCode className="w-5 h-5" />
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
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Quick Access */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-center">
        <button
          onClick={(e) => handleShowQR(null, e)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-full flex items-center shadow-lg hover:shadow-xl transition-all"
        >
          <QrCode className="w-5 h-5 mr-2" />
          {t('Show QR Code')}
        </button>
      </div>
    </CustomerLayout>
  );
};

export default CustomerCards; 