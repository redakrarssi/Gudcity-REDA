import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BusinessLayout } from '../../components/business/BusinessLayout';
import { 
  User, QrCode, Save, Clipboard, Copy, CreditCard, 
  Download, ChevronDown, ChevronUp, Plus, Hash 
} from 'lucide-react';
import { 
  createCustomerQRCode, 
  createPromoQRCode, 
  createLoyaltyCardQRCode,
  downloadQRCode
} from '../../utils/qrCodeGenerator';

// Sample data for testing
const SAMPLE_CUSTOMERS = [
  { id: 'cust1001', name: 'John Smith' },
  { id: 'cust1002', name: 'Maria Garcia' },
  { id: 'cust1003', name: 'Wei Chen' }
];

const SAMPLE_PROMOS = [
  { code: 'SUMMER25', id: 'promo1001' },
  { code: 'WELCOME10', id: 'promo1002' },
  { code: 'LOYALTY50', id: 'promo1003' }
];

const SAMPLE_LOYALTY_CARDS = [
  { cardId: 'card1001', programId: 'prog1001', programName: 'Coffee Rewards' },
  { cardId: 'card1002', programId: 'prog1002', programName: 'Dining Points' },
  { cardId: 'card1003', programId: 'prog1003', programName: 'VIP Membership' }
];

// Mock business ID
const MOCK_BUSINESS_ID = '123';

const TestCodesPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'customers' | 'promos' | 'loyalty'>('customers');
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [customCode, setCustomCode] = useState('');
  const [customType, setCustomType] = useState<'customer' | 'promo' | 'loyalty'>('customer');
  const [customId, setCustomId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    samples: true,
    custom: false
  });

  useEffect(() => {
    generateSampleQRCodes();
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const generateSampleQRCodes = async () => {
    setIsGenerating(true);
    const newCodes: Record<string, string> = {};

    try {
      // Generate customer QR codes
      for (const customer of SAMPLE_CUSTOMERS) {
        const qrUrl = await createCustomerQRCode(
          customer.id, 
          MOCK_BUSINESS_ID,
          customer.name
        );
        newCodes[`customer-${customer.id}`] = qrUrl;
      }

      // Generate promo QR codes
      for (const promo of SAMPLE_PROMOS) {
        const qrUrl = await createPromoQRCode(
          promo.code,
          MOCK_BUSINESS_ID
        );
        newCodes[`promo-${promo.code}`] = qrUrl;
      }

      // Generate loyalty card QR codes
      for (const card of SAMPLE_LOYALTY_CARDS) {
        const qrUrl = await createLoyaltyCardQRCode(
          card.cardId,
          card.programId,
          MOCK_BUSINESS_ID
        );
        newCodes[`loyalty-${card.cardId}`] = qrUrl;
      }

      setQrCodes(newCodes);
    } catch (error) {
      console.error('Error generating QR codes:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCustomQR = async () => {
    if (!customId) return;
    
    setIsGenerating(true);
    try {
      let qrUrl = '';
      
      if (customType === 'customer') {
        qrUrl = await createCustomerQRCode(customId, MOCK_BUSINESS_ID);
      } else if (customType === 'promo') {
        qrUrl = await createPromoQRCode(customId, MOCK_BUSINESS_ID);
      } else if (customType === 'loyalty') {
        // For loyalty, we use customId as cardId and a fixed programId
        qrUrl = await createLoyaltyCardQRCode(customId, 'testprogram', MOCK_BUSINESS_ID);
      }
      
      setQrCodes(prev => ({
        ...prev,
        [`custom-${customType}-${customId}`]: qrUrl
      }));
      
      // Reset form and expand custom codes section
      setCustomCode(customId);
      setCustomId('');
    } catch (error) {
      console.error('Error generating custom QR code:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadQR = async (type: string, id: string) => {
    try {
      if (type === 'customer') {
        await downloadQRCode(
          { type: 'customer_card', customerId: id, businessId: MOCK_BUSINESS_ID },
          `customer-${id}.png`
        );
      } else if (type === 'promo') {
        await downloadQRCode(
          { type: 'promo_code', code: id, businessId: MOCK_BUSINESS_ID },
          `promo-${id}.png`
        );
      } else if (type === 'loyalty') {
        await downloadQRCode(
          { type: 'loyalty_card', cardId: id, programId: 'testprogram', businessId: MOCK_BUSINESS_ID },
          `loyalty-${id}.png`
        );
      }
    } catch (error) {
      console.error('Error downloading QR code:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('Copied to clipboard!');
      })
      .catch(err => {
        console.error('Could not copy text: ', err);
      });
  };

  return (
    <BusinessLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
            <QrCode className="w-6 h-6 text-blue-600 mr-2" />
            {t('Test QR Codes')}
          </h1>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-600 mb-6">
            {t('Generate sample QR codes to test your QR scanner. These codes can be displayed on another device or printed for scanning.')}
          </p>
          
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-4 py-2 ${activeTab === 'customers' ? 'text-blue-600 border-b-2 border-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <User className="w-4 h-4 inline mr-1" />
              {t('Customers')}
            </button>
            <button
              onClick={() => setActiveTab('promos')}
              className={`px-4 py-2 ${activeTab === 'promos' ? 'text-blue-600 border-b-2 border-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Hash className="w-4 h-4 inline mr-1" />
              {t('Promotions')}
            </button>
            <button
              onClick={() => setActiveTab('loyalty')}
              className={`px-4 py-2 ${activeTab === 'loyalty' ? 'text-blue-600 border-b-2 border-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CreditCard className="w-4 h-4 inline mr-1" />
              {t('Loyalty Cards')}
            </button>
          </div>
          
          {/* Sample QR Codes Section */}
          <div className="mb-8">
            <div 
              className="flex justify-between items-center cursor-pointer mb-4"
              onClick={() => toggleSection('samples')}
            >
              <h2 className="text-lg font-medium text-gray-800 flex items-center">
                <QrCode className="w-5 h-5 text-blue-600 mr-2" />
                {t('Sample QR Codes')}
              </h2>
              {expandedSections.samples ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.samples && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTab === 'customers' && SAMPLE_CUSTOMERS.map((customer) => (
                  <div key={customer.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="mb-3 text-blue-600 font-medium flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      {customer.name}
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-200 mb-3 flex justify-center">
                      {qrCodes[`customer-${customer.id}`] ? (
                        <img 
                          src={qrCodes[`customer-${customer.id}`]} 
                          alt={`QR for ${customer.name}`}
                          className="w-48 h-48"
                        />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center bg-gray-100">
                          {isGenerating ? t('Generating...') : t('QR not generated')}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mb-3">
                      {t('Customer ID')}: <span className="font-mono">{customer.id}</span>
                      <button 
                        onClick={() => copyToClipboard(customer.id)}
                        className="ml-2 text-blue-500 hover:text-blue-700"
                        title={t('Copy ID')}
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleDownloadQR('customer', customer.id)}
                      className="w-full flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      {t('Download QR')}
                    </button>
                  </div>
                ))}
                
                {activeTab === 'promos' && SAMPLE_PROMOS.map((promo) => (
                  <div key={promo.code} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="mb-3 text-purple-600 font-medium flex items-center">
                      <Hash className="w-4 h-4 mr-2" />
                      {promo.code}
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-200 mb-3 flex justify-center">
                      {qrCodes[`promo-${promo.code}`] ? (
                        <img 
                          src={qrCodes[`promo-${promo.code}`]} 
                          alt={`QR for ${promo.code}`}
                          className="w-48 h-48"
                        />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center bg-gray-100">
                          {isGenerating ? t('Generating...') : t('QR not generated')}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mb-3">
                      {t('Promo Code')}: <span className="font-mono">{promo.code}</span>
                      <button 
                        onClick={() => copyToClipboard(promo.code)}
                        className="ml-2 text-blue-500 hover:text-blue-700"
                        title={t('Copy Code')}
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleDownloadQR('promo', promo.code)}
                      className="w-full flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      {t('Download QR')}
                    </button>
                  </div>
                ))}
                
                {activeTab === 'loyalty' && SAMPLE_LOYALTY_CARDS.map((card) => (
                  <div key={card.cardId} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="mb-3 text-green-600 font-medium flex items-center">
                      <CreditCard className="w-4 h-4 mr-2" />
                      {card.programName}
                    </div>
                    <div className="bg-white p-2 rounded border border-gray-200 mb-3 flex justify-center">
                      {qrCodes[`loyalty-${card.cardId}`] ? (
                        <img 
                          src={qrCodes[`loyalty-${card.cardId}`]} 
                          alt={`QR for ${card.programName}`}
                          className="w-48 h-48"
                        />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center bg-gray-100">
                          {isGenerating ? t('Generating...') : t('QR not generated')}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mb-3">
                      {t('Card ID')}: <span className="font-mono">{card.cardId}</span>
                      <button 
                        onClick={() => copyToClipboard(card.cardId)}
                        className="ml-2 text-blue-500 hover:text-blue-700"
                        title={t('Copy ID')}
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleDownloadQR('loyalty', card.cardId)}
                      className="w-full flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      {t('Download QR')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Custom QR Code Generator */}
          <div>
            <div 
              className="flex justify-between items-center cursor-pointer mb-4"
              onClick={() => toggleSection('custom')}
            >
              <h2 className="text-lg font-medium text-gray-800 flex items-center">
                <Plus className="w-5 h-5 text-blue-600 mr-2" />
                {t('Create Custom QR Code')}
              </h2>
              {expandedSections.custom ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.custom && (
              <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('QR Code Type')}
                      </label>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setCustomType('customer')}
                          className={`py-2 px-3 rounded flex items-center text-sm ${
                            customType === 'customer'
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <User className="w-4 h-4 mr-1" />
                          {t('Customer')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomType('promo')}
                          className={`py-2 px-3 rounded flex items-center text-sm ${
                            customType === 'promo'
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <Hash className="w-4 h-4 mr-1" />
                          {t('Promo')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomType('loyalty')}
                          className={`py-2 px-3 rounded flex items-center text-sm ${
                            customType === 'loyalty'
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <CreditCard className="w-4 h-4 mr-1" />
                          {t('Loyalty')}
                        </button>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {customType === 'customer' 
                          ? t('Customer ID') 
                          : customType === 'promo' 
                            ? t('Promo Code') 
                            : t('Card ID')}
                      </label>
                      <input
                        type="text"
                        value={customId}
                        onChange={(e) => setCustomId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder={customType === 'customer' 
                          ? t('Enter customer ID') 
                          : customType === 'promo' 
                            ? t('Enter promo code') 
                            : t('Enter card ID')}
                      />
                    </div>
                    
                    <button
                      onClick={generateCustomQR}
                      disabled={!customId || isGenerating}
                      className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? t('Generating...') : t('Generate QR Code')}
                    </button>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col items-center justify-center">
                    {customCode && qrCodes[`custom-${customType}-${customCode}`] ? (
                      <>
                        <img 
                          src={qrCodes[`custom-${customType}-${customCode}`]} 
                          alt="Custom QR code"
                          className="w-48 h-48 mb-3"
                        />
                        <p className="text-sm text-gray-600 mb-3">
                          {customType === 'customer' 
                            ? t('Customer ID') 
                            : customType === 'promo' 
                              ? t('Promo Code') 
                              : t('Card ID')}: <span className="font-mono">{customCode}</span>
                        </p>
                        <button
                          onClick={() => handleDownloadQR(customType, customCode)}
                          className="flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors text-sm"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          {t('Download QR')}
                        </button>
                      </>
                    ) : (
                      <div className="text-center text-gray-500">
                        <QrCode className="w-16 h-16 mx-auto mb-2 text-gray-300" />
                        <p>{t('Fill in the form and generate a QR code')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
};

export default TestCodesPage; 