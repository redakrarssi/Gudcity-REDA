import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Gift, Award, Clock, BadgeCheck, TrendingUp, Target } from 'lucide-react';
import type { CustomerProgram, LoyaltyProgram, Business } from '../../types/loyalty';

interface EnrolledProgramsProps {
  onRedeem: (programId: string, rewardId: string) => void;
}

interface EnrolledProgramData extends CustomerProgram {
  program: LoyaltyProgram;
  business: Business;
}

export const EnrolledPrograms: React.FC<EnrolledProgramsProps> = ({ onRedeem }) => {
  const { t } = useTranslation();
  const [enrolledPrograms, setEnrolledPrograms] = React.useState<EnrolledProgramData[]>([
    {
      id: '1',
      customerId: '123',
      programId: '1',
      currentPoints: 5,
      lastActivity: new Date().toISOString(),
      enrolledAt: new Date().toISOString(),
      program: {
        id: '1',
        businessId: '123',
        name: 'Coffee Rewards',
        description: 'Earn points for every coffee purchase',
        type: 'POINTS',
        pointValue: 1,
        rewardTiers: [
          { id: '1', programId: '1', pointsRequired: 10, reward: 'Free Coffee' }
        ],
        expirationDays: 365,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      business: {
        id: '123',
        name: 'Local Coffee Shop',
        category: 'CAFE',
        location: {
          address: '123 Main St',
          city: 'Anytown',
          state: 'ST',
          country: 'US'
        }
      }
    }
  ]);
  const [animatedItems, setAnimatedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Add staggered animation to cards
    const timer = setTimeout(() => {
      const newAnimatedItems: Record<string, boolean> = {};
      enrolledPrograms.forEach((program, index) => {
        setTimeout(() => {
          setAnimatedItems(prev => ({
            ...prev,
            [program.id]: true
          }));
        }, index * 150);
      });
    }, 300);
    
    return () => clearTimeout(timer);
  }, [enrolledPrograms]);

  const getNextReward = (enrolledProgram: EnrolledProgramData) => {
    const sortedTiers = [...enrolledProgram.program.rewardTiers]
      .sort((a, b) => a.pointsRequired - b.pointsRequired);
    
    return sortedTiers.find(tier => tier.pointsRequired > enrolledProgram.currentPoints);
  };

  const getProgress = (enrolledProgram: EnrolledProgramData) => {
    const nextReward = getNextReward(enrolledProgram);
    if (!nextReward) return 100;

    const prevTier = [...enrolledProgram.program.rewardTiers]
      .sort((a, b) => b.pointsRequired - a.pointsRequired)
      .find(tier => tier.pointsRequired <= enrolledProgram.currentPoints);

    const start = prevTier ? prevTier.pointsRequired : 0;
    const progress = ((enrolledProgram.currentPoints - start) / (nextReward.pointsRequired - start)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const getBusinessCategoryIcon = (category: string) => {
    switch (category.toUpperCase()) {
      case 'CAFE':
        return '☕';
      case 'RESTAURANT':
        return '🍽️';
      case 'RETAIL':
        return '🛍️';
      case 'FITNESS':
        return '💪';
      default:
        return '🏢';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900 flex items-center">
          <BadgeCheck className="w-5 h-5 text-blue-500 mr-2" />
          {t('myPrograms')}
        </h2>
        <span className="text-sm bg-blue-50 px-3 py-1 rounded-full text-blue-700 font-medium">
          {enrolledPrograms.length} {t('active')}
        </span>
      </div>

      {enrolledPrograms.length > 0 ? (
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
                <div className="flex items-start justify-between">
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
                    <div className="flex items-center justify-end">
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg px-3 py-2 shadow-md transform transition-transform group-hover:scale-105">
                        <TrendingUp className="w-4 h-4 text-white inline mr-1" />
                        <p className="text-2xl font-bold text-white inline">
                          {enrolledProgram.currentPoints}
                        </p>
                        <p className="text-xs text-blue-100">{t('points')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center">
                      <Target className="w-4 h-4 mr-1 text-gray-400" />
                      {nextReward
                        ? t('pointsToNextReward', { points: nextReward.pointsRequired - enrolledProgram.currentPoints })
                        : t('maxTierReached')}
                    </span>
                    <span className="text-gray-900 font-medium">{Math.round(progress)}%</span>
                  </div>
                  <div className="mt-2 relative">
                    <div className="overflow-hidden h-4 rounded-full bg-gray-200 shadow-inner">
                      <div
                        className="h-4 rounded-full bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-600 transition-all duration-1000 ease-out shadow-inner"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {nextReward && (
                      <div 
                        className="absolute top-0 transform -translate-y-1/2" 
                        style={{ left: `${progress}%` }}
                      >
                        <div className="w-6 h-6 rounded-full bg-white border-2 border-indigo-500 shadow-md flex items-center justify-center transform transition-transform group-hover:scale-110">
                          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8 space-y-5">
                  <div className="flex items-center text-sm text-gray-500 bg-gray-50 p-2 rounded-lg">
                    <Clock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                    <span>
                      {t('lastActivity')}: {new Date(enrolledProgram.lastActivity).toLocaleDateString()}
                    </span>
                  </div>

                  {enrolledProgram.program.rewardTiers
                    .filter(tier => tier.pointsRequired <= enrolledProgram.currentPoints)
                    .length > 0 && (
                    <div className="animate-fadeIn">
                      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                        <Gift className="w-4 h-4 mr-1 text-blue-500" />
                        {t('availableRewards')}
                      </h4>
                      <div className="space-y-3">
                        {enrolledProgram.program.rewardTiers
                          .filter(tier => tier.pointsRequired <= enrolledProgram.currentPoints)
                          .map(tier => (
                            <div
                              key={tier.id}
                              className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 transform"
                            >
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-3 shadow-sm">
                                  <Gift className="flex-shrink-0 h-5 w-5 text-white" />
                                </div>
                                <span className="text-sm font-medium text-gray-900">
                                  {tier.reward}
                                </span>
                              </div>
                              <button
                                onClick={() => onRedeem(enrolledProgram.program.id, tier.id)}
                                className="text-sm bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2 rounded-lg transition-all shadow-sm hover:shadow-md font-medium transform hover:scale-105"
                              >
                                {t('redeem')}
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <Award className="w-4 h-4 mr-1 text-gray-500" />
                      {t('upcomingRewards')}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {enrolledProgram.program.rewardTiers
                        .filter(tier => tier.pointsRequired > enrolledProgram.currentPoints)
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
      ) : (
        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl border border-dashed border-blue-200 shadow-inner">
          <Award className="w-14 h-14 text-blue-300 mx-auto mb-3 opacity-70" />
          <p className="text-gray-500 mb-5 font-medium">{t('noEnrolledPrograms')}</p>
          <button className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105">
            {t('browseLoyaltyPrograms')}
          </button>
        </div>
      )}
    </div>
  );
}; 