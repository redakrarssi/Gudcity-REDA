import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { UserQrCodeService } from '../services/userQrCodeService';
import { Clock, RefreshCw, Shield, CreditCard, BadgeCheck, Tag, AlertCircle, CheckCircle2, Copy, Share2 } from 'lucide-react';
import sql from '../utils/db';
import { useAuth } from '../contexts/AuthContext';
import { QrCardGenerator } from '../utils/qrCardGenerator';
import { logger } from '../utils/logger';
import { QrCodeStorageService } from '../services/qrCodeStorageService';

export interface QRCardProps {
  userId: string;
  displayName?: string;
  onCardReady?: (cardNumber: string) => void;
}

export const QRCard: React.FC<QRCardProps> = ({
  userId,
  displayName = 'Loyalty Member',
  onCardReady
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardType, setCardType] = useState<string>('standard');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [isExpiringSoon, setIsExpiringSoon] = useState<boolean>(false);
  const [enrolledPrograms, setEnrolledPrograms] = useState<any[]>([]);
  const [availablePromos, setAvailablePromos] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [useFallback, setUseFallback] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [animateIn, setAnimateIn] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [maskUrl, setMaskUrl] = useState<string | null>(null);
  const qrSvgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [qrSize, setQrSize] = useState<number>(250);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownLeftMs, setCooldownLeftMs] = useState<number>(0);

  // Create a more user-friendly display name
  const userInitials = displayName
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
  
  // Get the actual card number to display
  const actualCardNumber = cardNumber || `GC-${userId.substring(0, 8)}`;

  useEffect(() => {
    // Initialize QR code
    const initQrCode = async () => {
      try {
        // First ensure the customer has a valid QR code with the correct structure
        await QrCardGenerator.ensureCustomerHasQrCode(userId);
        
        // Then fetch the QR code
        await fetchQrCode();
      } catch (error) {
        logger.error('Error in QR card initialization:', error);
        setError('Failed to initialize QR card. Please try refreshing.');
        setLoading(false);
      }
    };
    
    initQrCode();
    
    // Animation effect
    const timer = setTimeout(() => {
      setAnimateIn(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [userId]);

  useEffect(() => {
    const fetchCardInfo = async () => {
      if (!userId) return;
      
      try {
        setLoading(true);
        
        // Get customer card info with all relevant data
        try {
          const cardInfo = await UserQrCodeService.getCustomerCardInfo(userId);
          
          // Set card number from consistent generation
          if (cardInfo.cardNumber) {
            setCardNumber(cardInfo.cardNumber);
            
            // Notify parent component if needed
            if (onCardReady) {
              onCardReady(cardInfo.cardNumber);
            }
          }
          
          // Set enrolled programs and promo codes
          setEnrolledPrograms(cardInfo.programs || []);
          setAvailablePromos(cardInfo.promoCodes || []);
          
          // Set expiration date if available
          if (cardInfo.expirationDate) {
            const expDate = new Date(cardInfo.expirationDate);
            setExpirationDate(expDate.toLocaleDateString());
            
            // Check if expiring within 30 days
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            setIsExpiringSoon(expDate <= thirtyDaysFromNow);
          }
        } catch (err) {
          console.error('Error fetching card info:', err);
          // Use fallback values
          setEnrolledPrograms([]);
          setAvailablePromos([]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error in card info effect:', err);
        setLoading(false);
      }
    };
    
    fetchCardInfo();
  }, [userId, onCardReady]);

  // Build an SVG data URL mask from the generated QR SVG to allow gradient fill
  useEffect(() => {
    // Delay to next tick so QR SVG ref is populated
    const id = setTimeout(() => {
      try {
        if (qrSvgRef.current) {
          const svg = qrSvgRef.current.outerHTML;
          const encoded = encodeURIComponent(svg)
            // Ensure proper encoding for Safari
            .replace(/\(/g, '%28')
            .replace(/\)/g, '%29');
          setMaskUrl(`data:image/svg+xml;utf8,${encoded}`);
        }
      } catch (e) {
        // Fallback silently; component will render solid-color QR
        setMaskUrl(null);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [qrData]);

  // Responsive sizing for mobile: compute QR size from container width
  useEffect(() => {
    const computeSize = () => {
      const width = containerRef.current?.clientWidth || window.innerWidth;
      // Use 82% of available width, clamp between 180 and 320px
      const target = Math.min(320, Math.max(180, Math.floor(width * 0.82)));
      setQrSize(target);
    };
    computeSize();
    window.addEventListener('resize', computeSize);
    return () => window.removeEventListener('resize', computeSize);
  }, []);

  const logoSize = Math.max(24, Math.round(qrSize * 0.16));

  // Load cooldown from storage on mount/user change and tick down
  useEffect(() => {
    const key = `qr_refresh_until_${userId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const until = parseInt(stored, 10);
      if (!isNaN(until)) {
        setCooldownUntil(until);
        setCooldownLeftMs(Math.max(0, until - Date.now()));
      }
    }
    const interval = setInterval(() => {
      setCooldownLeftMs(prev => {
        const next = cooldownUntil ? Math.max(0, cooldownUntil - Date.now()) : 0;
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [userId, cooldownUntil]);

  const formatDuration = (ms: number): string => {
    if (ms <= 0) return 'Ready';
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
  };

  const fetchQrCode = async () => {
    if (!userId) {
      setError('Missing user ID');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get the primary QR code for this customer from storage service
      const qrCode = await QrCodeStorageService.getCustomerPrimaryQrCode(
        userId,
        'CUSTOMER_CARD'
      );
      
      if (!qrCode || !qrCode.qr_image_url) {
        // If no QR code found or no image URL, create a new one
        console.log('No valid QR code found, generating new one');
        const newQrImageUrl = await QrCardGenerator.generateCustomerQrCode(userId);
        
        if (!newQrImageUrl) {
          throw new Error('Failed to generate QR code');
        }
        
        setQrImageUrl(newQrImageUrl);
        
        // Get the card number from the consistent generator
        const generatedCardNumber = UserQrCodeService.generateConsistentCardNumber(userId);
        setCardNumber(generatedCardNumber);
        
        // Notify parent component if needed
        if (onCardReady) {
          onCardReady(generatedCardNumber);
        }
      } else {
        // Use the existing QR code
        console.log('Using existing QR code from database');
        setQrImageUrl(qrCode.qr_image_url);
        
        // Parse the QR data to get additional information
        try {
          const parsedData = typeof qrCode.qr_data === 'string' 
            ? JSON.parse(qrCode.qr_data) 
            : qrCode.qr_data;
          
          // Set the raw QR data for the QR code component
          setQrData(JSON.stringify(parsedData));
          
          // Extract card details from QR data
          if (parsedData.cardNumber) {
            setCardNumber(parsedData.cardNumber);
            
            // Notify parent component if needed
            if (onCardReady) {
              onCardReady(parsedData.cardNumber);
            }
          }
          
          if (parsedData.cardType) {
            setCardType(parsedData.cardType.toLowerCase());
          }
        } catch (parseError) {
          console.error('Error parsing QR data:', parseError);
          createFallbackQrCode();
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching QR code:', err);
      setError('Failed to load your QR code. Please try again.');
      setLoading(false);
      
      // Use fallback QR code
      createFallbackQrCode();
    }
  };

  const handleRefreshQrCode = async () => {
    // 24h cooldown guard (manual refresh only)
    if (cooldownUntil && cooldownUntil > Date.now()) {
      setError(`You can refresh again in ${formatDuration(cooldownUntil - Date.now())}`);
      return;
    }
    setIsRefreshing(true);
    setError(null);
    
    try {
      // Generate a new QR code using the generator
      const newQrImageUrl = await QrCardGenerator.generateCustomerQrCode(userId, {
        isPrimary: true,
        cardType: 'STANDARD',
        expiryDays: 365
      });
      
      if (!newQrImageUrl) {
        throw new Error('Failed to generate QR code');
      }
      
      setQrImageUrl(newQrImageUrl);
      setSuccessMessage('QR code refreshed successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      // Set 24h cooldown
      const until = Date.now() + 24 * 60 * 60 * 1000;
      setCooldownUntil(until);
      setCooldownLeftMs(24 * 60 * 60 * 1000);
      localStorage.setItem(`qr_refresh_until_${userId}`, String(until));
      
      // Reload card info
      const cardInfo = await UserQrCodeService.getCustomerCardInfo(userId);
      if (cardInfo.cardNumber) {
        setCardNumber(cardInfo.cardNumber);
        
        // Notify parent component if needed
        if (onCardReady) {
          onCardReady(cardInfo.cardNumber);
        }
      }
    } catch (err) {
      console.error('Error refreshing QR code:', err);
      setError('Failed to refresh QR code. Please try again.');
      
      // Use fallback QR code
      createFallbackQrCode();
    } finally {
      setIsRefreshing(false);
    }
  };

  const createFallbackQrCode = () => {
    // Set fallback mode
    setUseFallback(true);
    
    // Create a properly formatted QR code that can be scanned by business QR scanner
    const fallbackData = {
      type: 'customer',
      customerId: userId,
      cardNumber: actualCardNumber,
      name: displayName,
      timestamp: Date.now()
    };
    
    setQrData(JSON.stringify(fallbackData));
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

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="bg-white p-4 sm:p-6 rounded-xl shadow-lg max-w-sm w-full mx-auto relative">
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

      {successMessage && (
        <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm flex items-start">
          <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{successMessage}</div>
        </div>
      )}

      <div className="flex justify-center p-3 sm:p-4 bg-white rounded-lg mb-4">
        {qrData ? (
          // Styled, scannable QR (modern blue→yellow gradient) with center logo
          <div className="relative bg-gradient-to-br from-blue-600 via-blue-500 to-amber-400 p-[6px] rounded-xl shadow-sm" style={{ width: qrSize + 12, height: qrSize + 12 }}>
            <div className="relative bg-white rounded-lg p-2 sm:p-3" style={{ width: qrSize, height: qrSize }}>
              {/* Hidden SVG to create a mask from the exact QR geometry */}
              <QRCodeSVG 
                ref={qrSvgRef as any}
                value={qrData}
                size={qrSize}
                includeMargin={false}
                level="H"
                bgColor="#ffffff"
                fgColor="#000000"
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
              />
              {maskUrl ? (
                <div
                  className="rounded-md"
                  style={{
                    width: qrSize,
                    height: qrSize,
                    background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #f59e0b 100%)',
                    WebkitMaskImage: `url(${maskUrl})`,
                    maskImage: `url(${maskUrl})`,
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                    WebkitMaskPosition: 'center',
                    maskPosition: 'center'
                  }}
                />
              ) : (
                // Fallback: solid blue QR when mask is not available
                <QRCodeSVG 
                  value={qrData}
                  size={qrSize}
                  includeMargin={false}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#3b82f6"
                />
              )}
              {/* Center logo overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="bg-white rounded-md p-1 shadow-sm" style={{ width: logoSize + 8, height: logoSize + 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src="/favicon.svg" alt="logo" style={{ width: logoSize, height: logoSize }} />
                </div>
              </div>
            </div>
          </div>
        ) : qrImageUrl && !useFallback ? (
          // Direct image display from URL or data URL with center logo overlay
          <div className="relative" style={{ width: qrSize, height: qrSize }}>
            <img 
              src={qrImageUrl} 
              alt="QR Code" 
              style={{ width: qrSize, height: qrSize, display: 'block' }}
              width={qrSize}
              height={qrSize}
              onError={() => {
                console.error('Failed to load QR image');
                setError('QR image failed to load. Using generated QR code instead.');
                createFallbackQrCode();
              }}
            />
            {/* Center logo overlay - uses favicon.svg; white pad preserves scannability */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="bg-white rounded-md p-1 shadow-sm" style={{ width: logoSize + 8, height: logoSize + 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/favicon.svg" alt="logo" style={{ width: logoSize, height: logoSize }} />
              </div>
            </div>
          </div>
        ) : (
          // No QR code available
          <div className="flex flex-col items-center justify-center border border-red-200 rounded-lg" style={{ width: qrSize, height: qrSize }}>
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
            {expirationDate || t('qrCard.noExpiration', 'No expiration')}
            {isExpiringSoon && ' (Soon)'}
          </span>
        </div>
        
        {/* Program Enrollment Info */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 flex items-center">
            <BadgeCheck className="h-3 w-3 inline mr-1" />
            {t('qrCard.programs', 'Programs')}:
          </span>
          <span className="font-medium">{enrolledPrograms?.length || 0}</span>
        </div>

        {/* Available Promos */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 flex items-center">
            <Tag className="h-3 w-3 inline mr-1" />
            {t('qrCard.promos', 'Available Promos')}:
          </span>
          <span className="font-medium">{availablePromos?.length || 0}</span>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="mt-4 flex justify-between">
        <button 
          onClick={handleRefreshQrCode} 
          className={`text-sm flex items-center ${cooldownLeftMs > 0 ? 'text-blue-300 cursor-not-allowed' : 'text-blue-600'}`}
          disabled={isRefreshing || cooldownLeftMs > 0}
        >
          {isRefreshing ? (
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3 mr-1" />
          )}
          {cooldownLeftMs > 0 ? `Refresh (${formatDuration(cooldownLeftMs)})` : t('qrCard.refresh', 'Refresh')}
        </button>
        
        <div className="flex items-center text-green-600 text-xs">
          <Shield className="h-3 w-3 mr-1" />
          {t('qrCard.secureCard', 'Secure Card')}
        </div>
      </div>
    </div>
  );
};