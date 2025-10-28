import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCard } from '../../components/QRCard';
import { useAuth } from '../../contexts/AuthContext';
import { UserQrCodeService } from '../../services/userQrCodeService';
import { CheckCircle, AlertCircle, ShoppingBag, Gift } from 'lucide-react';

export const QrCardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [cardNumber, setCardNumber] = useState<string | null>(null);
  const [enrolledPrograms, setEnrolledPrograms] = useState<any[]>([]);
  const [availablePromos, setAvailablePromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchCardInfo = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        
        // Get customer card info
        const cardInfo = await UserQrCodeService.getCustomerCardInfo(user.id);
        
        // Set card number from consistent generation
        setCardNumber(cardInfo.cardNumber);
        
        // Set enrolled programs and promo codes
        setEnrolledPrograms(cardInfo.programs || []);
        setAvailablePromos(cardInfo.promoCodes || []);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching card info:', err);
        setError('Failed to load your loyalty card information');
        setLoading(false);
      }
    };
    
    fetchCardInfo();
  }, [user?.id]);

  const handleCardReady = (newCardNumber: string) => {
    setCardNumber(newCardNumber);
  };

  const handleJoinProgram = async (programId: number, businessId: number) => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  const handleClaimPromo = async (promoId: number) => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t('My QR Card')}</h1>
      
      {successMessage && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-4 flex items-center">
          <CheckCircle className="mr-2 h-5 w-5" />
          {successMessage}
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4 flex items-center">
          <AlertCircle className="mr-2 h-5 w-5" />
          {error}
        </div>
      )}
      
      {/* QR Card Section */}
      <div className="mb-8">
        {user?.id && (
          <QRCard 
            userId={user.id.toString()} 
            userName={user.name || user.email?.split('@')[0] || 'Customer'} 
            cardNumber={cardNumber || undefined} 
            onCardReady={handleCardReady}
          />
        )}
      </div>
      
      {/* Programs Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3 flex items-center">
          <ShoppingBag className="mr-2 h-5 w-5 text-blue-600" />
          {t('My Programs')}
        </h2>
        
        {loading ? (
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
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3 flex items-center">
          <Gift className="mr-2 h-5 w-5 text-purple-600" />
          {t('Active Rewards')}
        </h2>
        
        {loading ? (
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
                      disabled={loading}
                    >
                      {t('Claim')}
                    </button>
                  ) : (
                    <span className="text-xs text-green-600 font-medium flex items-center">
                      <CheckCircle className="mr-1 h-3 w-3" />
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
    </div>
  );
};

export default QrCardPage; 