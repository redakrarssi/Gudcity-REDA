import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/admin/AdminLayout';
import {
  DollarSign,
  Plus,
  Edit,
  Trash,
  Save,
  X,
  Check,
  Star,
  BarChart2,
  Clock,
  Users,
  Tag,
  Zap,
  Copy
} from 'lucide-react';

// Types for pricing plans
interface Feature {
  id: string;
  name: string;
  included: boolean;
  limit?: number;
}

interface PricingPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  billingPeriod: 'monthly' | 'yearly';
  currency: string;
  features: Feature[];
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
}

// Mock data for pricing plans
const MOCK_PLANS: PricingPlan[] = [
  {
    id: 1,
    name: 'Free',
    description: 'Basic features for small businesses',
    price: 0,
    billingPeriod: 'monthly',
    currency: 'USD',
    features: [
      { id: 'loyalty', name: 'Basic loyalty program', included: true },
      { id: 'customers', name: 'Up to 100 customers', included: true, limit: 100 },
      { id: 'analytics', name: 'Basic analytics', included: true },
      { id: 'support', name: 'Email support', included: true },
      { id: 'customization', name: 'Customization options', included: false },
      { id: 'marketing', name: 'Marketing tools', included: false },
      { id: 'api', name: 'API access', included: false }
    ],
    isPopular: false,
    isActive: true,
    sortOrder: 1
  },
  {
    id: 2,
    name: 'Pro',
    description: 'Advanced features for growing businesses',
    price: 49.99,
    billingPeriod: 'monthly',
    currency: 'USD',
    features: [
      { id: 'loyalty', name: 'Advanced loyalty program', included: true },
      { id: 'customers', name: 'Up to 1,000 customers', included: true, limit: 1000 },
      { id: 'analytics', name: 'Advanced analytics', included: true },
      { id: 'support', name: 'Priority email support', included: true },
      { id: 'customization', name: 'Customization options', included: true },
      { id: 'marketing', name: 'Basic marketing tools', included: true },
      { id: 'api', name: 'Limited API access', included: true }
    ],
    isPopular: true,
    isActive: true,
    sortOrder: 2
  },
  {
    id: 3,
    name: 'Enterprise',
    description: 'Full featured solution for large businesses',
    price: 199.99,
    billingPeriod: 'monthly',
    currency: 'USD',
    features: [
      { id: 'loyalty', name: 'Enterprise loyalty program', included: true },
      { id: 'customers', name: 'Unlimited customers', included: true },
      { id: 'analytics', name: 'Enterprise analytics', included: true },
      { id: 'support', name: '24/7 phone & email support', included: true },
      { id: 'customization', name: 'Full customization', included: true },
      { id: 'marketing', name: 'Advanced marketing tools', included: true },
      { id: 'api', name: 'Full API access', included: true }
    ],
    isPopular: false,
    isActive: true,
    sortOrder: 3
  }
];

// List of available features for plans
const AVAILABLE_FEATURES = [
  { id: 'loyalty', name: 'Loyalty Program' },
  { id: 'customers', name: 'Customer Limit' },
  { id: 'analytics', name: 'Analytics' },
  { id: 'support', name: 'Support' },
  { id: 'customization', name: 'Customization' },
  { id: 'marketing', name: 'Marketing Tools' },
  { id: 'api', name: 'API Access' },
  { id: 'integrations', name: 'Third-party Integrations' },
  { id: 'reports', name: 'Reporting' },
  { id: 'team', name: 'Team Members' }
];

