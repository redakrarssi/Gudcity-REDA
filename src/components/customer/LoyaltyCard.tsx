import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Award, Gift, Clipboard, ChevronRight, ChevronDown, Share2, QrCode, Tag } from 'lucide-react';
import { LoyaltyCard as LoyaltyCardType, Reward } from '../../services/loyaltyCardService';

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
  
  const tierColors = CardTierColorMap[card.tier] || CardTierColorMap.STANDARD;
  
  // Use businessName from card, or fallback to businessId if not available
  const businessName = card.businessName || card.business_name || t('Business');
  
  // Use programName from card, or fallback to a generic name if not available
  const programName = card.programName || card.program_name || t('Loyalty Program');
  
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
  
  return (
    <div className={`rounded-xl overflow-hidden shadow-md ${className}`}>
      {/* Card Header */}
      <div 
        className={`${tierColors.bg} ${tierColors.border} border-b p-4 flex justify-between items-center`}
      >
        <div>
          <h3 className={`font-bold text-lg ${tierColors.text}`}>{businessName}</h3>
          <p className="text-sm text-gray-600">{programName}</p>
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
                    {t('Share with Friends')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Toggle Rewards */}
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="w-full flex justify-between items-center bg-blue-50 text-blue-700 p-3 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <div className="flex items-center">
            <Gift className="w-5 h-5 mr-2" />
            <span>{t('Available Rewards')}</span>
          </div>
          {expanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>
      
      {/* Expanded Rewards */}
      {expanded && (
        <div className="bg-gray-50 p-4 space-y-4 border-t border-gray-200">
          {card.availableRewards && card.availableRewards.length > 0 ? (
            card.availableRewards.map((reward, index) => {
              const { available, reason } = getRewardAvailability(reward);
              
              return (
                <div 
                  key={`${reward.name}-${index}`} 
                  className={`p-3 rounded-lg ${available ? 'bg-white' : 'bg-gray-100'} border ${available ? 'border-green-200' : 'border-gray-300'}`}
                >
                  <div className="flex justify-between">
                    <div>
                      <h5 className="font-medium">{reward.name}</h5>
                      <p className="text-sm text-gray-600 mt-1">{reward.description}</p>
                    </div>
                    <div className="text-right">
                      {reward.points > 0 ? (
                        <div className="flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded-md mb-2">
                          <Star className="w-3 h-3 mr-1" />
                          <span>{reward.points}</span>
                        </div>
                      ) : (
                        <div className="px-2 py-1 bg-green-50 text-green-700 rounded-md mb-2 text-xs">
                          {t('Free Benefit')}
                        </div>
                      )}
                      
                      {available ? (
                        <button
                          onClick={() => onRedeemReward && onRedeemReward(reward.name)}
                          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm"
                        >
                          {t('Redeem')}
                        </button>
                      ) : (
                        <div className="text-xs text-gray-500">
                          {reason}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-4 text-gray-500">
              {t('No rewards available')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 