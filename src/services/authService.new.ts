import { apiClient } from '../utils/apiClient';

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * SECURITY: Enhanced password policy validation
 * Note: This is also validated server-side in the API
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password cannot exceed 128 characters');
  }
  
  // SECURITY: Require complexity
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // SECURITY: Prevent common weak passwords
  const commonPasswords = [
    'password', '123456', 'qwerty', 'admin', 'letmein', 'welcome',
    'monkey', 'dragon', 'master', 'football', 'baseball'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common and easily guessable');
  }
  
  // SECURITY: Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password cannot contain more than 2 repeated characters');
  }
  
  // SECURITY: Check for sequential characters
  if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) {
    errors.push('Password cannot contain sequential characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Login with serverless API
 */
export async function login(email: string, password: string): Promise<{
  success: boolean;
  user?: User;
  tokens?: AuthTokens;
  error?: string;
}> {
  try {
    const response = await apiClient.login(email, password);
    
    if (response.success) {
      return {
        success: true,
        user: response.data.user,
        tokens: {
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          expiresIn: response.data.expiresIn
        }
      };
    } else {
      return {
        success: false,
        error: response.error || 'Login failed'
      };
    }
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: 'Login failed. Please try again.'
    };
  }
}

/**
 * Register new user with serverless API
 */
export async function register(userData: {
  email: string;
  password: string;
  name: string;
  role?: string;
}): Promise<{
  success: boolean;
  user?: User;
  tokens?: AuthTokens;
  error?: string;
}> {
  try {
    // Client-side validation first
    const passwordValidation = validatePassword(userData.password);
    if (!passwordValidation.isValid) {
      return {
        success: false,
        error: passwordValidation.errors.join(', ')
      };
    }

    const response = await apiClient.register(userData);
    
    if (response.success) {
      return {
        success: true,
        user: response.data.user,
        tokens: {
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          expiresIn: response.data.expiresIn
        }
      };
    } else {
      return {
        success: false,
        error: response.error || 'Registration failed'
      };
    }
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: 'Registration failed. Please try again.'
    };
  }
}

/**
 * Logout user
 */
export async function logout(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const response = await apiClient.logout();
    return {
      success: response.success,
      error: response.error
    };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      error: 'Logout failed'
    };
  }
}

/**
 * Refresh authentication token
 */
export async function refreshToken(): Promise<{
  success: boolean;
  tokens?: AuthTokens;
  error?: string;
}> {
  try {
    const response = await apiClient.refreshToken();
    
    if (response.success) {
      return {
        success: true,
        tokens: {
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          expiresIn: response.data.expiresIn
        }
      };
    } else {
      return {
        success: false,
        error: response.error || 'Token refresh failed'
      };
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return {
      success: false,
      error: 'Token refresh failed'
    };
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<{
  success: boolean;
  user?: User;
  error?: string;
}> {
  try {
    const response = await apiClient.getMe();
    
    if (response.success) {
      return {
        success: true,
        user: response.data
      };
    } else {
      return {
        success: false,
        error: response.error || 'Failed to get user profile'
      };
    }
  } catch (error) {
    console.error('Get current user error:', error);
    return {
      success: false,
      error: 'Failed to get user profile'
    };
  }
}

/**
 * Verify if user is authenticated
 */
export function isAuthenticated(): boolean {
  try {
    const token = localStorage.getItem('auth_token');
    return !!token;
  } catch {
    return false;
  }
}

/**
 * Get user role from stored token
 */
export function getUserRole(): string | null {
  try {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      return userData.role || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clear authentication data
 */
export function clearAuth(): void {
  try {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  } catch (error) {
    console.warn('Failed to clear auth data:', error);
  }
}
