import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { 
  Sparkles, Gift, Ticket, QrCode, Calendar, 
  TrendingUp, Zap, Star, Rocket, Flame, Award, Heart
} from 'lucide-react';
import { PromoService } from '../../services/promoService';
import { CurrencyService } from '../../services/currencyService';
import type { PromoCode } from '../../types/promo';

// Mock user data - replace with actual user data in production
const MOCK_USER = {
  id: 'cust123',
  name: 'John Doe',
  points: 320,
  favorites: ['SUMMER25', 'NEWYEAR']
};

// Seasonal themes with colors and icons
const THEMES = {
  summer: {
    gradient: 'from-yellow-400 via-orange-400 to-red-400',
    icon: <Flame className="h-8 w-8" />,
    name: 'Summer Deals'
  },
  spring: {
    gradient: 'from-green-400 via-emerald-400 to-teal-400',
    icon: <Heart className="h-8 w-8" />,
    name: 'Spring Specials'
  },
  winter: {
    gradient: 'from-blue-400 via-indigo-400 to-purple-400',
    icon: <Sparkles className="h-8 w-8" />,
    name: 'Winter Wonders'
  },
  special: {
    gradient: 'from-pink-400 via-fuchsia-400 to-purple-500',
    icon: <Award className="h-8 w-8" />,
    name: 'Limited Offers'
  }
};

// Mock promotions data - replace with API call in production
const MOCK_PROMOS = [
  {
    id: 'promo1',
    businessId: 'biz1',
    businessName: 'Coffee Haven',
    code: 'COFFEE50',
    type: 'DISCOUNT',
    value: 50,
    currency: 'USD',
    maxUses: 100,
    usedCount: 28,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    description: 'Get 50% off your next coffee purchase!',
    theme: 'summer',
    featured: true
  },
  {
    id: 'promo2',
    businessId: 'biz2',
    businessName: 'Bookworm Paradise',
    code: 'BOOKS25',
    type: 'DISCOUNT',
    value: 25,
    currency: 'USD',
    maxUses: null,
    usedCount: 124,
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    description: '25% off on all bestsellers!',
    theme: 'spring',
    featured: false
  },
  {
    id: 'promo3',
    businessId: 'biz3',
    businessName: 'Tech Gadgets',
    code: 'POINTS100',
    type: 'POINTS',
    value: 100,
    maxUses: 50,
    usedCount: 12,
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    description: 'Earn 100 bonus points on any purchase!',
    theme: 'winter',
    featured: true
  },
  {
    id: 'promo4',
    businessId: 'biz4',
    businessName: 'Foodie Heaven',
    code: 'FREEMEAL',
    type: 'GIFT',
    value: 25,
    currency: 'USD',
    maxUses: 10,
    usedCount: 5,
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    description: 'Free appetizer with any entrée purchase',
    theme: 'special',
    featured: true
  },
  {
    id: 'promo5',
    businessId: 'biz5',
    businessName: 'Fitness First',
    code: 'FIT2023',
    type: 'DISCOUNT',
    value: 30,
    currency: 'USD',
    maxUses: 200,
    usedCount: 45,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    description: '30% off your first month membership',
    theme: 'spring',
    featured: false
  },
  {
    id: 'promo6',
    businessId: 'biz6',
    businessName: 'Beauty Spot',
    code: 'BEAUTY15',
    type: 'CASHBACK',
    value: 15,
    currency: 'USD',
    maxUses: null,
    usedCount: 67,
    expiresAt: null,
    status: 'ACTIVE',
    description: '15% cashback on all beauty products',
    theme: 'special',
    featured: false
  }
];

