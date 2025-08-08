/**
 * Authentication Interceptor
 * 
 * This module patches the global fetch API to automatically add authentication
 * tokens to all API requests. It ensures that authentication is consistent
 * across the application without requiring each component to handle it.
 */

import { getAuthToken } from '../services/authTokenService';

/**
 * Initialize the authentication interceptor
 */
export function initAuthInterceptor() {
  // Store the original fetch function
  const originalFetch = window.fetch;
  
  // Replace with our interceptor
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
    // Only intercept API requests
    const url = input instanceof Request ? input.url : String(input);
    
    if (isApiRequest(url)) {
      console.log(`Auth interceptor: Adding auth headers to ${url}`);
      
      // Get the auth token
      const token = getAuthToken();
      
      if (!token) {
        console.warn(`Auth interceptor: No token available for API request to ${url}`);
      } else {
        // Create new init object with auth headers
        const newInit: RequestInit = init ? { ...init } : {};
        
        // Add headers
        newInit.headers = {
          ...(newInit.headers || {}),
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        
        // Ensure credentials are included
        newInit.credentials = 'include';
        
        // Call original fetch with new init
        const response = await originalFetch.call(window, input, newInit);
        
        // Handle auth failures centrally
        try {
          if (response.status === 401 || response.status === 403) {
            const cloned = response.clone();
            const data = await cloned.json().catch(() => ({} as any));
            const code = (data && (data.code || data.errorCode)) as string | undefined;
            
            if (response.status === 403 && code === 'AUTH_USER_BANNED') {
              console.error('Global interceptor: Banned user attempted API access. Redirecting.');
              window.location.href = '/suspended?reason=banned';
            } else if (response.status === 403 && code === 'AUTH_USER_RESTRICTED') {
              console.warn('Global interceptor: Restricted user blocked from API. Redirecting.');
              window.location.href = '/suspended?reason=restricted';
            } else if (response.status === 401) {
              // Token invalid/expired → send to login
              console.warn('Global interceptor: Unauthorized response, redirecting to login.');
              window.location.href = '/login';
            }
          }
        } catch (e) {
          // Swallow errors from parsing/interception to not break normal flow
          console.debug('Auth interceptor response handling error:', e);
        }
        
        return response;
      }
    }
    
    // For non-API requests, just pass through
    return originalFetch.call(window, input, init);
  };
  
  console.log('Auth interceptor initialized');
}

/**
 * Check if a URL is an API request that should have auth headers
 */
function isApiRequest(url: string): boolean {
  // Check if the URL is relative or matches our API domain
  if (url.startsWith('/api/')) {
    return true;
  }
  
  // Also check for absolute URLs to our API
  try {
    const urlObj = new URL(url, window.location.origin);
    return urlObj.pathname.startsWith('/api/');
  } catch (e) {
    // If URL parsing fails, assume it's not an API request
    return false;
  }
}

// Auto-initialize when this module is imported
initAuthInterceptor(); 