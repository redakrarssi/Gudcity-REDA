import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { 
  Map, 
  Search, 
  Navigation, 
  Tag, 
  Coffee, 
  ShoppingBag, 
  Utensils, 
  Store, 
  Heart, 
  Award, 
  Star, 
  Info, 
  ChevronRight,
  X 
} from 'lucide-react';

// Mock business data - replace with API call in production
const MOCK_BUSINESSES = [
  {
    id: 'biz1',
    name: 'Coffee Haven',
    category: 'cafe',
    distance: 0.3,
    rating: 4.8,
    address: '123 Main St, Downtown',
    rewards: [
      { id: 'rew1', name: 'Free Coffee', points: 100, description: 'Get a free medium coffee' },
      { id: 'rew2', name: '50% Off Pastry', points: 50, description: 'Half price on any pastry' }
    ],
    promos: ['COFFEE20', 'BREAKFAST5'],
    coordinates: { lat: 34.052235, lng: -118.243683 },
    logo: '☕',
    isFavorite: true
  },
  {
    id: 'biz2',
    name: 'Burger Bistro',
    category: 'restaurant',
    distance: 0.5,
    rating: 4.5,
    address: '456 Oak St, Downtown',
    rewards: [
      { id: 'rew3', name: 'Free Fries', points: 75, description: 'Get a free side of fries' },
      { id: 'rew4', name: 'Free Burger', points: 200, description: 'Get a free burger of your choice' }
    ],
    promos: ['BURGER10'],
    coordinates: { lat: 34.053235, lng: -118.245683 },
    logo: '🍔',
    isFavorite: false
  },
  {
    id: 'biz3',
    name: 'Fashion Forward',
    category: 'retail',
    distance: 0.7,
    rating: 4.3,
    address: '789 Elm St, Downtown',
    rewards: [
      { id: 'rew5', name: '15% Off', points: 150, description: '15% off your purchase' },
      { id: 'rew6', name: 'VIP Access', points: 500, description: 'Early access to new collections' }
    ],
    promos: ['STYLE25'],
    coordinates: { lat: 34.054235, lng: -118.247683 },
    logo: '👚',
    isFavorite: true
  },
  {
    id: 'biz4',
    name: 'Sweet Tooth Bakery',
    category: 'cafe',
    distance: 1.2,
    rating: 4.9,
    address: '321 Pine St, Midtown',
    rewards: [
      { id: 'rew7', name: 'Free Cupcake', points: 50, description: 'One free cupcake of your choice' },
      { id: 'rew8', name: 'Custom Cake Discount', points: 300, description: '20% off custom cake orders' }
    ],
    promos: ['SWEET10'],
    coordinates: { lat: 34.058235, lng: -118.249683 },
    logo: '🧁',
    isFavorite: false
  },
  {
    id: 'biz5',
    name: 'Tech Galaxy',
    category: 'electronics',
    distance: 1.5,
    rating: 4.2,
    address: '555 Circuit Ave, Uptown',
    rewards: [
      { id: 'rew9', name: 'Free Phone Case', points: 200, description: 'Free phone case with any phone purchase' },
      { id: 'rew10', name: 'Extended Warranty', points: 500, description: 'Additional 1-year warranty' }
    ],
    promos: ['TECH15'],
    coordinates: { lat: 34.060235, lng: -118.251683 },
    logo: '📱',
    isFavorite: false
  },
  {
    id: 'biz6',
    name: 'Fitness Plus',
    category: 'fitness',
    distance: 1.8,
    rating: 4.7,
    address: '777 Health Blvd, Westside',
    rewards: [
      { id: 'rew11', name: 'Free Session', points: 150, description: 'One free training session' },
      { id: 'rew12', name: 'Month Pass', points: 800, description: 'Free month of membership' }
    ],
    promos: ['FIT2023'],
    coordinates: { lat: 34.062235, lng: -118.253683 },
    logo: '💪',
    isFavorite: true
  }
];

// Category icons and colors
const CATEGORIES = {
  all: { icon: <Store className="w-5 h-5" />, color: 'bg-blue-100 text-blue-600' },
  cafe: { icon: <Coffee className="w-5 h-5" />, color: 'bg-amber-100 text-amber-600' },
  restaurant: { icon: <Utensils className="w-5 h-5" />, color: 'bg-red-100 text-red-600' },
  retail: { icon: <ShoppingBag className="w-5 h-5" />, color: 'bg-purple-100 text-purple-600' },
  electronics: { icon: <Tag className="w-5 h-5" />, color: 'bg-indigo-100 text-indigo-600' },
  fitness: { icon: <Award className="w-5 h-5" />, color: 'bg-green-100 text-green-600' }
};

