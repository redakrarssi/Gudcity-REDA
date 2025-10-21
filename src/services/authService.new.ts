/**
 * Auth Service - API Only
 * 
 * This service handles all authentication operations through API calls.
 * No direct database access - all operations go through the backend API.
 */

import { apiLogin, apiRegister } from './apiClient';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  user_type: 'customer' | 'business' | 'admin';
  business_name?: string;
  phone?: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  user_type: string;
  role?: string;
  status?: string;
  business_name?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

/**
 * Auth Service
 * Manages authentication through secure API endpoints
 */
export class AuthService {
  /**
   * Login user
   */
  static async login(credentials: LoginCredentials): Promise<{
    success: boolean;
    token?: string;
    user?: AuthUser;
    error?: string;
  }> {
    try {
      const response = await apiLogin(credentials);
      
      if (response.token && response.user) {
        // Store token in localStorage
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        return {
          success: true,
          token: response.token,
          user: response.user
        };
      }
      
      return {
        success: false,
        error: 'Invalid response from server'
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'Login failed'
      };
    }
  }

  /**
   * Register new user
   */
  static async register(data: RegisterData): Promise<{
    success: boolean;
    token?: string;
    user?: AuthUser;
    error?: string;
  }> {
    try {
      const response = await apiRegister(data);
      
      if (response.token && response.user) {
        // Store token in localStorage
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        return {
          success: true,
          token: response.token,
          user: response.user
        };
      }
      
      return {
        success: false,
        error: 'Invalid response from server'
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.message || 'Registration failed'
      };
    }
  }

  /**
   * Logout user
   */
  static logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  /**
   * Get current user from localStorage
   */
  static getCurrentUser(): AuthUser | null {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        return JSON.parse(userStr);
      }
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Get auth token
   */
  static getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getCurrentUser();
    return !!token && !!user;
  }

  /**
   * Check if user has specific role
   */
  static hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.user_type === role || user?.role === role;
  }
}

export default AuthService;

