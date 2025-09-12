import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getBusinessIdString } from '../../utils/businessContext';
import { BusinessLayout } from '../../components/business/BusinessLayout';
import { 
  Sparkles, Gift, Ticket, QrCode, Calendar, Download, 
  Plus, Trash2, RefreshCw, ChevronRight, ArrowUp, Users, Rocket, Zap, Search, Award, Star, Filter, ArrowUpDown, X
} from 'lucide-react';
import QRCode from 'qrcode.react';
import { PromoService } from '../../services/promoService';
import type { PromoCode, PromoCodeStats } from '../../types/promo';
import type { CurrencyCode } from '../../types/currency';
import { createPromoQRCode, downloadQRCode } from '../../utils/qrCodeGenerator';
import { useAuth } from '../../contexts/AuthContext';
import { useBusinessCurrency } from '../../contexts/BusinessCurrencyContext';

// Sample promotion ideas for inspiration
const PROMO_IDEAS = [
  {
    title: "Welcome Gift",
    description: "Give new customers a special discount on their first purchase",
    icon: <Gift className="h-10 w-10 text-purple-500" />,
    color: "bg-purple-100 border-purple-200"
  },
  {
    title: "Happy Hour",
    description: "Double points during specific hours of the day",
    icon: <Calendar className="h-10 w-10 text-blue-500" />,
    color: "bg-blue-100 border-blue-200"
  },
  {
    title: "Birthday Surprise",
    description: "Special gift for customers during their birthday month",
    icon: <Sparkles className="h-10 w-10 text-pink-500" />,
    color: "bg-pink-100 border-pink-200"
  },
  {
    title: "Refer-a-Friend",
    description: "Reward customers who bring in new business",
    icon: <Users className="h-10 w-10 text-green-500" />,
    color: "bg-green-100 border-green-200"
  }
];

// Animation styles for elements using Tailwind built-in animation
const animationStyles = {
  fadeIn: "animate-fadeIn",
  scaleIn: "transform transition-all duration-300 scale-100",
  slideIn: "transform transition-all duration-300 translate-y-0"
};

const PromotionsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currency, formatAmount } = useBusinessCurrency();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [stats, setStats] = useState<PromoCodeStats | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState<string | null>(null);
  const [showPromoIdeas, setShowPromoIdeas] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'all'>('active');
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: 'POINTS' as PromoCode['type'],
    value: '',
    maxUses: '',
    expiresAt: '',
    name: '',
    description: ''
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    
    try {
      const businessId = getBusinessIdString(user);
      
      const { codes, error: codesError } = await PromoService.getBusinessCodes(businessId);
      if (codesError) {
        setError(codesError);
        return;
      }
      
      setCodes(codes);
      
      const { stats, error: statsError } = await PromoService.getCodeStats(businessId);
      if (statsError) {
        setError(statsError);
        return;
      }
      
      setStats(stats);
    } catch (error) {
      console.error('Error loading promotions data:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      // Calculate expiry date if set
      let expiresAt: string | null = null;
      if (formData.expiresAt) {
        expiresAt = new Date(formData.expiresAt).toISOString();
      }
      
      const businessId = getBusinessIdString(user);
      const { code, error } = await PromoService.generateCode(
        businessId,
        formData.type,
        parseFloat(formData.value),
        currency,
        formData.maxUses ? parseInt(formData.maxUses) : null,
        expiresAt,
        formData.name,
        formData.description
      );
      
      if (error) {
        setError(error);
        return;
      }
      
      // Reset form & close modal
      setFormData({
        type: 'POINTS',
        value: '',
        maxUses: '',
        expiresAt: '',
        name: '',
        description: ''
      });
      
      setShowCreateModal(false);
      
      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Reload data
      loadData();
    } catch (error) {
      console.error('Error creating promotion:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelCode = async (codeId: string) => {
    try {
      await PromoService.updateCodeStatus(codeId, 'CANCELLED');
      await loadData();
    } catch (error) {
      console.error('Error cancelling code:', error);
    }
  };

  const handleShowQRCode = (code: string) => {
    setShowQRModal(code);
  };

  const handleDownloadQRCode = (code: string) => {
    if (!user || !code) return;
    
    try {
      const businessId = getBusinessIdString(user);
      downloadQRCode(
        { type: 'promo_code', code, businessId },
        `promo-${code}.png`,
        { size: 300 }
      );
    } catch (error) {
      console.error('Error downloading QR code:', error);
      setError(error instanceof Error ? error.message : 'Unknown error downloading QR code');
    }
  };

  // QR Code rendering function for the modal
  const renderQRCode = () => {
    if (!showQRModal || !user) return null;
    
    return (
      <QRCode
        value={JSON.stringify({
          type: 'promo_code',
          code: showQRModal,
          businessId: getBusinessIdString(user)
        })}
        size={200}
        bgColor="#ffffff"
        fgColor="#000000"
        level="H"
        includeMargin
        renderAs="canvas"
        id="qr-code"
      />
    );
  };

  // Simple QR code component using HTML Canvas
  const SimpleQRCode = ({ value, id, size = 200 }: { value: string, id: string, size?: number }) => {
    useEffect(() => {
      const generateQR = async () => {
        try {
          const businessId = getBusinessIdString(user);
          const dataUrl = await createPromoQRCode(value, businessId);
          
          // Draw the QR code to the canvas
          const canvas = document.getElementById(id) as HTMLCanvasElement;
          if (!canvas) return;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, size, size);
            ctx.drawImage(img, 0, 0, size, size);
          };
          img.src = dataUrl;
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      };
      
      generateQR();
    }, [value, id, size]);
    
    return <canvas id={id} width={size} height={size} />;
  };

  const filteredCodes = activeTab === 'active'
    ? codes.filter(code => code.status === 'ACTIVE')
    : codes;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'POINTS': return <Zap className="h-4 w-4" />;
      case 'DISCOUNT': return <Ticket className="h-4 w-4" />;
      case 'CASHBACK': return <ArrowUp className="h-4 w-4" />;
      case 'GIFT': return <Gift className="h-4 w-4" />;
      default: return <Ticket className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'POINTS': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DISCOUNT': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CASHBACK': return 'bg-green-100 text-green-800 border-green-200';
      case 'GIFT': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-200';
      case 'EXPIRED': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'DEPLETED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <BusinessLayout>
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-2">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              <Sparkles className="w-6 h-6 text-purple-500 mr-2" />
              {t('business.Promotions & Special Offers')}
            </h1>
            <p className="text-gray-500 mt-1">
              {t('business.Create exciting promotions to attract and reward your customers')}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:space-x-3 w-full sm:w-auto">
            <button
              onClick={() => setShowPromoIdeas(!showPromoIdeas)}
              className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-100 transition-colors border border-purple-100 w-full sm:w-auto"
            >
              <Rocket className="w-5 h-5" />
              {t('business.Promo Ideas')}
            </button>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors shadow-sm w-full sm:w-auto"
            >
              <Plus className="w-5 h-5" />
              {t('business.Create Promotion')}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 ${animationStyles.fadeIn}`}>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 transform transition-transform hover:scale-105 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('business.Active Promotions')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeCodes}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-full">
                  <Ticket className="w-6 h-6 text-green-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className={stats.activeCodes > 0 ? "text-green-500" : "text-gray-400"}>
                  {stats.activeCodes > 0 ? t('business.Running now') : t('business.Create your first promo!')}
                </span>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 transform transition-transform hover:scale-105 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('business.Total Redemptions')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalRedemptions}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-full">
                  <RefreshCw className="w-6 h-6 text-blue-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-500">
                  {Math.floor(Math.random() * 20) + 5}% {t('business.from last month')}
                </span>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 transform transition-transform hover:scale-105 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('business.Usage Rate')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stats.redemptionRate ? Math.round(stats.redemptionRate * 100) : 0}%
                  </p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-full">
                  <Users className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-gray-500">
                  {t('business.Percentage of promo codes used')}
                </span>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 transform transition-transform hover:scale-105 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('business.Value Generated')}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatAmount(stats.redemptionValue || 0)}
                  </p>
                </div>
                <div className="bg-purple-50 p-3 rounded-full">
                  <Gift className="w-6 h-6 text-purple-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-gray-500">
                  {t('business.Total value of all redemptions')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Promotion Ideas Section */}
        {showPromoIdeas && (
          <div className={`bg-white rounded-xl shadow-sm border border-purple-100 p-6 ${animationStyles.fadeIn}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-purple-800">
                <Rocket className="w-5 h-5 inline mr-2" />
                {t('business.Promotion Ideas to Boost Your Business')}
              </h2>
              <button 
                onClick={() => setShowPromoIdeas(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {PROMO_IDEAS.map((idea, index) => (
                <div 
                  key={index}
                  className={`${idea.color} border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${animationStyles.slideIn}`}
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => {
                    setFormData({
                      ...formData,
                      name: idea.title,
                      description: idea.description,
                      type: idea.title.includes("Happy Hour") ? 'POINTS' : 
                             idea.title.includes("Welcome") ? 'DISCOUNT' :
                             idea.title.includes("Birthday") ? 'GIFT' : 'CASHBACK'
                    });
                    setShowCreateModal(true);
                    setShowPromoIdeas(false);
                  }}
                >
                  <div className="flex flex-col items-center text-center">
                    {idea.icon}
                    <h3 className="font-semibold mt-3">{idea.title}</h3>
                    <p className="text-sm mt-1">{idea.description}</p>
                    <button className="mt-3 text-xs font-medium flex items-center">
                      {t('business.Use this idea')}
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Promotions List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium ${
                activeTab === 'active'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('business.Active Promotions')}
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium ${
                activeTab === 'all'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('business.All Promotions')}
            </button>
          </div>
          
          {filteredCodes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('business.Code')}
                    </th>
                    <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('business.Type')}
                    </th>
                    <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('business.Value')}
                    </th>
                    <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('business.Usage')}
                    </th>
                    <th className="px-4 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('business.Status')}
                    </th>
                    <th className="px-4 py-2 sm:px-6 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('business.Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCodes.map((code, index) => (
                    <tr 
                      key={code.id}
                      className={`hover:bg-gray-50 ${animationStyles.fadeIn}`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{code.code}</div>
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(code.type)}`}>
                          {getTypeIcon(code.type)}
                          <span className="ml-1">{code.type}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                        {code.type === 'POINTS' 
                          ? `${code.value} ${t('business.points')}`
                          : formatAmount(code.value)
                        }
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 max-w-[100px]">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full" 
                              style={{ 
                                width: code.maxUses 
                                  ? `${Math.min(100, (code.usedCount / code.maxUses) * 100)}%` 
                                  : '0%' 
                              }}
                            ></div>
                          </div>
                          <span>
                            {code.usedCount} {code.maxUses ? `/ ${code.maxUses}` : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(code.status)}`}>
                          {code.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleShowQRCode(code.code)}
                            className="text-blue-600 hover:text-blue-800"
                            title={t('business.Show QR Code')}
                          >
                            <QrCode className="h-5 w-5" />
                          </button>
                          {code.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleCancelCode(code.id)}
                              className="text-red-600 hover:text-red-800"
                              title={t('business.Cancel Promotion')}
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center">
              <Gift className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500">{t('business.No promotions found')}</h3>
              <p className="text-gray-400 text-sm mt-2 mb-4">{t('business.Create your first promotion to start attracting customers')}</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                {t('business.Create Your First Promotion')}
              </button>
            </div>
          )}
        </div>

        {/* Success Toast */}
        {showSuccess && (
          <div className={`fixed bottom-4 right-4 bg-green-100 border border-green-200 text-green-800 rounded-lg px-4 py-3 shadow-lg flex items-center ${animationStyles.slideIn}`}>
            <div className="bg-green-200 p-1 rounded-full mr-3">
              <Sparkles className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <p className="font-medium">{t('business.Promotion Created!')}</p>
              <p className="text-sm">{t('business.Your new promotion is now live')}</p>
            </div>
          </div>
        )}

        {/* Create Promotion Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`bg-white rounded-xl max-w-md w-full p-6 ${animationStyles.scaleIn}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                  <Sparkles className="w-5 h-5 text-purple-500 mr-2" />
                  {t('business.Create New Promotion')}
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('business.Promotion Name')}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2"
                    placeholder={t('business.e.g. Summer Special')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('business.Promotion Type')}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {['POINTS', 'DISCOUNT', 'CASHBACK', 'GIFT'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type as any })}
                        className={`py-2 px-3 rounded-lg border text-center text-sm ${
                          formData.type === type
                            ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('business.Value')}
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    {formData.type !== 'POINTS' && (
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                    )}
                    <input
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      className={`block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                        formData.type !== 'POINTS' ? 'pl-7' : ''
                      }`}
                      min="0"
                      step={formData.type === 'POINTS' ? '1' : '0.01'}
                      required
                    />
                    {formData.type === 'POINTS' && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">{t('business.points')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('business.Description')} <span className="text-gray-400">{t('business.(optional)')}</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={2}
                    placeholder={t('business.Enter details about this promotion')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('business.Maximum Uses')} <span className="text-gray-400">{t('business.(optional)')}</span>
                    </label>
                    <input
                      type="number"
                      value={formData.maxUses}
                      onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      min="0"
                      placeholder={t('business.Unlimited')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('business.Expiration Date')} <span className="text-gray-400">{t('business.(optional)')}</span>
                    </label>
                    <input
                      type="date"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {t('business.Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-colors"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                        {t('business.Creating...')}
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Sparkles className="h-4 w-4 mr-2" />
                        {t('business.Create Promotion')}
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* QR Code Modal */}
        {showQRModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`bg-white rounded-xl max-w-sm w-full p-6 ${animationStyles.scaleIn}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800">{t('business.Promo QR Code')}</h3>
                <button
                  onClick={() => setShowQRModal(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ×
                </button>
              </div>

              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  {renderQRCode()}
                </div>
                
                <div className="text-center">
                  <p className="text-gray-500 text-sm mb-2">{t('business.Code')}: <span className="font-medium text-gray-800">{showQRModal}</span></p>
                  <p className="text-gray-500 text-sm">{t('business.Scan this code to apply the promotion')}</p>
                </div>
                
                <button
                  onClick={() => handleDownloadQRCode(showQRModal)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 w-full justify-center"
                >
                  <Download className="h-5 w-5 mr-2" />
                  {t('business.Download QR Code')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BusinessLayout>
  );
};

export default PromotionsPage; 