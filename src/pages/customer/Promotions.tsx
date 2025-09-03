import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { Ticket, Star, Gift, TrendingUp, Search, Filter, Clock, Heart, Sparkles, ChevronRight, X, Rocket, Zap, AlertCircle } from 'lucide-react';
import { PromoService } from '../../services/promoService';
import type { PromoCode } from '../../types/promo';
import { useAuth } from '../../contexts/AuthContext';

// Themes for cards
const THEMES = {
  summer: {
    gradient: 'from-orange-400 to-red-500',
    bg: 'bg-orange-50',
    text: 'text-orange-900',
    border: 'border-orange-200'
  },
  winter: {
    gradient: 'from-cyan-400 to-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-900',
    border: 'border-blue-200'
  },
  spring: {
    gradient: 'from-green-400 to-emerald-500',
    bg: 'bg-green-50',
    text: 'text-green-900',
    border: 'border-green-200'
  },
  autumn: {
    gradient: 'from-amber-400 to-yellow-500',
    bg: 'bg-amber-50',
    text: 'text-amber-900',
    border: 'border-amber-200'
  },
  special: {
    gradient: 'from-purple-400 to-pink-500',
    bg: 'bg-purple-50',
    text: 'text-purple-900',
    border: 'border-purple-200'
  }
};

// Mock user data - replace with real user data in production
const MOCK_USER = {
  id: 'user123',
  name: 'John Doe',
  email: 'john@example.com',
  favorites: ['SUMMER25', 'FREEMEAL']
};

