import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { 
  Users as UsersIcon, 
  Search, 
  Filter, 
  UserPlus, 
  MoreHorizontal, 
  Edit, 
  Trash, 
  Lock, 
  Mail, 
  CheckCircle, 
  XCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Shield,
  Calendar,
  X,
  CreditCard,
  Activity,
  Eye,
  Bell,
  FileText,
  BarChart2,
  User,
  Plus,
  Send
} from 'lucide-react';
// Add import for CreateUserModal
import CreateUserModal, { UserData } from '../../components/admin/CreateUserModal';

interface Transaction {
  id: number;
  date: string;
  amount: number;
  points: number;
  description: string;
  businessId?: number;
  businessName?: string;
}

interface LoyaltyProgram {
  id: number;
  businessId: number;
  businessName: string;
  pointsEarned: number;
  pointsRedeemed: number;
  currentPoints: number;
  memberSince: string;
  membershipTier?: string;
  lastActivity?: string;
}

interface UserActivity {
  loginCount: number;
  lastActivities: Array<{
    id: number;
    action: string;
    date: string;
    details?: string;
  }>;
  engagementScore: number;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'business' | 'admin';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  lastLogin: string;
  joinDate: string;
  phone?: string;
  address?: string;
  profileImage?: string;
  permissions?: string[];
  totalSpent?: number;
  totalPoints?: number;
  loyaltyPrograms?: LoyaltyProgram[];
  recentTransactions?: Transaction[];
  activity?: UserActivity;
  notes?: string;
}

