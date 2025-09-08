import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusCircle, MinusCircle, Award, Check, ChevronRight, ChevronLeft, Star, Gift, Zap } from 'lucide-react';
import type { LoyaltyProgram, ProgramType, RewardTier } from '../../types/loyalty';
import { useBusinessCurrency } from '../../contexts/BusinessCurrencyContext';

interface ProgramBuilderProps {
  initialProgram?: LoyaltyProgram;
  onSubmit: (program: Partial<LoyaltyProgram>) => void;
  onCancel?: () => void;
}

export const ProgramBuilder: React.FC<ProgramBuilderProps> = ({ initialProgram, onSubmit, onCancel }) => {
  const { t } = useTranslation();
  const { currencySymbol } = useBusinessCurrency();
  const [program, setProgram] = useState<Partial<LoyaltyProgram>>({
    name: initialProgram?.name || '',
    description: initialProgram?.description || '',
    type: initialProgram?.type || 'POINTS',
    pointValue: initialProgram?.pointValue || 1,
    expirationDays: initialProgram?.expirationDays || null,
    status: initialProgram?.status || 'ACTIVE',
    rewardTiers: initialProgram?.rewardTiers || [{ 
      id: `new-${Date.now()}`, 
      programId: initialProgram?.id || 'new',
      pointsRequired: 10, 
      reward: '' 
    }],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [animation, setAnimation] = useState('');
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    { title: t('business.Program Basics'), description: t('business.Name and describe your loyalty program') },
    { title: t('business.Program Type'), description: t('business.Choose how customers earn rewards') },
    { title: t('business.Create Rewards'), description: t('business.Define what customers can redeem') },
    { title: t('business.Review & Launch'), description: t('business.Ready to launch your program?') },
  ];

  const handleInputChange = (field: keyof LoyaltyProgram, value: any) => {
    setProgram(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleRewardTierChange = (index: number, field: keyof RewardTier, value: any) => {
    const newRewardTiers = [...(program.rewardTiers || [])];
    newRewardTiers[index] = { ...newRewardTiers[index], [field]: value };
    handleInputChange('rewardTiers', newRewardTiers);
  };

  const addRewardTier = () => {
    const lastTier = program.rewardTiers?.[program.rewardTiers.length - 1];
    const newPointsRequired = lastTier ? lastTier.pointsRequired + 10 : 10;
    const newTier: RewardTier = {
      id: `new-${Date.now()}-${program.rewardTiers?.length || 0}`,
      programId: initialProgram?.id || 'new',
      pointsRequired: newPointsRequired,
      reward: ''
    };
    
    handleInputChange('rewardTiers', [...(program.rewardTiers || []), newTier]);
    
    // Add animation effect
    setAnimation('pulse');
    setTimeout(() => setAnimation(''), 500);
  };

  const removeRewardTier = (index: number) => {
    const newRewardTiers = program.rewardTiers?.filter((_, i) => i !== index);
    handleInputChange('rewardTiers', newRewardTiers);
  };

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (step === 0) {
      if (!program.name) newErrors.name = t('business.required');
      if (!program.description) newErrors.description = t('business.required');
    } else if (step === 1) {
      if (program.pointValue && program.pointValue <= 0) newErrors.pointValue = t('business.mustBePositive');
    } else if (step === 2) {
      const hasEmptyRewards = program.rewardTiers?.some(tier => !tier.reward);
      if (hasEmptyRewards) newErrors.rewardTiers = t('business.allRewardsRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) {
      if (!completedSteps.includes(step)) {
        setCompletedSteps([...completedSteps, step]);
      }
      setStep(prevStep => Math.min(prevStep + 1, steps.length - 1));
    }
  };

  const prevStep = () => {
    setStep(prevStep => Math.max(prevStep - 1, 0));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep()) {
      onSubmit(program);
    }
  };

  const ProgramTypeCard = ({ type, title, description, icon }: { type: ProgramType, title: string, description: string, icon: React.ReactNode }) => (
    <div 
      className={`border rounded-lg p-6 cursor-pointer transition-all transform hover:scale-105 ${program.type === type ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500' : 'border-gray-200 hover:border-blue-200'}`}
      onClick={() => handleInputChange('type', type)}
    >
      <div className="flex items-center mb-3">
        <div className={`p-2 rounded-full mr-3 ${program.type === type ? 'bg-blue-100' : 'bg-gray-100'}`}>
          {icon}
        </div>
        <h3 className="text-lg font-medium">{title}</h3>
        {program.type === type && <Check className="ml-auto text-blue-500" size={20} />}
      </div>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-100 mb-6">
              <h3 className="text-lg font-medium text-blue-800 mb-2">{t('business.Create Your Loyalty Program')}</h3>
              <p className="text-blue-700">{t('business.Give your program a memorable name and clear description to attract customers')}</p>
            </div>
            <div className="animate-fadeIn">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('business.Program Name')}</label>
              <input
                type="text"
                value={program.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg"
                placeholder={t('business.exampleProgramName')}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div className="animate-fadeIn delay-100">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('business.Program Description')}</label>
              <textarea
                value={program.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder={t('business.programDescriptionPlaceholder')}
              />
              {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <ProgramTypeCard 
                type="POINTS" 
                title={t('business.Points')} 
                description={t('business.Customers earn points based on purchases that they can redeem for rewards')}
                icon={<Star className="w-6 h-6 text-blue-500" />}
              />
              <ProgramTypeCard 
                type="STAMPS" 
                title={t('business.Stamps')} 
                description={t('business.Digital punch card: one stamp per visit or purchase, simple and effective')}
                icon={<Check className="w-6 h-6 text-green-500" />}
              />
              <ProgramTypeCard 
                type="CASHBACK" 
                title={t('business.Cashback')} 
                description={t('business.Customers earn a percentage back from each purchase to use on future orders')}
                icon={<Zap className="w-6 h-6 text-yellow-500" />}
              />
            </div>

            {program.type === 'POINTS' && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 animate-fadeIn">
                <label className="block text-sm font-medium text-gray-700 mb-4">{t('business.How much do customers need to spend to earn 1 point?')}</label>
                <div className="flex items-center">
                  <span className="mr-4 text-xl">{currencySymbol}</span>
                  <input
                    type="number"
                    value={program.pointValue}
                    onChange={(e) => handleInputChange('pointValue', parseFloat(e.target.value))}
                    className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-center text-xl"
                    placeholder="1.00"
                    step="0.01"
                    min="0.01"
                  />
                  <span className="ml-4 text-gray-600">{t('business.= 1 point')}</span>
                </div>
                {errors.pointValue && <p className="mt-1 text-sm text-red-600">{errors.pointValue}</p>}
              </div>
            )}

            <div className="animate-fadeIn delay-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('business.Do your points expire?')}</label>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => handleInputChange('expirationDays', null)}
                  className={`px-4 py-2 rounded-md ${program.expirationDays === null ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {t('business.Never expire')}
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('expirationDays', 365)}
                  className={`px-4 py-2 rounded-md ${program.expirationDays !== null ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {t('business.Expire after')}
                </button>
                {program.expirationDays !== null && (
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={program.expirationDays || ''}
                      onChange={(e) => handleInputChange('expirationDays', e.target.value ? parseInt(e.target.value) : null)}
                      className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-center"
                      min="1"
                    />
                    <span className="ml-2">{t('business.days')}</span>
                  </div>
                )}
              </div>
              {errors.expirationDays && <p className="mt-1 text-sm text-red-600">{errors.expirationDays}</p>}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 mb-8">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-100 mb-6">
              <h3 className="text-lg font-medium text-purple-800 mb-2">{t('business.Create Exciting Rewards')}</h3>
              <p className="text-purple-700">{t('business.Design rewards that will delight your customers and keep them coming back')}</p>
            </div>
            
            <div className="space-y-4">
              <label className="block text-base font-medium text-gray-800">{t('business.Reward Tiers')}</label>
              
              <div className={`space-y-6 ${animation === 'pulse' ? 'animate-pulse' : ''}`}>
                {program.rewardTiers?.map((tier, index) => (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 transition-shadow hover:shadow-md">
                    <div className="flex items-center mb-4">
                      <span className="w-8 h-8 flex items-center justify-center bg-blue-500 text-white text-sm font-bold rounded-full mr-3">
                        {index + 1}
                      </span>
                      <h4 className="text-lg font-medium">{t('business.Reward Tier')}</h4>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removeRewardTier(index)}
                          className="ml-auto text-red-500 hover:text-red-700 transition-colors"
                        >
                          <MinusCircle className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {program.type === 'POINTS' ? t('business.Points Required') : t('business.Stamps Required')}
                        </label>
                        <div className="flex">
                          <input
                            type="number"
                            value={tier.pointsRequired}
                            onChange={(e) => handleRewardTierChange(index, 'pointsRequired', parseInt(e.target.value))}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-center"
                            min="1"
                          />
                          <span className="ml-2 flex items-center text-gray-600">
                            {program.type === 'POINTS' ? t('business.points') : t('business.stamps')}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('business.Reward Description')}</label>
                        <div className="flex">
                          <span className="flex items-center mr-2">
                            <Gift className="w-5 h-5 text-purple-500" />
                          </span>
                          <input
                            type="text"
                            value={tier.reward}
                            onChange={(e) => handleRewardTierChange(index, 'reward', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder={t('business.exampleReward')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                type="button"
                onClick={addRewardTier}
                className="flex items-center justify-center w-full py-3 mt-4 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                {t('business.Add Another Reward Tier')}
              </button>
              
              {errors.rewardTiers && (
                <p className="mt-1 text-sm text-red-600 bg-red-50 p-2 rounded">{errors.rewardTiers}</p>
              )}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 mb-8">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-100 mb-6">
              <h3 className="text-lg font-medium text-green-800 mb-2">{t('business.Ready to Launch!')}</h3>
              <p className="text-green-700">{t('business.Review your program details before launching it to your customers')}</p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">{program.name}</h3>
                <p className="mt-2 text-gray-600">{program.description}</p>
              </div>
              
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center">
                  <Star className="w-5 h-5 text-yellow-500 mr-2" />
                  <h4 className="font-medium">{t('business.Program Type')}: {program.type}</h4>
                </div>
                
                <div className="mt-2 text-sm text-gray-600">
                  {program.type === 'POINTS' && (
                    <p>{t('business.Customers earn 1 point for every')} {currencySymbol}{program.pointValue} {t('business.spent')}</p>
                  )}
                  {program.expirationDays 
                    ? t('business.Points expire after {{days}} days', { days: program.expirationDays })
                    : t('business.Points never expire')}
                </div>
              </div>
              
              <div className="p-6">
                <h4 className="font-medium mb-3">{t('business.Reward Tiers')}:</h4>
                <ul className="space-y-2">
                  {program.rewardTiers?.map((tier, index) => (
                    <li key={index} className="flex items-center py-2 border-b border-gray-100">
                      <div className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full mr-3">
                        {index + 1}
                      </div>
                      <div>
                        <span className="text-gray-900 font-medium">{tier.reward}</span>
                        <div className="text-sm text-gray-600">
                          {tier.pointsRequired} {program.type === 'POINTS' ? t('business.points') : t('business.stamps')} {t('business.required')}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('business.Program Status')}</label>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => handleInputChange('status', 'ACTIVE')}
                  className={`px-4 py-2 rounded-md ${program.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  <div className="flex items-center">
                    <Check className="w-4 h-4 mr-2" />
                    {t('business.Launch as Active')}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('status', 'INACTIVE')}
                  className={`px-4 py-2 rounded-md ${program.status === 'INACTIVE' ? 'bg-gray-700 text-white border-2 border-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {t('business.Save as Draft')}
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg">
      {/* Progress Steps */}
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  completedSteps.includes(i)
                    ? 'bg-green-500 text-white'
                    : i === step
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                }`}
              >
                {completedSteps.includes(i) ? <Check size={16} /> : i + 1}
              </div>
              <div className="text-xs font-medium mt-2 text-center">
                {s.title}
              </div>
              {i < steps.length - 1 && (
                <div className={`h-1 w-full mt-3 ${
                  i < step ? 'bg-blue-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-6 pb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          {steps[step].title}
        </h2>
        <p className="text-gray-600 mb-6">{steps[step].description}</p>

        {renderStepContent()}

        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={step > 0 ? prevStep : onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            {step > 0 ? (
              <div className="flex items-center">
                <ChevronLeft className="w-4 h-4 mr-1" />
                {t('business.Previous')}
              </div>
            ) : t('business.Cancel')}
          </button>
          
          <button
            type={step === steps.length - 1 ? 'submit' : 'button'}
            onClick={step === steps.length - 1 ? undefined : nextStep}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <div className="flex items-center">
              {step === steps.length - 1 ? t('business.Launch Program') : t('business.Continue')}
              {step < steps.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
            </div>
          </button>
        </div>
      </form>
    </div>
  );
}; 