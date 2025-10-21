/**
 * Business Service - API Only
 * 
 * This service handles all business operations through API calls.
 * No direct database access - all operations go through the backend API.
 */

import { apiGet, apiPost, apiPut } from './apiClient';
import type { User } from './apiClient';

export interface Business extends User {
  business_name: string;
  business_address?: string;
  business_phone?: string;
  business_type?: string;
  description?: string;
}

export interface BusinessSettings {
  businessId: string;
  pointsPerDollar: number;
  minRedemption: number;
  maxRedemption: number;
  autoApproval: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  [key: string]: any;
}

/**
 * Business Service
 * Manages business operations through secure API endpoints
 */
export class BusinessService {
  /**
   * Get business by ID
   */
  static async getBusinessById(businessId: string): Promise<Business | null> {
    try {
      const response = await apiGet(`/api/business/${businessId}`);
      return response.data || response || null;
    } catch (error) {
      console.error('Error getting business:', error);
      return null;
    }
  }

  /**
   * Update business information
   */
  static async updateBusiness(
    businessId: string,
    updates: Partial<Business>
  ): Promise<{ success: boolean; business?: Business; error?: string }> {
    try {
      const response = await apiPut(`/api/business/${businessId}`, updates);
      const business = response.data || response;
      return { success: true, business };
    } catch (error: any) {
      console.error('Error updating business:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to update business' 
      };
    }
  }

  /**
   * Get business settings
   */
  static async getBusinessSettings(businessId: string): Promise<BusinessSettings | null> {
    try {
      const response = await apiGet(`/api/business/${businessId}/settings`);
      return response.data || response || null;
    } catch (error) {
      console.error('Error getting business settings:', error);
      return null;
    }
  }

  /**
   * Update business settings
   */
  static async updateBusinessSettings(
    businessId: string,
    settings: Partial<BusinessSettings>
  ): Promise<{ success: boolean; settings?: BusinessSettings; error?: string }> {
    try {
      const response = await apiPut(`/api/business/${businessId}/settings`, settings);
      const updatedSettings = response.data || response;
      return { success: true, settings: updatedSettings };
    } catch (error: any) {
      console.error('Error updating business settings:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to update settings' 
      };
    }
  }

  /**
   * Get business analytics
   */
  static async getBusinessAnalytics(
    businessId: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<any> {
    try {
      let url = `/api/business/${businessId}/analytics`;
      if (dateRange) {
        const params = new URLSearchParams({
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString()
        });
        url += `?${params.toString()}`;
      }
      const response = await apiGet(url);
      return response.data || response || null;
    } catch (error) {
      console.error('Error getting business analytics:', error);
      return null;
    }
  }
}

export default BusinessService;