const PricingPlans = () => {
  const { t } = useTranslation();
  
  // State
  const [plans, setPlans] = useState<PricingPlan[]>(MOCK_PLANS);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Plan form state
  const [planForm, setPlanForm] = useState<Partial<PricingPlan>>({
    name: '',
    description: '',
    price: 0,
    billingPeriod: 'monthly',
    currency: 'USD',
    features: [],
    isPopular: false,
    isActive: true,
    sortOrder: 0
  });
  
  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };
  
  // Handle plan selection for editing
  const handleEditPlan = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setPlanForm({
      ...plan,
      features: [...plan.features]
    });
    setIsEditModalOpen(true);
  };
  
  // Handle new plan creation
  const handleCreatePlan = () => {
    setSelectedPlan(null);
    setPlanForm({
      name: '',
      description: '',
      price: 0,
      billingPeriod: 'monthly',
      currency: 'USD',
      features: AVAILABLE_FEATURES.map(feature => ({
        id: feature.id,
        name: feature.name,
        included: false
      })),
      isPopular: false,
      isActive: true,
      sortOrder: plans.length + 1
    });
    setIsEditModalOpen(true);
  };
  
  // Handle plan save
  const handleSavePlan = () => {
    if (!planForm.name || planForm.price === undefined) return;
    
    if (selectedPlan) {
      // Update existing plan
      setPlans(prevPlans => 
        prevPlans.map(plan => 
          plan.id === selectedPlan.id
            ? { 
                ...plan,
                name: planForm.name!,
                description: planForm.description || '',
                price: planForm.price!,
                billingPeriod: planForm.billingPeriod as 'monthly' | 'yearly',
                currency: planForm.currency || 'USD',
                features: planForm.features || [],
                isPopular: planForm.isPopular || false,
                isActive: planForm.isActive || false,
                sortOrder: planForm.sortOrder || plan.sortOrder
              }
            : plan
        )
      );
    } else {
      // Create new plan
      const newPlan: PricingPlan = {
        id: Math.max(...plans.map(p => p.id)) + 1,
        name: planForm.name!,
        description: planForm.description || '',
        price: planForm.price!,
        billingPeriod: planForm.billingPeriod as 'monthly' | 'yearly',
        currency: planForm.currency || 'USD',
        features: planForm.features || [],
        isPopular: planForm.isPopular || false,
        isActive: planForm.isActive || false,
        sortOrder: planForm.sortOrder || plans.length + 1
      };
      setPlans([...plans, newPlan]);
    }
    
    setIsEditModalOpen(false);
  };
  
  // Handle plan deletion
  const handleDeletePlan = () => {
    if (!selectedPlan) return;
    
    setPlans(prevPlans => prevPlans.filter(plan => plan.id !== selectedPlan.id));
    setIsDeleteModalOpen(false);
    setSelectedPlan(null);
  };
  
  // Handle feature toggle
  const handleFeatureToggle = (featureId: string) => {
    setPlanForm(prev => {
      const features = prev.features || [];
      return {
        ...prev,
        features: features.map(feature => 
          feature.id === featureId
            ? { ...feature, included: !feature.included }
            : feature
        )
      };
    });
  };
  
  // Handle feature limit change
  const handleFeatureLimitChange = (featureId: string, limit?: number) => {
    setPlanForm(prev => {
      const features = prev.features || [];
      return {
        ...prev,
        features: features.map(feature => 
          feature.id === featureId
            ? { ...feature, limit }
            : feature
        )
      };
    });
  };
  
  // Sort plans by sort order
  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);
  
  // Edit Modal Component
  const EditModal = () => {
    if (!isEditModalOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {selectedPlan ? t('Edit Pricing Plan') : t('Create New Pricing Plan')}
            </h2>
            <button 
              onClick={() => setIsEditModalOpen(false)} 
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Plan Name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={planForm.name || ''}
                    onChange={e => setPlanForm({...planForm, name: e.target.value})}
                    placeholder={t('Enter plan name')}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Sort Order')}
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={planForm.sortOrder || 0}
                    onChange={e => setPlanForm({...planForm, sortOrder: parseInt(e.target.value)})}
                    min="1"
                    step="1"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {t('Plans are displayed in ascending order')}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Description')}
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={planForm.description || ''}
                  onChange={e => setPlanForm({...planForm, description: e.target.value})}
                  placeholder={t('Enter plan description')}
                  rows={2}
                ></textarea>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Price')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">
                        {planForm.currency === 'USD' ? '$' : 
                         planForm.currency === 'EUR' ? '€' : 
                         planForm.currency === 'GBP' ? '£' : '$'}
                      </span>
                    </div>
                    <input
                      type="number"
                      className="w-full pl-7 pr-12 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={planForm.price || 0}
                      onChange={e => setPlanForm({...planForm, price: parseFloat(e.target.value)})}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Currency')}
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={planForm.currency}
                    onChange={e => setPlanForm({...planForm, currency: e.target.value})}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('Billing Period')}
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={planForm.billingPeriod}
                    onChange={e => setPlanForm({...planForm, billingPeriod: e.target.value as 'monthly' | 'yearly'})}
                  >
                    <option value="monthly">{t('Monthly')}</option>
                    <option value="yearly">{t('Yearly')}</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="plan-popular"
                    checked={planForm.isPopular || false}
                    onChange={e => setPlanForm({...planForm, isPopular: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="plan-popular" className="ml-2 block text-sm text-gray-900">
                    {t('Mark as Popular')}
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="plan-active"
                    checked={planForm.isActive || false}
                    onChange={e => setPlanForm({...planForm, isActive: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="plan-active" className="ml-2 block text-sm text-gray-900">
                    {t('Active')}
                  </label>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">{t('Plan Features')}</h3>
                
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-6 text-sm font-medium text-gray-700">{t('Feature')}</div>
                      <div className="col-span-3 text-sm font-medium text-gray-700">{t('Included')}</div>
                      <div className="col-span-3 text-sm font-medium text-gray-700">{t('Limit')}</div>
                    </div>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {planForm.features?.map(feature => (
                      <div key={feature.id} className="px-4 py-3 bg-white">
                        <div className="grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-6">
                            <div className="font-medium text-gray-800">{feature.name}</div>
                          </div>
                          <div className="col-span-3">
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                checked={feature.included}
                                onChange={() => handleFeatureToggle(feature.id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="ml-2 text-sm text-gray-600">
                                {feature.included ? t('Yes') : t('No')}
                              </span>
                            </div>
                          </div>
                          <div className="col-span-3">
                            {feature.included && feature.id === 'customers' && (
                              <input
                                type="number"
                                className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm"
                                value={feature.limit || ''}
                                onChange={e => handleFeatureLimitChange(
                                  feature.id, 
                                  e.target.value ? parseInt(e.target.value) : undefined
                                )}
                                placeholder={t('Unlimited')}
                                min="1"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-between">
            <div>
              {selectedPlan && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setIsDeleteModalOpen(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  {t('Delete Plan')}
                </button>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                {t('Cancel')}
              </button>
              <button
                type="button"
                onClick={handleSavePlan}
                disabled={!planForm.name}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {t('Save Plan')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Delete Confirmation Modal
  const DeleteModal = () => {
    if (!isDeleteModalOpen || !selectedPlan) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <Trash className="h-6 w-6 text-red-600" />
            </div>
            <div className="mt-3 text-center sm:mt-5">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {t('Delete Pricing Plan')}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  {t('Are you sure you want to delete the plan')} <span className="font-semibold">{selectedPlan.name}</span>?
                  <div className="mt-2 text-yellow-600">
                    {t('Warning: Users subscribed to this plan will need to be migrated.')}
                  </div>
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleDeletePlan}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {t('Delete')}
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {t('Cancel')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
              <DollarSign className="w-6 h-6 text-blue-500 mr-2" />
              {t('Pricing Plans')}
            </h1>
            <p className="text-gray-500 mt-1">
              {t('Manage subscription plans and pricing')}
            </p>
          </div>
          
          <button
            onClick={handleCreatePlan}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('Create Plan')}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedPlans.map(plan => (
            <div 
              key={plan.id} 
              className={`bg-white rounded-lg shadow border ${plan.isPopular ? 'border-blue-500' : 'border-gray-200'} overflow-hidden relative`}
            >
              {plan.isPopular && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-bold uppercase">
                  {t('Popular')}
                </div>
              )}
              
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                    <p className="text-gray-500 mt-1">{plan.description}</p>
                  </div>
                  {!plan.isActive && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                      {t('Inactive')}
                    </span>
                  )}
                </div>
                
                <div className="mt-4 flex items-baseline">
                  <span className="text-3xl font-extrabold text-gray-900">
                    {formatCurrency(plan.price, plan.currency)}
                  </span>
                  <span className="ml-1 text-gray-500">
                    /{plan.billingPeriod === 'monthly' ? t('mo') : t('yr')}
                  </span>
                </div>
                
                <ul className="mt-6 space-y-3">
                  {plan.features
                    .filter(feature => feature.included)
                    .map(feature => (
                      <li key={feature.id} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mr-2" />
                        <span className="text-gray-700">
                          {feature.name}
                          {feature.limit ? ` (${feature.limit})` : ''}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
              
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditPlan(plan)}
                    className="inline-flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    {t('Edit')}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPlan(plan);
                      setIsDeleteModalOpen(true);
                    }}
                    className="inline-flex items-center text-red-600 hover:text-red-800"
                  >
                    <Trash className="h-4 w-4 mr-1" />
                    {t('Delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Modals */}
      <EditModal />
      <DeleteModal />
    </AdminLayout>
  );
};

export default PricingPlans; 