/**
 * Loyalty Program Service - API Only
 * 
 * This service handles all loyalty program operations through API calls.
 * No direct database access - all operations go through the backend API.
 */

import { 
  apiGetBusinessPrograms, 
  apiGetProgramById, 
  apiCreateProgram, 
  apiUpdateProgram, 
  apiDeleteProgram 
} from './apiClient';
import type { LoyaltyProgram } from '../types/loyalty';

/**
 * Loyalty Program Service
 * Manages loyalty programs through secure API endpoints
 */
export class LoyaltyProgramService {
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all loyalty programs for a business
   */
  static async getBusinessPrograms(businessId: string): Promise<LoyaltyProgram[]> {
    const cacheKey = `business-programs-${businessId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await apiGetBusinessPrograms(businessId);
      const programs = response.data || response || [];
      
      // Cache the result
      this.cache.set(cacheKey, { data: programs, timestamp: Date.now() });
      
      return programs;
    } catch (error) {
      console.error('Error getting business programs:', error);
      return [];
    }
  }

  /**
   * Get a specific program by ID
   */
  static async getProgramById(programId: string): Promise<LoyaltyProgram | null> {
    const cacheKey = `program-${programId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await apiGetProgramById(programId);
      const program = response.data || response || null;
      
      if (program) {
        this.cache.set(cacheKey, { data: program, timestamp: Date.now() });
      }
      
      return program;
    } catch (error) {
      console.error('Error getting program by ID:', error);
      return null;
    }
  }

  /**
   * Create a new loyalty program
   */
  static async createProgram(
    businessId: string,
    programData: Partial<LoyaltyProgram>
  ): Promise<{ success: boolean; program?: LoyaltyProgram; error?: string }> {
    try {
      const response = await apiCreateProgram(businessId, programData);
      const program = response.data || response;
      
      // Invalidate business programs cache
      this.invalidateBusinessCache(businessId);
      
      return { success: true, program };
    } catch (error: any) {
      console.error('Error creating program:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to create program' 
      };
    }
  }

  /**
   * Update a loyalty program
   */
  static async updateProgram(
    programId: string,
    updates: Partial<LoyaltyProgram>
  ): Promise<{ success: boolean; program?: LoyaltyProgram; error?: string }> {
    try {
      const response = await apiUpdateProgram(programId, updates);
      const program = response.data || response;
      
      // Invalidate program cache
      this.invalidateProgramCache(programId);
      
      // If we have businessId, invalidate business cache too
      if (program && program.businessId) {
        this.invalidateBusinessCache(program.businessId);
      }
      
      return { success: true, program };
    } catch (error: any) {
      console.error('Error updating program:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to update program' 
      };
    }
  }

  /**
   * Delete a loyalty program
   */
  static async deleteProgram(
    programId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await apiDeleteProgram(programId);
      
      // Invalidate program cache
      this.invalidateProgramCache(programId);
      
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting program:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to delete program' 
      };
    }
  }

  /**
   * Get active programs for a business
   */
  static async getActivePrograms(businessId: string): Promise<LoyaltyProgram[]> {
    try {
      const programs = await this.getBusinessPrograms(businessId);
      return programs.filter(p => p.status === 'active' || p.status === 'ACTIVE');
    } catch (error) {
      console.error('Error getting active programs:', error);
      return [];
    }
  }

  /**
   * Invalidate cache for a business's programs
   */
  static invalidateBusinessCache(businessId: string): void {
    const cacheKey = `business-programs-${businessId}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Invalidate cache for a specific program
   */
  static invalidateProgramCache(programId: string): void {
    const cacheKey = `program-${programId}`;
    this.cache.delete(cacheKey);
  }

  /**
   * Clear all cache
   */
  static clearCache(): void {
    this.cache.clear();
  }
}

export default LoyaltyProgramService;

