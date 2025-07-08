import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Award, Gift, Clipboard, ChevronRight, ChevronDown, Share2, QrCode, Tag, ScanLine, Sparkles, Check } from 'lucide-react';
import { LoyaltyCard as LoyaltyCardType, Reward } from '../../services/loyaltyCardService';
import { QrCodeService } from '../../services/qrCodeService';
import { createStandardLoyaltyCardQRCode } from '../../utils/standardQrCodeGenerator';

interface LoyaltyCardProps {
  card: LoyaltyCardType;
  onRedeemReward?: (rewardName: string) => void;
  onShareCode?: (code: string) => void;
  className?: string;
}

const CardTierColorMap: { [key: string]: { bg: string; border: string; text: string; points: string; } } = {
  STANDARD: { 
    bg: 'bg-gradient-to-br from-gray-50 to-gray-200',
    border: 'border-gray-300',
    text: 'text-gray-800',
    points: 'text-blue-600'
  },
  SILVER: { 
    bg: 'bg-gradient-to-br from-gray-200 to-gray-400',
    border: 'border-gray-400',
    text: 'text-gray-800',
    points: 'text-blue-700'
  },
  GOLD: { 
    bg: 'bg-gradient-to-br from-yellow-100 to-yellow-300',
    border: 'border-yellow-400',
    text: 'text-yellow-900',
    points: 'text-amber-800'
  },
  PLATINUM: { 
    bg: 'bg-gradient-to-br from-indigo-100 to-purple-200',
    border: 'border-purple-400',
    text: 'text-indigo-900',
    points: 'text-purple-700'
  }
};

