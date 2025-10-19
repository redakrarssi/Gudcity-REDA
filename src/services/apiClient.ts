/**
 * API Client Service
 * This service handles all API calls to the backend
 * NO DATABASE ACCESS - Only API calls
 */

// In local development, API routes are proxied by Vite
// In production (Vercel), they're serverless functions at /api/*
const IS_DEV = import.meta.env.DEV || import.meta.env.MODE === 'development';

// CRITICAL FIX: Proper API base URL configuration to prevent double /api/ prefix
// NOTE: All endpoints in this file already include /api/ prefix, so base URL should be domain only
const API_BASE_URL = (() => {
  // 1. Check explicit VITE_API_URL first (should be empty or domain only, NOT /api)
  const explicitApiUrl = import.meta.env.VITE_API_URL;
  if (explicitApiUrl && explicitApiUrl.trim()) {
    const url = explicitApiUrl.replace(/\/$/, ''); // Remove trailing slash
    // PREVENT DOUBLE /api/ PREFIX: If VITE_API_URL is set to /api, ignore it
    // because endpoints already include /api/ prefix
    if (url === '/api' || url.endsWith('/api')) {
      console.warn('⚠️ VITE_API_URL is set to "/api" but endpoints already include /api/ prefix. Using empty string instead.');
      return '';
    }
    return url;
  }
  
  // 2. In production, use same-origin (domain only, no /api prefix)
  // This is correct because endpoints like '/api/auth/login' already have /api/
  if (!IS_DEV && typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // 3. Development fallback - empty string works with Vite proxy
  // Vite proxies /api/* to localhost:3000/api/*
  return '';
})();

console.log(`🔗 API Configuration:`, {
  isDev: IS_DEV,
  baseUrl: API_BASE_URL,
  explicitUrl: import.meta.env.VITE_API_URL,
  mode: import.meta.env.MODE,
  origin: typeof window !== 'undefined' ? window.location.origin : 'N/A'
});

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success?: boolean;
}

// Enhanced API client configuration
interface ApiClientConfig {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

const API_CONFIG: ApiClientConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000, // 30 seconds
};

// Request/Response interceptors
type RequestInterceptor = (config: RequestInit) => RequestInit | Promise<RequestInit>;
type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];

/**
 * Add request interceptor
 */
export function addRequestInterceptor(interceptor: RequestInterceptor): void {
  requestInterceptors.push(interceptor);
}

/**
 * Add response interceptor
 */
export function addResponseInterceptor(interceptor: ResponseInterceptor): void {
  responseInterceptors.push(interceptor);
}

/**
 * Sleep helper for retry logic
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: Error): boolean {
  const retryableErrors = [
    'Failed to fetch',
    'Network request failed',
    'NetworkError',
    'TimeoutError',
  ];
  return retryableErrors.some(msg => error.message.includes(msg));
}

// Helper: Make API request with retry logic
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // Add auth token if available
  const token = localStorage.getItem('token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  let config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  // Apply request interceptors
  for (const interceptor of requestInterceptors) {
    config = await interceptor(config);
  }

  try {
    console.log(`🌐 Making API request (attempt ${retryCount + 1}):`, { 
      method: config.method || 'GET', 
      url,
    });
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
    
    let response = await fetch(url, {
      ...config,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // Apply response interceptors
    for (const interceptor of responseInterceptors) {
      response = await interceptor(response);
    }
    
    console.log(`📡 API Response:`, { 
      status: response.status, 
      statusText: response.statusText,
      contentType: response.headers.get('content-type'),
      url 
    });
    
    // Handle 404 errors specifically
    if (response.status === 404) {
      throw new Error(`API endpoint not found: ${url} (404)`);
    }
    
    // Handle non-JSON responses (like HTML error pages)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await response.text();
      console.error(`❌ Non-JSON response from ${url}:`, textResponse.substring(0, 200));
      throw new Error(`API endpoint returned non-JSON response: ${url} (${response.status})`);
    }
    
    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error?.message || data.error || data.message || 
        `API request failed: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    // Handle both old and new response formats
    if (data.success !== undefined) {
      return data.success ? data.data : data;
    }
    return data;
    
  } catch (error) {
    console.error(`❌ API Error [${endpoint}] (attempt ${retryCount + 1}):`, {
      error: (error as Error).message,
      url,
      baseUrl: API_BASE_URL,
      isDev: IS_DEV,
    });
    
    // Retry logic for retryable errors
    if (retryCount < API_CONFIG.maxRetries! && isRetryableError(error as Error)) {
      console.log(`🔄 Retrying request in ${API_CONFIG.retryDelay}ms...`);
      await sleep(API_CONFIG.retryDelay! * (retryCount + 1)); // Exponential backoff
      return apiRequest<T>(endpoint, options, retryCount + 1);
    }
    
    // Enhanced error messages for debugging
    if ((error as Error).message.includes('Failed to fetch') || (error as Error).name === 'AbortError') {
      if (IS_DEV) {
        throw new Error(`Network error in development. Check if API server is running. Original error: ${(error as Error).message}`);
      } else {
        throw new Error(`Network error in production. Check if serverless functions are deployed correctly. URL: ${url}`);
      }
    }
    
    throw error;
  }
}

/**
 * Build query string from parameters
 */
