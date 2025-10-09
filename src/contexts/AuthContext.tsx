import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User as DbUser, 
  UserRole, 
  UserType,
  createUser as createDbUser,
} from '../services/userService';
import { recordBusinessLogin } from '../services/businessService';
import { UserQrCodeService } from '../services/userQrCodeService';
import { LoyaltyProgramService } from '../services/loyaltyProgramService';
import { LoyaltyCardService } from '../services/loyaltyCardService';
// SECURITY FIX: Use API client in production, fallback to direct DB in development
import ApiClient from '../services/apiClient';
// CRITICAL FIX: Import generateTokens function for JWT token generation
import { generateTokens } from '../services/authService';

// Development mode detection
const IS_DEV = import.meta.env.DEV || import.meta.env.MODE === 'development';

/**
 * Permission interface for role-based access control
 */
interface Permission {
  id: string;
  name: string;
}

/**
 * Role-based permissions mapping
 */
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'businesses.view', 'businesses.create', 'businesses.edit', 'businesses.delete', 'businesses.approve',
    'pages.view', 'pages.create', 'pages.edit', 'pages.delete',
    'pricing.view', 'pricing.create', 'pricing.edit', 'pricing.delete',
    'settings.view', 'settings.edit',
    'analytics.view', 'analytics.export',
    'system.logs', 'system.backup',
    'content.view', 'content.create', 'content.edit', 'content.delete'
  ],
  customer: [
    'profile.view', 'profile.edit',
    'cards.view', 'cards.use',
    'promotions.view', 'promotions.redeem'
  ],
  business: [
    'business.profile.view', 'business.profile.edit',
    'business.programs.view', 'business.programs.create', 'business.programs.edit',
    'business.customers.view',
    'business.promotions.view', 'business.promotions.create', 'business.promotions.edit',
    'business.analytics.view',
    'business.staff.manage', 'business.staff.create', 'business.staff.delete',
    'business.settings.access'
  ],
  owner: [
    'business.profile.view', 'business.profile.edit',
    'business.programs.view', 'business.programs.create', 'business.programs.edit', 'business.programs.delete',
    'business.customers.view',
    'business.promotions.view', 'business.promotions.create', 'business.promotions.edit', 'business.promotions.delete',
    'business.analytics.view',
    'business.staff.manage', 'business.staff.create', 'business.staff.delete',
    'business.settings.access'
  ],
  staff: [
    'business.profile.view',
    'business.programs.view', 'business.programs.create', 'business.programs.edit',
    'business.customers.view',
    'business.promotions.view', 'business.promotions.create', 'business.promotions.edit',
    'business.analytics.view'
  ]
};

/**
 * User interface for application state
 */
interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  user_type?: UserType;
  business_name?: string;
  business_phone?: string;
  status?: 'active' | 'banned' | 'restricted';
  permissions?: any; // Staff permissions from userService
  business_owner_id?: number; // For staff users
}

/**
 * Authentication error types
 */
export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_BANNED = 'USER_BANNED',
  USER_RESTRICTED = 'USER_RESTRICTED',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Authentication error interface
 */
export interface AuthError {
  type: AuthErrorType;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Authentication result interface
 */
export interface AuthResult {
  success: boolean;
  user?: User;
  error?: AuthError;
}

/**
 * Registration data interface
 */
export interface RegisterData {
  name: string;
  email: string;
  password: string;
  userType: UserType;
  businessName?: string;
  businessPhone?: string;
}

/**
 * Registration result interface
 */
export interface RegisterResult {
  success: boolean;
  user?: User;
  error?: AuthError;
}

/**
 * Auth Context interface
 */
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: AuthError | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (data: RegisterData) => Promise<RegisterResult>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  clearError: () => void;
}

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider Props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Convert database user to application user
 * @param dbUser Database user object
 * @returns Normalized User object
 */
function convertDbUserToUser(dbUser: DbUser): User {
  console.log('Converting DB user to app user:', dbUser);
  
  // Handle possible null values
  if (!dbUser.id) {
    console.error('Database user has no ID:', dbUser);
  }
  
  return {
    id: dbUser.id as number,
    name: dbUser.name || 'Unknown User',
    email: dbUser.email || 'unknown@example.com',
    role: (dbUser.role as UserRole) || 'customer',
    avatar_url: dbUser.avatar_url || undefined,
    user_type: (dbUser.user_type as UserType) || 'customer',
    business_name: dbUser.business_name || undefined,
    business_phone: dbUser.business_phone || undefined,
    status: dbUser.status as 'active' | 'banned' | 'restricted' || 'active',
    permissions: dbUser.permissions,
    business_owner_id: dbUser.business_owner_id
  };
}

