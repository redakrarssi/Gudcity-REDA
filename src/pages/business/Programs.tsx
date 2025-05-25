import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ProgramBuilder } from '../../components/business/ProgramBuilder';
import { BusinessLayout } from '../../components/business/BusinessLayout';
import { Plus, Award, Calendar, Tag, Clock, ChevronRight, X } from 'lucide-react';
import type { LoyaltyProgram } from '../../types/loyalty';

const Programs = () => {
  const { t } = useTranslation();
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<LoyaltyProgram | null>(null);
  const [showProgramBuilder, setShowProgramBuilder] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulating API call to fetch programs
    setTimeout(() => {
      setPrograms([
        {
          id: '1',
          businessId: '123',
          name: 'Coffee Rewards',
          description: 'Earn points for every coffee purchase',
          type: 'POINTS',
          pointValue: 1,
          rewardTiers: [
            { id: '1', programId: '1', pointsRequired: 10, reward: 'Free Coffee' },
            { id: '2', programId: '1', pointsRequired: 25, reward: 'Free Pastry' },
            { id: '3', programId: '1', pointsRequired: 50, reward: 'Free Lunch' }
          ],
          expirationDays: 365,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          businessId: '123',
          name: 'Lunch Stamps',
          description: 'Collect stamps for every lunch purchase',
          type: 'STAMPS',
          pointValue: 1,
          rewardTiers: [
            { id: '4', programId: '2', pointsRequired: 5, reward: 'Free Drink' },
            { id: '5', programId: '2', pointsRequired: 10, reward: 'Free Meal' }
          ],
          expirationDays: null,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const handleProgramDelete = (programId: string) => {
    // In a real application, this would call an API to delete the program
    setPrograms(programs.filter((program) => program.id !== programId));
  };

  const handleProgramEdit = (program: LoyaltyProgram) => {
    setSelectedProgram(program);
    setShowProgramBuilder(true);
  };

  const handleProgramSubmit = (program: Partial<LoyaltyProgram>) => {
    if (selectedProgram) {
      // Update existing program
      setPrograms(
        programs.map((p) => (p.id === selectedProgram.id ? { ...p, ...program } as LoyaltyProgram : p))
      );
    } else {
      // Create new program
      const newProgram = {
        ...program,
        id: Date.now().toString(),
        businessId: '123', // In a real app, this would come from auth
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as LoyaltyProgram;
      setPrograms([...programs, newProgram]);
    }
    setShowProgramBuilder(false);
    setSelectedProgram(null);
  };

  const handleProgramCancel = () => {
    setShowProgramBuilder(false);
    setSelectedProgram(null);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'POINTS':
        return <Award className="w-5 h-5 text-blue-500" />;
      case 'STAMPS':
        return <Calendar className="w-5 h-5 text-green-500" />;
      case 'CASHBACK':
        return <Tag className="w-5 h-5 text-purple-500" />;
      default:
        return <Award className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {showProgramBuilder ? (
          <div className="bg-white rounded-xl shadow-md">
            <div className="p-6 pb-0 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedProgram ? t('Edit Loyalty Program') : t('Create New Loyalty Program')}
              </h2>
              <button
                onClick={handleProgramCancel}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ProgramBuilder
              initialProgram={selectedProgram || undefined}
              onSubmit={handleProgramSubmit}
              onCancel={handleProgramCancel}
            />
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-semibold text-gray-800">
                {t('Loyalty Programs')}
              </h1>
              <button
                onClick={() => {
                  setSelectedProgram(null);
                  setShowProgramBuilder(true);
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                {t('Create Program')}
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4">
                  {programs.map((program) => (
                    <div
                      key={program.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center">
                            <div className="mr-4 p-2 bg-gray-100 rounded-full">
                              {getTypeIcon(program.type)}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {program.name}
                              </h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {program.description}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              program.status === 'ACTIVE'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {program.status}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-4 border-t border-gray-100 pt-4">
                          <div className="text-sm text-gray-600 flex items-center">
                            <Award className="w-4 h-4 mr-1 text-gray-400" />
                            <span>
                              {program.type === 'POINTS'
                                ? t('{{value}} = 1 point', { value: `$${program.pointValue}` })
                                : t('1 stamp per visit')}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 flex items-center">
                            <Clock className="w-4 h-4 mr-1 text-gray-400" />
                            <span>
                              {program.expirationDays
                                ? t('Points expire after {{days}} days', { days: program.expirationDays })
                                : t('Never expires')}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">{t('Reward Tiers')}:</h4>
                          <ul className="space-y-1">
                            {program.rewardTiers.map((tier) => (
                              <li key={tier.id} className="text-sm text-gray-600">
                                • {tier.pointsRequired} {program.type === 'POINTS' ? t('points') : t('stamps')} ={' '}
                                {tier.reward}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-6 flex justify-end space-x-3">
                          <button
                            onClick={() => handleProgramDelete(program.id)}
                            className="text-sm px-3 py-1.5 border border-red-200 text-red-600 rounded hover:bg-red-50 transition-colors"
                          >
                            {t('Delete')}
                          </button>
                          <button
                            onClick={() => handleProgramEdit(program)}
                            className="text-sm flex items-center px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            {t('Edit')}
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {programs.length === 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                    <Award className="w-12 h-12 mx-auto text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">
                      {t('No Programs Found')}
                    </h3>
                    <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
                      {t('You haven\'t created any loyalty programs yet. Create your first program to start rewarding your customers.')}
                    </p>
                    <button
                      onClick={() => {
                        setSelectedProgram(null);
                        setShowProgramBuilder(true);
                      }}
                      className="mt-6 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mx-auto"
                    >
                      <Plus className="w-5 h-5" />
                      {t('Create Your First Program')}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </BusinessLayout>
  );
};

export default Programs; 