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
  retryDelay: 1000, // Base delay - will be used for exponential backoff
  timeout: 30000, // 30 seconds
};

// Circuit breaker for repeated failures
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

const circuitBreaker: Map<string, CircuitBreakerState> = new Map();
const CIRCUIT_BREAKER_THRESHOLD = 5; // Open after 5 consecutive failures
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 60 seconds

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
function isRetryableError(error: Error, response?: Response): boolean {
  // Never retry on 4xx client errors (user's fault)
  if (response && response.status >= 400 && response.status < 500) {
    console.log(`🚫 Not retrying 4xx client error: ${response.status}`);
    return false;
  }
  
  // Retry on 5xx server errors
  if (response && response.status >= 500) {
    console.log(`🔄 Will retry 5xx server error: ${response.status}`);
    return true;
  }
  
  // Retry on network/connection errors only
  const networkErrors = [
    'Failed to fetch',
    'Network request failed',
    'NetworkError',
    'TimeoutError', 
    'TypeError', // Often indicates network issues
    'AbortError'
  ];
  
  const isNetworkError = networkErrors.some(errorType => 
    error.message.includes(errorType) || error.name === errorType
  );
  
  if (isNetworkError) {
    console.log(`🔄 Will retry network error: ${error.message}`);
    return true;
  }
  
  console.log(`🚫 Not retrying error: ${error.message}`);
  return false;
}

// Check circuit breaker status for an endpoint
function isCircuitBreakerOpen(endpoint: string): boolean {
  const state = circuitBreaker.get(endpoint);
  if (!state) return false;
  
  // Check if enough time has passed to reset the circuit breaker
  if (state.isOpen && Date.now() - state.lastFailureTime > CIRCUIT_BREAKER_TIMEOUT) {
    console.log(`🔧 Circuit breaker reset for ${endpoint}`);
    circuitBreaker.delete(endpoint);
    return false;
  }
  
  return state.isOpen;
}

// Record failure for circuit breaker
function recordFailure(endpoint: string): void {
  const state = circuitBreaker.get(endpoint) || { failures: 0, lastFailureTime: 0, isOpen: false };
  
  state.failures++;
  state.lastFailureTime = Date.now();
  
  if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    state.isOpen = true;
    console.warn(`⚠️ Circuit breaker opened for ${endpoint} after ${state.failures} failures`);
  }
  
  circuitBreaker.set(endpoint, state);
}

// Record success for circuit breaker
function recordSuccess(endpoint: string): void {
  const state = circuitBreaker.get(endpoint);
  if (state) {
    // Reset the circuit breaker on success
    circuitBreaker.delete(endpoint);
    console.log(`✅ Circuit breaker reset for ${endpoint} after success`);
  }
}

