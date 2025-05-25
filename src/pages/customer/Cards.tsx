import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { CreditCard, Coffee, Gift, Award, Tag, ChevronRight, Bookmark, Shield, Clock, RotateCw, QrCode } from 'lucide-react';
import { QRCard } from '../../components/QRCard';

const CustomerCards = () => {
  const { t } = useTranslation();
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [animateIn, setAnimateIn] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [rotateCard, setRotateCard] = useState('');

  // Mock user data
  const mockUser = {
    id: '123456789',
    name: 'John Doe'
  };

  // Mock loyalty cards data
  const loyaltyCards = [
    {
      id: 'card1',
      businessName: 'Local Coffee Shop',
      cardType: 'Premium Member',
      points: 235,
      nextReward: 'Free Coffee',
      pointsToNext: 15,
      color: 'from-blue-500 to-indigo-600',
      icon: <Coffee className="w-5 h-5" />,
      expiry: '2024-12-31',
      benefits: ['10% off every purchase', 'Free coffee on birthdays', 'Access to member events'],
      lastUsed: '2023-10-10'
    },
    {
      id: 'card2',
      businessName: 'Tasty Treats Bakery',
      cardType: 'Gold Tier',
      points: 450,
      nextReward: 'Free Dessert Platter',
      pointsToNext: 50,
      color: 'from-amber-400 to-red-500',
      icon: <Gift className="w-5 h-5" />,
      expiry: '2024-11-15',
      benefits: ['Free pastry with coffee', 'Early access to seasonal items', 'Double points on weekends'],
      lastUsed: '2023-10-05'
    },
    {
      id: 'card3',
      businessName: 'Fitness Center',
      cardType: 'Silver Member',
      points: 320,
      nextReward: 'Free Training Session',
      pointsToNext: 30,
      color: 'from-green-400 to-emerald-600',
      icon: <Award className="w-5 h-5" />,
      expiry: '2024-09-30',
      benefits: ['Guest passes', 'Locker access', 'Discounted personal training'],
      lastUsed: '2023-09-28'
    }
  ];

  useEffect(() => {
    // Trigger animation after a short delay
    const timer = setTimeout(() => {
      setAnimateIn(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  const handleCardClick = (cardId: string) => {
    setActiveCard(cardId === activeCard ? null : cardId);
  };

  const handleCardFlip = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRotateCard(rotateCard === cardId ? '' : cardId);
  };

  const handleShowQR = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowQR(!showQR);
  };

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

          {showQR && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4" onClick={() => setShowQR(false)}>
              <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full transform transition-all scale-in-center" onClick={e => e.stopPropagation()}>
                <div className="mb-4 text-center">
                  <h2 className="text-xl font-bold text-gray-800">{t('Your QR Code')}</h2>
                  <p className="text-gray-500 text-sm mt-1">{t('Scan to collect points')}</p>
                </div>
                <QRCard userId={mockUser.id} userName={mockUser.name} />
              </div>
            </div>
          )}

          {/* Virtual Cards Wallet */}
          <div className="grid gap-6">
            {loyaltyCards.map((card) => (
              <div 
                key={card.id}
                className={`cursor-pointer transition-all duration-700 ease-out ${
                  animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
                style={{ transitionDelay: `${loyaltyCards.indexOf(card) * 150}ms` }}
              >
                <div 
                  className={`perspective-1000 ${activeCard === card.id ? 'h-auto' : 'h-44'}`}
                  onClick={() => handleCardClick(card.id)}
                >
                  <div className={`relative ${
                    rotateCard === card.id ? 'rotate-y-180' : ''
                  } transition-all duration-700 transform-style-3d h-full`}>
                    {/* Front of the card */}
                    <div className="absolute w-full h-full backface-hidden">
                      <div className={`bg-gradient-to-br ${card.color} rounded-xl shadow-xl p-6 h-full text-white overflow-hidden group`}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mt-16 -mr-16"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black opacity-5 rounded-full -mb-16 -ml-16"></div>
                        
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center">
                              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg mr-3">
                                {card.icon}
                              </div>
                              <div>
                                <h3 className="font-bold text-lg">{card.businessName}</h3>
                                <p className="text-white/90 text-sm">{card.cardType}</p>
                              </div>
                            </div>
                            
                            <div className="mt-6">
                              <div className="flex items-center">
                                <div className="text-3xl font-bold mr-2">{card.points}</div>
                                <div className="text-sm opacity-90">{t('points')}</div>
                              </div>
                              <div className="text-xs mt-1 opacity-80">
                                {card.pointsToNext} {t('more points for')} {card.nextReward}
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
                                width: `${(card.points / (card.points + card.pointsToNext)) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Back of the card */}
                    <div className="absolute w-full h-full backface-hidden rotate-y-180">
                      <div className={`bg-white rounded-xl shadow-xl p-6 h-full border-2 ${
                        card.color.includes('blue') ? 'border-blue-400' : 
                        card.color.includes('amber') ? 'border-amber-400' : 
                        'border-green-400'
                      }`}>
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-gray-800">{card.businessName}</h3>
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
                              <p className="text-sm font-medium text-gray-700">{new Date(card.expiry).toLocaleDateString()}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start">
                            <Tag className="w-4 h-4 text-gray-400 mt-0.5 mr-2" />
                            <div>
                              <p className="text-xs text-gray-500">{t('Last Used')}</p>
                              <p className="text-sm font-medium text-gray-700">{new Date(card.lastUsed).toLocaleDateString()}</p>
                            </div>
                          </div>
                          
                          <div className="pt-2">
                            <p className="text-xs text-gray-500 mb-2 flex items-center">
                              <Shield className="w-4 h-4 text-gray-400 mr-2" />
                              {t('Benefits')}
                            </p>
                            <ul className="space-y-1.5">
                              {card.benefits.map((benefit, index) => (
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
                  
                  {/* Card details (expanded when card is active) */}
                  {activeCard === card.id && (
                    <div className="mt-2 bg-white rounded-b-xl shadow-lg p-6 border border-gray-100 animate-fadeIn">
                      <h4 className="font-medium text-gray-800 mb-3">{t('Recent Activity')}</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                              <Bookmark className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">Earned 15 points</p>
                              <p className="text-xs text-gray-500">Oct 12, 2023</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                              <Gift className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">Redeemed reward</p>
                              <p className="text-xs text-gray-500">Oct 5, 2023</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Quick Access QR Code */}
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