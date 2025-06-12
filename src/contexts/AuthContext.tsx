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

// Define Permission interface
interface Permission {
  id: string;
  name: string;
}

// Define role-based permissions
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

// Define User interface
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

// Registration data interface
export interface RegisterData {
  name: string;
  email: string;
  password: string;
  userType: UserType;
  businessName?: string;
  businessPhone?: string;
}

// Define Auth Context interface
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// Convert database user to application user
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

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Initializing authentication...');
        
        // CRITICAL FIX: Set a timeout to ensure the app doesn't get stuck loading
        const isProduction = window.location.hostname === 'gudcity-reda.vercel.app';
        const timeout = isProduction ? 2000 : 10000; // 2s in prod, 10s otherwise
        
        // Create a promise that resolves after the timeout
        const timeoutPromise = new Promise<void>(resolve => {
          setTimeout(() => {
            console.warn(`Authentication initialization timed out after ${timeout}ms`);
            resolve();
          }, timeout);
        });
        
        // Create the actual auth initialization promise
        const initAuthPromise = (async () => {
          try {
            // First ensure the database is set up properly
            await ensureUserTableExists();
            
            // Then ensure demo users exist
            await ensureDemoUsers();
            console.log('Database initialization complete');
            
            const storedUserId = localStorage.getItem('authUserId');
            if (storedUserId) {
              try {
                const userId = parseInt(storedUserId, 10);
                const dbUser = await getUserById(userId);
                if (dbUser) {
                  setUser(convertDbUserToUser(dbUser));
                  console.log('User authenticated from stored ID:', userId);
                } else {
                  localStorage.removeItem('authUserId');
                  console.log('Stored user ID not found in database:', userId);
                }
              } catch (error) {
                console.error('Error checking auth:', error);
                localStorage.removeItem('authUserId');
              }
            } else {
              console.log('No stored user ID found');
            }
          } catch (error) {
            console.error('Error during authentication initialization:', error);
          }
        })();
        
        // Race between the timeout and actual initialization
        await Promise.race([initAuthPromise, timeoutPromise]);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Normalize email to avoid case sensitivity issues
      const normalizedEmail = email.trim().toLowerCase();
      console.log(`Attempting login for: ${normalizedEmail}`);
      
      const dbUser = await validateUser(normalizedEmail, password);
      
      if (dbUser && dbUser.id) {
        // Check if the user is banned
        if (dbUser.status === 'banned') {
          console.error('Login attempt by banned user:', normalizedEmail);
          setIsLoading(false);
          return false;
        }
        
        const appUser = convertDbUserToUser(dbUser);
        setUser(appUser);
        localStorage.setItem('authUserId', String(dbUser.id));
        
        // If this is a business user, record the login for analytics
        if (dbUser.user_type === 'business' && dbUser.id) {
          try {
            // Get the user's IP address and device info (in a real app)
            const ipAddress = '127.0.0.1'; // Mock IP for demo
            const device = navigator.userAgent;
            
            // Record the login
            await recordBusinessLogin(dbUser.id, dbUser.id, ipAddress, device);
          } catch (loginTrackingError) {
            console.error('Error recording business login:', loginTrackingError);
            // Don't fail the login if tracking fails
          }
        }
        
        setIsLoading(false);
        return true;
      }
      
      console.log('Login failed: Invalid credentials');
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Login failed with exception:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      setIsLoading(false);
      return false;
    }
  };

  // Register function
  const register = async (data: RegisterData): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // First check if the email already exists
      const existingUser = await getUserByEmail(data.email);
      if (existingUser) {
        console.error('Registration failed: Email already exists', data.email);
        setIsLoading(false);
        return false;
      }
      
      // Convert RegisterData to database User format
      const newUser: Omit<DbUser, 'id' | 'created_at'> = {
        name: data.name,
        email: data.email.trim(), // Ensure email is trimmed
        password: data.password,
        // Set default role based on user type
        role: data.userType === 'business' ? 'business' : 'customer',
        user_type: data.userType,
        business_name: data.businessName,
        business_phone: data.businessPhone
      };
      
      // Create the user in the database
      const createdUser = await createDbUser(newUser);
      
      if (createdUser && createdUser.id) {
        try {
          // Generate a QR code for the customer if it's a customer account
          if (createdUser.user_type === 'customer') {
            console.log('Generating QR code for new customer');
            await UserQrCodeService.generateCustomerQrCode(createdUser);
            
            // Automatically enroll the customer in available loyalty programs
            try {
              console.log('Enrolling new customer in available loyalty programs');
              
              // Find businesses with active loyalty programs
              const businesses = await sql`
                SELECT DISTINCT u.id, u.name, u.business_name 
                FROM users u
                JOIN loyalty_programs lp ON u.id::text = lp.business_id
                WHERE u.user_type = 'business'
                AND u.status = 'active'
                AND lp.status = 'ACTIVE'
                LIMIT 5 -- Limit to 5 businesses for initial enrollment
              `;
              
              // For each business, find their default program and create a loyalty card
              if (businesses && businesses.length > 0) {
                for (const business of businesses) {
                  try {
                    // Get default program for this business
                    const defaultProgram = await LoyaltyProgramService.getDefaultBusinessProgram(business.id);
                    
                    if (defaultProgram) {
                      // Enroll customer in program
                      await LoyaltyProgramService.enrollCustomer(
                        createdUser.id.toString(), 
                        defaultProgram.id
                      );
                      
                      // Create loyalty card
                      await LoyaltyCardService.enrollCustomerInProgram(
                        createdUser.id.toString(),
                        business.id,
                        defaultProgram.id
                      );
                      
                      console.log(`Enrolled customer in program: ${defaultProgram.name}`);
                    }
                  } catch (enrollError) {
                    console.error('Error enrolling in business program:', enrollError);
                    // Don't fail registration if enrollment fails
                  }
                }
              }
            } catch (enrollError) {
              console.error('Error during automatic loyalty program enrollment:', enrollError);
              // Don't fail registration if enrollment fails
            }
          }
        } catch (qrError) {
          console.error('Error generating QR code during registration:', qrError);
          // Don't fail registration if QR code generation fails
        }

        // Log the user in automatically
        const appUser = convertDbUserToUser(createdUser);
        setUser(appUser);
        localStorage.setItem('authUserId', String(createdUser.id));
        setIsLoading(false);
        return true;
      }
      
      console.error('Registration failed: User creation returned null');
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Registration failed with exception:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      setIsLoading(false);
      return false;
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('authUserId');
    navigate('/login');
  };

  // Check if user has a specific permission
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    
    const userPermissions = ROLE_PERMISSIONS[user.role];
    return userPermissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading: isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use Auth Context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Props interface for ProtectedRoute component
interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
}

// Protected Route Component
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPermission 
}) => {
  const { isAuthenticated, loading, hasPermission } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { state: { from: location } });
    } else if (!loading && requiredPermission && !hasPermission(requiredPermission)) {
      navigate('/unauthorized');
    }
  }, [loading, isAuthenticated, requiredPermission, hasPermission, navigate]);
  
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

// Props interface for AdminProtectedRoute component
interface AdminProtectedRouteProps {
  children: ReactNode;
}

// Admin Protected Route Component - Only accessible by users with admin role
export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ 
  children
}) => {
  const { user, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/admin-access', { state: { from: location } });
    } else if (!loading && isAuthenticated && user?.role !== 'admin') {
      navigate('/unauthorized');
    }
  }, [loading, isAuthenticated, user, navigate]);
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  if (!isAuthenticated || user?.role !== 'admin') {
    return null;
  }
  
  return <>{children}</>;
};

export default AuthContext; 