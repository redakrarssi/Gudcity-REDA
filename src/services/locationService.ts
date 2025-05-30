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
      let query = `
        SELECT * FROM business_locations
        WHERE is_active = true
      `;
      
      const queryParams: any[] = [];
      let paramCounter = 1;
      
      // Add filters
      if (params.businessId) {
        const businessIdNum = typeof params.businessId === 'string' ? 
          parseInt(params.businessId) : params.businessId;
        query += ` AND business_id = $${paramCounter++}`;
        queryParams.push(businessIdNum);
      }
      
      if (params.city) {
        query += ` AND city ILIKE $${paramCounter++}`;
        queryParams.push(`%${params.city}%`);
      }
      
      if (params.country) {
        query += ` AND country ILIKE $${paramCounter++}`;
        queryParams.push(`%${params.country}%`);
      }
      
      // If latitude, longitude and radius are provided, filter by distance
      if (params.latitude && params.longitude && params.radius) {
        // Using Haversine formula directly in SQL
        query += `
          AND (
            6371 * acos(
              cos(radians($${paramCounter++})) * 
              cos(radians(latitude)) * 
              cos(radians(longitude) - radians($${paramCounter++})) + 
              sin(radians($${paramCounter++})) * 
              sin(radians(latitude))
            )
          ) <= $${paramCounter++}
        `;
        queryParams.push(
          params.latitude,
          params.longitude,
          params.latitude,
          params.radius
        );
      }
      
      // Add limit if provided
      if (params.limit) {
        query += ` LIMIT $${paramCounter++}`;
        queryParams.push(params.limit);
      }
      
      const result = await sql.query(query, queryParams);
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
      
      // Query business locations and join with loyalty programs
      const query = `
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
          lp.category,
          (
            6371 * acos(
              cos(radians($1)) * 
              cos(radians(l.latitude)) * 
              cos(radians(l.longitude) - radians($2)) + 
              sin(radians($1)) * 
              sin(radians(l.latitude))
            )
          ) as distance
        FROM 
          business_locations l
        JOIN 
          users u ON l.business_id = u.id
        JOIN 
          loyalty_programs lp ON l.business_id = lp.business_id
        WHERE 
          l.is_active = true
          AND lp.is_active = true
      `;
      
      // Add category filter if specified
      let fullQuery = query;
      const queryParams: any[] = [params.latitude, params.longitude];
      
      if (params.categories && params.categories.length > 0) {
        const categoriesFilter = params.categories.filter(c => c !== 'all');
        if (categoriesFilter.length > 0) {
          fullQuery += ` AND lp.category = ANY($3)`;
          queryParams.push(categoriesFilter);
        }
      }
      
      // Add distance constraint
      fullQuery += `
        AND (
          6371 * acos(
            cos(radians($1)) * 
            cos(radians(l.latitude)) * 
            cos(radians(l.longitude) - radians($2)) + 
            sin(radians($1)) * 
            sin(radians(l.latitude))
          )
        ) <= $${queryParams.length + 1}
        ORDER BY distance ASC
        LIMIT $${queryParams.length + 2}
      `;
      
      queryParams.push(radius, limit);
      
      console.log('Executing query:', fullQuery, queryParams);
      const result = await sql.query(fullQuery, queryParams);
      console.log(`Found ${result.length} nearby programs`);
      
      // Transform the results into NearbyProgram objects
      const programs: NearbyProgram[] = result.map(row => ({
        programId: row.program_id.toString(),
        businessId: row.business_id.toString(),
        businessName: row.business_name || row.location_name,
        programName: row.program_name,
        category: row.category || 'retail',
        distance: parseFloat(row.distance),
        location: {
          id: row.location_id.toString(),
          businessId: row.business_id.toString(),
          name: row.location_name,
          address: row.address_line1,
          city: row.city,
          state: row.state,
          country: row.country,
          postalCode: row.zip,
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
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
      // Use database to calculate statistics
      const totalQuery = `SELECT COUNT(*) as total FROM business_locations`;
      const activeQuery = `SELECT COUNT(*) as active FROM business_locations WHERE is_active = true`;
      const popularCitiesQuery = `
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
      `;
      
      const [totalResult, activeResult, citiesResult] = await Promise.all([
        sql.query(totalQuery, []),
        sql.query(activeQuery, []),
        sql.query(popularCitiesQuery, [])
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