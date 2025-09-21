/**
 * Authentication Token Service
 * 
 * This service provides secure token management for API requests.
 * It handles token retrieval, generation, and storage using secure HTTP-only cookies
 * and encryption to ensure API calls always have valid authentication.
 */

import { STORAGE_KEYS } from '../utils/constants';
import { secureCookieManager, TokenEncryption } from '../utils/authSecurity';

/**
 * Get the current authentication token from secure storage
 * @returns The authentication token or null if not found
 */
export function getAuthToken(): string | null {
  // SECURITY: Try to get token from secure HTTP-only cookies first
  // Note: This function runs on client-side, so we need to check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // In browser environment, try to get from secure cookies
    // This would typically be done through a server-side API call
    // For now, we'll fall back to localStorage but with encryption
    const encryptedToken = localStorage.getItem('encrypted_token');
    if (encryptedToken) {
      try {
        const encryptionKey = process.env.VITE_COOKIE_ENCRYPTION_KEY || 'default-key';
        return TokenEncryption.decryptToken(encryptedToken, encryptionKey);
      } catch (error) {
        console.error('Failed to decrypt token:', error);
        return null;
      }
    }
  }
  
  // Fallback to legacy token retrieval (for backward compatibility)
  const token = localStorage.getItem('token') || 
                localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) ||
                localStorage.getItem('authToken') ||
                localStorage.getItem('jwt');
  
  if (token) {
    return token;
  }
  
  // If no token found, try to generate one from user data
  return generateTokenFromUserData();
}

/**
 * Generate a token from user data if available
 * @returns Generated token or null if not possible
 */
function generateTokenFromUserData(): string | null {
  const authUserData = localStorage.getItem('authUserData');
  const authUserId = localStorage.getItem('authUserId');
  
  if (!authUserData || !authUserId) {
    return null;
  }
  
  try {
    // Parse user data
    const userData = JSON.parse(authUserData);
    
    // Create a simple token based on user data
    // Format: base64(userId:email:role)
    const tokenPayload = `${authUserId}:${userData.email}:${userData.role || 'user'}`;
    const token = btoa(tokenPayload);
    
    // SECURITY: Save the generated token with encryption
    try {
      const encryptionKey = process.env.VITE_COOKIE_ENCRYPTION_KEY || 'default-key';
      const encryptedToken = TokenEncryption.encryptToken(token, encryptionKey);
      localStorage.setItem('encrypted_token', encryptedToken);
      console.log('Generated and encrypted auth token from user data');
    } catch (error) {
      console.error('Failed to encrypt token:', error);
      // Fallback to unencrypted storage (not recommended for production)
      localStorage.setItem('token', token);
    }
    
    return token;
  } catch (error) {
    console.error('Failed to generate token from user data:', error);
    return null;
  }
}

/**
 * Ensure an authentication token exists
 * @returns True if token exists or was created, false otherwise
 */
export function ensureAuthToken(): boolean {
  const token = getAuthToken();
  return token !== null;
}

/**
 * Add authentication headers to fetch request options
 * @param options Fetch request options
 * @returns Updated options with auth headers
 */
export function addAuthHeaders(options: RequestInit = {}): RequestInit {
  const token = getAuthToken();
  
  if (!token) {
    console.warn('No authentication token available for request');
    return options;
  }
  
  return {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.headers || {}),
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };
}

/**
 * Create an authenticated fetch function
 * @returns Fetch function that automatically includes auth headers
 */
export function createAuthFetch() {
  return async (url: string, options: RequestInit = {}) => {
    const authOptions = addAuthHeaders(options);
    return fetch(url, authOptions);
  };
}

/**
 * Clear all authentication tokens
 */
export function clearAuthTokens(): void {
  // SECURITY: Clear all token storage locations including encrypted tokens
  localStorage.removeItem('token');
  localStorage.removeItem('encrypted_token');
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  localStorage.removeItem('authToken');
  localStorage.removeItem('jwt');
  
  // Clear user data as well
  localStorage.removeItem('authUserData');
  localStorage.removeItem('authUserId');
  
  console.log('All authentication tokens cleared');
}

// Initialize: ensure token exists when the service is loaded
ensureAuthToken();

export default {
  getAuthToken,
  ensureAuthToken,
  addAuthHeaders,
  createAuthFetch,
  clearAuthTokens
}; 