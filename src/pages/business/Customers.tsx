import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BusinessLayout } from '../../components/business/BusinessLayout';
import { Search, Award, Heart, Star, Gift, BadgeCheck, Users, Sparkles, Filter, ArrowUpDown, MessageSquare, Coffee, Link, UserPlus } from 'lucide-react';
import { CustomerService, Customer } from '../../services/customerService';
import { useAuth } from '../../contexts/AuthContext';
import { CustomerBusinessLinker } from '../../components/business/CustomerBusinessLinker';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showBirthdayConfetti, setShowBirthdayConfetti] = useState(false);
  const [showSendGift, setShowSendGift] = useState(false);
  const [showLinkCustomers, setShowLinkCustomers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCustomers = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Use the business ID from the logged-in user
        const businessId = user?.id.toString() || '';
        const customersData = await CustomerService.getBusinessCustomers(businessId);
        setCustomers(customersData);
        setFilteredCustomers(customersData);
      } catch (err) {
        console.error('Error loading customers:', err);
        setError(t('Failed to load customers. Please try again.'));
      } finally {
        setLoading(false);
      }
    };
    
    loadCustomers();
  }, [user, t]);

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

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleSendBirthdayWish = async () => {
    if (!selectedCustomer || !user) return;

    try {
      // Record the birthday wish interaction in the database
      const success = await CustomerService.recordCustomerInteraction(
        selectedCustomer.id,
        user.id.toString(),
        'BIRTHDAY_WISH',
        'Birthday wish sent'
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
        `Gift sent: ${giftType}`
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

  const getTierColorClass = (tier: string) => {
    switch (tier) {
      case 'Platinum': return 'from-purple-500 to-indigo-600';
      case 'Gold': return 'from-yellow-400 to-orange-500';
      case 'Silver': return 'from-gray-400 to-gray-600';
      case 'Bronze': return 'from-amber-500 to-amber-700';
      default: return 'from-blue-500 to-blue-700';
    }
  };

  const handleRefreshCustomers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the business ID from the logged-in user
      const businessId = user?.id.toString() || '';
      const customersData = await CustomerService.getBusinessCustomers(businessId);
      setCustomers(customersData);
      setFilteredCustomers(customersData);
    } catch (err) {
      console.error('Error loading customers:', err);
      setError(t('Failed to load customers. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <BusinessLayout>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('Customers')}</h1>
          <button
            onClick={() => setShowLinkCustomers(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            {t('Link Customers')}
          </button>
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
        
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800">
            {t('Customer Friends')} 
            <span className="ml-2 text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {filteredCustomers.length} {t('awesome people')}
            </span>
          </h1>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder={t('Find a customer friend...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customers List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-medium text-gray-700 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-500" />
                  {t('Your Customer Squad')}
                </h2>
                <button className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                  <Filter className="h-4 w-4 mr-1" />
                  {t('Filter')}
                </button>
              </div>
              {loading ? (
                <div className="flex justify-center items-center p-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {filteredCustomers.length > 0 ? filteredCustomers.map(customer => (
                    <div 
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className={`p-4 cursor-pointer transition-colors hover:bg-blue-50 ${selectedCustomer?.id === customer.id ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${getTierColorClass(customer.tier)} flex items-center justify-center text-white font-medium`}>
                            {customer.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="flex justify-between">
                            <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                            <TierBadge tier={customer.tier} />
                          </div>
                          <div className="flex justify-between mt-1">
                            <p className="text-xs text-gray-500">{customer.visits} {t('visits')}</p>
                            <p className="text-xs text-gray-500">{customer.loyaltyPoints} {t('points')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="p-6 text-center text-gray-500">
                      {searchTerm ? t('No customers match your search') : t('No customers found')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Customer Details */}
          <div className="lg:col-span-2">
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
                      <p className="text-sm opacity-90">{t('Customer since')}</p>
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
                        <p className="text-sm text-blue-600 font-medium">{t('Loyalty Points')}</p>
                        <p className="text-2xl font-bold text-blue-700">{selectedCustomer.loyaltyPoints}</p>
                      </div>
                      <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <Star className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4 border border-green-100 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600 font-medium">{t('Total Spent')}</p>
                        <p className="text-2xl font-bold text-green-700">${selectedCustomer.totalSpent.toFixed(2)}</p>
                      </div>
                      <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        <Coffee className="h-6 w-6" />
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600 font-medium">{t('Visit Count')}</p>
                        <p className="text-2xl font-bold text-purple-700">{selectedCustomer.visits}</p>
                        <p className="text-xs text-purple-600">
                          {t('Last visit')}: {selectedCustomer.lastVisit ? new Date(selectedCustomer.lastVisit).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                        <Users className="h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="font-medium text-gray-700 mb-2">{t('Favorite Items')}</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedCustomer.favoriteItems.length > 0 ? 
                          selectedCustomer.favoriteItems.map((item, idx) => (
                            <span key={idx} className="bg-white px-3 py-1 rounded-full text-sm border border-gray-200 inline-flex items-center">
                              <Heart className="w-3 h-3 text-red-500 mr-1" />
                              {item}
                            </span>
                          )) : (
                            <p className="text-sm text-gray-500">{t('No favorite items yet')}</p>
                          )
                        }
                      </div>
                    </div>

                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                      <h3 className="font-medium text-yellow-700 mb-2">{t('Birthday')}</h3>
                      <p className="text-yellow-800">
                        {selectedCustomer.birthday ? new Date(selectedCustomer.birthday).toLocaleDateString() : t('Not available')}
                      </p>
                      {selectedCustomer.birthday && (
                        <button 
                          onClick={handleSendBirthdayWish}
                          className="mt-2 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-700 py-1 px-3 rounded-full flex items-center"
                        >
                          <Gift className="w-4 h-4 mr-1" />
                          {t('Send birthday wish')}
                        </button>
                      )}
                    </div>

                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                      <h3 className="font-medium text-indigo-700 mb-2">{t('Notes')}</h3>
                      <p className="text-indigo-800 text-sm">
                        {selectedCustomer.notes || t('No notes available')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 flex gap-2 justify-end">
                  <button 
                    onClick={handleSendGift}
                    className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-full hover:from-pink-600 hover:to-purple-700 transition-all transform hover:scale-105"
                  >
                    <Gift className="w-4 h-4" />
                    {t('Send Surprise Gift')}
                  </button>
                  <button 
                    className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full hover:bg-blue-200 transition-colors"
                    onClick={() => {
                      const message = prompt(t('Enter your message to the customer:'));
                      if (message) handleSendMessage(message);
                    }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    {t('Send Message')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center p-10 h-full">
                <Users className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-500">{t('Select a customer to see details')}</h3>
                <p className="text-gray-400 text-center mt-2">{t('Click on any customer from the list to view their profile and interact with them.')}</p>
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
            <h3 className="text-xl font-bold text-gray-800 mb-4">{t('Send a Surprise Gift to {{name}}', { name: selectedCustomer.name })}</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div 
                  className="border border-blue-200 bg-blue-50 rounded-lg p-3 cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => handleSendGiftConfirm('Free Coffee')}
                >
                  <div className="flex justify-center mb-2">
                    ☕️
                  </div>
                  <p className="text-center text-sm font-medium text-blue-700">Free Coffee</p>
                </div>
                <div 
                  className="border border-green-200 bg-green-50 rounded-lg p-3 cursor-pointer hover:bg-green-100 transition-colors"
                  onClick={() => handleSendGiftConfirm('Free Pastry')}
                >
                  <div className="flex justify-center mb-2">
                    🥐
                  </div>
                  <p className="text-center text-sm font-medium text-green-700">Free Pastry</p>
                </div>
                <div 
                  className="border border-purple-200 bg-purple-50 rounded-lg p-3 cursor-pointer hover:bg-purple-100 transition-colors"
                  onClick={() => handleSendGiftConfirm('Gift Card')}
                >
                  <div className="flex justify-center mb-2">
                    🎁
                  </div>
                  <p className="text-center text-sm font-medium text-purple-700">Gift Card</p>
                </div>
                <div 
                  className="border border-amber-200 bg-amber-50 rounded-lg p-3 cursor-pointer hover:bg-amber-100 transition-colors"
                  onClick={() => handleSendGiftConfirm('Bonus Points')}
                >
                  <div className="flex justify-center mb-2">
                    ⭐️
                  </div>
                  <p className="text-center text-sm font-medium text-amber-700">Bonus Points</p>
                </div>
              </div>
              
              <textarea
                placeholder={t('Add a personal message...')}
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                id="giftMessage"
              ></textarea>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button 
                  onClick={handleCloseGiftModal}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {t('Cancel')}
                </button>
                <button 
                  onClick={() => {
                    const messageElement = document.getElementById('giftMessage') as HTMLTextAreaElement;
                    handleSendGiftConfirm(messageElement?.value || 'Custom Gift');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-colors"
                >
                  {t('Send Gift')}
                </button>
              </div>
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
                  <span className="sr-only">{t('Close')}</span>
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