// Mock user data
const MOCK_USERS: User[] = [
  { 
    id: 1, 
    name: 'John Smith', 
    email: 'john.smith@example.com', 
    phone: '+1 555-123-4567',
    role: 'customer' as const, 
    status: 'active' as const, 
    lastLogin: '2023-09-15T10:30:00Z', 
    joinDate: '2023-02-10T14:30:00Z',
    totalSpent: 1245.67,
    totalPoints: 6228,
    loyaltyPrograms: [
      { id: 1, businessId: 3, businessName: 'Coffee Haven', pointsEarned: 3450, pointsRedeemed: 1000, currentPoints: 2450, memberSince: '2023-03-01T10:00:00Z', membershipTier: 'Gold', lastActivity: '2023-09-14T08:30:00Z' },
      { id: 2, businessId: 5, businessName: 'Tech Store', pointsEarned: 4778, pointsRedeemed: 1000, currentPoints: 3778, memberSince: '2023-04-15T14:00:00Z', membershipTier: 'Silver', lastActivity: '2023-09-10T16:45:00Z' }
    ],
    recentTransactions: [
      { id: 101, date: '2023-09-14T08:30:00Z', amount: 24.50, points: 245, description: 'Coffee and pastries', businessId: 3, businessName: 'Coffee Haven' },
      { id: 102, date: '2023-09-10T16:45:00Z', amount: 499.99, points: 2500, description: 'Wireless headphones', businessId: 5, businessName: 'Tech Store' }
    ],
    activity: {
      loginCount: 47,
      lastActivities: [
        { id: 1, action: 'Login', date: '2023-09-15T10:30:00Z' },
        { id: 2, action: 'Redeemed points', date: '2023-09-14T08:35:00Z', details: '1000 points at Coffee Haven' },
        { id: 3, action: 'Made purchase', date: '2023-09-14T08:30:00Z', details: '$24.50 at Coffee Haven' }
      ],
      engagementScore: 82
    }
  },
  { 
    id: 2, 
    name: 'Sarah Johnson', 
    email: 'sarah.j@example.com', 
    phone: '+1 555-987-6543',
    role: 'customer' as const, 
    status: 'active' as const, 
    lastLogin: '2023-09-16T08:45:00Z', 
    joinDate: '2023-03-21T09:15:00Z',
    totalSpent: 3567.42,
    totalPoints: 17837,
    loyaltyPrograms: [
      { id: 3, businessId: 3, businessName: 'Coffee Haven', pointsEarned: 1200, pointsRedeemed: 500, currentPoints: 700, memberSince: '2023-03-25T10:00:00Z', membershipTier: 'Silver', lastActivity: '2023-09-12T11:20:00Z' },
      { id: 4, businessId: 9, businessName: 'BookWorld', pointsEarned: 5460, pointsRedeemed: 2000, currentPoints: 3460, memberSince: '2023-04-02T15:30:00Z', membershipTier: 'Platinum', lastActivity: '2023-09-15T14:10:00Z' },
      { id: 5, businessId: 5, businessName: 'Tech Store', pointsEarned: 14177, pointsRedeemed: 500, currentPoints: 13677, memberSince: '2023-03-22T09:45:00Z', membershipTier: 'Gold', lastActivity: '2023-09-16T08:20:00Z' }
    ],
    activity: {
      loginCount: 86,
      lastActivities: [
        { id: 4, action: 'Login', date: '2023-09-16T08:45:00Z' },
        { id: 5, action: 'Updated profile', date: '2023-09-16T08:50:00Z' },
        { id: 6, action: 'Made purchase', date: '2023-09-15T14:10:00Z', details: '$58.75 at BookWorld' }
      ],
      engagementScore: 94
    }
  },
  { 
    id: 3, 
    name: 'Michael Brown', 
    email: 'michael.brown@example.com', 
    phone: '+1 555-456-7890',
    role: 'business' as const, 
    status: 'active' as const, 
    lastLogin: '2023-09-14T15:20:00Z', 
    joinDate: '2022-11-05T11:30:00Z',
    address: '789 Business Ave, Commerce City, CA 90210',
    notes: 'Premium business account, verified on 2022-11-10'
  },
  { 
    id: 4, 
    name: 'Emily Davis', 
    email: 'emily.davis@example.com', 
    phone: '+1 555-234-5678',
    role: 'customer' as const, 
    status: 'inactive' as const, 
    lastLogin: '2023-08-30T09:10:00Z', 
    joinDate: '2023-01-15T16:45:00Z',
    totalSpent: 347.25,
    totalPoints: 1736,
    notes: 'Account inactive due to multiple failed login attempts. Customer contacted support on 2023-09-01.'
  },
  { 
    id: 5, 
    name: 'Alex Wong', 
    email: 'alex.wong@example.com', 
    phone: '+1 555-876-5432',
    role: 'business' as const, 
    status: 'active' as const, 
    lastLogin: '2023-09-16T11:30:00Z', 
    joinDate: '2022-12-08T10:20:00Z',
    address: '123 Tech Lane, San Francisco, CA 94107',
    notes: 'Tech Store owner. Frequent promotions, good customer feedback.'
  },
  { 
    id: 6, 
    name: 'Jessica Miller', 
    email: 'jessica.m@example.com', 
    role: 'customer' as const, 
    status: 'active' as const, 
    lastLogin: '2023-09-15T14:25:00Z', 
    joinDate: '2023-04-02T13:10:00Z',
    totalSpent: 892.50,
    totalPoints: 4463
  },
  { 
    id: 7, 
    name: 'David Wilson', 
    email: 'david.w@example.com', 
    role: 'admin' as const, 
    status: 'active' as const, 
    lastLogin: '2023-09-16T09:40:00Z', 
    joinDate: '2022-10-18T08:30:00Z',
    permissions: ['users.manage', 'businesses.manage', 'settings.manage', 'reports.view']
  },
  { 
    id: 8, 
    name: 'Lisa Taylor', 
    email: 'lisa.t@example.com', 
    role: 'customer' as const, 
    status: 'suspended' as const, 
    lastLogin: '2023-07-22T16:15:00Z', 
    joinDate: '2023-02-28T15:00:00Z',
    notes: 'Account suspended due to violation of terms of service on 2023-07-23. Review scheduled for 2023-10-01.'
  },
  { 
    id: 9, 
    name: 'Robert Martinez', 
    email: 'robert.m@example.com', 
    role: 'business' as const, 
    status: 'active' as const, 
    lastLogin: '2023-09-14T10:05:00Z', 
    joinDate: '2023-01-10T12:40:00Z',
    address: '456 Reader Road, Boston, MA 02108',
    notes: 'BookWorld business owner. Multiple locations.'
  },
  { 
    id: 10, 
    name: 'Amanda Lee', 
    email: 'amanda.lee@example.com', 
    role: 'customer' as const, 
    status: 'active' as const, 
    lastLogin: '2023-09-15T08:50:00Z', 
    joinDate: '2023-03-15T09:25:00Z',
    totalSpent: 675.30,
    totalPoints: 3377
  },
  {
    id: 11,
    name: 'Carlos Rodriguez',
    email: 'carlos.r@example.com',
    role: 'customer' as const,
    status: 'pending' as const,
    lastLogin: '2023-09-16T14:20:00Z',
    joinDate: '2023-09-16T14:15:00Z',
    notes: 'Account pending email verification.'
  }
];

