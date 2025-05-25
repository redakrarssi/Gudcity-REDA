export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

export interface BusinessLocation extends Location {
  businessId: string;
  name: string;
  openingHours: {
    [key in DayOfWeek]: string;
  };
  isActive: boolean;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface LocationSearchParams {
  latitude: number;
  longitude: number;
  radius: number; // in kilometers
  limit?: number;
  categories?: string[];
}

export interface NearbyProgram {
  programId: string;
  businessId: string;
  businessName: string;
  programName: string;
  distance: number; // in kilometers
  location: BusinessLocation;
}

export interface LocationStats {
  totalLocations: number;
  activeLocations: number;
  popularCities: Array<{
    city: string;
    count: number;
    revenue: number;
  }>;
  regionBreakdown: Array<{
    region: string;
    businesses: number;
    customers: number;
    transactions: number;
  }>;
} 