/**
 * Production API Client
 * Provides API-first approach for all services in production
 * Automatically falls back to direct DB access in development only
 */

const IS_PRODUCTION = !import.meta.env.DEV && import.meta.env.MODE !== 'development';
const IS_BROWSER = typeof window !== 'undefined';
const USE_API = IS_PRODUCTION && IS_BROWSER;

// API base URL
const API_BASE = window?.location?.origin || '';

/**
 * Generic API request wrapper with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add auth token if available
  const token = localStorage.getItem('token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Production-safe service wrapper
 * Checks if we should use API or direct DB access
 */
export class ProductionSafeService {
  /**
   * Check if we should use API endpoints
   */
  static shouldUseApi(): boolean {
    return USE_API;
  }

  /**
   * Security Audit API calls
   */
  static async logSecurityEvent(data: {
    userId?: number;
    event: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }): Promise<void> {
    if (!this.shouldUseApi()) return; // Skip in development
    
    try {
      await apiRequest('/api/security/audit', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Non-fatal - don't block user actions
    }
  }

  /**
   * Customer Notifications API calls
   */
  static async getCustomerNotifications(customerId: number): Promise<any[]> {
    return apiRequest(`/api/customers/${customerId}/notifications`, {
      method: 'GET',
    });
  }

  static async getUnreadNotifications(customerId: number): Promise<any[]> {
    return apiRequest(`/api/customers/${customerId}/notifications?unread=true`, {
      method: 'GET',
    });
  }

  static async getCustomerPendingApprovals(customerId: number): Promise<any[]> {
    return apiRequest(`/api/customers/${customerId}/approvals`, {
      method: 'GET',
    });
  }

  static async markNotificationRead(notificationId: number): Promise<void> {
    await apiRequest(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
    });
  }

  /**
   * Loyalty Program API calls
   */
  static async getCustomerPrograms(customerId: number): Promise<any[]> {
    return apiRequest(`/api/customers/${customerId}/programs`, {
      method: 'GET',
    });
  }

  static async getCustomerEnrolledPrograms(customerId: number): Promise<any[]> {
    return apiRequest(`/api/customers/${customerId}/programs/enrolled`, {
      method: 'GET',
    });
  }

  /**
   * Loyalty Card API calls
   */
  static async getCustomerCards(customerId: number): Promise<any[]> {
    return apiRequest(`/api/customers/${customerId}/cards`, {
      method: 'GET',
    });
  }

  static async getCardDetails(cardId: number): Promise<any> {
    return apiRequest(`/api/cards/${cardId}`, {
      method: 'GET',
    });
  }

  /**
   * QR Code API calls
   */
  static async generateCustomerQRCode(customerId: number): Promise<any> {
    return apiRequest(`/api/customers/${customerId}/qr-code`, {
      method: 'POST',
    });
  }

  static async getCustomerQRCode(customerId: number): Promise<any> {
    return apiRequest(`/api/customers/${customerId}/qr-code`, {
      method: 'GET',
    });
  }

  /**
   * Business Settings API calls
   */
  static async getBusinessSettings(businessId: number): Promise<any> {
    return apiRequest(`/api/business/${businessId}/settings`, {
      method: 'GET',
    });
  }

