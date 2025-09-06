import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BusinessLayout } from '../../components/business/BusinessLayout';
import { Search, Award, Heart, Star, Gift, BadgeCheck, Users, Sparkles, Filter, ArrowUpDown, MessageSquare, Coffee, Link, UserPlus, CreditCard, Calendar } from 'lucide-react';
import { CustomerService, Customer, CustomerProgram } from '../../services/customerService';
import { PromoService } from '../../services/promoService';
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessCurrency } from '../../contexts/BusinessCurrencyContext';
import { CustomerBusinessLinker } from '../../components/business/CustomerBusinessLinker';
import { subscribeToSync } from '../../utils/realTimeSync';
import type { PromoCode } from '../../types/promo';

// Mock customer data
const mockCustomers = [
  { 
    id: '1', 
    name: 'Sarah Johnson', 
    email: 'sarah.j@example.com', 
    visits: 24, 
    totalSpent: 487.50, 
    loyaltyPoints: 235,
    tier: 'Gold',
    lastVisit: '2023-09-15',
    favoriteItems: ['Cappuccino', 'Blueberry Muffin'],
    birthday: '1992-04-12',
    joinDate: '2023-01-10',
    notes: 'Prefers oat milk in coffee'
  },
  { 
    id: '2', 
    name: 'Mike Peterson', 
    email: 'mike.p@example.com', 
    visits: 18, 
    totalSpent: 329.75, 
    loyaltyPoints: 180,
    tier: 'Silver',
    lastVisit: '2023-09-18',
    favoriteItems: ['Americano', 'Croissant'],
    birthday: '1988-07-22',
    joinDate: '2023-02-15',
    notes: 'Always asks about new seasonal items'
  },
  { 
    id: '3', 
    name: 'Elena Rodriguez', 
    email: 'elena.r@example.com', 
    visits: 32, 
    totalSpent: 612.25, 
    loyaltyPoints: 320,
    tier: 'Platinum',
    lastVisit: '2023-09-20',
    favoriteItems: ['Chai Latte', 'Avocado Toast'],
    birthday: '1990-11-03',
    joinDate: '2022-12-05',
    notes: 'Prefers window seating'
  },
  { 
    id: '4', 
    name: 'David Kim', 
    email: 'david.k@example.com', 
    visits: 12, 
    totalSpent: 185.30, 
    loyaltyPoints: 95,
    tier: 'Bronze',
    lastVisit: '2023-09-10',
    favoriteItems: ['Espresso', 'Chocolate Chip Cookie'],
    birthday: '1995-02-28',
    joinDate: '2023-03-20',
    notes: 'Works remotely from café often'
  },
  { 
    id: '5', 
    name: 'Jessica Chen', 
    email: 'jessica.c@example.com', 
    visits: 29, 
    totalSpent: 541.80, 
    loyaltyPoints: 270,
    tier: 'Gold',
    lastVisit: '2023-09-19',
    favoriteItems: ['Green Tea', 'Fruit Parfait'],
    birthday: '1993-08-15',
    joinDate: '2023-01-05',
    notes: 'Allergic to nuts'
  }
];

