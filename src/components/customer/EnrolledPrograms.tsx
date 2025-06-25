import React, { useState, useEffect } from 'react';
import { CreditCard, Award, BadgeCheck, Gift, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useEnrolledPrograms, EnrolledProgramData } from '../../hooks/useEnrolledPrograms';
import { DataLoader } from '../common/DataLoader';
import { FallbackIndicator } from '../common/FallbackIndicator';
import { LoyaltyCardService } from '../../services/loyaltyCardService';

interface EnrolledProgramsProps {
  onRedeem?: (programId: string) => void;
}

export const EnrolledPrograms: React.FC<EnrolledProgramsProps> = ({ onRedeem }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [animatedItems, setAnimatedItems] = useState<Record<string, boolean>>({});
  
  // Use our standardized hook for data loading
  const enrolledProgramsQuery = useEnrolledPrograms();
  
  // Helper function to handle animation when programs load
  const handleProgramsLoaded = (programs: EnrolledProgramData[]) => {
    // Add staggered animation to cards
    const timer = setTimeout(() => {
      programs.forEach((program, index) => {
        setTimeout(() => {
          setAnimatedItems(prev => ({
            ...prev,
            [program.id]: true
          }));
        }, index * 150);
      });
    }, 300);
    
    return () => clearTimeout(timer);
  };

  // Set up animations when data changes
  useEffect(() => {
    if (enrolledProgramsQuery.data && enrolledProgramsQuery.data.length > 0) {
      handleProgramsLoaded(enrolledProgramsQuery.data);
    }
  }, [enrolledProgramsQuery.data]);

  // Helper function to get the next reward for a program
  const getNextReward = (enrolledProgram: EnrolledProgramData) => {
    if (!enrolledProgram.program.rewardTiers || enrolledProgram.program.rewardTiers.length === 0) {
      return null;
    }
    
    const sortedTiers = [...enrolledProgram.program.rewardTiers]
      .sort((a, b) => a.pointsRequired - b.pointsRequired);
    
    return sortedTiers.find(tier => tier.pointsRequired > enrolledProgram.currentPoints) || null;
  };

  // Loading state element
  const loadingElement = (
    <div className="space-y-4">
      <div className="bg-gray-100 h-16 rounded-lg animate-pulse"></div>
      <div className="bg-gray-100 h-32 rounded-lg animate-pulse"></div>
      <div className="bg-gray-100 h-32 rounded-lg animate-pulse"></div>
    </div>
  );

  // Render programs and related rewards information
  const renderPrograms = (programs: EnrolledProgramData[]) => {
    // Early return for empty data
    if (!programs || programs.length === 0) {
      return (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-gray-500 flex flex-col items-center">
            <CreditCard className="w-12 h-12 mb-3 text-gray-400" />
            <p className="text-lg font-medium text-gray-600 mb-1">{t('noPrograms')}</p>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              {t('noProgramsDescription')}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {programs.map(enrolledProgram => {
          // Calculate progress to next reward
          const nextReward = getNextReward(enrolledProgram);
          const progress = nextReward 
            ? Math.min(100, Math.round((enrolledProgram.currentPoints / nextReward.pointsRequired) * 100))
            : 100;
            
          // Animation delay class based on index
          const isAnimated = animatedItems[enrolledProgram.id] || false;
          
          return (
            <div 
              key={enrolledProgram.id}
              className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-500 ${
                isAnimated ? 'opacity-100 transform-none' : 'opacity-0 transform translate-y-4'
              }`}
            >
              {/* Program Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900">{enrolledProgram.program.name}</h3>
                    <p className="text-sm text-gray-500">{enrolledProgram.business.name}</p>
                  </div>
                  <div className="bg-white py-1 px-3 rounded-full border border-gray-200 shadow-sm">
                    <span className="text-blue-600 font-medium">{enrolledProgram.currentPoints} {t('points')}</span>
                  </div>
                </div>
              </div>
              
              {/* Program Body */}
              <div className="p-4">
                {/* Next Reward Progress */}
                {nextReward ? (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-500">{t('nextReward')}</span>
                      <span className="text-sm font-medium text-gray-700">
                        {nextReward.pointsRequired - enrolledProgram.currentPoints} {t('pointsToGo')}
                      </span>
                    </div>
                    <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full bg-blue-100 text-blue-600">
                            {nextReward.reward}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold inline-block text-blue-600">
                            {progress}%
                          </span>
                        </div>
                      </div>
                      <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                        <div 
                          style={{ width: `${progress}%` }} 
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500 ease-in-out"
                        ></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                    <div className="flex items-center">
                      <Gift className="h-5 w-5 text-yellow-500 mr-2" />
                      <p className="text-sm text-yellow-700">
                        {enrolledProgram.program.rewardTiers && enrolledProgram.program.rewardTiers.length > 0
                          ? t('allRewardsEarned')
                          : t('noRewardsAvailable')}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* View Card Button */}
                <button
                  onClick={async () => {
                    // If onRedeem is provided, call it first
                    if (onRedeem) {
                      onRedeem(enrolledProgram.programId);
                    }
                    
                    try {
                      // Ensure a card exists for this enrollment
                      await LoyaltyCardService.syncEnrollmentsToCards(enrolledProgram.customerId);
                      // Navigate to the cards page
                      navigate('/customer/cards');
                    } catch (error) {
                      console.error('Error navigating to cards page:', error);
                    }
                  }}
                  className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mb-4 flex items-center justify-center"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {t('viewLoyaltyCard')}
                </button>
                
                {/* Available Rewards */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center mt-4">
                    <Award className="w-4 h-4 mr-1 text-gray-500" />
                    {t('upcomingRewards')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {enrolledProgram.program.rewardTiers
                      .filter(tier => tier.pointsRequired > enrolledProgram.currentPoints)
                      .slice(0, 4) // Limit to 4 for better UI
                      .map(tier => (
                        <div
                          key={tier.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors group/item"
                        >
                          <div className="flex items-center">
                            <Award className="flex-shrink-0 mr-2 h-5 w-5 text-gray-400 group-hover/item:text-gray-600 transition-colors" />
                            <span className="text-sm text-gray-500 group-hover/item:text-gray-700 transition-colors">
                              {tier.reward}
                            </span>
                          </div>
                          <span className="text-sm bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-medium group-hover/item:bg-blue-50 group-hover/item:text-blue-700 transition-colors">
                            {tier.pointsRequired} {t('points')}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <BadgeCheck className="w-5 h-5 text-blue-500 mr-2" />
          {t('myPrograms')}
        </h2>
        
        {!enrolledProgramsQuery.isLoading && (
          <div className="flex items-center">
            <span className="text-sm bg-blue-50 px-3 py-1 rounded-full text-blue-700 font-medium">
              {enrolledProgramsQuery.data?.length || 0} {t('active')}
            </span>
            {enrolledProgramsQuery.data && enrolledProgramsQuery.data.length > 0 && (
              <button 
                onClick={() => navigate('/customer/cards')}
                className="ml-3 flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <CreditCard className="w-4 h-4 mr-1" />
                {t('viewAllCards')}
              </button>
            )}
            {enrolledProgramsQuery.isUsingStaleData && (
              <div className="ml-2">
                <FallbackIndicator 
                  isUsingFallback={true}
                  type="cache"
                  position="top-right"
                  onReload={() => enrolledProgramsQuery.refetch()}
                  compact
                />
              </div>
            )}
          </div>
        )}
      </div>

      <DataLoader
        data={enrolledProgramsQuery.data}
        isLoading={enrolledProgramsQuery.isLoading}
        isError={enrolledProgramsQuery.isError}
        error={enrolledProgramsQuery.error}
        isUsingStaleData={enrolledProgramsQuery.isUsingStaleData}
        refetch={enrolledProgramsQuery.refetch}
        loadingElement={loadingElement}
      >
        {renderPrograms}
      </DataLoader>
    </div>
  );
};