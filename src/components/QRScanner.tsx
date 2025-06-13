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
import { safeValidateQrCode } from '../utils/qrCodeValidator';

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
  programId,
  pointsToAward = 10
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
  const lastScanRef = useRef<string>(''); // Store the last scanned text to prevent duplicates

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
  
  const handleQrCodeScan = async (decodedText: string) => {
    try {
      // Prevent scanning the same QR code multiple times in quick succession
      if (
        lastScanRef.current === decodedText &&
        Date.now() - lastScanTime.current < 2000
      ) {
        console.log('Preventing duplicate scan', decodedText);
        return;
      }
      
      lastScanRef.current = decodedText;
      lastScanTime.current = Date.now();
      
      // Try to parse the QR code data
      let qrCodeData;
      try {
        qrCodeData = JSON.parse(decodedText);
        console.log('Successfully parsed QR code data:', qrCodeData);
      } catch (parseError) {
        console.error('Failed to parse QR code data:', parseError);
        playErrorSound();
        setError('Invalid QR code format');
        return;
      }
      
      // Basic validation of QR code data
      if (!qrCodeData || !qrCodeData.type) {
        console.error('Invalid QR code data: missing type');
        playErrorSound();
        setError('Invalid QR code: missing required data');
        return;
      }
      
      // Process based on QR code type
      switch (qrCodeData.type) {
        case 'CUSTOMER_CARD':
          handleCustomerQrCode(qrCodeData);
          break;
          
        case 'LOYALTY_CARD':
          handleLoyaltyCardQrCode(qrCodeData);
          break;
          
        case 'PROMO_CODE':
          handlePromoCodeQrCode(qrCodeData);
          break;
          
        default:
          console.error('Unknown QR code type:', qrCodeData.type);
          playErrorSound();
          setError(`Unknown QR code type: ${qrCodeData.type}`);
      }
    } catch (error) {
      console.error('Error processing QR code scan:', error);
      playErrorSound();
      setError('Failed to process QR code');
    }
  };
  
  /**
   * Handle a customer QR code scan
   */
  const handleCustomerQrCode = async (qrCodeData: any) => {
    try {
      // Validate required fields
      if (!qrCodeData.customerId) {
        playErrorSound();
        setError('Invalid customer QR code: missing customer ID');
        return;
      }
      
      // Additional validation for card-based QR codes
      if (qrCodeData.cardNumber) {
        console.log('Processing card-based QR code:', qrCodeData.cardNumber);
      }
      
      // Show scanning animation
      setIsScanning(true);
      
      // Process the QR code scan
      const result = await QrCodeService.processQrCodeScan(
        'CUSTOMER_CARD',
        businessId,
        qrCodeData,
        {
          customerId: qrCodeData.customerId,
          programId: programId,
          pointsToAward: pointsToAward
        }
      );
      
      // Handle the scan result
      if (result.success) {
        // Success - play sound and show success UI
        console.log('QR code scan successful:', result);
        playSuccessSound();
        
        // Get the customer details for display
        try {
          const customerDetails = await QrCodeService.getUserById(qrCodeData.customerId);
          
          // Set scan result details for UI
          setLastResult({
            type: 'customer_card',
            data: {
              name: customerDetails?.name || qrCodeData.customerName || 'Customer',
              customerId: qrCodeData.customerId,
              type: 'customer_card'
            },
            timestamp: new Date().toISOString(),
            raw: decodedText
          });
          
          // Show appropriate modal based on the scan result
          if (result.newEnrollment) {
            setShowProgramsModal(true);
          } else if (result.redemptionAvailable) {
            setShowRedeemModal(true);
          } else {
            setShowRewardsModal(true);
          }
        } catch (customerError) {
          console.error('Error getting customer details:', customerError);
          
          // Set limited scan result without customer details
          setLastResult({
            type: 'customer_card',
            data: {
              name: qrCodeData.customerName || 'Customer',
              customerId: qrCodeData.customerId,
              type: 'customer_card'
            },
            timestamp: new Date().toISOString(),
            raw: decodedText
          });
          
          setShowRewardsModal(true);
        }
      } else {
        // Error - play error sound and show error message
        console.error('QR code scan failed:', result.error || result.message);
        playErrorSound();
        setError(result.message || 'Failed to process scan');
        
        // If rate limited, show specific message
        if (result.rateLimited) {
          setError('This code was recently scanned. Please try again later.');
        }
      }
    } catch (error) {
      console.error('Error handling customer QR code:', error);
      playErrorSound();
      setError('Failed to process customer QR code');
    } finally {
      setIsScanning(false);
    }
  };
  
  /**
   * Handle a loyalty card QR code scan
   */
  const handleLoyaltyCardQrCode = async (qrCodeData: any) => {
    try {
      // Validate required fields
      if (!qrCodeData.cardId || !qrCodeData.customerId) {
        playErrorSound();
        setError('Invalid loyalty card QR code: missing required data');
        return;
      }
      
      // Show scanning animation
      setIsScanning(true);
      
      // Process the QR code scan for a specific loyalty card
      const result = await QrCodeService.processQrCodeScan(
        'LOYALTY_CARD',
        businessId,
        qrCodeData,
        {
          customerId: qrCodeData.customerId,
          programId: qrCodeData.programId || programId,
          pointsToAward: pointsToAward
        }
      );
      
      // Handle the scan result
      if (result.success) {
        // Success - play sound and show success UI
        console.log('Loyalty card scan successful:', result);
        playSuccessSound();
        
        // Set scan result details for UI
        setLastResult({
          type: 'loyalty_card',
          data: {
            customerId: qrCodeData.customerId,
            cardId: qrCodeData.cardId,
            cardNumber: qrCodeData.cardNumber,
            type: 'loyalty_card'
          },
          timestamp: new Date().toISOString(),
          raw: decodedText
        });
        
        setShowRewardsModal(true);
      } else {
        // Error - play error sound and show error message
        console.error('Loyalty card scan failed:', result.error || result.message);
        playErrorSound();
        setError(result.message || 'Failed to process loyalty card');
      }
    } catch (error) {
      console.error('Error handling loyalty card QR code:', error);
      playErrorSound();
      setError('Failed to process loyalty card QR code');
    } finally {
      setIsScanning(false);
    }
  };
  
  /**
   * Handle a promo code QR code scan
   */
  const handlePromoCodeQrCode = async (qrCodeData: any) => {
    try {
      // Validate required fields
      if (!qrCodeData.promoCode) {
        playErrorSound();
        setError('Invalid promo code QR code: missing promo code');
        return;
      }
      
      // Show scanning animation
      setIsScanning(true);
      
      // Process the QR code scan
      const result = await QrCodeService.processQrCodeScan(
        'PROMO_CODE',
        businessId,
        qrCodeData,
        {
          promoCodeId: qrCodeData.promoCode
        }
      );
      
      // Handle the scan result
      if (result.success) {
        // Success - play sound and show success UI
        console.log('Promo code scan successful:', result);
        playSuccessSound();
        
        // Set scan result details for UI
        setLastResult({
          type: 'promo_code',
          data: {
            promoCode: qrCodeData.promoCode,
            type: 'promo_code'
          },
          timestamp: new Date().toISOString(),
          raw: decodedText
        });
        
        setShowTransactionConfirmation(true);
      } else {
        // Error - play error sound and show error message
        console.error('Promo code scan failed:', result.error || result.message);
        playErrorSound();
        setError(result.message || 'Invalid promotion code');
      }
    } catch (error) {
      console.error('Error handling promo code QR code:', error);
      playErrorSound();
      setError('Failed to process promotion code');
    } finally {
      setIsScanning(false);
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