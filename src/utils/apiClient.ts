import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' 
    ? `${window.location.origin}/api` 
    : 'http://localhost:3000/api'
);

// Create axios instance with default configuration
const apiInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000, // 20 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Token management
class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'auth_token';
  private static readonly REFRESH_TOKEN_KEY = 'refresh_token';
  
  static getAccessToken(): string | null {
    try {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  }
  
  static getRefreshToken(): string | null {
    try {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }
  
  static setTokens(accessToken: string, refreshToken: string): void {
    try {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    } catch (error) {
      console.warn('Failed to store tokens:', error);
    }
  }
  
  static clearTokens(): void {
    try {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem('user');
    } catch (error) {
      console.warn('Failed to clear tokens:', error);
    }
  }
}

// Request interceptor - Add auth token
apiInstance.interceptors.request.use(
  (config) => {
    const token = TokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  
  failedQueue = [];
};

apiInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    // If error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Another request is already refreshing, wait for it
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => {
          const token = TokenManager.getAccessToken();
          if (token && originalRequest) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiInstance(originalRequest);
          }
          return Promise.reject(error);
        }).catch((err) => Promise.reject(err));
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      const refreshToken = TokenManager.getRefreshToken();
      if (!refreshToken) {
        processQueue(error, null);
        TokenManager.clearTokens();
        
        // Redirect to login only in browser environment
        if (typeof window !== 'undefined') {
          window.location.href = '/login?session=expired';
        }
        return Promise.reject(error);
      }
      
      try {
        // Try to refresh token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });
        
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        TokenManager.setTokens(accessToken, newRefreshToken);
        
        processQueue(null, accessToken);
        
        // Retry original request with new token
        if (originalRequest) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiInstance(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        TokenManager.clearTokens();
        
        // Redirect to login only in browser environment
        if (typeof window !== 'undefined') {
          window.location.href = '/login?session=expired';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

// API response interface
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Retry configuration
interface RetryConfig {
  retries?: number;
  retryDelay?: number;
  retryCondition?: (error: AxiosError) => boolean;
}

const defaultRetryConfig: Required<RetryConfig> = {
  retries: 3,
  retryDelay: 1000,
  retryCondition: (error: AxiosError) => {
    // Retry on network errors or 5xx server errors (but not 401/403)
    return !error.response || (error.response.status >= 500 && error.response.status < 600);
  }
};

// Retry wrapper
async function withRetry<T>(
  requestFn: () => Promise<AxiosResponse<T>>,
  config: RetryConfig = {}
): Promise<AxiosResponse<T>> {
  const { retries, retryDelay, retryCondition } = { ...defaultRetryConfig, ...config };
  
  let lastError: AxiosError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as AxiosError;
      
      // Don't retry if this is the last attempt or if retry condition fails
      if (attempt === retries || !retryCondition(lastError)) {
        throw lastError;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
    }
  }
  
  throw lastError!;
}

// Main API client class
class ApiClient {
  // Authentication
  async login(email: string, password: string): Promise<ApiResponse> {
    const response = await withRetry(() => 
      apiInstance.post('/auth/login', { email, password })
    );
    return response.data;
  }
  
  async register(userData: any): Promise<ApiResponse> {
    const response = await withRetry(() => 
      apiInstance.post('/auth/register', userData)
    );
    return response.data;
  }
  
  async logout(): Promise<ApiResponse> {
    const response = await apiInstance.post('/auth/logout');
    TokenManager.clearTokens();
    return response.data;
  }
  
  async refreshToken(): Promise<ApiResponse> {
    const refreshToken = TokenManager.getRefreshToken();
    const response = await apiInstance.post('/auth/refresh', { refreshToken });
    return response.data;
  }
  
  async getMe(): Promise<ApiResponse> {
    const response = await withRetry(() => 
      apiInstance.get('/auth/me')
    );
    return response.data;
  }
  
  // Business operations
  async getBusinesses(params?: any): Promise<ApiResponse> {
    const response = await withRetry(() => 
      apiInstance.get('/businesses', { params })
    );
    return response.data;
  }
  
  async getBusiness(id: string | number): Promise<ApiResponse> {
    const response = await withRetry(() => 
      apiInstance.get(`/businesses/${id}`)
    );
    return response.data;
  }
  
  async createBusiness(data: any): Promise<ApiResponse> {
    const response = await apiInstance.post('/businesses', data);
    return response.data;
  }
  
  async updateBusiness(id: string | number, data: any): Promise<ApiResponse> {
    const response = await apiInstance.put(`/businesses/${id}`, data);
    return response.data;
  }
  
  async deleteBusiness(id: string | number): Promise<ApiResponse> {
    const response = await apiInstance.delete(`/businesses/${id}`);
    return response.data;
  }
  
  // Customer operations
  async getCustomers(params?: any): Promise<ApiResponse> {
    const response = await withRetry(() => 
      apiInstance.get('/customers', { params })
    );
    return response.data;
  }
  
  async getCustomer(id: string | number): Promise<ApiResponse> {
    const response = await withRetry(() => 
      apiInstance.get(`/customers/${id}`)
    );
    return response.data;
  }
  
  async createCustomer(data: any): Promise<ApiResponse> {
    const response = await apiInstance.post('/customers', data);
    return response.data;
  }
  
  async updateCustomer(id: string | number, data: any): Promise<ApiResponse> {
    const response = await apiInstance.put(`/customers/${id}`, data);
    return response.data;
  }
  
  // Loyalty programs
  async getLoyaltyPrograms(params?: any): Promise<ApiResponse> {
    const response = await withRetry(() => 
      apiInstance.get('/loyalty', { params })
    );
    return response.data;
  }
  
  async getLoyaltyProgram(id: string | number): Promise<ApiResponse> {
    const response = await withRetry(() => 
      apiInstance.get(`/loyalty/${id}`)
    );
    return response.data;
  }
  
  async createLoyaltyProgram(data: any): Promise<ApiResponse> {
    const response = await apiInstance.post('/loyalty', data);
    return response.data;
  }
  
  // Points and transactions
  async awardPoints(customerId: string | number, programId: string | number, points: number, description?: string): Promise<ApiResponse> {
    const response = await apiInstance.post('/points/award', {
      customerId,
      programId, 
      points,
      description
    });
    return response.data;
  }
  
  async getTransactionHistory(customerId: string | number, params?: any): Promise<ApiResponse> {
    const response = await withRetry(() => 
      apiInstance.get(`/points/history/${customerId}`, { params })
    );
    return response.data;
  }
  
  // Loyalty cards
  async getCustomerCards(customerId: string | number): Promise<ApiResponse> {
    const response = await withRetry(() => 
      apiInstance.get(`/cards/customer/${customerId}`)
    );
    return response.data;
  }
  
  async generateQrCode(cardId: string | number): Promise<ApiResponse> {
    const response = await apiInstance.post(`/qr/generate`, { cardId });
    return response.data;
  }
  
  // Notifications
  async getNotifications(params?: any): Promise<ApiResponse> {
    const response = await withRetry(() => 
      apiInstance.get('/notifications', { params })
    );
    return response.data;
  }
  
  async markNotificationAsRead(id: string | number): Promise<ApiResponse> {
    const response = await apiInstance.put(`/notifications/${id}/read`);
    return response.data;
  }
  
  // Health check
  async healthCheck(): Promise<ApiResponse> {
    const response = await withRetry(() => 
      apiInstance.get('/health')
    );
    return response.data;
  }
  
  // Generic methods
  async get(endpoint: string, params?: any): Promise<ApiResponse> {
    const response = await withRetry(() => 
      apiInstance.get(endpoint, { params })
    );
    return response.data;
  }
  
  async post(endpoint: string, data?: any): Promise<ApiResponse> {
    const response = await apiInstance.post(endpoint, data);
    return response.data;
  }
  
  async put(endpoint: string, data?: any): Promise<ApiResponse> {
    const response = await apiInstance.put(endpoint, data);
    return response.data;
  }
  
  async delete(endpoint: string): Promise<ApiResponse> {
    const response = await apiInstance.delete(endpoint);
    return response.data;
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();

// Export TokenManager for direct access if needed
export { TokenManager };

// Export axios instance for advanced usage
export { apiInstance };

// Export types
export type { ApiResponse, RetryConfig };
