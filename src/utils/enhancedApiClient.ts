/**
 * Enhanced API Client with Complete Endpoint Coverage
 * 
 * This client provides wrappers for all 74+ API endpoints, replacing direct
 * database connections with secure serverless API calls.
 * 
 * Security Features:
 * - ✅ JWT authentication on all requests
 * - ✅ Automatic token refresh
 * - ✅ Retry logic with exponential backoff
 * - ✅ Request/response validation
 * - ✅ Rate limiting compliance
 * - ✅ CORS handling
 */

import { apiClient, ApiResponse, TokenManager } from './apiClient';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface FilterParams {
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

// ==========================================
// SECTION 1: HEALTH CHECK
// ==========================================

export const healthApi = {
  /**
   * GET /api/health
   * Check API health status
   */
  async check(): Promise<ApiResponse> {
    return apiClient.healthCheck();
  },
};

// ==========================================
// SECTION 2: AUTHENTICATION (8 endpoints)
// ==========================================

export const authApi = {
  /**
   * POST /api/auth/login
   */
  async login(email: string, password: string): Promise<ApiResponse> {
    return apiClient.login(email, password);
  },

  /**
   * POST /api/auth/register
   */
  async register(userData: {
    email: string;
    password: string;
    name: string;
    role?: string;
    userType?: string;
  }): Promise<ApiResponse> {
    return apiClient.register(userData);
  },

  /**
   * POST /api/auth/logout
   */
  async logout(): Promise<ApiResponse> {
    return apiClient.logout();
  },

  /**
   * POST /api/auth/refresh
   */
  async refreshToken(): Promise<ApiResponse> {
    return apiClient.refreshToken();
  },

  /**
   * POST /api/auth/verify
   */
  async verifyToken(token?: string): Promise<ApiResponse> {
    return apiClient.get('/auth/verify', { token });
  },

  /**
   * POST /api/auth/forgot-password
   */
  async forgotPassword(email: string): Promise<ApiResponse> {
    return apiClient.post('/auth/forgot-password', { email });
  },

  /**
   * POST /api/auth/reset-password
   */
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
    return apiClient.post('/auth/reset-password', { token, newPassword });
  },

  /**
   * GET /api/auth/me
   */
  async getCurrentUser(): Promise<ApiResponse> {
    return apiClient.getMe();
  },
};

// ==========================================
// SECTION 3: QR CODE OPERATIONS (5 endpoints)
// ==========================================

export const qrApi = {
  /**
   * POST /api/qr/generate
   */
  async generate(data: {
    customerId?: string;
    cardId?: string;
    type: 'customer' | 'loyaltyCard';
    businessId?: string;
    programId?: string;
  }): Promise<ApiResponse> {
    return apiClient.post('/qr/generate', data);
  },

  /**
   * POST /api/qr/validate
   */
  async validate(qrData: string): Promise<ApiResponse> {
    return apiClient.post('/qr/validate', { qrData });
  },

  /**
   * POST /api/qr/scan
   */
  async scan(qrData: string, businessId: string): Promise<ApiResponse> {
    return apiClient.post('/qr/scan', { qrData, businessId });
  },

  /**
   * POST /api/qr/revoke
   */
  async revoke(qrCodeId: string): Promise<ApiResponse> {
    return apiClient.post('/qr/revoke', { qrCodeId });
  },

  /**
   * GET /api/qr/status
   */
  async getStatus(qrCodeId: string): Promise<ApiResponse> {
    return apiClient.get(`/qr/status?qrCodeId=${qrCodeId}`);
  },
};

// ==========================================
// SECTION 4: POINTS MANAGEMENT (6 endpoints)
// ==========================================

