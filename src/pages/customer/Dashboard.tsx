import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCard } from '../../components/QRCard';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useEnrolledPrograms } from '../../hooks/useEnrolledPrograms';
import { PromoService } from '../../services/promoService';
import type { PromoCode } from '../../types/promo';
import { BadgeCheck, Flame, Ticket, Sparkles } from 'lucide-react';

const CustomerDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [animateIn, setAnimateIn] = useState(false);
  const [promos, setPromos] = useState<PromoCode[]>([]);

  // Authenticated user data
  const userData = {
    id: user?.id?.toString() || '',
    name: user?.name || t('customerDashboard.defaultName', 'Customer')
  };

  // Enrolled programs (top 3)
  const enrolledProgramsQuery = useEnrolledPrograms();
  const topPrograms = (enrolledProgramsQuery.data || []).slice(0, 3);

  // Load promotions (top 3)
  useEffect(() => {
    const loadPromotions = async () => {
      try {
        const { promotions } = await PromoService.getAvailablePromotions();
        setPromos((promotions || []).slice(0, 3));
      } catch (e) {
        setPromos([]);
      }
    };
    loadPromotions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 250);
    return () => clearTimeout(timer);
  }, []);

  return (
    <CustomerLayout>
      <div className="space-y-6 customer-dashboard dashboard-container">
        {/* Page Title */}
        <div className={`${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} transition-all`}>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            {t('customerDashboard.title', 'Customer Dashboard')}
          </h1>
        </div>

        {/* QR only hero */}
        <div className={`bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-2xl shadow-xl p-6 relative overflow-hidden ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} transition-all`}> 
          <div className="relative flex flex-col md:flex-row items-center md:items-center justify-between dashboard-hero">
            <div className="text-white md:max-w-xl md:pr-6 text-center md:text-left md:order-1">
              <h2 className="text-xl md:text-2xl font-semibold drop-shadow-sm flex items-center justify-center md:justify-start">
                <Sparkles className="w-5 h-5 text-blue-100 mr-2" />
                {t('welcomeBack', 'Welcome back')}, {userData.name}!
              </h2>
              <p className="text-blue-100 mt-1 text-sm md:text-base opacity-90">
                {t('scanQRCode', 'Scan your QR code to earn rewards')}
              </p>
            </div>
            <div className="md:order-2 md:ml-6 flex w-full md:w-auto flex-col items-center md:items-center">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 qr-card-container qr-on-right">
                <QRCard userId={userData.id} displayName={userData.name} />
              </div>
            </div>
          </div>
        </div>

        {/* Mini sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top Programs (3) */}
          <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-800 flex items-center">
                <BadgeCheck className="w-4 h-4 text-blue-500 mr-1.5" />
                {t('myPrograms', 'My Programs')}
              </h3>
              <span className="text-xs text-gray-500">{(enrolledProgramsQuery.data || []).length} {t('active', 'active')}</span>
            </div>
            {enrolledProgramsQuery.isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="h-20 bg-gray-100 rounded animate-pulse" />
                <div className="h-20 bg-gray-100 rounded animate-pulse" />
                <div className="h-20 bg-gray-100 rounded animate-pulse" />
              </div>
            ) : topPrograms.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-6">{t('noPrograms', 'No enrolled programs yet')}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {topPrograms.map(program => (
                  <div key={program.id} className="p-3 rounded-lg border border-gray-200">
                    <div className="text-sm font-medium text-gray-800 truncate">{program.program.name}</div>
                    <div className="text-xs text-gray-500 truncate">{program.business.name}</div>
                    <div className="mt-2 text-xs"><span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{program.currentPoints} {t('points')}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fire Promotions (3) */}
          <div className="bg-white rounded-xl shadow border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-800 flex items-center">
                <Flame className="w-4 h-4 text-amber-500 mr-1.5" />
                {t('hotPromotions', 'Hot Promotions')}
              </h3>
              <span className="text-xs text-gray-500">{promos.length} {t('available', 'available')}</span>
            </div>
            {promos.length === 0 ? (
              <div className="text-sm text-gray-500 text-center py-6">{t('promotions.none', 'No promotions right now')}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {promos.map(promo => (
                  <div key={promo.id} className="p-3 rounded-lg border border-amber-200 bg-amber-50/40">
                    <div className="text-sm font-medium text-gray-800 truncate">{promo.businessName}</div>
                    <div className="text-xs text-gray-600 flex items-center mt-1">
                      <Ticket className="w-3 h-3 mr-1 text-amber-600" />
                      <span className="font-mono">{promo.code}</span>
                    </div>
                    <div className="mt-2 text-xs text-amber-700">{promo.type}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerDashboard;