import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomerLayout } from '../../components/customer/CustomerLayout';
import { QRCard } from '../../components/QRCard';
import { 
  QrCode, Smartphone, Download, Share, RefreshCw, 
  Info, Shield, CheckCircle2, Copy, AlertCircle
} from 'lucide-react';
import { createCustomerQRCode, downloadQRCode } from '../../utils/qrCodeGenerator';
import { useAuth } from '../../contexts/AuthContext';

const CustomerQrCode = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [animateIn, setAnimateIn] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Trigger animation after a short delay
    const timer = setTimeout(() => {
      setAnimateIn(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  // Check if user is available
  if (!user) {
    return (
      <CustomerLayout>
        <div className="flex justify-center items-center h-64">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 w-full max-w-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  {t('Please sign in to view your QR code.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  const handleDownloadQR = async () => {
    setIsDownloading(true);
    try {
      await downloadQRCode(
        { 
          type: 'customer_card', 
          customerId: user.id, 
          name: user.name,
          timestamp: new Date().toISOString() 
        },
        `qrcode-${user.id}.png`
      );
    } catch (error) {
      console.error('Error downloading QR code:', error);
      setError('Failed to download QR code. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Loyalty QR Code',
          text: `Scan my loyalty QR code (ID: ${user.id})`,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      handleCopyId();
    }
  };

  return (
    <CustomerLayout>
      <div className="max-w-2xl mx-auto pb-12">
        {/* Header */}
        <div className={`transition-all duration-500 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
                <QrCode className="w-6 h-6 text-blue-500 mr-2" />
                {t('Your QR Code')}
              </h1>
              <p className="text-gray-500 mt-1">{t('Use this code to collect points at any participating business')}</p>
            </div>
          </div>
        </div>

        {/* Display errors if any */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main QR Code Card */}
        <div className={`transition-all duration-500 ease-out transform delay-100 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 md:p-8 border border-blue-100 shadow-lg text-center relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-200 rounded-full opacity-20 transform translate-x-20 -translate-y-20"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-indigo-200 rounded-full opacity-20 transform -translate-x-20 translate-y-20"></div>
            
            {/* QR Card */}
            <div className="relative z-10 transform transition-transform duration-500 hover:scale-105">
              <QRCard userId={user.id.toString()} userName={user.name || ''} />
            </div>
            
            {/* Info text */}
            <p className="text-gray-600 mt-6 max-w-md mx-auto">
              {t('Present this QR code when making purchases to collect loyalty points')}
            </p>
            
            {/* Action buttons */}
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <button
                onClick={handleDownloadQR}
                disabled={isDownloading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {isDownloading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {t(isDownloading ? 'Downloading...' : 'Download')}
              </button>
              
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                <Share className="w-4 h-4" />
                {t('Share')}
              </button>
              
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <Info className="w-4 h-4" />
                {t(showInfo ? 'Hide Info' : 'More Info')}
              </button>
            </div>
          </div>
        </div>
        
        {/* Additional info section */}
        {showInfo && (
          <div className={`mt-6 bg-white rounded-xl p-6 border border-gray-200 shadow-sm transition-all duration-300 ease-out transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <Info className="w-5 h-5 text-blue-500 mr-2" />
              {t('About Your QR Code')}
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <Shield className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-700">{t('Secure Identification')}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('Your QR code contains a secure identifier linked to your account. No personal information is stored in the QR code itself.')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <Smartphone className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-700">{t('Always Available')}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('Save this QR code to your phone or print it out to always have it available, even without internet access.')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <CheckCircle2 className="w-5 h-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-gray-700">{t('Universal Use')}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('This single QR code works across all participating businesses. No need for multiple loyalty cards!')}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-2">{t('Your ID')}:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-700">{user.id}</code>
                  </div>
                  <button
                    onClick={handleCopyId}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    title={t('Copy ID')}
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Mobile instructions */}
        <div className={`mt-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100 transition-all duration-500 ease-out transform delay-200 ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
          <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
            <Smartphone className="w-5 h-5 text-purple-500 mr-2" />
            {t('Quick Tip')}
          </h2>
          <p className="text-gray-600 text-sm">
            {t('For quicker access, add this screen to your home screen or save the QR code to your phone\'s gallery.')}
          </p>
          <div className="mt-4 text-center">
            <button
              onClick={handleDownloadQR}
              className="inline-flex items-center text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              <Download className="w-4 h-4 mr-1.5" />
              {t('Save to gallery')}
            </button>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default CustomerQrCode; 