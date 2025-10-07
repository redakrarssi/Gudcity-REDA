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
}

// Helper: Make API request
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
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

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    console.log(`🌐 Making API request:`, { method: config.method || 'GET', url, headers: config.headers });
    
    const response = await fetch(url, config);
    
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
      throw new Error(data.error || data.message || `API request failed: ${response.status} ${response.statusText}`);
    }

    return data;
  } catch (error) {
    console.error(`❌ API Error [${endpoint}]:`, {
      error: (error as Error).message,
      url,
      baseUrl: API_BASE_URL,
      isDev: IS_DEV,
      stack: (error as Error).stack
    });
    
    // Enhanced error messages for debugging
    if ((error as Error).message.includes('Failed to fetch')) {
      if (IS_DEV) {
        throw new Error(`Network error in development. Check if API server is running at localhost:3000. Original error: ${(error as Error).message}`);
      } else {
        throw new Error(`Network error in production. Check if serverless functions are deployed correctly. URL: ${url}`);
      }
    }
    
    throw error;
  }
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

// Export all API functions
export const ApiClient = {
  // Auth
  login: apiLogin,
  register: apiRegister,
  
  // Users
  getUserByEmail: apiGetUserByEmail,
  getUserById: apiGetUserById,
  updateUser: apiUpdateUser,
  
  // Database
  initializeDatabase: apiInitializeDatabase,
  
  // Customers
  getBusinessCustomers: apiGetBusinessCustomers,
  
  // Security
  checkAccountLockout: apiCheckAccountLockout,
  recordFailedLogin: apiRecordFailedLogin,
};

export default ApiClient;
