import React, { useState, useEffect } from 'react';
import { Search, Award, CheckCircle, AlertCircle, User, Gift, X, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CustomerService, Customer } from '../../services/customerService';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';
import { guaranteedAwardPoints } from '../../utils/directPointsAwardService';
import type { LoyaltyProgram } from '../../types/loyalty';

interface QuickAwardPointsProps {
  onClose?: () => void;
  onSuccess?: (customer: Customer, program: LoyaltyProgram, points: number) => void;
}

const QuickAwardPoints: React.FC<QuickAwardPointsProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [pointsToAward, setPointsToAward] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [isAwarding, setIsAwarding] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load customers and programs on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        // Load customers
        const customersData = await CustomerService.getBusinessCustomers(user.id.toString());
        setCustomers(customersData);
        setFilteredCustomers(customersData);

        // Load programs
        const programsData = await LoyaltyProgramService.getProgramsByBusiness(user.id.toString());
        setPrograms(programsData);
        
        // Auto-select first program if available
        if (programsData.length > 0) {
          setSelectedProgramId(programsData[0].id);
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load customer and program data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  // Filter customers based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [searchTerm, customers]);

  const handleAwardPoints = async () => {
    if (!selectedCustomer || !selectedProgramId || !pointsToAward || pointsToAward <= 0) {
      setError('Please select a customer, program, and enter valid points to award');
      return;
    }

    setIsAwarding(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await guaranteedAwardPoints({
        customerId: selectedCustomer.id,
        programId: selectedProgramId,
        points: pointsToAward,
        description: 'Points awarded via Quick Award',
        source: 'QUICK_AWARD',
        businessId: user?.id.toString()
      });

      if (result.success) {
        const selectedProgram = programs.find(p => p.id === selectedProgramId);
        setSuccess(`Successfully awarded ${pointsToAward} points to ${selectedCustomer.name} in ${selectedProgram?.name || 'the selected program'}!`);
        
        // Call success callback
        if (onSuccess && selectedProgram) {
          onSuccess(selectedCustomer, selectedProgram, pointsToAward);
        }

        // Reset form
        setSelectedCustomer(null);
        setSearchTerm('');
        setPointsToAward(10);

        // Auto-close after delay
        setTimeout(() => {
          setSuccess(null);
          if (onClose) {
            onClose();
          }
        }, 3000);
      } else {
        setError(result.error || 'Failed to award points. Please try again.');
      }
    } catch (err) {
      console.error('Error awarding points:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsAwarding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center">
          <Loader className="animate-spin h-8 w-8 text-blue-500" />
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Gift className="h-6 w-6 text-blue-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-800">Quick Award Points</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Customer Search */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Search Customer
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Customer List */}
        {searchTerm && (
          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
            {filteredCustomers.length > 0 ? (
              filteredCustomers.slice(0, 5).map(customer => (
                <div
                  key={customer.id}
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setSearchTerm(customer.name);
                  }}
                  className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center"
                >
                  <User className="h-4 w-4 text-gray-400 mr-2" />
                  <div>
                    <div className="font-medium text-gray-800">{customer.name}</div>
                    <div className="text-sm text-gray-500">{customer.email}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 text-gray-500 text-center">No customers found</div>
            )}
          </div>
        )}

        {/* Selected Customer */}
        {selectedCustomer && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
            <div className="flex items-center">
              <User className="h-4 w-4 text-blue-500 mr-2" />
              <div>
                <div className="font-medium text-blue-800">{selectedCustomer.name}</div>
                <div className="text-sm text-blue-600">{selectedCustomer.email}</div>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedCustomer(null);
                setSearchTerm('');
              }}
              className="text-blue-500 hover:text-blue-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Program Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Loyalty Program
        </label>
        <select
          value={selectedProgramId}
          onChange={(e) => setSelectedProgramId(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Select a program...</option>
          {programs.map(program => (
            <option key={program.id} value={program.id}>
              {program.name}
            </option>
          ))}
        </select>
      </div>

      {/* Points Input */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Points to Award
        </label>
        <div className="flex space-x-2">
          {[5, 10, 25, 50].map(preset => (
            <button
              key={preset}
              onClick={() => setPointsToAward(preset)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                pointsToAward === preset
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {preset}
            </button>
          ))}
          <input
            type="number"
            value={pointsToAward}
            onChange={(e) => setPointsToAward(Math.max(1, parseInt(e.target.value) || 1))}
            className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            min="1"
          />
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-md">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
          <span className="text-green-800">{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
          <span className="text-red-800">{error}</span>
        </div>
      )}

      {/* Award Button */}
      <button
        onClick={handleAwardPoints}
        disabled={!selectedCustomer || !selectedProgramId || isAwarding || pointsToAward <= 0}
        className={`w-full py-3 px-4 rounded-md font-medium flex items-center justify-center ${
          !selectedCustomer || !selectedProgramId || isAwarding || pointsToAward <= 0
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isAwarding ? (
          <>
            <Loader className="animate-spin h-4 w-4 mr-2" />
            Awarding Points...
          </>
        ) : (
          <>
            <Award className="h-4 w-4 mr-2" />
            Award {pointsToAward} Points
          </>
        )}
      </button>
    </div>
  );
};

export default QuickAwardPoints; 