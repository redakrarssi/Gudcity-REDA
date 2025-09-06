import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { QRCard } from '../../components/QRCard';
import { 
  QrCode, Smartphone, Download, Share, RefreshCw, 
  Info, Shield, CheckCircle2, Copy, AlertCircle,
  CreditCard, Tag, BadgeCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserQrCodeService } from '../../services/userQrCodeService';

const CustomerQrCard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [animateIn, setAnimateIn] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState<string | null>(null);
  const [enrolledPrograms, setEnrolledPrograms] = useState<any[]>([]);
  const [availablePromos, setAvailablePromos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Trigger animation after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimateIn(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchCardInfo = async () => {
      if (!user?.id) return;
      
      try {
        setIsLoading(true);
        
        // Get customer card info with all relevant data
        const cardInfo = await UserQrCodeService.getCustomerCardInfo(user.id);
        
        // Set card number from consistent generation
        setCardNumber(cardInfo.cardNumber);
        
        // Set enrolled programs and promo codes
        setEnrolledPrograms(cardInfo.programs || []);
        setAvailablePromos(cardInfo.promoCodes || []);
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching card info:', err);
        setError(t('qrCard.failedToLoadLoyaltyCard'));
        setIsLoading(false);
      }
    };
    
    fetchCardInfo();
  }, [user?.id]);

  const handleCardReady = (newCardNumber: string) => {
    setCardNumber(newCardNumber);
  };

  const handleJoinProgram = async (programId: number, businessId: number) => {
    try {
      setIsLoading(true);
      const success = await UserQrCodeService.enrollCustomerInProgram(
        user?.id || '', 
        programId,
        businessId
      );
      
      if (success) {
        setSuccessMessage(t('qrCard.successfullyJoinedProgram'));
        
        // Refresh programs list
        const programs = await UserQrCodeService.getCustomerEnrolledPrograms(user?.id || '');
        setEnrolledPrograms(programs || []);
        
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        setError(t('qrCard.failedToJoinProgram'));
        setTimeout(() => {
          setError(null);
        }, 3000);
      }
    } catch (err) {
      console.error('Error joining program:', err);
      setError(t('qrCard.failedToJoinProgram'));
      setTimeout(() => {
        setError(null);
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimPromo = async (promoId: number) => {
    try {
      setIsLoading(true);
      const success = await UserQrCodeService.assignPromoCodeToCustomer(
        user?.id || '', 
        promoId
      );
      
      if (success) {
        setSuccessMessage(t('qrCard.successfullyClaimedPromo'));
        
        // Refresh promo codes list
        const promos = await UserQrCodeService.getCustomerAvailablePromoCodes(user?.id || '');
        setAvailablePromos(promos || []);
        
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        setError(t('qrCard.failedToClaimPromo'));
        setTimeout(() => {
          setError(null);
        }, 3000);
      }
    } catch (err) {
      console.error('Error claiming promo code:', err);
      setError(t('qrCard.failedToClaimPromo'));
      setTimeout(() => {
        setError(null);
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyId = () => {
    if (!cardNumber) return;
    
    navigator.clipboard.writeText(cardNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = async () => {
    if (!cardNumber) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('qrCard.myLoyaltyCard'),
          text: t('qrCard.scanMyLoyaltyCard', { cardNumber }),
        });
      } catch (shareError) {
        console.error('Error sharing:', shareError);
        // Fallback to copy
        handleCopyId();
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      handleCopyId();
    }
  };

  // Check if user is available
  if (!user) {
    return (
      <CustomerLayout>
        <div className="flex justify-center items-center h-64">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 w-full max-w-lg signin-message">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400 signin-icon" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 signin-text">
                  {t('qrCard.pleaseSignInToView')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto pb-12 qr-card-page customer-qrcard-page">
        {/* Header */}
        <div className={`transition-all duration-500 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div className="qr-card-header customer-qrcard-header">
              <h1 className="text-2xl font-semibold text-gray-800 flex items-center header-title customer-qrcard-title">
                <CreditCard className="w-6 h-6 text-blue-500 mr-2" />
                {t('qrCard.yourLoyaltyCard')}
              </h1>
              <p className="text-gray-500 mt-1 header-subtitle customer-qrcard-subtitle">{t('qrCard.useThisCardToCollect')}</p>
            </div>
          </div>
        </div>

        {/* Display success message if any */}
        {successMessage && (
          <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 success-message customer-qrcard-success">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-500 success-icon customer-qrcard-success-icon" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700 success-text customer-qrcard-success-text">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Display errors if any */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 error-message customer-qrcard-error">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500 error-icon customer-qrcard-error-icon" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 error-text customer-qrcard-error-text">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* QR Card Section */}
        <div className={`mb-8 transition-all duration-500 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden qr-card-container customer-qrcard-container">
            <div className="p-6 qr-card-content customer-qrcard-content">
              {user?.id && (
                <QRCard 
                  userId={user.id.toString()} 
                  displayName={user.name || user.email?.split('@')[0] || t('qrCard.customer')} 
                  onCardReady={handleCardReady}
                />
              )}
            </div>
            
            {/* Card Actions */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 card-actions customer-qrcard-actions">
              <div className="flex flex-wrap justify-center gap-4 customer-qrcard-actions-grid">
                <button 
                  onClick={handleCopyId} 
                  className="flex items-center text-gray-600 hover:text-blue-600 text-sm transition-colors action-button customer-qrcard-action-button"
                >
                  <Copy className="h-4 w-4 mr-1 action-icon customer-qrcard-action-icon" />
                  {copied ? t('qrCard.copied') : t('qrCard.copyCardNumber')}
                </button>
                
                <button 
                  onClick={handleShare} 
                  className="flex items-center text-gray-600 hover:text-blue-600 text-sm transition-colors action-button customer-qrcard-action-button"
                >
                  <Share className="h-4 w-4 mr-1 action-icon customer-qrcard-action-icon" />
                  {t('qrCard.shareCard')}
                </button>
                
                <button 
                  onClick={() => window.print()} 
                  className="flex items-center text-gray-600 hover:text-blue-600 text-sm transition-colors action-button customer-qrcard-action-button"
                >
                  <Download className="h-4 w-4 mr-1 action-icon customer-qrcard-action-icon" />
                  {t('qrCard.printCard')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Programs Section */}
        <div className={`mb-8 transition-all duration-500 ease-out transform delay-100 programs-section customer-qrcard-programs ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <h2 className="text-xl font-semibold mb-3 flex items-center programs-title customer-qrcard-programs-title">
            <BadgeCheck className="mr-2 h-5 w-5 text-blue-600 programs-icon customer-qrcard-programs-icon" />
            {t('qrCard.myPrograms')}
          </h2>
          
          {isLoading ? (
            <div className="animate-pulse bg-gray-100 h-32 rounded-lg customer-qrcard-loading"></div>
          ) : enrolledPrograms.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 programs-grid customer-qrcard-programs-grid">
              {enrolledPrograms.map((program) => (
                <div 
                  key={program.id} 
                  className="bg-white shadow-md rounded-lg p-4 border border-gray-200 program-card customer-qrcard-program-card"
                >
                  <div className="flex justify-between items-center program-header customer-qrcard-program-header">
                    <h3 className="font-medium program-name customer-qrcard-program-name">{program.programName}</h3>
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded program-tier customer-qrcard-program-tier">
                      {program.tierLevel}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 program-points customer-qrcard-program-points">
                    {t('qrCard.points')}: {program.points}
                  </p>
                  <p className="text-xs text-gray-500 mt-2 program-joined customer-qrcard-program-joined">
                    {t('qrCard.joined')}: {new Date(program.joinDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center empty-programs customer-qrcard-empty-programs">
              <p className="text-gray-600 mb-4 empty-title customer-qrcard-empty-title">{t('qrCard.youHaveNotJoinedAnyPrograms')}</p>
              <p className="text-sm text-gray-500 empty-description customer-qrcard-empty-description">
                {t('qrCard.showYourQrCardToJoin')}
              </p>
            </div>
          )}
        </div>
        
        {/* Promos Section */}
        <div className={`mb-8 transition-all duration-500 ease-out transform delay-200 promos-section customer-qrcard-promos ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <h2 className="text-xl font-semibold mb-3 flex items-center promos-title customer-qrcard-promos-title">
            <Tag className="mr-2 h-5 w-5 text-purple-600 promos-icon customer-qrcard-promos-icon" />
            {t('qrCard.availablePromos')}
          </h2>
          
          {isLoading ? (
            <div className="animate-pulse bg-gray-100 h-32 rounded-lg customer-qrcard-loading"></div>
          ) : availablePromos.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 promos-grid customer-qrcard-promos-grid">
              {availablePromos.map((promo) => (
                <div 
                  key={promo.id} 
                  className="bg-white shadow-md rounded-lg p-4 border border-gray-200 promo-card customer-qrcard-promo-card"
                >
                  <div className="flex justify-between items-center promo-header customer-qrcard-promo-header">
                    <h3 className="font-medium promo-code customer-qrcard-promo-code">{promo.code}</h3>
                    <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded promo-discount customer-qrcard-promo-discount">
                      {promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}% OFF` : `$${promo.discountValue} OFF`}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 promo-description customer-qrcard-promo-description">
                    {promo.description || t('qrCard.specialDiscountOffer')}
                  </p>
                  <div className="flex justify-between items-center mt-4 promo-details customer-qrcard-promo-details">
                    <p className="text-xs text-gray-500 promo-expiry customer-qrcard-promo-expiry">
                      {t('qrCard.expires')}: {new Date(promo.endDate).toLocaleDateString()}
                    </p>
                    {!promo.claimed ? (
                      <button
                        onClick={() => handleClaimPromo(promo.id)}
                        className="px-3 py-1 bg-purple-600 text-white rounded-md text-sm promo-claim customer-qrcard-promo-claim"
                        disabled={isLoading}
                      >
                        {t('qrCard.claim')}
                      </button>
                    ) : (
                      <span className="text-xs text-green-600 font-medium flex items-center customer-qrcard-promo-claimed">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {t('qrCard.claimed')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center empty-promos">
              <p className="text-gray-600 mb-4 empty-title">{t('qrCard.noPromoCodesAvailable')}</p>
              <p className="text-sm text-gray-500 empty-description">
                {t('qrCard.showYourQrCardToReceive')}
              </p>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className={`transition-all duration-500 ease-out transform delay-300 security-section ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start">
            <Shield className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0 security-icon" />
            <div>
              <h3 className="text-sm font-medium text-blue-800 security-title">{t('qrCard.securityInformation')}</h3>
              <p className="text-sm text-blue-600 mt-1 security-description">{t('qrCard.yourQrCodeIsUnique')}</p>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerQrCard; 