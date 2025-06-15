import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { UserQrCodeService } from '../services/userQrCodeService';
import { StandardQrCodeData } from '../utils/standardQrCodeGenerator';
import { Clock, RefreshCw, Shield, CreditCard, BadgeCheck, Tag, User } from 'lucide-react';

export interface QRCardProps {
  userId: string;
  userName: string;
  cardNumber?: string;
  cardType?: string;
  cardId?: string;
  businessId?: string;
  points?: number;
  onCardReady?: (cardNumber: string) => void;
}

export const QRCard: React.FC<QRCardProps> = ({ 
  userId, 
  userName, 
  cardNumber, 
  cardType = "STANDARD",
  cardId = "",
  businessId = "",
  points = 0,
  onCardReady 
}) => {
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
  const [enrolledPrograms, setEnrolledPrograms] = useState<any[]>([]);
  const [availablePromos, setAvailablePromos] = useState<number>(0);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [useFallback, setUseFallback] = useState<boolean>(false);
  
  // Create a more user-friendly display name
  const getDisplayName = (): string => {
    // If we have a proper name, use it
    if (userName && userName !== 'Customer User' && userName !== 'Customer') {
      return userName;
    }
    
    // Try to extract a name from email if username looks like an email
    if (userName && userName.includes('@')) {
      const emailParts = userName.split('@');
      return emailParts[0].charAt(0).toUpperCase() + emailParts[0].slice(1);
    }
    
    // Last resort, use a translated generic name
    return t('user.defaultName', 'Customer');
  };

  // Get user initials for avatar fallback
  const getUserInitials = (): string => {
    if (!userName || userName === 'Customer' || userName === 'Customer User') {
      return 'C';
    }
    
    // If it looks like an email address
    if (userName.includes('@')) {
      return userName.split('@')[0].charAt(0).toUpperCase();
    }
    
    // Get initials from name parts
    const nameParts = userName.trim().split(' ');
    if (nameParts.length >= 2) {
      return (
        (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0))
        .toUpperCase()
      );
    }
    
    // Single name
    return userName.charAt(0).toUpperCase();
  };

  const displayName = getDisplayName();
  const userInitials = getUserInitials();

  // Generate a deterministic card number based on user ID
  // This ensures the same user always gets the same card number
  const generateUniqueCardNumber = (id: string): string => {
    // Format: CUST-{userId padded to 6 digits}-{checksum digit}
    const paddedId = id.toString().padStart(6, '0');
    
    // Simple checksum calculation (sum of digits modulo 10)
    let sum = 0;
    for (let i = 0; i < paddedId.length; i++) {
      sum += parseInt(paddedId[i]);
    }
    const checksum = sum % 10;
    
    return `CUST-${paddedId}-${checksum}`;
  };

  // Use provided card number or generate a consistent one from user ID
  const actualCardNumber = cardNumber || generateUniqueCardNumber(userId);

  // Create direct QR code from data
  const createFallbackQrCode = () => {
    try {
      console.log('Creating fallback QR code');
      const fallbackData = JSON.stringify({
        customerId: userId,
        cardNumber: actualCardNumber,
        cardId: cardId || "",
        businessId: businessId || "",
        points: points || 0,
        timestamp: Date.now(),
        type: 'CUSTOMER_CARD',
      });
      setQrData(fallbackData);
      setQrImageUrl(null);
      setError(null);
      return true;
    } catch (error) {
      console.error('Error creating fallback QR:', error);
      // If even this fails, use the absolute last resort fallback
      setUseFallback(true);
      return false;
    }
  };

  const fetchQrCode = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      console.log(`Fetching QR code for user ${userId} with card number ${actualCardNumber}`);
      
      // Try to get or create the customer's QR code from the service
      const user = {
        id: parseInt(userId),
        name: userName || displayName,
        email: '',  // Email is not needed here
        role: 'customer',
        user_type: 'customer'
      };
      
      const cardDetails = {
        cardNumber: actualCardNumber,
        cardType: cardType,
        cardId: cardId,
        businessId: businessId,
        points: points
      };
      
      let qrImageUrl = null;
      try {
        qrImageUrl = await UserQrCodeService.getOrCreateCustomerQrCode(user, cardDetails);
        console.log('QR code returned:', qrImageUrl ? 'Yes' : 'No');
      } catch (serviceError) {
        console.error('Error from UserQrCodeService:', serviceError);
      }
      
      if (qrImageUrl) {
        console.log('QR code data URL received, length:', qrImageUrl.length);
        setDebugInfo({
          dataType: typeof qrImageUrl,
          isDataUrl: qrImageUrl.startsWith('data:'),
          length: qrImageUrl.length,
        });
        
        // Case 1: We got a data URL directly - use it
        if (qrImageUrl.startsWith('data:image')) {
          setQrImageUrl(qrImageUrl);
          setQrData(null); // No need for QR data when we have an image
          setError(null); // Clear any previous errors
          console.log('Using QR image data URL');
        } 
        // Case 2: We got a JSON string or other format - parse and use for QRCodeSVG
        else {
          try {
            // Check if it's JSON data
            let parsedData;
            try {
              parsedData = JSON.parse(qrImageUrl);
              setQrData(JSON.stringify(parsedData));
              setQrImageUrl(null);
              console.log('Parsed QR data as JSON');
            } catch (parseError) {
              // Not valid JSON, use as URL or data directly
              setQrData(qrImageUrl); // Use as raw data
              setQrImageUrl(null);
              console.log('Using QR raw data');
            }
            
            setError(null); // Clear any previous errors
          } catch (parseError) {
            console.error('Error parsing QR data:', parseError);
            // Try fallback
            if (!createFallbackQrCode()) {
              setError('Error processing QR code data. Please try again.');
            }
          }
        }
        
        // Format the card display code (last 6 characters)
        setUniqueCode(actualCardNumber.slice(-6));
        
        // Notify parent that card is ready
        if (onCardReady) {
          onCardReady(actualCardNumber);
        }
        
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
            // Set default expiration date (365 days from now - longer expiration)
            const defaultExpDate = new Date();
            defaultExpDate.setDate(defaultExpDate.getDate() + 365);
            setExpirationDate(defaultExpDate.toLocaleDateString());
          }
        } catch (detailsError) {
          console.error('Error getting QR details:', detailsError);
          // Set default expiration date
          const defaultExpDate = new Date();
          defaultExpDate.setDate(defaultExpDate.getDate() + 365);
          setExpirationDate(defaultExpDate.toLocaleDateString());
        }
        
        // Fetch enrolled programs
        try {
          const programs = await UserQrCodeService.getCustomerEnrolledPrograms(userId);
          setEnrolledPrograms(programs || []);
        } catch (programsError) {
          console.error('Error fetching enrolled programs:', programsError);
        }
        
        // Fetch available promos
        try {
          const promos = await UserQrCodeService.getCustomerAvailablePromoCodes(userId);
          setAvailablePromos(promos.length || 0);
        } catch (promosError) {
          console.error('Error fetching available promos:', promosError);
        }
      } else {
        console.error('No QR image URL returned from service');
        
        // Try to create a fallback QR code directly
        if (!createFallbackQrCode()) {
          setError('Could not load your loyalty card. Please try again later.');
        }
      }
    } catch (err) {
      console.error('Error getting QR code:', err);
      
      // Try to create a fallback QR code directly
      if (!createFallbackQrCode()) {
        setError('Could not load your loyalty card');
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
  }, [userId, userName, cardType]);

  // Retry logic with exponential backoff
  useEffect(() => {
    if (error && retryCount < 3) {
      const retryDelay = Math.pow(2, retryCount) * 1000; // exponential backoff
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        fetchQrCode();
      }, retryDelay);
      
      return () => clearTimeout(timer);
    }
  }, [error, retryCount]);

  // Last resort fallback: if all QR code methods fail after retries
  useEffect(() => {
    if (retryCount >= 3 && error) {
      setUseFallback(true);
    }
  }, [retryCount, error]);

  const handleRefreshQrCode = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRetryCount(0);
    setUseFallback(false);
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
        <div className="flex justify-center items-center mb-2">
          {/* User Avatar/Initials */}
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-2 text-sm font-medium">
            {userInitials}
          </div>
          <h2 className="text-xl font-semibold text-gray-800">{displayName}</h2>
        </div>
        <p className="text-sm text-gray-500">{t('qrCard.showToCollect', 'Show this card to collect points')}</p>
      </div>
      
      {error && !useFallback && (
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
      
      <div className="flex justify-center p-4 bg-white rounded-lg mb-4">
        {qrImageUrl && !useFallback ? (
          // Direct image display from URL or data URL
          <img 
            src={qrImageUrl} 
            alt="QR Code" 
            className="mx-auto"
            width={250}
            height={250}
            onError={(e) => {
              console.error('Failed to load QR image');
              setError('QR image failed to load. Please try again later.');
              createFallbackQrCode();
            }}
          />
        ) : qrData && !useFallback ? (
          // QR Code SVG generation
          <div className="border border-gray-200 p-4 rounded-lg">
            <QRCodeSVG 
              value={qrData} 
              size={250} 
              includeMargin={true}
              level="M" // Error correction level
            />
          </div>
        ) : useFallback ? (
          // Absolute last resort: Direct QR code generation
          <div className="border border-gray-200 p-4 rounded-lg">
            <QRCodeSVG 
              value={JSON.stringify({
                cardNumber: actualCardNumber,
                userId: userId,
                timestamp: Date.now()
              })}
              size={250} 
              includeMargin={true}
              level="L" // Low error correction level for simplicity
            />
          </div>
        ) : (
          // No QR code available
          <div className="flex flex-col items-center justify-center h-64 w-64 border border-red-200 rounded-lg">
            <Shield className="text-red-500 h-12 w-12 mb-4" />
            <div className="text-red-500 text-center">
              {t('qrCard.noQrCode', 'No QR code available')}
              <button 
                onClick={handleRefreshQrCode} 
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md block mx-auto"
                disabled={isRefreshing}
              >
                {isRefreshing ? t('qrCard.retrying', 'Retrying...') : t('qrCard.retry', 'Try Again')}
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="border-t border-gray-100 pt-4 mt-2 space-y-2">
        {/* Card Details */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">{t('qrCard.cardNumber', 'Card Number')}:</span>
          <span className="font-medium">{actualCardNumber}</span>
        </div>
        
        {/* Expiration Date */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 flex items-center">
            <Clock className="h-3 w-3 inline mr-1" />
            {t('qrCard.expires', 'Expires')}:
          </span>
          <span className={`font-medium ${isExpiringSoon ? 'text-amber-600' : ''}`}>
            {expirationDate}
            {isExpiringSoon && ' (Soon)'}
          </span>
        </div>
        
        {/* Program Enrollment Info */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 flex items-center">
            <BadgeCheck className="h-3 w-3 inline mr-1" />
            {t('qrCard.programs', 'Programs')}:
          </span>
          <span className="font-medium">{enrolledPrograms.length}</span>
        </div>
        
        {/* Available Promos */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 flex items-center">
            <Tag className="h-3 w-3 inline mr-1" />
            {t('qrCard.promos', 'Available Promos')}:
          </span>
          <span className="font-medium">{availablePromos}</span>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="mt-4 flex justify-between">
        <button 
          onClick={handleRefreshQrCode} 
          className="text-blue-600 text-sm flex items-center"
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3 mr-1" />
          )}
          {t('qrCard.refresh', 'Refresh')}
        </button>
        
        <div className="flex items-center text-green-600 text-xs">
          <Shield className="h-3 w-3 mr-1" />
          {t('qrCard.secureCard', 'Secure Card')}
        </div>
      </div>
    </div>
  );
};