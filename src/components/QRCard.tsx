import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { UserQrCodeService } from '../services/userQrCodeService';
import { LoyaltyCardService } from '../services/loyaltyCardService';
import { QrCodeService } from '../services/qrCodeService';
import { Clock, RefreshCw, Shield, CreditCard, BadgeCheck, Tag, AlertCircle, CheckCircle2, Copy, Share2 } from 'lucide-react';
// Removed direct DB usage in production; all data comes from APIs or fallbacks
import { ProductionSafeService } from '../utils/productionApiClient';
import { useAuth } from '../contexts/AuthContext';
import { QrCardGenerator } from '../utils/qrCardGenerator';
import { logger } from '../utils/logger';
import { QrCodeStorageService } from '../services/qrCodeStorageService';

export interface QRCardProps {
  userId: string;
  displayName?: string;
  onCardReady?: (cardNumber: string) => void;
  // Optional sizing overrides for embedding contexts (e.g., dashboard)
  maxWidthClass?: string; // Tailwind classes controlling container max width
  minSize?: number; // Minimum QR px size
  maxSize?: number; // Maximum QR px size
  scale?: number;   // Fraction of container width to use for QR
  hideCardDetails?: boolean; // Hide card number and expiration for compact display
}

export const QRCard: React.FC<QRCardProps> = ({
  userId,
  displayName = 'Loyalty Member',
  onCardReady,
  maxWidthClass,
  minSize,
  maxSize,
  scale,
  hideCardDetails = false
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
  const [qrSize, setQrSize] = useState<number>(220);
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
        // In production/browser, avoid any direct DB flow and use API/fallback
        if (ProductionSafeService.shouldUseApi()) {
          // Use a safe fallback QR payload immediately (works with scanner)
          const fallback = {
            type: 'customer',
            customerId: userId,
            cardNumber: UserQrCodeService.generateConsistentCardNumber(userId),
            name: displayName,
            timestamp: Date.now()
          };
          setCardNumber(fallback.cardNumber);
          if (onCardReady) onCardReady(fallback.cardNumber);
          setQrData(JSON.stringify(fallback));
          setLoading(false);
          // Attempt to enhance with loyalty cards (for counts/UI) via API
          try {
            const cards = await LoyaltyCardService.getCustomerCards(userId);
            setEnrolledPrograms(cards || []);
          } catch {}
          return;
        }

        // Development: ensure & fetch via DB-backed services
        await QrCardGenerator.ensureCustomerHasQrCode(userId);
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

  // Create a reusable function to fetch card info
  const fetchCardInfo = async (isInitialLoad = false) => {
    if (!userId) return;
    
    try {
      if (isInitialLoad) setLoading(true);
      
      // Get customer card info with all relevant data
      try {
        const cardInfo = await UserQrCodeService.getCustomerCardInfo(userId);
        
        // Set card number from consistent generation (only on initial load)
        if (isInitialLoad && cardInfo.cardNumber) {
          setCardNumber(cardInfo.cardNumber);
          
          // Notify parent component if needed
          if (onCardReady) {
            onCardReady(cardInfo.cardNumber);
          }
        }
        
        // Set expiration date if available (only on initial load)
        if (isInitialLoad && cardInfo.expirationDate) {
          const expDate = new Date(cardInfo.expirationDate);
          setExpirationDate(expDate.toLocaleDateString());
          
          // Check if expiring within 30 days
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          setIsExpiringSoon(expDate <= thirtyDaysFromNow);
        }
        
        // Get accurate enrollment data from loyalty cards service (always refresh)
        const loyaltyCards = await LoyaltyCardService.getCustomerCards(userId);
        
        // Count enrolled programs (each card represents an enrolled program)
        setEnrolledPrograms(loyaltyCards || []);
        
        // Count redeemable rewards (rewards with enough points/stamps)
        let redeemableRewardsCount = 0;
        if (loyaltyCards) {
          loyaltyCards.forEach(card => {
            if (card.availableRewards) {
              redeemableRewardsCount += card.availableRewards.filter(reward => reward.isRedeemable).length;
            }
          });
        }
        
        // Create mock array for UI display purposes (just for count)
        const redeemableRewards = Array(redeemableRewardsCount).fill({ isRedeemable: true });
        setAvailablePromos(redeemableRewards);
        
        console.log('📊 QR Card updated - Programs:', loyaltyCards?.length || 0, 'Redeemable rewards:', redeemableRewardsCount);
        
      } catch (err) {
        console.error('Error fetching card info:', err);
        // Use fallback values
        setEnrolledPrograms([]);
        setAvailablePromos([]);
      }
      
      if (isInitialLoad) setLoading(false);
    } catch (err) {
      console.error('Error in card info effect:', err);
      if (isInitialLoad) setLoading(false);
    }
  };

  // Debounced counts refresh to avoid excessive API calls
  const refreshTimeoutRef = useRef<number | null>(null);
  const scheduleCountsRefresh = () => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current as unknown as number);
    }
    refreshTimeoutRef.current = window.setTimeout(() => {
      fetchCardInfo(false);
    }, 300);
  };

  useEffect(() => {
    fetchCardInfo(true);
  }, [userId, onCardReady]);

  // Listen for real-time updates from Cards page and global events
  useEffect(() => {
    const handleQrPointsAwarded = (event: CustomEvent) => {
      console.log('🔄 QR Card received refresh event:', event.detail);
      // Refresh card data when points are awarded or rewards redeemed
      scheduleCountsRefresh();
    };

    const handleCardDataUpdate = () => {
      console.log('🔄 QR Card received card data update event');
      // Refresh card data when general card updates occur
      scheduleCountsRefresh();
    };

    // Listen for various update events
    window.addEventListener('qrPointsAwarded' as any, handleQrPointsAwarded);
    window.addEventListener('cardDataUpdate' as any, handleCardDataUpdate);
    window.addEventListener('rewardRedeemed' as any, handleCardDataUpdate);
    window.addEventListener('loyaltyCardUpdate' as any, handleCardDataUpdate);
    // Also listen to hyphenated and system-wide events used elsewhere
    window.addEventListener('points-awarded' as any, handleCardDataUpdate);
    window.addEventListener('reward-redeemed' as any, handleCardDataUpdate);
    window.addEventListener('loyalty-cards-refresh' as any, handleCardDataUpdate);
    window.addEventListener('refresh-customer-cards' as any, handleCardDataUpdate);
    window.addEventListener('program-points-updated' as any, handleCardDataUpdate);

    return () => {
      window.removeEventListener('qrPointsAwarded' as any, handleQrPointsAwarded);
      window.removeEventListener('cardDataUpdate' as any, handleCardDataUpdate);
      window.removeEventListener('rewardRedeemed' as any, handleCardDataUpdate);
      window.removeEventListener('loyaltyCardUpdate' as any, handleCardDataUpdate);
      window.removeEventListener('points-awarded' as any, handleCardDataUpdate);
      window.removeEventListener('reward-redeemed' as any, handleCardDataUpdate);
      window.removeEventListener('loyalty-cards-refresh' as any, handleCardDataUpdate);
      window.removeEventListener('refresh-customer-cards' as any, handleCardDataUpdate);
      window.removeEventListener('program-points-updated' as any, handleCardDataUpdate);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current as unknown as number);
      }
    };
  }, [userId]);

  // Periodic refresh to keep data up to date (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCardInfo(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [userId]);

  // Build an SVG data URL mask from the generated QR SVG to allow gradient fill
  useEffect(() => {
    // Delay to next tick so QR SVG ref is populated
    const id = setTimeout(() => {
      try {
        if (qrSvgRef.current) {
          // SECURITY FIX: Use XMLSerializer instead of outerHTML to avoid XSS
          // XMLSerializer is safer as it properly encodes and doesn't execute scripts
          const serializer = new XMLSerializer();
          const svg = serializer.serializeToString(qrSvgRef.current);
          
          // SECURITY: Additional sanitization - remove any script tags or event handlers
          // that might have been injected (defense in depth)
          const sanitizedSvg = svg
            .replace(/<script[^>]*>.*?<\/script>/gi, '')  // Remove script tags
            .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
            .replace(/javascript:/gi, '')                // Remove javascript: protocol
            .replace(/data:text\/html/gi, '');           // Remove data:text/html
          
          const encoded = encodeURIComponent(sanitizedSvg)
            // Ensure proper encoding for Safari
            .replace(/\(/g, '%28')
            .replace(/\)/g, '%29');
          setMaskUrl(`data:image/svg+xml;utf8,${encoded}`);
        }
      } catch (e) {
        // Fallback silently; component will render solid-color QR
        console.warn('Failed to create QR mask URL:', e);
        setMaskUrl(null);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [qrData]);

  // Responsive sizing for mobile: compute QR size from container width
  useEffect(() => {
    const computeSize = () => {
      const width = containerRef.current?.clientWidth || window.innerWidth;
      // Use a percentage of available width, clamp for mobile and laptop screens
      const effectiveScale = typeof scale === 'number' ? scale : 0.7;
      const minPx = typeof minSize === 'number' ? minSize : 180;
      const maxPx = typeof maxSize === 'number' ? maxSize : 260;
      const target = Math.min(maxPx, Math.max(minPx, Math.floor(width * effectiveScale)));
      setQrSize(target);
    };
    computeSize();
    window.addEventListener('resize', computeSize);
    return () => window.removeEventListener('resize', computeSize);
  }, []);

  const logoSize = Math.max(18, Math.round(qrSize * 0.14));

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
      
      if (ProductionSafeService.shouldUseApi()) {
        // In production, avoid DB: attempt to derive a usable QR from loyalty cards
        try {
          const loyaltyCards = await LoyaltyCardService.getCustomerCards(userId);
          if (loyaltyCards && loyaltyCards.length > 0) {
            const first = loyaltyCards[0];
            if (first.cardNumber) {
              setCardNumber(first.cardNumber);
              if (onCardReady) onCardReady(first.cardNumber);
            }
          }
        } catch {}

        // Always provide a safe JSON payload for the on-screen QR
        const fallbackData = {
          type: 'customer',
          customerId: userId,
          cardNumber: UserQrCodeService.generateConsistentCardNumber(userId),
          name: displayName,
          timestamp: Date.now()
        };
        setQrData(JSON.stringify(fallbackData));
        setLoading(false);
        return;
      }

      // Development path: use storage service directly
      const qrCode = await QrCodeStorageService.getCustomerPrimaryQrCode(userId, 'CUSTOMER_CARD');
      
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
      
        // Also refresh card data
        fetchCardInfo(false);
        
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
    <div
      ref={containerRef}
      className={
        `bg-gradient-to-br from-white via-gray-50 to-blue-50 p-6 sm:p-7 rounded-2xl shadow-xl border border-gray-200 ${maxWidthClass ? maxWidthClass : 'max-w-sm md:max-w-md lg:max-w-lg'} w-full mx-auto relative transition-all duration-300 hover:shadow-2xl hover:border-blue-300`
      }
    >
      {/* Card indicator in the corner */}
      <div className="absolute top-4 left-4 flex items-center bg-blue-50 px-3 py-1 rounded-full">
        <CreditCard className="h-3 w-3 text-blue-600 mr-1" />
        <span className="text-xs text-blue-700 font-semibold uppercase tracking-wide">{cardType}</span>
      </div>

      <div className="text-center mb-5 mt-6">
        <div className="flex justify-center items-center mb-4">
          {/* User Avatar/Initials */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 text-white flex items-center justify-center mr-4 text-xl font-bold shadow-xl border-2 border-white">
            {userInitials}
          </div>
          <div className="text-left">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{displayName}</h2>
            <p className="text-sm text-gray-600 font-semibold">Loyalty Member</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 bg-gradient-to-r from-gray-50 to-blue-50 px-4 py-3 rounded-xl border border-gray-200 font-medium">{t('qrCard.showToCollect', 'Show this card to collect points and rewards')}</p>
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

      <div className="flex justify-center p-4 bg-white rounded-xl mb-4 shadow-inner border border-gray-200">
        {qrData ? (
          // Styled, scannable QR (modern gradient) with center logo
          <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-[8px] rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300" style={{ width: qrSize + 16, height: qrSize + 16 }}>
            <div className="relative bg-white rounded-lg p-4 flex items-center justify-center" style={{ width: qrSize, height: qrSize }}>
              {/* Hidden SVG to create a mask from the exact QR geometry */}
              <QRCodeSVG 
                ref={qrSvgRef as any}
                value={qrData}
                size={qrSize - 32}
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
                    width: qrSize - 32,
                    height: qrSize - 32,
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
                  size={qrSize - 32}
                  includeMargin={false}
                  level="H"
                  bgColor="#ffffff"
                  fgColor="#3b82f6"
                />
              )}
              {/* Center logo overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="bg-white rounded-md p-1 shadow-sm" style={{ width: logoSize + 4, height: logoSize + 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src="/favicon.svg" alt="logo" style={{ width: logoSize, height: logoSize }} />
                </div>
              </div>
            </div>
          </div>
        ) : qrImageUrl && !useFallback ? (
          // Direct image display from URL or data URL with center logo overlay
          <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-[8px] rounded-xl shadow-md" style={{ width: qrSize + 16, height: qrSize + 16 }}>
            <div className="relative bg-white rounded-lg p-4 flex items-center justify-center" style={{ width: qrSize, height: qrSize }}>
            <img 
              src={qrImageUrl} 
              alt="QR Code" 
                style={{ width: qrSize - 32, height: qrSize - 32, display: 'block' }}
                width={qrSize - 32}
                height={qrSize - 32}
              onError={() => {
                console.error('Failed to load QR image');
                setError('QR image failed to load. Using generated QR code instead.');
                createFallbackQrCode();
              }}
            />
            {/* Center logo overlay - uses favicon.svg; white pad preserves scannability */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="bg-white rounded-md p-1 shadow-sm" style={{ width: logoSize + 4, height: logoSize + 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/favicon.svg" alt="logo" style={{ width: logoSize, height: logoSize }} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          // No QR code available
          <div className="flex flex-col items-center justify-center border border-red-200 rounded-lg" style={{ width: qrSize, height: qrSize }}>
            <Shield className="text-red-500 h-8 w-8 mb-2" />
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
      
      <div className="border-t border-gray-200 pt-5 mt-4 space-y-3">
        {/* Card Details - Hidden when hideCardDetails is true */}
        {!hideCardDetails && (
          <>
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-semibold text-sm">{t('qrCard.cardNumber', 'Card Number')}</span>
                <span className="font-bold text-gray-900 font-mono text-base tracking-wider">{actualCardNumber}</span>
              </div>
        </div>

        {/* Expiration Date */}
            <div className="flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
              <span className="text-blue-700 font-semibold text-sm flex items-center">
                <Clock className="h-4 w-4 mr-2 text-blue-600" />
                {t('qrCard.expires', 'Expires')}
          </span>
              <span className={`font-bold text-base ${isExpiringSoon ? 'text-amber-600' : 'text-blue-900'}`}>
            {expirationDate || t('qrCard.noExpiration', 'No expiration')}
                {isExpiringSoon && ' ⚠️'}
          </span>
        </div>
          </>
        )}
        
        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-3">
        {/* Program Enrollment Info */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl text-center border border-blue-200 hover:shadow-md transition-shadow">
            <div className="flex justify-center mb-3">
              <div className="p-2 bg-blue-600 rounded-full">
                <BadgeCheck className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-800 mb-1">{enrolledPrograms?.length || 0}</div>
            <div className="text-sm text-blue-700 font-semibold">{t('qrCard.programs', 'Programs')}</div>
        </div>

          {/* Active Rewards */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl text-center border border-purple-200 hover:shadow-md transition-shadow">
            <div className="flex justify-center mb-3">
              <div className="p-2 bg-purple-600 rounded-full">
                <Tag className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-purple-800 mb-1">{availablePromos?.length || 0}</div>
            <div className="text-sm text-purple-700 font-semibold">{t('qrCard.rewards', 'Active Rewards')}</div>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="mt-5 flex justify-between items-center">
        <button 
          onClick={handleRefreshQrCode} 
          className={`flex items-center px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
            cooldownLeftMs > 0 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
              : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 border border-blue-500'
          }`}
          disabled={isRefreshing || cooldownLeftMs > 0}
        >
          {isRefreshing ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          {cooldownLeftMs > 0 ? `Refresh (${formatDuration(cooldownLeftMs)})` : t('qrCard.refresh', 'Refresh')}
        </button>
        
        <div className="flex items-center bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2.5 rounded-xl border border-green-200">
          <div className="p-1 bg-green-600 rounded-full mr-2">
            <Shield className="h-3 w-3 text-white" />
          </div>
          <span className="text-green-800 text-sm font-semibold">{t('qrCard.secureCard', 'Secure')}</span>
        </div>
      </div>
    </div>
  );
};