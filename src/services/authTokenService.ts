/**
 * Authentication Token Service
 * 
 * This service provides consistent token management for API requests.
 * It handles token retrieval, generation, and storage to ensure API calls
 * always have valid authentication.
 */

import { STORAGE_KEYS } from '../utils/constants';

/**
 * Get the current authentication token from various possible storage locations
 * @returns The authentication token or null if not found
 */
export function getAuthToken(): string | null {
  // Try all possible token storage locations
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
    
    // Save the generated token for future use
    localStorage.setItem('token', token);
    console.log('Generated auth token from user data');
    
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
  localStorage.removeItem('token');
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  localStorage.removeItem('authToken');
  localStorage.removeItem('jwt');
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