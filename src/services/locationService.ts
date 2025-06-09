import type {
  Location,
  BusinessLocation,
  LocationSearchParams,
  NearbyProgram,
  LocationStats
} from '../types/location';
import sql from '../utils/db';

export class LocationService {
  private static readonly EARTH_RADIUS = 6371; // Earth's radius in kilometers
  
  // Mock data store - will be deprecated once we're fully connected to the database
  private static locations: BusinessLocation[] = [];

  static async addBusinessLocation(
    location: Omit<BusinessLocation, 'id'>
  ): Promise<{ success: boolean; location?: BusinessLocation; error?: string }> {
    try {
      // Insert into database
      const result = await sql`
        INSERT INTO business_locations (
          business_id, 
          name, 
          address_line1, 
          city, 
          state, 
          zip, 
          country, 
          latitude, 
          longitude,
          is_active
        ) VALUES (
          ${location.businessId}, 
          ${location.name}, 
          ${location.address || ''},
          ${location.city || ''},
          ${location.state || ''},
          ${location.postalCode || ''},
          ${location.country || ''}, 
          ${location.latitude}, 
          ${location.longitude},
          ${location.isActive || true}
        )
        RETURNING *
      `;
      
      if (result.length === 0) {
        throw new Error('Failed to insert business location');
      }
      
      // Convert DB result to BusinessLocation
      const newLocation: BusinessLocation = {
        id: result[0].id.toString(),
        businessId: result[0].business_id.toString(),
        name: result[0].name,
        address: result[0].address_line1,
        city: result[0].city,
        state: result[0].state,
        postalCode: result[0].zip,
        country: result[0].country,
        latitude: parseFloat(result[0].latitude),
        longitude: parseFloat(result[0].longitude),
        isActive: result[0].is_active,
        openingHours: result[0].opening_hours
      };
      
      return { success: true, location: newLocation };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async getBusinessLocations(
    businessId: string | number
  ): Promise<{ locations: BusinessLocation[]; error?: string }> {
    try {
      const businessIdNum = typeof businessId === 'string' ? parseInt(businessId) : businessId;
      
      const result = await sql`
        SELECT * FROM business_locations
        WHERE business_id = ${businessIdNum}
      `;
      
      const locations = result.map(this.dbToBusinessLocation);
      
      return { locations };
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
      // Build SQL query using tagged template literal approach
      let query = sql`SELECT * FROM business_locations WHERE is_active = true`;
      
      // Add filters using tagged template literals
      if (params.businessId) {
        const businessIdNum = typeof params.businessId === 'string' ? 
          parseInt(params.businessId) : params.businessId;
        query = sql`${query} AND business_id = ${businessIdNum}`;
      }
      
      if (params.city) {
        query = sql`${query} AND city ILIKE ${'%' + params.city + '%'}`;
      }
      
      if (params.country) {
        query = sql`${query} AND country ILIKE ${'%' + params.country + '%'}`;
      }
      
      // If latitude, longitude and radius are provided, filter by distance
      if (params.latitude && params.longitude && params.radius) {
        query = sql`
          ${query} AND (
            6371 * acos(
              cos(radians(${params.latitude})) * 
              cos(radians(latitude)) * 
              cos(radians(longitude) - radians(${params.longitude})) + 
              sin(radians(${params.latitude})) * 
              sin(radians(latitude))
            )
          ) <= ${params.radius}
        `;
      }
      
      // Add limit if provided
      if (params.limit) {
        query = sql`${query} LIMIT ${params.limit}`;
      }
      
      // Execute the query
      const result = await query;
      const locations = result.map(this.dbToBusinessLocation);
      
      return { locations };
    } catch (error) {
      return {
        locations: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async searchNearbyPrograms(
    params: LocationSearchParams
  ): Promise<{ programs: NearbyProgram[]; error?: string }> {
    try {
      if (!params.latitude || !params.longitude) {
        throw new Error('Latitude and longitude are required');
      }
      
      const radius = params.radius || 10; // Default 10km
      const limit = params.limit || 20; // Default 20 results
      
      // Create base query using tagged template literals, with explicit type casting for joins
      let query = sql`
        SELECT 
          l.id as location_id,
          l.business_id,
          l.name as location_name,
          l.address_line1,
          l.city,
          l.state,
          l.country,
          l.zip,
          l.latitude,
          l.longitude,
          u.business_name,
          lp.id as program_id,
          lp.name as program_name,
          COALESCE(lp.category, 'retail') as category,
          (
            6371 * acos(
              cos(radians(${params.latitude})) * 
              cos(radians(l.latitude)) * 
              cos(radians(l.longitude) - radians(${params.longitude})) + 
              sin(radians(${params.latitude})) * 
              sin(radians(l.latitude))
            )
          ) as distance
        FROM 
          business_locations l
        JOIN 
          users u ON l.business_id = u.id
        JOIN 
          loyalty_programs lp ON lp.business_id = CAST(l.business_id AS VARCHAR)
        WHERE 
          l.is_active = true
          AND (lp.status = 'ACTIVE' OR (
            EXISTS(
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'loyalty_programs' AND column_name = 'is_active'
            ) AND lp.is_active = true
          ))
      `;
      
      // Add category filter if specified
      if (params.categories && params.categories.length > 0) {
        const categoriesFilter = params.categories.filter(c => c !== 'all');
        if (categoriesFilter.length > 0) {
          // Check if category column exists before filtering
          query = sql`
            ${query} 
            AND (
              NOT EXISTS(
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'loyalty_programs' AND column_name = 'category'
              )
              OR COALESCE(lp.category, 'retail') = ANY(${categoriesFilter})
            )
          `;
        }
      }
      
      // Add distance constraint
      query = sql`
        ${query}
        AND (
          6371 * acos(
            cos(radians(${params.latitude})) * 
            cos(radians(l.latitude)) * 
            cos(radians(l.longitude) - radians(${params.longitude})) + 
            sin(radians(${params.latitude})) * 
            sin(radians(l.latitude))
          )
        ) <= ${radius}
        ORDER BY distance ASC
        LIMIT ${limit}
      `;
      
      console.log('Executing query with tagged template literals');
      
      // Execute the query
      const result = await query;
      
      console.log(`Found ${result.length} nearby programs`);
      
      // Transform the results into NearbyProgram objects
      const programs: NearbyProgram[] = result.map(row => ({
        programId: row.program_id?.toString() || '',
        businessId: row.business_id?.toString() || '',
        businessName: row.business_name || row.location_name || '',
        programName: row.program_name || '',
        category: row.category || 'retail',
        distance: typeof row.distance === 'string' ? parseFloat(row.distance) : (row.distance || 0),
        location: {
          id: row.location_id?.toString() || '',
          businessId: row.business_id?.toString() || '',
          name: row.location_name || '',
          address: row.address_line1 || '',
          city: row.city || '',
          state: row.state || '',
          country: row.country || '',
          postalCode: row.zip || '',
          latitude: typeof row.latitude === 'string' ? parseFloat(row.latitude) : (row.latitude || 0),
          longitude: typeof row.longitude === 'string' ? parseFloat(row.longitude) : (row.longitude || 0),
          isActive: true,
          openingHours: {
            monday: '9:00-17:00',
            tuesday: '9:00-17:00',
            wednesday: '9:00-17:00',
            thursday: '9:00-17:00',
            friday: '9:00-17:00',
            saturday: '10:00-14:00',
            sunday: 'Closed'
          }
        }
      }));
      
      return { programs };
    } catch (error) {
      console.error('Error searching nearby programs:', error);
      return {
        programs: [],
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
    return this.searchNearbyPrograms({
      latitude,
      longitude,
      radius,
      limit
    });
  }

  static async getLocationStats(): Promise<{ stats: LocationStats; error?: string }> {
    try {
      // Use tagged template literals instead of conventional function calls
      const [totalResult, activeResult, citiesResult] = await Promise.all([
        sql`SELECT COUNT(*) as total FROM business_locations`,
        sql`SELECT COUNT(*) as active FROM business_locations WHERE is_active = true`,
        sql`
          SELECT 
            city, 
            COUNT(*) as count,
            0 as revenue
          FROM 
            business_locations
          GROUP BY 
            city
          ORDER BY 
            count DESC
          LIMIT 5
        `
      ]);
      
      const stats: LocationStats = {
        totalLocations: parseInt(totalResult[0]?.total || '0'),
        activeLocations: parseInt(activeResult[0]?.active || '0'),
        popularCities: citiesResult.map(row => ({
          city: row.city,
          count: parseInt(row.count),
          revenue: parseFloat(row.revenue)
        })),
        regionBreakdown: [
          {
            region: 'North America',
            businesses: 0,
            customers: 0,
            transactions: 0
          }
        ]
      };
      
      return { stats };
    } catch (error) {
      return {
        stats: {
          totalLocations: 0,
          activeLocations: 0,
          popularCities: [],
          regionBreakdown: []
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
    return degrees * Math.PI / 180;
  }
  
  // Helper method to convert DB row to BusinessLocation
  private static dbToBusinessLocation(row: any): BusinessLocation {
    return {
      id: row.id.toString(),
      businessId: row.business_id.toString(),
      name: row.name,
      address: row.address_line1,
      city: row.city,
      state: row.state,
      postalCode: row.zip,
      country: row.country,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      isActive: row.is_active,
      openingHours: row.opening_hours
    };
  }

  // Method to initialize mock data for testing
  static initMockData(locations: BusinessLocation[]) {
    this.locations = [...locations];
  }
} 