import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  User, CreditCard, CheckCircle, AlertCircle, 
  UserPlus, Award, Gift, Zap, Loader, 
  Shield, X, Phone, Mail, Calendar, Coffee 
} from 'lucide-react';
import { CustomerService } from '../../services/customerService';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';

// Simple type definition for customer data
interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  joinedAt?: string;
}

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  businessId: string;
  initialData?: any;
  onAwardPoints?: (customerId: string) => void;
}

export const CustomerDetailsModal: React.FC<CustomerDetailsModalProps> = ({
  isOpen,
  onClose,
  customerId,
  businessId,
  initialData,
  onAwardPoints
}) => {
  const { t } = useTranslation();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolledPrograms, setEnrolledPrograms] = useState<Array<{id: string; name: string; points: number}>>([]);
  const [awardPointsMode, setAwardPointsMode] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [pointsToAward, setPointsToAward] = useState(10);
  const [isAwarding, setIsAwarding] = useState(false);
  const [awardSuccess, setAwardSuccess] = useState(false);
  const [awardError, setAwardError] = useState<string | null>(null);

  // Fetch customer data when modal opens
  useEffect(() => {
    if (isOpen && customerId && businessId) {
      fetchCustomerData();
    }
  }, [isOpen, customerId, businessId]);

  const fetchCustomerData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // If we have initial data, use it first for immediate rendering
      if (initialData) {
        setCustomer({
          id: customerId,
          name: initialData.name || `Customer #${customerId}`,
          email: initialData.email || '',
          phone: initialData.phone || '',
          joinedAt: initialData.joinedAt || new Date().toISOString(),
        });
      }
      
      // Fetch full customer data from API
      const customerData = await CustomerService.getCustomerById(customerId);
      if (customerData) {
        setCustomer(customerData);
      } else if (!initialData) {
        setCustomer({
          id: customerId,
          name: `Customer #${customerId}`,
          email: '',
          phone: '',
          joinedAt: new Date().toISOString()
        });
      }
      
      // Fetch enrolled programs
      try {
        const programs = await LoyaltyProgramService.getCustomerEnrolledProgramsForBusiness(
          customerId, 
          businessId
        );
        
        if (programs && programs.length > 0) {
          const programsWithPoints = await Promise.all(programs.map(async (program) => {
            try {
              // Try to get points for this program
              const pointsData = await fetch(`/api/loyalty-programs/${program.id}/customers/${customerId}/points`)
                .then(res => res.ok ? res.json() : { points: 0 });
              
              return {
                id: program.id,
                name: program.name,
                points: pointsData?.points || 0
              };
            } catch (e) {
              return {
                id: program.id,
                name: program.name,
                points: 0
              };
            }
          }));
          setEnrolledPrograms(programsWithPoints);
          
          // Set first program as default for awarding points
          if (programsWithPoints.length > 0) {
            setSelectedProgramId(programsWithPoints[0].id);
          }
        } else {
          setEnrolledPrograms([]);
        }
      } catch (e) {
        console.error('Error fetching programs:', e);
      }
    } catch (err) {
      console.error('Error fetching customer details:', err);
      setError('Failed to load customer details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return 'Unknown date';
    }
  };

  const handleAwardPoints = async () => {
    if (!selectedProgramId || !customerId) {
      setAwardError('Please select a program');
      return;
    }

    setIsAwarding(true);
    setAwardError(null);

    try {
      // First, try to use the emergency fix function if available
      if (window.awardPointsWithFallback) {
        try {
          const result = await window.awardPointsWithFallback(
            customerId,
            selectedProgramId,
            pointsToAward,
            `Points awarded to ${customer?.name || 'customer'}`
          );

          if (result && result.success) {
            setAwardSuccess(true);
            setTimeout(() => {
              setAwardPointsMode(false);
              setAwardSuccess(false);
              fetchCustomerData(); // Refresh data
            }, 2000);
            return;
          }
        } catch (err) {
          console.error('Error using award points fallback:', err);
          // Continue to normal award process if fallback fails
        }
      }

      // Standard award points request
      const response = await fetch('/api/businesses/award-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({
          customerId,
          programId: selectedProgramId,
          points: pointsToAward,
          description: `Points awarded from customer details page`,
          source: 'MANUAL'
        })
      });

      if (response.ok) {
        setAwardSuccess(true);
        setTimeout(() => {
          setAwardPointsMode(false);
          setAwardSuccess(false);
          fetchCustomerData(); // Refresh data
        }, 2000);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to award points' }));
        setAwardError(errorData.error || 'Failed to award points');
      }
    } catch (err) {
      console.error('Error awarding points:', err);
      setAwardError('Failed to award points. Please try again.');
    } finally {
      setIsAwarding(false);
    }
  };

  // Check if the modal should be rendered
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center">
            <User className="mr-2" size={20} />
            Customer Details
          </h2>
          <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body - scrollable */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48">
              <Loader className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
              <p className="text-gray-500">Loading customer details...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
              <p className="text-red-500 font-medium">{error}</p>
              <button 
                className="mt-4 px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600"
                onClick={fetchCustomerData}
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Customer Info Section */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg mb-6 border border-indigo-100">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white mr-4">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{customer?.name || `Customer ${customerId}`}</h3>
                    <p className="text-sm text-gray-500">ID: {customerId}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {customer?.email && (
                    <div className="flex items-center">
                      <Mail size={16} className="text-indigo-500 mr-2" />
                      <span className="text-gray-700">{customer.email}</span>
                    </div>
                  )}
                  
                  {customer?.phone && (
                    <div className="flex items-center">
                      <Phone size={16} className="text-indigo-500 mr-2" />
                      <span className="text-gray-700">{customer.phone}</span>
                    </div>
                  )}
                  
                  {customer?.joinedAt && (
                    <div className="flex items-center">
                      <Calendar size={16} className="text-indigo-500 mr-2" />
                      <span className="text-gray-700">Joined: {formatDate(customer.joinedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Enrolled Programs */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                  <Coffee className="mr-2" size={18} />
                  Enrolled Programs
                </h3>
                
                {enrolledPrograms.length === 0 ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-500 text-center">
                    Customer is not enrolled in any programs
                  </div>
                ) : (
                  <div className="space-y-3">
                    {enrolledPrograms.map(program => (
                      <div 
                        key={program.id} 
                        className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center hover:border-indigo-300 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-gray-800">{program.name}</p>
                          <p className="text-sm text-gray-500">ID: {program.id}</p>
                        </div>
                        <div className="bg-indigo-100 px-3 py-1 rounded-full text-indigo-800 font-medium">
                          {program.points} points
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Award Points Section */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-lg overflow-hidden mb-6">
                <div className="p-4">
                  <h3 className="font-medium text-gray-800 mb-1 flex items-center">
                    <Award className="mr-2 text-green-600" size={18} />
                    Award Points
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Award loyalty points to this customer
                  </p>
                  
                  {!awardPointsMode ? (
                    <div>
                      <button
                        onClick={() => setAwardPointsMode(true)}
                        disabled={enrolledPrograms.length === 0}
                        className={`w-full py-3 flex items-center justify-center rounded-md transition-colors ${
                          enrolledPrograms.length === 0
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        <Award className="mr-2" size={16} />
                        {enrolledPrograms.length === 0 
                          ? 'No programs to award points' 
                          : 'Award Points'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4 mt-2">
                      {/* Program Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Program
                        </label>
                        <select
                          value={selectedProgramId || ''}
                          onChange={(e) => setSelectedProgramId(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          disabled={isAwarding}
                        >
                          {enrolledPrograms.map(program => (
                            <option key={program.id} value={program.id}>
                              {program.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Points Input */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Points to Award
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={pointsToAward}
                          onChange={(e) => setPointsToAward(Math.max(1, parseInt(e.target.value) || 0))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          disabled={isAwarding}
                        />
                      </div>
                      
                      {/* Award Error */}
                      {awardError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-center">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          {awardError}
                        </div>
                      )}
                      
                      {/* Award Success */}
                      {awardSuccess && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Successfully awarded {pointsToAward} points!
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex space-x-3">
                        <button
                          onClick={handleAwardPoints}
                          disabled={isAwarding || !selectedProgramId}
                          className={`flex-1 py-2 rounded-md flex justify-center items-center ${
                            isAwarding || !selectedProgramId
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {isAwarding ? (
                            <>
                              <Loader className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Award className="w-4 h-4 mr-2" />
                              Award {pointsToAward} Points
                            </>
                          )}
                        </button>
                        
                        <button
                          onClick={() => setAwardPointsMode(false)}
                          disabled={isAwarding}
                          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};