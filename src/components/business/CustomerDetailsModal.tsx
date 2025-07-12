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
      // Get auth token with fallbacks
      const authToken = localStorage.getItem('token') || 
                        localStorage.getItem('auth_token') || 
                        localStorage.getItem('jwt');
      
      if (!authToken) {
        throw new Error('Authentication token not found. Please log in again.');
      }
      
      // Use enhanced fetch with better error handling
      const apiUrl = '/api/businesses/award-points';
      console.log(`Awarding ${pointsToAdd} points to customer ${customer.id} in program ${selectedProgramId}`);
      
      // Create a unique transaction reference for tracking
      const transactionRef = `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'X-Requested-With': 'XMLHttpRequest',
          'Cache-Control': 'no-cache'
        },
        mode: 'cors',
        credentials: 'include',
        body: JSON.stringify({
          customerId: customer.id,
          programId: selectedProgramId,
          points: pointsToAdd,
          description: 'Points awarded from customer details',
          source: 'CUSTOMER_DETAILS',
          transactionRef,
          sendNotification: true
        })
      });
      
      // Check if we got a 405 error and try the fallback method
      if (response.status === 405) {
        console.warn('405 Method Not Allowed error detected. Using fallback method...');
        
        // Try using our window.awardPointsDirectly helper from the fix script
        if (window.awardPointsDirectly) {
          const result = await window.awardPointsDirectly(
            customer.id.toString(), 
            selectedProgramId.toString(), 
            pointsToAdd,
            'Points awarded from customer details'
          );
          
          if (result && result.success) {
            setSuccess(`Successfully awarded ${pointsToAdd} points to ${customer.name}`);
            // Refresh customer data
            loadCustomerData();
            loadCustomerLoyaltyCards();
            return;
          }
        }
        
        // If fallback failed or isn't available, throw error
        throw new Error(`Server rejected request method: POST to ${apiUrl}. Please try again.`);
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to award points: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data && data.success) {
        setSuccess(`Successfully awarded ${pointsToAdd} points to ${customer.name}`);
        // Show confetti or other visual feedback
        
        // Refresh customer data
        loadCustomerData();
        loadCustomerLoyaltyCards();
      } else {
        throw new Error(data?.error || 'Failed to award points');
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

              {/* Loyalty Cards Section */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-indigo-500" />
                  {t('Loyalty Cards')}
                </h3>
                
                {loadingCards ? (
                  <div className="flex justify-center items-center py-4">
                    <Loader className="w-6 h-6 text-indigo-500 animate-spin mr-2" />
                    <p className="text-indigo-500">Loading cards...</p>
                  </div>
                ) : loyaltyCards.length === 0 ? (
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-gray-500">Customer has no loyalty cards with this business.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {loyaltyCards.map(card => (
                      <div key={card.id} className="bg-white border rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center mb-2">
                              {card.cardType?.toLowerCase().includes('premium') ? (
                                <div className="p-2 bg-blue-100 rounded-full mr-2">
                                  <Shield className="w-4 h-4 text-blue-600" />
                                </div>
                              ) : card.cardType?.toLowerCase().includes('gold') ? (
                                <div className="p-2 bg-amber-100 rounded-full mr-2">
                                  <Award className="w-4 h-4 text-amber-600" />
                                </div>
                              ) : card.cardType?.toLowerCase().includes('fitness') ? (
                                <div className="p-2 bg-green-100 rounded-full mr-2">
                                  <Zap className="w-4 h-4 text-green-600" />
                                </div>
                              ) : (
                                <div className="p-2 bg-purple-100 rounded-full mr-2">
                                  <CreditCard className="w-4 h-4 text-purple-600" />
                                </div>
                              )}
                              <div>
                                <h4 className="font-medium text-gray-900">{card.programName || 'Loyalty Program'}</h4>
                                <p className="text-sm text-gray-500">Card ID: {card.id}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 mb-3">
                              <div>
                                <p className="text-xs text-gray-500">Card Type</p>
                                <p className="font-medium text-gray-700">{card.cardType || 'Standard'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Points</p>
                                <p className="font-medium text-gray-700">{card.points || 0}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Status</p>
                                <p className="font-medium text-gray-700">{card.isActive ? 'Active' : 'Inactive'}</p>
                              </div>
                            </div>
                            
                            <div className="mb-2">
                              {card.promoCode ? (
                                <div className="flex items-center">
                                  <span className="text-sm font-medium mr-2">Promo Code:</span>
                                  <span className="text-sm bg-green-100 text-green-800 px-2 py-0.5 rounded-md">{card.promoCode}</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleGrantPromoCode(card.id)}
                                  disabled={isGeneratingPromoCode}
                                  className="inline-flex items-center px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded text-sm"
                                >
                                  <Tag className="w-3.5 h-3.5 mr-1" />
                                  {isGeneratingPromoCode && promoCodeResult?.cardId === card.id 
                                    ? 'Generating...' 
                                    : 'Grant Promo Code'}
                                </button>
                              )}
                            </div>
                            
                            {promoCodeResult && promoCodeResult.cardId === card.id && (
                              <div className={`text-sm ${promoCodeResult.success ? 'text-green-600' : 'text-red-600'} mt-2`}>
                                <div className="flex items-center">
                                  {promoCodeResult.success 
                                    ? <Check className="w-4 h-4 mr-1" /> 
                                    : <X className="w-4 h-4 mr-1" />}
                                  {promoCodeResult.message}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  
                  {programs.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-gray-500">No loyalty programs available.</p>
                      <p className="text-sm text-gray-400 mt-1">Create programs in the business dashboard first.</p>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
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
                  
                  <div className="space-y-4">
                    {/* Unique Promo Code Option */}
                    <div className="p-4 bg-white border border-amber-100 rounded-lg mb-4">
                      <h5 className="font-medium text-amber-700 mb-2 flex items-center">
                        <Gift className="w-4 h-4 mr-2" />
                        Generate Unique Promotion
                      </h5>
                      
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
                    
                    {/* Existing Secret Promos Option */}
                    <div className="p-4 bg-white border border-amber-100 rounded-lg">
                      <h5 className="font-medium text-amber-700 mb-2 flex items-center">
                        <BadgeCheck className="w-4 h-4 mr-2" />
                        Assign Secret Promotion
                      </h5>
                      
                      {loadingPromos ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader className="w-5 h-5 text-amber-500 animate-spin mr-2" />
                          <span className="text-amber-500 text-sm">Loading secret promotions...</span>
                        </div>
                      ) : secretPromos.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-gray-500">No secret promotions available.</p>
                          <p className="text-sm text-gray-400 mt-1">Create promotions in the business dashboard first.</p>
                        </div>
                      ) : (
                        <>
                          <div className="mb-4">
                            <label htmlFor="secret-promo" className="block text-sm font-medium text-amber-800 mb-1">
                              Select Secret Promotion
                            </label>
                            <select
                              id="secret-promo"
                              className="w-full border border-amber-300 rounded-lg px-3 py-2"
                              value={selectedSecretPromo}
                              onChange={(e) => setSelectedSecretPromo(e.target.value)}
                              disabled={processing}
                            >
                              <option value="">Select a promotion...</option>
                              {secretPromos.map(promo => (
                                <option key={promo.id} value={promo.id}>
                                  {promo.name || promo.code} ({promo.value}% discount)
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="flex justify-end">
                            <button
                              onClick={handleAssignSecretPromo}
                              disabled={processing || !selectedSecretPromo}
                              className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:bg-amber-300"
                            >
                              {processing ? 'Processing...' : 'Assign Promotion'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
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
                  
                  {customer && customer.loyaltyPoints < pointsToDeduct && (
                    <div className="mb-4 p-2 bg-red-50 border border-red-100 rounded text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      Customer only has {customer.loyaltyPoints} points available.
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <button
                      onClick={handleDeductCredit}
                      disabled={processing || pointsToDeduct <= 0 || (customer && customer.loyaltyPoints < pointsToDeduct)}
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