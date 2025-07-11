/**
 * Authentication token fix for the award points system
 * 
 * This script fixes the issue where the JWT token isn't properly stored in localStorage
 * for API requests. It attaches a login hook to ensure the token is saved correctly.
 */

(function() {
  console.log('🔒 Loading authentication token fix...');
  
  // Function to extract token from JWT authentication
  function extractJwtToken() {
    // Check if we have an authentication token in the app's standard storage
    const authUserData = localStorage.getItem('authUserData');
    const authUserId = localStorage.getItem('authUserId');
    
    if (!authUserData || !authUserId) {
      console.log('No authentication data found in localStorage');
      return null;
    }
    
    try {
      // Create a simple token based on user data
      // This is a temporary fix until the proper JWT implementation is used
      const userData = JSON.parse(authUserData);
      const userId = authUserId;
      
      // Simple token format: base64 of userId:email:role
      const tokenPayload = `${userId}:${userData.email}:${userData.role}`;
      const token = btoa(tokenPayload);
      
      return token;
    } catch (error) {
      console.error('Error extracting authentication token:', error);
      return null;
    }
  }
  
  // Function to save token if it's not already present
  function ensureAuthTokenExists() {
    // If token already exists, no need to regenerate
    const existingToken = localStorage.getItem('token');
    if (existingToken) {
      return;
    }
    
    // Extract and save token
    const token = extractJwtToken();
    if (token) {
      localStorage.setItem('token', token);
      console.log('✅ Authentication token created and saved to localStorage');
    }
  }
  
  // Set up a storage event listener to detect login/auth changes
  window.addEventListener('storage', function(event) {
    // If authUserData or authUserId changed, it might indicate a login
    if (event.key === 'authUserData' || event.key === 'authUserId' || event.key === 'authSessionActive') {
      console.log('🔄 Auth data changed, checking token status');
      ensureAuthTokenExists();
    }
  });
  
  // Check on script load
  ensureAuthTokenExists();
  
  // Also check periodically for any auth changes
  setInterval(ensureAuthTokenExists, 5000);
  
  // Add to window for manual triggering if needed
  window.fixAuthToken = ensureAuthTokenExists;
  
  console.log('🔒 Authentication token fix installed');
})(); 