/**
 * QR Scanner Initializer
 * 
 * Utility to enhance the initialization of QR scanners in the application
 * without modifying the core QRScanner component.
 */

import * as cameraSupport from './cameraSupport';
import { Html5Qrcode } from 'html5-qrcode';
import { checkCameraAvailability } from './browserSupport';

/**
 * Interface for enhanced QR scanner configuration
 */
export interface EnhancedQrScannerConfig {
  fps?: number;
  qrboxSize?: number;
  aspectRatio?: number;
  disableFlip?: boolean;
  scanRegionId?: string;
  focusMode?: 'continuous' | 'single' | 'auto';
  autoReconnect?: boolean;
  autoReconnectIntervalMs?: number;
}

/**
 * Create a properly initialized QR scanner that automatically handles camera issues
 * 
 * @param scanRegionId DOM element ID where the scanner should be mounted
 * @param onScan Callback function when a QR code is successfully scanned
 * @param onError Callback function when an error occurs
 * @param config Optional configuration for the scanner
 * @returns An object containing scanner instance and control methods
 */
export const createEnhancedQrScanner = async (
  scanRegionId: string,
  onScan: (decodedText: string, result: any) => void,
  onError: (error: string, errorObj: any) => void,
  config?: EnhancedQrScannerConfig
) => {
  // Default configuration
  const finalConfig = {
    fps: config?.fps || 10,
    qrboxSize: config?.qrboxSize || 250,
    aspectRatio: config?.aspectRatio || 1.0,
    disableFlip: config?.disableFlip || false,
    scanRegionId: config?.scanRegionId || scanRegionId,
    autoReconnect: config?.autoReconnect !== false, // default to true
    autoReconnectIntervalMs: config?.autoReconnectIntervalMs || 15000,
    focusMode: config?.focusMode || 'continuous'
  };

  // Initial setup
  let scanner: Html5Qrcode | null = null;
  let cameraId: string | undefined;
  let isInitialized = false;
  let autoReconnectCleanup: (() => void) | null = null;
  
  // Internal error handler to avoid breaking the component
  const safeErrorHandler = (errorMsg: string, errorObj: any) => {
    console.error('QR Scanner error:', errorMsg, errorObj);
    
    // Call the user's error handler
    try {
      onError(errorMsg, errorObj);
    } catch (handlerError) {
      console.error('Error in error handler:', handlerError);
    }
  };
  
  /**
   * Initialize the scanner with enhanced error handling
   */
  const initialize = async (): Promise<boolean> => {
    try {
      // Fix any camera permission issues first
      await cameraSupport.fixCameraInitIssues();
      
      // Create scanner instance with automatic retries
      scanner = await cameraSupport.initializeCamera(scanRegionId, 3);
      
      if (!scanner) {
        safeErrorHandler('Failed to initialize QR scanner after multiple attempts', null);
        return false;
      }
      
      // Get best camera for scanning
      cameraId = await cameraSupport.getBestQrScanningCamera();
      
      isInitialized = true;
      return true;
    } catch (error) {
      safeErrorHandler('Error during QR scanner initialization', error);
      return false;
    }
  };
  
  /**
   * Start the scanner with proper error handling
   */
  const startScanning = async (): Promise<boolean> => {
    try {
      if (!scanner) {
        const initResult = await initialize();
        if (!initResult) return false;
      }
      
      if (!scanner) {
        safeErrorHandler('Scanner is not initialized', null);
        return false;
      }
      
      // Start the scanner
      const success = await cameraSupport.startCameraWithErrorHandling(
        scanner,
        onScan,
        safeErrorHandler,
        cameraId
      );
      
      if (!success) {
        safeErrorHandler('Failed to start camera', null);
        return false;
      }
      
      // Set up auto-reconnect if enabled
      if (finalConfig.autoReconnect && scanner) {
        autoReconnectCleanup = cameraSupport.setupCameraAutoReconnect(
          scanner,
          onScan,
          safeErrorHandler,
          cameraId,
          finalConfig.autoReconnectIntervalMs
        );
      }
      
      return true;
    } catch (error) {
      safeErrorHandler('Error starting scanner', error);
      return false;
    }
  };
  
  /**
   * Stop the scanner safely
   */
  const stopScanning = async (): Promise<boolean> => {
    try {
      // Clean up auto-reconnect
      if (autoReconnectCleanup) {
        autoReconnectCleanup();
        autoReconnectCleanup = null;
      }
      
      // Stop scanner if it exists
      if (scanner) {
        try {
          await scanner.stop();
          return true;
        } catch (error) {
          console.warn('Error stopping scanner:', error);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error during scanner cleanup:', error);
      return false;
    }
  };
  
  /**
   * Switch to a different camera
   */
  const switchCamera = async (): Promise<boolean> => {
    try {
      if (!scanner) {
        return false;
      }
      
      // Stop current scanner
      await stopScanning();
      
      // Get available cameras
      const cameras = await cameraSupport.getAvailableCameras();
      
      if (cameras.length <= 1) {
        // Only one camera available, restart with the same camera
        return await startScanning();
      }
      
      // Find current camera index
      const currentIndex = cameras.findIndex(cam => cam.id === cameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      
      // Use next camera
      cameraId = cameras[nextIndex].id;
      
      // Restart scanner with new camera
      return await startScanning();
    } catch (error) {
      safeErrorHandler('Error switching camera', error);
      return false;
    }
  };
  
  /**
   * Check camera permissions and availability
   */
  const checkCamera = async (): Promise<{
    available: boolean;
    permissionGranted: boolean;
    errorMessage?: string;
  }> => {
    return await checkCameraAvailability();
  };
  
  // Initialize immediately and return the controller
  await initialize();
  
  return {
    scanner,
    startScanning,
    stopScanning,
    switchCamera,
    checkCamera,
    isInitialized: () => isInitialized
  };
};

export default {
  createEnhancedQrScanner
}; 