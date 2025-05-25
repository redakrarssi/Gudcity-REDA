import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BusinessLayout } from '../../components/business/BusinessLayout';
import { QRScanner } from '../../components/QRScanner';
import { 
  QrCode, Check, AlertCircle, RotateCcw, 
  Layers, Badge, User, Coffee, ClipboardList, Info,
  Keyboard, KeyRound, ArrowRight
} from 'lucide-react';

interface ScanResult {
  type: 'customer_card' | 'promo_code' | 'loyalty_card' | 'unknown';
  data: any;
  timestamp: string;
}

const QrScannerPage = () => {
  const { t } = useTranslation();
  const [scannerMessage, setScannerMessage] = useState<string>('');
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEntryType, setManualEntryType] = useState<'customer' | 'promo' | 'loyalty'>('customer');
  const [manualEntryValue, setManualEntryValue] = useState('');

  // Reset state when navigating away
  useEffect(() => {
    return () => {
      setScanResults([]);
      setScannerMessage('');
    };
  }, []);

  const handleScan = (data: string) => {
    setIsScanning(true);
    try {
      // Try to parse as JSON
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch (parseError) {
        // Check if the data might be a URL containing JSON (common in some QR formats)
        if (data.includes('{"') && data.includes('"}')) {
          const jsonMatch = data.match(/(\{.*\})/);
          if (jsonMatch && jsonMatch[0]) {
            try {
              qrData = JSON.parse(jsonMatch[0]);
            } catch (nestedParseError) {
              throw new Error('Invalid JSON format');
            }
          } else {
            throw new Error('Invalid JSON format');
          }
        } else {
          throw new Error('Not a JSON QR code');
        }
      }
      
      // Determine the type of QR code
      let type: ScanResult['type'] = 'unknown';
      if (qrData.type === 'customer_card') {
        type = 'customer_card';
        setScannerMessage(`${t('Customer')} ID: ${qrData.customerId} ${t('scanned successfully')}`);
        setMessageType('success');
        
        // Example of mocked customer lookup
        mockLookupCustomer(qrData.customerId);
      } else if (qrData.type === 'promo_code') {
        type = 'promo_code';
        setScannerMessage(`${t('Promotion code')}: ${qrData.code} ${t('recognized')}`);
        setMessageType('success');
        
        // Example of mocked promo code validation
        mockValidatePromoCode(qrData.code);
      } else if (qrData.type === 'loyalty_card') {
        type = 'loyalty_card';
        setScannerMessage(`${t('Loyalty card')} ID: ${qrData.cardId} ${t('processed')}`);
        setMessageType('success');
        
        // Example of mocked loyalty card processing
        mockProcessLoyaltyCard(qrData.cardId, qrData.programId);
      } else {
        setScannerMessage(t('Recognized QR code but unknown type'));
        setMessageType('info');
      }
      
      // Add to scan history
      const newResult: ScanResult = {
        type,
        data: qrData,
        timestamp: new Date().toISOString()
      };
      
      setScanResults(prev => [newResult, ...prev]);
      setSelectedResult(newResult);
    } catch (error) {
      // Handle non-JSON QR codes
      
      // Check if it's potentially a promo code (alphanumeric code)
      const promoCodeRegex = /^[A-Z0-9]{4,12}$/;
      if (promoCodeRegex.test(data)) {
        setScannerMessage(`${t('Possible promo code detected')}: ${data}`);
        setMessageType('info');
        
        const newResult: ScanResult = {
          type: 'promo_code',
          data: { type: 'promo_code', code: data, inferred: true },
          timestamp: new Date().toISOString()
        };
        
        setScanResults(prev => [newResult, ...prev]);
        setSelectedResult(newResult);
        
        // Try to validate the possible promo code
        mockValidatePromoCode(data);
      }
      // Check if it might be a customer ID (usually numeric)
      else if (/^(cust|customer)?[0-9]{4,8}$/i.test(data)) {
        // Extract just the numeric part if prefixed with "cust" or "customer"
        const customerId = data.replace(/^(cust|customer)/i, '');
        
        setScannerMessage(`${t('Possible customer ID detected')}: ${customerId}`);
        setMessageType('info');
        
        const newResult: ScanResult = {
          type: 'customer_card',
          data: { type: 'customer_card', customerId, inferred: true },
          timestamp: new Date().toISOString()
        };
        
        setScanResults(prev => [newResult, ...prev]);
        setSelectedResult(newResult);
        
        // Try to look up the possible customer
        mockLookupCustomer(customerId);
      }
      // URL handling
      else if (data.startsWith('http')) {
        setScannerMessage(`${t('URL detected')}: ${data.substring(0, 30)}...`);
        setMessageType('info');
        
        const newResult: ScanResult = {
          type: 'unknown',
          data: { text: data, type: 'url' },
          timestamp: new Date().toISOString()
        };
        
        setScanResults(prev => [newResult, ...prev]);
        setSelectedResult(newResult);
      } 
      // Plain text
      else {
        setScannerMessage(`${t('Plain text')}: ${data.substring(0, 30)}${data.length > 30 ? '...' : ''}`);
        setMessageType('info');
        
        const newResult: ScanResult = {
          type: 'unknown',
          data: { text: data },
          timestamp: new Date().toISOString()
        };
        
        setScanResults(prev => [newResult, ...prev]);
        setSelectedResult(newResult);
      }
    }
    
    // Automatically reset scanning state after a delay
    setTimeout(() => {
      setIsScanning(false);
    }, 1500);
  };

  const handleError = (error: Error) => {
    setScannerMessage(`${t('Error')}: ${error.message}`);
    setMessageType('error');
    setIsScanning(false);
  };
  
  const clearHistory = () => {
    setScanResults([]);
    setSelectedResult(null);
    setScannerMessage(t('Scan history cleared'));
    setMessageType('info');
  };
  
  // Mock functions to simulate business logic
  const mockLookupCustomer = (customerId: string) => {
    // In a real app, this would call an API
    console.log(`Looking up customer: ${customerId}`);
  };
  
  const mockValidatePromoCode = (code: string) => {
    // In a real app, this would validate against your promo service
    console.log(`Validating promo code: ${code}`);
  };
  
  const mockProcessLoyaltyCard = (cardId: string, programId: string) => {
    // In a real app, this would process loyalty points
    console.log(`Processing loyalty card: ${cardId} for program: ${programId}`);
  };
  
  // Helper to format the timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper to get icon for result type
  const getIconForType = (type: ScanResult['type']) => {
    switch (type) {
      case 'customer_card':
        return <User className="w-5 h-5 text-blue-500" />;
      case 'promo_code':
        return <Badge className="w-5 h-5 text-purple-500" />;
      case 'loyalty_card':
        return <Coffee className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleManualEntry = () => {
    if (!manualEntryValue.trim()) return;
    
    let result: ScanResult;
    
    if (manualEntryType === 'customer') {
      result = {
        type: 'customer_card',
        data: { 
          type: 'customer_card', 
          customerId: manualEntryValue, 
          manual: true 
        },
        timestamp: new Date().toISOString()
      };
      
      setScannerMessage(`${t('Customer ID')}: ${manualEntryValue} ${t('entered manually')}`);
      mockLookupCustomer(manualEntryValue);
    } else if (manualEntryType === 'promo') {
      result = {
        type: 'promo_code',
        data: { 
          type: 'promo_code', 
          code: manualEntryValue,
          manual: true 
        },
        timestamp: new Date().toISOString()
      };
      
      setScannerMessage(`${t('Promotion code')}: ${manualEntryValue} ${t('entered manually')}`);
      mockValidatePromoCode(manualEntryValue);
    } else { // loyalty
      result = {
        type: 'loyalty_card',
        data: { 
          type: 'loyalty_card', 
          cardId: manualEntryValue,
          programId: 'manual-entry',
          manual: true 
        },
        timestamp: new Date().toISOString()
      };
      
      setScannerMessage(`${t('Loyalty card ID')}: ${manualEntryValue} ${t('entered manually')}`);
      mockProcessLoyaltyCard(manualEntryValue, 'manual-entry');
    }
    
    setScanResults(prev => [result, ...prev]);
    setSelectedResult(result);
    setMessageType('success');
    setManualEntryValue('');
    setShowManualEntry(false);
  };

  return (
    <BusinessLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
            <QrCode className="w-6 h-6 text-blue-600 mr-2" />
            {t('QR Scanner')}
          </h1>
          <button
            onClick={() => setShowManualEntry(!showManualEntry)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-1.5 transition-colors"
          >
            <Keyboard className="h-4 w-4" />
            {showManualEntry ? t('Hide Manual Entry') : t('Manual Entry')}
          </button>
        </div>

        {/* Main Scanner Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center">
              <QrCode className="w-5 h-5 text-blue-600 mr-2" />
              {t('Scan QR Code')}
            </h2>
            
            {showManualEntry ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  {t('Manually enter a customer ID, promotion code, or loyalty card ID if scanning is not working.')}
                </p>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => setManualEntryType('customer')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm ${
                      manualEntryType === 'customer' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    {t('Customer')}
                  </button>
                  <button
                    onClick={() => setManualEntryType('promo')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm ${
                      manualEntryType === 'promo' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Badge className="h-3.5 w-3.5" />
                    {t('Promo')}
                  </button>
                  <button
                    onClick={() => setManualEntryType('loyalty')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm ${
                      manualEntryType === 'loyalty' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <Coffee className="h-3.5 w-3.5" />
                    {t('Loyalty')}
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={manualEntryValue}
                      onChange={(e) => setManualEntryValue(e.target.value)}
                      placeholder={
                        manualEntryType === 'customer' ? t('Enter customer ID') :
                        manualEntryType === 'promo' ? t('Enter promo code') :
                        t('Enter loyalty card ID')
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleManualEntry();
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={handleManualEntry}
                    disabled={!manualEntryValue.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="pt-2">
                  <button
                    onClick={() => setShowManualEntry(false)}
                    className="flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900 w-full py-2 border border-gray-200 rounded-md"
                  >
                    <QrCode className="h-4 w-4" />
                    {t('Switch to Scanner')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <QRScanner onScan={handleScan} onError={handleError} />
                </div>
                
                {scannerMessage && (
                  <div className={`mt-4 p-4 rounded-lg text-sm flex items-start ${
                    messageType === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 
                    messageType === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 
                    'bg-blue-50 text-blue-700 border border-blue-100'
                  }`}>
                    {messageType === 'success' ? (
                      <Check className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                    ) : messageType === 'error' ? (
                      <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                    )}
                    <span>{scannerMessage}</span>
                  </div>
                )}
                
                {isScanning && (
                  <div className="mt-4 flex justify-center">
                    <div className="animate-pulse bg-blue-500 h-2 w-32 rounded-full"></div>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Scan Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-800 flex items-center">
                <ClipboardList className="w-5 h-5 text-blue-600 mr-2" />
                {t('Scan Details')}
              </h2>
              {scanResults.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="text-sm text-gray-500 flex items-center hover:text-gray-700"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  {t('Clear')}
                </button>
              )}
            </div>
            
            {selectedResult ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center">
                      {getIconForType(selectedResult.type)}
                      <span className="ml-2 font-medium capitalize">
                        {selectedResult.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatTimestamp(selectedResult.timestamp)}
                    </p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">{t('Data')}</h3>
                  <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedResult.data, null, 2)}
                  </pre>
                </div>
                
                {selectedResult.type === 'customer_card' && (
                  <div className="p-4 border border-blue-100 rounded-lg bg-blue-50">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-blue-700">{t('Customer')}</h3>
                      <button className="text-blue-700 text-sm hover:underline">
                        {t('View Profile')}
                      </button>
                    </div>
                    <p className="text-sm text-blue-600 mt-2">
                      ID: {selectedResult.data.customerId}
                    </p>
                  </div>
                )}
                
                {selectedResult.type === 'promo_code' && (
                  <div className="p-4 border border-purple-100 rounded-lg bg-purple-50">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-purple-700">{t('Promotion')}</h3>
                      <button className="text-purple-700 text-sm hover:underline">
                        {t('Apply')}
                      </button>
                    </div>
                    <p className="text-sm text-purple-600 mt-2">
                      {t('Code')}: {selectedResult.data.code}
                    </p>
                  </div>
                )}
                
                {selectedResult.type === 'loyalty_card' && (
                  <div className="p-4 border border-green-100 rounded-lg bg-green-50">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-green-700">{t('Loyalty Card')}</h3>
                      <button className="text-green-700 text-sm hover:underline">
                        {t('Add Points')}
                      </button>
                    </div>
                    <p className="text-sm text-green-600 mt-2">
                      {t('Card ID')}: {selectedResult.data.cardId}
                    </p>
                    <p className="text-sm text-green-600">
                      {t('Program')}: {selectedResult.data.programId}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Layers className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500">
                  {scanResults.length > 0 
                    ? t('Select a scan from history to view details')
                    : t('No scans yet. Scan a QR code to see details.')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Scan History */}
        {scanResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">{t('Recent Scans')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {scanResults.map((result, index) => (
                <div 
                  key={index}
                  onClick={() => setSelectedResult(result)}
                  className={`p-4 rounded-lg cursor-pointer transition-colors border ${
                    selectedResult === result 
                      ? 'border-blue-200 bg-blue-50' 
                      : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getIconForType(result.type)}
                      <span className="ml-2 font-medium capitalize">
                        {result.type.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(result.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 truncate">
                    {result.type === 'customer_card' ? `ID: ${result.data.customerId}` :
                     result.type === 'promo_code' ? `Code: ${result.data.code}` :
                     result.type === 'loyalty_card' ? `Card: ${result.data.cardId}` :
                     `Text: ${typeof result.data.text === 'string' ? result.data.text.substring(0, 20) + (result.data.text.length > 20 ? '...' : '') : 'Unknown'}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Guide Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">{t('How to Use')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="font-medium text-blue-700 mb-2">{t('Scan Customer Card')}</h3>
              <p className="text-sm text-blue-600">
                {t('Use the scanner to quickly identify customers and access their profiles, points balance, and purchase history.')}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
              <h3 className="font-medium text-purple-700 mb-2">{t('Validate Promotions')}</h3>
              <p className="text-sm text-purple-600">
                {t('Scan promotion QR codes to validate and apply discounts, special offers, or loyalty rewards.')}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <h3 className="font-medium text-green-700 mb-2">{t('Process Loyalty Cards')}</h3>
              <p className="text-sm text-green-600">
                {t('Quickly add loyalty points, redeem rewards, or check customer status by scanning their loyalty card.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
};

export default QrScannerPage; 