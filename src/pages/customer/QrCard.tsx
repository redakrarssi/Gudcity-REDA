import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { QRCard } from '../../components/QRCard';
import { 
  QrCode, Smartphone, Download, Share, RefreshCw, 
  Info, Shield, CheckCircle2, Copy, AlertCircle,
  CreditCard
} from 'lucide-react';
import { createStandardCustomerQRCode } from '../../utils/standardQrCodeGenerator';
import QRCode from 'qrcode';
import { useAuth } from '../../contexts/AuthContext';
import { LoyaltyCardService } from '../../services/loyaltyCardService';
import { UserQrCodeService } from '../../services/userQrCodeService';
import { v4 as uuidv4 } from 'uuid';

const CustomerQrCard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [animateIn, setAnimateIn] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardDetails, setCardDetails] = useState<{
    cardNumber?: string,
    joinedPrograms: number,
    availableRewards: number
  }>({
    cardNumber: undefined,
    joinedPrograms: 0,
    availableRewards: 0
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Debug logging to identify user data
  console.log('Current user data in QR card page:', user);

  // Trigger animation after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimateIn(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  // Generate or fetch customer loyalty card when component mounts
  useEffect(() => {
    const setupCustomerCard = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Try to get existing customer QR card details
        const qrDetails = await UserQrCodeService.getQrCodeDetails(user.id.toString());
        
        // If no card exists or we need to regenerate, create a new unique card
        if (!qrDetails || !qrDetails.cardNumber) {
          setIsGenerating(true);
          
          // Generate a unique card number
          const cardNumber = `${user.id}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
          
          // Create a new QR code with this card number
          await UserQrCodeService.generateCustomerQrCode(user, {
            cardNumber: cardNumber,
            cardType: 'MASTER'
          });
          
          // Update card details
          setCardDetails(prev => ({
            ...prev,
            cardNumber: cardNumber
          }));
          
          setIsGenerating(false);
        } else {
          // Use existing card details
          setCardDetails(prev => ({
            ...prev,
            cardNumber: qrDetails.cardNumber
          }));
        }
        
        // Get loyalty cards for this customer
        const cards = await LoyaltyCardService.getCustomerCards(user.id.toString());
        
        // Calculate stats
        const joinedPrograms = cards.length;
        const availableRewards = cards.reduce((total, card) => {
          // We need to ensure card.availableRewards exists and is an array
          return total + (Array.isArray(card.availableRewards) ? 
            card.availableRewards.filter(r => r && r.isRedeemable).length : 0);
        }, 0);
        
        setCardDetails(prev => ({
          ...prev,
          joinedPrograms,
          availableRewards
        }));
      } catch (error) {
        console.error('Error loading card data:', error);
        setError('Failed to load your loyalty card data');
      } finally {
        setIsLoading(false);
      }
    };
    
    setupCustomerCard();
  }, [user]);

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

  // Ensure we have a valid user name
  const userName = user.name || t('customer.defaultName', 'Customer');

  const handleDownloadQR = async () => {
    setIsDownloading(true);
    try {
      const qrData = { 
        type: 'CUSTOMER_CARD', 
        customerId: user.id, 
        customerName: userName,
        qrUniqueId: uuidv4(),
        timestamp: Date.now(),
        version: '1.0',
        cardNumber: cardDetails.cardNumber
      };
      
      // Generate QR code as data URL from JSON string
      const dataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        errorCorrectionLevel: 'M',
        margin: 4,
        width: 300
      });
      
      // Create download link
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `loyalty-card-${user.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading QR card:', error);
      setError('Failed to download QR card. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(cardDetails.cardNumber || user.id.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Loyalty Card',
          text: `Scan my loyalty card (ID: ${cardDetails.cardNumber || user.id})`,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      handleCopyId();
    }
  };
  
  const handleRegenerateCard = async () => {
    if (isGenerating) return;
    
    try {
      setIsGenerating(true);
      setError(null);
      
      // Generate a new card number
      const cardNumber = `${user.id}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      // Create a new QR code with this card number
      await UserQrCodeService.generateCustomerQrCode(user, {
        cardNumber: cardNumber,
        cardType: 'MASTER'
      });
      
      // Update card details
      setCardDetails(prev => ({
        ...prev,
        cardNumber: cardNumber
      }));
      
    } catch (error) {
      console.error('Error regenerating card:', error);
      setError('Failed to regenerate your loyalty card');
    } finally {
      setIsGenerating(false);
    }
  };

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

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}

        {!isLoading && (
          <>
            {/* Main Card Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm text-gray-500">{t('Card Number')}</h3>
                <p className="text-lg font-semibold">{cardDetails.cardNumber || `${user.id}-0000`}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm text-gray-500">{t('Joined Programs')}</h3>
                <p className="text-lg font-semibold">{cardDetails.joinedPrograms}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm text-gray-500">{t('Available Rewards')}</h3>
                <p className="text-lg font-semibold">{cardDetails.availableRewards}</p>
              </div>
            </div>

            {/* Main QR Code Card */}
            <div className={`transition-all duration-500 ease-out transform delay-100 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 md:p-8 border border-blue-100 shadow-lg text-center relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-200 rounded-full opacity-20 transform translate-x-20 -translate-y-20"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-200 rounded-full opacity-20 transform -translate-x-20 translate-y-20"></div>
                
                {/* QR Card */}
                <div className="relative z-10 transform transition-transform duration-500 hover:scale-105">
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center h-72 w-72 mx-auto">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                      <p className="mt-4 text-sm text-gray-600">{t('Generating your unique QR card...')}</p>
                    </div>
                  ) : (
                    <QRCard 
                      userId={user.id.toString()} 
                      userName={userName} 
                      cardNumber={cardDetails.cardNumber}
                      cardType="MASTER"
                    />
                  )}
                </div>
                
                {/* Info text */}
                <p className="text-gray-600 mt-6 max-w-md mx-auto">
                  {t('Present this card when making purchases to collect and redeem loyalty points')}
                </p>
                
                {/* Action buttons */}
                <div className="flex flex-wrap justify-center gap-3 mt-6">
                  <button
                    onClick={handleDownloadQR}
                    disabled={isDownloading || isGenerating}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {t(isDownloading ? 'Downloading...' : 'Download')}
                  </button>
                  
                  <button
                    onClick={handleShare}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Share className="w-4 h-4" />
                    {t('Share')}
                  </button>
                  
                  <button
                    onClick={handleRegenerateCard}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {t('Regenerate Card')}
                  </button>
                  
                  <button
                    onClick={() => setShowInfo(!showInfo)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    <Info className="w-4 h-4" />
                    {t(showInfo ? 'Hide Info' : 'More Info')}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Additional info section */}
            {showInfo && (
              <div className={`mt-6 bg-white rounded-xl p-6 border border-gray-200 shadow-sm transition-all duration-300 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                  <Info className="w-5 h-5 text-blue-500 mr-2" />
                  {t('About Your Loyalty Card')}
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <Shield className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-gray-700">{t('Secure Identification')}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('Your loyalty card contains a secure identifier linked to your account. No personal information is stored on the card itself.')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Smartphone className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-gray-700">{t('Always Available')}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('Save this card to your phone or print it out to always have it available, even without internet access.')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-gray-700">{t('Universal Use')}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {t('This single loyalty card works across all participating businesses. Join programs, collect points, and redeem rewards!')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 mr-2">{t('Card Number')}:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-700">
                          {cardDetails.cardNumber || `${user.id}-0000`}
                        </code>
                      </div>
                      <button
                        onClick={handleCopyId}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                        title={t('Copy Number')}
                      >
                        {copied ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </CustomerLayout>
  );
};

export default CustomerQrCard; 