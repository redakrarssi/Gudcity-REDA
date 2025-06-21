import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LocationService } from '../../services/locationService';
import type { NearbyProgram, Location, LocationSearchParams } from '../../types/location';
import { MAPBOX_ACCESS_TOKEN } from '../../env';

interface NearbyProgramsProps {
  userLocation?: Location;
  radius?: number;
  categories?: string[];
}

export const NearbyPrograms: React.FC<NearbyProgramsProps> = ({
  userLocation,
  radius = 10, // Default radius in kilometers
  categories
}) => {
  const { t } = useTranslation();
  const [map, setMap] = useState<any | null>(null);
  const [programs, setPrograms] = useState<NearbyProgram[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<boolean>(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(userLocation || null);

  useEffect(() => {
    if (!map && currentLocation && !mapError) {
      try {
        // Dynamic import of mapbox-gl to prevent SSR issues
        import('mapbox-gl').then(mapboxgl => {
          // Check if mapbox token is available
          if (!MAPBOX_ACCESS_TOKEN) {
            console.warn('Mapbox access token is missing. Map functionality will be limited.');
            setMapError(true);
            return;
          }
          
          // Set access token
          (mapboxgl as any).accessToken = MAPBOX_ACCESS_TOKEN;
          
          // Check if the map container exists
          const mapContainer = document.getElementById('map');
          if (!mapContainer) {
            console.error('Map container not found');
            setMapError(true);
            return;
          }
          
          // Initialize map
          const newMap = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [currentLocation.longitude, currentLocation.latitude],
            zoom: 12
          });
          
          // Handle map load errors
          newMap.on('error', (e: any) => {
            console.error('Map error:', e);
            setMapError(true);
          });
          
          // Set map instance when loaded
          newMap.on('load', () => {
            setMap(newMap);
            
            // Add user location marker
            new mapboxgl.Marker({ color: '#0000FF' })
              .setLngLat([currentLocation.longitude, currentLocation.latitude])
              .addTo(newMap);
            
            // Add program markers if available
            if (programs.length > 0) {
              updateMapMarkers(newMap, programs, mapboxgl);
            }
          });
          
          // Cleanup function
          return () => {
            if (newMap) {
              newMap.remove();
            }
          };
        }).catch(err => {
          console.error('Failed to load mapbox-gl:', err);
          setMapError(true);
        });
      } catch (err) {
        console.error('Error initializing map:', err);
        setMapError(true);
      }
    }
  }, [currentLocation, mapError]);

  useEffect(() => {
    if (!currentLocation && !userLocation) {
      // Get user's current location if not provided
      if (navigator.geolocation) {
        try {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setCurrentLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              });
            },
            (error) => {
              console.error('Geolocation error:', error);
              // Use a default location if geolocation fails (e.g., New York City)
              setCurrentLocation({
                latitude: 40.7128,
                longitude: -74.0060
              });
              setError(t('Could not get your precise location. Using default location instead.'));
            },
            { 
              timeout: 10000, 
              enableHighAccuracy: false, // Set to false to prevent high accuracy errors
              maximumAge: 60000 // Accept positions up to 1 minute old
            }
          );
        } catch (err) {
          console.error('Geolocation exception:', err);
          // Fallback to default location
          setCurrentLocation({
            latitude: 40.7128,
            longitude: -74.0060
          });
          setError(t('Location services error. Using default location instead.'));
        }
      } else {
        setError(t('Geolocation is not supported by your browser.'));
        // Fallback to default location
        setCurrentLocation({
          latitude: 40.7128,
          longitude: -74.0060
        });
      }
    }
  }, [userLocation, t]);

  useEffect(() => {
    if (currentLocation) {
      searchNearbyPrograms();
    }
  }, [currentLocation, radius, categories]);

  const updateMapMarkers = (mapInstance: any, programsData: NearbyProgram[], mapboxgl: any) => {
    if (!mapInstance || !mapboxgl) return;
    
    try {
      // Remove existing markers
      const markers = document.getElementsByClassName('program-marker');
      Array.from(markers).forEach(marker => marker.remove());

      // Add new markers
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([currentLocation!.longitude, currentLocation!.latitude]);
      
      programsData.forEach(program => {
        const marker = new mapboxgl.Marker({ color: '#FF0000', className: 'program-marker' })
          .setLngLat([program.location.longitude, program.location.latitude])
          .addTo(mapInstance);

        // Add popup
        const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
          .setHTML(`
            <div class="p-2">
              <h3 class="font-semibold text-lg">${program.programName}</h3>
              <p class="text-gray-600">${program.businessName}</p>
              <p class="text-sm text-gray-500">${program.location.address}</p>
              <p class="text-sm text-blue-600 mt-2">${t('Distance')}: ${program.distance.toFixed(1)} km</p>
            </div>
          `);
        
        marker.setPopup(popup);
        
        bounds.extend([program.location.longitude, program.location.latitude]);
      });
      
      // Fit map to bounds if there are programs
      if (programsData.length > 0) {
        mapInstance.fitBounds(bounds, { padding: 50, maxZoom: 15 });
      }
    } catch (err) {
      console.error('Error updating map markers:', err);
    }
  };

  const searchNearbyPrograms = async () => {
    if (!currentLocation) return;

    setLoading(true);
    setError(null);

    try {
      const searchParams: LocationSearchParams = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        radius,
        categories
      };

      const { programs: nearbyPrograms, error: apiError } = await LocationService.searchNearbyPrograms(searchParams);

      if (apiError) {
        setError(apiError);
        return;
      }

      setPrograms(nearbyPrograms);

      // Update map markers if map is available
      if (map && !mapError) {
        import('mapbox-gl').then(mapboxgl => {
          updateMapMarkers(map, nearbyPrograms, mapboxgl);
        }).catch(err => {
          console.error('Failed to load mapbox-gl for updating markers:', err);
        });
      }
    } catch (err) {
      console.error('Error searching nearby programs:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while searching for programs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex h-full flex-col md:flex-row">
        {/* Map */}
        <div className="w-full md:w-2/3 h-64 md:h-full rounded-lg overflow-hidden relative">
          {mapError ? (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
              <div className="text-center p-4">
                <p className="text-gray-700 mb-2">{t('Map could not be loaded')}</p>
                <p className="text-sm text-gray-500">{t('Please check your internet connection or try again later')}</p>
              </div>
            </div>
          ) : (
            <div id="map" className="w-full h-full"></div>
          )}
        </div>

        {/* Program List */}
        <div className="w-full md:w-1/3 md:pl-4 mt-4 md:mt-0 overflow-y-auto">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">{t('Nearby Programs')}</h2>
              {loading && <p className="text-gray-500">{t('Searching...')}</p>}
            </div>

            <div className="divide-y">
              {programs.map(program => (
                <div key={program.programId} className="p-4 hover:bg-gray-50">
                  <h3 className="font-semibold">{program.programName}</h3>
                  <p className="text-gray-600">{program.businessName}</p>
                  <p className="text-sm text-gray-500">{program.location.address}</p>
                  <p className="text-sm text-blue-600 mt-1">
                    {t('Distance')}: {program.distance.toFixed(1)} km
                  </p>
                  <button className="mt-2 bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600">
                    {t('View Details')}
                  </button>
                </div>
              ))}

              {!loading && programs.length === 0 && (
                <div className="p-4 text-center text-gray-500">
                  {t('No programs found in this area')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 