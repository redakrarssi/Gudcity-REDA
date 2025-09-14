import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Info } from 'lucide-react';
import { getActivePlans, PricingPlan } from '../../services/pricingService';

type BillingPeriod = 'monthly' | 'yearly';
type DisplayPlan = {
  id: number;
  name: string;
  description: string;
  price: number;
  billing_period: BillingPeriod;
  currency: string;
  features: { id: string; label: string }[];
  recommended: boolean;
  color: 'gray' | 'blue' | 'purple' | 'green';
};

function defaultPlanColor(name: string): 'gray' | 'blue' | 'purple' | 'green' {
  const n = name.toLowerCase();
  if (n.includes('pro') || n.includes('growth')) return 'blue';
  if (n.includes('premium') || n.includes('enterprise')) return 'purple';
  if (n.includes('free') || n.includes('basic')) return 'gray';
  return 'green';
}

const PricingPlans: React.FC = () => {
  const { t } = useTranslation();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const dbPlans = await getActivePlans();
        if (mounted) setPlans(dbPlans);
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load pricing plans');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const displayedPlans: DisplayPlan[] = useMemo((): DisplayPlan[] => {
    return plans.map((p: PricingPlan): DisplayPlan => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      billing_period: p.billing_period,
      currency: p.currency,
      features: (p.features || []).filter((f) => f.included).map((f) => ({
        id: f.id,
        label: f.limit ? `${f.name} (${f.limit})` : f.name
      })),
      recommended: !!p.is_popular,
      color: defaultPlanColor(p.name)
    }));
  }, [plans]);

  const getPrice = (monthlyPrice: number): number => {
    if (billingPeriod === 'yearly') return monthlyPrice * 12 * 0.8;
    return monthlyPrice;
  };

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-4 text-gray-900">{t('Pricing Plans')}</h2>
          <p className="text-lg text-gray-600 mb-8">
            {t('Choose the perfect plan for your business needs')}
          </p>

          {/* Billing period toggle */}
          <div className="flex items-center justify-center mb-8">
            <div className="bg-white p-1 rounded-lg shadow-sm inline-flex">
              <button
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  billingPeriod === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setBillingPeriod('monthly')}
              >
                {t('Monthly')}
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  billingPeriod === 'yearly'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setBillingPeriod('yearly')}
              >
                {t('Yearly')} <span className="text-xs font-normal">(-20%)</span>
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="max-w-3xl mx-auto text-gray-600 text-center mb-6">{t('Loading...')}</div>
        )}
        {error && (
          <div className="max-w-3xl mx-auto text-red-600 text-center mb-6">{error}</div>
        )}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {displayedPlans.map((plan) => (
            <div 
              key={plan.id}
              className={`
                bg-white rounded-2xl shadow-md overflow-hidden relative
                ${plan.recommended ? 'md:scale-110 z-10 shadow-xl border-2 border-blue-500' : ''}
              `}
            >
              {plan.recommended && (
                <div className="bg-blue-500 text-white text-xs font-bold py-1 px-4 absolute top-0 right-0 rounded-bl-lg">
                  {t('Recommended')}
                </div>
              )}
              
              <div className={`p-8 ${plan.recommended ? 'pt-10' : ''}`}>
                <h3 className="text-xl font-bold mb-1 text-gray-900">{plan.name}</h3>
                <p className="text-gray-500 mb-4">{plan.description}</p>
                
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    ${getPrice(plan.price)}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-500 ml-2">
                      /{billingPeriod === 'monthly' ? t('month') : t('year')}
                    </span>
                  )}
                </div>
                
                <button
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors mb-8
                    ${plan.recommended 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                    }
                  `}
                >
                  {plan.price === 0 ? t('Sign Up Free') : t('Get Started')}
                </button>
                
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className={`h-5 w-5 mr-2 flex-shrink-0 text-${plan.color}-500`} />
                      <span className="text-gray-600">{feature.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <div className="inline-flex items-center bg-blue-50 p-4 rounded-lg">
            <Info className="h-5 w-5 text-blue-500 mr-2" />
            <p className="text-sm text-blue-700">
              {t('Need a custom plan for your enterprise? ')}
              <a href="#" className="font-medium underline">
                {t('Contact our sales team')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingPlans; 