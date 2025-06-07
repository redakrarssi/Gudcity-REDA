import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ArrowUp, 
  ArrowDown, 
  Award, 
  Search, 
  Calendar, 
  Filter, 
  Download,
  Gift 
} from 'lucide-react';
import { Transaction } from '../../types/loyalty';
import { TransactionService } from '../../services/transactionService';
import { useAuth } from '../../contexts/AuthContext';

interface TransactionHistoryProps {
  customerId?: string;
  programId?: string;
  limit?: number;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  customerId,
  programId,
  limit = 10
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'EARN' | 'REDEEM'>('ALL');
  const [dateRange, setDateRange] = useState<'ALL' | 'WEEK' | 'MONTH' | 'YEAR'>('ALL');

  const userId = customerId || user?.id?.toString();

  useEffect(() => {
    if (userId) {
      fetchTransactions();
    }
  }, [userId, programId, filterType, dateRange]);

  const fetchTransactions = async () => {
    if (!userId) {
      setError('User ID is required');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const result = await TransactionService.getTransactionHistory(
        userId,
        programId
      );
      
      if (result.transactions) {
        // Apply filters
        let filteredTransactions = result.transactions;
        
        // Filter by type
        if (filterType !== 'ALL') {
          filteredTransactions = filteredTransactions.filter(tx => tx.type === filterType);
        }
        
        // Filter by date range
        if (dateRange !== 'ALL') {
          const now = new Date();
          let startDate = new Date();
          
          switch (dateRange) {
            case 'WEEK':
              startDate.setDate(now.getDate() - 7);
              break;
            case 'MONTH':
              startDate.setMonth(now.getMonth() - 1);
              break;
            case 'YEAR':
              startDate.setFullYear(now.getFullYear() - 1);
              break;
          }
          
          filteredTransactions = filteredTransactions.filter(tx => 
            new Date(tx.createdAt) >= startDate
          );
        }
        
        setTransactions(filteredTransactions);
      }
    } catch (err) {
      setError('Failed to load transaction history');
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter transactions by search term
  const filteredTransactions = transactions.filter(tx => {
    if (!searchTerm) return true;
    
    // Convert search term and transaction data to lowercase for case-insensitive search
    const term = searchTerm.toLowerCase();
    
    // Search in transaction fields
    return (
      tx.id.toLowerCase().includes(term) ||
      tx.businessId.toLowerCase().includes(term) ||
      tx.programId.toLowerCase().includes(term) ||
      tx.type.toLowerCase().includes(term) ||
      tx.points.toString().includes(term)
    );
  });

  // Export transactions to CSV
  const exportToCSV = () => {
    if (transactions.length === 0) return;
    
    const headers = ['Date', 'Type', 'Points', 'Program', 'Business'];
    const csvRows = [
      headers.join(','),
      ...transactions.map(tx => [
        new Date(tx.createdAt).toLocaleDateString(),
        tx.type,
        tx.points,
        tx.programId,
        tx.businessId
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'transaction_history.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-500" />
            {t('Transaction History')}
          </h2>
          
          <div className="flex space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder={t('Search transactions...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 py-2 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <button
              onClick={exportToCSV}
              disabled={transactions.length === 0}
              className="py-2 px-3 bg-blue-50 text-blue-600 rounded-md text-sm flex items-center hover:bg-blue-100 transition-colors"
            >
              <Download className="w-4 h-4 mr-1" />
              {t('Export')}
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'ALL' | 'EARN' | 'REDEEM')}
            className="py-1.5 px-3 border border-gray-300 bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL">{t('All Types')}</option>
            <option value="EARN">{t('Points Earned')}</option>
            <option value="REDEEM">{t('Points Redeemed')}</option>
          </select>
          
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as 'ALL' | 'WEEK' | 'MONTH' | 'YEAR')}
            className="py-1.5 px-3 border border-gray-300 bg-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="ALL">{t('All Time')}</option>
            <option value="WEEK">{t('Last Week')}</option>
            <option value="MONTH">{t('Last Month')}</option>
            <option value="YEAR">{t('Last Year')}</option>
          </select>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="p-6 text-center">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => fetchTransactions()}
            className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
          >
            {t('Try Again')}
          </button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 text-blue-500 mb-4">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">{t('No Transactions Yet')}</h3>
          <p className="text-gray-500">{t('Your transaction history will appear here once you start earning or redeeming points.')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Date')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Type')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Points')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('Details')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(transaction.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {transaction.type === 'EARN' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <ArrowUp className="w-3 h-3 mr-1" />
                        {t('Earned')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <ArrowDown className="w-3 h-3 mr-1" />
                        {t('Redeemed')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`font-medium ${transaction.type === 'EARN' ? 'text-green-600' : 'text-blue-600'}`}>
                      {transaction.type === 'EARN' ? '+' : '-'}{transaction.points}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {transaction.type === 'EARN' ? (
                      <div className="flex items-center">
                        <Award className="w-4 h-4 mr-1 text-green-500" />
                        <span>{t('Program')}: {transaction.programId}</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Gift className="w-4 h-4 mr-1 text-blue-500" />
                        <span>
                          {transaction.rewardId 
                            ? `${t('Reward')}: ${transaction.rewardId}` 
                            : t('Points redeemed')}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory; 