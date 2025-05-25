import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Ticket, QrCode, Download, Plus, 
  Calendar, Users, RefreshCw, X 
} from 'lucide-react';
import QRCode from 'qrcode.react';
import { PromoService } from '../../services/promoService';
import { CurrencyService } from '../../services/currencyService';
import type { PromoCode, PromoCodeStats } from '../../types/promo';
import type { CurrencyCode } from '../../types/currency';

interface PromoManagerProps {
  businessId: string;
}

export const PromoManager: React.FC<PromoManagerProps> = ({ businessId }) => {
  const { t } = useTranslation();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [stats, setStats] = useState<PromoCodeStats | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  // Form state
  const [formData, setFormData] = useState({
    type: 'POINTS' as PromoCode['type'],
    value: '',
    maxUses: '',
    expiresAt: ''
  });

  useEffect(() => {
    loadCodes();
    loadStats();
  }, [businessId, currency]);

  const loadCodes = async () => {
    try {
      const { data } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      setCodes(data || []);
    } catch (error) {
      console.error('Error loading promo codes:', error);
    }
  };

  const loadStats = async () => {
    try {
      const stats = await PromoService.getBusinessStats(businessId, currency);
      setStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { code, error } = await PromoService.generateCode(
        businessId,
        formData.type,
        parseFloat(formData.value),
        currency,
        formData.maxUses ? parseInt(formData.maxUses) : null,
        formData.expiresAt || null
      );

      if (error) throw new Error(error);

      await loadCodes();
      await loadStats();
      setShowCreateModal(false);
      setFormData({
        type: 'POINTS',
        value: '',
        maxUses: '',
        expiresAt: ''
      });
    } catch (error) {
      console.error('Error creating code:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelCode = async (codeId: string) => {
    try {
      await PromoService.updateCodeStatus(codeId, 'CANCELLED');
      await loadCodes();
      await loadStats();
    } catch (error) {
      console.error('Error cancelling code:', error);
    }
  };

  const downloadQR = (code: string) => {
    const canvas = document.getElementById(`qr-${code}`) as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `promo-${code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">
          {t('promoCodeManager')}
        </h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          {t('createCode')}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Ticket className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{t('totalCodes')}</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalCodes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <RefreshCw className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{t('activeCodes')}</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeCodes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{t('totalRedemptions')}</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalRedemptions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">{t('totalValue')}</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {CurrencyService.formatAmount(stats.totalValue, currency)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Code List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('code')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('type')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('value')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('usage')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('status')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {codes.map(code => (
              <tr key={code.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{code.code}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {code.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {code.type === 'POINTS' ? code.value : CurrencyService.formatAmount(code.value, code.currency || currency)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {code.usedCount} / {code.maxUses || '∞'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    code.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    code.status === 'EXPIRED' ? 'bg-yellow-100 text-yellow-800' :
                    code.status === 'DEPLETED' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {code.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowQRModal(code.code)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <QrCode className="h-5 w-5" />
                    </button>
                    {code.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleCancelCode(code.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Code Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">{t('createPromoCode')}</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('codeType')}
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as PromoCode['type'] })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="POINTS">{t('points')}</option>
                  <option value="DISCOUNT">{t('discount')}</option>
                  <option value="CASHBACK">{t('cashback')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('value')}
                </label>
                <input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                  step={formData.type === 'POINTS' ? '1' : '0.01'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('maxUses')}
                </label>
                <input
                  type="number"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  min="0"
                  placeholder={t('unlimited')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {t('expirationDate')}
                </label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.value}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">{t('qrCode')}</h3>
              <button
                onClick={() => setShowQRModal(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <QRCode
                id={`qr-${showQRModal}`}
                value={JSON.stringify({
                  type: 'promo_code',
                  code: showQRModal
                })}
                size={200}
                level="H"
              />
              <button
                onClick={() => downloadQR(showQRModal)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-5 w-5 mr-2" />
                {t('downloadQR')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 