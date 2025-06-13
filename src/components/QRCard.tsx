import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { UserQrCodeService } from '../services/userQrCodeService';
import { StandardQrCodeData } from '../utils/standardQrCodeGenerator';
import { Clock, RefreshCw, Shield, CreditCard } from 'lucide-react';
import crypto from 'crypto';

interface QRCardProps {
  userId: string;
  userName: string;
  cardNumber?: string;
  cardType?: string;
}

export const QRCard: React.FC<QRCardProps> = ({ userId, userName, cardNumber, cardType = "STANDARD" }) => {
  const { t } = useTranslation();
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uniqueCode, setUniqueCode] = useState<string | null>(null);
  const [expirationDate, setExpirationDate] = useState<string | null>(null);
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Ensure we have a valid display name
  const displayName = userName && userName !== 'Customer User' 
    ? userName 
    : t('user.defaultName', 'Customer');

  // Generate a card number if not provided
  const actualCardNumber = cardNumber || `${userId}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

  const fetchQrCode = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      
      // Get or create the customer's QR code
      const qrImageUrl = await UserQrCodeService.getOrCreateCustomerQrCode({
        id: parseInt(userId),
        name: userName || displayName,
        email: '',  // Email is not needed here
        role: 'customer',
        user_type: 'customer'
      });
      
      if (qrImageUrl) {
        // Case 1: We got a data URL directly - use it
        if (qrImageUrl.startsWith('data:image')) {
          setQrImageUrl(qrImageUrl);
          setQrData(null); // No need for QR data when we have an image
        } 
        // Case 2: We got a JSON string or other format - parse and use for QRCodeSVG
        else {
          try {
            // Check if it's JSON data
            const parsedData = JSON.parse(qrImageUrl);
            // Create standardized QR code data with card info
            const standardData: StandardQrCodeData = {
              type: 'CUSTOMER_CARD',
              qrUniqueId: parsedData.qrUniqueId || crypto.randomUUID(),
              timestamp: Date.now(),
              version: '1.0',
              customerId: userId,
              customerName: displayName,
              // Add card-specific data
              cardNumber: actualCardNumber,
              cardType: cardType
            };
            
            setQrData(JSON.stringify(standardData));
            setQrImageUrl(null);
          } catch (parseError) {
            // Not valid JSON, use as URL or data directly
            setQrImageUrl(qrImageUrl);
            setQrData(null);
          }
        }
        
        setUniqueCode(actualCardNumber.slice(-6));
        
        // Get QR code details including expiration date
        try {
          const qrDetails = await UserQrCodeService.getQrCodeDetails(userId);
          if (qrDetails && qrDetails.expirationDate) {
            const expDate = new Date(qrDetails.expirationDate);
            setExpirationDate(expDate.toLocaleDateString());
            
            // Check if expiring within 7 days
            const now = new Date();
            const daysDifference = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            setIsExpiringSoon(daysDifference <= 7 && daysDifference > 0);
          } else {
            // Set default expiration date (30 days from now)
            const defaultExpDate = new Date();
            defaultExpDate.setDate(defaultExpDate.getDate() + 30);
            setExpirationDate(defaultExpDate.toLocaleDateString());
          }
        } catch (detailsError) {
          console.error('Error getting QR details:', detailsError);
          // Set default expiration date (30 days from now)
          const defaultExpDate = new Date();
          defaultExpDate.setDate(defaultExpDate.getDate() + 30);
          setExpirationDate(defaultExpDate.toLocaleDateString());
        }
      } else {
        // Failed to get QR code, generate a fallback
        const standardData: StandardQrCodeData = {
          type: 'CUSTOMER_CARD',
          qrUniqueId: crypto.randomUUID(),
          timestamp: Date.now(),
          version: '1.0',
          customerId: userId,
          customerName: displayName,
          cardNumber: actualCardNumber,
          cardType: cardType
        };
        
        setQrData(JSON.stringify(standardData));
        setQrImageUrl(null);
        setError('Could not load QR code from server, using locally generated version');
        
        // Set default expiration date (30 days from now)
        const defaultExpDate = new Date();
        defaultExpDate.setDate(defaultExpDate.getDate() + 30);
        setExpirationDate(defaultExpDate.toLocaleDateString());
      }
    } catch (err) {
      console.error('Error getting QR code:', err);
      setError('Could not load your QR code');
      
      // If we've tried less than 3 times, retry after a delay
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchQrCode();
        }, 1000 * Math.pow(2, retryCount)); // Exponential backoff: 1s, 2s, 4s
      } else {
        // After 3 retries, fall back to a generated QR code
        try {
          const standardData: StandardQrCodeData = {
            type: 'CUSTOMER_CARD',
            qrUniqueId: crypto.randomUUID(),
            timestamp: Date.now(),
            version: '1.0',
            customerId: userId,
            customerName: displayName,
            cardNumber: actualCardNumber,
            cardType: cardType
          };
          setQrData(JSON.stringify(standardData));
          setQrImageUrl(null);
          
          // Set default expiration date (30 days from now)
          const defaultExpDate = new Date();
          defaultExpDate.setDate(defaultExpDate.getDate() + 30);
          setExpirationDate(defaultExpDate.toLocaleDateString());
        } catch (fallbackError) {
          console.error('Error creating fallback QR code:', fallbackError);
        }
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchQrCode();
    }
  }, [userId, userName, cardNumber, cardType]);

  const handleRefreshQrCode = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRetryCount(0); // Reset retry count
    fetchQrCode();
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm mx-auto">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 w-64 bg-gray-200 rounded-md"></div>
          <div className="h-4 w-24 bg-gray-200 rounded mt-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm mx-auto relative">
      {/* Card indicator in the corner */}
      <div className="absolute top-2 left-2 flex items-center">
        <CreditCard className="h-4 w-4 text-blue-500 mr-1" />
        <span className="text-xs text-blue-600 font-medium">{cardType}</span>
      </div>
      
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold text-gray-800">{displayName}</h2>
        <p className="text-sm text-gray-500">{t('qrCard.showToCollect', 'Show this card to collect points')}</p>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm flex items-start">
          <div className="flex-1">{error}</div>
          <button 
            onClick={handleRefreshQrCode}
            className="ml-2 text-blue-600 hover:underline flex items-center"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3 mr-1" />
            )}
            Retry
          </button>
        </div>
      )}
      
      <div className="flex justify-center p-4 bg-white rounded-lg">
        {qrImageUrl ? (
          // Direct image display from URL or data URL
          <img 
            src={qrImageUrl} 
            alt="QR Code" 
            className="mx-auto"
            width={250}
            height={250}
          />
        ) : qrData ? (
          // Generate QR code from data using QRCodeSVG
          <QRCodeSVG
            value={qrData}
            size={250}
            level="H" // High error correction for better scanning reliability
            includeMargin={true}
            className="mx-auto"
            bgColor={"#ffffff"}
            fgColor={"#000000"}
          />
        ) : (
          <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">QR code unavailable</p>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-400">ID: {userId}</p>
        {uniqueCode && (
          <p className="text-xs font-medium text-blue-600 mt-1">
            {t('qrCard.cardNumber', 'Card Number')}: {actualCardNumber}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          {t('qrCard.updated', 'Updated')}: {new Date().toLocaleString()}
        </p>
        {expirationDate && (
          <div className={`mt-2 flex items-center justify-center ${isExpiringSoon ? 'text-orange-500' : 'text-gray-500'}`}>
            <Clock className="h-3 w-3 mr-1" />
            <p className="text-xs font-medium">
              {isExpiringSoon 
                ? t('qrCard.expiresSoon', 'Expires Soon: {{date}}', { date: expirationDate })
                : t('qrCard.expires', 'Expires: {{date}}', { date: expirationDate })}
            </p>
          </div>
        )}
        
        <div className="mt-4 flex items-center justify-center text-xs text-green-600">
          <Shield className="w-3 h-3 mr-1" />
          <p>{t('qrCard.secureCard', 'Secure card')}</p>
        </div>
        
        <button 
          onClick={handleRefreshQrCode}
          className="mt-4 text-xs text-blue-600 flex items-center justify-center mx-auto hover:text-blue-800 transition-colors"
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3 mr-1" />
          )}
          {t('qrCard.refresh', 'Refresh Card')}
        </button>
      </div>
    </div>
  );
};