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
      const radius = params.radius || 10; // Default to 10 km
      const limit = params.limit || 20;   // Default to 20 results
      
      // Check tables exist before executing query
      const [locationsExists, programsExists] = await Promise.all([
        sql`SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'business_locations'
        )`,
        sql`SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'loyalty_programs'
        )`
      ]);
      
      if (!locationsExists?.[0]?.exists || !programsExists?.[0]?.exists) {
        console.warn('Required tables do not exist for nearby programs search');
        return { programs: [] };
      }
      
      // Use tagged template literals for SQL queries
      let query = sql`
        SELECT 
          lp.id as program_id,
          lp.business_id,
          lp.name as program_name,
          lp.category,
          l.id as location_id,
          l.name as location_name,
          b.name as business_name,
          l.address_line1,
          l.city,
          l.state,
          l.zip,
          l.country,
          l.latitude,
          l.longitude,
          (
            6371 * acos(
              cos(radians(${params.latitude})) * 
              cos(radians(l.latitude)) * 
              cos(radians(l.longitude) - radians(${params.longitude})) + 
              sin(radians(${params.latitude})) * 
              sin(radians(l.latitude))
            )
          ) AS distance
        FROM 
          business_locations l
        JOIN 
          loyalty_programs lp ON l.business_id = lp.business_id
        JOIN
          business_profile b ON b.id = l.business_id
        WHERE 
          l.is_active = TRUE
          AND lp.active = TRUE
      `;
      
      // Add category filter if provided
      if (params.categories && params.categories.length > 0) {
        const categoriesFilter = Array.isArray(params.categories) 
          ? params.categories 
          : [params.categories];
        
        if (categoriesFilter.length > 0) {
          // Check if category column exists in loyalty_programs table
          const categoryExists = await sql`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'loyalty_programs' 
              AND column_name = 'category'
            )
          `;
          
          if (categoryExists?.[0]?.exists) {
            // Fix: Use proper array parameter handling with sql.array
            query = sql`
              ${query} 
              AND lp.category = ANY(${sql.array(categoriesFilter)})
            `;
          }
        }
      }
      
      // Add distance constraint
      const finalQuery = sql`
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
      
      // Execute the query
      const result = await finalQuery;
      
      // Transform the results into NearbyProgram objects
      const programs: NearbyProgram[] = result.map(row => {
        // Safely get string values with fallbacks
        const safeString = (value: any): string => 
          value === null || value === undefined ? '' : String(value);
        
        // Safely get number values with fallbacks
        const safeNumber = (value: any): number => {
          if (value === null || value === undefined) return 0;
          if (typeof value === 'number') return value;
          try {
            return parseFloat(value);
          } catch (e) {
            return 0;
          }
        };
        
        return {
          programId: safeString(row.program_id),
          businessId: safeString(row.business_id),
          businessName: safeString(row.business_name || row.location_name),
          programName: safeString(row.program_name),
          category: safeString(row.category || 'retail'),
          distance: safeNumber(row.distance),
          location: {
            id: safeString(row.location_id),
            businessId: safeString(row.business_id),
            name: safeString(row.location_name),
            address: safeString(row.address_line1),
            city: safeString(row.city),
            state: safeString(row.state),
            country: safeString(row.country),
            postalCode: safeString(row.zip),
            latitude: safeNumber(row.latitude),
            longitude: safeNumber(row.longitude),
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
        };
      });
      
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