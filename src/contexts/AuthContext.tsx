import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User as DbUser, 
  UserRole, 
  UserType,
  validateUser,
  createUser as createDbUser,
  getUserById
} from '../services/userService';

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
  return {
    id: dbUser.id as number,
    name: dbUser.name,
    email: dbUser.email,
    role: (dbUser.role as UserRole) || 'customer',
    avatar_url: dbUser.avatar_url,
    user_type: (dbUser.user_type as UserType) || 'customer',
    business_name: dbUser.business_name,
    business_phone: dbUser.business_phone
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
      const storedUserId = localStorage.getItem('authUserId');
      if (storedUserId) {
        try {
          const userId = parseInt(storedUserId, 10);
          const dbUser = await getUserById(userId);
          if (dbUser) {
            setUser(convertDbUserToUser(dbUser));
          } else {
            localStorage.removeItem('authUserId');
          }
        } catch (error) {
          console.error('Error checking auth:', error);
          localStorage.removeItem('authUserId');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const dbUser = await validateUser(email, password);
      
      if (dbUser && dbUser.id) {
        const appUser = convertDbUserToUser(dbUser);
        setUser(appUser);
        localStorage.setItem('authUserId', String(dbUser.id));
        setIsLoading(false);
        return true;
      }
      
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoading(false);
      return false;
    }
  };

  // Register function
  const register = async (data: RegisterData): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Convert RegisterData to database User format
      const newUser: Omit<DbUser, 'id' | 'created_at'> = {
        name: data.name,
        email: data.email,
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
        // Log the user in automatically
        const appUser = convertDbUserToUser(createdUser);
        setUser(appUser);
        localStorage.setItem('authUserId', String(createdUser.id));
        setIsLoading(false);
        return true;
      }
      
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

export default AuthContext; 