import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Map, Marker, LngLatBounds } from 'mapbox-gl';
import { LocationService } from '../../services/locationService';
import type { NearbyProgram, Location, LocationSearchParams } from '../../types/location';

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
  const [map, setMap] = useState<Map | null>(null);
  const [programs, setPrograms] = useState<NearbyProgram[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(userLocation || null);

  useEffect(() => {
    if (!map && currentLocation) {
      const newMap = new Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [currentLocation.longitude, currentLocation.latitude],
        zoom: 12
      });
      setMap(newMap);

      // Add user location marker
      new Marker({ color: '#0000FF' })
        .setLngLat([currentLocation.longitude, currentLocation.latitude])
        .addTo(newMap);

      return () => newMap.remove();
    }
  }, [currentLocation]);

  useEffect(() => {
    if (!currentLocation && !userLocation) {
      // Get user's current location if not provided
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          setError(t('Could not get your location. Please enable location services.'));
        }
      );
    }
  }, [userLocation]);

  useEffect(() => {
    if (currentLocation) {
      searchNearbyPrograms();
    }
  }, [currentLocation, radius, categories]);

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

      const { programs: nearbyPrograms, error } = await LocationService.searchNearbyPrograms(searchParams);

      if (error) {
        throw new Error(error);
      }

      setPrograms(nearbyPrograms);

      // Update map markers
      if (map) {
        // Remove existing markers
        const markers = document.getElementsByClassName('program-marker');
        Array.from(markers).forEach(marker => marker.remove());

        // Add new markers
        nearbyPrograms.forEach(program => {
          const marker = new Marker({ color: '#FF0000' })
            .setLngLat([program.location.longitude, program.location.latitude])
            .addTo(map);

          const popup = document.createElement('div');
          popup.className = 'program-popup bg-white rounded-lg shadow-lg p-4 max-w-sm';
          popup.innerHTML = `
            <h3 class="font-semibold text-lg">${program.programName}</h3>
            <p class="text-gray-600">${program.businessName}</p>
            <p class="text-sm text-gray-500">${program.location.address}</p>
            <p class="text-sm text-blue-600 mt-2">${t('Distance')}: ${program.distance.toFixed(1)} km</p>
            <button class="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              ${t('View Details')}
            </button>
          `;

          marker.getElement().addEventListener('click', () => {
            const popups = document.getElementsByClassName('program-popup');
            Array.from(popups).forEach(p => p.remove());
            marker.getElement().appendChild(popup);
          });
        });

        // Fit map bounds to include all markers
        const bounds = new LngLatBounds();
        bounds.extend([currentLocation.longitude, currentLocation.latitude]);
        nearbyPrograms.forEach(program => {
          bounds.extend([program.location.longitude, program.location.latitude]);
        });
        map.fitBounds(bounds, { padding: 50 });
      }
    } catch (err) {
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

      <div className="flex h-full">
        {/* Map */}
        <div id="map" className="w-2/3 h-full rounded-lg overflow-hidden" />

        {/* Program List */}
        <div className="w-1/3 pl-4 overflow-y-auto">
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