const AdminUsers = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [filteredUsers, setFilteredUsers] = useState<User[]>(MOCK_USERS);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended' | 'pending'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'customer' | 'business' | 'admin'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [sortField, setSortField] = useState<keyof User>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserDetailModalOpen, setIsUserDetailModalOpen] = useState(false);
  const [isUserCreationModalOpen, setIsUserCreationModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  // Add new state for create user modal
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  
  const usersPerPage = 8;
  
  // Format date from ISO string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };
  
  // Format time from ISO string
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
  };
  
  // Calculate time since last login
  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
      }
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else {
      return formatDate(dateString);
    }
  };
  
  // Handle search and filtering
  React.useEffect(() => {
    let result = [...users];
    
    // Apply search
    if (searchTerm) {
      result = result.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(user => user.status === statusFilter);
    }
    
    // Apply role filter
    if (roleFilter !== 'all') {
      result = result.filter(user => user.role === roleFilter);
    }
    
    // Apply date range filter
    if (dateRangeStart) {
      const startDate = new Date(dateRangeStart);
      result = result.filter(user => new Date(user.joinDate) >= startDate);
    }
    
    if (dateRangeEnd) {
      const endDate = new Date(dateRangeEnd);
      endDate.setHours(23, 59, 59, 999); // End of the day
      result = result.filter(user => new Date(user.joinDate) <= endDate);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else if (aValue !== undefined && bValue !== undefined) {
        return sortDirection === 'asc'
          ? (aValue > bValue ? 1 : -1)
          : (bValue > aValue ? 1 : -1);
      }
      return 0;
    });
    
    setFilteredUsers(result);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, roleFilter, dateRangeStart, dateRangeEnd, users, sortField, sortDirection]);
  
  // Open user details modal
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsUserDetailModalOpen(true);
  };
  
  // Close user details modal
  const handleCloseUserDetailModal = () => {
    setIsUserDetailModalOpen(false);
    setSelectedUser(null);
  };
  
  // Open user creation modal
  const handleOpenUserCreationModal = () => {
    setIsUserCreationModalOpen(true);
  };
  
  // Close user creation modal
  const handleCloseUserCreationModal = () => {
    setIsUserCreationModalOpen(false);
  };
  
  // Save new user
  const handleSaveNewUser = (user: Partial<User>) => {
    const newUser = user as User;
    setUsers(prevUsers => [...prevUsers, newUser]);
    setIsUserCreationModalOpen(false);
  };
  
  // Open analytics modal
  const handleOpenAnalyticsModal = () => {
    setIsAnalyticsModalOpen(true);
  };
  
  // Close analytics modal
  const handleCloseAnalyticsModal = () => {
    setIsAnalyticsModalOpen(false);
  };
  
  // Handle bulk actions
  const handleBulkAction = (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedUsers.length === 0) return;
    
    switch (action) {
      case 'activate':
        setUsers(prevUsers =>
          prevUsers.map(user =>
            selectedUsers.includes(user.id)
              ? { ...user, status: 'active' }
              : user
          )
        );
        break;
      case 'deactivate':
        setUsers(prevUsers =>
          prevUsers.map(user =>
            selectedUsers.includes(user.id)
              ? { ...user, status: 'inactive' }
              : user
          )
        );
        break;
      case 'delete':
        setUsers(prevUsers =>
          prevUsers.filter(user => !selectedUsers.includes(user.id))
        );
        break;
    }
    
    setSelectedUsers([]);
  };
  
  // Handle sort
  const handleSort = (field: keyof User) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Get current users for pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  
  // Handle checkbox selection
  const toggleSelectUser = (userId: number) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  const toggleSelectAll = () => {
    if (selectedUsers.length === currentUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(currentUsers.map(user => user.id));
    }
  };
  
  // Role badge component
  const RoleBadge = ({ role }: { role: User['role'] }) => {
    let bgColor, textColor, icon;
    
    switch (role) {
      case 'admin':
        bgColor = 'bg-purple-100';
        textColor = 'text-purple-800';
        icon = <Shield className="w-3 h-3 mr-1" />;
        break;
      case 'business':
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        icon = <UsersIcon className="w-3 h-3 mr-1" />;
        break;
      default:
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        icon = null;
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {icon}
        {t(role.charAt(0).toUpperCase() + role.slice(1))}
      </span>
    );
  };
  
  // Status badge component
  const StatusBadge = ({ status }: { status: User['status'] }) => {
    const isActive = status === 'active';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
      }`}>
        <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${isActive ? 'bg-green-600' : 'bg-gray-600'}`}></span>
        {t(status.charAt(0).toUpperCase() + status.slice(1))}
      </span>
    );
  };
  
  // User Details Modal Component
  interface UserDetailsModalProps {
    user: User | null;
    isOpen: boolean;
    onClose: () => void;
  }

  const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ user, isOpen, onClose }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'info' | 'loyalty' | 'transactions' | 'activity' | 'notes'>('info');
    const [pointAdjustment, setPointAdjustment] = useState<number>(0);
    const [adjustmentReason, setAdjustmentReason] = useState<string>('');
    const [selectedProgram, setSelectedProgram] = useState<number | null>(null);
    const [notificationMessage, setNotificationMessage] = useState<string>('');
    
    if (!isOpen || !user) return null;
    
    const handlePointAdjustment = () => {
      // In a real app, this would call an API to adjust points
      console.log(`Adjusting ${pointAdjustment} points for user ${user.id}, program ${selectedProgram}. Reason: ${adjustmentReason}`);
      // Reset form
      setPointAdjustment(0);
      setAdjustmentReason('');
    };
    
    const handleSendNotification = () => {
      // In a real app, this would call an API to send a notification
      console.log(`Sending notification to user ${user.id}: ${notificationMessage}`);
      setNotificationMessage('');
    };
    
    const handleStatusChange = (newStatus: User['status']) => {
      // In a real app, this would call an API to change the user status
      console.log(`Changing user ${user.id} status from ${user.status} to ${newStatus}`);
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xl mr-4">
                {user.profileImage ? (
                  <img src={user.profileImage} alt={user.name} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{user.name}</h2>
                <div className="flex items-center space-x-2">
                  <RoleBadge role={user.role} />
                  <StatusBadge status={user.status} />
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('info')}
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === 'info'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {t('User Information')}
              </button>
              {user.role === 'customer' && (
                <button
                  onClick={() => setActiveTab('loyalty')}
                  className={`px-4 py-3 text-sm font-medium ${
                    activeTab === 'loyalty'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {t('Loyalty Programs')}
                </button>
              )}
              {user.role === 'customer' && (
                <button
                  onClick={() => setActiveTab('transactions')}
                  className={`px-4 py-3 text-sm font-medium ${
                    activeTab === 'transactions'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {t('Transactions')}
                </button>
              )}
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === 'activity'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {t('Activity')}
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`px-4 py-3 text-sm font-medium ${
                  activeTab === 'notes'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {t('Notes')}
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{t('Personal Information')}</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">{t('Email')}</label>
                        <div className="mt-1 text-sm text-gray-900">{user.email}</div>
                      </div>
                      {user.phone && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500">{t('Phone')}</label>
                          <div className="mt-1 text-sm text-gray-900">{user.phone}</div>
                        </div>
                      )}
                      {user.address && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500">{t('Address')}</label>
                          <div className="mt-1 text-sm text-gray-900">{user.address}</div>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-500">{t('Joined')}</label>
                        <div className="mt-1 text-sm text-gray-900">{formatDate(user.joinDate)}</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">{t('Last Login')}</label>
                        <div className="mt-1 text-sm text-gray-900">{formatDate(user.lastLogin)} {formatTime(user.lastLogin)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">{t('Account Management')}</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">{t('Account Status')}</label>
                        <div className="mt-1">
                          <StatusBadge status={user.status} />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">{t('Update Status')}</label>
                        <div className="flex flex-wrap gap-2">
                          <button 
                            onClick={() => handleStatusChange('active')} 
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                              user.status === 'active' 
                                ? 'bg-green-100 text-green-800 cursor-default' 
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                            disabled={user.status === 'active'}
                          >
                            <CheckCircle className="w-3 h-3 inline mr-1" />
                            {t('Activate')}
                          </button>
                          
                          <button 
                            onClick={() => handleStatusChange('inactive')} 
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                              user.status === 'inactive' 
                                ? 'bg-gray-100 text-gray-800 cursor-default' 
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                            disabled={user.status === 'inactive'}
                          >
                            <XCircle className="w-3 h-3 inline mr-1" />
                            {t('Deactivate')}
                          </button>
                          
                          <button 
                            onClick={() => handleStatusChange('suspended')} 
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                              user.status === 'suspended' 
                                ? 'bg-red-100 text-red-800 cursor-default' 
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                            disabled={user.status === 'suspended'}
                          >
                            <Lock className="w-3 h-3 inline mr-1" />
                            {t('Suspend')}
                          </button>
                        </div>
                      </div>
                      
                      {user.role === 'admin' && user.permissions && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">{t('Permissions')}</label>
                          <div className="flex flex-wrap gap-1.5">
                            {user.permissions.map(permission => (
                              <span key={permission} className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                                {permission}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="pt-2">
                        <label className="block text-sm font-medium text-gray-500 mb-2">{t('Send Notification')}</label>
                        <textarea
                          value={notificationMessage}
                          onChange={(e) => setNotificationMessage(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          rows={3}
                          placeholder={t('Write notification message...')}
                        />
                        <button
                          onClick={handleSendNotification}
                          disabled={!notificationMessage.trim()}
                          className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="w-3 h-3 inline mr-1.5" />
                          {t('Send Notification')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'loyalty' && user.role === 'customer' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">{t('Loyalty Programs')}</h3>
                  <div className="text-sm text-gray-500">
                    {t('Total Points')}: <span className="font-semibold text-gray-900">{user.totalPoints || 0}</span>
                  </div>
                </div>
                
                {user.loyaltyPrograms && user.loyaltyPrograms.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      {user.loyaltyPrograms.map(program => (
                        <div key={program.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900">{program.businessName}</h4>
                              <div className="text-sm text-gray-500 mt-1">
                                {t('Member Since')}: {formatDate(program.memberSince)}
                              </div>
                              {program.membershipTier && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {program.membershipTier}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-gray-900">{program.currentPoints}</div>
                              <div className="text-sm text-gray-500">{t('Available Points')}</div>
                            </div>
                          </div>
                          
                          <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
                            <div>
                              <div className="font-medium text-gray-900">{program.pointsEarned}</div>
                              <div className="text-gray-500">{t('Earned')}</div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{program.pointsRedeemed}</div>
                              <div className="text-gray-500">{t('Redeemed')}</div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{program.lastActivity ? getTimeSince(program.lastActivity) : '-'}</div>
                              <div className="text-gray-500">{t('Last Activity')}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Point Adjustment Form */}
                    <div className="mt-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h4 className="font-medium text-gray-900 mb-4">{t('Manual Point Adjustment')}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('Program')}</label>
                          <select
                            value={selectedProgram || ''}
                            onChange={(e) => setSelectedProgram(e.target.value ? parseInt(e.target.value) : null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          >
                            <option value="">{t('Select program')}</option>
                            {user.loyaltyPrograms.map(program => (
                              <option key={program.id} value={program.id}>
                                {program.businessName} ({program.currentPoints} {t('pts')})
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('Points')}</label>
                          <div className="flex rounded-md shadow-sm">
                            <input
                              type="number"
                              value={pointAdjustment}
                              onChange={(e) => setPointAdjustment(parseInt(e.target.value) || 0)}
                              className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              placeholder="0"
                            />
                            <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                              {t('points')}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {t('Use negative values to deduct points')}
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">{t('Reason')}</label>
                          <input
                            type="text"
                            value={adjustmentReason}
                            onChange={(e) => setAdjustmentReason(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder={t('e.g. Customer service adjustment')}
                          />
                        </div>
                      </div>
                      
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={handlePointAdjustment}
                          disabled={!selectedProgram || pointAdjustment === 0 || !adjustmentReason.trim()}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {t('Apply Adjustment')}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {t('This user is not enrolled in any loyalty programs.')}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'transactions' && user.role === 'customer' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">{t('Transaction History')}</h3>
                
                {user.recentTransactions && user.recentTransactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Date')}
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Business')}
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Description')}
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Amount')}
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Points')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {user.recentTransactions.map(transaction => (
                          <tr key={transaction.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(transaction.date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {transaction.businessName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {transaction.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              ${transaction.amount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium text-right">
                              +{transaction.points}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {t('No transaction history available.')}
                  </div>
                )}
                
                {user.totalSpent && (
                  <div className="flex justify-end">
                    <div className="bg-gray-50 px-4 py-2 rounded-lg">
                      <span className="text-sm text-gray-500">{t('Total Spent')}:</span>
                      <span className="ml-2 text-sm font-medium text-gray-900">${user.totalSpent.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // User Creation Form Component
  interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: Partial<User>) => void;
  }

  const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onSave }) => {
    const { t } = useTranslation();
    const [newUser, setNewUser] = useState<Partial<User>>({
      name: '',
      email: '',
      role: 'customer',
      status: 'active',
      phone: '',
      permissions: []
    });
    
    const [sendWelcomeEmail, setSendWelcomeEmail] = useState(true);
    
    if (!isOpen) return null;
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setNewUser(prev => ({ ...prev, [name]: value }));
    };
    
    const handlePermissionChange = (permission: string) => {
      setNewUser(prev => {
        const currentPermissions = prev.permissions || [];
        const updatedPermissions = currentPermissions.includes(permission)
          ? currentPermissions.filter(p => p !== permission)
          : [...currentPermissions, permission];
        
        return { ...prev, permissions: updatedPermissions };
      });
    };
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave({ 
        ...newUser, 
        id: Math.floor(Math.random() * 10000), // This would be handled by the backend in a real app
        joinDate: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      });
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">{t('Create New User')}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Full Name')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={newUser.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('Enter full name')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Email Address')} <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={newUser.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('Enter email address')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Phone Number')}
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={newUser.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('Enter phone number')}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('User Role')} <span className="text-red-600">*</span>
                </label>
                <select
                  name="role"
                  value={newUser.role}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="customer">{t('Customer')}</option>
                  <option value="business">{t('Business')}</option>
                  <option value="admin">{t('Admin')}</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Initial Status')}
                </label>
                <select
                  name="status"
                  value={newUser.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">{t('Active')}</option>
                  <option value="inactive">{t('Inactive')}</option>
                  <option value="pending">{t('Pending Verification')}</option>
                </select>
              </div>
            </div>
            
            {newUser.role === 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('Admin Permissions')}
                </label>
                <div className="space-y-2 bg-gray-50 p-3 rounded-md border border-gray-200">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="perm-users"
                      checked={newUser.permissions?.includes('users.manage') || false}
                      onChange={() => handlePermissionChange('users.manage')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="perm-users" className="ml-2 block text-sm text-gray-700">
                      {t('Manage Users')}
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="perm-businesses"
                      checked={newUser.permissions?.includes('businesses.manage') || false}
                      onChange={() => handlePermissionChange('businesses.manage')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="perm-businesses" className="ml-2 block text-sm text-gray-700">
                      {t('Manage Businesses')}
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="perm-settings"
                      checked={newUser.permissions?.includes('settings.manage') || false}
                      onChange={() => handlePermissionChange('settings.manage')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="perm-settings" className="ml-2 block text-sm text-gray-700">
                      {t('Manage Platform Settings')}
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="perm-reports"
                      checked={newUser.permissions?.includes('reports.view') || false}
                      onChange={() => handlePermissionChange('reports.view')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="perm-reports" className="ml-2 block text-sm text-gray-700">
                      {t('View Reports and Analytics')}
                    </label>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex items-center mt-4">
              <input
                type="checkbox"
                id="send-welcome"
                checked={sendWelcomeEmail}
                onChange={() => setSendWelcomeEmail(!sendWelcomeEmail)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="send-welcome" className="ml-2 block text-sm text-gray-700">
                {t('Send welcome email')}
              </label>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {t('Cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <UserPlus className="w-4 h-4 inline mr-1.5" />
                {t('Create User')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // User Analytics Component
  interface UserAnalyticsProps {
    users: User[];
    isOpen: boolean;
    onClose: () => void;
  }

  const UserAnalytics: React.FC<UserAnalyticsProps> = ({ users, isOpen, onClose }) => {
    const { t } = useTranslation();
    
    if (!isOpen) return null;
    
    // Get customers only
    const customers = users.filter(user => user.role === 'customer');
    
    // Get businesses only
    const businesses = users.filter(user => user.role === 'business');
    
    // Sort customers by engagement score
    const mostActiveCustomers = [...customers]
      .filter(customer => customer.activity?.engagementScore)
      .sort((a, b) => (b.activity?.engagementScore || 0) - (a.activity?.engagementScore || 0))
      .slice(0, 5);
    
    // Calculate statistics
    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.status === 'active').length;
    const inactiveUsers = users.filter(user => user.status === 'inactive').length;
    const pendingUsers = users.filter(user => user.status === 'pending').length;
    const suspendedUsers = users.filter(user => user.status === 'suspended').length;
    
    const customerPercentage = Math.round((customers.length / totalUsers) * 100) || 0;
    const businessPercentage = Math.round((businesses.length / totalUsers) * 100) || 0;
    const adminPercentage = Math.round(((totalUsers - customers.length - businesses.length) / totalUsers) * 100) || 0;
    
    // Mock data for charts
    const mockUserGrowthData = [
      { month: 'Jan', users: 120 },
      { month: 'Feb', users: 145 },
      { month: 'Mar', users: 190 },
      { month: 'Apr', users: 250 },
      { month: 'May', users: 310 },
      { month: 'Jun', users: 390 },
      { month: 'Jul', users: 420 },
      { month: 'Aug', users: 490 },
      { month: 'Sep', users: totalUsers }
    ];
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              <BarChart2 className="w-5 h-5 inline mr-2 text-blue-600" />
              {t('User Analytics')}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Overview Stats */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('User Overview')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500">{t('Total Users')}</div>
                  <div className="mt-1 flex justify-between items-end">
                    <div className="text-2xl font-bold text-gray-900">{totalUsers}</div>
                    <div className="flex items-center text-green-600 text-xs font-medium">
                      <span>+{Math.round(totalUsers * 0.15)}</span>
                      <span className="ml-1 text-xs">({t('30d')})</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500">{t('Active Users')}</div>
                  <div className="mt-1 flex justify-between items-end">
                    <div className="text-2xl font-bold text-gray-900">{activeUsers}</div>
                    <div className="text-green-600 text-xs font-medium">
                      {Math.round((activeUsers / totalUsers) * 100)}%
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500">{t('Inactive Users')}</div>
                  <div className="mt-1 flex justify-between items-end">
                    <div className="text-2xl font-bold text-gray-900">{inactiveUsers + suspendedUsers + pendingUsers}</div>
                    <div className="text-gray-600 text-xs font-medium">
                      {Math.round(((inactiveUsers + suspendedUsers + pendingUsers) / totalUsers) * 100)}%
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                  <div className="text-sm text-gray-500">{t('New Users')}</div>
                  <div className="mt-1 flex justify-between items-end">
                    <div className="text-2xl font-bold text-gray-900">{Math.round(totalUsers * 0.15)}</div>
                    <div className="text-gray-600 text-xs font-medium">
                      {t('Last 30 days')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* User Type Distribution */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('User Type Distribution')}</h3>
              <div className="bg-white p-5 border border-gray-200 rounded-lg shadow-sm">
                <div className="flex items-center space-x-10">
                  <div className="flex-1">
                    <div className="h-8 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full" 
                        style={{ width: `${customerPercentage}%` }}
                      ></div>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <div>
                        <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                        <span className="text-sm font-medium text-gray-700">{t('Customers')}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900">{customers.length} ({customerPercentage}%)</div>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="h-8 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" 
                        style={{ width: `${businessPercentage}%` }}
                      ></div>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <div>
                        <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
                        <span className="text-sm font-medium text-gray-700">{t('Businesses')}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900">{businesses.length} ({businessPercentage}%)</div>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="h-8 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full" 
                        style={{ width: `${adminPercentage}%` }}
                      ></div>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <div>
                        <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-1"></span>
                        <span className="text-sm font-medium text-gray-700">{t('Admins')}</span>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {totalUsers - customers.length - businesses.length} ({adminPercentage}%)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Top Active Customers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('Most Active Customers')}</h3>
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('User')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Last Active')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t('Engagement')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {mostActiveCustomers.length > 0 ? (
                        mostActiveCustomers.map((customer, index) => (
                          <tr key={customer.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                                  {index + 1}
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                                  <div className="text-xs text-gray-500">{customer.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {getTimeSince(customer.lastLogin)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                {customer.activity?.engagementScore}/100
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                            {t('No activity data available')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* User Growth Chart */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('User Growth')}</h3>
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm h-[300px] flex items-center justify-center">
                  <div className="w-full h-full flex flex-col">
                    {/* Mock chart visualization */}
                    <div className="flex-1 flex items-end">
                      {mockUserGrowthData.map((item, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center">
                          <div 
                            className="w-8 bg-blue-500 rounded-t-sm mx-1" 
                            style={{ 
                              height: `${(item.users / mockUserGrowthData[mockUserGrowthData.length - 1].users) * 100}%`,
                              backgroundColor: index === mockUserGrowthData.length - 1 ? '#3b82f6' : '#93c5fd'
                            }}
                          ></div>
                        </div>
                      ))}
                    </div>
                    <div className="h-8 flex">
                      {mockUserGrowthData.map((item, index) => (
                        <div key={index} className="flex-1 text-center text-xs text-gray-500">
                          {item.month}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Status Distribution */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('User Status Distribution')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-green-100 text-green-600 mb-3">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-medium text-gray-500">{t('Active')}</div>
                    <div className="mt-1 text-xl font-semibold text-gray-900">{activeUsers}</div>
                    <div className="mt-1 text-xs text-green-600">{Math.round((activeUsers / totalUsers) * 100)}%</div>
                  </div>
                </div>
                
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 text-gray-600 mb-3">
                      <XCircle className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-medium text-gray-500">{t('Inactive')}</div>
                    <div className="mt-1 text-xl font-semibold text-gray-900">{inactiveUsers}</div>
                    <div className="mt-1 text-xs text-gray-600">{Math.round((inactiveUsers / totalUsers) * 100)}%</div>
                  </div>
                </div>
                
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-red-100 text-red-600 mb-3">
                      <Lock className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-medium text-gray-500">{t('Suspended')}</div>
                    <div className="mt-1 text-xl font-semibold text-gray-900">{suspendedUsers}</div>
                    <div className="mt-1 text-xs text-red-600">{Math.round((suspendedUsers / totalUsers) * 100)}%</div>
                  </div>
                </div>
                
                <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 text-yellow-600 mb-3">
                      <Activity className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-medium text-gray-500">{t('Pending')}</div>
                    <div className="mt-1 text-xl font-semibold text-gray-900">{pendingUsers}</div>
                    <div className="mt-1 text-xs text-yellow-600">{Math.round((pendingUsers / totalUsers) * 100)}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {t('Close')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">
              {t('User Management')}
            </h1>
            <p className="text-gray-500 mt-1">
              {t('Manage user accounts and roles')}
            </p>
          </div>
          
          {/* Update button to use the existing modal */}
          <button
            onClick={handleOpenUserCreationModal}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('Add User')}
          </button>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Filters */}
          <div className="p-4 border-b border-gray-200 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder={t('Search by name or email')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-4 flex-wrap md:flex-nowrap">
                <select 
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive' | 'suspended' | 'pending')}
                >
                  <option value="all">{t('All Status')}</option>
                  <option value="active">{t('Active')}</option>
                  <option value="inactive">{t('Inactive')}</option>
                  <option value="suspended">{t('Suspended')}</option>
                  <option value="pending">{t('Pending')}</option>
                </select>
                
                <select 
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as 'all' | 'customer' | 'business' | 'admin')}
                >
                  <option value="all">{t('All Roles')}</option>
                  <option value="customer">{t('Customers')}</option>
                  <option value="business">{t('Businesses')}</option>
                  <option value="admin">{t('Admins')}</option>
                </select>
                
                <button className="p-2 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50">
                  <Filter className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Date Range Filter */}
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="w-full sm:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Join Date Range')}
                </label>
                <div className="flex gap-2 items-center">
                  <div>
                    <label className="sr-only">{t('From')}</label>
                    <input
                      type="date"
                      value={dateRangeStart}
                      onChange={(e) => setDateRangeStart(e.target.value)}
                      className="block w-full pl-3 pr-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    />
                  </div>
                  <span className="text-gray-500">-</span>
                  <div>
                    <label className="sr-only">{t('To')}</label>
                    <input
                      type="date"
                      value={dateRangeEnd}
                      onChange={(e) => setDateRangeEnd(e.target.value)}
                      className="block w-full pl-3 pr-3 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    />
                  </div>
                  {(dateRangeStart || dateRangeEnd) && (
                    <button
                      onClick={() => {
                        setDateRangeStart('');
                        setDateRangeEnd('');
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Selected actions */}
          {selectedUsers.length > 0 && (
            <div className="bg-blue-50 p-4 flex justify-between items-center">
              <div className="text-sm text-blue-700">
                {t('Selected')} <span className="font-medium">{selectedUsers.length}</span> {t('users')}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleBulkAction('activate')}
                  className="px-3 py-1.5 bg-green-600 rounded text-sm text-white hover:bg-green-700"
                >
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  {t('Activate')}
                </button>
                <button 
                  onClick={() => handleBulkAction('deactivate')}
                  className="px-3 py-1.5 bg-gray-600 rounded text-sm text-white hover:bg-gray-700"
                >
                  <XCircle className="w-3 h-3 inline mr-1" />
                  {t('Deactivate')}
                </button>
                <button 
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1.5 bg-red-600 rounded text-sm text-white hover:bg-red-700"
                >
                  <Trash className="w-3 h-3 inline mr-1" />
                  {t('Delete')}
                </button>
                <button 
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50" 
                  onClick={() => setSelectedUsers([])}
                >
                  {t('Cancel')}
                </button>
              </div>
            </div>
          )}
          
          {/* Users table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={selectedUsers.length === currentUsers.length && currentUsers.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      {t('Name')}
                      {sortField === 'name' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center">
                      {t('Email')}
                      {sortField === 'email' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center">
                      {t('Role')}
                      {sortField === 'role' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      {t('Status')}
                      {sortField === 'status' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('lastLogin')}
                  >
                    <div className="flex items-center">
                      {t('Last Login')}
                      {sortField === 'lastLogin' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('joinDate')}
                  >
                    <div className="flex items-center">
                      {t('Join Date')}
                      {sortField === 'joinDate' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                      {t('No users found')}
                    </td>
                  </tr>
                ) : (
                  currentUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => toggleSelectUser(user.id)}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium">
                            {user.name.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            {user.role === 'admin' && (
                              <div className="text-xs text-gray-500">{t('Admin User')}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getTimeSince(user.lastLogin)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.joinDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end items-center space-x-2">
                          <button
                            onClick={() => handleViewUser(user)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-blue-600 hover:text-blue-900">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleBulkAction('delete')}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              const newStatus = user.status === 'active' ? 'inactive' : 'active';
                              setUsers(prevUsers =>
                                prevUsers.map(u =>
                                  u.id === user.id ? { ...u, status: newStatus } : u
                                )
                              );
                            }}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            {user.status === 'active' ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                          <button className="text-gray-600 hover:text-gray-900">
                            <Mail className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                {t('Showing')} <span className="font-medium">{indexOfFirstUser + 1}</span> {t('to')} <span className="font-medium">{Math.min(indexOfLastUser, filteredUsers.length)}</span> {t('of')} <span className="font-medium">{filteredUsers.length}</span> {t('users')}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`p-2 rounded ${
                    currentPage === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`p-2 rounded ${
                    currentPage === totalPages
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Modals */}
      {isUserDetailModalOpen && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          isOpen={isUserDetailModalOpen}
          onClose={handleCloseUserDetailModal}
        />
      )}
      
      <CreateUserModal
        isOpen={isUserCreationModalOpen}
        onClose={handleCloseUserCreationModal}
        onSave={handleSaveNewUser}
      />
      
      <UserAnalytics
        users={users}
        isOpen={isAnalyticsModalOpen}
        onClose={handleCloseAnalyticsModal}
      />
    </AdminLayout>
  );
};

export default AdminUsers; 