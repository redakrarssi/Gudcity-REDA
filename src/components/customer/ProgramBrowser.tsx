import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, MapPin, Tag, Star, Coffee, Filter, Gift, Check } from 'lucide-react';
import type { Business, LoyaltyProgram } from '../../types/loyalty';

interface ProgramBrowserProps {
  onEnroll: (programId: string) => void;
}

export const ProgramBrowser: React.FC<ProgramBrowserProps> = ({ onEnroll }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [animatedItems, setAnimatedItems] = useState<Record<string, boolean>>({});
  const [programs, setPrograms] = useState<(LoyaltyProgram & { business: Business })[]>([
    {
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
      updatedAt: new Date().toISOString(),
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

  useEffect(() => {
    // Add staggered animation to cards
    const timer = setTimeout(() => {
      const newAnimatedItems: Record<string, boolean> = {};
      filteredPrograms.forEach((program, index) => {
        setTimeout(() => {
          setAnimatedItems(prev => ({
            ...prev,
            [program.id]: true
          }));
        }, index * 150);
      });
    }, 300);
    
    return () => clearTimeout(timer);
  }, [selectedCategory, searchTerm]);

  const categories = Array.from(new Set(programs.map(p => p.business.category)));

  const filteredPrograms = programs.filter(program => {
    const matchesSearch = 
      program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      program.business.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || program.business.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getBusinessCategoryIcon = (category: string) => {
    switch (category.toUpperCase()) {
      case 'CAFE':
        return <Coffee className="w-5 h-5 text-yellow-600" />;
      case 'RESTAURANT':
        return '🍽️';
      case 'RETAIL':
        return '🛍️';
      case 'FITNESS':
        return '💪';
      default:
        return <Star className="w-5 h-5 text-purple-500" />;
    }
  };

  const getBestReward = (program: LoyaltyProgram) => {
    if (!program.rewardTiers.length) return null;
    return [...program.rewardTiers].sort((a, b) => b.pointsRequired - a.pointsRequired)[0];
  };

  return (
    <div className="space-y-6 program-browser">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('searchPrograms')}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm"
          />
        </div>

        {/* Category Filter */}
        <div className="w-full md:w-48 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="h-4 w-4 text-gray-400" />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm appearance-none"
          >
            <option value="">{t('allCategories')}</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {t(`categories.${category.toLowerCase()}`)}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Programs Grid */}
      {filteredPrograms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrograms.map(program => {
            const bestReward = getBestReward(program);
            
            return (
              <div 
                key={program.id} 
                className={`group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-500 border border-gray-200 overflow-hidden transform program-card ${
                  animatedItems[program.id] ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'
                } hover:-translate-y-2 hover:border-blue-300 perspective-1000`}
              >
                <div className="relative">
                  <div className="absolute top-0 right-0 mt-4 mr-4 z-10">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 shadow-sm">
                      {program.type}
                    </span>
                  </div>
                  <div className="h-32 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 relative overflow-hidden">
                    <div className="absolute inset-0 bg-pattern opacity-10"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                    <div className="absolute bottom-3 left-6 text-white text-xs font-medium px-2 py-1 bg-black/30 rounded-full">
                      {program.business.category}
                    </div>
                  </div>
                  <div className="absolute -bottom-10 left-6">
                    <div className="w-20 h-20 rounded-xl bg-white border-4 border-white shadow-xl flex items-center justify-center overflow-hidden transform transition-transform group-hover:scale-110 group-hover:rotate-3">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 w-full h-full flex items-center justify-center">
                        {getBusinessCategoryIcon(program.business.category)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 pt-14">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{program.business.name}</h3>
                      <p className="mt-1 text-sm text-gray-600">{program.name}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      <span>{program.business.location.city}, {program.business.location.state}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Tag className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                      <span>{t(`categories.${program.business.category.toLowerCase()}`)}</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center">
                      <Gift className="w-4 h-4 mr-1.5 text-blue-500" />
                      {t('rewards')}
                    </h4>
                    <div className="mt-2 space-y-2">
                      {program.rewardTiers.slice(0, 2).map((tier, index) => (
                        <div 
                          key={tier.id} 
                          className="flex justify-between items-center p-2 rounded-lg bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-colors"
                        >
                          <div className="flex items-center text-sm text-gray-600">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center mr-2 shadow-sm">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                            {tier.reward}
                          </div>
                          <span className="text-xs bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 px-2 py-0.5 rounded-full font-medium border border-blue-200/50 shadow-sm">
                            {tier.pointsRequired} {t('points')}
                          </span>
                        </div>
                      ))}
                      {program.rewardTiers.length > 2 && (
                        <div className="text-xs text-blue-600 mt-1 ml-1 font-medium">
                          +{program.rewardTiers.length - 2} more rewards
                        </div>
                      )}
                    </div>
                  </div>

                  {bestReward && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center p-2 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-100">
                        <Star className="flex-shrink-0 mr-1.5 h-4 w-4 text-yellow-500" />
                        <span className="text-sm text-amber-800 font-medium mr-1">Top reward:</span>
                        <span className="text-sm text-amber-700">{bestReward.reward}</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-5">
                    <button
                      onClick={() => onEnroll(program.id)}
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 hover:from-blue-700 hover:to-indigo-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg"
                    >
                      {t('joinProgram')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-dashed border-gray-300 shadow-inner">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 mb-4 font-medium">{t('noPrograms')}</p>
          <p className="text-sm text-gray-500">{t('tryAdjustingSearch')}</p>
        </div>
      )}
    </div>
  );
}; 