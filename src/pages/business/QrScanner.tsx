import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BusinessLayout } from '../../components/business/BusinessLayout';
import { QRScanner } from '../../components/QRScanner';
import { useAuth } from '../../contexts/AuthContext';
import { 
  QrCodeType, 
  QrCodeData,
  CustomerQrCodeData, 
  LoyaltyCardQrCodeData,
  PromoCodeQrCodeData,
  UnknownQrCodeData,
  UnifiedScanResult,
  isCustomerQrCodeData,
  isLoyaltyCardQrCodeData,
  isPromoCodeQrCodeData,
  ensureId
} from '../../types/qrCode';
import { 
  QrCode, Check, AlertCircle, RotateCcw, 
  Layers, Badge, User, Coffee, ClipboardList, Info,
  Keyboard, KeyRound, ArrowRight, Settings, Award, Users,
  Trophy, Zap, Sparkles, PartyPopper, Star, Target, CheckCircle, Gift,
  Camera, AlertTriangle
} from 'lucide-react';
import { LoyaltyProgramService } from '../../services/loyaltyProgramService';
import { LoyaltyProgram } from '../../types/loyalty';
import { RedemptionModal } from '../../components/business/RedemptionModal';
import { ProgramEnrollmentModal } from '../../components/business/ProgramEnrollmentModal';
import { RewardModal } from '../../components/business/RewardModal';
import { CustomerDetailsModal } from '../../components/business/CustomerDetailsModal';
import { PointsAwardingModal } from '../../components/business/PointsAwardingModal';
import { isCameraSupported, isQrScanningSupported } from '../../utils/browserSupport';

// Define the interface for the component's scan result handling
interface QrScannerPageProps {
  onScan?: (result: UnifiedScanResult) => void;
}