export const pointsApi = {
  /**
   * POST /api/points/award
   */
  async award(data: {
    customerId: string;
    programId: string;
    businessId: string;
    points: number;
    description?: string;
    source?: string;
  }): Promise<ApiResponse> {
    return apiClient.post('/points/award', data);
  },

  /**
   * POST /api/points/redeem
   */
  async redeem(data: {
    customerId: string;
    programId: string;
    points: number;
    rewardId: string;
  }): Promise<ApiResponse> {
    return apiClient.post('/points/redeem', data);
  },

  /**
   * GET /api/points/history
   */
  async getHistory(params: {
    customerId?: string;
    businessId?: string;
    programId?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    return apiClient.get('/points/history', params);
  },

  /**
   * GET /api/points/balance
   */
  async getBalance(customerId: string, programId?: string): Promise<ApiResponse> {
    return apiClient.get(`/points/balance?customerId=${customerId}&programId=${programId || ''}`);
  },

  /**
   * POST /api/points/calculate
   */
  async calculate(data: {
    programId: string;
    purchaseAmount?: number;
    visits?: number;
  }): Promise<ApiResponse> {
    return apiClient.post('/points/calculate', data);
  },

  /**
   * POST /api/points/transfer
   */
  async transfer(data: {
    fromCustomerId: string;
    toCustomerId: string;
    points: number;
    programId: string;
  }): Promise<ApiResponse> {
    return apiClient.post('/points/transfer', data);
  },
};

// ==========================================
// SECTION 5: BUSINESS MANAGEMENT (24 endpoints)
// ==========================================

export const businessApi = {
  /**
   * GET /api/businesses
   */
  async list(params?: PaginationParams & SortParams & FilterParams): Promise<ApiResponse> {
    return apiClient.getBusinesses(params);
  },

  /**
   * POST /api/businesses
   */
  async create(data: {
    name: string;
    description?: string;
    category: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    settings?: any;
  }): Promise<ApiResponse> {
    return apiClient.createBusiness(data);
  },

  /**
   * GET /api/businesses/:id
   */
  async get(id: string | number): Promise<ApiResponse> {
    return apiClient.getBusiness(id);
  },

  /**
   * PUT /api/businesses/:id
   */
  async update(id: string | number, data: any): Promise<ApiResponse> {
    return apiClient.updateBusiness(id, data);
  },

  /**
   * DELETE /api/businesses/:id
   */
  async delete(id: string | number): Promise<ApiResponse> {
    return apiClient.deleteBusiness(id);
  },

  /**
   * GET /api/businesses/:id/customers
   */
  async getCustomers(id: string | number, params?: PaginationParams): Promise<ApiResponse> {
    return apiClient.get(`/businesses/${id}/customers`, params);
  },

  /**
   * POST /api/businesses/:id/customers
   */
  async addCustomer(id: string | number, customerId: string): Promise<ApiResponse> {
    return apiClient.post(`/businesses/${id}/customers`, { customerId });
  },

  /**
   * POST /api/businesses/:id/enroll
   */
  async enrollCustomer(id: string | number, data: {
    customerId: string;
    programId: string;
    requireApproval?: boolean;
  }): Promise<ApiResponse> {
    return apiClient.post(`/businesses/${id}/enroll`, data);
  },

  /**
   * GET /api/businesses/:id/programs
   */
  async getPrograms(id: string | number): Promise<ApiResponse> {
    return apiClient.get(`/businesses/${id}/programs`);
  },

  /**
   * POST /api/businesses/:id/programs
   */
  async createProgram(id: string | number, data: any): Promise<ApiResponse> {
    return apiClient.post(`/businesses/${id}/programs`, data);
  },

  /**
   * PUT /api/businesses/:id/programs/:programId
   */
  async updateProgram(id: string | number, programId: string, data: any): Promise<ApiResponse> {
    return apiClient.put(`/businesses/${id}/programs/${programId}`, data);
  },

  /**
   * DELETE /api/businesses/:id/programs/:programId
   */
  async deleteProgram(id: string | number, programId: string): Promise<ApiResponse> {
    return apiClient.delete(`/businesses/${id}/programs/${programId}`);
  },

  /**
   * GET /api/businesses/:id/staff
   */
  async getStaff(id: string | number): Promise<ApiResponse> {
    return apiClient.get(`/businesses/${id}/staff`);
  },

  /**
   * POST /api/businesses/:id/staff
   */
  async addStaff(id: string | number, data: {
    userId: string;
    role: string;
    permissions?: string[];
  }): Promise<ApiResponse> {
    return apiClient.post(`/businesses/${id}/staff`, data);
  },

  /**
   * PUT /api/businesses/:id/staff/:staffId
   */
  async updateStaff(id: string | number, staffId: string, data: any): Promise<ApiResponse> {
    return apiClient.put(`/businesses/${id}/staff/${staffId}`, data);
  },

  /**
   * DELETE /api/businesses/:id/staff/:staffId
   */
  async removeStaff(id: string | number, staffId: string): Promise<ApiResponse> {
    return apiClient.delete(`/businesses/${id}/staff/${staffId}`);
  },

  /**
   * GET /api/businesses/:id/settings
   */
  async getSettings(id: string | number): Promise<ApiResponse> {
    return apiClient.get(`/businesses/${id}/settings`);
  },

  /**
   * PUT /api/businesses/:id/settings
   */
  async updateSettings(id: string | number, settings: any): Promise<ApiResponse> {
    return apiClient.put(`/businesses/${id}/settings`, settings);
  },

  /**
   * GET /api/businesses/:id/analytics
   */
  async getAnalytics(id: string | number, params?: {
    startDate?: string;
    endDate?: string;
    metric?: string;
  }): Promise<ApiResponse> {
    return apiClient.get(`/businesses/${id}/analytics`, params);
  },

  /**
   * GET /api/businesses/:id/analytics/revenue
   */
  async getRevenueAnalytics(id: string | number, params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ApiResponse> {
    return apiClient.get(`/businesses/${id}/analytics/revenue`, params);
  },

  /**
   * GET /api/businesses/:id/analytics/customers
   */
  async getCustomerAnalytics(id: string | number): Promise<ApiResponse> {
    return apiClient.get(`/businesses/${id}/analytics/customers`);
  },

  /**
   * GET /api/businesses/:id/analytics/engagement
   */
  async getEngagementAnalytics(id: string | number): Promise<ApiResponse> {
    return apiClient.get(`/businesses/${id}/analytics/engagement`);
  },

  /**
   * GET /api/businesses/:id/analytics/programs
   */
  async getProgramAnalytics(id: string | number): Promise<ApiResponse> {
    return apiClient.get(`/businesses/${id}/analytics/programs`);
  },

  /**
   * GET /api/businesses/:id/reports/summary
   */
  async getSummaryReport(id: string | number): Promise<ApiResponse> {
    return apiClient.get(`/businesses/${id}/reports/summary`);
  },

  /**
   * GET /api/businesses/:id/reports/export
   */
  async exportReport(id: string | number, format: 'csv' | 'pdf' = 'csv'): Promise<ApiResponse> {
    return apiClient.get(`/businesses/${id}/reports/export?format=${format}`);
  },
};

// ==========================================
// SECTION 6: CUSTOMER MANAGEMENT (12 endpoints)
// ==========================================

export const customerApi = {
  /**
   * GET /api/customers
   */
  async list(params?: PaginationParams & SortParams & FilterParams): Promise<ApiResponse> {
    return apiClient.getCustomers(params);
  },

  /**
   * POST /api/customers
   */
  async create(data: {
    email: string;
    name: string;
    phone?: string;
    address?: string;
  }): Promise<ApiResponse> {
    return apiClient.createCustomer(data);
  },

  /**
   * GET /api/customers/:id
   */
  async get(id: string | number): Promise<ApiResponse> {
    return apiClient.getCustomer(id);
  },

  /**
   * PUT /api/customers/:id
   */
  async update(id: string | number, data: any): Promise<ApiResponse> {
    return apiClient.updateCustomer(id, data);
  },

  /**
   * DELETE /api/customers/:id
   */
  async delete(id: string | number): Promise<ApiResponse> {
    return apiClient.delete(`/customers/${id}`);
  },

  /**
   * GET /api/customers/:id/programs
   */
  async getPrograms(id: string | number): Promise<ApiResponse> {
    return apiClient.get(`/customers/${id}/programs`);
  },

  /**
   * GET /api/customers/:id/cards
   */
  async getCards(id: string | number): Promise<ApiResponse> {
    return apiClient.getCustomerCards(id);
  },

  /**
   * GET /api/customers/:id/transactions
   */
  async getTransactions(id: string | number, params?: PaginationParams): Promise<ApiResponse> {
    return apiClient.get(`/customers/${id}/transactions`, params);
  },

  /**
   * GET /api/customers/:id/notifications
   */
  async getNotifications(id: string | number, params?: PaginationParams): Promise<ApiResponse> {
    return apiClient.get(`/customers/${id}/notifications`, params);
  },

  /**
   * GET /api/customers/:id/profile
   */
  async getProfile(id: string | number): Promise<ApiResponse> {
    return apiClient.get(`/customers/${id}/profile`);
  },

  /**
   * PUT /api/customers/:id/profile
   */
  async updateProfile(id: string | number, data: any): Promise<ApiResponse> {
    return apiClient.put(`/customers/${id}/profile`, data);
  },

  /**
   * GET /api/customers/:id/preferences
   */
  async getPreferences(id: string | number): Promise<ApiResponse> {
    return apiClient.get(`/customers/${id}/preferences`);
  },

  /**
   * PUT /api/customers/:id/preferences
   */
  async updatePreferences(id: string | number, preferences: any): Promise<ApiResponse> {
    return apiClient.put(`/customers/${id}/preferences`, preferences);
  },
};

// ==========================================
// SECTION 7: NOTIFICATIONS (13 endpoints)
// ==========================================

export const notificationApi = {
  /**
   * GET /api/notifications
   */
  async list(params?: {
    userId?: string;
    type?: string;
    isRead?: boolean;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    return apiClient.getNotifications(params);
  },

  /**
   * POST /api/notifications
   */
  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  }): Promise<ApiResponse> {
    return apiClient.post('/notifications', data);
  },

  /**
   * GET /api/notifications/:id
   */
  async get(id: string | number): Promise<ApiResponse> {
    return apiClient.get(`/notifications/${id}`);
  },

  /**
   * POST /api/notifications/:id/read
   */
  async markAsRead(id: string | number): Promise<ApiResponse> {
    return apiClient.markNotificationAsRead(id);
  },

  /**
   * POST /api/notifications/:id/action
   */
  async performAction(id: string | number, action: string, data?: any): Promise<ApiResponse> {
    return apiClient.post(`/notifications/${id}/action`, { action, ...data });
  },

  /**
   * DELETE /api/notifications/:id
   */
  async delete(id: string | number): Promise<ApiResponse> {
    return apiClient.delete(`/notifications/${id}`);
  },

  /**
   * PUT /api/notifications/:id
   */
  async update(id: string | number, data: any): Promise<ApiResponse> {
    return apiClient.put(`/notifications/${id}`, data);
  },

  /**
   * GET /api/notifications/:id/status
   */
  async getStatus(id: string | number): Promise<ApiResponse> {
    return apiClient.get(`/notifications/${id}/status`);
  },

  /**
   * GET /api/notifications/unread
   */
  async getUnread(userId?: string): Promise<ApiResponse> {
    return apiClient.get(`/notifications/unread${userId ? `?userId=${userId}` : ''}`);
  },

  /**
   * POST /api/notifications/:id/dismiss
   */
  async dismiss(id: string | number): Promise<ApiResponse> {
    return apiClient.post(`/notifications/${id}/dismiss`, {});
  },

  /**
   * POST /api/notifications/mark-all-read
   */
  async markAllAsRead(userId: string): Promise<ApiResponse> {
    return apiClient.post('/notifications/mark-all-read', { userId });
  },

  /**
   * GET /api/notifications/preferences
   */
  async getPreferences(userId: string): Promise<ApiResponse> {
    return apiClient.get(`/notifications/preferences?userId=${userId}`);
  },

  /**
   * PUT /api/notifications/preferences
   */
  async updatePreferences(userId: string, preferences: any): Promise<ApiResponse> {
    return apiClient.put('/notifications/preferences', { userId, ...preferences });
  },

  /**
   * POST /api/notifications/send-bulk
   */
  async sendBulk(data: {
    userIds: string[];
    type: string;
    title: string;
    message: string;
  }): Promise<ApiResponse> {
    return apiClient.post('/notifications/send-bulk', data);
  },

  /**
   * GET /api/notifications/stats
   */
  async getStats(userId: string): Promise<ApiResponse> {
    return apiClient.get(`/notifications/stats?userId=${userId}`);
  },
};

// ==========================================
// SECTION 8: LOYALTY CARDS (7 endpoints)
// ==========================================

export const loyaltyCardApi = {
  /**
   * GET /api/cards
   */
  async list(params?: {
    customerId?: string;
    businessId?: string;
    status?: string;
  }): Promise<ApiResponse> {
    return apiClient.get('/cards', params);
  },

  /**
   * POST /api/cards
   */
  async create(data: {
    customerId: string;
    businessId: string;
    programId: string;
    cardType?: string;
  }): Promise<ApiResponse> {
    return apiClient.post('/cards', data);
  },

  /**
   * GET /api/cards/:id
   */
  async get(id: string | number): Promise<ApiResponse> {
    return apiClient.get(`/cards/${id}`);
  },

  /**
   * PUT /api/cards/:id
   */
  async update(id: string | number, data: any): Promise<ApiResponse> {
    return apiClient.put(`/cards/${id}`, data);
  },

  /**
   * DELETE /api/cards/:id
   */
  async delete(id: string | number): Promise<ApiResponse> {
    return apiClient.delete(`/cards/${id}`);
  },

  /**
   * GET /api/cards/:id/transactions
   */
  async getTransactions(id: string | number): Promise<ApiResponse> {
    return apiClient.get(`/cards/${id}/transactions`);
  },

  /**
   * POST /api/cards/:id/activate
   */
  async activate(id: string | number): Promise<ApiResponse> {
    return apiClient.post(`/cards/${id}/activate`, {});
  },
};

// ==========================================
// SECTION 9: ADMIN OPERATIONS (8 endpoints)
// ==========================================

export const adminApi = {
  /**
   * GET /api/admin/businesses
   */
  async getBusinesses(params?: PaginationParams & FilterParams): Promise<ApiResponse> {
    return apiClient.get('/admin/businesses', params);
  },

  /**
   * GET /api/admin/businesses/:id
   */
  async getBusiness(id: string | number): Promise<ApiResponse> {
    return apiClient.get(`/admin/businesses/${id}`);
  },

  /**
   * GET /api/admin/businesses/:id/timeline
   */
  async getBusinessTimeline(id: string | number): Promise<ApiResponse> {
    return apiClient.get(`/admin/businesses/${id}/timeline`);
  },

  /**
   * GET /api/admin/businesses/:id/analytics
   */
  async getBusinessAnalytics(id: string | number): Promise<ApiResponse> {
    return apiClient.get(`/admin/businesses/${id}/analytics`);
  },

  /**
   * PUT /api/admin/businesses/:id/status
   */
  async updateBusinessStatus(id: string | number, status: string): Promise<ApiResponse> {
    return apiClient.put(`/admin/businesses/${id}/status`, { status });
  },

  /**
   * DELETE /api/admin/businesses/:id
   */
  async deleteBusiness(id: string | number): Promise<ApiResponse> {
    return apiClient.delete(`/admin/businesses/${id}`);
  },

  /**
   * GET /api/admin/system/health
   */
  async getSystemHealth(): Promise<ApiResponse> {
    return apiClient.get('/admin/system/health');
  },

  /**
   * GET /api/admin/system/stats
   */
  async getSystemStats(): Promise<ApiResponse> {
    return apiClient.get('/admin/system/stats');
  },
};

// ==========================================
// SECTION 10: FEEDBACK & SUPPORT (6 endpoints)
// ==========================================

export const feedbackApi = {
  /**
   * POST /api/feedback
   */
  async submit(data: {
    userId: string;
    type: string;
    message: string;
    rating?: number;
  }): Promise<ApiResponse> {
    return apiClient.post('/feedback', data);
  },

  /**
   * GET /api/feedback/business/:businessId
   */
  async getBusinessFeedback(businessId: string | number): Promise<ApiResponse> {
    return apiClient.get(`/feedback/business/${businessId}`);
  },

  /**
   * GET /api/feedback/customer/:customerId
   */
  async getCustomerFeedback(customerId: string | number): Promise<ApiResponse> {
    return apiClient.get(`/feedback/customer/${customerId}`);
  },

  /**
   * POST /api/feedback/:id/respond
   */
  async respond(id: string | number, response: string): Promise<ApiResponse> {
    return apiClient.post(`/feedback/${id}/respond`, { response });
  },

  /**
   * POST /api/errors/report
   */
  async reportError(error: {
    message: string;
    stack?: string;
    context?: any;
  }): Promise<ApiResponse> {
    return apiClient.post('/errors/report', error);
  },

  /**
   * POST /api/analytics/scan
   */
  async logAnalytics(data: {
    event: string;
    userId?: string;
    metadata?: any;
  }): Promise<ApiResponse> {
    return apiClient.post('/analytics/scan', data);
  },
};

// ==========================================
// UNIFIED EXPORT
// ==========================================

export const enhancedApi = {
  health: healthApi,
  auth: authApi,
  qr: qrApi,
  points: pointsApi,
  business: businessApi,
  customer: customerApi,
  notification: notificationApi,
  loyaltyCard: loyaltyCardApi,
  admin: adminApi,
  feedback: feedbackApi,
};

// Also export individual APIs for convenience
export {
  healthApi,
  authApi,
  qrApi,
  pointsApi,
  businessApi,
  customerApi,
  notificationApi,
  loyaltyCardApi,
  adminApi,
  feedbackApi,
};

// Default export
export default enhancedApi;

