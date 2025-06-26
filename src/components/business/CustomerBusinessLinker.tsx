import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Link, Check, AlertCircle, Search, PlusCircle } from 'lucide-react';
import { CustomerService, Customer } from '../../services/customerService';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';
import { useAuth } from '../../contexts/AuthContext';

// Simple toast context implementation if not already existing
interface ToastContextValue {
  showToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

// Mock toast hook if actual one doesn't exist
const useToast = (): ToastContextValue => {
  return {
    showToast: (type, message) => {
      // Fallback to console
      console.log(`[${type}] ${message}`);
      
      // Use window.alert for errors in development
      if (type === 'error') {
        window.alert(message);
      }
    }
  };
};

interface CustomerBusinessLinkerProps {
  onSuccess?: () => void;
}

interface LoyaltyProgram {
  id: string;
  name: string;
}

export const CustomerBusinessLinker: React.FC<CustomerBusinessLinkerProps> = ({ 
  onSuccess 
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [associatedCustomers, setAssociatedCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [linkingCustomer, setLinkingCustomer] = useState(false);
  
  const businessId = user?.id.toString() || '';
  
  // Load data on component mount
  useEffect(() => {
    if (!businessId) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        // Load business's loyalty programs
        const programsData = await LoyaltyProgramService.getBusinessPrograms(businessId);
        setPrograms(programsData);
        
        if (programsData.length > 0) {
          setSelectedProgram(programsData[0].id);
        }
        
        // Load already associated customers
        const businessCustomers = await CustomerService.getBusinessCustomers(businessId);
        setAssociatedCustomers(businessCustomers);
      } catch (error) {
        console.error('Error loading data:', error);
        showToast('error', t('Failed to load customer data'));
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [businessId, t, showToast]);
  
  // Search for customers
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      // Search for customers that are NOT already associated with this business
      const allCustomers = await CustomerService.searchCustomers('', searchTerm);
      
      // Filter out customers already associated with this business
      const alreadyAssociatedIds = associatedCustomers.map(c => c.id);
      const filteredCustomers = allCustomers.filter(c => !alreadyAssociatedIds.includes(c.id));
      
      setAvailableCustomers(filteredCustomers);
    } catch (error) {
      console.error('Error searching customers:', error);
      showToast('error', t('Failed to search customers'));
    } finally {
      setLoading(false);
    }
  };
  
  // Handle customer selection
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
  };
  
  // Link customer to business
  const handleLinkCustomer = async () => {
    if (!selectedCustomer || !selectedProgram || !businessId) {
      showToast('error', t('Please select a customer and program'));
      return;
    }
    
    setLinkingCustomer(true);
    try {
      const success = await CustomerService.associateCustomerWithBusiness(
        selectedCustomer.id,
        businessId,
        selectedProgram
      );
      
      if (success) {
        showToast('success', t('Customer successfully linked to your business'));
        
        // Update the lists
        setAssociatedCustomers([...associatedCustomers, selectedCustomer]);
        setAvailableCustomers(availableCustomers.filter(c => c.id !== selectedCustomer.id));
        setSelectedCustomer(null);
        
        // Trigger a sync event to update the UI in real-time
        import('../../utils/realTimeSync').then(({ triggerSyncEvent }) => {
          triggerSyncEvent({
            table_name: 'program_enrollments',
            operation: 'INSERT',
            record_id: `${selectedCustomer.id}-${selectedProgram}`,
            customer_id: selectedCustomer.id,
            business_id: businessId,
            data: { programId: selectedProgram }
          });
        });
        
        // Call the success callback if provided
        if (onSuccess) onSuccess();
      } else {
        showToast('error', t('Failed to link customer'));
      }
    } catch (error) {
      console.error('Error linking customer:', error);
      showToast('error', t('An error occurred while linking the customer'));
    } finally {
      setLinkingCustomer(false);
    }
  };
  
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center">
        <Link className="mr-2 text-blue-500" />
        {t('Link Customers to Your Business')}
      </h2>
      
      {/* Search for customers */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('Search for customers to link')}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder={t('Search by name or email')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            onClick={handleSearch}
            disabled={loading || !searchTerm.trim()}
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Available customers */}
      {availableCustomers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-md font-medium mb-3">{t('Available Customers')}</h3>
          <div className="border border-gray-200 rounded-md max-h-60 overflow-y-auto">
            {availableCustomers.map(customer => (
              <div
                key={customer.id}
                className={`p-3 border-b border-gray-200 last:border-b-0 cursor-pointer hover:bg-blue-50 transition-colors ${
                  selectedCustomer?.id === customer.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleSelectCustomer(customer)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-gray-500">{customer.email}</p>
                  </div>
                  {selectedCustomer?.id === customer.id && (
                    <Check className="text-green-500 w-5 h-5" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Program selection */}
      {selectedCustomer && programs.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('Select program to enroll')}
          </label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
          >
            {programs.map(program => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Link button */}
      {selectedCustomer && (
        <div className="mb-6">
          <button
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center"
            onClick={handleLinkCustomer}
            disabled={linkingCustomer || !selectedProgram}
          >
            {linkingCustomer ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('Linking...')}
              </span>
            ) : (
              <span className="flex items-center">
                <PlusCircle className="mr-2 w-5 h-5" />
                {t('Link Customer to Business')}
              </span>
            )}
          </button>
        </div>
      )}
      
      {/* Already associated customers */}
      <div>
        <h3 className="text-md font-medium mb-3">{t('Already Linked Customers')}</h3>
        {associatedCustomers.length > 0 ? (
          <div className="border border-gray-200 rounded-md max-h-60 overflow-y-auto">
            {associatedCustomers.map(customer => (
              <div
                key={customer.id}
                className="p-3 border-b border-gray-200 last:border-b-0"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-gray-500">{customer.email}</p>
                  </div>
                  <Check className="text-green-500 w-5 h-5" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-6 border border-gray-200 rounded-md">
            <AlertCircle className="mx-auto mb-2 text-gray-400 w-8 h-8" />
            <p>{t('No customers linked to your business yet')}</p>
          </div>
        )}
      </div>
    </div>
  );
}; 