export const LoyaltyCard: React.FC<LoyaltyCardProps> = ({ 
  card, 
  onRedeemReward,
  onShareCode,
  className = '' 
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [showPromoCode, setShowPromoCode] = useState(false);
  const [copiedPromoCode, setCopiedPromoCode] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrCodeError, setQrCodeError] = useState<string | null>(null);
  const [showRewards, setShowRewards] = useState(false);
  
  const tierColors = CardTierColorMap[card.tier] || CardTierColorMap.STANDARD;
  
  // Use programName as primary display, with businessName as secondary
  const programName = card.programName || t('Loyalty Program');
  const businessName = card.businessName || t('Business');
  
  // Generate QR code data for the loyalty card
  useEffect(() => {
    // Only generate QR code if the card has all necessary information
    if (card.id && card.customerId && card.programId && card.businessId) {
      try {
        // Create a properly formatted loyalty card QR code with all required fields
        const qrData = createStandardLoyaltyCardQRCode({
          cardId: card.id,
          customerId: card.customerId,
          programId: card.programId,
          businessId: card.businessId,
          cardNumber: card.cardNumber || '',
          programName: programName,
          businessName: businessName,
          points: card.points || 0
        });
        
        setQrCodeData(JSON.stringify(qrData));
        
        // Generate QR code image URL
        QrCodeService.generateQrCode(JSON.stringify(qrData))
          .then(url => {
            setQrCodeUrl(url);
            setQrCodeError(null);
          })
          .catch(error => {
            console.error('Error generating QR code:', error);
            setQrCodeError('Failed to generate QR code');
          });
      } catch (error) {
        console.error('Error creating QR code data:', error);
        setQrCodeError('Error creating QR code data');
      }
    } else {
      setQrCodeError('Missing required card information');
    }
  }, [card.id, card.customerId, card.programId, card.businessId, programName, businessName]);

  // Automatically show rewards section if any reward is available
  useEffect(() => {
    if (card.availableRewards?.some(reward => getRewardAvailability(reward).available)) {
      setShowRewards(true);
    }
  }, [card.availableRewards, card.points]);
  
  // Reset copied state after 3 seconds
  useEffect(() => {
    if (copiedPromoCode) {
      const timer = setTimeout(() => setCopiedPromoCode(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [copiedPromoCode]);
  
  const handleCopyPromoCode = () => {
    if (card.promoCode) {
      navigator.clipboard.writeText(card.promoCode);
      setCopiedPromoCode(true);
    }
  };
  
  const handleSharePromoCode = () => {
    if (onShareCode && card.promoCode) {
      onShareCode(card.promoCode);
      setShowPromoCode(false);
    }
  };

  const handleRedeemReward = (rewardName: string) => {
    if (onRedeemReward) {
      onRedeemReward(rewardName);
    }
  };
  
  const getPointsLabel = () => {
    if (card.pointsToNext) {
      return t('{{points}} more points to {{nextTier}}', { 
        points: card.pointsToNext,
        nextTier: getNextTier(card.tier)
      });
    }
    
    return card.tier === 'PLATINUM' 
      ? t('Maximum tier reached') 
      : t('Collect points for rewards');
  };
  
  const getNextTier = (currentTier: string): string => {
    switch (currentTier) {
      case 'STANDARD': return t('Silver');
      case 'SILVER': return t('Gold');
      case 'GOLD': return t('Platinum');
      default: return '';
    }
  };
  
  const getRewardAvailability = (reward: Reward): { available: boolean; reason?: string } => {
    if (reward.isRedeemable === false) {
      return { available: false, reason: t('Automatic benefit') };
    }
    
    if (reward.points > card.points) {
      return { 
        available: false, 
        reason: t('Need {{points}} more points', { points: reward.points - card.points }) 
      };
    }
    
    return { available: true };
  };
  
  // Handle QR code display toggle with retry capability
  const toggleQrCode = () => {
    if (qrCodeError && !qrCodeUrl) {
      // Retry QR code generation if there was an error
      if (card.id && card.customerId && card.programId && card.businessId) {
        try {
          const qrData = createStandardLoyaltyCardQRCode({
            cardId: card.id,
            customerId: card.customerId,
            programId: card.programId,
            businessId: card.businessId,
            cardNumber: card.cardNumber || '',
            programName: programName,
            businessName: businessName,
            points: card.points || 0
          });
          
          QrCodeService.generateQrCode(JSON.stringify(qrData))
            .then(url => {
              setQrCodeUrl(url);
              setQrCodeError(null);
              setShowQrCode(true);
            })
            .catch(error => {
              console.error('Error generating QR code on retry:', error);
              setQrCodeError('Failed to generate QR code');
            });
        } catch (error) {
          console.error('Error creating QR code data on retry:', error);
        }
      }
    } else {
      setShowQrCode(!showQrCode);
    }
  };
  
  // Check if there are any available rewards
  const hasAvailableRewards = card.availableRewards?.some(
    reward => getRewardAvailability(reward).available
  );
  
  return (
    <div className={`rounded-xl overflow-hidden shadow-md ${className}`}>
      {/* Card Header */}
      <div 
        className={`${tierColors.bg} ${tierColors.border} border-b p-4 flex justify-between items-center`}
      >
        <div>
          <h3 className={`font-bold text-lg ${tierColors.text}`}>{programName}</h3>
          <p className="text-sm text-gray-600">{businessName}</p>
        </div>
        <div className="flex items-center">
          <div className="bg-white bg-opacity-70 px-3 py-1 rounded-full flex items-center">
            <Award className={`w-4 h-4 mr-1 ${tierColors.points}`} />
            <span className={`font-bold ${tierColors.points}`}>{card.tier}</span>
          </div>
        </div>
      </div>
      
      {/* Card Body */}
      <div className="bg-white p-4">
        {/* Points */}
        <div className="mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">{t('Your Points')}</span>
            <span className="text-sm text-gray-600">{card.tier !== 'PLATINUM' && `${getPointsLabel()}`}</span>
          </div>
          <div className="flex items-baseline mt-1">
            <span className="text-3xl font-bold text-blue-600 mr-2">{card.points}</span>
            {card.pointsMultiplier > 1 && (
              <span className="text-sm bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">
                {t('{{multiplier}}× multiplier', { multiplier: card.pointsMultiplier.toFixed(2) })}
              </span>
            )}
          </div>
        </div>
        
        {/* Progress bar for next tier (except for PLATINUM) */}
        {card.tier !== 'PLATINUM' && card.pointsToNext && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ 
                  width: `${Math.min(100, (card.points / (card.points + card.pointsToNext)) * 100)}%` 
                }}
              ></div>
            </div>
          </div>
        )}
        
        {/* Available Rewards */}
        {card.availableRewards && card.availableRewards.length > 0 && (
          <div className="mb-4">
            <button 
              onClick={() => setShowRewards(!showRewards)}
              className={`w-full flex justify-between items-center p-3 rounded-lg transition-colors ${
                hasAvailableRewards 
                  ? "bg-green-50 text-green-700 hover:bg-green-100" 
                  : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              <div className="flex items-center">
                <Gift className="w-5 h-5 mr-2" />
                <span>
                  {hasAvailableRewards 
                    ? t('Available Rewards!') 
                    : t('Rewards')}
                </span>
                {hasAvailableRewards && (
                  <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                    {t('Redeem now!')}
                  </span>
                )}
              </div>
              {showRewards ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>
            
            {showRewards && (
              <div className="mt-2 space-y-2">
                {card.availableRewards.map((reward, index) => {
                  const { available, reason } = getRewardAvailability(reward);
                  return (
                    <div key={`${reward.id || index}`} 
                      className={`border rounded-lg p-3 ${
                        available 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-800">{reward.name}</h4>
                          <p className="text-sm text-gray-600">{reward.description}</p>
                          <div className="flex items-center mt-1">
                            <Star className="w-4 h-4 text-amber-500 mr-1" />
                            <span className="text-sm font-medium">
                              {t('{{points}} points', { points: reward.points })}
                            </span>
                          </div>
                        </div>
                        {available ? (
                          <button
                            onClick={() => handleRedeemReward(reward.name)}
                            className="flex items-center px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm transition-colors"
                          >
                            <Sparkles className="w-4 h-4 mr-1" />
                            {t('Redeem')}
                          </button>
                        ) : (
                          <div className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded-md">
                            {reason}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        {/* QR Code Button */}
        <div className="mb-4">
          <button 
            onClick={toggleQrCode} 
            className="w-full flex justify-between items-center bg-blue-50 text-blue-700 p-3 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center">
              <QrCode className="w-5 h-5 mr-2" />
              <span>{t('Show QR Code')}</span>
            </div>
            {showQrCode ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
          
          {/* QR Code Display */}
          {showQrCode && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-col items-center">
                {qrCodeUrl ? (
                  <>
                    <div className="bg-white p-3 rounded-lg shadow-sm mb-2">
                      <img 
                        src={qrCodeUrl} 
                        alt={`QR Code for ${programName}`}
                        className="w-full max-w-[200px] h-auto"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-800">{programName}</p>
                      <p className="text-xs text-gray-600">{businessName}</p>
                    </div>
                  </>
                ) : qrCodeError ? (
                  <div className="text-center p-4">
                    <div className="text-red-500 mb-2">{qrCodeError}</div>
                    <button 
                      onClick={toggleQrCode}
                      className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm"
                    >
                      {t('Retry')}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">{t('Generating QR code...')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Benefits */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-gray-800">{t('Card Benefits')}</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {card.benefits.map((benefit, index) => (
              <span 
                key={index} 
                className="bg-gray-50 text-gray-700 text-xs px-2 py-1 rounded-full border border-gray-200"
              >
                {benefit}
              </span>
            ))}
          </div>
        </div>
        
        {/* Promo code */}
        {card.promoCode && (
          <div className="mb-4">
            <button 
              onClick={() => setShowPromoCode(!showPromoCode)} 
              className="w-full flex justify-between items-center bg-blue-50 text-blue-700 p-3 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center">
                <Tag className="w-5 h-5 mr-2" />
                <span>{t('Your Referral Code')}</span>
              </div>
              {showPromoCode ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>
            
            {showPromoCode && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">{t('Share to give friends 100 bonus points')}</span>
                </div>
                <div className="flex">
                  <div className="flex-1 bg-white border border-gray-300 rounded-l-md p-2 font-mono text-sm overflow-x-auto">
                    {card.promoCode}
                  </div>
                  <button 
                    onClick={handleCopyPromoCode}
                    className={`px-3 py-2 ${copiedPromoCode ? 'bg-green-500' : 'bg-blue-500'} text-white rounded-r-md`}
                  >
                    {copiedPromoCode ? t('Copied!') : <Clipboard className="w-5 h-5" />}
                  </button>
                </div>
                <div className="mt-2">
                  <button 
                    onClick={handleSharePromoCode}
                    className="w-full flex justify-center items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 rounded-md transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{t('Share Code')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Toggle for showing more details */}
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="w-full flex justify-center items-center gap-2 text-gray-500 hover:text-gray-700 py-2"
        >
          {expanded ? (
            <>
              <span>{t('Show Less')}</span>
              <ChevronDown className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>{t('Show More')}</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
        
        {/* Expanded content */}
        {expanded && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            {/* Card details */}
            <div className="mb-4">
              <h4 className="font-medium text-gray-800 mb-2">{t('Card Details')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('Card Number')}</span>
                  <span className="font-mono">{card.cardNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('Card Type')}</span>
                  <span>{card.cardType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('Issued On')}</span>
                  <span>{new Date(card.createdAt).toLocaleDateString()}</span>
                </div>
                {card.expiryDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('Expires On')}</span>
                    <span>{new Date(card.expiryDate).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('Points Multiplier')}</span>
                  <span>{card.pointsMultiplier}×</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 