import type {
  Location,
  BusinessLocation,
  LocationSearchParams,
  NearbyProgram,
  LocationStats
} from '../types/location';

export class LocationService {
  private static readonly EARTH_RADIUS = 6371; // Earth's radius in kilometers
  
  // Mock data store
  private static locations: BusinessLocation[] = [];

  static async addBusinessLocation(
    location: Omit<BusinessLocation, 'id'>
  ): Promise<{ success: boolean; location?: BusinessLocation; error?: string }> {
    try {
      const newLocation: BusinessLocation = {
        ...location,
        id: Date.now().toString()
      };
      
      this.locations.push(newLocation);
      return { success: true, location: newLocation };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async getBusinessLocations(
    businessId: string
  ): Promise<{ locations: BusinessLocation[]; error?: string }> {
    try {
      const businessLocations = this.locations.filter(
        location => location.businessId === businessId
      );
      
      return { locations: businessLocations };
    } catch (error) {
      return {
        locations: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async searchLocations(
    params: LocationSearchParams
  ): Promise<{ locations: BusinessLocation[]; error?: string }> {
    try {
      let filteredLocations = [...this.locations];
      
      // Filter by parameters
      if (params.businessId) {
        filteredLocations = filteredLocations.filter(
          location => location.businessId === params.businessId
        );
      }
      
      if (params.city) {
        filteredLocations = filteredLocations.filter(
          location => location.city.toLowerCase().includes(params.city!.toLowerCase())
        );
      }
      
      if (params.country) {
        filteredLocations = filteredLocations.filter(
          location => location.country.toLowerCase() === params.country!.toLowerCase()
        );
      }
      
      if (params.coordinates && params.radius) {
        filteredLocations = filteredLocations.filter(location => 
          this.calculateDistance(
            params.coordinates!.latitude,
            params.coordinates!.longitude,
            location.latitude,
            location.longitude
          ) <= params.radius!
        );
      }
      
      return { locations: filteredLocations };
    } catch (error) {
      return {
        locations: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async findNearbyPrograms(
    latitude: number,
    longitude: number,
    radius: number = 10, // Default 10 km
    limit: number = 20
  ): Promise<{ programs: NearbyProgram[]; error?: string }> {
    try {
      // In a real implementation, this would query the database
      // for locations, join with programs, and calculate distances
      
      // Mock implementation
      const mockPrograms: NearbyProgram[] = [
        {
          programId: '1',
          programName: 'Coffee Rewards',
          businessId: '101',
          businessName: 'Coffee Shop',
          distance: 0.8,
          location: {
            id: '1001',
            businessId: '101',
            name: 'Downtown Branch',
            address: '123 Main St',
            city: 'New York',
            country: 'USA',
            latitude: latitude + 0.01,
            longitude: longitude - 0.01
          }
        },
        {
          programId: '2',
          programName: 'Lunch Rewards',
          businessId: '102',
          businessName: 'Sandwich Shop',
          distance: 1.5,
          location: {
            id: '1002',
            businessId: '102',
            name: 'Central Branch',
            address: '456 Oak St',
            city: 'New York',
            country: 'USA',
            latitude: latitude - 0.02,
            longitude: longitude + 0.02
          }
        }
      ];
      
      return { programs: mockPrograms };
    } catch (error) {
      return {
        programs: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async getLocationStats(
    businessId: string
  ): Promise<{ stats: LocationStats; error?: string }> {
    try {
      // Mock implementation
      return {
        stats: {
          totalLocations: 5,
          countries: ['USA', 'Canada', 'UAE'],
          mostVisitedLocation: {
            id: '1001',
            name: 'Downtown Branch',
            city: 'New York',
            visitorCount: 1250
          },
          locationGrowth: 0.15
        }
      };
    } catch (error) {
      return {
        stats: {
          totalLocations: 0,
          countries: [],
          locationGrowth: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Helper method to calculate distance between two points using the Haversine formula
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = this.EARTH_RADIUS * c;
    
    return distance;
  }
  
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Method to initialize mock data for testing
  static initMockData(locations: BusinessLocation[]) {
    this.locations = [...locations];
  }
} 