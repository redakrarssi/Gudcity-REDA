/**
 * API Client for making HTTP requests
 */

import { API_BASE_URL } from '../env';

interface ApiResponse {
  status: number;
  data?: any;
  error?: string;
}

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get authentication token from local storage
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Prepare headers for a request, including auth token if available
   */
  private getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    // Create a new headers object
    const headers: Record<string, string> = { ...this.defaultHeaders };
    
    // Add custom headers if provided
    if (customHeaders) {
      Object.keys(customHeaders).forEach(key => {
        headers[key] = customHeaders[key];
      });
    }
    
    // Add auth token if available
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  /**
   * Make a GET request
   */
  async get(endpoint: string, customHeaders?: Record<string, string>): Promise<ApiResponse> {
    try {
      const headers = this.getHeaders(customHeaders);
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers, // TypeScript correctly handles this as HeadersInit
      });

      const data = await response.json().catch(() => null);
      
      return {
        status: response.status,
        data,
        error: !response.ok ? (data?.message || response.statusText) : undefined,
      };
    } catch (error) {
      console.error(`API GET error for ${endpoint}:`, error);
      return {
        status: 0,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Make a POST request
   */
  async post(endpoint: string, body?: any, customHeaders?: Record<string, string>): Promise<ApiResponse> {
    try {
      const headers = this.getHeaders(customHeaders);
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json().catch(() => null);
      
      return {
        status: response.status,
        data,
        error: !response.ok ? (data?.message || response.statusText) : undefined,
      };
    } catch (error) {
      console.error(`API POST error for ${endpoint}:`, error);
      return {
        status: 0,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Make a PUT request
   */
  async put(endpoint: string, body?: any, customHeaders?: Record<string, string>): Promise<ApiResponse> {
    try {
      const headers = this.getHeaders(customHeaders);
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json().catch(() => null);
      
      return {
        status: response.status,
        data,
        error: !response.ok ? (data?.message || response.statusText) : undefined,
      };
    } catch (error) {
      console.error(`API PUT error for ${endpoint}:`, error);
      return {
        status: 0,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Make a DELETE request
   */
  async delete(endpoint: string, customHeaders?: Record<string, string>): Promise<ApiResponse> {
    try {
      const headers = this.getHeaders(customHeaders);
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers,
      });

      const data = await response.json().catch(() => null);
      
      return {
        status: response.status,
        data,
        error: !response.ok ? (data?.message || response.statusText) : undefined,
      };
    } catch (error) {
      console.error(`API DELETE error for ${endpoint}:`, error);
      return {
        status: 0,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }
}

// Create a singleton instance
const api = new ApiClient(API_BASE_URL);
export default api; 