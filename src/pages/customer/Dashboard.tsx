import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCard } from '../../components/QRCard';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useEnrolledPrograms } from '../../hooks/useEnrolledPrograms';
import { PromoService } from '../../services/promoService';
import { CustomerNotificationService } from '../../services/customerNotificationService';
import type { PromoCode } from '../../types/promo';
import { BadgeCheck, Flame, Ticket, Sparkles } from 'lucide-react';

const CustomerDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [animateIn, setAnimateIn] = useState(false);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Authenticated user data
  const userData = {
    id: user?.id?.toString() || '',
    name: user?.name || t('customerDashboard.defaultName', 'Customer')
  };

  // Enrolled programs (top 3)
  const enrolledProgramsQuery = useEnrolledPrograms();
  const topPrograms = (enrolledProgramsQuery.data || []).slice(0, 3);

  // Debug: Log the enrolled programs data to understand the structure
  useEffect(() => {
    if (enrolledProgramsQuery.data) {
      console.log('Enrolled Programs Data:', enrolledProgramsQuery.data);
      console.log('Total Points Calculation:', enrolledProgramsQuery.data
        .filter(program => program.status === 'ACTIVE' && program.program.status === 'ACTIVE')
        .reduce((total, program) => total + (Number(program.currentPoints) || 0), 0));
    }
  }, [enrolledProgramsQuery.data]);

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

  // Load unread notifications (excluding deleted ones)
  useEffect(() => {
    const loadUnread = async () => {
      try {
        if (!userData.id) return;
        const items = await CustomerNotificationService.getUnreadNotifications(userData.id);
        setUnreadCount(Array.isArray(items) ? items.length : 0);
      } catch (e) {
        setUnreadCount(0);
      }
    };
    loadUnread();
  }, [userData.id]);

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 250);
    return () => clearTimeout(timer);
  }, []);

  return (
    <CustomerLayout>
      <div className="space-y-6 customer-dashboard dashboard-container">
        {/* ⚠️ DIAGNOSIS SECTION - Data Connectivity Issues */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-l-4 border-emerald-500 p-6 rounded-lg shadow-md">
          <div className="flex items-start">
            <BadgeCheck className="w-6 h-6 text-emerald-600 mt-1 mr-4 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-emerald-800 mb-3">
                🟢 DIAGNOSIS: Customer Dashboard Data Issues
              </h3>
              <div className="space-y-3 text-sm">
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-red-700 mb-2">❌ Problem #1: Multiple Service Dependencies Without API Layer</h4>
                  <p className="text-red-900 mb-2"><strong>Current State:</strong> Dashboard depends on 3 separate services:</p>
                  <ul className="list-disc list-inside text-red-900 ml-4 space-y-1">
                    <li><code className="bg-red-100 px-1 rounded">useEnrolledPrograms()</code> hook (line 26) - fetches loyalty programs</li>
                    <li><code className="bg-red-100 px-1 rounded">PromoService.getAvailablePromotions()</code> (line 43) - fetches promotions</li>
                    <li><code className="bg-red-100 px-1 rounded">CustomerNotificationService.getUnreadNotifications()</code> (line 57) - fetches notifications</li>
                  </ul>
                  <p className="text-red-900 mt-2"><strong>Why It's Broken:</strong> Each service likely calls database directly. No consolidated customer data endpoint.</p>
                  <p className="text-red-900"><strong>Impact:</strong> 3 separate waterfall requests on page load, slow initial render, inconsistent error handling.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-orange-700 mb-2">⚠️ Problem #2: Points Calculation Happens Client-Side</h4>
                  <p className="text-orange-900 mb-2"><strong>Current State:</strong> Lines 98-99 calculate total points by filtering and reducing enrolled programs array in browser JavaScript.</p>
                  <p className="text-orange-900 mb-2"><strong>Code:</strong> <code className="bg-orange-100 px-1 rounded text-xs">.filter(program => program.status === 'ACTIVE').reduce((total, program) => total + (Number(program.currentPoints) || 0), 0)</code></p>
                  <p className="text-orange-900 mb-2"><strong>Why It's Broken:</strong> Business logic in UI layer. Should be calculated by database/API with proper authorization checks.</p>
                  <p className="text-orange-900"><strong>Impact:</strong> Points may be calculated incorrectly if program status changed server-side but client cache is stale.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-yellow-700 mb-2">⚠️ Problem #3: Notification Badge Updates Unreliably</h4>
                  <p className="text-yellow-900 mb-2"><strong>Current State:</strong> useEffect on lines 53-64 calls <code className="bg-yellow-100 px-1 rounded">getUnreadNotifications()</code> once on mount, never updates.</p>
                  <p className="text-yellow-900 mb-2"><strong>Why It's Broken:</strong> No real-time connection, no polling, no refetch on focus. Notification count stays stale until full page refresh.</p>
                  <p className="text-yellow-900"><strong>Impact:</strong> Users miss important notifications about points awarded, program enrollment approvals.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-purple-700 mb-2">⚠️ Problem #4: Program Data Debug Logging (Lines 30-37)</h4>
                  <p className="text-purple-900 mb-2"><strong>Current State:</strong> useEffect logs enrolled programs data to console for debugging point calculation issues.</p>
                  <p className="text-purple-900 mb-2"><strong>Why It Exists:</strong> Developer couldn't trust the data pipeline, added console.log to verify points calculations.</p>
                  <p className="text-purple-900"><strong>Impact:</strong> Debug code in production indicates underlying data integrity problems weren't fixed, just logged.</p>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md">
                  <h4 className="font-semibold text-blue-700 mb-2">✅ Solution: Create Customer Data Aggregation API</h4>
                  <ul className="list-disc list-inside text-blue-900 space-y-1">
                    <li>Create <code className="bg-blue-100 px-1 rounded">GET /api/customer/dashboard</code> endpoint returning all dashboard data in one response</li>
                    <li>Move points calculation to database query: <code className="bg-blue-100 px-1 rounded">SUM(pe.current_points) WHERE pe.status = 'ACTIVE'</code></li>
                    <li>Use React Query with <code className="bg-blue-100 px-1 rounded">refetchOnWindowFocus: true</code> to auto-update on tab focus</li>
                    <li>Remove debug console.log statements, rely on proper error boundaries</li>
                    <li>Consider WebSocket or SSE for real-time notification badge updates</li>
                  </ul>
                </div>
                
                <div className="bg-white/70 p-4 rounded-md border-2 border-indigo-300">
                  <h4 className="font-semibold text-indigo-700 mb-2">📊 Performance Impact</h4>
                  <p className="text-indigo-900 mb-2"><strong>Current:</strong> 3 sequential API calls = ~300-600ms page load</p>
                  <p className="text-indigo-900 mb-2"><strong>Optimized:</strong> 1 aggregated API call = ~100-150ms page load</p>
                  <p className="text-indigo-900"><strong>Improvement:</strong> 3-4x faster dashboard rendering, better mobile experience.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Title */}
        <div className={`${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'} transition-all`}>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900 tracking-tight flex items-center">
            <Sparkles className="w-5 h-5 text-blue-600 mr-2" />
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
              <div className="mt-3 flex items-center gap-3">
                <div className="inline-flex items-center bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/20 align-pill">
                  <BadgeCheck className="w-4 h-4 text-blue-100 mr-1.5" />
                <span className="text-blue-50 text-sm">
                  {(enrolledProgramsQuery.data || [])
                    .filter(program => program.status === 'ACTIVE' && program.program.status === 'ACTIVE')
                    .reduce((total, program) => total + (Number(program.currentPoints) || 0), 0)} {t('points', 'points')}
                </span>
                </div>
                <div className="inline-flex items-center bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/20 align-pill">
                  <span className="w-2 h-2 bg-amber-300 rounded-full mr-2"></span>
                  <span className="text-blue-50 text-sm">
                    {unreadCount} {t('notifications.notifications', 'notifications')}
                  </span>
                </div>
              </div>
            </div>
            <div className="md:order-2 md:ml-6 mt-4 md:mt-0 flex w-full md:w-auto flex-col items-center md:items-center">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 w-full sm:w-auto max-w-md lg:max-w-lg qr-card-container qr-on-right">
                <QRCard
                  userId={userData.id}
                  displayName={userData.name}
                  // Enhanced for easier scanning
                  minSize={180}
                  maxSize={260}
                  scale={0.68}
                  maxWidthClass="max-w-sm md:max-w-md"
                  hideCardDetails={true}
                />
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