// Helper: Make API request with retry logic
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  retryCount = 0
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Check circuit breaker before making request
  if (isCircuitBreakerOpen(endpoint)) {
    const error = new Error(`Circuit breaker is open for ${endpoint}. Too many recent failures.`);
    console.error(`⚡ Circuit breaker blocked request to ${endpoint}`);
    throw error;
  }
  
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
    
    // Handle client errors (4xx) - don't retry these
    if (response.status >= 400 && response.status < 500) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      const clientError = new Error(
        errorData.error?.message || errorData.error || errorData.message || 
        `Client error: ${response.status} ${response.statusText}`
      );
      // Store response for retry decision
      (clientError as any).response = response;
      console.warn(`🚫 Client error (${response.status}):`, clientError.message);
      throw clientError;
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
      const serverError = new Error(
        data.error?.message || data.error || data.message || 
        `Server error: ${response.status} ${response.statusText}`
      );
      // Store response for retry decision
      (serverError as any).response = response;
      throw serverError;
    }
    
    // Record success for circuit breaker
    recordSuccess(endpoint);

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
    
    const typedError = error as Error & { response?: Response };
    
    // Record failure for circuit breaker
    recordFailure(endpoint);
    
    // Retry logic for retryable errors only
    if (retryCount < API_CONFIG.maxRetries! && isRetryableError(typedError, typedError.response)) {
      // Exponential backoff: 1s, 2s, 4s
      const delay = API_CONFIG.retryDelay! * Math.pow(2, retryCount);
      console.log(`🔄 Retrying request ${retryCount + 1}/${API_CONFIG.maxRetries} in ${delay}ms... (${typedError.message})`);
      
      await sleep(delay);
      return apiRequest<T>(endpoint, options, retryCount + 1);
    }
    
    // Log final failure after all retries exhausted
    if (retryCount >= API_CONFIG.maxRetries!) {
      console.error(`❌ Request failed after ${API_CONFIG.maxRetries} attempts: ${endpoint}`);
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

// ====================
// Transaction APIs
// ====================

export async function apiAwardPoints(
  customerId: string,
  programId: string,
  points: number,
  description?: string
): Promise<any> {
  return apiPost('/api/transactions/award-points', {
    customerId,
    programId,
    points,
    description
  });
}

export async function apiGetTransactions(filters?: {
  customerId?: string;
  businessId?: string;
  programId?: string;
  startDate?: Date;
  endDate?: Date;
  type?: 'AWARD' | 'REDEEM';
}): Promise<any> {
  return apiGet('/api/transactions/list', filters);
}

export async function apiGetCustomerTransactions(
  customerId: string,
  programId?: string
): Promise<any> {
  return apiGet(`/api/transactions/customer/${customerId}`, programId ? { programId } : undefined);
}

export async function apiRedeemReward(
  customerId: string,
  programId: string,
  rewardId: string,
  pointsRequired: number
): Promise<any> {
  return apiPost('/api/transactions/redeem', {
    customerId,
    programId,
    rewardId,
    pointsRequired
  });
}

// ====================
// QR Code APIs
// ====================

export async function apiProcessQrCode(
  qrData: any,
  pointsToAward?: number
): Promise<any> {
  return apiPost('/api/qr/process', {
    qrData,
    pointsToAward
  });
}

export async function apiGenerateQrCode(customerId?: string): Promise<any> {
  return apiPost('/api/qr/generate', {
    customerId
  });
}

export async function apiValidateQrCode(qrData: any): Promise<any> {
  return apiPost('/api/qr/validate', {
    qrData
  });
}

export async function apiGetQrCodeIntegrity(qrCodeId: string): Promise<any> {
  return apiGet('/api/qr/integrity', { qrCodeId });
}

// ====================
// Notification APIs
// ====================

export async function apiGetNotifications(filters?: {
  userId?: string;
  unreadOnly?: boolean;
  limit?: number;
}): Promise<any> {
  return apiGet('/api/notifications/list', filters);
}

export async function apiMarkNotificationAsRead(notificationId: string): Promise<any> {
  return apiPut(`/api/notifications/${notificationId}/read`);
}

export async function apiDeleteNotification(notificationId: string): Promise<any> {
  return apiDelete(`/api/notifications/${notificationId}/delete`);
}

export async function apiGetUnreadNotificationCount(userId?: string): Promise<any> {
  return apiGet('/api/notifications/unread-count', userId ? { userId } : undefined);
}

// ====================
// Loyalty Card APIs
// ====================

export async function apiGetCustomerCards(customerId: string): Promise<any> {
  return apiGet(`/api/loyalty/cards/customer/${customerId}`);
}

export async function apiGetCardById(cardId: string): Promise<any> {
  return apiGet(`/api/loyalty/cards/${cardId}`);
}

export async function apiGetCardActivities(cardId: string): Promise<any> {
  return apiGet(`/api/loyalty/cards/activities?cardId=${cardId}`);
}

// ====================
// Loyalty Program APIs
// ====================

export async function apiGetBusinessPrograms(businessId: string): Promise<any> {
  return apiGet(`/api/loyalty/programs/list?businessId=${businessId}`);
}

export async function apiGetProgramById(programId: string): Promise<any> {
  return apiGet(`/api/loyalty/programs/${programId}`);
}

export async function apiCreateProgram(businessId: string, programData: any): Promise<any> {
  return apiPost('/api/loyalty/programs/create', { ...programData, businessId });
}

export async function apiUpdateProgram(programId: string, updates: any): Promise<any> {
  return apiPut(`/api/loyalty/programs/${programId}`, updates);
}

export async function apiDeleteProgram(programId: string): Promise<any> {
  return apiDelete(`/api/loyalty/programs/${programId}`);
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
  
  // Transactions
  awardPoints: apiAwardPoints,
  getTransactions: apiGetTransactions,
  getCustomerTransactions: apiGetCustomerTransactions,
  redeemReward: apiRedeemReward,
  
  // QR Codes
  processQrCode: apiProcessQrCode,
  generateQrCode: apiGenerateQrCode,
  validateQrCode: apiValidateQrCode,
  getQrCodeIntegrity: apiGetQrCodeIntegrity,
  
  // Notifications
  getNotifications: apiGetNotifications,
  markNotificationAsRead: apiMarkNotificationAsRead,
  deleteNotification: apiDeleteNotification,
  getUnreadNotificationCount: apiGetUnreadNotificationCount,
  
  // Loyalty Cards
  getCustomerCards: apiGetCustomerCards,
  getCardById: apiGetCardById,
  getCardActivities: apiGetCardActivities,
  
  // Loyalty Programs
  getBusinessPrograms: apiGetBusinessPrograms,
  getProgramById: apiGetProgramById,
  createProgram: apiCreateProgram,
  updateProgram: apiUpdateProgram,
  deleteProgram: apiDeleteProgram,
};

export default ApiClient;
