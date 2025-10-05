/**
 * API Client Service
 * This service handles all API calls to the backend
 * NO DATABASE ACCESS - Only API calls
 */

// In local development, API routes don't exist yet
// In production (Vercel), they're serverless functions
const IS_DEV = import.meta.env.DEV || import.meta.env.MODE === 'development';
const API_BASE_URL = IS_DEV ? '' : (import.meta.env.VITE_API_URL || '/api');

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
    const response = await fetch(url, config);
    
    // Handle non-JSON responses (like 404 or connection refused)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`API endpoint not available: ${url}`);
    }
    
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    
    // In development, if API is not available, throw a helpful error
    if (IS_DEV && (error as Error).message.includes('Failed to fetch')) {
      throw new Error('Backend API not available in development. Using direct database access fallback.');
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
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function apiRegister(data: RegisterData): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', {
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
  const response = await apiRequest<{ user: User }>('/users/by-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return response.user;
}

export async function apiGetUserById(id: number): Promise<User> {
  const response = await apiRequest<{ user: User }>(`/users/${id}`, {
    method: 'GET',
  });
  return response.user;
}

export async function apiUpdateUser(id: number, data: Partial<User>): Promise<User> {
  const response = await apiRequest<{ user: User }>(`/users/${id}`, {
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

  return apiRequest('/db/initialize', {
    method: 'POST',
    headers,
  });
}

// ====================
// Customer APIs
// ====================

export async function apiGetBusinessCustomers(businessId: string): Promise<any[]> {
  const response = await apiRequest<{ customers: any[] }>(`/customers/business/${businessId}`, {
    method: 'GET',
  });
  return response.customers;
}

// ====================
// Security APIs
// ====================

export async function apiCheckAccountLockout(email: string): Promise<{ locked: boolean; lockedUntil?: number }> {
  return apiRequest('/security/check-lockout', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function apiRecordFailedLogin(email: string, ipAddress?: string): Promise<void> {
  await apiRequest('/security/record-failed-login', {
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
