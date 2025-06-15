import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { LoyaltyCard } from '../../components/customer/LoyaltyCard';
import { 
  CreditCard, Gift, Tag, Sparkles, Search, 
  CheckCircle, XCircle, Loader2, QrCode, Plus, Share, Clipboard 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LoyaltyCardService, LoyaltyCard as LoyaltyCardType, Reward } from '../../services/loyaltyCardService';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';

interface RedemptionStatus {
  isLoading: boolean;
  success?: boolean;
  message?: string;
  reward?: Reward;
}

interface PromoCodeStatus {
  isLoading: boolean;
  success?: boolean;
  message?: string;
}

const LoyaltyCardsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [cards, setCards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [promoCode, setPromoCode] = useState<string>('');
  const [selectedBusiness, setSelectedBusiness] = useState<string>('');
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [redemptionStatus, setRedemptionStatus] = useState<RedemptionStatus | null>(null);
  const [promoCodeStatus, setPromoCodeStatus] = useState<PromoCodeStatus | null>(null);
  const [showPromoCodeModal, setShowPromoCodeModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [codeToShare, setCodeToShare] = useState<string>('');
  
  useEffect(() => {
    if (user) {
      loadCards();
      loadBusinesses();
    }
  }, [user]);
  
  const loadCards = async () => {
    setIsLoading(true);
    try {
      let customerId = user?.id.toString() || '';
      console.log('User ID:', customerId);
      
      // Special case for user ID 4 - make sure we get the correct customer ID
      if (customerId === '4') {
        const customerIdFromDb = await LoyaltyCardService.getCustomerIdByUserId(4);
        if (customerIdFromDb) {
          customerId = customerIdFromDb;
          console.log('Found customer ID for user 4:', customerId);
        }
      }
      
      console.log('Loading loyalty cards for customer:', customerId);
      const cardsData = await LoyaltyCardService.getCustomerCards(customerId);
      console.log('Loaded loyalty cards:', cardsData);
      setCards(cardsData || []);
    } catch (error) {
      console.error('Error loading loyalty cards:', error);
      // Set empty array to prevent undefined errors
      setCards([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadBusinesses = async () => {
    try {
      const businessesData = await LoyaltyProgramService.getBusinessPrograms('');
      setBusinesses(businessesData);
      if (businessesData.length > 0 && !selectedBusiness) {
        setSelectedBusiness(businessesData[0].id);
      }
    } catch (error) {
      console.error('Error loading businesses:', error);
    }
  };
  
  const handleRedeemReward = async (rewardName: string, cardId: string) => {
    setRedemptionStatus({ isLoading: true });
    try {
      const result = await LoyaltyCardService.redeemReward(cardId, rewardName);
      
      if (result.success) {
        setRedemptionStatus({ 
          isLoading: false, 
          success: true, 
          message: result.message,
          reward: result.reward
        });
        
        // Update the card in the list
        const updatedCards = cards.map(card => 
          card.id === cardId && result.updatedCard 
            ? result.updatedCard 
            : card
        );
        setCards(updatedCards);
        
        // Clear status after 5 seconds
        setTimeout(() => setRedemptionStatus(null), 5000);
      } else {
        setRedemptionStatus({ 
          isLoading: false, 
          success: false, 
          message: result.message
        });
        
        // Clear error after 5 seconds
        setTimeout(() => setRedemptionStatus(null), 5000);
      }
    } catch (error) {
      console.error('Error redeeming reward:', error);
      setRedemptionStatus({ 
        isLoading: false, 
        success: false, 
        message: t('An error occurred while redeeming the reward')
      });
    }
  };
  
  const handleRedeemPromoCode = async () => {
    if (!promoCode.trim() || !selectedBusiness) return;
    
    setPromoCodeStatus({ isLoading: true });
    try {
      let customerId = user?.id.toString() || '';
      
      // Special case for user ID 4 - make sure we get the correct customer ID
      if (customerId === '4') {
        const customerIdFromDb = await LoyaltyCardService.getCustomerIdByUserId(4);
        if (customerIdFromDb) {
          customerId = customerIdFromDb;
          console.log('Found customer ID for user 4:', customerId);
        }
      }
      
      const result = await LoyaltyCardService.redeemPromoCode(
        selectedBusiness,
        promoCode.trim(),
        customerId
      );
      
      if (result.success) {
        setPromoCodeStatus({ 
          isLoading: false, 
          success: true, 
          message: result.message
        });
        
        // If there's an updated card, refresh the cards list
        if (result.updatedCard) {
          await loadCards();
        }
        
        // Clear input and close modal
        setPromoCode('');
        
        // Clear status and close modal after 3 seconds
        setTimeout(() => {
          setPromoCodeStatus(null);
          setShowPromoCodeModal(false);
        }, 3000);
      } else {
        setPromoCodeStatus({ 
          isLoading: false, 
          success: false, 
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error redeeming promo code:', error);
      setPromoCodeStatus({ 
        isLoading: false, 
        success: false, 
        message: t('An error occurred while redeeming the promo code')
      });
    }
  };
  
  const handleEnrollInProgram = async () => {
    if (!selectedBusiness) return;
    
    setIsLoading(true);
    try {
      let customerId = user?.id.toString() || '';
      
      // Special case for user ID 4 - make sure we get the correct customer ID
      if (customerId === '4') {
        const customerIdFromDb = await LoyaltyCardService.getCustomerIdByUserId(4);
        if (customerIdFromDb) {
          customerId = customerIdFromDb;
          console.log('Found customer ID for user 4:', customerId);
        }
      }
      
      const selectedBusinessData = businesses.find(b => b.id === selectedBusiness);
      
      if (selectedBusinessData && selectedBusinessData.programs.length > 0) {
        const programId = selectedBusinessData.programs[0].id; // Use first program
        
        // Enroll customer in program
        const newCard = await LoyaltyCardService.enrollCustomerInProgram(
          customerId,
          selectedBusiness,
          programId
        );
        
        if (newCard) {
          // Refresh cards
          await loadCards();
          setPromoCodeStatus({ 
            isLoading: false, 
            success: true, 
            message: t('Successfully joined loyalty program')
          });
          
          setTimeout(() => setPromoCodeStatus(null), 3000);
        }
      }
    } catch (error) {
      console.error('Error enrolling in program:', error);
      setPromoCodeStatus({ 
        isLoading: false, 
        success: false, 
        message: t('Failed to join loyalty program')
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSharePromoCode = (code: string) => {
    setCodeToShare(code);
    setShowShareModal(true);
  };
  
  return (
    <CustomerLayout>
      <div className="px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('My Loyalty Cards')}</h1>
            <p className="text-gray-600">{t('View and manage your loyalty cards and rewards')}</p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <button
              onClick={() => setShowPromoCodeModal(true)}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors flex items-center gap-2"
            >
              <Tag className="w-4 h-4" />
              {t('Enter Promo Code')}
            </button>
            <button
              onClick={handleEnrollInProgram}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('Join Program')}
            </button>
          </div>
        </div>
        
        {/* Redemption status */}
        {redemptionStatus && (
          <div 
            className={`mb-6 p-4 rounded-lg border ${
              redemptionStatus.isLoading ? 'bg-blue-50 border-blue-200' :
              redemptionStatus.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {redemptionStatus.isLoading ? (
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              ) : redemptionStatus.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              
              <div>
                <p className={`font-medium ${
                  redemptionStatus.isLoading ? 'text-blue-700' :
                  redemptionStatus.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {redemptionStatus.isLoading ? t('Processing...') : 
                   redemptionStatus.success ? t('Success!') : t('Error')}
                </p>
                <p className="text-sm text-gray-600">{redemptionStatus.message}</p>
                
                {redemptionStatus.success && redemptionStatus.reward && (
                  <div className="mt-2 p-3 bg-white rounded-md border border-green-200">
                    <p className="font-medium text-gray-800">{redemptionStatus.reward.name}</p>
                    <p className="text-sm text-gray-600">{redemptionStatus.reward.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('Show this to a staff member to claim your reward')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Promo code status */}
        {promoCodeStatus && (
          <div 
            className={`mb-6 p-4 rounded-lg border ${
              promoCodeStatus.isLoading ? 'bg-blue-50 border-blue-200' :
              promoCodeStatus.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {promoCodeStatus.isLoading ? (
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              ) : promoCodeStatus.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              
              <div>
                <p className={`font-medium ${
                  promoCodeStatus.isLoading ? 'text-blue-700' :
                  promoCodeStatus.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {promoCodeStatus.isLoading ? t('Processing...') : 
                   promoCodeStatus.success ? t('Success!') : t('Error')}
                </p>
                <p className="text-sm text-gray-600">{promoCodeStatus.message}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Cards section */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <CreditCard className="mr-2 h-5 w-5 text-blue-500" />
            {t('Your Loyalty Cards')}
          </h2>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : cards.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {cards.map((card, index) => (
                <LoyaltyCard 
                  key={card.id || index}
                  card={card}
                  onRedeemReward={(reward) => handleRedeemReward(reward, card.id)}
                  onShareCode={() => handleSharePromoCode(card.promoCode || '')}
                />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <div className="flex justify-center mb-4">
                <CreditCard className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {t('No Loyalty Cards Yet')}
              </h3>
              <p className="text-gray-500 mb-4">
                {t('Join a loyalty program to start earning rewards')}
              </p>
              <button
                onClick={() => setShowPromoCodeModal(true)}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('Join Program')}
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Promo Code Modal */}
      {showPromoCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">{t('Enter Promo Code')}</h2>
              <button 
                onClick={() => {
                  setShowPromoCodeModal(false);
                  setPromoCodeStatus(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <label htmlFor="businessSelect" className="block text-sm font-medium text-gray-700 mb-1">
                {t('Select Business')}
              </label>
              <select
                id="businessSelect"
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {businesses.map(business => (
                  <option key={business.id} value={business.id}>{business.name}</option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label htmlFor="promoCodeInput" className="block text-sm font-medium text-gray-700 mb-1">
                {t('Promo Code')}
              </label>
              <input
                id="promoCodeInput"
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Enter code (e.g. B12-C34-ABCDEF)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('Get a promo code from friends to earn bonus points')}
              </p>
            </div>
            
            <button
              onClick={handleRedeemPromoCode}
              disabled={!promoCode.trim() || !selectedBusiness || promoCodeStatus?.isLoading}
              className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md transition-colors flex items-center justify-center gap-2"
            >
              {promoCodeStatus?.isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Gift className="w-4 h-4" />
              )}
              {t('Redeem Code')}
            </button>
            
            <div className="mt-4">
              <button
                onClick={handleEnrollInProgram}
                disabled={!selectedBusiness || isLoading}
                className="w-full py-2 px-4 bg-white border border-blue-500 hover:bg-blue-50 text-blue-600 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {t('Join Program Instead')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">{t('Share Promo Code')}</h2>
              <button 
                onClick={() => {
                  setShowShareModal(false);
                  setCodeToShare('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div className="text-center mb-6">
              <div className="bg-blue-50 p-4 rounded-lg inline-block mx-auto mb-4">
                <QrCode className="w-16 h-16 text-blue-700" />
              </div>
              <p className="text-gray-600 mb-2">
                {t('Share this code with friends to give them 100 bonus points!')}
              </p>
              <div className="bg-gray-100 p-3 rounded-md font-mono text-lg font-medium">
                {codeToShare}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(codeToShare);
                  alert(t('Code copied to clipboard!'));
                }}
                className="py-2 px-4 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <Clipboard className="w-4 h-4" />
                {t('Copy')}
              </button>
              <button
                onClick={() => {
                  try {
                    navigator.share({
                      title: t('Join my loyalty program'),
                      text: t('Use my referral code to get 100 bonus points: {{code}}', { code: codeToShare }),
                    });
                  } catch (error) {
                    console.error('Error sharing:', error);
                    alert(t('Sharing not supported on this device'));
                  }
                }}
                className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <Share className="w-4 h-4" />
                {t('Share')}
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
};

export default LoyaltyCardsPage; 