const CustomerPromotions = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Animation states
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    // Load favorites from local storage
    try {
      const savedFavorites = localStorage.getItem('favorite_promos');
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    } catch (e) {
      console.error('Error loading favorites:', e);
    }

    // Fetch promotions from the database
    async function loadPromotions() {
      setLoading(true);
      setError(null);
      
      try {
        const { promotions, error } = await PromoService.getAvailablePromotions();
        
        if (error) {
          setError(error);
          console.error('Error from PromoService:', error);
          return;
        }
        
        setPromos(promotions);
        setAnimateIn(true);
      } catch (err) {
        console.error('Error fetching promotions:', err);
        setError(err instanceof Error ? err.message : t('promotions.failedToLoadPromotions'));
      } finally {
        setLoading(false);
      }
    }
    
    loadPromotions();
  }, []);

  // Save favorites to localStorage when they change
  useEffect(() => {
    if (favorites.length > 0) {
      localStorage.setItem('favorite_promos', JSON.stringify(favorites));
    }
  }, [favorites]);

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
    if (!promos) return [];
    
    let filtered = [...promos];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(promo => 
        promo.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promo.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promo.description?.toLowerCase().includes(searchTerm.toLowerCase())
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
      // For type filters like 'DISCOUNT', 'POINTS', etc.
      filtered = filtered.filter(promo => promo.type === activeFilter);
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
    if (!expiresAt) return t('promotions.neverExpiresText');
    
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = Math.abs(expiry.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 30) return t('promotions.monthsLeft', { months: Math.floor(diffDays / 30) });
    if (diffDays > 1) return t('promotions.daysLeft', { days: diffDays });
    return t('promotions.lastDay');
  };

  // Helper to assign theme based on promo code
  const getThemeForPromo = (promo: PromoCode): keyof typeof THEMES => {
    // If we don't have explicit theme data, assign based on type
    switch(promo.type) {
      case 'DISCOUNT': return 'summer';
      case 'POINTS': return 'winter';
      case 'CASHBACK': return 'autumn';
      case 'GIFT': return 'special';
      default: return 'spring';
    }
  };

  const filteredPromos = getFilteredPromos();

  return (
    <CustomerLayout>
      <div className="space-y-6 pb-10 promotions-page">
        {/* Header with search */}
        <div className={`transition-all duration-500 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div className="promotions-header">
              <h1 className="text-2xl font-semibold text-gray-800 flex items-center header-title">
                <Ticket className="w-6 h-6 text-blue-500 mr-2" />
                {t('promotions.exclusivePromotions')}
              </h1>
              <p className="text-gray-500 mt-1 header-subtitle">{t('promotions.discoverSpecialOffers')}</p>
            </div>
            
            <div className="relative search-container">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('promotions.searchPromotions')}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-full w-full md:w-64 focus:ring-blue-500 focus:border-blue-500 search-input"
              />
              <div className="absolute left-3 top-2.5 text-gray-400 search-icon">
                <Search className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4 error-state">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500 error-icon" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 error-message">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="flex justify-center items-center py-20 loading-state">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Filter tabs */}
            <div className={`transition-all duration-500 delay-100 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <div className="flex space-x-2 overflow-x-auto pb-2 hide-scrollbar filter-tabs">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-full flex items-center filter-tab ${
                    activeFilter === 'all' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Filter className="w-4 h-4 mr-1 filter-icon" />
                  {t('promotions.all')}
                </button>
                <button
                  onClick={() => setActiveFilter('favorites')}
                  className={`px-3 py-1.5 rounded-full flex items-center filter-tab ${
                    activeFilter === 'favorites' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Heart className="w-4 h-4 mr-1 filter-icon" />
                  {t('promotions.favorites')}
                </button>
                <button
                  onClick={() => setActiveFilter('expiring')}
                  className={`px-3 py-1.5 rounded-full flex items-center filter-tab ${
                    activeFilter === 'expiring' 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Clock className="w-4 h-4 mr-1 filter-icon" />
                  {t('promotions.expiringSoon')}
                </button>
                <button
                  onClick={() => setActiveFilter('DISCOUNT')}
                  className={`px-3 py-1.5 rounded-full flex items-center filter-tab ${
                    activeFilter === 'DISCOUNT' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Ticket className="w-4 h-4 mr-1 filter-icon" />
                  {t('promotions.discounts')}
                </button>
                <button
                  onClick={() => setActiveFilter('POINTS')}
                  className={`px-3 py-1.5 rounded-full flex items-center filter-tab ${
                    activeFilter === 'POINTS' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Star className="w-4 h-4 mr-1 filter-icon" />
                  {t('promotions.points')}
                </button>
              </div>
            </div>

            {/* Featured Promos */}
            {promos.filter(p => p.name?.includes('Special') || p.name?.includes('Welcome')).length > 0 && (
              <div className={`transition-all duration-500 delay-100 ease-out transform featured-section ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                <h2 className="text-lg font-medium text-gray-700 mb-4 flex items-center featured-title">
                  <Rocket className="w-5 h-5 text-orange-500 mr-2 featured-icon" />
                  {t('promotions.featuredOffers')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 promotions-grid">
                  {promos
                    .filter(p => p.name?.includes('Special') || p.name?.includes('Welcome'))
                    .slice(0, 3)
                    .map((promo) => {
                      const theme = getThemeForPromo(promo);
                      const typeDetails = getPromoTypeDetails(promo.type);
                      return (
                        <div
                          key={promo.id}
                          className={`bg-white rounded-lg shadow-md overflow-hidden border promotion-card ${THEMES[theme].border}`}
                        >
                          <div className={`h-2 bg-gradient-to-r ${THEMES[theme].gradient}`}></div>
                          <div className="p-5">
                            <div className="flex justify-between items-start card-header">
                              <div>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium promo-type-badge ${typeDetails.bgColor} ${typeDetails.textColor}`}>
                                  {typeDetails.icon}
                                  <span className="ml-1 type-icon">{promo.type}</span>
                                </span>
                                <h3 className="mt-2 text-lg font-medium text-gray-900 business-name">{promo.businessName}</h3>
                                <p className="text-sm text-gray-500 promo-description">{promo.description}</p>
                              </div>
                              <button
                                onClick={() => handleToggleFavorite(promo.code)}
                                className="text-gray-400 hover:text-red-500 focus:outline-none transition-colors favorite-button"
                              >
                                <Heart className={`h-6 w-6 ${favorites.includes(promo.code) ? 'fill-current text-red-500' : ''}`} />
                              </button>
                            </div>
                            
                            <div className="mt-4 bg-gray-50 rounded-lg p-3 flex justify-between items-center promo-code-section">
                              <div className="font-mono text-lg font-bold text-gray-800 promo-code">{promo.code}</div>
                              <button
                                onClick={() => handleCopyCode(promo.code)}
                                className={`text-sm font-medium px-3 py-1 rounded-full copy-button ${
                                  copied === promo.code
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                }`}
                              >
                                {copied === promo.code ? t('promotions.copied') : t('promotions.copy')}
                              </button>
                            </div>
                            
                            <div className="mt-3 flex justify-between text-sm promo-details">
                              <span className="text-gray-500 expiry-info">{promo.expiresAt ? t('promotions.expires', { time: calculateTimeLeft(promo.expiresAt) }) : t('promotions.neverExpires')}</span>
                              <span className="text-gray-500 usage-info">{promo.maxUses ? `${promo.usedCount}/${promo.maxUses} ${t('promotions.used')}` : t('promotions.unlimited')}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* All Promotions */}
            <div className={`transition-all duration-500 delay-300 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              {filteredPromos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 promotions-grid">
                  {filteredPromos.map((promo) => {
                    const theme = getThemeForPromo(promo);
                    const typeDetails = getPromoTypeDetails(promo.type);
                    return (
                      <div
                        key={promo.id}
                        className="bg-white rounded-lg shadow-md overflow-hidden transform transition-all duration-300 hover:shadow-lg border border-gray-100 promotion-card"
                      >
                        <div className={`h-2 bg-gradient-to-r ${THEMES[theme].gradient}`}></div>
                        <div className="p-4">
                          <div className="flex justify-between items-start card-header">
                            <div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium promo-type-badge ${typeDetails.bgColor} ${typeDetails.textColor}`}>
                                {typeDetails.icon}
                                <span className="ml-1 type-icon">{promo.type}</span>
                              </span>
                              <h3 className="mt-2 text-lg font-medium text-gray-900 business-name">{promo.businessName}</h3>
                              <p className="text-sm text-gray-500 promo-description">{promo.description}</p>
                            </div>
                            <button
                              onClick={() => handleToggleFavorite(promo.code)}
                              className="text-gray-400 hover:text-red-500 focus:outline-none transition-colors favorite-button"
                            >
                              <Heart className={`h-6 w-6 ${favorites.includes(promo.code) ? 'fill-current text-red-500' : ''}`} />
                            </button>
                          </div>
                          
                          <div className="mt-4 bg-gray-50 rounded-lg p-3 flex justify-between items-center promo-code-section">
                            <div className="font-mono text-lg font-bold text-gray-800 promo-code">{promo.code}</div>
                            <button
                              onClick={() => handleCopyCode(promo.code)}
                              className={`text-sm font-medium px-3 py-1 rounded-full copy-button ${
                                copied === promo.code
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                              }`}
                            >
                              {copied === promo.code ? t('promotions.copied') : t('promotions.copy')}
                            </button>
                          </div>
                          
                          <div className="mt-3 flex justify-between text-sm promo-details">
                            <span className="text-gray-500 expiry-info">{promo.expiresAt ? t('promotions.expires', { time: calculateTimeLeft(promo.expiresAt) }) : t('promotions.neverExpires')}</span>
                            <span className="text-gray-500 usage-info">{promo.maxUses ? `${promo.usedCount}/${promo.maxUses} ${t('promotions.used')}` : t('promotions.unlimited')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center empty-state">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <Ticket className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2 empty-title">
                    {activeFilter === 'favorites' ? t('promotions.noFavoritesYet') : t('promotions.noPromotionsFound')}
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto empty-description">
                    {activeFilter === 'favorites' 
                      ? t('promotions.favoritePromotionsYouLike')
                      : searchTerm 
                        ? t('promotions.tryAdjustingSearchTerms')
                        : t('promotions.checkBackLaterForNewOffers')}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      <style>
        {`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>
    </CustomerLayout>
  );
};

export default CustomerPromotions; 