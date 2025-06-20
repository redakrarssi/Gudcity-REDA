import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';
import { AlertCircle, Camera, Check, Award, Users, KeyRound, Scan, Zap, Shield, Target, AlertTriangle, User, Smartphone, Settings, History, SwitchCamera, RefreshCw, X, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { QrCodeService } from '../services/qrCodeService';
import { RewardModal } from './business/RewardModal';
import { ProgramEnrollmentModal } from './business/ProgramEnrollmentModal';
import { RedemptionModal } from './business/RedemptionModal';
import { TransactionConfirmation } from './TransactionConfirmation';
import { CustomerDetailsModal } from './business/CustomerDetailsModal';
import { feedbackService } from '../services/feedbackService';
import { FEATURES } from '../env';
import { NotificationService } from '../services/notificationService';
import qrScanMonitor from '../utils/qrScanMonitor';
import { 
  safeValidateQrCode, 
  isStandardQrCodeData, 
  safeValidateWithFallback,
  createFallbackCustomerQrCode
} from '../utils/qrCodeValidator';
import { validateQrCodeData, isQrCodeData, isCustomerQrCodeData, isLoyaltyCardQrCodeData, isPromoCodeQrCodeData, monitorTypeViolation } from '../utils/runtimeTypeValidator';
import type { NotificationType } from '../types/notification';
import {
  QrCodeType,
  QrCodeData,
  CustomerQrCodeData,
  LoyaltyCardQrCodeData,
  PromoCodeQrCodeData,
  UnknownQrCodeData,
  UnifiedScanResult
} from '../types/qrCode';
import { 
  isCameraSupported, 
  isQrScanningSupported, 
  checkCameraAvailability, 
  getBrowserInfo,
  isBrowserSupportedForQrScanning
} from '../utils/browserSupport';

// Define our own version of StandardQrCodeData to avoid import issues
interface StandardQrCodeData {
  type?: string;
  qrUniqueId?: string;
  timestamp?: number;
  version?: string;
  customerId?: string | number;
  customerName?: string;
  businessId?: string | number;
  programId?: string | number;
  cardId?: string | number;
  promoCode?: string;
  cardNumber?: string;
  cardType?: string;
  signature?: string;
  [key: string]: unknown;
}

/**
 * Extended interface for the QR scan monitor utility
 */
interface ExtendedQrScanMonitor {
  recordSuccessfulScan: (qrType: string, data: Record<string, unknown>) => void;
  recordFailedScan: (error: string, rawData?: string, parsedData?: Record<string, unknown>) => void;
  getScanStatistics: () => { 
    totalScans: number;
    successfulScans: number;
    failedScans: number;
    scanSuccessRate: number;
    recentSuccessfulScans: Record<string, unknown>[];
    recentFailedScans: Record<string, unknown>[];
  };
  resetScanStatistics: () => void;
  diagnoseQrCodeFormat: (rawData: string) => { valid: boolean; issues: string[] };
  trackScan: () => void;
  isRateLimited: () => boolean;
  getResetTime: () => number;
}

// Cast the imported qrScanMonitor to the extended interface
const extendedQrScanMonitor = qrScanMonitor as ExtendedQrScanMonitor;

// Add debug flag for development mode
const DEBUG_ENABLED = process.env.NODE_ENV === 'development';

/**
 * Debug logging function - optimized to completely avoid function calls in production
 */
const debugLog = DEBUG_ENABLED 
  ? (...args: unknown[]): void => { console.log('[QRScanner Debug]', ...args); }
  : (..._args: unknown[]): void => { /* No-op in production */ };

/**
 * @deprecated Use QrCodeData from '../types/qrCode' instead
 */
export type ScanData = CustomerQrCodeData | LoyaltyCardQrCodeData | PromoCodeQrCodeData | UnknownQrCodeData;

/**
 * Customer data interface with required fields
 */
interface CustomerData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  tier?: string;
  points?: number; 
  loyaltyPoints?: number;
  visits?: number;
  totalSpent?: number;
  joinedAt?: string;
}

/**
 * @deprecated Use UnifiedScanResult from '../types/qrCode' instead
 */
export interface ScanResult {
  type: QrCodeType;
  data: ScanData;
  timestamp: string;
  raw: string;
}     

/**
 * Props for QRScanner component
 */
interface QRScannerProps {
  onScan?: (result: UnifiedScanResult) => void;
  businessId?: number | string;
  programId?: number | string;
  pointsToAward?: number;
}

/**
 * Transaction details interface
 */
interface TransactionDetails {
  type: 'reward' | 'redemption' | 'enrollment';
  message: string;
  details?: string;
  customerName?: string;
  businessName?: string;
  points?: number;
  amount?: number;
}

/**
 * Interface for scan history items
 */
interface ScanHistoryItem {
  id: string;
  type: QrCodeType;
  data: {
    customerId?: string;
    customerName?: string;
    code?: string;
    cardId?: string;
    programId?: string;
    type: QrCodeType;
    text?: string;
  };
  timestamp: string;
  success: boolean;
}

/**
 * Scanner configuration interface
 */
interface ScannerConfig {
  fps: number;
  qrboxSize: number;
  disableFlip: boolean;
  aspectRatio: number;
  focusMode: 'continuous' | 'single' | 'auto';
}

/**
 * Html5Qrcode configuration interface
 */
interface Html5QrcodeConfig {
  fps: number;
  qrbox: {
    width: number;
    height: number;
  };
  aspectRatio: number;
  disableFlip: boolean;
  experimentalFeatures: {
    useBarCodeDetectorIfSupported: boolean;
  };
}

/**
 * Result interface for QR code scanning
 */
interface Html5QrcodeResult {
  decodedText: string;
  result: {
    text: string;
    format: string;
  };
}

/**
 * Processing result interface
 */
interface ProcessingResult {
  success: boolean;
  error?: string;
  message?: string;
  customerId?: string;
  programId?: string;
  pointsAwarded?: number;
}

/**
 * Ensures an ID is always a string
 * @param id - The ID to convert to string
 * @returns The ID as a string, or '0' if undefined/null
 */
const ensureId = (id: string | number | undefined): string => {
  if (id === undefined) {
    return '0';
  }
  return String(id);
};

/**
 * Creates a scan result object
 * @param type - The QR code type
 * @param data - The QR code data
 * @param rawText - The raw text from the QR code
 * @returns A UnifiedScanResult object
 */
const createScanResult = (type: QrCodeType, data: QrCodeData, rawText: string): UnifiedScanResult => {
  return {
    type,
    data,
    timestamp: new Date().toISOString(),
    raw: rawText,
    success: true
  };
};

/**
 * Map StandardQrCodeData type to our internal QrCodeType
 */
const mapStandardQrCodeType = (type: string | undefined): QrCodeType => {
  if (!type) return 'unknown';
  
  const normalized = type.toUpperCase();

  switch (normalized) {
    case 'CUSTOMER_CARD':
    case 'CUSTOMER':
      return 'customer';
    case 'LOYALTY_CARD':
    case 'LOYALTY':
      return 'loyaltyCard';
    case 'PROMO_CODE':
    case 'PROMO':
      return 'promoCode';
    default:
      return 'unknown';
  }
};

/**
 * Convert StandardQrCodeData to our ScanData type
 */
