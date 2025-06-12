import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { AlertCircle, Camera, Check, Award, Users, KeyRound, Scan, Zap, Shield, Target, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import QrCodeService from '../services/qrCodeService';
import { RewardModal } from './business/RewardModal';
import { ProgramEnrollmentModal } from './business/ProgramEnrollmentModal';
import { RedemptionModal } from './business/RedemptionModal';
import { TransactionConfirmation } from './TransactionConfirmation';
import { feedbackService } from '../services/feedbackService';
import { FEATURES } from '../env';
import { NotificationService } from '../services/notificationService';
import qrScanMonitor from '../utils/qrScanMonitor';

interface ScanData {
  type?: string;
  customerId?: string | number;
  id?: string | number;
  name?: string;
  code?: string;
  cardId?: string | number;
  text?: string;
  [key: string]: unknown;
}     

interface ScanResult {
  type: string;
  data: ScanData;
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
  programId 
}) => {
  const { t } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [successScan, setSuccessScan] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = 'qr-scanner-container';
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [processingCard, setProcessingCard] = useState(false);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [showProgramsModal, setShowProgramsModal] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [scanAnimation, setScanAnimation] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const animationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [domReady, setDomReady] = useState(false);
  const [showTransactionConfirmation, setShowTransactionConfirmation] = useState(false);
  const [transactionConfirmationType, setTransactionConfirmationType] = useState<'success' | 'error' | 'pending'>('success');
  const [transactionDetails, setTransactionDetails] = useState<{
    type: 'reward' | 'redemption' | 'enrollment' | 'error';
    message: string;
    details?: string;
    customerName?: string;
    businessName?: string;
    points?: number;
    amount?: number;
  } | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitResetTime, setRateLimitResetTime] = useState<number | null>(null);
  const rateLimitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const checkDomReady = () => {
      if (document.getElementById(scannerDivId)) {
        setDomReady(true);
      }
    };

    checkDomReady();

    if (!domReady) {
      const timer = setTimeout(checkDomReady, 500);
      return () => clearTimeout(timer);
    }
  }, [domReady]);

  useEffect(() => {
    return () => {
      cleanupScanner();
    };
  }, []);

  const cleanupScanner = () => {
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
      animationIntervalRef.current = null;
    }
    
    if (scannerRef.current) {
      if (isScanning) {
        try {
          scannerRef.current.stop().catch(err => {
            console.error("Error stopping scanner during cleanup:", err);
          });
        } catch (err) {
          console.error("Exception during scanner cleanup:", err);
        }
      }
      scannerRef.current = null;
    }
    
    setIsScanning(false);
  };

  const initializeScanner = async (): Promise<boolean> => {
    try {
      const scannerElement = document.getElementById(scannerDivId);
      if (!scannerElement) {
        console.error("Scanner DOM element not found");
        setError("Scanner initialization failed: Scanner element not found on page");
        return false;
      }

      cleanupScanner();

      scannerRef.current = new Html5Qrcode(scannerDivId);
      return true;
    } catch (err) {
      console.error("Failed to initialize scanner:", err);
      setError(`Scanner initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return false;
    }
  };
  
  const startScanning = async () => {
    setError(null);
    setIsInitializing(true);
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Your browser does not support camera access. Please try a different browser.');
        return;
      }
      
      const initialized = await initializeScanner();
      if (!initialized || !scannerRef.current) {
        setError('Failed to initialize scanner. Please refresh the page and try again.');
        return;
      }
      
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          setError('No cameras found. Please ensure your camera is connected and not in use by another application.');
          return;
        }
        
        const backCamera = cameras.find(camera => 
          camera.label.toLowerCase().includes('back') || 
          camera.label.toLowerCase().includes('rear')
        );
        const cameraId = backCamera ? backCamera.id : cameras[0].id;
        
        const config = { 
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        };
        
        await scannerRef.current.start(
          cameraId, 
          config, 
          handleQrCodeScan, 
          (errorMessage: string) => {
            console.log("QR Code scanning error:", errorMessage);
          }
        );
        
        setIsScanning(true);
        setPermissionGranted(true);
        
        startScanAnimation();
      } catch (cameraErr) {
        console.error("Camera access error:", cameraErr);
        
        if (cameraErr instanceof Error) {
          if (cameraErr.name === 'NotAllowedError') {
            setError('Camera access was denied. Please allow camera access in your browser settings.');
          } else if (cameraErr.name === 'NotReadableError') {
            setError('Camera is already in use by another application. Please close other applications using the camera.');
          } else if (cameraErr.name === 'NotFoundError') {
            setError('No camera found. Please connect a camera to your device.');
          } else {
            setError(`Camera error: ${cameraErr.message}`);
          }
        } else {
          setError('Failed to access camera. Please check your camera permissions.');
        }
      }
    } catch (err) {
      console.error("General scanner error:", err);
      setError(`Scanner error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsInitializing(false);
    }
  };
  
  const startScanAnimation = () => {
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current);
    }
    
    setScanAnimation(true);
    
    animationIntervalRef.current = setInterval(() => {
      setScanAnimation(prev => !prev);
    }, 3000);
  };
  
  const stopScanning = async () => {
    setIsInitializing(true);
    
    try {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
        animationIntervalRef.current = null;
      }
      
      if (scannerRef.current && isScanning) {
        await scannerRef.current.stop();
      }
    } catch (err) {
      console.error("Error stopping scanner:", err);
    } finally {
      setIsScanning(false);
      setIsInitializing(false);
    }
  };
  
  const handleQrCodeScan = async (decodedText: string, decodedResult: any) => {
    setError(null);
    setProcessingCard(true);
    setSuccessScan('Processing scan...');
    
    try {
      playSound('scan');
      
      console.log("QR code scan received:", decodedText.substring(0, 50) + "...");
      
      let data: ScanData;
      
      try {
        data = JSON.parse(decodedText);
        console.log("Successfully parsed QR data:", data);
      } catch (parseError) {
        console.error("QR Parse error:", parseError);
        // Try legacy format or simple text
        data = { text: decodedText };
        console.log("Using fallback format:", data);
        qrScanMonitor.recordFailedScan("Failed to parse QR code JSON", decodedText);
      }
      
      // Safety check - ensure we have an object
      if (!data || typeof data !== 'object') {
        console.error("Invalid QR data format, using text fallback");
        data = { text: decodedText };
        qrScanMonitor.recordFailedScan("Invalid QR data format", decodedText);
      }
      
      // Before determining the type, check for QR code format issues
      const diagnostics = qrScanMonitor.diagnoseQrCodeFormat(decodedText);
      if (!diagnostics.isValid) {
        console.warn("QR code format issues detected:", diagnostics.issues);
      }
      
      const qrType = determineQrType(data);
      console.log("Determined QR Type:", qrType, "from data:", data);
      
      if (qrType === 'unknown') {
        console.error("Unknown QR code type:", data);
        setError('Unrecognized QR code format');
        setProcessingCard(false);
        playSound('error');
        qrScanMonitor.recordFailedScan("Unknown QR code type", decodedText, data);
        return;
      }
      
      // Add more debugging info
      console.log("QR code detected:", { 
        type: qrType, 
        customerId: data.customerId, 
        businessId,
        raw: decodedText.substring(0, 100) // first 100 chars for debugging
      });
      
      const sanitizedData = sanitizeQrData(data, qrType);
      console.log("Sanitized QR data:", sanitizedData);
      
      const result: ScanResult = {
        type: qrType,
        data: sanitizedData,
        timestamp: new Date().toISOString(),
        raw: decodedText
      };
      
      setLastResult(result);
      console.log("Scan result prepared:", result);
      
      // Try to process the scan with the service
      if (qrType === 'customer_card' && businessId) {
        const ipAddress = window.location.hostname; // Simple IP proxy for rate limiting
        const response = await QrCodeService.processQrCodeScan(
          'CUSTOMER_CARD', 
          businessId, 
          sanitizedData,
          { 
            customerId: sanitizedData.customerId,
            ipAddress
          }
        );
        
        if (response.rateLimited) {
          // Handle rate limiting
          setRateLimited(true);
          // Extract reset time from message or use default 60 seconds
          const resetTimeMatch = response.message.match(/wait (\d+) seconds/);
          const waitSeconds = resetTimeMatch ? parseInt(resetTimeMatch[1]) : 60;
          const newResetTime = Date.now() + (waitSeconds * 1000);
          setRateLimitResetTime(newResetTime);
          
          // Set a timer to clear the rate limit
          if (rateLimitTimerRef.current) {
            clearInterval(rateLimitTimerRef.current);
          }
          
          rateLimitTimerRef.current = setInterval(() => {
            if (rateLimitResetTime && Date.now() >= rateLimitResetTime) {
              setRateLimited(false);
              setRateLimitResetTime(null);
              if (rateLimitTimerRef.current) {
                clearInterval(rateLimitTimerRef.current);
                rateLimitTimerRef.current = null;
              }
            }
          }, 1000);
          
          setError(response.message);
          playSound('error');
          setProcessingCard(false);
          return;
        }
        
        if (response.success) {
          setSuccessScan(`Successfully scanned ${sanitizedData.name || 'customer'} card`);
          playSound('success');
          
          // Enhanced success feedback with visual confirmation
          setTransactionConfirmationType('success');
          setTransactionDetails({
            type: 'reward',
            message: t('qrScanner.scanSuccessTitle', 'QR Code Scanned Successfully'),
            details: t('qrScanner.scanSuccessDetails', 'The QR code was successfully validated.'),
            customerName: sanitizedData.name || 'Customer',
            businessName: 'Business',
            points: response.pointsAwarded || 0
          });
          setShowTransactionConfirmation(true);
          
          // Send push notification for successful scan
          if (sanitizedData.customerId) {
            try {
              await NotificationService.sendScanNotification(
                sanitizedData.customerId.toString(),
                true,
                'Business',
                response.pointsAwarded
              );
            } catch (notificationError) {
              console.error('Error sending notification:', notificationError);
            }
          }
          
          // Show reward modal
          setShowRewardsModal(true);
          
          // At the end of successful processing
          if (qrType === 'customer_card') {
            qrScanMonitor.recordSuccessfulScan(qrType, sanitizedData);
          }
        } else {
          setError(response.message || 'Failed to process customer card');
          playSound('error');
          
          // Enhanced error feedback with visual confirmation
          setTransactionConfirmationType('error');
          setTransactionDetails({
            type: 'reward',
            message: t('qrScanner.scanFailedTitle', 'QR Code Scan Failed'),
            details: response.message || t('qrScanner.scanFailedDetails', 'There was a problem processing this QR code.'),
            customerName: sanitizedData.name || 'Customer'
          });
          setShowTransactionConfirmation(true);
          
          // Send push notification for failed scan
          if (sanitizedData.customerId) {
            try {
              await NotificationService.sendScanNotification(
                sanitizedData.customerId.toString(),
                false,
                'Business',
                0,
                { errorMessage: response.message }
              );
            } catch (notificationError) {
              console.error('Error sending notification:', notificationError);
            }
          }
        }
      }
      
      if (qrType && businessId) {
        try {
          let customerIdValue: string | number | undefined = undefined;
          if (qrType === 'customer_card' && sanitizedData.customerId) {
            if (typeof sanitizedData.customerId === 'string' || typeof sanitizedData.customerId === 'number') {
              customerIdValue = sanitizedData.customerId;
            }
          }
          
          let programIdValue: string | number | undefined = undefined;
          if (programId) {
            programIdValue = programId;
          } else if (qrType === 'loyalty_card' && sanitizedData.programId) {
            if (typeof sanitizedData.programId === 'string' || typeof sanitizedData.programId === 'number') {
              programIdValue = sanitizedData.programId as string | number;
            }
          }
          
          let promoCodeValue: string | undefined = undefined;
          if (qrType === 'promo_code' && sanitizedData.code && typeof sanitizedData.code === 'string') {
            promoCodeValue = sanitizedData.code;
          }
          
          // Add the IP address for rate limiting
          const ipAddress = window.location.hostname;
          
          await QrCodeService.logScan(
            qrType === 'customer_card' ? 'CUSTOMER_CARD' : 
            qrType === 'promo_code' ? 'PROMO_CODE' : 'LOYALTY_CARD',
            businessId,
            sanitizedData,
            false,
            {
              customerId: customerIdValue,
              programId: programIdValue,
              promoCodeId: promoCodeValue,
              ipAddress
            }
          );
        } catch (logError) {
          console.error("Error logging scan:", logError);
        }
      }
      
      if (onScan) {
        onScan(result);
      }
      
      await stopScanning();
      
      if (!FEATURES.enableAnimations) {
        setTimeout(() => {
          startScanning();
        }, 1000);
      }
    } catch (error) {
      console.error("QR scan processing error:", error);
      qrScanMonitor.recordFailedScan("Processing error", decodedText);
      setError(`Scan processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setProcessingCard(false);
      playSound('error');
    }
  };
  
  const determineQrType = (data: ScanData): string => {
    try {
      // First try to handle standardized format
      if (data.type === 'CUSTOMER_CARD' || data.type === 'customer_card') {
        return 'customer_card';
      } else if (data.type === 'PROMO_CODE' || data.type === 'promo_code') {
        return 'promo_code';
      } else if (data.type === 'LOYALTY_CARD' || data.type === 'loyalty_card') {
        return 'loyalty_card';
      }
      
      // Fallback to legacy format detection
      if (data.customerId) {
        return 'customer_card';
      } else if (data.code) {
        return 'promo_code';
      } else if (data.cardId) {
        return 'loyalty_card';
      }
      return 'unknown';
    } catch (error) {
      console.error("Error determining QR type:", error);
      return 'unknown';
    }
  };
  
  const sanitizeQrData = (data: ScanData, type: string): ScanData => {
    try {
      if (type === 'customer_card') {
        return {
          name: data.name || data.customerName || 'Customer',
          customerId: data.customerId || data.id || '',
          type: 'customer_card'
        };
      }
      return data;
    } catch (error) {
      console.error("Error sanitizing QR data:", error);
      return data;
    }
  };
  
  const toggleScanner = () => {
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  };

  const handleGiveReward = () => {
    if (!lastResult || !lastResult.data.customerId || !businessId) return;
    
    setShowRewardsModal(true);
    playSound('success');
  };
  
  const handleJoinProgram = () => {
    if (!lastResult || !lastResult.data.customerId || !businessId) return;
    
    setShowProgramsModal(true);
    playSound('success');
  };
  
  const handleRedeemCode = () => {
    if (!lastResult || !businessId) return;
    
    setShowRedeemModal(true);
    playSound('success');
  };

  const playSound = (type: 'success' | 'error' | 'scan') => {
    try {
      const sounds = {
        success: 'https://cdn.pixabay.com/download/audio/2022/03/25/audio_c8c8a73467.mp3?filename=notification-sound-7062.mp3',
        error: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0a1b3509c3.mp3?filename=notification-sound-4-126509.mp3',
        scan: 'https://cdn.pixabay.com/download/audio/2022/10/30/audio_152ef56e45.mp3?filename=scanner-beep-8-bit-retro-88520.mp3'
      };
      
      const audio = new Audio(sounds[type]);
      audio.volume = 0.5;
      audio.play().catch(err => {
        console.error("Error playing sound:", err);
      });
    } catch (error) {
      console.error("Sound playback error:", error);
    }
  };

  const handleRewardsModalClose = (success?: boolean, points?: number) => {
    setShowRewardsModal(false);
    
    if (success && FEATURES.enableAnimations && lastResult?.data.name) {
      setTransactionDetails({
        type: 'reward',
        message: t('Points Awarded!'),
        details: t('The points have been added to the customer\'s account'),
        customerName: lastResult.data.name as string,
        points: points || 0
      });
      setTransactionConfirmationType('success');
      setShowTransactionConfirmation(true);
    } else {
      startScanning();
    }
  };
  
  const handleProgramsModalClose = (success?: boolean, programName?: string) => {
    setShowProgramsModal(false);
    
    if (success && FEATURES.enableAnimations && lastResult?.data.name && programName) {
      setTransactionDetails({
        type: 'enrollment',
        message: t('Enrollment Successful!'),
        details: t('Customer has been enrolled in the program'),
        customerName: lastResult.data.name as string,
        businessName: programName
      });
      setTransactionConfirmationType('success');
      setShowTransactionConfirmation(true);
    } else {
      startScanning();
    }
  };
  
  const handleRedeemModalClose = (success?: boolean, amount?: number) => {
    setShowRedeemModal(false);
    
    if (success && FEATURES.enableAnimations && lastResult?.data.name) {
      setTransactionDetails({
        type: 'redemption',
        message: t('Redemption Successful!'),
        details: t('The reward has been redeemed'),
        customerName: lastResult.data.name as string,
        amount: amount || 0
      });
      setTransactionConfirmationType('success');
      setShowTransactionConfirmation(true);
    } else {
      startScanning();
    }
  };

  const handleTransactionConfirmationClose = () => {
    setShowTransactionConfirmation(false);
    startScanning();
  };
  
  const handleFeedbackSubmit = async (rating: number, comment: string) => {
    if (!lastResult?.data.customerId || !businessId || !transactionDetails) {
      return;
    }
    
    try {
      await feedbackService.submitFeedback({
        customerId: lastResult.data.customerId,
        businessId,
        transactionType: transactionDetails.type,
        rating,
        comment,
        timestamp: new Date().toISOString()
      });
      
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      return Promise.reject(error);
    }
  };

  // Clean up the rate limit timer on unmount
  useEffect(() => {
    return () => {
      if (rateLimitTimerRef.current) {
        clearInterval(rateLimitTimerRef.current);
        rateLimitTimerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative">
      {successScan && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-r from-green-400 to-green-600 text-white px-4 py-3 rounded-md shadow-lg flex items-center animate-slideDown">
          <Check className="h-5 w-5 mr-2 text-white" />
          <span className="font-medium">{successScan}</span>
        </div>
      )}
      
      {error && (
        <div className="bg-gradient-to-r from-red-400 to-red-600 text-white px-4 py-3 rounded-md mb-4 flex items-center animate-shake">
          <AlertCircle className="h-5 w-5 mr-2 text-white" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="flex flex-col items-center">
        <div className="relative w-full max-w-md bg-gradient-to-b from-indigo-900 to-blue-900 rounded-xl overflow-hidden shadow-2xl p-1.5">
          <div className="absolute inset-0 z-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-16 h-16 border-l-4 border-t-4 border-blue-400 rounded-tl-lg"></div>
            <div className="absolute top-0 right-0 w-16 h-16 border-r-4 border-t-4 border-blue-400 rounded-tr-lg"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 border-l-4 border-b-4 border-blue-400 rounded-bl-lg"></div>
            <div className="absolute bottom-0 right-0 w-16 h-16 border-r-4 border-b-4 border-blue-400 rounded-br-lg"></div>
          </div>
          
          <div className="w-full h-72 bg-black rounded-lg overflow-hidden relative">
            <div 
              id={scannerDivId} 
              className="w-full h-full"
            ></div>
            
            {isScanning && (
              <div className={`absolute inset-x-0 h-0.5 bg-blue-500 z-20 opacity-80 ${scanAnimation ? 'animate-scanDown' : 'animate-scanUp'}`}></div>
            )}
            
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="w-64 h-64 border-2 border-dashed border-blue-400 opacity-60 rounded-lg"></div>
            </div>
            
            {!isScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-80 text-white z-20">
                <div className="w-20 h-20 rounded-full bg-blue-900/50 flex items-center justify-center mb-4 animate-pulse">
                  <Camera className="h-10 w-10 text-blue-400" />
                </div>
                <p className="text-center max-w-xs mb-4 text-blue-100">{t('Camera access is needed to scan QR codes')}</p>
                <button
                  onClick={startScanning}
                  disabled={isInitializing || !domReady}
                  className={`bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 px-8 rounded-full text-sm font-medium transition-all shadow-md hover:shadow-lg transform hover:scale-105 ${(isInitializing || !domReady) ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {isInitializing ? (
                    <span className="flex items-center">
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                      {t('Initializing...')}
                    </span>
                  ) : (
                    permissionGranted ? t('Resume Scanner') : t('Start Scanner')
                  )}
                </button>
              </div>
            )}
            
            {isScanning && (
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center z-20">
                <div className="flex items-center bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></div>
                  <span>{t('Scanner active')}</span>
                </div>
                <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center">
                  <Target className="w-3 h-3 mr-1" />
                  <span>{t('Center QR code')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-4 w-full">
          <button
            onClick={toggleScanner}
            disabled={isInitializing || !domReady}
            className={`w-full py-3 px-6 rounded-lg text-white text-sm font-medium flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-lg ${
              isInitializing || !domReady
                ? 'bg-gray-400 cursor-not-allowed' 
                : isScanning 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
            }`}
          >
            {isInitializing ? (
              <span className="flex items-center">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                {t('Initializing...')}
              </span>
            ) : isScanning ? (
              <>
                <Shield className="w-4 h-4 mr-2" />
                {t('Stop Scanner')}
              </>
            ) : (
              <>
                <Scan className="w-4 h-4 mr-2" />
                {t('Start Scanner')}
              </>
            )}
          </button>
          
          <p className="text-sm text-gray-500 text-center mt-2 flex items-center justify-center">
            {isScanning ? (
              <>
                <Target className="w-4 h-4 mr-1 text-blue-500" />
                {t('Position the QR code in the scanner window')}
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-1 text-amber-500" />
                {t('Click start to activate the QR scanner')}
              </>
            )}
          </p>
        </div>
      </div>
      
      {lastResult && !error && (
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-800 px-5 py-4 rounded-xl animate-fadeIn shadow-md">
          <p className="font-medium flex items-center">
            <Check className="w-5 h-5 mr-2 text-green-500" />
            {t('QR Code Scanned')}:
          </p>
          <p className="text-sm mt-2 bg-white/60 backdrop-blur-sm p-2 rounded-md">
            {lastResult.type === 'customer_card' 
              ? `Customer: ${lastResult.data.name || 'Customer'}` 
              : lastResult.type === 'promo_code' 
                ? `Promo code: ${lastResult.data.code}` 
                : `Data: ${JSON.stringify(lastResult.data).substring(0, 50)}...`}
          </p>
          {processingCard && (
            <p className="text-sm mt-1 flex items-center">
              <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></span>
              Processing card...
            </p>
          )}
          
          {lastResult.type === 'customer_card' && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-indigo-700 mb-3 flex items-center">
                <Zap className="w-4 h-4 mr-1 text-amber-500" />
                {t('Quick Actions')}:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={handleGiveReward}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-2.5 px-3 rounded-lg text-sm flex items-center justify-center shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02]"
                >
                  <Award className="w-4 h-4 mr-2" />
                  {t('Give Reward')}
                </button>
                <button
                  onClick={handleJoinProgram}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-2.5 px-3 rounded-lg text-sm flex items-center justify-center shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02]"
                >
                  <Users className="w-4 h-4 mr-2" />
                  {t('Join Program')}
                </button>
                <button
                  onClick={handleRedeemCode}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white py-2.5 px-3 rounded-lg text-sm flex items-center justify-center shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02]"
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  {t('Redeem Code')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {lastResult && lastResult.data.customerId && businessId && (
        <>
          <RewardModal
            isOpen={showRewardsModal}
            onClose={handleRewardsModalClose}
            customerId={String(lastResult.data.customerId)}
            businessId={String(businessId)}
            customerName={lastResult.data.name as string || 'Customer'}
          />
          
          <ProgramEnrollmentModal
            isOpen={showProgramsModal}
            onClose={handleProgramsModalClose}
            customerId={String(lastResult.data.customerId)}
            businessId={String(businessId)}
            customerName={lastResult.data.name as string || 'Customer'}
          />
          
          <RedemptionModal
            isOpen={showRedeemModal}
            onClose={handleRedeemModalClose}
            customerId={String(lastResult.data.customerId)}
            businessId={String(businessId)}
            customerName={lastResult.data.name as string || 'Customer'}
          />
        </>
      )}
      
      {showTransactionConfirmation && transactionDetails && FEATURES.enableAnimations && (
        <TransactionConfirmation
          type={transactionConfirmationType}
          transactionType={transactionDetails.type}
          message={transactionDetails.message}
          details={transactionDetails.details}
          customerName={transactionDetails.customerName}
          businessName={transactionDetails.businessName}
          points={transactionDetails.points}
          amount={transactionDetails.amount}
          onClose={handleTransactionConfirmationClose}
          onFeedback={FEATURES.enableFeedback ? handleFeedbackSubmit : undefined}
        />
      )}
      
      {rateLimited && rateLimitResetTime && (
        <div className="mt-2 p-2 bg-yellow-100 border border-yellow-400 rounded flex items-center text-yellow-800">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <span className="text-sm">
            Rate limit reached. Please wait {Math.ceil((rateLimitResetTime - Date.now()) / 1000)} seconds.
          </span>
        </div>
      )}
    </div>
  );
};