  static async updateBusinessSettings(businessId: number, settings: any): Promise<any> {
    return apiRequest(`/api/business/${businessId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  /**
   * Business Analytics API calls (simple version - redirects to flexible version)
   */
  static async getBusinessAnalyticsSimple(businessId: number): Promise<any> {
    return apiRequest(`/api/business/${businessId}/analytics`, {
      method: 'GET',
    });
  }

  // Individual analytics
  static async getTotalPoints(businessId: number): Promise<any> {
    return apiRequest(`/api/analytics/points?businessId=${businessId}`, { method: 'GET' });
  }
  static async getTotalRedemptions(businessId: number): Promise<any> {
    return apiRequest(`/api/analytics/redemptions?businessId=${businessId}`, { method: 'GET' });
  }
  static async getActiveCustomers(businessId: number): Promise<any> {
    return apiRequest(`/api/analytics/customers?businessId=${businessId}&type=active`, { method: 'GET' });
  }
  static async getRetentionRate(businessId: number): Promise<any> {
    return apiRequest(`/api/analytics/retention?businessId=${businessId}`, { method: 'GET' });
  }
  static async getRedemptionRate(businessId: number): Promise<any> {
    return apiRequest(`/api/analytics/redemptions?businessId=${businessId}&metric=rate`, { method: 'GET' });
  }
  static async getPopularRewards(businessId: number): Promise<any> {
    return apiRequest(`/api/analytics/redemptions?businessId=${businessId}&type=popular`, { method: 'GET' });
  }
  static async getCustomerEngagement(businessId: number): Promise<any> {
    return apiRequest(`/api/analytics/engagement?businessId=${businessId}`, { method: 'GET' });
  }
  static async getPointsDistribution(businessId: number): Promise<any> {
    return apiRequest(`/api/analytics/points?businessId=${businessId}&type=distribution`, { method: 'GET' });
  }
  static async getTotalPrograms(businessId: number): Promise<any> {
    return apiRequest(`/api/business/${businessId}/programs/count`, { method: 'GET' });
  }
  static async getTotalPromoCodes(businessId: number): Promise<any> {
    return apiRequest(`/api/business/${businessId}/promo-codes/count`, { method: 'GET' });
  }
  static async getAveragePointsPerCustomer(businessId: number): Promise<any> {
    return apiRequest(`/api/analytics/points?businessId=${businessId}&metric=average`, { method: 'GET' });
  }
  static async getTopPerformingPrograms(businessId: number): Promise<any> {
    return apiRequest(`/api/business/${businessId}/programs/top-performing`, { method: 'GET' });
  }

  /**
   * User API calls
   */
  static async getUserById(userId: number): Promise<any> {
    return apiRequest(`/api/users/${userId}`, {
      method: 'GET',
    });
  }

  static async updateUser(userId: number, data: any): Promise<any> {
    return apiRequest(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Promotion API calls
   */
  static async getAvailablePromotions(businessId?: number): Promise<any[]> {
    const endpoint = businessId 
      ? `/api/promotions?businessId=${businessId}`
      : '/api/promotions';
    return apiRequest(endpoint, { method: 'GET' });
  }

  /**
   * Dashboard Stats API calls
   */
  static async getDashboardStats(type: 'admin' | 'business' | 'customer', id?: number): Promise<any> {
    const params = new URLSearchParams({ type });
    if (id) {
      if (type === 'business') params.set('businessId', id.toString());
      if (type === 'customer') params.set('customerId', id.toString());
    }
    return apiRequest(`/api/dashboard/stats?${params.toString()}`, { method: 'GET' });
  }

  /**
   * Customer Management API calls
   */
  static async getCustomers(businessId?: number): Promise<any[]> {
    const endpoint = businessId 
      ? `/api/customers?businessId=${businessId}`
      : '/api/customers';
    return apiRequest(endpoint, { method: 'GET' });
  }

  static async enrollCustomer(businessId: number, programId: number, customerId: number): Promise<any> {
    return apiRequest(`/api/customers?businessId=${businessId}&programId=${programId}`, {
      method: 'POST',
      body: JSON.stringify({ customerId, action: 'enroll' }),
    });
  }

  /**
   * Business Programs API calls
   */
  static async getBusinessPrograms(businessId: number): Promise<any[]> {
    return apiRequest(`/api/businesses/programs?businessId=${businessId}`, { method: 'GET' });
  }

  static async createBusinessProgram(businessId: number, programData: any): Promise<any> {
    return apiRequest(`/api/businesses/programs?businessId=${businessId}`, {
      method: 'POST',
      body: JSON.stringify(programData),
    });
  }

  static async updateBusinessProgram(businessId: number, programId: number, programData: any): Promise<any> {
    return apiRequest(`/api/businesses/programs?businessId=${businessId}&programId=${programId}`, {
      method: 'PUT',
      body: JSON.stringify(programData),
    });
  }

  static async deleteBusinessProgram(businessId: number, programId: number): Promise<any> {
    return apiRequest(`/api/businesses/programs?businessId=${businessId}&programId=${programId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Page Content API calls
   */
  static async getPageBySlug(slug: string): Promise<any> {
    // Remove leading slash if present since the API adds it
    const cleanSlug = slug.startsWith('/') ? slug.substring(1) : slug;
    return apiRequest(`/api/pages/${encodeURIComponent(cleanSlug)}`, { method: 'GET' });
  }

  /**
   * User Management API calls (enhanced)
   */
  static async getAllUsers(): Promise<any[]> {
    return apiRequest('/api/users', { method: 'GET' });
  }

  static async createUser(userData: any): Promise<any> {
    return apiRequest('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Redemption Notifications API calls
   */
  static async getBusinessRedemptionNotifications(businessId: number): Promise<any[]> {
    return apiRequest(`/api/business/${businessId}/redemption-notifications`, { method: 'GET' });
  }

  static async getBusinessNotifications(businessId: number): Promise<any[]> {
    return apiRequest(`/api/business/${businessId}/notifications`, { method: 'GET' });
  }

  static async getBusinessPendingApprovals(businessId: number): Promise<any[]> {
    return apiRequest(`/api/business/${businessId}/approvals/pending`, { method: 'GET' });
  }

  /**
   * Analytics API calls
   */
  static async getBusinessAnalytics(businessId: number, metric?: string, period?: string): Promise<any> {
    const params = new URLSearchParams({ businessId: businessId.toString() });
    if (metric) params.set('metric', metric);
    if (period) params.set('period', period);
    return apiRequest(`/api/analytics/business?${params.toString()}`, { method: 'GET' });
  }

  /**
   * Notifications API calls
   */
  static async getNotifications(customerId?: number, businessId?: number, unread?: boolean): Promise<any[]> {
    const params = new URLSearchParams();
    if (customerId) params.set('customerId', customerId.toString());
    if (businessId) params.set('businessId', businessId.toString());
    if (unread) params.set('unread', 'true');
    return apiRequest(`/api/notifications?${params.toString()}`, { method: 'GET' });
  }

  static async createNotification(notificationData: any): Promise<any> {
    return apiRequest('/api/notifications', {
      method: 'POST',
      body: JSON.stringify(notificationData),
    });
  }

  static async updateNotification(notificationId: string, updateData: any): Promise<any> {
    return apiRequest(`/api/notifications?notificationId=${notificationId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  /**
   * Loyalty Cards API calls
   */
  static async getLoyaltyCards(customerId?: number, businessId?: number): Promise<any[]> {
    const params = new URLSearchParams();
    if (customerId) params.set('customerId', customerId.toString());
    if (businessId) params.set('businessId', businessId.toString());
    return apiRequest(`/api/loyalty/cards?${params.toString()}`, { method: 'GET' });
  }

  static async awardPoints(cardId: number, points: number, description?: string, source?: string): Promise<any> {
    return apiRequest('/api/loyalty/cards', {
      method: 'POST',
      body: JSON.stringify({ cardId, points, description, source }),
    });
  }

  /**
   * QR Code Operations API calls
   */
  static async generateQRCode(type: 'customer' | 'loyalty' | 'promo', customerId?: number, businessId?: number, programId?: number, promoCodeId?: number): Promise<any> {
    return apiRequest('/api/qr/generate', {
      method: 'POST',
      body: JSON.stringify({ type, customerId, businessId, programId, promoCodeId }),
    });
  }

  static async validateQRCode(qrData: any, businessId: number): Promise<any> {
    return apiRequest('/api/qr/validate', {
      method: 'POST',
      body: JSON.stringify({ qrData, businessId }),
    });
  }

  static async logQRScan(qrData: any, businessId: number, customerId?: number, points?: number): Promise<any> {
    return apiRequest('/api/qr/scan', {
      method: 'POST',
      body: JSON.stringify({ qrData, businessId, customerId, points }),
    });
  }

  /**
   * Transaction Operations API calls
   */
  static async getTransactions(customerId?: number, businessId?: number, type?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (customerId) params.set('customerId', customerId.toString());
    if (businessId) params.set('businessId', businessId.toString());
    if (type) params.set('type', type);
    return apiRequest(`/api/transactions?${params.toString()}`, { method: 'GET' });
  }

  static async awardPointsTransaction(customerId: number, businessId: number, programId: number, points: number, description?: string): Promise<any> {
    return apiRequest('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({ action: 'award', customerId, businessId, programId, points, description }),
    });
  }

  static async redeemPoints(customerId: number, businessId: number, programId: number, points: number, description?: string): Promise<any> {
    return apiRequest('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({ action: 'redeem', customerId, businessId, programId, points, description }),
    });
  }

  /**
   * Approvals Management API calls
   */
  static async getApprovals(status?: string, type?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    return apiRequest(`/api/approvals?${params.toString()}`, { method: 'GET' });
  }

  static async getPendingApprovals(): Promise<any[]> {
    return apiRequest('/api/approvals?type=pending', { method: 'GET' });
  }

  static async updateApproval(approvalId: number, status: 'approved' | 'rejected', notes?: string): Promise<any> {
    return apiRequest(`/api/approvals/${approvalId}`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  }

  /**
   * User Settings API calls
   */
  static async getUserSettings(userId: number): Promise<any> {
    return apiRequest(`/api/users/${userId}/settings`, { method: 'GET' });
  }

  static async updateUserSettings(userId: number, settings: any): Promise<any> {
    return apiRequest(`/api/users/${userId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  /**
   * Customer Settings API calls  
   */
  static async getCustomerSettings(customerId: number): Promise<any> {
    return apiRequest(`/api/users/${customerId}/settings`, { method: 'GET' });
  }

  static async updateCustomerSettings(customerId: number, settings: any): Promise<any> {
    return apiRequest(`/api/users/${customerId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  /**
   * Business API calls (enhanced)
   */
  static async getBusinessById(businessId: number): Promise<any> {
    return apiRequest(`/api/users/${businessId}`, { method: 'GET' });
  }

  static async updateBusiness(businessId: number, data: any): Promise<any> {
    return apiRequest(`/api/users/${businessId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Additional helper methods
   */
  static async enrollInProgram(customerId: number, businessId: number, programId: number): Promise<any> {
    return this.enrollCustomer(businessId, programId, customerId);
  }

  static async getCustomerById(customerId: number): Promise<any> {
    return apiRequest(`/api/users/${customerId}`, { method: 'GET' });
  }

  static async getBusinessCustomers(businessId: number): Promise<any[]> {
    return this.getCustomers(businessId);
  }
}

export default ProductionSafeService;