/**
 * Auth Provider Component
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [initialized, setInitialized] = useState<boolean>(false);
  const navigate = useNavigate();

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Initializing authentication...');
        
        // CRITICAL FIX: Set a timeout to ensure the app doesn't get stuck loading
        // INCREASED TIMEOUT: Changed from 3-5s to 30-45s to prevent premature logout
        const isProduction = window.location.hostname === 'gudcity-reda.vercel.app';
        const timeout = isProduction ? 30000 : 45000; // 30s in prod, 45s in dev
        
        // Create a promise that resolves after the timeout
        const timeoutPromise = new Promise<void>(resolve => {
          setTimeout(() => {
            console.warn(`Authentication initialization timed out after ${timeout}ms`);
            
            // Check if we have a stored user ID and token - if yes, trust the cached session
            const storedUserId = localStorage.getItem('authUserId');
            const storedToken = localStorage.getItem('token');
            
            if (storedUserId && storedToken) {
              console.log('✅ Using cached user session due to timeout - session is valid');
              // Try to use cached user data if available
              const cachedUserData = localStorage.getItem('authUserData');
              if (cachedUserData) {
                try {
                  const userData = JSON.parse(cachedUserData);
                  setUser(userData);
                  console.log('✅ User session restored from cache:', userData.name);
                } catch (e) {
                  console.error('Failed to parse cached user data:', e);
                }
              }
            } else {
              console.log('No valid cached session found after timeout');
            }
            
            setIsLoading(false);
            setInitialized(true);
            resolve();
          }, timeout);
        });
        
        // Create the actual auth initialization promise
        const authInitPromise = (async () => {
          try {
            // SECURITY FIX: Database initialization removed from client-side
            // Tables are initialized via backend API: POST /api/db/initialize
            
            // Check if token exists in localStorage (required for auth)
            const storedToken = localStorage.getItem('token');
            const storedUserId = localStorage.getItem('authUserId');
            
            if (!storedToken || !storedUserId) {
              console.log('No stored token or user ID found - user not authenticated');
              // Clear any stale data
              localStorage.removeItem('authUserId');
              localStorage.removeItem('authUserData');
              localStorage.removeItem('authSessionActive');
              localStorage.removeItem('authLastLogin');
              setIsLoading(false);
              setInitialized(true);
              return;
            }
            
            // SECURITY: Validate the token is still valid by calling API endpoint
            // This prevents localStorage manipulation attacks and ensures production security
            console.log('Validating stored authentication token...');
            
            try {
              // Use API endpoint instead of direct database access
              const dbUser = await ApiClient.getUserById(parseInt(storedUserId));
              
              if (!dbUser) {
                console.warn('Stored user ID not found in database - clearing auth data');
                localStorage.removeItem('authUserId');
                localStorage.removeItem('authUserData');
                localStorage.removeItem('token');
                localStorage.removeItem('authSessionActive');
                localStorage.removeItem('authLastLogin');
                setIsLoading(false);
                setInitialized(true);
                return;
              }
              
              // Validate user status
              if (!dbUser || !dbUser.id) {
                console.warn('User account is not valid - clearing auth data');
                localStorage.removeItem('authUserId');
                localStorage.removeItem('authUserData');
                localStorage.removeItem('token');
                localStorage.removeItem('authSessionActive');
                localStorage.removeItem('authLastLogin');
                setIsLoading(false);
                setInitialized(true);
                return;
              }
              
              // Check if user is banned or suspended
              if (dbUser.status === 'banned' || dbUser.status === 'suspended') {
                console.warn('User account is banned/suspended - clearing auth data');
                localStorage.removeItem('authUserId');
                localStorage.removeItem('authUserData');
                localStorage.removeItem('token');
                localStorage.removeItem('authSessionActive');
                localStorage.removeItem('authLastLogin');
                setIsLoading(false);
                setInitialized(true);
                return;
              }
              
              // Convert DB user to app user
              const appUser = convertDbUserToUser(dbUser);
              
              // Store user data in localStorage for quick access on page refresh
              localStorage.setItem('authUserData', JSON.stringify(appUser));
              localStorage.setItem('authLastLogin', new Date().toISOString());
              
              // If business user, record login
              if (appUser.role === 'business') {
                try {
                  await recordBusinessLogin(Number(appUser.id));
                } catch (loginError) {
                  console.error('Error recording business login:', loginError);
                  // Non-critical error, continue
                }
              }
              
              // Set user in state
              console.log('User authenticated successfully:', appUser.name);
              setUser(appUser);
              setIsLoading(false);
              setInitialized(true);
              
            } catch (apiError: any) {
              console.error('API validation failed:', apiError);
              
              // Check if it's a network error or temporary issue
              const errorMessage = apiError?.message || '';
              const isNetworkError = errorMessage.includes('network') || 
                                    errorMessage.includes('timeout') || 
                                    errorMessage.includes('fetch') ||
                                    apiError?.code === 'ECONNABORTED';
              
              // If it's a network error and we have cached data, use it
              if (isNetworkError && storedUserId && storedToken) {
                console.warn('⚠️ Network error during auth validation - using cached session');
                const cachedUserData = localStorage.getItem('authUserData');
                if (cachedUserData) {
                  try {
                    const userData = JSON.parse(cachedUserData);
                    setUser(userData);
                    console.log('✅ Session restored from cache due to network error');
                    setIsLoading(false);
                    setInitialized(true);
                    return;
                  } catch (e) {
                    console.error('Failed to parse cached user data:', e);
                  }
                }
              }
              
              // Only clear auth data for authentication failures (401, 403, banned)
              const isAuthError = errorMessage.includes('401') || 
                                 errorMessage.includes('403') || 
                                 errorMessage.includes('banned') || 
                                 errorMessage.includes('suspended');
              
              if (isAuthError) {
              console.warn('Authentication validation failed - clearing all auth data');
              localStorage.removeItem('authUserId');
              localStorage.removeItem('authUserData');
              localStorage.removeItem('token');
              localStorage.removeItem('authSessionActive');
              localStorage.removeItem('authLastLogin');
              } else {
                console.warn('⚠️ Temporary error during auth validation - keeping session');
              }
              
              setIsLoading(false);
              setInitialized(true);
            }
          } catch (error: any) {
            console.error('Auth initialization error:', error);
            
            // Check if we have cached session data
            const storedUserId = localStorage.getItem('authUserId');
            const storedToken = localStorage.getItem('token');
            const cachedUserData = localStorage.getItem('authUserData');
            
            // If we have cached data, try to use it instead of immediately logging out
            if (storedUserId && storedToken && cachedUserData) {
              console.warn('⚠️ Error during auth initialization - attempting to use cached session');
              try {
                const userData = JSON.parse(cachedUserData);
                setUser(userData);
                console.log('✅ Session restored from cache after initialization error');
                setIsLoading(false);
                setInitialized(true);
                return;
              } catch (parseError) {
                console.error('Failed to parse cached user data:', parseError);
              }
            }
            
            // Only clear auth data if we have no valid cached session
            console.warn('Authentication failed with no valid cache - clearing all auth data');
            localStorage.removeItem('authUserId');
            localStorage.removeItem('authUserData');
            localStorage.removeItem('token');
            localStorage.removeItem('authSessionActive');
            localStorage.removeItem('authLastLogin');
            
            setIsLoading(false);
            setInitialized(true);
          }
        })();
        
        // Wait for either timeout or auth init to complete
        await Promise.race([timeoutPromise, authInitPromise]);
      } catch (error) {
        console.error('Fatal auth initialization error:', error);
        setIsLoading(false);
        setInitialized(true);
      }
    };
    
    checkAuth();
  }, []);

  // Removed forced redirect on '/cards' during initialization to prevent logout on refresh

  /**
   * Login function
   * @param email User email
   * @param password User password
   * @returns Authentication result
   */
  const login = async (email: string, password: string): Promise<AuthResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Normalize email to avoid case sensitivity issues
      const normalizedEmail = email.trim().toLowerCase();
      console.log(`Attempting login for: ${normalizedEmail}`);
      
      let dbUser: any;
      let token: string | undefined;
      
      // Use secure backend API for all environments
      try {
        const authResponse = await ApiClient.login({
          email: normalizedEmail,
          password
        });
        
        if (authResponse && authResponse.user) {
          dbUser = authResponse.user;
          token = authResponse.token;
        }
      } catch (apiError) {
        console.error('API login failed:', apiError);
        throw new Error('Login failed: ' + (apiError as Error).message);
      }
      
      if (dbUser && dbUser.id) {
        // Store token
        if (token) {
          localStorage.setItem('token', token);
        }
        
        // Check if the user is banned
        if (dbUser.status === 'banned') {
          console.error('Login attempt by banned user:', normalizedEmail);
          const authError: AuthError = {
            type: AuthErrorType.USER_BANNED,
            message: 'Your account has been banned. Please contact support.'
          };
          setError(authError);
          setIsLoading(false);
          return { success: false, error: authError };
        }
        
        // Check if the user is restricted
        if (dbUser.status === 'restricted') {
          console.warn('Login by restricted user:', normalizedEmail);
          // Allow login but with limited permissions
        }
        
        // Convert DB user to app user
        const appUser = convertDbUserToUser(dbUser);
        
        // Store user in state
        setUser(appUser);
        
        // Log successful login
        try {
          const { default: SecurityAuditService } = await import('../services/securityAuditService');
          await SecurityAuditService.logSuccessfulLogin(
            appUser.id.toString(),
            normalizedEmail,
            undefined, // IP will be handled server-side
            navigator.userAgent
          );
        } catch (error) {
          console.error('Error logging successful login:', error);
          // Don't fail login if logging fails
        }
        
        // Generate JWT token
        try {
          // Create a user object that matches what generateTokens expects
          const userForToken = {
            id: appUser.id,
            email: appUser.email,
            role: appUser.role
          };
          
          const { accessToken } = await generateTokens(userForToken);
          
          // Store token in localStorage with the key expected by API calls
          localStorage.setItem('token', accessToken);
          console.log('JWT token saved to localStorage');
        } catch (tokenError) {
          console.error('Failed to generate JWT token:', tokenError);
          // Continue with login even if token generation fails
        }
        
        // Store user ID and data in localStorage
        localStorage.setItem('authUserId', String(dbUser.id));
        localStorage.setItem('authUserData', JSON.stringify(appUser));
        localStorage.setItem('authLastLogin', new Date().toISOString());
        localStorage.setItem('authSessionActive', 'true');
        
        // Record business login if applicable
        if (dbUser.user_type === 'business' && dbUser.business_id) {
          try {
            await recordBusinessLogin(Number(dbUser.business_id));
          } catch (error) {
            console.error('Failed to record business login:', error);
            // Non-critical error, continue with login
          }
        }
        
        console.log('Login successful for:', normalizedEmail);
        setIsLoading(false);
        return { success: true, user: appUser };
      } else {
        console.error('Login failed for:', normalizedEmail);
        const authError: AuthError = {
          type: AuthErrorType.INVALID_CREDENTIALS,
          message: 'Invalid email or password'
        };
        setError(authError);
        setIsLoading(false);
        return { success: false, error: authError };
      }
    } catch (error) {
      console.error('Login error:', error);
      let authError: AuthError;
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('connection')) {
          authError = {
            type: AuthErrorType.NETWORK_ERROR,
            message: 'Network error. Please check your connection and try again.'
          };
        } else if (error.message.includes('server')) {
          authError = {
            type: AuthErrorType.SERVER_ERROR,
            message: 'Server error. Please try again later.'
          };
        } else {
          authError = {
            type: AuthErrorType.UNKNOWN_ERROR,
            message: 'An error occurred during login. Please try again.',
            details: { originalError: error.message }
          };
        }
      } else {
        authError = {
          type: AuthErrorType.UNKNOWN_ERROR,
          message: 'An unknown error occurred during login. Please try again.'
        };
      }
      
      setError(authError);
      setIsLoading(false);
      return { success: false, error: authError };
    }
  };

  /**
   * Register function
   * @param data Registration data
   * @returns Registration result
   */
  const register = async (data: RegisterData): Promise<RegisterResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Normalize email to avoid case sensitivity issues
      const normalizedEmail = data.email.trim().toLowerCase();
      
      let dbUser: any;
      let token: string | undefined;
      
      // Try API first (production), fall back to direct DB (development)
      try {
        if (!IS_DEV) {
          // PRODUCTION: Use secure backend API
          const authResponse = await ApiClient.register({
            name: data.name,
            email: normalizedEmail,
            password: data.password,
            user_type: data.userType,
            role: data.userType === 'admin' ? 'admin' : data.userType === 'business' ? 'business' : 'customer',
          });
          
          if (authResponse && authResponse.user) {
            dbUser = authResponse.user;
            token = authResponse.token;
          }
        } else {
          throw new Error('Development mode - using direct database access');
        }
      } catch (apiError) {
        // DEVELOPMENT FALLBACK: Use direct database access
        console.warn('API not available, using direct database access (development only):', apiError);
        
        // Check if user already exists
        // Use API endpoint for production security
        const existingUser = await ApiClient.getUserByEmail(normalizedEmail);
        if (existingUser) {
          const authError: AuthError = {
            type: AuthErrorType.INVALID_CREDENTIALS,
            message: 'Email is already registered'
          };
          setError(authError);
          setIsLoading(false);
          return { success: false, error: authError };
        }
        
        // Create user in database
        dbUser = await createDbUser({
          name: data.name,
          email: normalizedEmail,
          password: data.password,
          user_type: data.userType,
          role: data.userType === 'admin' ? 'admin' : data.userType === 'business' ? 'business' : 'customer',
          business_name: data.businessName,
          business_phone: data.businessPhone,
          status: 'active'
        });
        
        // In development, generate a simple token
        if (dbUser) {
          token = `dev_token_${dbUser.id}_${Date.now()}`;
        }
      }
      
      if (!dbUser) {
        throw new Error('Registration failed');
      }
      
      // Store token
      if (token) {
        localStorage.setItem('token', token);
      }
      
      if (dbUser && dbUser.id) {
        // Convert DB user to app user
        const appUser = convertDbUserToUser(dbUser);
        
        // Store user in state
        setUser(appUser);
        
        // Store user ID in localStorage
        localStorage.setItem('authUserId', String(dbUser.id));
        
        // Create initial QR code for customer
        if (data.userType === 'customer') {
          try {
            // Check if the service has the method before calling it
            if (UserQrCodeService && typeof UserQrCodeService.createInitialQrCodeForCustomer === 'function') {
              await UserQrCodeService.createInitialQrCodeForCustomer(dbUser.id);
            } else {
              console.warn('createInitialQrCodeForCustomer method not available');
            }
          } catch (error) {
            console.error('Failed to create initial QR code:', error);
            // Non-critical error, continue with registration
          }
        }
        
        // Create default loyalty program for business
        if (data.userType === 'business') {
          try {
            // Check if the service has the method before calling it
            if (LoyaltyProgramService && typeof LoyaltyProgramService.createDefaultProgram === 'function') {
              const programId = await LoyaltyProgramService.createDefaultProgram(dbUser.id);
              if (programId && LoyaltyCardService && typeof LoyaltyCardService.createDefaultCardTemplate === 'function') {
                await LoyaltyCardService.createDefaultCardTemplate(dbUser.id, programId);
              }
            } else {
              console.warn('createDefaultProgram method not available');
            }
          } catch (error) {
            console.error('Failed to create default loyalty program:', error);
            // Non-critical error, continue with registration
          }
        }
        
        console.log('Registration successful for:', normalizedEmail);
        setIsLoading(false);
        return { success: true, user: appUser };
      } else {
        console.error('Registration failed for:', normalizedEmail);
        const authError: AuthError = {
          type: AuthErrorType.SERVER_ERROR,
          message: 'Failed to create user account'
        };
        setError(authError);
        setIsLoading(false);
        return { success: false, error: authError };
      }
    } catch (error) {
      console.error('Registration error:', error);
      let authError: AuthError;
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('connection')) {
          authError = {
            type: AuthErrorType.NETWORK_ERROR,
            message: 'Network error. Please check your connection and try again.'
          };
        } else if (error.message.includes('server')) {
          authError = {
            type: AuthErrorType.SERVER_ERROR,
            message: 'Server error. Please try again later.'
          };
        } else {
          authError = {
            type: AuthErrorType.UNKNOWN_ERROR,
            message: 'An error occurred during registration. Please try again.',
            details: { originalError: error.message }
          };
        }
      } else {
        authError = {
          type: AuthErrorType.UNKNOWN_ERROR,
          message: 'An unknown error occurred during registration. Please try again.'
        };
      }
      
      setError(authError);
      setIsLoading(false);
      return { success: false, error: authError };
    }
  };

  /**
   * Logout function
   */
  const logout = () => {
    // Clear user from state
    setUser(null);
    
    // Clear localStorage
    localStorage.removeItem('authUserId');
    localStorage.removeItem('authUserData');
    localStorage.removeItem('authSessionActive');
    localStorage.setItem('authLoggedOut', new Date().toISOString());
    
    // Redirect to login page
    navigate('/login');
  };

  /**
   * Check if user has a specific permission
   * @param permission Permission to check
   * @returns Whether the user has the permission
   */
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    const userRole = user.role;
    const permissions = ROLE_PERMISSIONS[userRole] || [];
    
    return permissions.includes(permission);
  };
  
  /**
   * Refresh user data from database
   */
  const refreshUser = async () => {
    if (!user?.id) {
      console.warn('Cannot refresh user: no user ID available');
      return;
    }

    try {
      console.log('Refreshing user data for ID:', user.id);
      const dbUser = await ApiClient.getUserById(user.id as number);
      if (dbUser && dbUser.id) {
        const updatedUser = convertDbUserToUser(dbUser);
        setUser(updatedUser);
        
        // Update localStorage cache
        localStorage.setItem('authUserData', JSON.stringify(updatedUser));
        console.log('User data refreshed successfully');
      } else {
        console.warn('Failed to refresh user data: user not found or invalid');
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  /**
   * Clear authentication error
   */
  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: isLoading,
        isAuthenticated: !!user,
        error,
        login: login || (async () => ({ success: false, error: { type: AuthErrorType.SERVER_ERROR, message: 'Auth not initialized' } })),
        register: register || (async () => ({ success: false, error: { type: AuthErrorType.SERVER_ERROR, message: 'Auth not initialized' } })),
        logout: logout || (() => {}),
        refreshUser: refreshUser || (async () => {}),
        hasPermission: hasPermission || (() => false),
        clearError: clearError || (() => {})
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use the auth context
 * @returns Auth context
 * @throws Error if used outside of AuthProvider
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Protected route component props
 */
interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
  blockRestricted?: boolean;
}

/**
 * Protected route component
 * Redirects to login if user is not authenticated or doesn't have required permission
 * Also checks user status and redirects to appropriate suspension page
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPermission,
  blockRestricted = false
}) => {
  const { isAuthenticated, hasPermission, loading, user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    } else if (!loading && isAuthenticated && user) {
      // Check user status first - this takes priority over permissions
      if (user.status === 'banned') {
        console.log(`🚫 ACCESS DENIED: Banned user ${user.email} attempted to access protected route`);
        navigate('/banned');
        return;
      }
      
      // Restricted users can be optionally blocked
      if (user.status === 'restricted') {
        if (blockRestricted) {
          console.warn(`⚠️ RESTRICTED ACCESS BLOCKED: User ${user.email} redirected from protected route`);
          navigate('/restricted');
          return;
        }
        console.warn(`⚠️ RESTRICTED ACCESS: User ${user.email} accessing protected route with restrictions`);
      }
      
      // Check permissions after status validation
      if (requiredPermission && !hasPermission(requiredPermission)) {
        navigate('/unauthorized');
      }
    }
  }, [isAuthenticated, hasPermission, loading, navigate, requiredPermission, user, blockRestricted]);
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return null;
  }
  
  // Block banned users completely
  if (user?.status === 'banned') {
    return null;
  }
  
  // Block restricted users if requested
  if (blockRestricted && user?.status === 'restricted') {
    return null;
  }
  
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return null;
  }
  
  return <>{children}</>;
};

/**
 * Admin protected route component props
 */
interface AdminProtectedRouteProps {
  children: ReactNode;
}

/**
 * Admin protected route component
 * Redirects to login if user is not authenticated or is not an admin
 */
export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ 
  children
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    } else if (!loading && isAuthenticated && (!user || user.role !== 'admin')) {
      navigate('/unauthorized');
    }
  }, [user, isAuthenticated, loading, navigate]);
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (!isAuthenticated || !user || user.role !== 'admin') {
    return null;
  }
  
  return <>{children}</>;
};

export default AuthContext; 