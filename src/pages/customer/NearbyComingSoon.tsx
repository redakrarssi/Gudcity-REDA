import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { 
  Map, 
  MapPin, 
  Navigation, 
  Star, 
  Gift, 
  Coffee, 
  ShoppingBag, 
  Utensils,
  Sparkles
} from 'lucide-react';

const NearbyComingSoon = () => {
  const { t } = useTranslation();
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimateIn(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  // Animated decorations for the background
  const decorations = [
    { type: 'line', color: 'bg-yellow-400', rotation: 'rotate-45', position: 'top-16 left-20', size: 'w-8 h-1' },
    { type: 'line', color: 'bg-cyan-400', rotation: 'rotate-12', position: 'top-24 right-24', size: 'w-6 h-1' },
    { type: 'line', color: 'bg-pink-400', rotation: '-rotate-45', position: 'top-32 left-32', size: 'w-7 h-1' },
    { type: 'line', color: 'bg-orange-400', rotation: 'rotate-90', position: 'top-20 right-32', size: 'w-5 h-1' },
    { type: 'line', color: 'bg-purple-400', rotation: 'rotate-[135deg]', position: 'top-40 right-20', size: 'w-6 h-1' },
    { type: 'line', color: 'bg-green-400', rotation: '-rotate-12', position: 'bottom-32 left-24', size: 'w-8 h-1' },
    { type: 'line', color: 'bg-blue-400', rotation: 'rotate-45', position: 'bottom-40 right-28', size: 'w-5 h-1' },
    { type: 'line', color: 'bg-red-400', rotation: '-rotate-45', position: 'bottom-24 left-36', size: 'w-4 h-1' },
    { type: 'line', color: 'bg-indigo-400', rotation: 'rotate-12', position: 'bottom-36 right-36', size: 'w-7 h-1' },
    { type: 'plus', color: 'text-yellow-400', position: 'top-48 left-48', size: 'text-2xl' },
    { type: 'plus', color: 'text-green-400', position: 'top-56 right-56', size: 'text-lg' },
    { type: 'plus', color: 'text-purple-400', position: 'bottom-48 left-56', size: 'text-xl' },
    { type: 'plus', color: 'text-pink-400', position: 'bottom-56 right-48', size: 'text-2xl' },
    { type: 'dot', color: 'bg-cyan-400', position: 'top-60 left-60', size: 'w-3 h-3' },
    { type: 'dot', color: 'bg-orange-400', position: 'top-52 right-52', size: 'w-2 h-2' },
    { type: 'dot', color: 'bg-blue-400', position: 'bottom-60 left-52', size: 'w-3 h-3' },
    { type: 'dot', color: 'bg-red-400', position: 'bottom-52 right-60', size: 'w-2 h-2' },
    { type: 'x', color: 'text-indigo-400', position: 'top-64 right-64', size: 'text-lg' },
    { type: 'x', color: 'text-pink-400', position: 'bottom-64 left-64', size: 'text-2xl' }
  ];

  const features = [
    {
      icon: <MapPin className="w-6 h-6" />,
      title: t('nearby.locationBasedDiscovery'),
      description: t('nearby.locationBasedDiscoveryDesc')
    },
    {
      icon: <Navigation className="w-6 h-6" />,
      title: t('nearby.smartRecommendations'),
      description: t('nearby.smartRecommendationsDesc')
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: t('nearby.exclusiveOffers'),
      description: t('nearby.exclusiveOffersDesc')
    },
    {
      icon: <Gift className="w-6 h-6" />,
      title: t('nearby.instantRewards'),
      description: t('nearby.instantRewardsDesc')
    }
  ];

  const mockBusinesses = [
    { name: t('nearby.cityCoffee'), category: t('nearby.cafe'), icon: <Coffee className="w-5 h-5" />, distance: "0.2 km", color: "bg-amber-100 text-amber-600" },
    { name: t('nearby.fashionHub'), category: t('nearby.retail'), icon: <ShoppingBag className="w-5 h-5" />, distance: "0.5 km", color: "bg-purple-100 text-purple-600" },
    { name: t('nearby.gourmetBistro'), category: t('nearby.restaurant'), icon: <Utensils className="w-5 h-5" />, distance: "0.8 km", color: "bg-green-100 text-green-600" }
  ];

  return (
    <CustomerLayout>
      <div className="min-h-screen relative overflow-hidden nearby-page">
        {/* Animated background decorations */}
        {decorations.map((decoration, index) => (
          <div
            key={index}
            className={`absolute ${decoration.position} ${decoration.rotation} animate-pulse opacity-30 decoration`}
            style={{ animationDelay: `${index * 0.3}s`, animationDuration: '3s' }}
          >
            {decoration.type === 'line' && (
              <div className={`${decoration.color} ${decoration.size} rounded-full decoration-line`}></div>
            )}
            {decoration.type === 'plus' && (
              <div className={`${decoration.color} ${decoration.size} font-bold decoration-plus`}>+</div>
            )}
            {decoration.type === 'dot' && (
              <div className={`${decoration.color} ${decoration.size} rounded-full decoration-dot`}></div>
            )}
            {decoration.type === 'x' && (
              <div className={`${decoration.color} ${decoration.size} font-bold decoration-x`}>×</div>
            )}
          </div>
        ))}

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className={`text-center mb-16 transition-all duration-1000 ease-out transform hero-section ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-6 shadow-2xl transform hover:scale-110 transition-transform">
                <Map className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-6xl font-black text-gray-800 mb-4 tracking-tight hero-title">
                {t('nearby.comingSoon').split(' ')[0]}
              </h1>
              <h1 className="text-6xl font-black text-gray-800 -mt-4 tracking-tight hero-title">
                {t('nearby.comingSoon').split(' ')[1]}
              </h1>
            </div>
            
            <div className="max-w-3xl mx-auto space-y-6">
              <h2 className="text-3xl font-bold text-gray-700 mb-4 hero-subtitle">
                {t('nearby.nearbyRewardsFeature')}
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed hero-description">
                {t('nearby.buildingSomethingAmazing')}
              </p>
              

            </div>
          </div>

          {/* Features Preview */}
          <div className={`mb-16 transition-all duration-1000 ease-out transform delay-300 features-section ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <h3 className="text-3xl font-bold text-center text-gray-800 mb-12">
              {t('nearby.whatsComingYourWay')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 features-grid">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all transform hover:-translate-y-2 feature-card"
                  style={{ animationDelay: `${600 + index * 200}ms` }}
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white mb-6 shadow-lg feature-icon">
                    {feature.icon}
                  </div>
                  <h4 className="text-xl font-bold text-gray-800 mb-3 feature-title">
                    {feature.title}
                  </h4>
                  <p className="text-gray-600 leading-relaxed feature-description">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Mock Business Preview */}
          <div className={`mb-16 transition-all duration-1000 ease-out transform delay-600 business-preview-section ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl p-12 border border-blue-200">
              <h3 className="text-3xl font-bold text-center text-gray-800 mb-4 preview-title">
                {t('nearby.previewBusinessesNearYou')}
              </h3>
              <p className="text-center text-gray-600 mb-8 text-lg preview-description">
                {t('nearby.sneakPeekDescription')}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto businesses-grid">
                {mockBusinesses.map((business, index) => (
                  <div 
                    key={index}
                    className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 border border-gray-100 business-card"
                  >
                    <div className="flex items-center justify-between mb-4 business-header">
                      <div className={`w-10 h-10 rounded-lg ${business.color} flex items-center justify-center business-icon`}>
                        {business.icon}
                      </div>
                      <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium business-distance">
                        {business.distance}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-gray-800 mb-1 business-name">
                      {business.name}
                    </h4>
                    <p className="text-gray-600 text-sm mb-3 business-category">
                      {business.category}
                    </p>
                    <div className="flex items-center text-amber-500 text-sm business-rating">
                      <Star className="w-4 h-4 fill-current mr-1 rating-star" />
                      <span className="font-medium">4.8</span>
                      <span className="text-gray-400 ml-2 loyalty-program">• {t('nearby.loyaltyProgram')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className={`text-center transition-all duration-1000 ease-out transform delay-900 cta-section ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-3xl p-12 text-white shadow-2xl">
              <Sparkles className="w-16 h-16 mx-auto mb-6 text-yellow-400" />
              <h3 className="text-3xl font-bold mb-4 cta-title">
                {t('nearby.getReadyForLaunch')}
              </h3>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto cta-description">
                {t('nearby.beFirstToExplore')}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-16 opacity-70 footer-section">
            <p className="text-sm text-gray-500 flex items-center justify-center footer-text">
              {t('nearby.proudlyCreatedWith')}{' '}
              <span className="ml-1 text-red-500">{t('nearby.heart')}</span>
            </p>
            <div className="flex justify-center space-x-3 mt-3 social-icons">
              <div className="w-5 h-5 bg-gray-400 rounded-sm flex items-center justify-center social-icon">
                <span className="text-white text-xs font-bold">f</span>
              </div>
              <div className="w-5 h-5 bg-gray-400 rounded-sm flex items-center justify-center social-icon">
                <span className="text-white text-xs font-bold">t</span>
              </div>
              <div className="w-5 h-5 bg-gray-400 rounded-sm flex items-center justify-center social-icon">
                <span className="text-white text-xs font-bold">@</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default NearbyComingSoon;