const CustomerNearby = () => {
  const { t } = useTranslation();
  const [animateIn, setAnimateIn] = useState(false);
  const [businesses, setBusinesses] = useState(MOCK_BUSINESSES);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('distance');
  const [selectedBusiness, setSelectedBusiness] = useState<typeof MOCK_BUSINESSES[0] | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [favorites, setFavorites] = useState<string[]>(
    MOCK_BUSINESSES.filter(b => b.isFavorite).map(b => b.id)
  );

  useEffect(() => {
    // Trigger animation after a short delay
    const timer = setTimeout(() => {
      setAnimateIn(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  };

  const handleToggleFavorite = (businessId: string) => {
    if (favorites.includes(businessId)) {
      setFavorites(favorites.filter(id => id !== businessId));
    } else {
      setFavorites([...favorites, businessId]);
    }
  };

  const handleSelectBusiness = (business: typeof MOCK_BUSINESSES[0]) => {
    setSelectedBusiness(business);
  };

  const handleCloseDetails = () => {
    setSelectedBusiness(null);
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      setLocationError('');
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Simulate API call to get nearby businesses based on location
          // In a real app, you would make an API call with these coordinates
          console.log('Location obtained:', position.coords.latitude, position.coords.longitude);
          
          // For demo purposes, just reshuffle the businesses and adjust distances
          const shuffled = [...MOCK_BUSINESSES].sort(() => Math.random() - 0.5)
            .map(business => ({
              ...business,
              distance: parseFloat((Math.random() * 2).toFixed(1))
            }))
            .sort((a, b) => a.distance - b.distance);
          
          setBusinesses(shuffled);
          setIsLocating(false);
        },
        (error) => {
          setIsLocating(false);
          switch(error.code) {
            case error.PERMISSION_DENIED:
              setLocationError(t('Location permission denied. Please enable location services.'));
              break;
            case error.POSITION_UNAVAILABLE:
              setLocationError(t('Location information is unavailable.'));
              break;
            case error.TIMEOUT:
              setLocationError(t('The request to get location timed out.'));
              break;
            default:
              setLocationError(t('An unknown error occurred getting your location.'));
              break;
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setLocationError(t('Geolocation is not supported by this browser.'));
    }
  };

  // Filter and sort businesses
  const getFilteredBusinesses = () => {
    let filtered = [...businesses];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(business => 
        business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        business.rewards.some(reward => reward.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(business => business.category === selectedCategory);
    }
    
    // Apply sort
    switch (sortBy) {
      case 'distance':
        filtered.sort((a, b) => a.distance - b.distance);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'rewards':
        filtered.sort((a, b) => b.rewards.length - a.rewards.length);
        break;
    }
    
    return filtered;
  };

  const filteredBusinesses = getFilteredBusinesses();

  const getCategoryIcon = (category: string) => {
    return CATEGORIES[category as keyof typeof CATEGORIES]?.icon || CATEGORIES.all.icon;
  };

  const getCategoryColor = (category: string) => {
    return CATEGORIES[category as keyof typeof CATEGORIES]?.color || CATEGORIES.all.color;
  };

  const getDistanceText = (distance: number) => {
    return distance < 1 ? 
      `${Math.round(distance * 1000)} ${t('m away')}` : 
      `${distance.toFixed(1)} ${t('km away')}`;
  };

  const renderCategoryFilters = () => (
    <div className="flex overflow-x-auto py-2 pb-3 -mx-4 px-4 space-x-2">
      <button
        onClick={() => handleCategoryChange('all')}
        className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
          selectedCategory === 'all' 
            ? 'bg-blue-100 text-blue-800 border border-blue-200' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
        }`}
      >
        <Store className="w-4 h-4 mr-1.5" />
        {t('All')}
      </button>
      
      {Object.keys(CATEGORIES).filter(cat => cat !== 'all').map(category => (
        <button
          key={category}
          onClick={() => handleCategoryChange(category)}
          className={`flex items-center px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
            selectedCategory === category 
              ? `${getCategoryColor(category)} border border-current border-opacity-20` 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
          }`}
        >
          {getCategoryIcon(category)}
          <span className="ml-1.5 capitalize">{t(category)}</span>
        </button>
      ))}
    </div>
  );

  const renderBusinessCard = (business: typeof MOCK_BUSINESSES[0]) => (
    <div 
      key={business.id}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => handleSelectBusiness(business)}
    >
      <div className="p-4">
        <div className="flex justify-between">
          <div className="flex items-center">
            <div className={`w-10 h-10 ${getCategoryColor(business.category)} rounded-lg flex items-center justify-center text-2xl`}>
              {business.logo}
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-gray-800">{business.name}</h3>
              <div className="flex items-center text-xs text-gray-500 mt-0.5">
                <Star className="w-3 h-3 text-amber-400 mr-1" fill="currentColor" />
                <span className="mr-2">{business.rating}</span>
                <span>•</span>
                <span className="mx-2">{getDistanceText(business.distance)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFavorite(business.id);
            }}
            className="text-gray-400 hover:text-red-500"
          >
            <Heart 
              className="w-5 h-5" 
              fill={favorites.includes(business.id) ? 'currentColor' : 'none'} 
              stroke="currentColor"
              color={favorites.includes(business.id) ? '#ef4444' : 'currentColor'}
            />
          </button>
        </div>
        
        <div className="mt-3 text-xs text-gray-500">
          <p>{business.address}</p>
        </div>
        
        <div className="mt-3 flex flex-wrap gap-1">
          {business.rewards.slice(0, 2).map((reward, index) => (
            <div 
              key={reward.id}
              className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs flex items-center"
            >
              <Award className="w-3 h-3 mr-1" />
              {reward.name}
            </div>
          ))}
          {business.rewards.length > 2 && (
            <div className="bg-gray-50 text-gray-600 px-2 py-1 rounded text-xs flex items-center">
              +{business.rewards.length - 2} more
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderBusinessDetails = () => {
    if (!selectedBusiness) return null;
    
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleCloseDetails}>
        <div 
          className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-auto transform transition-all scale-in-center"
          onClick={e => e.stopPropagation()}
        >
          <div className="relative">
            <div className={`h-24 ${getCategoryColor(selectedBusiness.category)} flex items-center justify-center`}>
              <span className="text-5xl">{selectedBusiness.logo}</span>
            </div>
            <button 
              onClick={handleCloseDetails}
              className="absolute top-2 right-2 bg-white/80 p-1 rounded-full hover:bg-white transition-colors"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
            
            <div className="absolute bottom-0 left-0 right-0 transform translate-y-1/2 flex justify-center">
              <div className="bg-white rounded-lg shadow-md p-2 border border-gray-100">
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-amber-400 mr-1" fill="currentColor" />
                  <span className="font-medium">{selectedBusiness.rating}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 pt-12">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{selectedBusiness.name}</h2>
                <p className="text-gray-500 text-sm mt-1 flex items-center">
                  {getCategoryIcon(selectedBusiness.category)}
                  <span className="ml-1 capitalize">{t(selectedBusiness.category)}</span>
                  <span className="mx-2">•</span>
                  <span>{getDistanceText(selectedBusiness.distance)}</span>
                </p>
              </div>
              <button
                onClick={() => handleToggleFavorite(selectedBusiness.id)}
                className={`p-2 rounded-full ${
                  favorites.includes(selectedBusiness.id)
                    ? 'text-red-500 bg-red-50'
                    : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <Heart 
                  className="w-5 h-5" 
                  fill={favorites.includes(selectedBusiness.id) ? 'currentColor' : 'none'} 
                />
              </button>
            </div>
            
            <p className="text-gray-600 text-sm mt-4">{selectedBusiness.address}</p>
            
            <div className="mt-6">
              <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                <Award className="w-5 h-5 text-blue-500 mr-2" />
                {t('Available Rewards')}
              </h3>
              <div className="space-y-3">
                {selectedBusiness.rewards.map(reward => (
                  <div key={reward.id} className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-blue-800">{reward.name}</h4>
                      <div className="bg-blue-100 px-2 py-0.5 rounded text-blue-800 text-xs font-medium">
                        {reward.points} {t('points')}
                      </div>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">{reward.description}</p>
                  </div>
                ))}
              </div>
            </div>
            
            {selectedBusiness.promos.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                  <Tag className="w-5 h-5 text-purple-500 mr-2" />
                  {t('Active Promotions')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedBusiness.promos.map(promo => (
                    <div key={promo} className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm">
                      {promo}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between">
              <button className="text-blue-600 font-medium text-sm flex items-center">
                <Navigation className="w-4 h-4 mr-1.5" />
                {t('Get Directions')}
              </button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                {t('View Full Details')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMapPlaceholder = () => (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-8 text-center">
      <Map className="w-16 h-16 text-blue-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-blue-700 mb-2">{t('Map View')}</h3>
      <p className="text-blue-600 mb-6 max-w-md mx-auto">
        {t('Interactive map view would be implemented here with markers for each business location.')}
      </p>
      <div className="flex justify-center gap-4">
        <button 
          onClick={() => setShowMap(false)}
          className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
        >
          {t('List View')}
        </button>
        <button 
          onClick={handleGetLocation}
          disabled={isLocating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Navigation className="w-4 h-4 mr-1.5" />
          {isLocating ? t('Locating...') : t('Update Location')}
        </button>
      </div>
    </div>
  );

  return (
    <CustomerLayout>
      <div className="space-y-5 pb-10">
        {/* Header */}
        <div className={`transition-all duration-500 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
                <Map className="w-6 h-6 text-blue-500 mr-2" />
                {t('Nearby Rewards')}
              </h1>
              <p className="text-gray-500 mt-1">{t('Discover loyalty programs and rewards near you')}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMap(!showMap)}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center ${
                  showMap 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Map className="w-4 h-4 mr-1.5" />
                {showMap ? t('Map View') : t('Show Map')}
              </button>
              <button
                onClick={handleGetLocation}
                disabled={isLocating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
              >
                <Navigation className="w-4 h-4 mr-1.5" />
                {isLocating ? t('Locating...') : t('Update Location')}
              </button>
            </div>
          </div>
        </div>

        {/* Location error message */}
        {locationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-start">
            <Info className="w-5 h-5 mr-2 flex-shrink-0" />
            <p>{locationError}</p>
          </div>
        )}

        {/* Search and filters */}
        <div className={`space-y-4 transition-all duration-500 ease-out transform delay-100 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearch}
              placeholder={t('Search nearby businesses, rewards, or addresses...')}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <Search className="w-5 h-5" />
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              {renderCategoryFilters()}
            </div>
            
            <div className="flex items-center">
              <label className="text-sm text-gray-600 mr-2">
                {t('Sort by:')}
              </label>
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
              >
                <option value="distance">{t('Distance')}</option>
                <option value="rating">{t('Rating')}</option>
                <option value="rewards">{t('Most Rewards')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Map or List View */}
        <div className={`transition-all duration-500 ease-out transform delay-200 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          {showMap ? (
            renderMapPlaceholder()
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-gray-500 flex justify-between items-center">
                <span>
                  {filteredBusinesses.length} {t('businesses found')}
                </span>
                
                {filteredBusinesses.length > 0 && selectedCategory === 'all' && (
                  <span>
                    {t('Showing nearest locations')}
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBusinesses.map(business => renderBusinessCard(business))}
              </div>
              
              {filteredBusinesses.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-1">
                    {t('No businesses found')}
                  </h3>
                  <p className="text-gray-500">
                    {searchTerm ? t('Try a different search term or filter') : t('Try adjusting your filters')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Business details modal */}
        {selectedBusiness && renderBusinessDetails()}
        
        {/* Location tip */}
        <div className={`mt-8 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100 transition-all duration-500 ease-out transform delay-300 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <h2 className="text-lg font-medium text-gray-800 flex items-center mb-2">
            <Info className="w-5 h-5 text-indigo-500 mr-2" />
            {t('Location Tip')}
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            {t('Enable location services to see the most accurate nearby rewards. We only use your location to show you relevant businesses.')}
          </p>
          <button
            onClick={handleGetLocation}
            disabled={isLocating}
            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <Navigation className="w-4 h-4 mr-1.5" />
            {isLocating ? t('Locating...') : t('Update My Location')}
          </button>
        </div>
      </div>
      
      <style>{`
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
      `}</style>
    </CustomerLayout>
  );
};

export default CustomerNearby; 