const QrScannerPage: React.FC<QrScannerPageProps> = ({ onScan }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'scanner' | 'manual'>('scanner');
  const [scanResults, setScanResults] = useState<UnifiedScanResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<UnifiedScanResult | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [pointsToAward, setPointsToAward] = useState<number>(10);
  const [isLoading, setIsLoading] = useState(false);
  const [scanCount, setScanCount] = useState<number>(0);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isHttps, setIsHttps] = useState<boolean>(false);
  const [browserSupported, setBrowserSupported] = useState<boolean>(true);
  
  // Modal states
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showCustomerDetailsModal, setShowCustomerDetailsModal] = useState(false);
  const [showPointsAwardingModal, setShowPointsAwardingModal] = useState(false);
  const [selectedCustomerData, setSelectedCustomerData] = useState<CustomerQrCodeData | null>(null);
  const [selectedQrCodeData, setSelectedQrCodeData] = useState<LoyaltyCardQrCodeData | CustomerQrCodeData | null>(null);

  // Check for HTTPS and browser support on mount
  useEffect(() => {
    // Check if we're on HTTPS
    const isHttpsProtocol = window.location.protocol === 'https:';
    setIsHttps(isHttpsProtocol);
    
    // Check browser compatibility
    const cameraSupport = isCameraSupported();
    const qrScanningSupport = isQrScanningSupported();
    setBrowserSupported(cameraSupport && qrScanningSupport);
    
    if (!cameraSupport) {
      setScannerError('Your browser does not support camera access');
    } else if (!qrScanningSupport) {
      setScannerError('Your browser does not support QR code scanning');
    } else if (!isHttpsProtocol && process.env.NODE_ENV === 'production') {
      setScannerError('Camera access requires HTTPS. Please use a secure connection.');
    }
    
    // Load previous scan results from localStorage
    try {
      const savedResults = localStorage.getItem('qr_scan_results');
      if (savedResults) {
        const parsed = JSON.parse(savedResults);
        if (Array.isArray(parsed)) {
          setScanResults(parsed);
        }
      }
      
      // Load scan count from localStorage
      const savedCount = localStorage.getItem('qr_scan_count');
      if (savedCount) {
        setScanCount(parseInt(savedCount, 10));
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    }
  }, []);

  // Load business programs
  useEffect(() => {
    const fetchPrograms = async () => {
      if (user?.id) {
        setIsLoading(true);
        try {
          const businessId = ensureId(user.id);
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

  // Handle scan result from the QR scanner component
  const handleScan = useCallback((result: UnifiedScanResult) => {
    if (!result) return;
    
    // Add the new scan to the results
    const updatedResults = [result, ...scanResults.slice(0, 9)];
    setScanResults(updatedResults);
    setSelectedResult(result);
    
    // Update scan count and save to localStorage
    const newCount = scanCount + 1;
    setScanCount(newCount);
    localStorage.setItem('qr_scan_count', newCount.toString());
    
    // Show confetti animation for milestone scans
    if (newCount % 5 === 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    
    // Always show customer details first for customer QR codes
    if (result.type === 'customer' && isCustomerQrCodeData(result.data)) {
      setSelectedCustomerData(result.data);
      setSelectedQrCodeData(result.data);
      setShowCustomerDetailsModal(true);
      // Don't automatically show points awarding modal - customer details will have the award points option
    } else if (result.type === 'loyaltyCard' && isLoyaltyCardQrCodeData(result.data)) {
      setSelectedQrCodeData(result.data);
      setShowCustomerDetailsModal(true);
      // Don't automatically show points awarding modal - customer details will have the award points option
    }
    
    // Call the onScan prop if provided
    if (onScan) {
      onScan(result);
    }
  }, [scanResults, scanCount, onScan]);

  // Handle QR scanner errors
  const handleScannerError = useCallback((error: Error) => {
    setScannerError(error.message);
  }, []);

  const playSuccessSound = () => {
    // Sound functionality disabled as per customer request
    // Previously played beep-success.mp3
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
        parsedData = manualInput;
      }
      
      const timestamp = Date.now();
      
      // Determine if this is likely a customer ID
      const isCustomerId = manualInput.length === 9 && !isNaN(Number(manualInput));
      
      // Create appropriate QR code data based on input
      const qrData: CustomerQrCodeData | UnknownQrCodeData = isCustomerId 
        ? { 
            type: 'customer', 
            customerId: manualInput,
            name: `Customer ${manualInput}`,
            timestamp
          }
        : { 
            type: 'unknown', 
            rawData: manualInput,
            timestamp
          };
      
      // Create result object using the unified format
      const result: UnifiedScanResult = {
        type: isCustomerId ? 'customer' : 'unknown',
        data: qrData,
        timestamp: new Date(timestamp).toISOString(),
        rawData: manualInput,
        success: true
      };
      
      // Add to scan results
      setScanResults([result, ...scanResults.slice(0, 9)]);
      setSelectedResult(result);
      
      // Update scan count
      const newCount = scanCount + 1;
      setScanCount(newCount);
      localStorage.setItem('qr_scan_count', newCount.toString());
      
      // Clear input
      setManualInput('');
      
      // Call the onScan prop if provided
      if (onScan) {
        onScan(result);
      }
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
  const getIconForType = (type: QrCodeType) => {
    switch (type) {
      case 'customer':
        return <User className="w-5 h-5 text-blue-500" />;
      case 'promoCode':
        return <Badge className="w-5 h-5 text-amber-500" />;
      case 'loyaltyCard':
        return <Coffee className="w-5 h-5 text-green-500" />;
      default:
        return <QrCode className="w-5 h-5 text-gray-500" />;
    }
  };
  
  // Function to determine milestone achievements
  const getMilestoneStatus = () => {
    if (scanCount === 0) {
      return {
        current: 0,
        next: 1,
        last: 0,
        progress: 0,
        remaining: 1,
      };
    }

    const milestones = [1, 5, 10, 25, 50, 100, 200, 500];
    const nextMilestone = milestones.find(m => m > scanCount);
    const lastMilestone = milestones.slice().reverse().find(m => m <= scanCount) || 0;

    if (!nextMilestone) {
      return {
        current: scanCount,
        next: 'Max',
        last: lastMilestone,
        progress: 100,
        remaining: 0,
      };
    }

    return {
      current: scanCount,
      next: nextMilestone,
      last: lastMilestone,
      progress: (scanCount / nextMilestone) * 100,
      remaining: nextMilestone - scanCount,
    };
  };

  const getSelectedCustomerId = (): string | null => {
    if (selectedResult && isCustomerQrCodeData(selectedResult.data)) {
      return selectedResult.data.customerId;
    }
    return null;
  };
  
  const getQrCodeDisplayData = (data: QrCodeData | undefined): { title: string, subtitle: string } => {
    if (!data) return { title: t('Unknown QR Code'), subtitle: t('No data available') };
    
    // Safely check if data is an object before using properties
    const isObject = typeof data === 'object' && data !== null;
    
    switch (data.type) {
      case 'customer': {
        const customerData = data as Partial<CustomerQrCodeData>;
        const customerName = customerData.customerName || customerData.name || customerData.customerId || 'Unknown';
        const customerId = customerData.customerId || 'Unknown';
        return {
          title: `${t('Customer')}: ${customerName}`,
          subtitle: `ID: ${customerId}`
        };
      }
        
      case 'loyaltyCard': {
        const cardData = data as Partial<LoyaltyCardQrCodeData>;
        const cardId = cardData.cardId || 'Unknown';
        const loyaltyCustomerId = cardData.customerId || 'Unknown';
        return {
          title: `${t('Loyalty Card')}: ${cardId}`,
          subtitle: `${t('Customer')}: ${loyaltyCustomerId}`
        };
      }
        
      case 'promoCode': {
        const promoData = data as Partial<PromoCodeQrCodeData>;
        const code = promoData.code || 'Unknown';
        const discount = promoData.discount !== undefined ? promoData.discount : t('N/A');
        return {
          title: `${t('Promo Code')}: ${code}`,
          subtitle: `${t('Value')}: ${discount}`
        };
      }
        
      case 'unknown':
      default: {
        // Safely check for rawData property
        const unknownData = data as Partial<UnknownQrCodeData>;
        const rawData = unknownData.rawData ? String(unknownData.rawData).substring(0, 30) : 'N/A';
        return {
          title: t('Unknown QR Code'),
          subtitle: `${t('Raw data')}: ${rawData}${rawData !== 'N/A' && rawData.length > 30 ? '...' : ''}`
        };
      }
    }
  };

  const SafeScanner = () => (
    <QRScanner onScan={handleScan} onError={handleScannerError} />
  );

  // Render a fallback UI for unsupported browsers or non-HTTPS connections
  const renderFallbackUI = () => {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md">
        <AlertTriangle size={48} className="text-yellow-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">QR Scanner Unavailable</h2>
        <p className="text-center mb-4">{scannerError || 'The QR scanner could not be initialized'}</p>
        {!isHttps && process.env.NODE_ENV === 'production' && (
          <p className="text-sm text-gray-600 mb-4">
            Try accessing this page using HTTPS instead of HTTP
          </p>
        )}
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => setActiveTab('manual')}
        >
          <Keyboard className="inline-block mr-2" size={16} />
          Switch to Manual Entry
        </button>
      </div>
    );
  };

  const renderScanResultActions = (result: UnifiedScanResult) => {
    if (!result || !result.data) return null;
    
    return (
      <div className="flex flex-col space-y-2">
        {result.type === 'customer' && isCustomerQrCodeData(result.data) && (
          <>
            <button
              onClick={() => {
                setSelectedCustomerData(result.data as CustomerQrCodeData);
                setShowCustomerDetailsModal(true);
              }}
              className="flex items-center justify-center w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <User className="w-5 h-5 mr-2" />
              {t('Show Customer Details')}
            </button>
            
            <button
              onClick={() => {
                setSelectedQrCodeData(result.data as CustomerQrCodeData);
                setShowPointsAwardingModal(true);
              }}
              className="flex items-center justify-center w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Award className="w-5 h-5 mr-2" />
              {t('Award Points')}
            </button>
            
            <button
              onClick={() => {
                setSelectedCustomerData(result.data as CustomerQrCodeData);
                setShowProgramModal(true);
              }}
              className="flex items-center justify-center w-full py-3 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors"
            >
              <Users className="w-5 h-5 mr-2" />
              {t('Join Program')}
            </button>
            
            <button
              onClick={() => {
                setSelectedCustomerData(result.data as CustomerQrCodeData);
                setShowRewardModal(true);
              }}
              className="flex items-center justify-center w-full py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              <Trophy className="w-5 h-5 mr-2" />
              {t('Give Reward')}
            </button>
          </>
        )}
        
        {result.type === 'loyaltyCard' && isLoyaltyCardQrCodeData(result.data) && (
          <>
            <button
              onClick={() => {
                setSelectedQrCodeData(result.data as LoyaltyCardQrCodeData);
                setShowPointsAwardingModal(true);
              }}
              className="flex items-center justify-center w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Award className="w-5 h-5 mr-2" />
              {t('Award Points')}
            </button>
            
            <button
              onClick={() => {
                setShowRewardModal(true);
              }}
              className="flex items-center justify-center w-full py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
            >
              <Trophy className="w-5 h-5 mr-2" />
              {t('Give Reward')}
            </button>
          </>
        )}
        
        {result.type === 'promoCode' && isPromoCodeQrCodeData(result.data) && (
          <button
            onClick={() => setShowRedeemModal(true)}
            className="flex items-center justify-center w-full py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            <Check className="w-5 h-5 mr-2" />
            {t('Redeem Promo Code')}
          </button>
        )}
      </div>
    );
  };

  return (
    <BusinessLayout>
      <div className="space-y-6 pb-10">
        {/* Header with animated gradient */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-500 to-indigo-700 rounded-xl p-6 shadow-lg mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 bottom-0 bg-[url('/assets/images/pattern-dots.svg')] opacity-20"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center mb-2">
                  <QrCode className="w-8 h-8 text-white mr-3" />
                  {t('QR Scanner')}
                </h1>
                <p className="text-blue-100">{t('Scan QR codes to reward your customers')}</p>
              </div>
              <div className="text-center">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-white">
                  <div className="text-4xl font-bold">{scanCount}</div>
                  <div className="text-xs uppercase tracking-wider mt-1">{t('Total Scans')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tab navigation with modern styling */}
        <div className="bg-white rounded-xl shadow-md p-2 mb-6">
          <nav className="flex space-x-1">
            <button
              className={`py-3 px-4 rounded-lg flex-1 font-medium text-sm flex items-center justify-center space-x-2 transition-all duration-200 ${
                activeTab === 'scanner'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('scanner')}
            >
              <Camera className="w-4 h-4" />
              <span>{t('Scanner')}</span>
            </button>
            
            <button
              className={`py-3 px-4 rounded-lg flex-1 font-medium text-sm flex items-center justify-center space-x-2 transition-all duration-200 ${
                activeTab === 'manual'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('manual')}
            >
              <Keyboard className="w-4 h-4" />
              <span>{t('Manual Entry')}</span>
            </button>
          </nav>
        </div>
        
        {/* Progress tracker */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center mb-3">
            <Trophy className="w-5 h-5 text-amber-500 mr-2" />
            <h2 className="font-medium text-gray-800">{t('Scan Progress')}</h2>
          </div>
          
          <div className="space-y-3">
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${getMilestoneStatus()?.progress || 0}%` }}
              >
                {getMilestoneStatus()?.progress > 20 && (
                  <span className="text-white text-xs font-bold animate-pulse">{Math.round(getMilestoneStatus()?.progress || 0)}%</span>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <div className="text-gray-600">
                {getMilestoneStatus()?.remaining} more to next reward
              </div>
              <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full flex items-center">
                <Target className="w-4 h-4 mr-1" />
                Next: {getMilestoneStatus()?.next} scans
              </div>
            </div>
          </div>
        </div>
        
        {/* Program Selection with enhanced design */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 border-b border-blue-100">
            <div className="flex items-center">
              <Settings className="w-5 h-5 text-blue-500 mr-2" />
              <h2 className="font-medium text-gray-800">{t('Scan Settings')}</h2>
            </div>
          </div>
          
          <div className="p-6">
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
                    className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
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
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                    {t('No programs found. Please create a loyalty program first.')}
                  </div>
                )}
              </div>
              
              <div>
                <label htmlFor="points" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('Points to Award')}
                </label>
                <div className="relative">
                  <input
                    id="points"
                    type="number"
                    min="1"
                    max="1000"
                    className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm pr-12"
                    value={pointsToAward}
                    onChange={(e) => setPointsToAward(Number(e.target.value))}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Star className="h-5 w-5 text-amber-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main content area with enhanced layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Scanner tab */}
            {activeTab === 'scanner' && (
              <div className="bg-white rounded-xl shadow-lg p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-600"></div>
                
                {showConfetti && (
                  <div className="absolute inset-0 z-10 pointer-events-none">
                    <div className="absolute top-0 left-1/4 animate-float-slow">
                      <PartyPopper className="w-8 h-8 text-yellow-500" />
                    </div>
                    <div className="absolute top-10 right-1/4 animate-float-delay">
                      <Sparkles className="w-8 h-8 text-purple-500" />
                    </div>
                    <div className="absolute top-1/3 left-1/3 animate-bounce-slow">
                      <Trophy className="w-10 h-10 text-amber-500" />
                    </div>
                    <div className="absolute bottom-1/4 right-1/3 animate-spin-slow">
                      <Star className="w-8 h-8 text-green-500" />
                    </div>
                    <div className="absolute bottom-10 left-10 animate-pulse">
                      <Zap className="w-6 h-6 text-blue-500" />
                    </div>
                  </div>
                )}
                
                {showConfetti && (
                  <div className="relative z-20 mb-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white p-3 rounded-lg animate-bounce-subtle flex items-center">
                    <Trophy className="w-5 h-5 mr-2" />
                    <span>{t('Milestone reached!')} {scanCount} {t('scans completed!')}</span>
                  </div>
                )}
                
                <div className="relative w-full aspect-square rounded-lg overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600">
                  {browserSupported ? (
                    <>
                      {user?.id && selectedProgramId && (
                        <QRScanner
                          onScan={handleScan}
                          businessId={user.id}
                          programId={selectedProgramId}
                          pointsToAward={pointsToAward}
                        />
                      )}
                    </>
                  ) : (
                    renderFallbackUI()
                  )}
                </div>
                {scannerError && <p className="text-red-500 mt-2">{scannerError}</p>}
              </div>
            )}
            
            {/* Manual Entry tab with improved design */}
            {activeTab === 'manual' && (
              <div className="bg-white rounded-xl shadow-lg p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600"></div>
                <h2 className="font-medium text-gray-800 mb-4 flex items-center">
                  <Keyboard className="w-5 h-5 text-indigo-500 mr-2" />
                  {t('Manual Customer ID Entry')}
                </h2>
                
                <div className="space-y-5">
                  <div>
                    <label htmlFor="manualInput" className="block text-sm font-medium text-gray-700 mb-2">
                      {t('Customer ID or Code')}
                    </label>
                    <div className="relative">
                      <input
                        id="manualInput"
                        type="text"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-3 pr-12"
                        placeholder="Enter Customer ID or Promo Code"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleManualEntry();
                          }
                        }}
                      />
                      <button
                        className="absolute inset-y-0 right-0 px-3 flex items-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-r-lg hover:from-blue-600 hover:to-indigo-700 transition-all"
                        onClick={handleManualEntry}
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                    {inputError && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {inputError}
                      </p>
                    )}
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 text-sm text-blue-700 border border-blue-100">
                    <div className="flex items-start">
                      <Info className="w-5 h-5 mt-0.5 mr-2 flex-shrink-0 text-blue-500" />
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
          
          {/* Scan Details Panel with improved styling */}
          <div className="bg-white rounded-xl shadow-lg lg:row-start-1 lg:row-span-2 lg:col-start-3 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 border-b border-blue-100 flex items-center justify-between">
              <h2 className="font-medium text-gray-800 flex items-center">
                <ClipboardList className="w-5 h-5 text-blue-500 mr-2" />
                {t('Scan Details')}
              </h2>
              {scanResults.length > 0 && (
                <button
                  className="text-sm text-red-600 hover:text-red-800 flex items-center hover:bg-red-50 p-1.5 rounded-full transition-colors"
                  onClick={clearResults}
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  {t('Clear')}
                </button>
              )}
            </div>
            
            <div className="p-5">
              {selectedResult ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg shadow-inner">
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-md">
                      {getIconForType(selectedResult.type)}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <h3 className="text-sm font-medium text-gray-500">{t('Scan Type')}:</h3>
                    <p className="text-base font-semibold capitalize bg-blue-50 px-2 py-0.5 rounded text-blue-700">
                      {selectedResult.type.replace('_', ' ')}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <h3 className="text-sm font-medium text-gray-500">{t('Timestamp')}:</h3>
                    <p className="text-base text-gray-700">{formatTimestamp(selectedResult.timestamp)}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <h3 className="text-sm font-medium text-gray-500">{t('Data')}:</h3>
                    </div>
                    <div className="mt-1 bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg text-sm text-gray-800 font-mono overflow-x-auto border border-gray-200 shadow-inner">
                      {selectedResult.type === 'customer' && (
                        <div>
                          <p><span className="text-blue-500">name:</span> {selectedResult.data.name || 'Customer'}</p>
                        </div>
                      )}
                      
                      {selectedResult.type === 'promoCode' && (
                        <p><span className="text-amber-500">code:</span> {selectedResult.data.code}</p>
                      )}
                      
                      {selectedResult.type === 'unknown' && (
                        <p>{typeof selectedResult.data === 'object' 
                          ? JSON.stringify(selectedResult.data, null, 2) 
                          : selectedResult.data}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-gray-100">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <Zap className="w-4 h-4 text-amber-500 mr-1" />
                      {t('Actions')}:
                    </h3>
                    
                    {renderScanResultActions(selectedResult)}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                    <ClipboardList className="w-10 h-10 text-gray-300" />
                  </div>
                  <p className="text-gray-500">{t('Scan a code to see details')}</p>
                  <p className="text-sm text-gray-400 mt-1">{t('Details will appear here')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Recent Scans with card design */}
        {scanResults.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-indigo-50 p-4 border-b border-indigo-100">
              <h2 className="font-medium text-gray-800 flex items-center">
                <Layers className="w-5 h-5 text-indigo-500 mr-2" />
                {t('Recent Scans')}
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {scanResults.map((result, index) => (
                  <div 
                    key={index}
                    onClick={() => setSelectedResult(result)}
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border ${
                      selectedResult === result 
                        ? 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md transform scale-[1.02]' 
                        : 'border-gray-100 hover:bg-gray-50 hover:border-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100">
                          {getIconForType(result.type)}
                        </div>
                        <span className="ml-2 font-medium capitalize">
                          {result.type.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        {formatTimestamp(result.timestamp).split(',')[0]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 truncate">
                      {result.type === 'customer' ? `Customer: ${result.data.name || 'Customer'}` :
                       result.type === 'promoCode' ? `Code: ${result.data.code}` :
                       result.type === 'loyaltyCard' ? `Card: ${result.data.cardId}` :
                       `Text: ${result.type === 'unknown' && 'rawData' in result.data ? result.data.rawData.substring(0, 20) + (result.data.rawData.length > 20 ? '...' : '') : 'Unknown'}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Guide Section with cards */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-purple-50 p-4 border-b border-purple-100">
            <h2 className="font-medium text-gray-800 flex items-center">
              <Info className="w-5 h-5 text-purple-500 mr-2" />
              {t('Scanner Guide')}
            </h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 transition-all hover:shadow-md">
                <div className="mb-3 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm border border-blue-200">
                  <QrCode className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-medium text-blue-800 mb-2">{t('Scan Customer QR')}</h3>
                <p className="text-sm text-blue-700">
                  {t('Scan customer QR codes to award points to their loyalty cards. Points will be added automatically.')}
                </p>
              </div>
              
              <div className="p-5 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 transition-all hover:shadow-md">
                <div className="mb-3 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm border border-amber-200">
                  <Badge className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="font-medium text-amber-800 mb-2">{t('Scan Promotion Codes')}</h3>
                <p className="text-sm text-amber-700">
                  {t('Scan promotion codes to apply discounts or special offers at checkout.')}
                </p>
              </div>
              
              <div className="p-5 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200 transition-all hover:shadow-md">
                <div className="mb-3 w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm border border-green-200">
                  <KeyRound className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-medium text-green-800 mb-2">{t('Manual Entry')}</h3>
                <p className="text-sm text-green-700">
                  {t('Enter customer IDs or promotion codes manually when scanning is not possible.')}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Version footer */}
        <div className="text-center mt-8 mb-2">
                      <p className="text-xs text-gray-400">vcarda 12</p>
        </div>
      </div>

      {/* Modal Components */}
      {selectedResult && selectedResult.type === 'customer' && (
        <>
          {/* Redemption Modal */}
          <RedemptionModal
            isOpen={showRedeemModal}
            onClose={() => setShowRedeemModal(false)}
            customerId={String(selectedResult.data.customerId || '')}
            businessId={user?.id ? String(user.id) : ''}
            customerName={selectedResult.data.name || 'Customer'}
          />

          {/* Program Enrollment Modal */}
          <ProgramEnrollmentModal
            isOpen={showProgramModal}
            onClose={() => setShowProgramModal(false)}
            customerId={String(selectedResult.data.customerId || '')}
            businessId={user?.id ? String(user.id) : ''}
            customerName={selectedResult.data.name || 'Customer'}
          />

          {/* Reward Modal */}
          <RewardModal
            isOpen={showRewardModal}
            onClose={() => setShowRewardModal(false)}
            customerId={String(selectedResult.data.customerId || '')}
            businessId={user?.id ? String(user.id) : ''}
            customerName={selectedResult.data.name || 'Customer'}
          />

          {/* Customer Details Modal */}
          <CustomerDetailsModal
            isOpen={showCustomerDetailsModal}
            onClose={() => setShowCustomerDetailsModal(false)}
            customerId={String(selectedResult.data.customerId || '')}
            businessId={user?.id ? String(user.id) : ''}
            initialData={selectedCustomerData}
          />

          {/* Points Awarding Modal */}
          {showPointsAwardingModal && (
            <PointsAwardingModal
              onClose={() => setShowPointsAwardingModal(false)}
              scanData={selectedQrCodeData}
              businessId={user?.id ? String(user.id) : ''}
              onSuccess={(points) => {
                // Invalidate queries to refresh data
                // The PointsAwardingModal handles success notifications internally
              }}
              programs={programs.map(p => ({ id: p.id, name: p.name }))}
            />
          )}
        </>
      )}
    </BusinessLayout>
  );
};

export default QrScannerPage; 