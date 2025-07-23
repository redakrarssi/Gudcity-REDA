import React, { useState, useEffect, FC } from 'react';
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
  Check,
  X,
  Zap,
  Shield
} from 'lucide-react';
import { CustomerService } from '../../services/customerService';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';
import { PromoService } from '../../services/promoService';
import LoyaltyCardService from '../../services/loyaltyCardService';
import sql from '../../utils/db';
import type { Customer } from '../../services/customerService';
import type { LoyaltyProgram } from '../../types/loyalty';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { LoyaltyCard } from '@/types/loyalty';
import loyaltyCardService from '@/services/loyaltyCardService';
import { queryKeys } from '@/utils/queryKeys';
// New robust award-points helper
import { guaranteedAwardPoints } from '../../utils/directPointsAwardService';

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  businessId: string;
  initialData?: any;
}

export const CustomerDetailsModal: FC<CustomerDetailsModalProps> = ({
  isOpen,
  onClose,
  customerId,
  businessId,
  initialData
}) => {
  const { t } = useTranslation();
  const [customer, setCustomer] = useState<Customer | null>(initialData ? {
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
  } : null);
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
  const [secretPromos, setSecretPromos] = useState<any[]>([]);
  const [selectedSecretPromo, setSelectedSecretPromo] = useState<string>('');
  const [loadingPromos, setLoadingPromos] = useState(false);
  const [isGeneratingPromoCode, setIsGeneratingPromoCode] = useState(false);
  const [promoCodeResult, setPromoCodeResult] = useState<{
    success: boolean;
    message: string;
    promoCode?: string;
    cardId?: string;
  } | null>(null);
  const [loyaltyCards, setLoyaltyCards] = useState<any[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setLoading(!initialData); // Don't show loading screen if we have initial data
      setError(null);
      setSuccess(null);
      setActiveAction(null);
      setLoadAttempts(0);
      
      if (initialData) {
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
      
      // Show Join Program action by default if customer not enrolled
      if (initialData && initialData.isEnrolled !== undefined && initialData.isEnrolled === false) {
        setActiveAction('join');
      }
    }
  }, [isOpen, initialData, customerId]);

  // Load customer data when modal opens
  useEffect(() => {
    if (isOpen && customerId && businessId) {
      console.log('CustomerDetailsModal: Loading data for customer', customerId);
      loadCustomerData();
      loadPrograms();
      loadSecretPromos();
      loadCustomerLoyaltyCards();
    }
  }, [isOpen, customerId, businessId]);

  const loadCustomerData = async () => {
    if (!customerId) {
      setError('Invalid customer ID');
      setLoading(false);
      return;
    }
    
    // If we don't have a customer object yet, show loader
    if (!customer) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const customerData = await CustomerService.getCustomerById(customerId);
      
      if (customerData) {
        setCustomer(customerData);
      } else if (!initialData) {
        setError('Customer not found');
      }
    } catch (err) {
      console.error('Error loading customer data:', err);
      if (!customer) {
        setError('Error loading customer data');
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

  const loadSecretPromos = async () => {
    try {
      setLoadingPromos(true);
      console.log('CustomerDetailsModal: Loading secret promos for business', businessId);
      const { codes } = await PromoService.getBusinessCodes(businessId);
      console.log('CustomerDetailsModal: Secret promos loaded:', codes);
      
      // Filter to only active promos
      const activePromos = codes.filter(promo => promo.status === 'ACTIVE');
      setSecretPromos(activePromos);
      
      if (activePromos.length > 0) {
        setSelectedSecretPromo(activePromos[0].id);
      }
    } catch (err) {
      console.error('Error loading secret promos:', err);
      // Don't set error state as this is not critical
    } finally {
      setLoadingPromos(false);
    }
  };

  const loadCustomerLoyaltyCards = async () => {
    if (!customerId || !businessId) return;
    
    try {
      setLoadingCards(true);
      const cards = await LoyaltyCardService.getCustomerCards(customerId);
      // Filter cards to only show ones for this business
      const businessCards = cards.filter(card => card.businessId === businessId);
      setLoyaltyCards(businessCards);
    } catch (err) {
      console.error('Error loading customer loyalty cards:', err);
    } finally {
      setLoadingCards(false);
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
        
        // Force create the loyalty card immediately - fixes the delay in card creation
        try {
          console.log('Creating loyalty card immediately for customer:', customerId);
          const cardResult = await LoyaltyCardService.enrollCustomerInProgram(
            customerId,
            businessId,
            selectedProgramId
          );
          
          if (cardResult) {
            console.log('Loyalty card created successfully:', cardResult);
          } else {
            // Try alternate method if the first one fails
            console.log('Trying alternate method to create loyalty card');
            
            // Get the program info
            const program = await LoyaltyProgramService.getProgramById(selectedProgramId);
            if (program) {
              // Generate a card number
              const cardNumber = `C${customerId}-${selectedProgramId}-${Date.now().toString().slice(-6)}`;
              
              // Create card directly in the database
              await sql`
                INSERT INTO loyalty_cards (
                  customer_id, business_id, program_id, card_number, 
                  card_type, tier, points_multiplier, points,
                  points_to_next, benefits, status, is_active, 
                  created_at, updated_at
                ) VALUES (
                  ${customerId}, ${businessId}, ${selectedProgramId}, ${cardNumber},
                  ${program.type || 'POINTS'}, 'STANDARD', 1.0, 0,
                  1000, ARRAY['Basic rewards', 'Birthday gift'], 'active', true,
                  NOW(), NOW()
                )
                ON CONFLICT (customer_id, program_id) DO UPDATE SET
                  status = 'active',
                  is_active = true,
                  updated_at = NOW()
              `;
              console.log('Created loyalty card using direct SQL');
            }
          }
        } catch (cardErr) {
          console.error('Error creating loyalty card:', cardErr);
          // Non-critical error, continue
        }
        
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
    if (!selectedProgramId || !pointsToAdd || !customer) {
      setError('Please select a program and enter points to add');
      return;
    }
    
    setProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await guaranteedAwardPoints({
          customerId: customer.id,
          programId: selectedProgramId,
          points: pointsToAdd,
          description: 'Points awarded from customer details',
          source: 'CUSTOMER_DETAILS',
        businessId
      });
          
      if (result.success) {
            setSuccess(`Successfully awarded ${pointsToAdd} points to ${customer.name}`);
        // Refresh data so UI stays in sync
        loadCustomerData();
        loadCustomerLoyaltyCards();
      } else {
        throw new Error(result.error || 'Failed to award points');
      }
    } catch (err) {
      console.error('Error adding credit:', err);
      setError(err instanceof Error ? err.message : 'Error awarding points');
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

  const handleAssignSecretPromo = async () => {
    if (!selectedSecretPromo) {
      setError('Please select a promotion');
      return;
    }

    setProcessing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const selectedPromo = secretPromos.find(promo => promo.id === selectedSecretPromo);
      if (!selectedPromo) {
        throw new Error('Selected promotion not found');
      }
      
      console.log('CustomerDetailsModal: Assigning secret promo:', selectedPromo);
      
      // Record customer interaction for the secret promo
      await CustomerService.recordCustomerInteraction(
        customerId,
        businessId,
        'SECRET_PROMO_ASSIGNED',
        `Assigned secret promo: ${selectedPromo.name || selectedPromo.code} (${selectedPromo.value}% discount)`
      );
      
      setSuccess(`Successfully assigned promo code: ${selectedPromo.code}`);
    } catch (err) {
      console.error('Error assigning secret promo:', err);
      setError('Error assigning secret promo');
    } finally {
      setProcessing(false);
    }
  };

  const handleGrantPromoCode = async (cardId: string) => {
    if (!customer?.id || !businessId) return;
    
    setIsGeneratingPromoCode(true);
    setPromoCodeResult(null);
    
    try {
      const result = await LoyaltyCardService.grantPromoCodeToCustomer(
        businessId,
        cardId,
        customerId
      );
      
      setPromoCodeResult({
        ...result,
        cardId
      });
      
      // Reload the loyalty cards to show the updated promo code
      loadCustomerLoyaltyCards();
    } catch (error) {
      setPromoCodeResult({
        success: false,
        message: 'An error occurred while granting a promo code.',
        cardId
      });
    } finally {
      setIsGeneratingPromoCode(false);
    }
  };

  // Render the modal
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center">
            <User className="mr-2" size={20} />
            {customer ? customer.name : `Customer #${customerId}`}
              </h2>
          <button 
            className="text-white hover:text-gray-200 transition-colors"
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 flex-grow">
          {loading && (
            <div className="flex items-center justify-center h-40">
              <div className="flex flex-col items-center">
                <Loader className="animate-spin h-8 w-8 text-blue-500 mb-2" />
                <p>Loading customer details...</p>
            </div>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md mb-4 flex items-center">
              <AlertCircle className="mr-2 flex-shrink-0" />
              <span>{error}</span>
                </div>
              )}

          {customer && !loading && (
            <div className="space-y-6">
              {/* Customer Information Section */}
              <section className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <User className="mr-2" size={16} />
                  Customer Information
                  </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{customer.name}</p>
                  </div>
                  {customer.email && (
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{customer.email}</p>
                </div>
                  )}
                  {customer.phone && (
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{customer.phone}</p>
                  </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Customer Since</p>
                    <p className="font-medium">
                      {customer.joinedAt
                        ? new Date(customer.joinedAt).toLocaleDateString()
                        : 'Unknown'}
                    </p>
                </div>
              </div>
              </section>

              {/* Loyalty Cards Section */}
              <section className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <CreditCard className="mr-2" size={16} />
                  Loyalty Cards
                </h3>
                {loadingCards ? (
                  <div className="flex justify-center py-4">
                    <Loader className="animate-spin h-6 w-6 text-blue-500" />
                  </div>
                ) : loyaltyCards.length > 0 ? (
                  <div className="space-y-3">
                    {loyaltyCards.map(card => (
                      <div
                        key={card.id}
                        className="border border-gray-200 rounded-md p-3 bg-white"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">{card.programName || 'Loyalty Program'}</span>
                          <span className="bg-blue-100 text-blue-800 text-xs py-1 px-2 rounded-full">
                            {card.points || 0} points
                          </span>
                                </div>
                        <div className="text-xs text-gray-500">
                          Card ID: {card.id.substring(0, 8)}...
                                </div>
                      </div>
                    ))}
                                </div>
                              ) : (
                  <div className="text-center py-3 text-gray-500">
                    No loyalty cards found for this customer
                                </div>
                              )}
              </section>

              {/* Award Points Section - Separated and made more prominent */}
              <section className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-blue-800 flex items-center">
                  <Award className="mr-2" size={20} />
                  Award Points
                </h3>
                
                {programs.length === 0 ? (
                  <div className="text-center py-3 bg-white bg-opacity-70 rounded-md">
                    {loading ? (
                      <Loader className="animate-spin h-6 w-6 text-blue-500 mx-auto" />
                    ) : (
                      <div className="space-y-2">
                        <p className="text-gray-600">No loyalty programs available</p>
                                <button
                          onClick={() => setActiveAction('join')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <UserPlus className="inline-block mr-1" size={16} />
                          Enroll Customer
                                </button>
                              </div>
                            )}
                          </div>
                ) : (
                  <div className="bg-white bg-opacity-70 rounded-md p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Program
                        </label>
                        <select
                          value={selectedProgramId}
                          onChange={(e) => setSelectedProgramId(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          {programs.map((program) => (
                            <option key={program.id} value={program.id}>
                              {program.name}
                            </option>
                          ))}
                        </select>
                  </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Points to Award
                        </label>
                        <input
                          type="number"
                          value={pointsToAdd}
                          onChange={(e) => setPointsToAdd(Math.max(1, parseInt(e.target.value) || 0))}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          min="1"
                        />
                      </div>
              </div>

                  <button
                      onClick={handleAddCredit}
                      disabled={processing}
                      className="w-full py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 flex items-center justify-center"
                    >
                      {processing ? (
                        <>
                          <Loader className="animate-spin mr-2" size={16} />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Award className="mr-2" size={16} />
                          Award {pointsToAdd} Points
                        </>
                      )}
                  </button>
                  </div>
                )}

                {success && (
                  <div className="mt-3 bg-green-50 border border-green-200 text-green-700 p-3 rounded-md flex items-center">
                    <CheckCircle className="mr-2 flex-shrink-0" size={16} />
                    <span>{success}</span>
                  </div>
                )}
              </section>

              {/* Other Actions Section */}
              <section className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Zap className="mr-2" size={16} />
                  Other Actions
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setActiveAction('join')}
                    className="py-2 px-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center"
                  >
                    <UserPlus className="mr-1" size={16} />
                    <span>Enroll in Program</span>
                  </button>
                  <button
                    onClick={() => setActiveAction('promo')}
                    className="py-2 px-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center"
                  >
                    <Gift className="mr-1" size={16} />
                    <span>Generate Promo</span>
                  </button>
                </div>
              </section>
              </div>
          )}

          {/* Action Panels - These will show/hide based on activeAction state */}
              {activeAction === 'join' && (
            <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-md">
              <h4 className="font-medium mb-3 text-indigo-800 flex items-center">
                <UserPlus className="mr-2" size={16} />
                Enroll in Program
                  </h4>
              {/* Join program form content */}
              <div className="space-y-3">
                        <select
                          value={selectedProgramId}
                          onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                        >
                  <option value="">Select a program</option>
                  {programs.map((program) => (
                            <option key={program.id} value={program.id}>
                              {program.name}
                            </option>
                          ))}
                        </select>
                      
                        <button
                          onClick={handleJoinProgram}
                          disabled={processing || !selectedProgramId}
                  className="w-full py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors flex items-center justify-center"
                >
                  {processing ? (
                    <>
                      <Loader className="animate-spin mr-2" size={16} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2" size={16} />
                      Enroll Customer
                    </>
                  )}
                    </button>
                  </div>
                </div>
              )}

              {activeAction === 'promo' && (
            <div className="mt-4 p-4 bg-purple-50 border border-purple-100 rounded-md">
              <h4 className="font-medium mb-3 text-purple-800 flex items-center">
                <Gift className="mr-2" size={16} />
                Generate Promo Code
                  </h4>
              {/* Promo code generation content */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Promo Value
                        </label>
                        <input
                          type="number"
                          value={promoValue}
                    onChange={(e) => setPromoValue(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    min="1"
                        />
                      </div>
                      
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                        </label>
                        <input
                          type="text"
                          value={promoDesc}
                          onChange={(e) => setPromoDesc(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder="Special discount for loyal customer"
                        />
                      </div>
                      
                        <button
                          onClick={handleGeneratePromoCode}
                  disabled={processing || promoValue <= 0}
                  className="w-full py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-300 transition-colors flex items-center justify-center"
                >
                  {isGeneratingPromoCode ? (
                    <>
                      <Loader className="animate-spin mr-2" size={16} />
                      Generating...
                    </>
                      ) : (
                        <>
                      <Gift className="mr-2" size={16} />
                      Generate Promo Code
                    </>
                  )}
                            </button>
                          </div>

              {/* Display generated promo code if available */}
              {promoCodeResult && (
                <div className={`mt-3 p-3 rounded-md ${promoCodeResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center">
                    {promoCodeResult.success ? (
                      <CheckCircle className="mr-2 text-green-600" size={16} />
                    ) : (
                      <AlertCircle className="mr-2 text-red-600" size={16} />
                    )}
                    <span className={promoCodeResult.success ? 'text-green-700' : 'text-red-700'}>
                      {promoCodeResult.message}
                    </span>
                    </div>
                  {promoCodeResult.promoCode && (
                    <div className="mt-2 p-2 bg-white border border-gray-200 rounded text-center">
                      <span className="font-mono font-bold text-lg">{promoCodeResult.promoCode}</span>
                </div>
              )}
                    </div>
                  )}
                </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Close
          </button>

          {activeAction && (
            <button
              onClick={() => setActiveAction(null)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Back to Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
};