const convertToScanData = (data: StandardQrCodeData | null | undefined): ScanData => {
  if (!data) {
    return { type: 'unknown', rawData: '', text: '' } as UnknownQrCodeData;
  }

  // Map the standard type to our internal type
  const mappedType = mapStandardQrCodeType(data.type);
  
  switch (mappedType) {
    case 'customer':
      return {
        type: 'customer',
        customerId: data.customerId || '0',
        businessId: data.businessId || '0',
        name: data.customerName,
        customerName: data.customerName,
        text: JSON.stringify(data)
      } as CustomerQrCodeData;
      
    case 'loyaltyCard':
      return {
        type: 'loyaltyCard',
        cardId: data.cardId || '0',
        customerId: data.customerId || '0',
        programId: data.programId || '0',
        businessId: '0',
        text: JSON.stringify(data)
      } as LoyaltyCardQrCodeData;
      
    case 'promoCode':
      return {
        type: 'promoCode',
        code: data.promoCode || '',
        businessId: '0',
        text: JSON.stringify(data)
      } as PromoCodeQrCodeData;
      
    default:
      return {
        type: 'unknown',
        rawData: JSON.stringify(data),
        text: JSON.stringify(data)
      } as UnknownQrCodeData;
  }
};

/**
 * Parse QR code data with runtime type validation
 * @param text - The raw text from the QR code
 * @returns The parsed QR code data or null if invalid
 */
const parseQrCodeData = (text: string): QrCodeData | null => {
  try {
    // First try to parse as JSON
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(text);
    } catch (e) {
      debugLog('Failed to parse QR code as JSON', e);
      extendedQrScanMonitor.recordFailedScan('Invalid JSON format', text);
      return null;
    }

    // Try the enhanced fallback validation first - more lenient with customer QR codes
    const fallbackValidatedData = safeValidateWithFallback(parsedData);
    if (fallbackValidatedData) {
      extendedQrScanMonitor.recordSuccessfulScan(
        fallbackValidatedData.type, 
        fallbackValidatedData as unknown as Record<string, unknown>
      );
      debugLog('Validated with fallback mechanism', fallbackValidatedData);
      return fallbackValidatedData;
    }

    // Validate using runtime type validator (gracefully handle errors)
    let validatedData: QrCodeData | null = null;
    try {
      validatedData = validateQrCodeData(parsedData);
    } catch (validationError) {
      // Ignore and fallback to legacy validation below
      validatedData = null;
    }

    if (validatedData) {
      // Normalise legacy field names for customer data
      if (
        validatedData.type === 'customer' &&
        !(validatedData as any).customerId &&
        (validatedData as any).id
      ) {
        (validatedData as any).customerId = (validatedData as any).id;
      }

      // Record successful scan with monitoring
      extendedQrScanMonitor.recordSuccessfulScan(validatedData.type, validatedData as unknown as Record<string, unknown>);
      return validatedData;
    }
    
    // Last attempt: try fallback for customer QR code with more relaxed rules
    if (typeof parsedData === 'object' && parsedData !== null && 
        ('type' in parsedData || 'customerId' in parsedData || 'id' in parsedData)) {
      
      // Check if it has any indication of being a customer QR code
      const typeValue = (parsedData as any).type;
      if (typeof typeValue === 'string' && typeValue.toLowerCase().includes('customer')) {
        const customerData = createFallbackCustomerQrCode(parsedData);
        if (customerData) {
          debugLog('Created customer QR code from malformed data', customerData);
          extendedQrScanMonitor.recordSuccessfulScan('customer', customerData as unknown as Record<string, unknown>);
          return customerData;
        }
      }
    }
    
    // If not validated through our new system, try legacy validation
    if (isStandardQrCodeData(parsedData)) {
      const standardData = parsedData as StandardQrCodeData;
      const qrType = mapStandardQrCodeType(standardData.type);
      
      // Convert to our internal format
      const convertedData = convertToScanData(standardData);
      
      // Monitor the type conversion for analytics
      monitorTypeViolation('Legacy QR Format Conversion', true, standardData, qrType);
      
      return convertedData;
    }
    
    // Record failed scan
    extendedQrScanMonitor.recordFailedScan('Invalid QR code format', text, parsedData as Record<string, unknown>);
    return null;
  } catch (error) {
    console.error('Error parsing QR code data:', error);
    extendedQrScanMonitor.recordFailedScan(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, text);
    return null;
  }
};

// Add default scanner configuration constant before component
const defaultScannerConfig: ScannerConfig = {
  fps: 10,
  qrboxSize: 240,
  disableFlip: false,
  aspectRatio: 1.0,
  focusMode: 'continuous'
};

/**
 * QRScanner Component
 * 
 * A versatile QR code scanner component that supports multiple QR code types
 * and provides comprehensive error handling and UI feedback.
 * 
 * Features:
 * - Scans and processes customer, loyalty card, and promo code QR codes
 * - Provides visual feedback during scanning
 * - Handles camera permissions
 * - Supports multiple cameras
 * - Debounces scans to prevent duplicates
 * - Maintains scan history
 * - Provides configurable scanner settings
 * 
 * @example Basic usage:
 * ```tsx
 * <QRScanner 
 *   businessId="123"
 *   onScan={(result) => console.log('Scanned:', result)}
 * />
 * ```
 * 
 * @example With program ID and custom points:
 * ```tsx
 * <QRScanner 
 *   businessId="123"
 *   programId="456"
 *   pointsToAward={15}
 *   onScan={(result) => console.log('Scanned:', result)}
 * />
 * ```
 */