function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Enhanced API request methods with query parameter support
 */
export async function apiGet<T = any>(
  endpoint: string,
  params?: Record<string, any>
): Promise<T> {
  const queryString = params ? buildQueryString(params) : '';
  return apiRequest<T>(`${endpoint}${queryString}`, { method: 'GET' });
}

export async function apiPost<T = any>(
  endpoint: string,
  body?: any,
  params?: Record<string, any>
): Promise<T> {
  const queryString = params ? buildQueryString(params) : '';
  return apiRequest<T>(`${endpoint}${queryString}`, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPut<T = any>(
  endpoint: string,
  body?: any,
  params?: Record<string, any>
): Promise<T> {
  const queryString = params ? buildQueryString(params) : '';
  return apiRequest<T>(`${endpoint}${queryString}`, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T = any>(
  endpoint: string,
  params?: Record<string, any>
): Promise<T> {
  const queryString = params ? buildQueryString(params) : '';
  return apiRequest<T>(`${endpoint}${queryString}`, { method: 'DELETE' });
}

// ====================
// Authentication APIs
// ====================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  user_type?: string;
  role?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    user_type: string;
  };
}

export async function apiLogin(credentials: LoginCredentials): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function apiRegister(data: RegisterData): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ====================
// User APIs
// ====================

export interface User {
  id: number;
  email: string;
  name: string;
  user_type: string;
  role: string;
  status: string;
  created_at?: string;
  last_login?: string;
  phone?: string;
  address?: string;
  business_name?: string;
  business_address?: string;
  business_phone?: string;
  tier?: string;
  loyalty_points?: number;
  total_spent?: number;
}

export async function apiGetUserByEmail(email: string): Promise<User> {
  const response = await apiRequest<{ user: User }>('/api/users/by-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return response.user;
}

export async function apiGetUserById(id: number): Promise<User> {
  const response = await apiRequest<{ user: User }>(`/api/users/${id}`, {
    method: 'GET',
  });
  return response.user;
}

export async function apiUpdateUser(id: number, data: Partial<User>): Promise<User> {
  const response = await apiRequest<{ user: User }>(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.user;
}

// ====================
// Database APIs
// ====================

export async function apiInitializeDatabase(adminToken?: string): Promise<{ message: string; results: string[] }> {
  const headers: HeadersInit = {};
  if (adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }

  return apiRequest('/api/db/initialize', {
    method: 'POST',
    headers,
  });
}

// ====================
// Customer APIs
// ====================

export async function apiGetBusinessCustomers(businessId: string): Promise<any[]> {
  const response = await apiRequest<{ customers: any[] }>(`/api/customers/business/${businessId}`, {
    method: 'GET',
  });
  return response.customers;
}

// ====================
// Security APIs
// ====================

export async function apiCheckAccountLockout(email: string): Promise<{ locked: boolean; lockedUntil?: number }> {
  return apiRequest('/api/security/check-lockout', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function apiRecordFailedLogin(email: string, ipAddress?: string): Promise<void> {
  await apiRequest('/api/security/record-failed-login', {
    method: 'POST',
    body: JSON.stringify({ email, ipAddress }),
  });
}

// ====================
// Enhanced User APIs
// ====================

export async function apiSearchUsers(
  query: string,
  filters?: {
    userType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<any> {
  return apiPost('/api/users/search', { query, ...filters });
}

export async function apiGetUsersByType(
  type: string,
  options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
): Promise<any> {
  return apiGet('/api/users/list', { type, ...options });
}

export async function apiDeleteUser(id: number): Promise<void> {
  await apiDelete(`/api/users/${id}`);
}

// ====================
// Enhanced Customer APIs
// ====================

export async function apiGetCustomerById(customerId: string): Promise<any> {
  return apiGet(`/api/customers/${customerId}`);
}

export async function apiUpdateCustomer(customerId: string, updates: any): Promise<any> {
  return apiPut(`/api/customers/${customerId}`, updates);
}

export async function apiGetCustomerPrograms(customerId: string): Promise<any> {
  return apiGet(`/api/customers/${customerId}/programs`);
}

export async function apiEnrollCustomer(customerId: string, programId: string): Promise<any> {
  return apiPost('/api/customers/enroll', { customerId, programId });
}

// Export all API functions
export const ApiClient = {
  // Auth
  login: apiLogin,
  register: apiRegister,
  
  // Users
  getUserByEmail: apiGetUserByEmail,
  getUserById: apiGetUserById,
  updateUser: apiUpdateUser,
  searchUsers: apiSearchUsers,
  getUsersByType: apiGetUsersByType,
  deleteUser: apiDeleteUser,
  
  // Database
  initializeDatabase: apiInitializeDatabase,
  
  // Customers
  getBusinessCustomers: apiGetBusinessCustomers,
  getCustomerById: apiGetCustomerById,
  updateCustomer: apiUpdateCustomer,
  getCustomerPrograms: apiGetCustomerPrograms,
  enrollCustomer: apiEnrollCustomer,
  
  // Security
  checkAccountLockout: apiCheckAccountLockout,
  recordFailedLogin: apiRecordFailedLogin,
};

export default ApiClient;
