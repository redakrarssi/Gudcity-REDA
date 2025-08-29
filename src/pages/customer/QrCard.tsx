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
        setError('Failed to load your loyalty card information');
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
        setSuccessMessage('Successfully joined program!');
        
        // Refresh programs list
        const programs = await UserQrCodeService.getCustomerEnrolledPrograms(user?.id || '');
        setEnrolledPrograms(programs || []);
        
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        setError('Failed to join program');
        setTimeout(() => {
          setError(null);
        }, 3000);
      }
    } catch (err) {
      console.error('Error joining program:', err);
      setError('Failed to join program');
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
        setSuccessMessage('Successfully claimed promo code!');
        
        // Refresh promo codes list
        const promos = await UserQrCodeService.getCustomerAvailablePromoCodes(user?.id || '');
        setAvailablePromos(promos || []);
        
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        setError('Failed to claim promo code');
        setTimeout(() => {
          setError(null);
        }, 3000);
      }
    } catch (err) {
      console.error('Error claiming promo code:', err);
      setError('Failed to claim promo code');
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
          title: 'My Loyalty Card',
          text: `Scan my loyalty card (ID: ${cardNumber})`,
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
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 w-full max-w-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  {t('Please sign in to view your QR card.')}
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
      <div className="max-w-2xl mx-auto pb-12">
        {/* Header */}
        <div className={`transition-all duration-500 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
                <CreditCard className="w-6 h-6 text-blue-500 mr-2" />
                {t('Your Loyalty Card')}
              </h1>
              <p className="text-gray-500 mt-1">{t('Use this card to collect and redeem points at participating businesses')}</p>
            </div>
          </div>
        </div>

        {/* Display success message if any */}
        {successMessage && (
          <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Display errors if any */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* QR Card Section */}
        <div className={`mb-8 transition-all duration-500 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              {user?.id && (
                <QRCard 
                  userId={user.id.toString()} 
                  displayName={user.name || user.email?.split('@')[0] || 'Customer'} 
                  onCardReady={handleCardReady}
                />
              )}
            </div>
            
            {/* Card Actions */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
              <div className="flex flex-wrap justify-center gap-4">
                <button 
                  onClick={handleCopyId} 
                  className="flex items-center text-gray-600 hover:text-blue-600 text-sm transition-colors"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  {copied ? t('Copied!') : t('Copy Card Number')}
                </button>
                
                <button 
                  onClick={handleShare} 
                  className="flex items-center text-gray-600 hover:text-blue-600 text-sm transition-colors"
                >
                  <Share className="h-4 w-4 mr-1" />
                  {t('Share Card')}
                </button>
                
                <button 
                  onClick={() => window.print()} 
                  className="flex items-center text-gray-600 hover:text-blue-600 text-sm transition-colors"
                >
                  <Download className="h-4 w-4 mr-1" />
                  {t('Print Card')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Programs Section */}
        <div className={`mb-8 transition-all duration-500 ease-out transform delay-100 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <h2 className="text-xl font-semibold mb-3 flex items-center">
            <BadgeCheck className="mr-2 h-5 w-5 text-blue-600" />
            {t('My Programs')}
          </h2>
          
          {isLoading ? (
            <div className="animate-pulse bg-gray-100 h-32 rounded-lg"></div>
          ) : enrolledPrograms.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {enrolledPrograms.map((program) => (
                <div 
                  key={program.id} 
                  className="bg-white shadow-md rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">{program.programName}</h3>
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                      {program.tierLevel}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('Points')}: {program.points}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {t('Joined')}: {new Date(program.joinDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <p className="text-gray-600 mb-4">{t('You have not joined any programs yet')}</p>
              <p className="text-sm text-gray-500">
                {t('Show your QR card at participating businesses to join their loyalty programs')}
              </p>
            </div>
          )}
        </div>
        
        {/* Promos Section */}
        <div className={`mb-8 transition-all duration-500 ease-out transform delay-200 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <h2 className="text-xl font-semibold mb-3 flex items-center">
            <Tag className="mr-2 h-5 w-5 text-purple-600" />
            {t('Available Promos')}
          </h2>
          
          {isLoading ? (
            <div className="animate-pulse bg-gray-100 h-32 rounded-lg"></div>
          ) : availablePromos.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {availablePromos.map((promo) => (
                <div 
                  key={promo.id} 
                  className="bg-white shadow-md rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">{promo.code}</h3>
                    <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                      {promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}% OFF` : `$${promo.discountValue} OFF`}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {promo.description || 'Special discount offer'}
                  </p>
                  <div className="flex justify-between items-center mt-4">
                    <p className="text-xs text-gray-500">
                      {t('Expires')}: {new Date(promo.endDate).toLocaleDateString()}
                    </p>
                    {!promo.claimed ? (
                      <button
                        onClick={() => handleClaimPromo(promo.id)}
                        className="px-3 py-1 bg-purple-600 text-white rounded-md text-sm"
                        disabled={isLoading}
                      >
                        {t('Claim')}
                      </button>
                    ) : (
                      <span className="text-xs text-green-600 font-medium flex items-center">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {t('Claimed')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <p className="text-gray-600 mb-4">{t('No promo codes available at the moment')}</p>
              <p className="text-sm text-gray-500">
                {t('Show your QR card at participating businesses to receive special offers')}
              </p>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className={`transition-all duration-500 ease-out transform delay-300 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start">
            <Shield className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">{t('Security Information')}</h3>
              <p className="text-sm text-blue-600 mt-1">{t('Your QR code is unique to you and securely signed. It refreshes automatically to protect your account.')}</p>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerQrCard; 