export const QRScanner: React.FC<QRScannerProps> = ({ 
  onScan, 
  businessId,
  programId,
  pointsToAward = 10
}) => {
  // State for the QR scanner
  const [html5QrCode, setHtml5QrCode] = useState<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [successScan, setSuccessScan] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [lastResult, setLastResult] = useState<UnifiedScanResult | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [showScanHistory, setShowScanHistory] = useState(false);
  const [showCameraSelector, setShowCameraSelector] = useState(false);
  const [showScannerConfig, setShowScannerConfig] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successNotificationMessage, setSuccessNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error' | 'info'>('success');
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [showProgramsModal, setShowProgramsModal] = useState(false);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [showCustomerDetailsModal, setShowCustomerDetailsModal] = useState(false);
  const [showTransactionConfirmation, setShowTransactionConfirmation] = useState(false);
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);
  const [transactionConfirmationType, setTransactionConfirmationType] = useState<'success' | 'error' | 'info'>('success');
  
  // Refs
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = 'qr-scanner-container';
  const scanTimeoutRef = useRef<number | null>(null);
  
  // i18n
  const { t } = useTranslation();

  useEffect(() => {
    const checkDomReady = () => {
      if (document.getElementById('qr-scanner-container')) {
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
      // Add a small delay to ensure DOM is fully loaded
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const scannerElement = document.getElementById('qr-scanner-container');
      if (!scannerElement) {
        console.error("Scanner DOM element not found");
        setError("Scanner initialization failed: Scanner element not found on page");
        return false;
      }

      // Clean up any existing scanner instance
      if (scannerRef.current) {
        try {
          if (isScanning) {
            await scannerRef.current.stop().catch(e => {
              console.warn("Error stopping existing scanner:", e);
            });
          }
          scannerRef.current = null;
        } catch (stopError) {
          console.warn("Error stopping existing scanner:", stopError);
        }
      }

      // Make sure the scanner element is empty
      scannerElement.innerHTML = '';
      
      // Verify HTML5Qrcode is available
      if (typeof Html5Qrcode !== 'function') {
        console.error("HTML5QrCode library not found");
        setError("Scanner initialization failed: Required library not available");
        return false;
      }

      // Create a fresh scanner instance with verbose error handling
      try {
        console.log("Creating new scanner instance");
        
        // Use a try/catch with timeout to prevent infinite errors
        const createScannerWithTimeout = () => {
          return new Promise<Html5Qrcode | null>((resolve, reject) => {
            // Set timeout to prevent hanging
            const timeoutId = setTimeout(() => {
              reject(new Error("Scanner initialization timed out"));
            }, 5000);
            
            try {
              const scanner = new Html5Qrcode(scannerDivId);
              clearTimeout(timeoutId);
              resolve(scanner);
            } catch (err) {
              clearTimeout(timeoutId);
              reject(err);
            }
          });
        };
        
        scannerRef.current = await createScannerWithTimeout();
        
        // Verify the scanner was initialized
        if (!scannerRef.current) {
          throw new Error("Failed to create scanner instance");
        }
        
        return true;
      } catch (initError) {
        console.error("Error creating HTML5QrCode instance:", initError);
        // Try with a small delay and different approach if first attempt fails
        try {
          await new Promise(resolve => setTimeout(resolve, 800));
          console.log("Retrying scanner initialization with delay");
          
          // Try a different approach on retry
          const scannerDiv = document.getElementById(scannerDivId);
          if (scannerDiv) {
            // Make sure it's empty
            scannerDiv.innerHTML = '';
            // Try to create with a more defensive approach
            scannerRef.current = new Html5Qrcode(scannerDivId, { verbose: false });
            return !!scannerRef.current;
          }
          return false;
        } catch (retryError) {
          console.error("Retry failed:", retryError);
          setError("Camera initialization failed. Please try refreshing the page.");
          return false;
        }
      }
    } catch (err) {
      console.error("Failed to initialize scanner:", err);
      setError(`Scanner initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      return false;
    }
  };
  
  // Add this workaround function to detect issues with camera access in specific browsers
  const forceCameraRefresh = async (): Promise<boolean> => {
    try {
      // Some browsers (especially Chrome) need a camera access test before the scanner will work properly
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      // Keep the stream active for a moment to fully initialize
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Then release all tracks
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error("Force camera refresh failed:", err);
      return false;
    }
  };

  // Update the startScanning function to include this workaround
  const startScanning = async () => {
    if (isScanning || isInitializing) {
      return;
    }
    
    setIsInitializing(true);
    setError(null);
    
    try {
      // Add extra debug logging
      console.log("Starting scanner initialization process");
      
      // Force camera refresh to help with initialization in Chrome
      await forceCameraRefresh();
      
      // Check browser compatibility first
      if (!isCameraSupported()) {
        setError('Your browser does not support camera access. Please use a modern browser like Chrome, Firefox, or Safari.');
        setIsInitializing(false);
        return;
      }
      
      // Ensure DOM is ready before proceeding
      if (!document.getElementById('qr-scanner-container')) {
        console.error("Scanner DOM element not ready");
        setError("Scanner element not ready. Please refresh the page.");
        setIsInitializing(false);
        return;
      }
      
      // Add a small delay before checking camera access to ensure browser is ready
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check camera status with fallback for permission issues
      try {
        const cameraStatus = await checkCameraAvailability();
        if (!cameraStatus.available) {
          setError(cameraStatus.errorMessage || 'Camera not available');
          setPermissionGranted(cameraStatus.permissionGranted);
          setIsInitializing(false);
          return;
        }
        
        // Update permission status
        setPermissionGranted(cameraStatus.permissionGranted);
      } catch (permissionError) {
        // Fallback if permission check fails
        console.error("Permission check error:", permissionError);
        // Try direct camera access as a fallback
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
          });
          stream.getTracks().forEach(track => track.stop()); // Release camera
          setPermissionGranted(true);
        } catch (directPermissionError) {
          console.error("Direct camera access failed:", directPermissionError);
          setError('Camera access denied or not available. Please check your camera permissions.');
          setPermissionGranted(false);
          setIsInitializing(false);
          return;
        }
      }
      
      // Initialize scanner if not already initialized
      if (!scannerRef.current) {
        console.log("Initializing scanner...");
        const success = await initializeScanner();
        if (!success) {
          setError('Failed to initialize QR scanner. Please refresh the page and try again.');
          setIsInitializing(false);
          return;
        }
      }
      
      // Make sure the scanner element exists in the DOM
      const scannerElement = document.getElementById('qr-scanner-container');
      if (!scannerElement) {
        console.error("Scanner DOM element not found during start");
        setError('Scanner element not found. Please refresh the page.');
        setIsInitializing(false);
        return;
      }
      
      // Start QR scanning
      if (scannerRef.current) {
        // Configure camera with optimal settings for speed and reliability
        const config = {
          fps: scannerConfig.fps,
          qrbox: {
            width: scannerConfig.qrboxSize,
            height: scannerConfig.qrboxSize
          },
          aspectRatio: scannerConfig.aspectRatio,
          disableFlip: scannerConfig.disableFlip,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true // Use native API if available
          }
        };
        
        // Use selected camera if available
        let cameraId = selectedCamera;
        
        // If no camera is selected yet, try to use the back camera or fall back to default
        if (!cameraId && availableCameras.length > 0) {
          // Try to find a back camera
          const backCamera = availableCameras.find(camera => 
            camera.label.toLowerCase().includes('back') || 
            camera.label.toLowerCase().includes('rear')
          );
          
          if (backCamera) {
            cameraId = backCamera.id;
            setSelectedCamera(backCamera.id);
          } else {
            // Fall back to the first camera
            cameraId = availableCameras[0].id;
            setSelectedCamera(availableCameras[0].id);
          }
        }
        
        // If still no camera available, use environment-facing camera
        if (!cameraId) {
          cameraId = 'environment';
        }
        
        // Debug log for camera
        console.log(`Starting scanner with camera:`, cameraId, {
          availableCameras: availableCameras.length,
          config
        });
        
        try {
          // Start scanner with optimized configuration
          await scannerRef.current.start(
            cameraId,
            config,
            handleQrCodeScanDebounced,
            () => {} // Ignore on-going scanning
          );
          
          setIsScanning(true);
          startScanAnimation();
          setError(null);
        } catch (startError) {
          // Handle start error specifically
          console.error('Error starting scanner:', startError);
          
          // Try with different camera configuration if possible
          try {
            console.log('Retrying with environment facing camera');
            // Try with a more generic configuration
            await scannerRef.current.start(
              'environment',
              {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
              },
              handleQrCodeScanDebounced,
              () => {}
            );
            
            setIsScanning(true);
            startScanAnimation();
            setError(null);
            return;
          } catch (retryError) {
            console.error('Retry with environment camera failed:', retryError);
            
            // Last attempt with any available camera
            if (availableCameras.length > 0) {
              try {
                console.log('Final retry with first available camera');
                await scannerRef.current.start(
                  availableCameras[0].id,
                  { fps: 10, qrbox: 250 },
                  handleQrCodeScanDebounced,
                  () => {}
                );
                
                setIsScanning(true);
                startScanAnimation();
                setError(null);
                return;
              } catch (finalError) {
                console.error('Final retry failed:', finalError);
              }
            }
          }
          
          // If we get here, all attempts failed
          const errorMsg = startError instanceof Error ? startError.message : "Unknown error";
          throw new Error("Failed to start camera: " + errorMsg);
        }
      }
    } catch (err) {
      console.error('Error starting QR scanner:', err);
      
      // Get a more helpful error message
      let errorMessage = 'Failed to start scanner';
      
      if (err instanceof Error) {
        if (err.message.includes('Camera access is denied')) {
          errorMessage = 'Camera access denied. Please allow camera access in your browser settings.';
        } else if (err.message.includes('requested device not found')) {
          errorMessage = 'No camera found. Please make sure your device has a camera.';
        } else if (err.message.includes('Permission denied')) {
          errorMessage = 'Camera permission denied. Please allow camera access and refresh the page.';
        } else if (err.message.includes('NotFoundError')) {
          errorMessage = 'Camera not found or not accessible.';
        } else if (err.message.includes('NotAllowedError')) {
          errorMessage = 'Camera access denied by browser.';
        } else if (err.message.includes('NotReadableError')) {
          errorMessage = 'Camera is in use by another application.';
        } else {
          errorMessage = `Scanner error: ${err.message}`;
        }
      }
      
      setError(errorMessage);
      setIsScanning(false);
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
  
  // Add more comprehensive logging
  const logScanProcess = (stage: string, data?: any) => {
    debugLog(`[Scan Process] ${stage}`, data || '');
  };

  // Optimized, debounced QR code handler with better performance
  const handleQrCodeScanDebounced = (decodedText: string, result: Html5QrcodeResult) => {
    const now = Date.now();
    
    // Skip processing if this exact code was scanned in the last 100ms (duplicate detection)
    if (decodedText === lastScannedCodeRef.current && (now - lastScanTimeRef.current < 100)) {
      return;
    }
    
    // Store current code for duplicate detection
    lastScannedCodeRef.current = decodedText;
    
    // If we're already processing a card or if the scan is too soon after the last one
    if (processingCard || (now - lastScanTimeRef.current < SCAN_DEBOUNCE_MS)) {
      // Add to queue if it's not already being processed
      if (!scanQueueRef.current.includes(decodedText)) {
        scanQueueRef.current.push(decodedText);
      }
      return;
    }
    
    // Process this scan
    lastScanTimeRef.current = now;
    handleQrCodeScan(decodedText);
    
    // Process queue after current scan completes
    if (scanQueueRef.current.length > 0) {
      const timeoutDelay = processingCard ? SCAN_DEBOUNCE_MS * 2 : SCAN_DEBOUNCE_MS;
    setTimeout(() => {
      if (scanQueueRef.current.length > 0 && !processingCard) {
        const nextCode = scanQueueRef.current.shift();
        if (nextCode) {
          handleQrCodeScan(nextCode);
        }
      }
      }, timeoutDelay);
    }
  };

  const handleQrCodeScan = async (decodedText: string) => {
    try {
      logScanProcess('start', { text: decodedText.substring(0, 20) + '...' });
      
      // Track scan attempt
      extendedQrScanMonitor.trackScan();
      
      // Check rate limiting
      if (extendedQrScanMonitor.isRateLimited()) {
        const resetTime = extendedQrScanMonitor.getResetTime();
        setError(`Scanning too quickly. Please wait ${resetTime} seconds.`);
        playSound('error');
        return;
      }

      // First try to parse the data as JSON
      let parsedData: unknown;
      try {
        parsedData = JSON.parse(decodedText);
      } catch (e) {
        debugLog('Failed to parse QR code as JSON', e);
        setError('Invalid QR code format (not valid JSON)');
        playSound('error');
        return;
      }

      // Enhanced validation for customer type
      // Directly handle the case where type is "customer" even if structure isn't perfect
      if (typeof parsedData === 'object' && parsedData !== null && 'type' in parsedData) {
        const typeValue = (parsedData as any).type;
        
        // Normalize the type value (handle case sensitivity and variations)
        const normalizedType = typeof typeValue === 'string' 
          ? typeValue.toLowerCase().replace(/[-_]/g, '').replace('card', '') 
          : '';
        
        // Handle customer type explicitly - making this more forgiving
        if (normalizedType === 'customer') {
          // Check if we have a customer ID - either as customerId or id
          const customerId = (parsedData as any).customerId || (parsedData as any).id;
          
          if (customerId) {
            // Force the type to be correct in case of capitalization or format differences
            const customerData: CustomerQrCodeData = {
              type: 'customer',
              customerId: String(customerId),
              name: (parsedData as any).name || (parsedData as any).customerName || '',
              email: (parsedData as any).email || '',
              businessId: (parsedData as any).businessId || undefined,
              text: decodedText
            };
            
            // Process this customer data
            await handleCustomerQrCode(customerData);
            
            // Create scan result for history and callback
            const scanResult = createScanResult('customer', customerData, decodedText);
            addToScanHistory(scanResult, true);
            
            // Call onScan callback if provided
            if (onScan) {
              onScan(scanResult);
            }
            
            // Play success sound
            playSound('success');
            
            // Show success message
            setSuccessScan(`Customer QR code scanned successfully${customerData.name ? ` for ${customerData.name}` : ''}`);
            setTimeout(() => {
              setSuccessScan('');
            }, 2000);
            
            return;
          }
        }
      }

      // If not handled by the enhanced customer validation, continue with standard flow
      // Use the enhanced parseQrCodeData with runtime validation
      const qrCodeData = parseQrCodeData(decodedText);
      
      if (!qrCodeData) {
        setError('Invalid QR code format');
        playSound('error');
        return;
      }
      
      // Create scan result
      const scanResult = createScanResult(qrCodeData.type, qrCodeData, decodedText);
      
      // Add to scan history
      addToScanHistory(scanResult, true);
      
      // Process based on QR code type with runtime type guards
      if (isCustomerQrCodeData(qrCodeData)) {
        await handleCustomerQrCode(qrCodeData);
      } else if (isLoyaltyCardQrCodeData(qrCodeData)) {
        await handleLoyaltyCardQrCode(qrCodeData);
      } else if (isPromoCodeQrCodeData(qrCodeData)) {
        await handlePromoCodeQrCode(qrCodeData);
      } else {
        // Unknown QR code type
        setError(`Unrecognized QR code type: ${qrCodeData.type}`);
        playSound('error');
        
        // Monitor this unknown type for analytics
        monitorTypeViolation('Unknown QR Type', false, qrCodeData, 'known QR type');
        return;
      }
      
      // Call onScan callback if provided
      if (onScan) {
        onScan(scanResult);
      }
      
      // Play success sound
      playSound('success');
      
      // Show success message briefly
      if (qrCodeData.type === 'customer') {
        setSuccessScan(`Customer QR code scanned successfully${qrCodeData.name ? ` for ${qrCodeData.name}` : ''}`);
      } else if (qrCodeData.type === 'loyaltyCard') {
        setSuccessScan('Loyalty card scanned successfully');
      } else if (qrCodeData.type === 'promoCode') {
        setSuccessScan('Promo code scanned successfully');
      } else {
        setSuccessScan('QR code scanned successfully');
      }
      
      setTimeout(() => {
        setSuccessScan('');
      }, 2000);
      
    } catch (error) {
      console.error('Error handling QR code scan:', error);
      setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      playSound('error');
      
      // Record failed scan
      extendedQrScanMonitor.recordFailedScan(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        decodedText
      );
    }
  };
  
  /**
   * Handle a customer QR code scan
   */
  const handleCustomerQrCode = async (qrCodeData: CustomerQrCodeData) => {
    try {
      // Extract customer ID
      const customerId = ensureId(qrCodeData.customerId);
      
      // Log scan in monitoring system
      try {
        // Log scan in monitoring system
        await QrCodeService.logScan(
          'CUSTOMER_CARD',
          businessId ? ensureId(businessId) : '0',
          qrCodeData,
          true,
          { customerId: customerId, businessId: businessId ? ensureId(businessId) : '0' } as any
        );
      } catch (logError) {
        // Silently handle logging errors - non-critical
      }
      
      // Schedule a notification for the scan
      if (businessId) {
        try {
          await NotificationService.createNotification(
            customerId,
            'POINTS_EARNED', // Use a valid NotificationType
            'Your QR code was scanned',
            `Your code was scanned at ${new Date().toLocaleTimeString()}`
          );
        } catch (notifyError) {
          // Silently handle notification errors - non-critical
        }
      }
      
      // Set success message and sound
      setSuccessScan(`Successfully scanned customer ${customerId}`);
      playSound('success');
      
      // Store scan result for UI actions (buttons and details)
      setLastResult({
        type: 'customer',
        data: {
          type: 'customer',
          customerId: customerId,
          businessId: businessId ? ensureId(businessId) : '0',
          name: qrCodeData.name || qrCodeData.customerName || '',
          customerName: qrCodeData.name || qrCodeData.customerName || '',
          email: qrCodeData.email,
          phone: qrCodeData.phone,
          text: qrCodeData.text || JSON.stringify(qrCodeData)
        } as CustomerQrCodeData,
        timestamp: new Date().toISOString(),
        raw: qrCodeData.text || JSON.stringify(qrCodeData)
      });
      
      return {
        success: true,
        customerId
      };
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error processing customer QR code');
      playSound('error');
      setProcessingCard(false);
      
      try {
        // Log the failed scan
        await QrCodeService.logScan(
          'CUSTOMER_CARD',
          businessId ? ensureId(businessId) : '0',
          qrCodeData,
          false,
          { 
            customerId: ensureId(qrCodeData.customerId),
            businessId: businessId ? ensureId(businessId) : '0',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          } as any
        );
      } catch (logError) {
        // Silently handle logging errors - non-critical
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  };
  
  /**
   * Handle a loyalty card QR code scan
   */
  const handleLoyaltyCardQrCode = async (qrCodeData: LoyaltyCardQrCodeData) => {
    try {
      // Show scanning animation
      setIsScanning(true);
      
      // Process the QR code scan for a specific loyalty card
      const result = await QrCodeService.processQrCodeScan(
        'LOYALTY_CARD',
        businessId ? ensureId(businessId) : '0',
        qrCodeData,
        {
          customerId: ensureId(qrCodeData.customerId),
          programId: qrCodeData.programId ? ensureId(qrCodeData.programId) : programId ? ensureId(programId) : undefined,
          pointsToAward: pointsToAward
        }
      );
      
      // Handle the scan result
      if (result.success) {
        // Success - play sound and show success UI
        playSound('success');
        
        // Clear any previous errors and reset rate limiting state
        setError(null);
        setRateLimited(false);
        
        // Set scan result details for UI
        setLastResult({
          type: 'loyaltyCard',
          data: {
            type: 'loyaltyCard',
            customerId: ensureId(qrCodeData.customerId),
            cardId: ensureId(qrCodeData.cardId),
            programId: qrCodeData.programId ? ensureId(qrCodeData.programId) : '0',
            businessId: businessId ? ensureId(businessId) : '0',
            cardNumber: qrCodeData.cardNumber || '',
            text: qrCodeData.text || JSON.stringify(qrCodeData)
          },
          timestamp: new Date().toISOString(),
          raw: qrCodeData.text || JSON.stringify(qrCodeData)
        });
        
        setShowRewardsModal(true);
      } else {
        // Error - play error sound and show error message
        playSound('error');
        setError(result.message || 'Failed to process loyalty card');
      }
    } catch (error) {
      playSound('error');
      setError('Failed to process loyalty card QR code');
    } finally {
      setIsScanning(false);
    }
  };
  
  /**
   * Handle a promo code QR code scan
   */
  const handlePromoCodeQrCode = async (qrCodeData: PromoCodeQrCodeData) => {
    try {
      // Show scanning animation
      setIsScanning(true);
      
      // Process the QR code scan
      const result = await QrCodeService.processQrCodeScan(
        'PROMO_CODE',
        businessId ? ensureId(businessId) : '0',
        qrCodeData,
        {
          promoCodeId: qrCodeData.code
        }
      );
      
      // Handle the scan result
      if (result.success) {
        // Success - play sound and show success UI
        playSound('success');
        
        // Clear any previous errors and reset rate limiting state
        setError(null);
        setRateLimited(false);
        
        // Set scan result details for UI
        setLastResult({
          type: 'promoCode',
          data: {
            type: 'promoCode',
            code: qrCodeData.code,
            businessId: businessId ? ensureId(businessId) : '0',
            text: qrCodeData.text || JSON.stringify(qrCodeData)
          },
          timestamp: new Date().toISOString(),
          raw: qrCodeData.text || JSON.stringify(qrCodeData)
        });
        
        setShowTransactionConfirmation(true);
      } else {
        // Error - play error sound and show error message
        playSound('error');
        setError(result.message || 'Invalid promotion code');
      }
    } catch (error) {
      playSound('error');
      setError('Failed to process promotion code');
    } finally {
      setIsScanning(false);
    }
  };
  
  const toggleScanner = () => {
    debugLog('Toggle scanner called, current state:', isScanning);
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  };

  const handleGiveReward = () => {
    if (!lastResult || lastResult.type !== 'customer' || !(lastResult.data as CustomerQrCodeData).customerId || !businessId) return;
    
    setShowRewardsModal(true);
    playSound('success');
  };
  
  const handleJoinProgram = () => {
    if (!lastResult || lastResult.type !== 'customer' || !(lastResult.data as CustomerQrCodeData).customerId || !businessId) return;
    
    setShowProgramsModal(true);
    playSound('success');
  };
  
  const handleRedeemCode = () => {
    if (!lastResult || lastResult.type !== 'customer' || !businessId) return;
    
    setShowRedeemModal(true);
    playSound('success');
  };

  const playSound = (type: 'success' | 'error' | 'scan') => {
    // Sound functionality disabled as per customer request
    // Previously played beep-success.mp3
  };

  const handleRewardsModalClose = (success?: boolean, points?: number) => {
    setShowRewardsModal(false);
    
    if (success && FEATURES.enableAnimations && lastResult?.type === 'customer') {
      const custData = lastResult.data as CustomerQrCodeData;
      if (custData.name) {
        setTransactionDetails({
          type: 'reward',
          message: t('Points Awarded!'),
          details: t('The points have been added to the customer\'s account'),
          customerName: custData.name as string,
          points: points || 0
        });
        setTransactionConfirmationType('success');
        setShowTransactionConfirmation(true);
        
        // Show green notification
        showNotification(`${points || 0} points awarded to ${custData.name}`, 'success');
      }
    } else {
      startScanning();
    }
  };
  
  const handleProgramsModalClose = (success?: boolean, programName?: string) => {
    setShowProgramsModal(false);
    
    if (success && FEATURES.enableAnimations && lastResult?.type === 'customer' && programName) {
      const custData = lastResult.data as CustomerQrCodeData;
      if (custData.name) {
        setTransactionDetails({
          type: 'enrollment',
          message: t('Enrollment Successful!'),
          details: t('Customer has been enrolled in the program'),
          customerName: custData.name as string,
          businessName: programName
        });
        setTransactionConfirmationType('success');
        setShowTransactionConfirmation(true);
        
        // Show green notification
        showNotification(`${custData.name} enrolled in ${programName}`, 'success');
      }
    } else {
      startScanning();
    }
  };
  
  const handleRedeemModalClose = (success?: boolean, amount?: number) => {
    setShowRedeemModal(false);
    
    if (success && FEATURES.enableAnimations && lastResult?.type === 'customer') {
      const custData = lastResult.data as CustomerQrCodeData;
      if (custData.name) {
        setTransactionDetails({
          type: 'redemption',
          message: t('Redemption Successful!'),
          details: t('The reward has been redeemed'),
          customerName: custData.name as string,
          amount: amount || 0
        });
        setTransactionConfirmationType('success');
        setShowTransactionConfirmation(true);
        
        // Show green notification
        showNotification(`Reward redeemed for ${custData.name}`, 'success');
      }
    } else {
      startScanning();
    }
  };

  const handleTransactionConfirmationClose = () => {
    setShowTransactionConfirmation(false);
    startScanning();
  };
  
  const handleFeedbackSubmit = async (rating: number, comment: string) => {
    try {
      await feedbackService.submitFeedback({
        rating,
        comment,
        category: 'qr_scan',
        page: 'scanner',
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

  // Add the loadCameras function as a separate function in the component
  const loadCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      setAvailableCameras(devices);
      
      // Set default camera - prefer back camera
      const backCamera = devices.find(camera => 
        camera.label.toLowerCase().includes('back') || 
        camera.label.toLowerCase().includes('rear')
      );
      setSelectedCamera(backCamera ? backCamera.id : devices[0]?.id || '');
    } catch (err) {
      console.error("Failed to get cameras:", err);
      if (err instanceof Error && err.message.includes('Permission denied')) {
        setError('Camera access denied. Please allow camera access in your browser settings.');
      } else {
        setError('Failed to detect cameras. Please make sure your device has a camera.');
      }
    }
  };

  useEffect(() => {
    // Check browser compatibility on component mount
    const checkDeviceCompatibility = async () => {
      // First check if browser is supported for QR scanning
      if (!isBrowserSupportedForQrScanning()) {
        const { name, version } = getBrowserInfo();
        setError(`Your browser (${name} ${version}) may not fully support QR scanning. For best results, use Chrome, Firefox, or Safari.`);
        return;
      }
      
      // Check if camera access is supported
      if (!isCameraSupported()) {
        setError('Your browser does not support camera access. Please use a modern browser like Chrome, Firefox, or Safari.');
        return;
      }
      
      // Check camera availability and permissions
      const cameraStatus = await checkCameraAvailability();
      
      if (!cameraStatus.available) {
        setError(cameraStatus.errorMessage || 'Camera not available');
        setPermissionGranted(cameraStatus.permissionGranted);
      } else {
        setPermissionGranted(true);
        
        // Only load cameras if we have permission and availability
        await loadCameras();
      }
    };
    
    checkDeviceCompatibility();
  }, []);

  // Effect to apply scanner config changes
  useEffect(() => {
    if (isScanning && scannerRef.current) {
      // Restart scanner with new config if it's already running
      stopScanning().then(() => startScanning());
    }
  }, [scannerConfig, selectedCamera]);

  // Save scan to history
  const addToScanHistory = (result: UnifiedScanResult, success: boolean) => {
    const historyItem: ScanHistoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      type: result.type,
      data: {
        customerId: (result.data as any).customerId ? String((result.data as any).customerId) : undefined,
        customerName: 'customerName' in result.data ? String((result.data as any).customerName) : undefined,
        code: 'code' in result.data ? String((result.data as any).code) : undefined,
        type: result.type,
        text: 'text' in result.data ? String((result.data as any).text) : JSON.stringify(result.data)
      },
      timestamp: result.timestamp,
      success
    };
    
    setScanHistory(prev => {
      // Keep only the last 20 items
      const newHistory = [historyItem, ...prev];
      if (newHistory.length > 20) {
        return newHistory.slice(0, 20);
      }
      return newHistory;
    });
  };

  // Handle selecting a previous scan from history
  const selectFromHistory = (item: ScanHistoryItem) => {
    // Reconstruct scan result from history
    let scanData: ScanData;
    
    switch (item.type) {
      case 'customer':
        scanData = {
          type: 'customer',
          customerId: item.data.customerId || '0',
          customerName: item.data.customerName,
          text: item.data.text || ''
        } as CustomerQrCodeData;
        break;
        
      case 'loyaltyCard':
        scanData = {
          type: 'loyaltyCard',
          cardId: item.data.cardId || '0',
          customerId: item.data.customerId || '0',
          programId: item.data.programId || '0',
          businessId: '0',
          text: item.data.text || ''
        } as LoyaltyCardQrCodeData;
        break;
        
      case 'promoCode':
        scanData = {
          type: 'promoCode',
          code: item.data.code || '',
          businessId: '0',
          text: item.data.text || ''
        } as PromoCodeQrCodeData;
        break;
        
      default:
        scanData = {
          type: 'unknown',
          text: item.data.text || ''
        } as UnknownQrCodeData;
    }
    
    const historyResult: UnifiedScanResult = {
      type: item.type,
      data: scanData,
      timestamp: item.timestamp,
      raw: item.data.text || '',
      success: item.success
    };
    
    setLastResult(historyResult);
    setShowScanHistory(false);
    
    // Process based on scan type
    if (item.type === 'customer' && item.data.customerId) {
      setSelectedCustomerId(item.data.customerId);
      setShowCustomerDetailsModal(true);
    } else if (item.type === 'loyaltyCard' && item.data.cardId) {
      handleLoyaltyCardQrCode(scanData as LoyaltyCardQrCodeData);
    } else if (item.type === 'promoCode' && item.data.code) {
      handlePromoCodeQrCode(scanData as PromoCodeQrCodeData);
    }
  };

  // Handler for applying scanner configuration
  const applyScannerConfig = (config: Partial<ScannerConfig>) => {
    setScannerConfig(prev => ({
      ...prev,
      ...config
    }));
  };

  // Reset scanner configuration to defaults
  const resetScannerConfig = () => {
    setScannerConfig(defaultScannerConfig);
  };

  // Switch between available cameras
  const switchCamera = async () => {
    if (availableCameras.length <= 1) return;
    
    const currentIndex = availableCameras.findIndex(camera => camera.id === selectedCamera);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextCamera = availableCameras[nextIndex];
    
    setSelectedCamera(nextCamera.id);
    
    // Restart scanner with new camera
    if (isScanning) {
      await stopScanning();
      startScanning();
    }
    
    // Show feedback that camera switched
    setSuccessScan(`Switched to ${nextCamera.label}`);
    setTimeout(() => setSuccessScan(null), 2000);
  };

  // Add UI for scanner configuration 
  const renderScannerConfig = () => {
    if (!showScannerConfig) return null;
    
    return (
      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 animate-fadeIn">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-md font-medium text-gray-700 flex items-center">
            <Settings className="h-4 w-4 mr-2" />
            {t('Scanner Settings')}
          </h3>
          <button 
            onClick={() => setShowScannerConfig(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('Frame Rate')} (FPS)
            </label>
            <input 
              type="range" 
              min="5" 
              max="30" 
              value={scannerConfig.fps}
              onChange={(e) => applyScannerConfig({ fps: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>5</span>
              <span>{scannerConfig.fps}</span>
              <span>30</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('Scan Area Size')}
            </label>
            <input 
              type="range" 
              min="150" 
              max="350" 
              step="10"
              value={scannerConfig.qrboxSize}
              onChange={(e) => applyScannerConfig({ qrboxSize: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Small</span>
              <span>{scannerConfig.qrboxSize}px</span>
              <span>Large</span>
            </div>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="disable-flip"
              checked={scannerConfig.disableFlip}
              onChange={(e) => applyScannerConfig({ disableFlip: e.target.checked })}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="disable-flip" className="ml-2 block text-sm text-gray-700">
              {t('Disable Image Flip')}
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('Focus Mode')}
            </label>
            <select
              value={scannerConfig.focusMode}
              onChange={(e) => applyScannerConfig({ 
                focusMode: e.target.value as 'continuous' | 'single' | 'auto' 
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="continuous">{t('Continuous')}</option>
              <option value="single">{t('Single Auto')}</option>
              <option value="auto">{t('Auto')}</option>
            </select>
          </div>
          
          <div className="pt-2">
            <button
              onClick={resetScannerConfig}
              className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('Reset to Defaults')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Add UI for scan history
  const renderScanHistory = () => {
    if (!showScanHistory) return null;
    
    // Group history items by type
    const groupedHistory = scanHistory.reduce((acc, item) => {
      const itemType = item.type;
      if (!acc[itemType]) {
        acc[itemType] = [];
      }
      acc[itemType].push(item);
      return acc;
    }, {} as Record<QrCodeType, ScanHistoryItem[]>);
    
    // Determine if we have any items
    const hasItems = scanHistory.length > 0;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-semibold flex items-center">
              <History className="w-5 h-5 mr-2 text-blue-500" />
              {t('Scan History')}
          </h3>
          <button 
            onClick={() => setShowScanHistory(false)}
              className="p-1 rounded-full hover:bg-gray-100"
              aria-label="Close"
          >
              <X className="w-5 h-5" />
          </button>
        </div>
        
          <div className="overflow-auto p-4 max-h-[calc(80vh-4rem)]">
            {!hasItems ? (
              <div className="text-center py-6 text-gray-500">
                <p>{t('No scan history yet')}</p>
                <p className="text-sm mt-2">{t('Scanned QR codes will appear here')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Customer scans */}
                {groupedHistory.customer && groupedHistory.customer.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                      <User className="w-4 h-4 mr-1 text-blue-500" />
                      {t('Customer Scans')}
                    </h4>
                    <div className="space-y-2">
                      {groupedHistory.customer.map(item => (
                        <div 
                key={item.id} 
                          className={`p-3 rounded-lg border ${item.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'} cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => selectFromHistory(item)}
              >
                <div className="flex justify-between">
                            <span className="font-medium">
                              {item.data.customerName || item.data.customerId || t('Customer')}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1 flex items-center">
                            <span className="mr-2">ID: {item.data.customerId || t('Unknown')}</span>
                            {item.success ? 
                              <Check className="w-4 h-4 text-green-500" /> : 
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Loyalty card scans */}
                {groupedHistory.loyaltyCard && groupedHistory.loyaltyCard.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                      <Award className="w-4 h-4 mr-1 text-purple-500" />
                      {t('Loyalty Card Scans')}
                    </h4>
                    <div className="space-y-2">
                      {groupedHistory.loyaltyCard.map(item => (
                        <div 
                          key={item.id}
                          className={`p-3 rounded-lg border ${item.success ? 'border-purple-200 bg-purple-50' : 'border-red-200 bg-red-50'} cursor-pointer hover:shadow-md transition-shadow`}
                          onClick={() => selectFromHistory(item)}
                        >
                          <div className="flex justify-between">
                            <span className="font-medium">
                              {t('Card')} #{item.data.cardId || '?'}
                  </span>
                            <span className="text-sm text-gray-500">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {item.data.customerId ? `${t('Customer')}: ${item.data.customerId}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Promo code scans */}
                {groupedHistory.promoCode && groupedHistory.promoCode.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                      <Target className="w-4 h-4 mr-1 text-amber-500" />
                      {t('Promo Code Scans')}
                    </h4>
                    <div className="space-y-2">
                      {groupedHistory.promoCode.map(item => (
                        <div 
                          key={item.id}
                          className={`p-3 rounded-lg border ${item.success ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'} cursor-pointer hover:shadow-md transition-shadow`}
                          onClick={() => selectFromHistory(item)}
                        >
                          <div className="flex justify-between">
                            <span className="font-medium">
                              {t('Code')}: {item.data.code || t('Unknown')}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Unknown/Error scans */}
                {groupedHistory.unknown && groupedHistory.unknown.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1 text-gray-500" />
                      {t('Unknown Scans')}
                    </h4>
                    <div className="space-y-2">
                      {groupedHistory.unknown.map(item => (
                        <div 
                          key={item.id}
                          className="p-3 rounded-lg border border-gray-200 bg-gray-50"
                        >
                          <div className="flex justify-between">
                            <span className="font-medium">{t('Unknown QR Code')}</span>
                            <span className="text-sm text-gray-500">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1 truncate">
                            {(item.data as any).text ? `${(item.data as any).text.substring(0, 30)}...` : t('No data')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="border-t p-4 flex justify-between">
            <button
              onClick={() => setScanHistory([])}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={!hasItems}
            >
              {t('Clear History')}
            </button>
            <button
              onClick={() => setShowScanHistory(false)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {t('Close')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Add camera selector UI
  const renderCameraSelector = () => {
    if (!showCameraSelector || availableCameras.length <= 1) return null;
    
    return (
      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 animate-fadeIn">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-md font-medium text-gray-700 flex items-center">
            <Camera className="h-4 w-4 mr-2" />
            {t('Select Camera')}
          </h3>
          <button 
            onClick={() => setShowCameraSelector(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="space-y-2">
          {availableCameras.map((camera) => (
            <div 
              key={camera.id} 
              className={`p-2 rounded-lg border cursor-pointer ${
                selectedCamera === camera.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:bg-gray-100'
              }`}
              onClick={() => {
                setSelectedCamera(camera.id);
                setShowCameraSelector(false);
                if (isScanning) {
                  stopScanning().then(() => startScanning());
                }
              }}
            >
              <div className="flex items-center">
                <Smartphone className="h-5 w-5 mr-2 text-gray-600" />
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {camera.label || `Camera ${availableCameras.indexOf(camera) + 1}`}
                  </div>
                  <div className="text-xs text-gray-500">
                    {camera.label.toLowerCase().includes('back') ? 'Back Camera' : 
                     camera.label.toLowerCase().includes('front') ? 'Front Camera' : 'Camera'}
                  </div>
                </div>
                {selectedCamera === camera.id && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Add control buttons
  const renderControlButtons = () => (
    <div className="mt-3 grid grid-cols-3 gap-2">
      <button
        onClick={() => {
          setShowScanHistory(true);
          setShowCameraSelector(false);
          setShowScannerConfig(false);
        }}
        className="py-2 px-3 border border-gray-200 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center justify-center"
      >
        <History className="h-3 w-3 mr-1" />
        {t('History')}
      </button>
      
      <button
        onClick={() => {
          if (availableCameras.length > 1) {
            if (isScanning) {
              switchCamera();
            } else {
              setShowCameraSelector(prev => !prev);
              setShowScanHistory(false);
              setShowScannerConfig(false);
            }
          }
        }}
        disabled={availableCameras.length <= 1}
        className={`py-2 px-3 border border-gray-200 rounded-md text-xs font-medium flex items-center justify-center ${
          availableCameras.length <= 1 
            ? 'text-gray-400 bg-gray-50' 
            : 'text-gray-700 bg-white hover:bg-gray-50'
        }`}
      >
        <SwitchCamera className="h-3 w-3 mr-1" />
        {t('Camera')}
      </button>
      
      <button
        onClick={() => {
          setShowScannerConfig(prev => !prev);
          setShowCameraSelector(false);
          setShowScanHistory(false);
        }}
        className="py-2 px-3 border border-gray-200 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center justify-center"
      >
        <Settings className="h-3 w-3 mr-1" />
        {t('Settings')}
      </button>
    </div>
  );

  // Add a new useEffect for browser-specific workarounds
  useEffect(() => {
    // Workaround for Chrome and other browsers that may need cleanup on unmount
    return () => {
      // Ensure camera is released on component unmount
      if (scannerRef.current && isScanning) {
        try {
          scannerRef.current.stop().catch(e => console.error("Error stopping scanner on unmount:", e));
        } catch (e) {
          console.error("Exception stopping scanner on unmount:", e);
        }
      }
    };
  }, [isScanning]);

  return (
    <div className="relative" data-testid="qr-scanner-container">
      {/* Success notification popup */}
      {showSuccessNotification && (
        <div className={`fixed top-16 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-2 transform transition-all animate-fade-in ${
          notificationType === 'success' ? 'bg-green-500 text-white' :
          notificationType === 'error' ? 'bg-red-500 text-white' : 
          'bg-blue-500 text-white'
        }`}>
          {notificationType === 'success' && <Check className="w-5 h-5 text-white" />}
          {notificationType === 'error' && <AlertCircle className="w-5 h-5 text-white" />}
          {notificationType === 'info' && <Info className="w-5 h-5 text-white" />}
          <span>{successNotificationMessage}</span>
        </div>
      )}
      
      {/* Scanner loading state */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20 rounded-lg">
          <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-3"></div>
            <p className="text-gray-700 font-medium">{t('Processing QR code...')}</p>
          </div>
        </div>
      )}

      {/* Main scanner UI */}
      <div className={`w-full max-w-lg mx-auto relative ${
        permissionGranted === false ? 'opacity-50 pointer-events-none' : ''
      }`}>
        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
              <div className="flex-1">{error}</div>
              <button
                onClick={() => setError(null)}
                className="ml-2 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Scanner Container */}
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg mb-4">
          <div className="relative">
            {/* Camera Feed Container */}
            <div
              id="qr-scanner-container"
              className="w-full h-64 md:h-80 bg-black relative overflow-hidden"
            ></div>

            {/* Scanner Animation */}
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-2 border-blue-400 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-full border-t-2 border-blue-500 animate-scanline"></div>
                </div>
              </div>
            )}

            {/* Permission Denied */}
            {permissionGranted === false && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white p-6 text-center">
                <AlertCircle className="w-12 h-12 mb-3 text-red-500" />
                <h3 className="text-lg font-medium mb-2">{t('Camera Access Denied')}</h3>
                <p className="mb-4 text-white/80">
                  {t('Please allow camera access in your browser settings to use the QR scanner.')}
                </p>
              </div>
            )}
            
          </div>

          {/* Scanner Controls */}
          <div className="p-4 bg-gray-700">
            <button
              onClick={toggleScanner}
              disabled={!permissionGranted}
              className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center transition-colors ${
                isScanning
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              } ${!permissionGranted ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isScanning ? (
                <>
                  <X className="w-5 h-5 mr-2" />
                  {t('Stop Scanner')}
                </>
              ) : (
                <>
                  <Scan className="w-5 h-5 mr-2" />
                  {t('Start Scanner')}
                </>
              )}
            </button>
            
            {renderControlButtons()}
            {renderCameraSelector()}
            {renderScannerConfig()}
          </div>
        </div>

        {/* Action Buttons (only shown when a result is selected) */}
        {lastResult?.type === 'customer' && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button
              onClick={handleGiveReward}
              className="py-2 px-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex flex-col items-center transition-colors"
            >
              <Award className="h-5 w-5 mb-1" />
              <span className="text-xs">{t('Give Points')}</span>
            </button>
            
            <button
              onClick={handleJoinProgram}
              className="py-2 px-1 bg-purple-500 hover:bg-purple-600 text-white rounded-lg flex flex-col items-center transition-colors"
            >
              <Users className="h-5 w-5 mb-1" />
              <span className="text-xs">{t('Join Program')}</span>
            </button>
            
            <button
              onClick={handleRedeemCode}
              className="py-2 px-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex flex-col items-center transition-colors"
            >
              <KeyRound className="h-5 w-5 mb-1" />
              <span className="text-xs">{t('Redeem Code')}</span>
            </button>
          </div>
        )}

        {/* Scan History Button */}
        <div className="mb-4">
          <button
            onClick={() => setShowScanHistory(true)}
            className="w-full py-2 px-4 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 flex items-center justify-center"
          >
            <History className="w-4 h-4 mr-2" />
            {t('View Scan History')} ({scanHistory.length})
          </button>
        </div>
      </div>

      {/* Transaction Confirmation Modal */}
      {showTransactionConfirmation && transactionDetails && (
        <TransactionConfirmation
          type={transactionConfirmationType}
          details={transactionDetails}
          onClose={handleTransactionConfirmationClose}
          onSubmitFeedback={handleFeedbackSubmit}
        />
      )}
      
      {/* Customer Details Modal */}
      {showCustomerDetailsModal && lastResult?.type === 'customer' && (
        <CustomerDetailsModal
          customerId={(lastResult.data as CustomerQrCodeData).customerId?.toString() || ''}
          onClose={() => setShowCustomerDetailsModal(false)}
        />
      )}
      
      {/* Rewards Modal */}
      {showRewardsModal && lastResult?.type === 'customer' && (
        <RewardModal
          customerId={(lastResult.data as CustomerQrCodeData).customerId?.toString() || ''}
          businessId={businessId?.toString() || ''}
          onClose={handleRewardsModalClose}
          initialPoints={pointsToAward}
        />
      )}
      
      {/* Program Enrollment Modal */}
      {showProgramsModal && lastResult?.type === 'customer' && (
        <ProgramEnrollmentModal
          customerId={(lastResult.data as CustomerQrCodeData).customerId?.toString() || ''}
          businessId={businessId?.toString() || ''}
          onClose={handleProgramsModalClose}
          preSelectedProgramId={programId?.toString()}
        />
      )}
      
      {/* Redemption Modal */}
      {showRedeemModal && lastResult?.type === 'customer' && (
        <RedemptionModal
          customerId={(lastResult.data as CustomerQrCodeData).customerId?.toString() || ''}
          businessId={businessId?.toString() || ''}
          onClose={handleRedeemModalClose}
        />
      )}
      
      {/* Scan History Modal */}
      {renderScanHistory()}
    </div>
  );
};