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
      'Accept': 'application/json',
      // CSRF header will be set dynamically from cookie by caller if present
    };
  }

  // Read token for backward compatibility; cookies will also be sent via credentials: 'include'
  private getAuthToken(): string | null {
    try {
      return localStorage.getItem('token');
    } catch {
      return null;
    }
  }

  private attachCsrf(headers: Record<string, string>): void {
    try {
      const csrfCookie = document.cookie.split(';').map(s => s.trim()).find(c => c.startsWith('csrf_token='));
      if (csrfCookie) {
        const token = decodeURIComponent(csrfCookie.split('=')[1] || '');
        if (token) headers['x-csrf-token'] = token;
      }
    } catch {
      // ignore
    }
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
      // no CSRF on GET
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers,
        credentials: 'include',
        cache: 'no-store',
      });
      const contentType = response.headers.get('content-type') || '';
      let data: any = null;
      if (response.status === 304) {
        // No body for 304; caller should use its own cache fallback
        data = null;
      } else if (contentType.includes('application/json')) {
        data = await response.json().catch(() => null);
      } else if (contentType.includes('text/html')) {
        // Guard against HTML being returned from SW or rewrites
        const text = await response.text().catch(() => '');
        return {
          status: response.status,
          data: null,
          error: 'Expected JSON but received HTML response',
        };
      } else {
        // Fallback: try text
        data = await response.text().catch(() => null);
      }
      
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
      this.attachCsrf(headers);
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
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
      this.attachCsrf(headers);
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
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
      this.attachCsrf(headers);
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
        cache: 'no-store',
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