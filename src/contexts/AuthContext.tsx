import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

// Define user roles and permissions
export type UserRole = 'admin' | 'editor' | 'viewer' | 'customer' | 'business';
export type UserType = 'customer' | 'business';

interface Permission {
  id: string;
  name: string;
}

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
  editor: [
    'users.view',
    'businesses.view',
    'pages.view', 'pages.create', 'pages.edit',
    'pricing.view', 'pricing.edit',
    'content.view', 'content.create', 'content.edit',
    'analytics.view'
  ],
  viewer: [
    'users.view',
    'businesses.view',
    'pages.view',
    'pricing.view',
    'content.view',
    'analytics.view'
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
  avatarUrl?: string;
  userType?: UserType;
  businessName?: string;
  businessPhone?: string;
}

// Mock user data
const MOCK_USERS: User[] = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@gudcity.com',
    role: 'admin',
    avatarUrl: ''
  },
  {
    id: 2,
    name: 'Editor User',
    email: 'editor@gudcity.com',
    role: 'editor',
    avatarUrl: ''
  },
  {
    id: 3,
    name: 'Viewer User',
    email: 'viewer@gudcity.com',
    role: 'viewer',
    avatarUrl: ''
  },
  {
    id: 4,
    name: 'Customer User',
    email: 'customer@example.com',
    role: 'customer',
    userType: 'customer',
    avatarUrl: ''
  },
  {
    id: 5,
    name: 'Business User',
    email: 'business@example.com',
    role: 'business',
    userType: 'business',
    businessName: 'Example Business',
    businessPhone: '+1 555-123-4567',
    avatarUrl: ''
  }
];

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

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>(MOCK_USERS);
  const navigate = useNavigate();

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const checkAuth = () => {
      const storedUser = localStorage.getItem('authUser');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    // In a real app, you would make an API call here
    // For now, we'll use mock data
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const matchedUser = registeredUsers.find(u => u.email === email);
      
      if (matchedUser && password === 'password') { // Simple password check
        setUser(matchedUser);
        localStorage.setItem('authUser', JSON.stringify(matchedUser));
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
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if email already exists
      if (registeredUsers.some(u => u.email === data.email)) {
        setIsLoading(false);
        return false;
      }
      
      // Create new user
      const newUser: User = {
        id: registeredUsers.length + 1,
        name: data.name,
        email: data.email,
        role: data.userType, // Set role based on user type
        userType: data.userType,
        avatarUrl: '',
        ...(data.userType === 'business' && {
          businessName: data.businessName,
          businessPhone: data.businessPhone
        })
      };
      
      // Add user to registered users
      const updatedUsers = [...registeredUsers, newUser];
      setRegisteredUsers(updatedUsers);
      
      // Auto login after registration
      setUser(newUser);
      localStorage.setItem('authUser', JSON.stringify(newUser));
      
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      setIsLoading(false);
      return false;
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('authUser');
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

// Protected Route component to restrict access based on permissions
interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredPermission 
}) => {
  const { isAuthenticated, hasPermission, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    } else if (!loading && requiredPermission && !hasPermission(requiredPermission)) {
      navigate('/unauthorized');
    }
  }, [isAuthenticated, hasPermission, loading, navigate, requiredPermission]);

  if (loading) {
    return <div>Loading...</div>;
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