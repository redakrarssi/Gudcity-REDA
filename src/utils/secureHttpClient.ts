/**
 * Secure HTTP Client with SSRF Protection
 * 
 * Wrapper around fetch() that provides comprehensive SSRF protection
 * for all external requests made by the application.
 */

import fetch from 'node-fetch';
import { SSRFProtection, type SSRFValidationResult } from './ssrfProtection';

export interface SecureRequestOptions extends RequestInit {
  timeout?: number;
  maxRedirects?: number;
  maxResponseSize?: number;
  allowRedirects?: boolean;
}

export interface SecureResponse extends Response {
  originalUrl: string;
  finalUrl: string;
  redirectCount: number;
}

/**
 * Secure HTTP client with SSRF protection
 */
export class SecureHttpClient {
  private static readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private static readonly MAX_REDIRECTS = 3;
  private static readonly MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB
  
  /**
   * Make secure HTTP request with SSRF protection
   */
  static async secureRequest(
    url: string,
    options: SecureRequestOptions = {}
  ): Promise<SecureResponse> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      maxRedirects = this.MAX_REDIRECTS,
      maxResponseSize = this.MAX_RESPONSE_SIZE,
      allowRedirects = true,
      ...requestOptions
    } = options;
    
    // Validate URL
    const validation = await SSRFProtection.validateUrl(url);
    if (!validation.valid) {
      throw new Error(`SSRF Protection: ${validation.error}`);
    }
    
    // Create secure request options
    const secureOptions: RequestInit = {
      ...requestOptions,
      redirect: allowRedirects ? 'manual' : 'error', // Handle redirects manually
      headers: {
        'User-Agent': 'GudCity-Secure-Client/1.0',
        'Accept': 'application/json, text/plain, */*',
        ...requestOptions.headers
      }
    };
    
    // Make request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(validation.resolvedUrl!, {
        ...secureOptions,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Handle redirects securely
      if (allowRedirects && response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) {
          // Validate redirect URL
          const redirectValidation = await SSRFProtection.validateUrl(location);
          if (!redirectValidation.valid) {
            throw new Error(`SSRF Protection: Invalid redirect URL: ${redirectValidation.error}`);
          }
          
          // Check redirect count
          const redirectCount = (response as any).redirectCount || 0;
          if (redirectCount >= maxRedirects) {
            throw new Error('Too many redirects');
          }
          
          // Follow redirect (up to MAX_REDIRECTS)
          const redirectResponse = await this.secureRequest(redirectValidation.resolvedUrl!, {
            ...options,
            maxRedirects: maxRedirects - 1
          });
          
          // Mark as redirect response
          (redirectResponse as any).redirectCount = redirectCount + 1;
          (redirectResponse as any).originalUrl = url;
          (redirectResponse as any).finalUrl = redirectValidation.resolvedUrl!;
          
          return redirectResponse as SecureResponse;
        }
      }
      
      // Check response size
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > maxResponseSize) {
        throw new Error('Response too large');
      }
      
      // Mark response with metadata
      (response as any).originalUrl = url;
      (response as any).finalUrl = validation.resolvedUrl!;
      (response as any).redirectCount = 0;
      
      return response as SecureResponse;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }
  
  /**
   * Get JSON data securely
   */
  static async getJson<T>(url: string, options: SecureRequestOptions = {}): Promise<T> {
    const response = await this.secureRequest(url, {
      ...options,
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error('Invalid JSON response');
    }
  }
  
  /**
   * Post JSON data securely
   */
  static async postJson<T>(url: string, data: any, options: SecureRequestOptions = {}): Promise<T> {
    const response = await this.secureRequest(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error('Invalid JSON response');
    }
  }
  
  /**
   * Put JSON data securely
   */
  static async putJson<T>(url: string, data: any, options: SecureRequestOptions = {}): Promise<T> {
    const response = await this.secureRequest(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error('Invalid JSON response');
    }
  }
  
  /**
   * Delete request securely
   */
  static async delete(url: string, options: SecureRequestOptions = {}): Promise<SecureResponse> {
    return this.secureRequest(url, {
      ...options,
      method: 'DELETE'
    });
  }
  
  /**
   * Head request securely
   */
  static async head(url: string, options: SecureRequestOptions = {}): Promise<SecureResponse> {
    return this.secureRequest(url, {
      ...options,
      method: 'HEAD'
    });
  }
  
  /**
   * Download file securely
   */
  static async downloadFile(
    url: string, 
    options: SecureRequestOptions = {}
  ): Promise<Buffer> {
    const response = await this.secureRequest(url, {
      ...options,
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    
    // Check size limit
    const maxSize = options.maxResponseSize || this.MAX_RESPONSE_SIZE;
    if (buffer.length > maxSize) {
      throw new Error('File too large');
    }
    
    return buffer;
  }
  
  /**
   * Stream response securely
   */
  static async streamResponse(
    url: string,
    options: SecureRequestOptions = {}
  ): Promise<NodeJS.ReadableStream> {
    const response = await this.secureRequest(url, {
      ...options,
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.body;
  }
  
  /**
   * Validate URL without making request
   */
  static async validateUrl(url: string): Promise<SSRFValidationResult> {
    return SSRFProtection.validateUrl(url);
  }
  
  /**
   * Check if URL is safe for external requests
   */
  static async isUrlSafe(url: string): Promise<boolean> {
    const result = await this.validateUrl(url);
    return result.valid;
  }
  
  /**
   * Get sanitized URL for logging
   */
  static sanitizeUrlForLogging(url: string): string {
    return SSRFProtection.sanitizeUrlForLogging(url);
  }
}