// Tier badge component
const TierBadge = ({ tier }: { tier: string }) => {
  const getBadgeStyle = () => {
    switch (tier) {
      case 'Platinum':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Gold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Silver':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Bronze':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getTierIcon = () => {
    switch (tier) {
      case 'Platinum':
        return <Sparkles className="w-3 h-3" />;
      case 'Gold':
        return <Award className="w-3 h-3" />;
      case 'Silver':
        return <BadgeCheck className="w-3 h-3" />;
      case 'Bronze':
        return <Star className="w-3 h-3" />;
      default:
        return <Heart className="w-3 h-3" />;
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle()}`}>
      {getTierIcon()}
      <span className="ml-1">{tier}</span>
    </span>
  );
};

const CustomersPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { formatAmount } = useBusinessCurrency();
  
  // Guard against undefined translation function
  const translate = (key: string, options?: any) => {
    return t ? t(key, options) : key;
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showBirthdayConfetti, setShowBirthdayConfetti] = useState(false);
  const [showSendGift, setShowSendGift] = useState(false);
  const [showLinkCustomers, setShowLinkCustomers] = useState(false);
  const [showSendPromoCode, setShowSendPromoCode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerPrograms, setCustomerPrograms] = useState<CustomerProgram[]>([]);
  const [availablePromoCodes, setAvailablePromoCodes] = useState<PromoCode[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [loadingPromoCodes, setLoadingPromoCodes] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 DEBUG: Current user object:', user);
      console.log('🔍 DEBUG: User ID:', user?.id);
      console.log('🔍 DEBUG: User type:', user?.user_type);
      console.log('🔍 DEBUG: User name:', user?.name);
      console.log('🔍 DEBUG: User email:', user?.email);
      
      // Use the business ID from the logged-in user
      const businessId = user?.id.toString() || '';
      console.log('🔍 DEBUG: Using business ID for query:', businessId);
      
      if (!businessId) {
        console.error('❌ ERROR: No business ID available, user not logged in?');
        setError(t('business.Please log in to view customers'));
        return;
      }
      
      const customersData = await CustomerService.getBusinessCustomers(businessId);
      console.log('🔍 DEBUG: Received customers data:', customersData);
      
      setCustomers(customersData);
      setFilteredCustomers(customersData);
    } catch (err) {
      console.error('❌ ERROR: Error loading customers:', err);
      setError(t('business.Failed to load customers. Please try again.'));
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (user) {
      loadCustomers();
      loadAvailablePromoCodes();
    }
  }, [user]);
  
  // Subscribe to real-time sync events for program enrollments and customer relationships
  useEffect(() => {
    if (!user?.id) return;
    
    const businessId = user.id.toString();
    
    // Listen for program enrollment changes
    const unsubscribeEnrollments = subscribeToSync('program_enrollments', (event) => {
      if (event.business_id === businessId) {
        console.log('Enrollment sync event detected, refreshing customers list');
        loadCustomers();
      }
    });
    
    // Listen for loyalty card changes
    const unsubscribeCards = subscribeToSync('loyalty_cards', (event) => {
      if (event.business_id === businessId) {
        console.log('Loyalty card sync event detected, refreshing customers list');
        loadCustomers();
      }
    });
    
    return () => {
      unsubscribeEnrollments();
      unsubscribeCards();
    };
  }, [user?.id]);

  // Filter customers when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(customer => 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setFilteredCustomers(filtered);
  }, [searchTerm, customers]);

  const handleSelectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setLoadingPrograms(true);
    
    try {
      if (user?.id) {
        const programs = await CustomerService.getCustomerPrograms(customer.id, user.id.toString());
        setCustomerPrograms(programs);
      }
    } catch (err) {
      console.error('Error loading customer programs:', err);
    } finally {
      setLoadingPrograms(false);
    }
  };

  const handleSendBirthdayWish = async () => {
    if (!selectedCustomer || !user) return;

    try {
      // Record the birthday wish interaction in the database
      const success = await CustomerService.recordCustomerInteraction(
        selectedCustomer.id,
        user.id.toString(),
        'BIRTHDAY_WISH',
        t('business.Birthday wish sent')
      );

      if (success) {
        setShowBirthdayConfetti(true);
        setTimeout(() => setShowBirthdayConfetti(false), 3000);
      }
    } catch (err) {
      console.error('Error sending birthday wish:', err);
    }
  };

  const handleSendGift = () => {
    setShowSendGift(true);
  };

  const handleCloseGiftModal = () => {
    setShowSendGift(false);
  };

  const handleSendGiftConfirm = async (giftType: string) => {
    if (!selectedCustomer || !user) return;

    try {
      // Record the gift interaction in the database
      const success = await CustomerService.recordCustomerInteraction(
        selectedCustomer.id,
        user.id.toString(),
        'GIFT',
        t('business.Gift sent: {{giftType}}', { giftType })
      );

      if (success) {
        setShowSendGift(false);
      }
    } catch (err) {
      console.error('Error sending gift:', err);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedCustomer || !user || !message) return;

    try {
      // Record the message interaction in the database
      const success = await CustomerService.recordCustomerInteraction(
        selectedCustomer.id,
        user.id.toString(),
        'MESSAGE',
        message
      );

      if (success) {
        console.log('Message sent successfully');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleSendPromotionCode = async (customer: Customer) => {
    if (!customer || !user) return;

    try {
      // Generate a promotion code
      const promoCode = `PROMO${Date.now().toString().slice(-6)}`;
      const discount = '10%'; // Default discount
      
      // Send notification to customer with the promotion code
      const response = await fetch('/api/notifications/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          customerId: customer.id,
          type: 'PROMO_CODE',
          title: t('business.Special Promotion Code! 🎉'),
          message: t('business.You\'ve received a special {{discount}} discount code: {{promoCode}}. Use it on your next visit to {{programName}}!', { discount, promoCode, programName: customer.programName }),
          data: {
            promoCode,
            discount,
            programName: customer.programName,
            programId: customer.programId,
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
            businessName: user.name || t('business.Your Business')
          },
          requiresAction: false
        })
      });

      if (response.ok) {
        // Record the interaction in the database
        await CustomerService.recordCustomerInteraction(
          customer.id,
          user.id.toString(),
          'PROMO_CODE',
          t('business.Promotion code sent: {{promoCode}} ({{discount}} discount)', { promoCode, discount })
        );

        // Show success message
        alert(t('business.Promotion code {{promoCode}} sent successfully to {{name}}! They will receive it as a notification.', { promoCode, name: customer.name }));
        console.log(`✅ Promotion code ${promoCode} sent to customer ${customer.name} in program ${customer.programName}`);
      } else {
        throw new Error('Failed to send promotion code');
      }
    } catch (err) {
      console.error('Error sending promotion code:', err);
      alert(t('business.Failed to send promotion code. Please try again.'));
    }
  };

  const getTierColorClass = (tier: string) => {
    switch (tier) {
      case 'Platinum': return 'from-purple-500 to-indigo-600';
      case 'Gold': return 'from-yellow-400 to-orange-500';
      case 'Silver': return 'from-gray-400 to-gray-600';
      case 'Bronze': return 'from-amber-500 to-amber-700';
      default: return 'from-blue-500 to-blue-700';
    }
  };

  const loadAvailablePromoCodes = async () => {
    if (!user?.id) return;
    
    setLoadingPromoCodes(true);
    try {
      const { codes, error } = await PromoService.getBusinessCodes(user.id.toString());
      if (error) {
        console.error('Error loading promo codes:', error);
        return;
      }
      
      // Filter only active promo codes
      const activeCodes = codes.filter(code => code.status === 'ACTIVE');
      setAvailablePromoCodes(activeCodes);
    } catch (err) {
      console.error('Error loading promo codes:', err);
    } finally {
      setLoadingPromoCodes(false);
    }
  };

  const handleSendPromoCode = async (promoCodeId: string) => {
    if (!selectedCustomer || !user?.id) return;
    
    try {
      const result = await CustomerService.sendPromoCodeToCustomer(
        selectedCustomer.id,
        user.id.toString(),
        promoCodeId
      );
      
      if (result.success) {
        setShowSendPromoCode(false);
        alert(t('business.Promo code sent successfully to {{name}}!', { name: selectedCustomer.name }));
      } else {
        alert(t('business.Failed to send promo code: {{error}}', { error: result.error }));
      }
    } catch (err) {
      console.error('Error sending promo code:', err);
      alert(t('business.Failed to send promo code. Please try again.'));
    }
  };

  const handleRefreshCustomers = async () => {
    await loadCustomers();
  };

  return (
    <BusinessLayout>
      <div className="px-4 py-6 customers-page">
        <div className="flex justify-between items-center mb-6 customers-header">
          <h1 className="text-2xl font-bold text-gray-900 customers-title">{t('business.Customers')}</h1>
          <div className="flex space-x-3 customers-actions">
            <button
              onClick={handleRefreshCustomers}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
              disabled={loading}
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {t('business.Refresh')}
            </button>
            <button
              onClick={() => setShowLinkCustomers(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              {t('business.Link Customers')}
            </button>
          </div>
        </div>

      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center customers-main-header">
          <h1 className="text-2xl font-semibold text-gray-800 customers-main-title">
            {t('business.Customer Friends')} 
            <span className="ml-2 text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full customers-count">
              {filteredCustomers.length} {t('business.awesome people')}
            </span>
          </h1>
          
          <div className="relative customers-search">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t('business.Find a customer friend...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 customers-grid">
          {/* Customers List */}
          <div className="lg:col-span-1 customers-list-container">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden customers-list-card">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center customers-list-header">
                <h2 className="font-medium text-gray-700 flex items-center customers-list-title">
                  <Users className="w-5 h-5 mr-2 text-blue-500" />
                  {t('business.Your Customer Squad')}
                </h2>
                <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center customers-filter-btn">
                  <Filter className="h-4 w-4 mr-1" />
                  {t('business.Filter')}
                </button>
              </div>
              {loading ? (
                <div className="flex justify-center items-center p-10 customers-loading">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="divide-y max-h-[600px] overflow-y-auto customers-list">
                  {filteredCustomers.length > 0 ? filteredCustomers.map(customer => (
                    <div 
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className={`p-4 cursor-pointer transition-colors hover:bg-blue-50 customer-item ${selectedCustomer?.id === customer.id ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-center customer-item-content">
                        <div className="flex-shrink-0 customer-avatar">
                          <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${getTierColorClass(customer.tier)} flex items-center justify-center text-white font-medium`}>
                            {customer.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        </div>
                        <div className="ml-3 flex-1 customer-info">
                          <div className="flex justify-between customer-name-row">
                            <p className="text-sm font-medium text-gray-900 customer-name">{customer.name}</p>
                            <TierBadge tier={customer.tier} />
                          </div>
                          <div className="flex justify-between mt-1 customer-stats-row">
                            <p className="text-xs text-gray-500 customer-program-count">{customer.programCount || 1} {t('business.program')}</p>
                            <p className="text-xs text-gray-500 customer-points">{customer.totalLoyaltyPoints || customer.loyaltyPoints} {t('business.points')}</p>
                          </div>
                          {/* Program information - BIG RULE: customer enrolled in AT LEAST ONE program */}
                          <div className="mt-1 customer-program-info">
                            <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block">
                              📋 {customer.programCount > 1 ? `${customer.programCount} ${t('business.Programs')}` : customer.programName || t('business.Unknown Program')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="p-6 text-center text-gray-500 customers-empty-state">
                      {searchTerm ? t('business.No customers match your search') : t('business.No customers found')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Customer Details */}
          <div className="lg:col-span-2 customer-details-container">
            {selectedCustomer ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className={`p-6 bg-gradient-to-r ${getTierColorClass(selectedCustomer.tier)}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">{selectedCustomer.name}</h2>
                      <p className="text-white opacity-90">{selectedCustomer.email}</p>
                      <div className="mt-2">
                        <TierBadge tier={selectedCustomer.tier} />
                      </div>
                    </div>
                    <div className="text-right text-white">
                      <p className="text-sm opacity-90">{t('business.Customer since')}</p>
                      <p className="font-semibold">
                        {selectedCustomer.joinedAt ? new Date(selectedCustomer.joinedAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">{t('business.Loyalty Points')}</p>
                        <p className="text-2xl font-bold text-blue-700">{selectedCustomer.loyaltyPoints}</p>
                      </div>
                      <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <Star className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4 border border-green-100 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-medium">{t('business.Total Spent')}</p>
                        <p className="text-2xl font-bold text-green-700">{formatAmount(selectedCustomer.totalSpent)}</p>
                      </div>
                      <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        <Coffee className="h-6 w-6" />
                      </div>
                    </div>

                                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600 font-medium">{t('business.Programs Enrolled')}</p>
                        <p className="text-2xl font-bold text-purple-700">{selectedCustomer.programCount || 1}</p>
                        <p className="text-xs text-purple-600">
                          {t('business.total points')}: {selectedCustomer.totalLoyaltyPoints || selectedCustomer.loyaltyPoints}
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                        <CreditCard className="h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                        <CreditCard className="w-4 h-4 mr-2" />
                        {t('business.Enrolled Programs')}
                      </h3>
                      {loadingPrograms ? (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                      ) : customerPrograms.length > 0 ? (
                        <div className="space-y-2">
                          {customerPrograms.map((program) => (
                            <div key={program.id} className="bg-white p-3 rounded-lg border border-gray-200">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="font-medium text-gray-800">{program.name}</p>
                                  <p className="text-sm text-gray-500">
                                    {t('business.Enrolled')}: {new Date(program.enrolledAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-blue-600">{program.points} {t('business.points')}</p>
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    program.status === 'ACTIVE' 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {program.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">{t('business.No programs enrolled')}</p>
                      )}
                    </div>

                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <h3 className="font-medium text-yellow-700 mb-2">{t('business.Birthday')}</h3>
                                              <p className="text-yellow-800">
                          {selectedCustomer.birthday ? new Date(selectedCustomer.birthday).toLocaleDateString() : t('business.Not available')}
                        </p>
                      {selectedCustomer.birthday && (
                                                  <button 
                            onClick={handleSendBirthdayWish}
                            className="mt-2 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-700 py-1 px-3 rounded-full flex items-center"
                          >
                            <Gift className="w-4 h-4 mr-1" />
                            {t('business.Send birthday wish')}
                          </button>
                      )}
                    </div>

                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                      <h3 className="font-medium text-indigo-700 mb-2">{t('business.Notes')}</h3>
                      <p className="text-indigo-800 text-sm">
                        {selectedCustomer.notes || t('business.No notes available')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 flex gap-2 justify-end">
                  <button 
                    onClick={() => setShowSendPromoCode(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-full hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105"
                  >
                    <BadgeCheck className="w-4 h-4" />
                    {t('business.Send Promo Code')}
                  </button>
                  <button 
                    onClick={handleSendGift}
                    className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-full hover:from-pink-600 hover:to-purple-700 transition-all transform hover:scale-105"
                  >
                    <Gift className="w-4 h-4" />
                    {t('business.Send Surprise Gift')}
                  </button>
                  <button 
                    className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full hover:bg-blue-200 transition-colors"
                    onClick={() => {
                      const message = prompt(t('business.Enter your message to the customer:'));
                      if (message) handleSendMessage(message);
                    }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    {t('business.Send Message')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center p-10 h-full">
                <Users className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-500">{t('business.Select a customer to see details')}</h3>
                <p className="text-gray-400 text-center mt-2">{t('business.Click on any customer from the list to view their profile and interact with them.')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confetti Animation for Birthday Wish */}
      {showBirthdayConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-5"></div>
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md animate-bounce">
            <div className="text-center">
              <div className="flex justify-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span 
                    key={i}
                    className="inline-block animate-ping"
                    style={{
                      color: ['#FF5252', '#FFEB3B', '#2196F3', '#4CAF50', '#E040FB'][i],
                      fontSize: '2rem',
                      animationDuration: `${0.8 + Math.random() * 0.4}s`,
                      animationDelay: `${Math.random() * 0.5}s`
                    }}
                  >
                    🎉
                  </span>
                ))}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mt-3">{t('Birthday Wish Sent!')}</h3>
              <p className="text-gray-600 mt-1">{t('You just made their day special!')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Gift Modal */}
      {showSendGift && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full animate-in fade-in duration-300">
            <h3 className="text-xl font-bold text-gray-800 mb-4">{t('business.Send a Surprise Gift to {{name}}', { name: selectedCustomer.name })}</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div 
                  className="border border-blue-200 bg-blue-50 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => handleSendGiftConfirm('Free Coffee')}
                >
                  <div className="flex justify-center mb-2">
                    ☕️
                  </div>
                  <p className="text-center text-sm font-medium text-blue-700">{t('business.Free Coffee')}</p>
                </div>
                <div 
                  className="border border-green-200 bg-green-50 rounded-lg p-3 cursor-pointer hover:bg-green-100 transition-colors"
                  onClick={() => handleSendGiftConfirm('Free Pastry')}
                >
                  <div className="flex justify-center mb-2">
                    🥐
                  </div>
                  <p className="text-center text-sm font-medium text-green-700">{t('business.Free Pastry')}</p>
                </div>
                <div 
                  className="border border-purple-200 bg-purple-50 rounded-lg p-3 cursor-pointer hover:bg-purple-100 transition-colors"
                  onClick={() => handleSendGiftConfirm('Gift Card')}
                >
                  <div className="flex justify-center mb-2">
                    🎁
                  </div>
                  <p className="text-center text-sm font-medium text-purple-700">{t('business.Gift Card')}</p>
                </div>
                <div 
                  className="border border-amber-200 bg-amber-50 rounded-lg p-3 cursor-pointer hover:bg-amber-100 transition-colors"
                  onClick={() => handleSendGiftConfirm('Bonus Points')}
                >
                  <div className="flex justify-center mb-2">
                    ⭐️
                  </div>
                  <p className="text-center text-sm font-medium text-amber-700">{t('business.Bonus Points')}</p>
                </div>
              </div>
              
              <textarea
                placeholder={t('business.Add a personal message...')}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                id="giftMessage"
              ></textarea>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  onClick={handleCloseGiftModal}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t('business.Cancel')}
                </button>
                <button 
                  onClick={() => {
                    const messageElement = document.getElementById('giftMessage') as HTMLTextAreaElement;
                    handleSendGiftConfirm(messageElement?.value || 'Custom Gift');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-colors"
                >
                  {t('business.Send Gift')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Send Promo Code Modal */}
        {showSendPromoCode && selectedCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full animate-in fade-in duration-300">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                {t('business.Send Promo Code to {{name}}', { name: selectedCustomer.name })}
              </h3>
              
              {loadingPromoCodes ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : availablePromoCodes.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    {t('business.Select a promo code to send to this customer:')}
                  </p>
                  
                  <div className="max-h-60 overflow-y-auto space-y-3">
                    {availablePromoCodes.map((promoCode) => (
                      <div 
                        key={promoCode.id}
                        className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-blue-50 transition-colors"
                        onClick={() => handleSendPromoCode(promoCode.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">{promoCode.name || promoCode.code}</h4>
                            <p className="text-sm text-gray-500">{promoCode.description || ''}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                promoCode.type === 'POINTS' ? 'bg-blue-100 text-blue-700' :
                                promoCode.type === 'DISCOUNT' ? 'bg-green-100 text-green-700' :
                                promoCode.type === 'CASHBACK' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {promoCode.type}
                              </span>
                              <span className="text-xs text-gray-500">
                                {promoCode.value} {promoCode.currency || 'points'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">{t('business.Code')}</p>
                            <p className="font-mono text-sm font-bold text-blue-600">{promoCode.code}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">{t('business.No active promo codes available')}</p>
                  <p className="text-sm text-gray-400">
                    {t('business.Create promo codes in the Promotions page first')}
                  </p>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  onClick={() => setShowSendPromoCode(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t('business.Cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Customer Business Linker Modal */}
        {showLinkCustomers && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all sm:max-w-3xl sm:w-full">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  onClick={() => setShowLinkCustomers(false)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <span className="sr-only">{translate('Close')}</span>
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4">
                <CustomerBusinessLinker 
                  onSuccess={() => {
                    setShowLinkCustomers(false);
                    handleRefreshCustomers();
                  }} 
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </BusinessLayout>
  );
};

export default CustomersPage; 