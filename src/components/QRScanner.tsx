import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { AlertCircle, Camera, Check, Award, Users, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LoyaltyCardService from '../services/loyaltyCardService';
import QrCodeService from '../services/qrCodeService';

interface ScanResult {
  type: string;
  data: any;
  timestamp: string;
  raw: string;
}

interface QRScannerProps {
  onScan?: (result: ScanResult) => void;
  businessId?: number | string;
  programId?: number | string;
  pointsToAward?: number;
}

export const QRScanner: React.FC<QRScannerProps> = ({ 
  onScan, 
  businessId,
  programId, 
  pointsToAward = 10 // Default to 10 points if not specified
}) => {
  const { t } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [successScan, setSuccessScan] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = 'qr-scanner';
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [processingCard, setProcessingCard] = useState(false);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [showProgramsModal, setShowProgramsModal] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);

  useEffect(() => {
    let scannerInstance: Html5Qrcode | null = null;
    
    const initScanner = async () => {
      try {
        scannerInstance = new Html5Qrcode(scannerDivId);
        scannerRef.current = scannerInstance;
      } catch (error) {
        console.error("Failed to initialize scanner:", error);
        setError('Failed to initialize scanner');
      }
    };
    
    initScanner();
    
    return () => {
      if (scannerInstance) {
        if (isScanning) {
          scannerInstance.stop().catch(console.error);
        }
        scannerRef.current = null;
      }
    };
  }, []);
  
  const startScanning = async () => {
    setIsScanning(false);
    setError(null);
    
    if (!scannerRef.current) {
      setError('Scanner not initialized');
      return;
    }
    
    try {
      const cameraId = await getCameraId();
      
      const config = { 
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
      };
      
      await scannerRef.current.start(
        cameraId, 
        config, 
        handleQrCodeScan, 
        handleError
      );
      
      setIsScanning(true);
      setPermissionGranted(true);
    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Unable to access camera: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setPermissionGranted(false);
    }
  };
  
  const stopScanning = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping camera:', err);
      }
    }
  };
  
  const getCameraId = async (): Promise<string> => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length) {
        // Try to find a back camera first for better scanning
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear')
        );
        
        // If back camera found, use it, otherwise use the first camera
        return backCamera ? backCamera.id : devices[0].id;
      } else {
        throw new Error('No cameras found');
      }
    } catch (err) {
      console.error('Error getting cameras:', err);
      throw new Error('Unable to access camera: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };
  
  const handleQrCodeScan = async (decodedText: string, decodedResult: any) => {
    try {
      // Try to parse the QR code data
      let parsedData;
      try {
        parsedData = JSON.parse(decodedText);
      } catch (e) {
        // If not valid JSON, create a simple object with the text
        parsedData = { text: decodedText };
      }
      
      // Determine the QR code type based on the data structure
      const qrType = determineQrType(parsedData);
      
      // Format customer data to not expose sensitive info
      const sanitizedData = sanitizeQrData(parsedData, qrType);
      
      const timestamp = new Date().toISOString();
      
      const result: ScanResult = {
        type: qrType,
        data: sanitizedData,
        timestamp: timestamp,
        raw: decodedText
      };
      
      // Set last result
      setLastResult(result);
      
      // Show success notification
      if (qrType === 'customer_card') {
        setSuccessScan(`Successfully scanned ${sanitizedData.name || 'customer'}`);
        
        // Hide the notification after 3 seconds
        setTimeout(() => {
          setSuccessScan(null);
        }, 3000);
      }
      
      // Log the scan to the database (regardless of whether processing succeeds)
      if (qrType) {
        QrCodeService.logScan(
          qrType,
          businessId,
          sanitizedData,
          false, // Initially set to false, will update if processing succeeds
          {
            customerId: qrType === 'customer_card' ? sanitizedData.customerId : undefined,
            programId: programId || (qrType === 'loyalty_card' ? sanitizedData.programId : undefined),
            promoCodeId: qrType === 'promo_code' ? sanitizedData.code : undefined
          }
        );
      }
      
      // Notify parent component about the scan
      if (onScan) {
        onScan(result);
      }
      
      // Briefly pause scanning to prevent multiple scans of the same code
      stopScanning();
      setTimeout(() => {
        startScanning();
      }, 1000);
      
    } catch (error) {
      console.error('Error processing scan result:', error);
      setError('Failed to process scan result');
    }
  };
  
  const determineQrType = (data: any): string => {
    // Determine the type based on data structure
    if (data.type === 'customer_card' || data.customerId) {
      return 'customer_card';
    } else if (data.type === 'promo_code' || data.code) {
      return 'promo_code';
    } else if (data.type === 'loyalty_card' || data.cardId) {
      return 'loyalty_card';
    }
    return 'unknown';
  };
  
  // Function to sanitize QR code data to hide sensitive information
  const sanitizeQrData = (data: any, type: string): any => {
    if (type === 'customer_card') {
      return {
        name: data.name || 'Customer',
        // Store the ID for internal use but don't display it in UI
        customerId: data.customerId || data.id || '',
        type: 'customer_card'
      };
    }
    return data;
  };
  
  const handleError = (err: any) => {
    console.error(`QR Error: ${err}`);
  };
  
  // Toggle the scanner
  const toggleScanner = () => {
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  };

  const handleGiveReward = () => {
    if (!lastResult) return;
    
    // Show the rewards modal
    setShowRewardsModal(true);
    setSuccessScan('Showing available rewards...');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessScan(null);
    }, 3000);
  };
  
  const handleJoinProgram = () => {
    if (!lastResult) return;
    
    // Show the programs modal
    setShowProgramsModal(true);
    setSuccessScan('Showing available programs...');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessScan(null);
    }, 3000);
  };
  
  const handleRedeemCode = () => {
    if (!lastResult) return;
    
    // Show the redeem code modal
    setShowRedeemModal(true);
    setSuccessScan('Ready to redeem a promotion code...');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessScan(null);
    }, 3000);
  };

  return (
    <div className="relative">
      {successScan && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md shadow-md flex items-center">
          <Check className="h-5 w-5 mr-2 text-green-600" />
          <span>{successScan}</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="flex flex-col items-center">
        <div 
          id={scannerDivId} 
          className="w-full max-w-md h-72 bg-gray-100 rounded-lg overflow-hidden relative"
        >
          {!isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 bg-opacity-80 text-white">
              <Camera className="h-12 w-12 mb-3" />
              <p className="text-center max-w-xs mb-4">{t('Camera access is needed to scan QR codes')}</p>
              <button
                onClick={startScanning}
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded-full text-sm font-medium transition-colors"
              >
                {permissionGranted ? t('Resume Scanner') : t('Start Scanner')}
              </button>
            </div>
          )}
        </div>
        
        <div className="mt-4 w-full">
          <button
            onClick={toggleScanner}
            className={`w-full py-2 px-6 rounded-md text-white text-sm font-medium ${
              isScanning 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-blue-500 hover:bg-blue-600'
            } transition-colors`}
          >
            {isScanning ? t('Stop Scanner') : t('Start Scanner')}
          </button>
          
          <p className="text-sm text-gray-500 text-center mt-2">
            {isScanning 
              ? t('Position the QR code in the scanner window') 
              : t('Click start to activate the QR scanner')}
          </p>
        </div>
      </div>
      
      {/* Last scan result */}
      {lastResult && !error && (
        <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg animate-fadeIn">
          <p className="font-medium">QR Code Scanned:</p>
          <p className="text-sm mt-1">
            {lastResult.type === 'customer_card' 
              ? `Customer: ${lastResult.data.name || 'Customer'}` 
              : lastResult.type === 'promo_code' 
                ? `Promo code: ${lastResult.data.code}` 
                : `Data: ${JSON.stringify(lastResult.data).substring(0, 50)}...`}
          </p>
          {processingCard && (
            <p className="text-sm mt-1">Processing card...</p>
          )}
          
          {/* Action buttons */}
          {lastResult.type === 'customer_card' && (
            <div className="mt-3 space-y-2">
              <h3 className="text-sm font-medium text-blue-700 mb-2">{t('Actions')}:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={handleGiveReward}
                  className="bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-md text-sm flex items-center justify-center"
                >
                  <Award className="w-4 h-4 mr-2" />
                  {t('Give Reward')}
                </button>
                <button
                  onClick={handleJoinProgram}
                  className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-md text-sm flex items-center justify-center"
                >
                  <Users className="w-4 h-4 mr-2" />
                  {t('Join Program')}
                </button>
                <button
                  onClick={handleRedeemCode}
                  className="bg-amber-500 hover:bg-amber-600 text-white py-2 px-3 rounded-md text-sm flex items-center justify-center"
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  {t('Redeem Code')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};