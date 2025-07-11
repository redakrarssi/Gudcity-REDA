import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User as DbUser, 
  UserRole, 
  UserType,
  validateUser,
  createUser as createDbUser,
  getUserById,
  ensureDemoUsers,
  ensureUserTableExists,
  getUserByEmail
} from '../services/userService';
import { recordBusinessLogin } from '../services/businessService';
import { UserQrCodeService } from '../services/userQrCodeService';
import { LoyaltyProgramService } from '../services/loyaltyProgramService';
import { LoyaltyCardService } from '../services/loyaltyCardService';
import sql from '../utils/db';
import { generateTokens } from '../services/authService';

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
    status: dbUser.status as 'active' | 'banned' | 'restricted' || 'active'
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
        const isProduction = window.location.hostname === 'gudcity-reda.vercel.app';
        const timeout = isProduction ? 3000 : 5000; // 3s in prod, 5s in dev
        
        // Create a promise that resolves after the timeout
        const timeoutPromise = new Promise<void>(resolve => {
          setTimeout(() => {
            console.warn(`Authentication initialization timed out after ${timeout}ms`);
            
            // Check if we have a stored user ID before giving up
            const storedUserId = localStorage.getItem('authUserId');
            if (storedUserId) {
              console.log('Using cached user data due to timeout');
              // Try to use cached user data if available
              const cachedUserData = localStorage.getItem('authUserData');
              if (cachedUserData) {
                try {
                  const userData = JSON.parse(cachedUserData);
                  setUser(userData);
                } catch (e) {
                  console.error('Failed to parse cached user data:', e);
                }
              }
            }
            
            setIsLoading(false);
            setInitialized(true);
            resolve();
          }, timeout);
        });
        
        // Create the actual auth initialization promise
        const authInitPromise = (async () => {
          try {
            // Ensure database tables exist
            await ensureUserTableExists();
            
            // Create demo users if needed in development mode
            if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
              await ensureDemoUsers();
            }
            
            // Check if user ID is stored in localStorage
            const storedUserId = localStorage.getItem('authUserId');
            if (!storedUserId) {
              console.log('No stored user ID found');
              setIsLoading(false);
              setInitialized(true);
              return;
            }
            
            // Get user by ID
            console.log('Fetching user data for ID:', storedUserId);
            const dbUser = await getUserById(parseInt(storedUserId));
            if (!dbUser) {
              console.warn('Stored user ID not found in database:', storedUserId);
              localStorage.removeItem('authUserId');
              localStorage.removeItem('authUserData');
              setIsLoading(false);
              setInitialized(true);
              return;
            }
            
            // Validate user status
            if (!validateUser(dbUser)) {
              console.warn('User account is not valid:', dbUser);
              localStorage.removeItem('authUserId');
              localStorage.removeItem('authUserData');
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
          } catch (error) {
            console.error('Auth initialization error:', error);
            
            // Try to use cached user data if available
            const storedUserId = localStorage.getItem('authUserId');
            const cachedUserData = localStorage.getItem('authUserData');
            
            if (storedUserId && cachedUserData) {
              try {
                console.log('Using cached user data due to error');
                const userData = JSON.parse(cachedUserData);
                setUser(userData);
              } catch (e) {
                console.error('Failed to parse cached user data:', e);
              }
            }
            
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

  // Use fallback default values if initialization fails
  if (!initialized && window.location.pathname === '/cards') {
    // When directly accessing /cards, provide a fallback empty context until initialization completes
    setInitialized(true);
    setIsLoading(false);
    // Redirect to login after a short delay
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  }

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
      
      const dbUser = await validateUser(normalizedEmail, password);
      
      if (dbUser && dbUser.id) {
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
      
      // Check if user already exists
      const existingUser = await getUserByEmail(normalizedEmail);
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
      const dbUser = await createDbUser({
        name: data.name,
        email: normalizedEmail,
        password: data.password,
        user_type: data.userType,
        role: data.userType === 'admin' ? 'admin' : data.userType === 'business' ? 'business' : 'customer',
        business_name: data.businessName,
        business_phone: data.businessPhone,
        status: 'active'
      });
      
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
}

/**
 * Protected route component
 * Redirects to login if user is not authenticated or doesn't have required permission
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPermission 
}) => {
  const { isAuthenticated, hasPermission, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    } else if (!loading && isAuthenticated && requiredPermission && !hasPermission(requiredPermission)) {
      navigate('/unauthorized');
    }
  }, [isAuthenticated, hasPermission, loading, navigate, requiredPermission]);
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (!isAuthenticated) {
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