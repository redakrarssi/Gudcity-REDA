import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BusinessLayout } from '../../components/business/BusinessLayout';
import { QRScanner } from '../../components/QRScanner';
import { useAuth } from '../../contexts/AuthContext';
import { 
  QrCode, Check, AlertCircle, RotateCcw, 
  Layers, Badge, User, Coffee, ClipboardList, Info,
  Keyboard, KeyRound, ArrowRight, Settings, Award, Users
} from 'lucide-react';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';
import { LoyaltyProgram } from '../../types/loyalty';

interface ScanResult {
  type: string; 
  data: any;
  timestamp: string;
  raw: string;
}

const QrScannerPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'scanner' | 'manual'>('scanner');
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<ScanResult | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [pointsToAward, setPointsToAward] = useState<number>(10);
  const [isLoading, setIsLoading] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);

  // Load previous scan results from localStorage
  useEffect(() => {
    try {
      const savedResults = localStorage.getItem('qr_scan_results');
      if (savedResults) {
        const parsed = JSON.parse(savedResults);
        if (Array.isArray(parsed)) {
          setScanResults(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading scan results from localStorage:', error);
    }
  }, []);

  // Load business programs
  useEffect(() => {
    const fetchPrograms = async () => {
      if (user?.id) {
        setIsLoading(true);
        try {
          const businessId = String(user.id); // Convert to string
          const businessPrograms = await LoyaltyProgramService.getBusinessPrograms(businessId);
          setPrograms(businessPrograms);
          
          // Set the first program as default if available
          if (businessPrograms.length > 0) {
            setSelectedProgramId(businessPrograms[0].id);
          }
        } catch (error) {
          console.error('Error fetching business programs:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchPrograms();
  }, [user]);

  // Save scan results to localStorage whenever they change
  useEffect(() => {
    if (scanResults.length > 0) {
      try {
        localStorage.setItem('qr_scan_results', JSON.stringify(scanResults.slice(0, 10)));
      } catch (error) {
        console.error('Error saving scan results to localStorage:', error);
      }
    }
  }, [scanResults]);

  const handleScan = (result: ScanResult) => {
    if (!result) return;
    
    // Add the new scan to the results
    const updatedResults = [result, ...scanResults.slice(0, 9)];
    setScanResults(updatedResults);
    setSelectedResult(result);
    
    // Play success sound
    playSuccessSound();
  };

  const playSuccessSound = () => {
    try {
      const audio = new Audio('/assets/sounds/beep-success.mp3');
      audio.volume = 0.5;
      audio.play().catch(console.error); // Catch and log errors but don't stop execution
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const handleManualEntry = () => {
    setInputError(null);
    
    if (!manualInput.trim()) {
      setInputError('Please enter a customer ID or code');
      return;
    }
    
    try {
      // Try to parse as JSON first
      let parsedData;
      try {
        parsedData = JSON.parse(manualInput);
      } catch (e) {
        // If not JSON, just use the raw text
        parsedData = { text: manualInput };
      }
      
      const now = new Date().toISOString();
      
      // Create result object
      const result: ScanResult = {
        type: manualInput.length === 9 && !isNaN(Number(manualInput)) ? 'customer_card' : 'unknown',
        data: parsedData,
        timestamp: now,
        raw: manualInput
      };
      
      // Add to scan results
      handleScan(result);
      
      // Clear input
      setManualInput('');
    } catch (error) {
      console.error('Error processing manual input:', error);
      setInputError('Invalid input format');
    }
  };

  const clearResults = () => {
    setScanResults([]);
    setSelectedResult(null);
    localStorage.removeItem('qr_scan_results');
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString() + ', ' + date.toLocaleDateString();
    } catch (e) {
      return timestamp;
    }
  };

  // Function to get the icon based on the QR code type
  const getIconForType = (type: string) => {
    switch (type) {
      case 'customer_card':
        return <User className="w-5 h-5 text-blue-500" />;
      case 'promo_code':
        return <Badge className="w-5 h-5 text-amber-500" />;
      case 'loyalty_card':
        return <Coffee className="w-5 h-5 text-green-500" />;
      default:
        return <QrCode className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <BusinessLayout>
      <div className="space-y-6 pb-10">
        <h1 className="text-2xl font-semibold text-gray-800 flex items-center mb-6">
          <QrCode className="w-6 h-6 text-blue-500 mr-2" />
          {t('QR Code Scanner')}
        </h1>
        
        {/* Tab navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'scanner'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('scanner')}
            >
              <QrCode className="w-4 h-4" />
              <span>{t('Scanner')}</span>
            </button>
            
            <button
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'manual'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('manual')}
            >
              <Keyboard className="w-4 h-4" />
              <span>{t('Manual Entry')}</span>
            </button>
          </nav>
        </div>
        
        {/* Program Selection */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center mb-4">
            <Settings className="w-5 h-5 text-blue-500 mr-2" />
            <h2 className="font-medium text-gray-800">{t('Scan Settings')}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="program" className="block text-sm font-medium text-gray-700 mb-1">
                {t('Select Program')}
              </label>
              {isLoading ? (
                <div className="animate-pulse h-10 bg-gray-200 rounded"></div>
              ) : programs.length > 0 ? (
                <select
                  id="program"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={selectedProgramId || ''}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                >
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
                  {t('No programs found. Please create a loyalty program first.')}
                </div>
              )}
            </div>
            
            <div>
              <label htmlFor="points" className="block text-sm font-medium text-gray-700 mb-1">
                {t('Points to Award')}
              </label>
              <input
                id="points"
                type="number"
                min="1"
                max="1000"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={pointsToAward}
                onChange={(e) => setPointsToAward(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
        
        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Scanner tab */}
            {activeTab === 'scanner' && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <QRScanner 
                  onScan={handleScan} 
                  businessId={user?.id}
                  programId={selectedProgramId || undefined}
                  pointsToAward={pointsToAward}
                />
              </div>
            )}
            
            {/* Manual Entry tab */}
            {activeTab === 'manual' && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="font-medium text-gray-800 mb-4">{t('Manual Customer ID Entry')}</h2>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="manualInput" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('Customer ID or Code')}
                    </label>
                    <div className="relative">
                      <input
                        id="manualInput"
                        type="text"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-2"
                        placeholder="Enter Customer ID or Promo Code"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleManualEntry();
                          }
                        }}
                      />
                      <button
                        className="absolute inset-y-0 right-0 px-3 flex items-center bg-blue-500 text-white rounded-r-md"
                        onClick={handleManualEntry}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                    {inputError && (
                      <p className="mt-1 text-sm text-red-600">{inputError}</p>
                    )}
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
                    <div className="flex items-start">
                      <Info className="w-5 h-5 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <p className="font-medium mb-1">{t('How to use manual entry')}:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>{t('Enter a customer ID to award points')}</li>
                          <li>{t('Enter a promotion code to apply discount')}</li>
                          <li>{t('Press Enter or click the arrow button to submit')}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Scan Details Panel */}
          <div className="bg-white rounded-xl shadow-md p-6 lg:row-start-1 lg:row-span-2 lg:col-start-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-gray-800">{t('Scan Details')}</h2>
              {scanResults.length > 0 && (
                <button
                  className="text-sm text-red-600 hover:text-red-800 flex items-center"
                  onClick={clearResults}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  {t('Clear')}
                </button>
              )}
            </div>
            
            {selectedResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg">
                  {getIconForType(selectedResult.type)}
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{t('Scan Type')}:</h3>
                  <p className="text-base font-semibold capitalize">
                    {selectedResult.type.replace('_', ' ')}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{t('Timestamp')}:</h3>
                  <p className="text-base">{formatTimestamp(selectedResult.timestamp)}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{t('Data')}:</h3>
                  <div className="mt-1 bg-gray-50 p-3 rounded-md text-sm text-gray-800 font-mono overflow-x-auto">
                    {selectedResult.type === 'customer_card' && (
                      <div>
                        <p><span className="text-gray-500">name:</span> {selectedResult.data.name || 'Customer'}</p>
                      </div>
                    )}
                    
                    {selectedResult.type === 'promo_code' && (
                      <p><span className="text-gray-500">code:</span> {selectedResult.data.code}</p>
                    )}
                    
                    {selectedResult.type === 'unknown' && (
                      <p>{typeof selectedResult.data === 'object' 
                        ? JSON.stringify(selectedResult.data, null, 2) 
                        : selectedResult.data}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="pt-2 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">{t('Actions')}:</h3>
                  
                  {selectedResult.type === 'customer_card' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button 
                        onClick={() => {
                          // Show rewards from /business/promotions
                          window.location.href = '/business/promotions';
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white py-2 rounded-md text-sm flex items-center justify-center"
                      >
                        <Award className="w-4 h-4 mr-2" />
                        {t('Give Reward')}
                      </button>
                      <button
                        onClick={() => {
                          // Show programs from /business/programs
                          window.location.href = '/business/programs';
                        }}
                        className="bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-md text-sm flex items-center justify-center"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        {t('Join Program')}
                      </button>
                      <button
                        onClick={() => {
                          // Show redeem code interface
                          setShowRedeemModal(true);
                        }}
                        className="bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-md text-sm flex items-center justify-center"
                      >
                        <KeyRound className="w-4 h-4 mr-2" />
                        {t('Redeem Code')}
                      </button>
                    </div>
                  )}
                  
                  {selectedResult.type === 'promo_code' && (
                    <button className="w-full mt-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-md text-sm flex items-center justify-center">
                      <Badge className="w-4 h-4 mr-2" />
                      {t('Apply Promotion')}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">{t('Scan a code to see details')}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Recent Scans */}
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
                    {result.type === 'customer_card' ? `Customer: ${result.data.name || 'Customer'}` :
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
          <h2 className="font-semibold text-gray-800 mb-4">{t('Scanner Guide')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="mb-3 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-medium text-gray-800 mb-2">{t('Scan Customer QR')}</h3>
              <p className="text-sm text-gray-600">
                {t('Scan customer QR codes to award points to their loyalty cards. Points will be added automatically.')}
              </p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="mb-3 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Badge className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-medium text-gray-800 mb-2">{t('Scan Promotion Codes')}</h3>
              <p className="text-sm text-gray-600">
                {t('Scan promotion codes to apply discounts or special offers at checkout.')}
              </p>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="mb-3 w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-medium text-gray-800 mb-2">{t('Manual Entry')}</h3>
              <p className="text-sm text-gray-600">
                {t('Enter customer IDs or promotion codes manually when scanning is not possible.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </BusinessLayout>
  );
};

export default QrScannerPage; 