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
      await apiRequest('/api/security/log-event', {
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
    return apiRequest(`/api/customers/${customerId}/unread-notifications`, {
      method: 'GET',
    });
  }

  static async getPendingApprovals(customerId: number): Promise<any[]> {
    return apiRequest(`/api/customers/${customerId}/pending-approvals`, {
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
    return apiRequest(`/api/businesses/${businessId}/settings`, {
      method: 'GET',
    });
  }

  static async updateBusinessSettings(businessId: number, settings: any): Promise<any> {
    return apiRequest(`/api/businesses/${businessId}/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  /**
   * Business Analytics API calls
   */
  static async getBusinessAnalytics(businessId: number): Promise<any> {
    return apiRequest(`/api/businesses/${businessId}/analytics`, {
      method: 'GET',
    });
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
      ? `/api/businesses/${businessId}/promotions`
      : '/api/promotions';
    return apiRequest(endpoint, { method: 'GET' });
  }

  /**
   * Redemption Notifications API calls
   */
  static async getBusinessSettings(businessId: number): Promise<any> {
    return apiRequest(`/api/businesses/${businessId}/settings`, {
      method: 'GET',
    });
  }

  static async getBusinessRedemptionNotifications(businessId: number): Promise<any[]> {
    return apiRequest(`/api/businesses/${businessId}/redemptions`, {
      method: 'GET',
    });
  }
}

export default ProductionSafeService;