const CustomerPromotions = () => {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [promos, setPromos] = useState<typeof MOCK_PROMOS>([]);
  const [favorites, setFavorites] = useState<string[]>(MOCK_USER.favorites);
  const [copied, setCopied] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Animation states
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    // Simulate API fetch with a delay
    const timer = setTimeout(() => {
      setPromos(MOCK_PROMOS);
      setAnimateIn(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleToggleFavorite = (code: string) => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);
    
    if (favorites.includes(code)) {
      setFavorites(favorites.filter(c => c !== code));
    } else {
      setFavorites([...favorites, code]);
    }
  };

  const getFilteredPromos = () => {
    let filtered = [...promos];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(promo => 
        promo.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promo.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promo.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply category filter
    if (activeFilter === 'favorites') {
      filtered = filtered.filter(promo => favorites.includes(promo.code));
    } else if (activeFilter === 'expiring') {
      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
      filtered = filtered.filter(promo => 
        promo.expiresAt && new Date(promo.expiresAt) < oneWeekFromNow
      );
    } else if (activeFilter !== 'all') {
      filtered = filtered.filter(promo => promo.theme === activeFilter);
    }
    
    return filtered;
  };

  const getPromoTypeDetails = (type: string) => {
    switch(type) {
      case 'DISCOUNT':
        return { 
          icon: <Ticket className="h-5 w-5 text-green-500" />,
          bgColor: 'bg-green-100',
          textColor: 'text-green-800' 
        };
      case 'POINTS':
        return { 
          icon: <Star className="h-5 w-5 text-blue-500" />,
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800' 
        };
      case 'CASHBACK':
        return { 
          icon: <TrendingUp className="h-5 w-5 text-purple-500" />,
          bgColor: 'bg-purple-100',
          textColor: 'text-purple-800' 
        };
      case 'GIFT':
        return { 
          icon: <Gift className="h-5 w-5 text-pink-500" />,
          bgColor: 'bg-pink-100',
          textColor: 'text-pink-800' 
        };
      default:
        return { 
          icon: <Ticket className="h-5 w-5 text-gray-500" />,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800' 
        };
    }
  };

  const calculateTimeLeft = (expiresAt: string | null) => {
    if (!expiresAt) return 'Never expires';
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = Math.abs(expiry.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 30) return `${Math.floor(diffDays / 30)} months left`;
    if (diffDays > 1) return `${diffDays} days left`;
    return 'Last day!';
  };

  const filteredPromos = getFilteredPromos();

  return (
    <CustomerLayout>
      <div className="space-y-6 pb-10">
        {/* Header with search */}
        <div className={`transition-all duration-500 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
                <Ticket className="w-6 h-6 text-blue-500 mr-2" />
                {t('Exclusive Promotions')}
              </h1>
              <p className="text-gray-500 mt-1">{t('Discover special offers from your favorite places')}</p>
            </div>
            
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('Search promotions...')}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-full w-full md:w-64 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Promos */}
        {promos.filter(p => p.featured).length > 0 && (
          <div className={`transition-all duration-500 delay-100 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <h2 className="text-lg font-medium text-gray-700 mb-4 flex items-center">
              <Rocket className="w-5 h-5 text-orange-500 mr-2" />
              {t('Featured Offers')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {promos.filter(p => p.featured).map((promo, index) => (
                <div 
                  key={promo.id}
                  className={`relative overflow-hidden rounded-xl shadow-md transform transition-all duration-300 hover:scale-[1.02] hover:shadow-lg bg-white`}
                >
                  <div className={`h-3 bg-gradient-to-r ${THEMES[promo.theme as keyof typeof THEMES].gradient}`}></div>
                  <div className="p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-800">{promo.businessName}</h3>
                        <p className="text-sm text-gray-600 mt-1">{promo.description}</p>
                      </div>
                      {THEMES[promo.theme as keyof typeof THEMES].icon}
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPromoTypeDetails(promo.type).bgColor} ${getPromoTypeDetails(promo.type).textColor}`}>
                          {getPromoTypeDetails(promo.type).icon}
                          <span className="ml-1">{promo.type}</span>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          <Calendar className="inline-block w-4 h-4 mr-1" />
                          {calculateTimeLeft(promo.expiresAt)}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleCopyCode(promo.code)}
                        className="relative flex items-center justify-center px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-lg shadow-sm hover:from-blue-600 hover:to-indigo-700 transition-all"
                      >
                        {copied === promo.code ? (
                          <>
                            <span className="animate-pulse">Copied!</span>
                          </>
                        ) : (
                          <>
                            <QrCode className="w-4 h-4 mr-1.5" />
                            {promo.code}
                          </>
                        )}
                      </button>
                    </div>
                    
                    <button
                      onClick={() => handleToggleFavorite(promo.code)}
                      className="absolute top-4 right-4"
                      aria-label={favorites.includes(promo.code) ? "Remove from favorites" : "Add to favorites"}
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-6 w-6 ${favorites.includes(promo.code) ? 'text-red-500 fill-red-500' : 'text-gray-300 hover:text-gray-400'}`} 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={favorites.includes(promo.code) ? 0 : 2} 
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Filters */}
        <div className={`transition-all duration-500 delay-200 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeFilter === 'all' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('All')}
            </button>
            <button
              onClick={() => setActiveFilter('favorites')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center ${
                activeFilter === 'favorites'
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Heart className="w-4 h-4 mr-1" />
              {t('Favorites')}
            </button>
            <button
              onClick={() => setActiveFilter('expiring')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center ${
                activeFilter === 'expiring'
                  ? 'bg-orange-100 text-orange-800' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4 mr-1" />
              {t('Expiring Soon')}
            </button>
            {Object.keys(THEMES).map(theme => (
              <button
                key={theme}
                onClick={() => setActiveFilter(theme)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center ${
                  activeFilter === theme 
                    ? `bg-${theme === 'summer' ? 'orange' : theme === 'spring' ? 'green' : theme === 'winter' ? 'blue' : 'purple'}-100 text-${theme === 'summer' ? 'orange' : theme === 'spring' ? 'green' : theme === 'winter' ? 'blue' : 'purple'}-800` 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {THEMES[theme as keyof typeof THEMES].icon}
                <span className="ml-1">{THEMES[theme as keyof typeof THEMES].name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* All Promos Grid */}
        <div className={`transition-all duration-500 delay-300 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          {filteredPromos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPromos.map((promo, index) => (
                <div 
                  key={promo.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden transform transition-all duration-300 hover:shadow-lg border border-gray-100"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`h-2 bg-gradient-to-r ${THEMES[promo.theme as keyof typeof THEMES].gradient}`}></div>
                  <div className="p-4">
                    <div className="flex justify-between">
                      <h3 className="font-semibold text-gray-800">{promo.businessName}</h3>
                      <button
                        onClick={() => handleToggleFavorite(promo.code)}
                        aria-label={favorites.includes(promo.code) ? "Remove from favorites" : "Add to favorites"}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className={`h-5 w-5 ${favorites.includes(promo.code) ? 'text-red-500 fill-red-500' : 'text-gray-300 hover:text-gray-400'}`} 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={favorites.includes(promo.code) ? 0 : 2} 
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                          />
                        </svg>
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1 mb-3">{promo.description}</p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPromoTypeDetails(promo.type).bgColor} ${getPromoTypeDetails(promo.type).textColor}`}>
                        {getPromoTypeDetails(promo.type).icon}
                        <span className="ml-1">{promo.type}</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        <Calendar className="inline-block w-3 h-3 mr-1" />
                        {calculateTimeLeft(promo.expiresAt)}
                      </div>
                    </div>
                    
                    <div className="mt-3 flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                        {promo.maxUses ? `${promo.usedCount}/${promo.maxUses} used` : `${promo.usedCount} used`}
                      </div>
                      <button 
                        onClick={() => handleCopyCode(promo.code)}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-lg transition-colors flex items-center"
                      >
                        {copied === promo.code ? (
                          <span className="text-green-600">✓ Copied</span>
                        ) : (
                          <>
                            <QrCode className="w-4 h-4 mr-1.5" />
                            {promo.code}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
                <Ticket className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-gray-700">{t('No promotions found')}</h3>
              <p className="text-gray-500 mt-1">
                {searchTerm 
                  ? t('Try a different search term') 
                  : activeFilter === 'favorites' 
                    ? t('You haven\'t added any favorites yet') 
                    : t('Check back later for new offers')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confetti effect when adding to favorites */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 50 }).map((_, i) => (
            <div 
              key={i}
              className="absolute confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-5%`,
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
                background: `hsl(${Math.random() * 360}, 100%, 50%)`,
                borderRadius: '50%',
                animationDuration: `${1 + Math.random() * 2}s`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <style>
        {`
          @keyframes confetti {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotate(720deg);
              opacity: 0;
            }
          }
          .confetti {
            animation: confetti 2s ease-out forwards;
          }
        `}
      </style>
    </CustomerLayout>
  );
};

export default CustomerPromotions; 