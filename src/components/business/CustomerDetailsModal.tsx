import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  User,
  Coffee,
  Award,
  Gift,
  CreditCard,
  CheckCircle,
  UserPlus,
  AlertCircle,
  PlusCircle,
  MinusCircle,
  Tag,
  BadgeCheck,
  Loader,
} from 'lucide-react';
import { CustomerService } from '../../services/customerService';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';
import { PromoService } from '../../services/promoService';
import type { Customer } from '../../services/customerService';
import type { LoyaltyProgram } from '../../types/loyalty';

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  businessId: string;
  initialData?: any;
}

export const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  isOpen,
  onClose,
  customerId,
  businessId,
  initialData
}) => {
  const { t } = useTranslation();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [pointsToAdd, setPointsToAdd] = useState(10);
  const [pointsToDeduct, setPointsToDeduct] = useState(5);
  const [promoValue, setPromoValue] = useState(10);
  const [promoDesc, setPromoDesc] = useState('');
  const [activeAction, setActiveAction] = useState<'join'|'credit'|'promo'|'deduct'|null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadAttempts, setLoadAttempts] = useState(0);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setActiveAction(null);
      setLoadAttempts(0);
    }
  }, [isOpen]);

  // Load customer data when modal opens
  useEffect(() => {
    if (isOpen && customerId) {
      console.log('CustomerDetailsModal: Loading data for customer', customerId);
      loadCustomerData();
      loadPrograms();
    }
  }, [isOpen, customerId, businessId]);

  const loadCustomerData = async () => {
    if (!customerId || customerId === '') {
      setError('Invalid customer ID');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('CustomerDetailsModal: Loading customer data for ID:', customerId);
      
      // If we have initial data from the scan, use it first
      if (initialData && initialData.name) {
        console.log('CustomerDetailsModal: Using initial data:', initialData);
        setCustomer({
          id: customerId,
          name: initialData.name || 'Customer',
          email: initialData.email || '',
          phone: initialData.phone || '',
          tier: initialData.tier || 'STANDARD',
          loyaltyPoints: initialData.points || 0,
          totalSpent: initialData.totalSpent || 0,
          visits: initialData.visits || 0,
          joinedAt: initialData.joinedAt || new Date().toISOString(),
          favoriteItems: initialData.favoriteItems || [],
        });
      }

      // Then load full customer details
      const customerData = await CustomerService.getCustomerById(customerId);
      console.log('CustomerDetailsModal: Customer data loaded:', customerData);
      
      if (customerData) {
        setCustomer(customerData);
      } else if (!initialData || !initialData.name) {
        // Only show error if we don't have initial data
        setError('Customer not found');
      }
    } catch (err) {
      console.error('Error loading customer data:', err);
      setError('Error loading customer data');
      
      // Retry loading if we have initial data but failed to get full details
      if (initialData && loadAttempts < 2) {
        setTimeout(() => {
          setLoadAttempts(prev => prev + 1);
          loadCustomerData();
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadPrograms = async () => {
    try {
      console.log('CustomerDetailsModal: Loading programs for business', businessId);
      const businessPrograms = await LoyaltyProgramService.getBusinessPrograms(businessId);
      console.log('CustomerDetailsModal: Programs loaded:', businessPrograms);
      
      setPrograms(businessPrograms);
      if (businessPrograms.length > 0) {
        setSelectedProgramId(businessPrograms[0].id);
      }
    } catch (err) {
      console.error('Error loading programs:', err);
      // Don't set error state as this is not critical
    }
  };

  const handleJoinProgram = async () => {
    if (!selectedProgramId) {
      setError('Please select a program');
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('CustomerDetailsModal: Enrolling customer in program:', selectedProgramId);
      const result = await LoyaltyProgramService.enrollCustomer(customerId, selectedProgramId);
      
      if (result.success) {
        setSuccess(`Customer successfully joined the program!`);
        
        // Record customer interaction
        await CustomerService.recordCustomerInteraction(
          customerId,
          businessId,
          'PROGRAM_JOIN',
          `Joined program ID: ${selectedProgramId}`
        );
        
        // Register customer with business if not already registered
        await CustomerService.associateCustomerWithBusiness(customerId, businessId, selectedProgramId);
        
        // Reload customer data
        loadCustomerData();
      } else {
        setError(result.error || 'Failed to join program');
      }
    } catch (err) {
      console.error('Error joining program:', err);
      setError('Error joining program');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddCredit = async () => {
    setProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('CustomerDetailsModal: Adding points:', pointsToAdd);
      // Add points transaction
      await CustomerService.recordCustomerInteraction(
        customerId,
        businessId,
        'POINTS_ADDED',
        `Added ${pointsToAdd} points`
      );
      
      setSuccess(`Successfully added ${pointsToAdd} points to customer account!`);
      
      // Reload customer data
      loadCustomerData();
    } catch (err) {
      console.error('Error adding credit:', err);
      setError('Error adding credit');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeductCredit = async () => {
    setProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('CustomerDetailsModal: Deducting points:', pointsToDeduct);
      // Add points transaction
      await CustomerService.recordCustomerInteraction(
        customerId,
        businessId,
        'POINTS_REDEEMED',
        `Redeemed ${pointsToDeduct} points for a promotion`
      );
      
      setSuccess(`Successfully redeemed ${pointsToDeduct} points for a promotion!`);
      
      // Reload customer data
      loadCustomerData();
    } catch (err) {
      console.error('Error deducting credit:', err);
      setError('Error deducting credit');
    } finally {
      setProcessing(false);
    }
  };

  const handleGeneratePromoCode = async () => {
    setProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const description = promoDesc || 
        `Special promo code for ${customer?.name}`;
      
      console.log('CustomerDetailsModal: Generating promo code:', { 
        businessId, 
        value: promoValue,
        description 
      });
      
      // Generate a unique promo code
      const result = await PromoService.generateCode(
        businessId,
        'DISCOUNT',
        promoValue,
        'USD',
        1, // Single use code
        null, // No expiration
        `${customer?.name}'s Special Promo`,
        description
      );
      
      if (result.code) {
        // Record customer interaction
        await CustomerService.recordCustomerInteraction(
          customerId,
          businessId,
          'PROMO_CODE_ISSUED',
          `Issued promo code: ${result.code.code} (${promoValue}% discount)`
        );
        
        setSuccess(`Generated promo code: ${result.code.code}`);
      } else {
        setError(result.error || 'Failed to generate promo code');
      }
    } catch (err) {
      console.error('Error generating promo code:', err);
      setError('Error generating promo code');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 flex justify-between items-center">
          <div className="flex items-center">
            <div className="bg-white p-3 rounded-full shadow-lg mr-4">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {loading ? 'Loading...' : customer?.name || 'Customer'}
              </h2>
              <p className="text-blue-100">ID: {customerId}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-10">
              <Loader className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-blue-500">Loading customer details...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          ) : (
            <>
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <p className="text-green-700">{success}</p>
                </div>
              )}

              {/* Customer details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                  <h3 className="text-lg font-medium text-blue-800 mb-3 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    {t('Customer Information')}
                  </h3>
                  <div className="space-y-2">
                    <p><span className="text-gray-500">Name:</span> {customer?.name}</p>
                    <p><span className="text-gray-500">Email:</span> {customer?.email || 'Not provided'}</p>
                    <p><span className="text-gray-500">Phone:</span> {customer?.phone || 'Not provided'}</p>
                    <p><span className="text-gray-500">Member since:</span> {new Date(customer?.joinedAt || '').toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                  <h3 className="text-lg font-medium text-amber-800 mb-3 flex items-center">
                    <Award className="w-5 h-5 mr-2" />
                    {t('Loyalty Status')}
                  </h3>
                  <div className="space-y-2">
                    <p><span className="text-gray-500">Tier:</span> <span className="capitalize">{customer?.tier?.toLowerCase() || 'Standard'}</span></p>
                    <p><span className="text-gray-500">Points:</span> {customer?.loyaltyPoints || 0}</p>
                    <p><span className="text-gray-500">Visits:</span> {customer?.visits || 0}</p>
                    <p><span className="text-gray-500">Total Spent:</span> ${(customer?.totalSpent || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Action tabs */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-800 mb-3">{t('Available Actions')}</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <button
                    onClick={() => setActiveAction(activeAction === 'join' ? null : 'join')}
                    className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 border hover:shadow-md transition-all ${
                      activeAction === 'join' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <UserPlus className={`w-8 h-8 ${activeAction === 'join' ? 'text-blue-500' : 'text-gray-500'}`} />
                    <span className={`text-sm font-medium ${activeAction === 'join' ? 'text-blue-700' : 'text-gray-700'}`}>Join Program</span>
                  </button>

                  <button
                    onClick={() => setActiveAction(activeAction === 'credit' ? null : 'credit')}
                    className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 border hover:shadow-md transition-all ${
                      activeAction === 'credit' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <PlusCircle className={`w-8 h-8 ${activeAction === 'credit' ? 'text-green-500' : 'text-gray-500'}`} />
                    <span className={`text-sm font-medium ${activeAction === 'credit' ? 'text-green-700' : 'text-gray-700'}`}>Add Credit</span>
                  </button>

                  <button
                    onClick={() => setActiveAction(activeAction === 'promo' ? null : 'promo')}
                    className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 border hover:shadow-md transition-all ${
                      activeAction === 'promo' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <Tag className={`w-8 h-8 ${activeAction === 'promo' ? 'text-amber-500' : 'text-gray-500'}`} />
                    <span className={`text-sm font-medium ${activeAction === 'promo' ? 'text-amber-700' : 'text-gray-700'}`}>Create Promo</span>
                  </button>

                  <button
                    onClick={() => setActiveAction(activeAction === 'deduct' ? null : 'deduct')}
                    className={`p-4 rounded-xl flex flex-col items-center justify-center gap-2 border hover:shadow-md transition-all ${
                      activeAction === 'deduct' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <MinusCircle className={`w-8 h-8 ${activeAction === 'deduct' ? 'text-purple-500' : 'text-gray-500'}`} />
                    <span className={`text-sm font-medium ${activeAction === 'deduct' ? 'text-purple-700' : 'text-gray-700'}`}>Use Points</span>
                  </button>
                </div>
              </div>

              {/* Action forms */}
              {activeAction === 'join' && (
                <div className="bg-blue-50 rounded-xl p-5 border border-blue-200 mb-6 animate-fade-in">
                  <h4 className="text-lg font-medium text-blue-800 mb-3 flex items-center">
                    <UserPlus className="w-5 h-5 mr-2" />
                    Join Program
                  </h4>
                  
                  <div className="mb-4">
                    <label htmlFor="program" className="block text-sm font-medium text-blue-800 mb-1">
                      Select Program
                    </label>
                    <select
                      id="program"
                      className="w-full border border-blue-300 rounded-lg px-3 py-2"
                      value={selectedProgramId}
                      onChange={(e) => setSelectedProgramId(e.target.value)}
                      disabled={processing}
                    >
                      <option value="">Select a program...</option>
                      {programs.map(program => (
                        <option key={program.id} value={program.id}>
                          {program.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={handleJoinProgram}
                      disabled={processing || !selectedProgramId}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                    >
                      {processing ? 'Processing...' : 'Join Program'}
                    </button>
                  </div>
                </div>
              )}

              {activeAction === 'credit' && (
                <div className="bg-green-50 rounded-xl p-5 border border-green-200 mb-6 animate-fade-in">
                  <h4 className="text-lg font-medium text-green-800 mb-3 flex items-center">
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Add Credit
                  </h4>
                  
                  <div className="mb-4">
                    <label htmlFor="points" className="block text-sm font-medium text-green-800 mb-1">
                      Points to Add
                    </label>
                    <input
                      id="points"
                      type="number"
                      min="1"
                      className="w-full border border-green-300 rounded-lg px-3 py-2"
                      value={pointsToAdd}
                      onChange={(e) => setPointsToAdd(Number(e.target.value))}
                      disabled={processing}
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddCredit}
                      disabled={processing || pointsToAdd <= 0}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-300"
                    >
                      {processing ? 'Processing...' : 'Add Credit'}
                    </button>
                  </div>
                </div>
              )}

              {activeAction === 'promo' && (
                <div className="bg-amber-50 rounded-xl p-5 border border-amber-200 mb-6 animate-fade-in">
                  <h4 className="text-lg font-medium text-amber-800 mb-3 flex items-center">
                    <Tag className="w-5 h-5 mr-2" />
                    Create Special Promo Code
                  </h4>
                  
                  <div className="mb-4">
                    <label htmlFor="value" className="block text-sm font-medium text-amber-800 mb-1">
                      Discount Percentage
                    </label>
                    <input
                      id="value"
                      type="number"
                      min="1"
                      max="100"
                      className="w-full border border-amber-300 rounded-lg px-3 py-2"
                      value={promoValue}
                      onChange={(e) => setPromoValue(Number(e.target.value))}
                      disabled={processing}
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="description" className="block text-sm font-medium text-amber-800 mb-1">
                      Description (Optional)
                    </label>
                    <input
                      id="description"
                      type="text"
                      className="w-full border border-amber-300 rounded-lg px-3 py-2"
                      value={promoDesc}
                      onChange={(e) => setPromoDesc(e.target.value)}
                      placeholder={`Special promo for ${customer?.name}`}
                      disabled={processing}
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={handleGeneratePromoCode}
                      disabled={processing || promoValue <= 0 || promoValue > 100}
                      className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:bg-amber-300"
                    >
                      {processing ? 'Processing...' : 'Generate Promo Code'}
                    </button>
                  </div>
                </div>
              )}

              {activeAction === 'deduct' && (
                <div className="bg-purple-50 rounded-xl p-5 border border-purple-200 mb-6 animate-fade-in">
                  <h4 className="text-lg font-medium text-purple-800 mb-3 flex items-center">
                    <Coffee className="w-5 h-5 mr-2" />
                    Use Points for Promotion
                  </h4>
                  
                  <div className="mb-4">
                    <label htmlFor="deduct-points" className="block text-sm font-medium text-purple-800 mb-1">
                      Points to Use
                    </label>
                    <input
                      id="deduct-points"
                      type="number"
                      min="1"
                      className="w-full border border-purple-300 rounded-lg px-3 py-2"
                      value={pointsToDeduct}
                      onChange={(e) => setPointsToDeduct(Number(e.target.value))}
                      disabled={processing}
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      onClick={handleDeductCredit}
                      disabled={processing || pointsToDeduct <= 0}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-purple-300"
                    >
                      {processing ? 'Processing...' : 'Use Points'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};