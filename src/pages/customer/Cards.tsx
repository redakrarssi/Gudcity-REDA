import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { CreditCard, Coffee, Gift, Award, Tag, ChevronRight, Bookmark, Shield, Clock, RotateCw, QrCode } from 'lucide-react';
import { QRCard } from '../../components/QRCard';
import LoyaltyCardService, { LoyaltyCard, CardActivity } from '../../services/loyaltyCardService';
import { useAuth } from '../../contexts/AuthContext';

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
  const [cardActivities, setCardActivities] = useState<Record<number, CardActivity[]>>({});

  // Load loyalty cards from database
  useEffect(() => {
    const fetchCards = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Get customer ID from user ID
        const customerId = await LoyaltyCardService.getCustomerIdByUserId(user.id);
        
        if (customerId) {
          // Get loyalty cards for this customer
          const cards = await LoyaltyCardService.getCustomerCards(customerId);
          setLoyaltyCards(cards);
          
          // Get activities for each card
          const activities: Record<number, CardActivity[]> = {};
          
          for (const card of cards) {
            const cardActivities = await LoyaltyCardService.getCardActivities(card.id);
            activities[card.id] = cardActivities;
          }
          
          setCardActivities(activities);
        } else {
          setLoyaltyCards([]);
          setError('No customer account associated with this user');
        }
      } catch (err) {
        console.error('Error loading loyalty cards:', err);
        setError('Failed to load your loyalty cards');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCards();
  }, [user]);

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

  const handleShowQR = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowQR(!showQR);
  };
  
  const getIconForCard = (card: LoyaltyCard) => {
    const businessName = card.business_name?.toLowerCase() || '';
    
    if (businessName.includes('coffee') || businessName.includes('cafe')) {
      return <Coffee className="w-5 h-5" />;
    } else if (businessName.includes('bakery') || businessName.includes('treats') || businessName.includes('food')) {
      return <Gift className="w-5 h-5" />;
    } else {
      return <Award className="w-5 h-5" />;
    }
  };
  
  // Function to format date
  const formatDate = (dateString: string | Date): string => {
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
      <div className="space-y-6">
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

          {showQR && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={() => setShowQR(false)}>
              <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full transform transition-all scale-in-center" onClick={e => e.stopPropagation()}>
                <div className="mb-4 text-center">
                  <h2 className="text-xl font-bold text-gray-800">{t('Your QR Code')}</h2>
                  <p className="text-gray-500 text-sm mt-1">{t('Scan to collect points')}</p>
                </div>
                <QRCard userId={user?.id.toString() || ''} userName={user?.name || ''} />
              </div>
            </div>
          )}

          {/* Virtual Cards Wallet */}
          <div className="space-y-6">
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
                <div 
                  key={card.id}
                  className={`cursor-pointer transition-all duration-700 ease-out ${
                    animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                  }`}
                  style={{ transitionDelay: `${loyaltyCards.indexOf(card) * 150}ms` }}
                >
                  <div 
                    className={`perspective-1000 ${activeCard === card.id.toString() ? 'h-auto' : 'h-44'}`}
                    onClick={() => handleCardClick(card.id)}
                  >
                    <div className={`relative ${
                      rotateCard === card.id.toString() ? 'rotate-y-180' : ''
                    } transition-all duration-700 transform-style-3d h-full`}>
                      {/* Front of the card */}
                      <div className="absolute inset-0 backface-hidden">
                        <div className={`bg-gradient-to-br ${
                          card.card_type === 'PREMIUM' ? 'from-blue-500 to-indigo-600' :
                          card.card_type === 'GOLD' ? 'from-amber-400 to-red-500' : 
                          'from-green-400 to-emerald-600'
                        } rounded-xl shadow-xl p-6 h-full text-white overflow-hidden group`}>
                          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mt-16 -mr-16"></div>
                          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black opacity-5 rounded-full -mb-16 -ml-16"></div>
                          
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center">
                                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg mr-3">
                                  {getIconForCard(card)}
                                </div>
                                <div>
                                  <h3 className="font-bold text-lg">{card.business_name}</h3>
                                  <p className="text-white/90 text-sm">{card.card_type}</p>
                                </div>
                              </div>
                              
                              <div className="mt-6">
                                <div className="flex items-center">
                                  <div className="text-3xl font-bold mr-2">{card.points}</div>
                                  <div className="text-sm opacity-90">{t('points')}</div>
                                </div>
                                <div className="text-xs mt-1 opacity-80">
                                  {card.points_to_next} {t('more points for')} {card.next_reward}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex space-x-2">
                              <button 
                                onClick={(e) => handleCardFlip(card.id, e)}
                                className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                              >
                                <RotateCw className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={handleShowQR}
                                className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="mt-5">
                            <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
                                style={{ 
                                  width: `${(card.points / (card.points + card.points_to_next)) * 100}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Back of the card */}
                      <div className="absolute inset-0 backface-hidden rotate-y-180">
                        <div className={`bg-white rounded-xl shadow-xl p-6 h-full border-2 ${
                          card.card_type === 'PREMIUM' ? 'border-blue-400' : 
                          card.card_type === 'GOLD' ? 'border-amber-400' : 
                          'border-green-400'
                        }`}>
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-gray-800">{card.business_name}</h3>
                            <button 
                              onClick={(e) => handleCardFlip(card.id, e)}
                              className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                            >
                              <RotateCw className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                          
                          <div className="mt-4 space-y-3">
                            <div className="flex items-start">
                              <Clock className="w-4 h-4 text-gray-400 mt-0.5 mr-2" />
                              <div>
                                <p className="text-xs text-gray-500">{t('Expiry Date')}</p>
                                <p className="text-sm font-medium text-gray-700">{formatDate(card.expiry_date)}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start">
                              <Tag className="w-4 h-4 text-gray-400 mt-0.5 mr-2" />
                              <div>
                                <p className="text-xs text-gray-500">{t('Last Used')}</p>
                                <p className="text-sm font-medium text-gray-700">{formatDate(card.last_used)}</p>
                              </div>
                            </div>
                            
                            <div className="pt-2">
                              <p className="text-xs text-gray-500 mb-2 flex items-center">
                                <Shield className="w-4 h-4 text-gray-400 mr-2" />
                                {t('Benefits')}
                              </p>
                              <ul className="space-y-1.5">
                                {(card.benefits || []).map((benefit, index) => (
                                  <li key={index} className="text-xs text-gray-700 flex items-center">
                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                                    {benefit}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Card details (expanded when card is active) */}
                  {activeCard === card.id.toString() && (
                    <div className="mt-2 bg-white rounded-b-xl shadow-lg p-6 border border-gray-100 animate-fadeIn">
                      <h4 className="font-medium text-gray-800 mb-3">{t('Recent Activity')}</h4>
                      <div className="space-y-3">
                        {cardActivities[card.id] && cardActivities[card.id].length > 0 ? (
                          cardActivities[card.id].map((activity, index) => (
                            <div 
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                                  <Bookmark className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-800">
                                    {activity.activity_type === 'EARN_POINTS' 
                                      ? `Earned ${activity.points} points`
                                      : activity.activity_type === 'REDEEM_POINTS'
                                        ? `Redeemed ${activity.points} points`
                                        : 'Card used'
                                    }
                                  </p>
                                  <p className="text-xs text-gray-500">{formatDate(activity.created_at)}</p>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </div>
                          ))
                        ) : (
                          <div className="py-4 text-center text-gray-500 text-sm">
                            {t('No recent activity for this card')}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className={`mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 transition-all duration-500 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`} style={{ transitionDelay: '600ms' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-800 flex items-center">
                <QrCode className="w-5 h-5 text-blue-500 mr-2" />
                {t('Quick Access')}
              </h2>
              <button 
                onClick={handleShowQR}
                className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition-colors font-medium flex items-center"
              >
                <QrCode className="w-4 h-4 mr-1.5" />
                {t('Show QR')}
              </button>
            </div>
            <p className="text-gray-600 text-sm">
              {t('Show your QR code to collect points with any of your loyalty cards')}
            </p>
          </div>
        </div>
      </div>
      
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        
        .backface-hidden {
          backface-visibility: hidden;
        }
        
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        
        .scale-in-center {
          animation: scale-in-center 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }
        
        @keyframes scale-in-center {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </CustomerLayout>
  );
};

export default CustomerCards; 