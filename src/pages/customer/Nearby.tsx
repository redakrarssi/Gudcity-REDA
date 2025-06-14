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
  X,
  Loader,
  Loader2,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { LocationService } from '../../services/locationService';
import { NearbyProgram, Location } from '../../types/location';
import { NearbyPrograms } from '../../components/location/NearbyPrograms';
import { Button } from '../../components/ui/Button';

// Category icons and colors
const CATEGORIES = {
  all: { icon: <Store className="w-5 h-5" />, color: 'bg-blue-100 text-blue-600' },
  cafe: { icon: <Coffee className="w-5 h-5" />, color: 'bg-amber-100 text-amber-600' },
  restaurant: { icon: <Utensils className="w-5 h-5" />, color: 'bg-green-100 text-green-600' },
  retail: { icon: <ShoppingBag className="w-5 h-5" />, color: 'bg-purple-100 text-purple-600' },
  fitness: { icon: <Award className="w-5 h-5" />, color: 'bg-red-100 text-red-600' },
  electronics: { icon: <Tag className="w-5 h-5" />, color: 'bg-indigo-100 text-indigo-600' },
};

const CustomerNearby = () => {
  const { t } = useTranslation();
  const [animateIn, setAnimateIn] = useState(false);
  const [programs, setPrograms] = useState<NearbyProgram[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('distance');
  const [selectedProgram, setSelectedProgram] = useState<NearbyProgram | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(10); // Default radius 10km
  const [favorites, setFavorites] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>(['all']);

  useEffect(() => {
    // Trigger animation after a short delay
    const timer = setTimeout(() => {
      setAnimateIn(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Load favorites from localStorage
    try {
      const savedFavorites = localStorage.getItem('favorite_programs');
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }

    // Get user location on component mount
    getUserLocation();
  }, []);

  // When user location changes or category changes, search for programs
  useEffect(() => {
    if (userLocation) {
      searchNearbyPrograms();
    }
  }, [userLocation, selectedCategory, radius]);

  // Save favorites to localStorage
  useEffect(() => {
    if (favorites.length > 0) {
      localStorage.setItem('favorite_programs', JSON.stringify(favorites));
    }
  }, [favorites]);

  const searchNearbyPrograms = async () => {
    if (!userLocation) return;

    setLoading(true);
    setLocationError('');
    
    try {
      const { programs: nearbyPrograms, error } = await LocationService.searchNearbyPrograms({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        radius,
        categories
      });

      if (error) {
        throw new Error(error);
      }

      if (nearbyPrograms.length === 0) {
        console.log('No nearby programs found within', radius, 'km');
      } else {
        console.log(`Found ${nearbyPrograms.length} nearby programs`);
      }

      // Sort programs
      const sorted = [...nearbyPrograms].sort((a, b) => {
        if (sortBy === 'distance') {
          return a.distance - b.distance;
        }
        // You can add more sorting options here
        return 0;
      });

      setPrograms(sorted);
    } catch (err) {
      console.error('Error fetching nearby programs:', err);
      setLocationError(err instanceof Error ? err.message : 'An error occurred while searching');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCategories(value === 'all' ? ['all'] : [value]);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
    
    const sorted = [...programs].sort((a, b) => {
      if (e.target.value === 'distance') {
        return a.distance - b.distance;
      }
      // You can add more sorting options here
      return 0;
    });
    
    setPrograms(sorted);
  };

  const handleToggleFavorite = (programId: string) => {
    if (favorites.includes(programId)) {
      setFavorites(favorites.filter(id => id !== programId));
    } else {
      setFavorites([...favorites, programId]);
    }
  };

  const handleSelectProgram = (program: NearbyProgram) => {
    setSelectedProgram(program);
  };

  const handleCloseDetails = () => {
    setSelectedProgram(null);
  };

  const getUserLocation = () => {
    setLoading(true);
    setError(null);
    
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setError(t('Geolocation is not supported by your browser'));
      setLoading(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        
        // Handle specific geolocation errors
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError(t('Location access was denied. Please enable location services.'));
            break;
          case error.POSITION_UNAVAILABLE:
            setError(t('Location information is unavailable. Please try again.'));
            break;
          case error.TIMEOUT:
            setError(t('Location request timed out. Please try again.'));
            break;
          default:
            setError(t('An unknown error occurred getting your location.'));
        }
        
        setLoading(false);
        
        // Use fallback location
        useFallbackLocation();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };
  
  const useFallbackLocation = async () => {
    try {
      // Try to get location from IP address or use a default location
      setUserLocation({
        latitude: 40.7128, // New York City as fallback
        longitude: -74.006
      });
    } catch (err) {
      console.error('Error getting fallback location:', err);
      // Already showing the geolocation error, so no need to update error state
    }
  };

  const handleRadiusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRadius(parseInt(e.target.value));
  };

  const refreshLocation = () => {
    getUserLocation();
  };

  const getFilteredPrograms = () => {
    if (!programs) return [];
    
    return programs.filter(program => {
      // Filter by search term
      const matchesSearch = 
        program.businessName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        program.programName.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by category
      const matchesCategory = 
        selectedCategory === 'all' || 
        (program.category && program.category.toLowerCase() === selectedCategory.toLowerCase());
      
      return matchesSearch && matchesCategory;
    });
  };

  const getCategoryIcon = (category: string) => {
    return CATEGORIES[category as keyof typeof CATEGORIES]?.icon || <Store className="w-5 h-5" />;
  };

  const getCategoryColor = (category: string) => {
    return CATEGORIES[category as keyof typeof CATEGORIES]?.color || 'bg-gray-100 text-gray-600';
  };

  const getDistanceText = (distance: number) => {
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const renderCategoryFilters = () => (
    <div className="flex space-x-2 overflow-x-auto pb-2 hide-scrollbar">
      {Object.keys(CATEGORIES).map(category => (
        <button
          key={category}
          onClick={() => handleCategoryChange({ target: { value: category } } as React.ChangeEvent<HTMLSelectElement>)}
          className={`flex items-center px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
            selectedCategory === category
              ? `${CATEGORIES[category as keyof typeof CATEGORIES].color} font-medium`
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span className="mr-1.5">{CATEGORIES[category as keyof typeof CATEGORIES].icon}</span>
          <span className="capitalize">{t(category)}</span>
        </button>
      ))}
    </div>
  );

  const renderProgramCard = (program: NearbyProgram) => {
    const isFavorite = favorites.includes(program.programId);
    
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-gray-900">{program.programName}</h3>
            <p className="text-sm text-gray-600">{program.businessName}</p>
          </div>
          <button 
            className="text-gray-400 hover:text-amber-500 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFavorite(program.programId);
            }}
          >
            {isFavorite ? (
              <Heart className="w-5 h-5 fill-amber-500 text-amber-500" />
            ) : (
              <Heart className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <div className="mt-3 flex items-center text-sm">
          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            {getDistanceText(program.distance)}
          </span>
          <span className="mx-2 text-gray-300">•</span>
          <div className="flex items-center text-amber-500">
            <Star className="w-4 h-4 fill-current" />
            <span className="ml-1 font-medium">4.5</span>
          </div>
          {program.category && (
            <>
              <span className="mx-2 text-gray-300">•</span>
              <span className="text-gray-600 capitalize">{program.category}</span>
            </>
          )}
        </div>
        
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
          {program.location.address || program.location.city}
        </p>
        
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
          <span className="text-xs text-gray-500">{t('Program Benefits')}</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    );
  };

  const renderProgramDetails = () => {
    if (!selectedProgram) return null;
    
    const isFavorite = favorites.includes(selectedProgram.programId);
    
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={handleCloseDetails}>
        <div 
          className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto" 
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative">
            <div className="h-40 bg-blue-500">
              <div className="absolute top-4 right-4 flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(selectedProgram.programId);
                  }}
                  className={`p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40`}
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
                <button
                  onClick={handleCloseDetails}
                  className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="absolute top-24 left-6">
              <div className="w-20 h-20 rounded-xl bg-white shadow-lg flex items-center justify-center">
                {selectedProgram.businessName.toLowerCase().includes('coffee') ? (
                  <Coffee className="w-10 h-10 text-blue-600" />
                ) : selectedProgram.businessName.toLowerCase().includes('fitness') ? (
                  <Award className="w-10 h-10 text-blue-600" />
                ) : selectedProgram.businessName.toLowerCase().includes('tech') ? (
                  <Tag className="w-10 h-10 text-blue-600" />
                ) : (
                  <Store className="w-10 h-10 text-blue-600" />
                )}
              </div>
            </div>
          </div>
          
          <div className="p-6 pt-10">
            <h2 className="text-xl font-bold text-gray-800">{selectedProgram.businessName}</h2>
            <p className="text-blue-600 font-medium">{selectedProgram.programName}</p>
            
            <div className="mt-3 flex items-center">
              <div className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-sm font-medium">
                {getDistanceText(selectedProgram.distance)}
              </div>
              <span className="mx-2 text-gray-300">•</span>
              <div className="flex items-center text-amber-500">
                <Star className="w-4 h-4 fill-current" />
                <span className="ml-1 text-sm font-medium">4.5</span>
              </div>
            </div>
            
            <p className="mt-4 text-gray-600">
              {selectedProgram.location.address}, {selectedProgram.location.city}
            </p>
            
            <div className="mt-6 bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-800">{t('Program Details')}</h3>
              <p className="mt-1 text-sm text-gray-600">
                {t('Join this loyalty program to earn points and get rewards at')} {selectedProgram.businessName}.
              </p>
            </div>
            
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

  const renderMapView = () => {
    if (!userLocation) return renderMapPlaceholder();
    
    return (
      <div className="h-[600px]">
        <NearbyPrograms 
          userLocation={userLocation} 
          radius={radius} 
          categories={selectedCategory !== 'all' ? [selectedCategory] : undefined}
        />
      </div>
    );
  };

  const renderMapPlaceholder = () => (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-8 text-center">
      <Map className="w-16 h-16 text-blue-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-blue-700 mb-2">{t('Map View')}</h3>
      <p className="text-blue-600 mb-6 max-w-md mx-auto">
        {t('Interactive map view requires your location. Please enable location services.')}
      </p>
      <div className="flex justify-center gap-4">
        <button 
          onClick={() => setShowMap(false)}
          className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
        >
          {t('List View')}
        </button>
        <button 
          onClick={refreshLocation}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          {t('Refresh')}
        </button>
      </div>
    </div>
  );

  const filteredPrograms = getFilteredPrograms();

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
                onClick={refreshLocation}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
              >
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                {t('Refresh')}
              </button>
            </div>
          </div>
        </div>

        {/* Location error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-start">
            <MapPin className="w-5 h-5 mr-2 flex-shrink-0" />
            <p>{error}</p>
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
          
          <div className="flex items-center">
            <label className="text-sm text-gray-600 mr-2">
              {t('Radius:')}
            </label>
            <select
              value={radius}
              onChange={handleRadiusChange}
              className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
            >
              <option value="5">{t('5km')}</option>
              <option value="10">{t('10km')}</option>
              <option value="25">{t('25km')}</option>
              <option value="50">{t('50km')}</option>
            </select>
          </div>
        </div>

        {/* Map or List View */}
        <div className={`transition-all duration-500 ease-out transform delay-200 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          {showMap ? (
            renderMapView()
          ) : (
            <div>
              {loading ? (
                <div className="flex justify-center items-center p-12">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                  <span className="ml-3 text-gray-500">{t('Loading nearby programs...')}</span>
                </div>
              ) : filteredPrograms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPrograms.map(program => renderProgramCard(program))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-8 text-center">
                  <Map className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    {searchTerm ? t('No matching programs found') : t('No nearby programs')}
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    {searchTerm ? 
                      t('Try adjusting your search or filters to find more results.') : 
                      t('Try changing your location or increasing the search radius.')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Program Details Modal */}
      {selectedProgram && renderProgramDetails()}
      
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

export default CustomerNearby; 