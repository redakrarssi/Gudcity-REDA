import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  FileText, 
  Filter, 
  Search, 
  Eye, 
  Check, 
  X, 
  Building, 
  CreditCard, 
  User as UserIcon, 
  FileText as FileIcon, 
  Settings
} from 'lucide-react';
import { 
  Approval, 
  ApprovalType, 
  ApprovalStatus, 
  getAllApprovals, 
  getApprovalsByType, 
  updateApprovalStatus 
} from '../../services/approvalService';
import { ensureBusinessTablesExist } from '../../services/businessService';

const AdminApprovals = () => {
  const { t } = useTranslation();
  
  // State variables
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ApprovalType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ApprovalStatus>('all');
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  
  // Fetch approvals from the database
  useEffect(() => {
    const fetchApprovals = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // First ensure business tables exist
        await ensureBusinessTablesExist();
        
        // Fetch approvals
        const fetchedApprovals = await getAllApprovals();
        setApprovals(fetchedApprovals);
      } catch (err) {
        console.error('Error fetching approvals:', err);
        setError('Failed to load approval data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchApprovals();
  }, []);
  
  // Filter approvals based on search term and filters
  const filteredApprovals = approvals.filter(approval => {
    const matchesSearch = 
      approval.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesType = typeFilter === 'all' || approval.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || approval.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });
  
  // Handle approval status updates
  const handleApprove = async (approval: Approval) => {
    try {
      const success = await updateApprovalStatus(
        approval.id, 
        approval.type, 
        'approved', 
        decisionNote || undefined
      );
      
      if (success) {
        // Update local state
        setApprovals(approvals.map(a => 
          a.id === approval.id && a.type === approval.type
            ? { ...a, status: 'approved' }
            : a
        ));
        
        // Close modal if open
        setIsDetailModalOpen(false);
        setDecisionNote('');
      }
    } catch (err) {
      console.error(`Error approving ${approval.type} with id ${approval.id}:`, err);
    }
  };
  
  const handleReject = async (approval: Approval) => {
    try {
      const success = await updateApprovalStatus(
        approval.id, 
        approval.type, 
        'rejected', 
        decisionNote || 'Rejected by admin'
      );
      
      if (success) {
        // Update local state
        setApprovals(approvals.map(a => 
          a.id === approval.id && a.type === approval.type
            ? { ...a, status: 'rejected' }
            : a
        ));
        
        // Close modal if open
        setIsDetailModalOpen(false);
        setDecisionNote('');
      }
    } catch (err) {
      console.error(`Error rejecting ${approval.type} with id ${approval.id}:`, err);
    }
  };
  
  // Get icon based on approval type
  const getApprovalTypeIcon = (type: ApprovalType) => {
    switch (type) {
      case 'business':
        return <Building className="h-4 w-4" />;
      case 'program':
        return <Settings className="h-4 w-4" />;
      case 'user':
        return <UserIcon className="h-4 w-4" />;
      case 'payout':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <FileIcon className="h-4 w-4" />;
    }
  };
  
  // Detail modal component
  const ApprovalDetailModal = () => {
    if (!selectedApproval) return null;
    
    return (
      <div className={`fixed inset-0 z-50 overflow-y-auto ${isDetailModalOpen ? 'block' : 'hidden'}`}>
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity" aria-hidden="true">
            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
          </div>
          
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
            <div className="flex justify-between items-center bg-gray-50 px-6 py-4 border-b">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                {getApprovalTypeIcon(selectedApproval.type)}
                <span className="ml-2">
                  {selectedApproval.name} - {t(selectedApproval.type.charAt(0).toUpperCase() + selectedApproval.type.slice(1))} {t('Application')}
                </span>
              </h3>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="bg-white rounded-full p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            <div className="bg-white p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">{t('Basic Information')}</h4>
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Name')}:</span> {selectedApproval.name}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Type')}:</span> {selectedApproval.type}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Status')}:</span> {selectedApproval.status}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Submitted')}:</span> {new Date(selectedApproval.submittedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500">{t('Contact Information')}</h4>
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Submitted By')}:</span> {selectedApproval.submittedBy}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Email')}:</span> {selectedApproval.email}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Show additional details based on approval type */}
              {selectedApproval.type === 'business' && selectedApproval.details && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-500">{t('Business Details')}</h4>
                  <div className="mt-3 space-y-3">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Address')}:</span> {selectedApproval.details.address}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Phone')}:</span> {selectedApproval.details.phone}
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{t('Description')}:</span> {selectedApproval.details.description}
                    </p>
                  </div>
                </div>
              )}
              
              {selectedApproval.status === 'pending' && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-500">{t('Decision')}</h4>
                  <div className="mt-2 flex flex-col space-y-3">
                    <textarea 
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      placeholder={t('Add notes for your decision (optional)')}
                      rows={3}
                      value={decisionNote}
                      onChange={(e) => setDecisionNote(e.target.value)}
                    />
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => handleReject(selectedApproval)}
                        className="px-4 py-2 border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 rounded-md text-sm font-medium"
                      >
                        {t('Reject')}
                      </button>
                      <button
                        onClick={() => handleApprove(selectedApproval)}
                        className="px-4 py-2 border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 rounded-md text-sm font-medium"
                      >
                        {t('Approve')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
              <FileText className="w-6 h-6 text-blue-500 mr-2" />
              {t('Approval Management')}
            </h1>
            <p className="text-gray-500 mt-1">
              {t('Manage approval requests across the platform')}
            </p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={t('Search approvals')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | ApprovalType)}
              >
                <option value="all">{t('All Types')}</option>
                <option value="business">{t('Business')}</option>
                <option value="program">{t('Program')}</option>
                <option value="user">{t('User')}</option>
                <option value="payout">{t('Payout')}</option>
              </select>
              
              <select
                className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | ApprovalStatus)}
              >
                <option value="all">{t('All Status')}</option>
                <option value="pending">{t('Pending')}</option>
                <option value="approved">{t('Approved')}</option>
                <option value="rejected">{t('Rejected')}</option>
              </select>
              
              <button className="p-2 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50">
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading approvals...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('Error Loading Approvals')}</h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('Try Again')}
              </button>
            </div>
          ) : filteredApprovals.length === 0 ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('No Approvals Found')}</h3>
              <p className="text-gray-500">
                {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                  ? t('Try adjusting your filters or search term')
                  : t('There are no pending approvals at this time')}
              </p>
              {(searchTerm || typeFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setTypeFilter('all');
                    setStatusFilter('all');
                  }}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('Clear Filters')}
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Request')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Type')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Submitted By')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Date')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Status')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredApprovals.map((approval) => (
                    <tr key={`${approval.type}-${approval.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{approval.name}</div>
                        <div className="text-xs text-gray-500">{approval.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex items-center text-xs leading-5 font-medium rounded-full bg-gray-100 text-gray-800">
                          {getApprovalTypeIcon(approval.type)}
                          <span className="ml-1">{approval.type}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {approval.submittedBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(approval.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {approval.status === 'pending' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Clock className="w-3 h-3 mr-1" />
                            {t('Pending')}
                          </span>
                        )}
                        {approval.status === 'approved' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {t('Approved')}
                          </span>
                        )}
                        {approval.status === 'rejected' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3 mr-1" />
                            {t('Rejected')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end items-center space-x-2">
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            title={t('View Details')}
                            onClick={() => {
                              setSelectedApproval(approval);
                              setIsDetailModalOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {approval.status === 'pending' && (
                            <>
                              <button
                                className="text-green-600 hover:text-green-900"
                                title={t('Approve')}
                                onClick={() => handleApprove(approval)}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                className="text-red-600 hover:text-red-900"
                                title={t('Reject')}
                                onClick={() => {
                                  setSelectedApproval(approval);
                                  setIsDetailModalOpen(true);
                                }}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Approval Detail Modal */}
      <ApprovalDetailModal />
    </AdminLayout>
  );
};

export default AdminApprovals; 