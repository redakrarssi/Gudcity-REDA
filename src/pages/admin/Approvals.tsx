import React from 'react';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { CheckCircle, Clock, XCircle, FileText, Filter, Search, Eye, Check, X } from 'lucide-react';

const AdminApprovals = () => {
  const { t } = useTranslation();
  
  // Placeholder data for approvals
  const approvals = [
    {
      id: 1,
      type: 'business',
      name: 'Coffee Haven',
      submittedBy: 'Michael Brown',
      email: 'michael@coffeehaven.com',
      submittedAt: '2023-09-15T08:30:00Z',
      status: 'pending'
    },
    {
      id: 2,
      type: 'program',
      name: 'Summer Loyalty Program',
      submittedBy: 'Sarah Johnson',
      email: 'sarah@fitnesszone.com',
      submittedAt: '2023-09-14T14:45:00Z',
      status: 'pending'
    },
    {
      id: 3,
      type: 'user',
      name: 'David Wilson',
      submittedBy: 'System',
      email: 'david@example.com',
      submittedAt: '2023-09-12T10:15:00Z',
      status: 'approved'
    },
    {
      id: 4,
      type: 'payout',
      name: 'Monthly Payout Request',
      submittedBy: 'Emily Davis',
      email: 'emily@greengrocers.com',
      submittedAt: '2023-09-16T09:20:00Z',
      status: 'rejected'
    }
  ];

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
              />
            </div>
            <div className="flex gap-2">
              <select
                className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">{t('All Types')}</option>
                <option value="business">{t('Business')}</option>
                <option value="program">{t('Program')}</option>
                <option value="user">{t('User')}</option>
                <option value="payout">{t('Payout')}</option>
              </select>
              
              <select
                className="block pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
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
                {approvals.map((approval) => (
                  <tr key={approval.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{approval.name}</div>
                      <div className="text-xs text-gray-500">{approval.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-gray-100 text-gray-800">
                        {approval.type}
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
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {approval.status === 'pending' && (
                          <>
                            <button
                              className="text-green-600 hover:text-green-900"
                              title={t('Approve')}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              className="text-red-600 hover:text-red-900"
                              title={t('Reject')}
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
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminApprovals; 