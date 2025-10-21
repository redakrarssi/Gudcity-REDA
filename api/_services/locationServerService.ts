import sql from '../_lib/db';

export interface Location {
  id: string;
  businessId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Server-side service for location management
 * All database operations for business locations
 */
export class LocationServerService {
  /**
   * Get business locations
   */
  static async getBusinessLocations(businessId: string): Promise<Location[]> {
    try {
      const businessIdInt = parseInt(businessId);

      const result = await sql`
        SELECT 
          id::text,
          business_id::text as "businessId",
          name,
          address,
          city,
          state,
          country,
          postal_code as "postalCode",
          latitude,
          longitude,
          phone,
          email,
          is_active as "isActive",
          created_at as "createdAt"
        FROM business_locations
        WHERE business_id = ${businessIdInt}
        ORDER BY is_active DESC, created_at DESC
      `;

      return result as unknown as Location[];
    } catch (error) {
      console.error('Error getting business locations:', error);
      return [];
    }
  }

  /**
   * Get location by ID
   */
  static async getLocationById(locationId: string): Promise<Location | null> {
    try {
      const locationIdInt = parseInt(locationId);

      const result = await sql`
        SELECT 
          id::text,
          business_id::text as "businessId",
          name,
          address,
          city,
          state,
          country,
          postal_code as "postalCode",
          latitude,
          longitude,
          phone,
          email,
          is_active as "isActive",
          created_at as "createdAt"
        FROM business_locations
        WHERE id = ${locationIdInt}
      `;

      if (result.length === 0) {
        return null;
      }

      return result[0] as unknown as Location;
    } catch (error) {
      console.error('Error getting location by ID:', error);
      return null;
    }
  }

  /**
   * Create location
   */
  static async createLocation(data: {
    businessId: string;
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    email?: string;
  }): Promise<{ success: boolean; location?: Location; error?: string }> {
    try {
      const businessIdInt = parseInt(data.businessId);

      const result = await sql`
        INSERT INTO business_locations (
          business_id,
          name,
          address,
          city,
          state,
          country,
          postal_code,
          latitude,
          longitude,
          phone,
          email,
          is_active,
          created_at
        ) VALUES (
          ${businessIdInt},
          ${data.name},
          ${data.address},
          ${data.city},
          ${data.state},
          ${data.country},
          ${data.postalCode},
          ${data.latitude || null},
          ${data.longitude || null},
          ${data.phone || null},
          ${data.email || null},
          true,
          NOW()
        )
        RETURNING 
          id::text,
          business_id::text as "businessId",
          name,
          address,
          city,
          state,
          country,
          postal_code as "postalCode",
          latitude,
          longitude,
          phone,
          email,
          is_active as "isActive",
          created_at as "createdAt"
      `;

      return {
        success: true,
        location: result[0] as unknown as Location
      };
    } catch (error) {
      console.error('Error creating location:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update location
   */
  static async updateLocation(
    locationId: string,
    updates: Partial<Omit<Location, 'id' | 'businessId' | 'createdAt'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const locationIdInt = parseInt(locationId);
      const setClauses = [];

      if (updates.name !== undefined) setClauses.push(`name = '${updates.name}'`);
      if (updates.address !== undefined) setClauses.push(`address = '${updates.address}'`);
      if (updates.city !== undefined) setClauses.push(`city = '${updates.city}'`);
      if (updates.state !== undefined) setClauses.push(`state = '${updates.state}'`);
      if (updates.country !== undefined) setClauses.push(`country = '${updates.country}'`);
      if (updates.postalCode !== undefined) setClauses.push(`postal_code = '${updates.postalCode}'`);
      if (updates.latitude !== undefined) setClauses.push(`latitude = ${updates.latitude}`);
      if (updates.longitude !== undefined) setClauses.push(`longitude = ${updates.longitude}`);
      if (updates.phone !== undefined) setClauses.push(`phone = '${updates.phone}'`);
      if (updates.email !== undefined) setClauses.push(`email = '${updates.email}'`);
      if (updates.isActive !== undefined) setClauses.push(`is_active = ${updates.isActive}`);

      if (setClauses.length === 0) {
        return { success: true };
      }

      setClauses.push('updated_at = NOW()');

      await sql.unsafe(`
        UPDATE business_locations
        SET ${setClauses.join(', ')}
        WHERE id = ${locationIdInt}
      `);

      return { success: true };
    } catch (error) {
      console.error('Error updating location:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete location
   */
  static async deleteLocation(locationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const locationIdInt = parseInt(locationId);

      await sql`
        DELETE FROM business_locations
        WHERE id = ${locationIdInt}
      `;

      return { success: true };
    } catch (error) {
      console.error('Error deleting location:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Search locations by coordinates (within radius)
   */
  static async searchNearbyLocations(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ): Promise<Location[]> {
    try {
      // Using Haversine formula for distance calculation
      const result = await sql`
        SELECT 
          id::text,
          business_id::text as "businessId",
          name,
          address,
          city,
          state,
          country,
          postal_code as "postalCode",
          latitude,
          longitude,
          phone,
          email,
          is_active as "isActive",
          created_at as "createdAt",
          (
            6371 * acos(
              cos(radians(${latitude})) * 
              cos(radians(latitude)) * 
              cos(radians(longitude) - radians(${longitude})) + 
              sin(radians(${latitude})) * 
              sin(radians(latitude))
            )
          ) as distance
        FROM business_locations
        WHERE is_active = true
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        HAVING distance < ${radiusKm}
        ORDER BY distance
        LIMIT 50
      `;

      return result as unknown as Location[];
    } catch (error) {
      console.error('Error searching nearby locations:', error);
      return [];
    }
  }
}

