/**
 * Analytics Service - API Only
 * 
 * This service handles all analytics operations through API calls.
 * No direct database access - all operations go through the backend API.
 */

import { apiGet } from './apiClient';

export interface AnalyticsData {
  totalCustomers: number;
  totalPoints: number;
  totalRedemptions: number;
  activePrograms: number;
  recentTransactions: any[];
  customerGrowth: any[];
  pointsAwarded: any[];
  redemptionRate: number;
}

/**
 * Analytics Service
 * Manages analytics operations through secure API endpoints
 */
export class AnalyticsService {
  /**
   * Get analytics for a business
   */
  static async getBusinessAnalytics(
    businessId: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<AnalyticsData | null> {
    try {
      let url = `/api/analytics/business/${businessId}`;
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

  /**
   * Get analytics for a customer
   */
  static async getCustomerAnalytics(
    customerId: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<any> {
    try {
      let url = `/api/analytics/customer/${customerId}`;
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
      console.error('Error getting customer analytics:', error);
      return null;
    }
  }

  /**
   * Get dashboard statistics
   */
  static async getDashboardStats(userId: string, userType: string): Promise<any> {
    try {
      const response = await apiGet(`/api/dashboard/stats?userId=${userId}&userType=${userType}`);
      return response.data || response || null;
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return null;
    }
  }

  /**
   * Get admin dashboard statistics
   */
  static async getAdminDashboardStats(): Promise<any> {
    try {
      const response = await apiGet('/api/admin/dashboard-stats');
      return response.data || response || null;
    } catch (error) {
      console.error('Error getting admin dashboard stats:', error);
      return null;
    }
  }
}

export default AnalyticsService;

