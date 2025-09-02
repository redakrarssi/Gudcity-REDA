// Fixed API client with proper JWT handling and reliable connection
import axios from 'axios';

// Create API instance with proper configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create the API instance with default settings
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000, // 20 seconds timeout
});

// Function to get token from localStorage
function getAuthToken() {
  try {
    const token = localStorage.getItem('auth_token');
    return token || null;
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    return null;
  }
}

// Add request interceptor to add auth token to all requests
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 Unauthorized and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }
        
        // Call token refresh endpoint
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });
        
        if (response.data.accessToken) {
          // Save new tokens
          localStorage.setItem('auth_token', response.data.accessToken);
          localStorage.setItem('refresh_token', response.data.refreshToken);
          
          // Update header and retry request
          originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
        // If refresh fails, redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        // Redirect to login only if in browser environment
        if (typeof window !== 'undefined') {
          window.location.href = '/login?session=expired';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Test API connection and retry if needed
async function testConnection() {
  try {
    const response = await api.get('/health');
    console.log('API connection successful:', response.data);
    return true;
  } catch (error) {
    console.error('API connection failed:', error.message);
    // Try fallback to server.js if port 3000 fails
    try {
      const fallbackResponse = await axios.get(`http://localhost:5173/health`);
      console.log('Fallback API connection successful:', fallbackResponse.data);
      return true;
    } catch (fallbackError) {
      console.error('All API connections failed. Please ensure API server is running.');
      return false;
    }
  }
}

// Initialize connection test
testConnection();

export default api;
