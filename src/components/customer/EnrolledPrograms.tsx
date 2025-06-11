import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Gift, Award, Clock, BadgeCheck, Loader2, TrendingUp, Target } from 'lucide-react';
import { useEnrolledPrograms, EnrolledProgramData } from '../../hooks/useEnrolledPrograms';
import { DataLoader } from '../common/DataLoader';
import { FallbackIndicator } from '../common/FallbackIndicator';

interface EnrolledProgramsProps {
  onRedeem: (programId: string, rewardId: string) => void;
}

export const EnrolledPrograms: React.FC<EnrolledProgramsProps> = ({ onRedeem }) => {
  const { t } = useTranslation();
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

  // Helper function to get the next reward for a program
  const getNextReward = (enrolledProgram: EnrolledProgramData) => {
    if (!enrolledProgram.program.rewardTiers || enrolledProgram.program.rewardTiers.length === 0) {
      return null;
    }
    
    const sortedTiers = [...enrolledProgram.program.rewardTiers]
      .sort((a, b) => a.pointsRequired - b.pointsRequired);
    
    return sortedTiers.find(tier => tier.pointsRequired > enrolledProgram.currentPoints) || null;
  };

  // Helper function to calculate progress percentage
  const getProgress = (enrolledProgram: EnrolledProgramData) => {
    const nextReward = getNextReward(enrolledProgram);
    
    if (!nextReward) {
      return 100; // Already reached max reward
    }
    
    // Find the previous tier if any
    const sortedTiers = [...enrolledProgram.program.rewardTiers]
      .sort((a, b) => a.pointsRequired - b.pointsRequired);
    
    const currentTierIndex = sortedTiers.findIndex(tier => tier.id === nextReward.id) - 1;
    const prevTier = currentTierIndex >= 0 ? sortedTiers[currentTierIndex] : null;
    
    const startPoints = prevTier ? prevTier.pointsRequired : 0;
    const targetPoints = nextReward.pointsRequired;
    const currentPoints = enrolledProgram.currentPoints;
    
    // Calculate percentage between current tier and next tier
    const progress = ((currentPoints - startPoints) / (targetPoints - startPoints)) * 100;
    
    // Ensure progress stays between 0-100
    return Math.min(Math.max(progress, 0), 100);
  };

  // Helper function to render business category icon
  const getBusinessCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'restaurant':
      case 'food':
      case 'cafe':
        return <Gift />;
      case 'retail':
      case 'shopping':
        return <Award />;
      case 'entertainment':
      case 'leisure':
        return <Clock />;
      case 'fitness':
      case 'health':
        return <TrendingUp />;
      default:
        return <Target />;
    }
  };

  // Custom loading component
  const loadingElement = (
    <div className="flex justify-center items-center py-16">
      <div className="flex flex-col items-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
        <p className="text-gray-500">{t('enrolledPrograms.loading', 'Loading your programs...')}</p>
      </div>
    </div>
  );

  // Empty state component
  const renderEmptyState = () => (
    <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-dashed border-blue-200 shadow-inner">
      <Award className="w-14 h-14 text-blue-300 mx-auto mb-3 opacity-70" />
      <p className="text-gray-500 mb-5 font-medium">{t('noEnrolledPrograms')}</p>
      <button className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105">
        {t('browseLoyaltyPrograms')}
      </button>
    </div>
  );

  // Render the main program list
  const renderPrograms = (enrolledPrograms: EnrolledProgramData[]) => {
    // Set up animations
    useEffect(() => handleProgramsLoaded(enrolledPrograms), [enrolledPrograms]);
    
    if (enrolledPrograms.length === 0) {
      return renderEmptyState();
    }

    return (
      <div className="grid grid-cols-1 gap-6">
        {enrolledPrograms.map(enrolledProgram => {
          const nextReward = getNextReward(enrolledProgram);
          const progress = getProgress(enrolledProgram);

          return (
            <div 
              key={enrolledProgram.id} 
              className={`group bg-gradient-to-br from-white via-white to-blue-50 rounded-xl shadow-lg border border-blue-100 p-6 transform transition-all duration-500 ease-out hover:shadow-xl hover:-translate-y-1 ${
                animatedItems[enrolledProgram.id] ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
              }`}
            >
              <div className="flex justify-between">
                <div className="flex">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-2xl mr-4 shadow-md transform transition-transform group-hover:scale-110 group-hover:rotate-3">
                    <div className="text-white">
                      {getBusinessCategoryIcon(enrolledProgram.business.category)}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                      {enrolledProgram.business.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {enrolledProgram.program.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-indigo-600 flex items-center">
                    {enrolledProgram.currentPoints}
                    <span className="text-sm font-medium text-indigo-400 ml-1">{t('points')}</span>
                  </div>
                  {nextReward && (
                    <p className="mt-1 text-xs text-gray-500">
                      {nextReward.pointsRequired - enrolledProgram.currentPoints} {t('pointsToNextReward')}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <div className="flex justify-between mb-2 text-xs text-gray-500">
                  <span>{enrolledProgram.currentPoints} {t('points')}</span>
                  {nextReward && <span>{nextReward.pointsRequired} {t('points')}</span>}
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-right text-gray-500">
                  {nextReward ? (
                    <span>{Math.round(progress)}% {t('complete')}</span>
                  ) : (
                    <span>{t('allRewardsUnlocked')}</span>
                  )}
                </div>
              </div>

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
        isUsingFallbackData={enrolledProgramsQuery.isUsingFallbackData}
        refetch={enrolledProgramsQuery.refetch}
        loadingElement={loadingElement}
        showFallbackIndicator={false} // We handle this manually in the header
      >
        {renderPrograms}
      </DataLoader>
    </div>
  );
};