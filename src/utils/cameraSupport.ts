/**
 * Camera Support Utility
 * 
 * Enhanced camera support functions to improve QR scanner functionality
 * without modifying the core QR scanner component.
 */

import { Html5Qrcode } from 'html5-qrcode';
import { checkCameraAvailability } from './browserSupport';

/**
 * Interface for camera device with enhanced properties
 */
export interface EnhancedCameraDevice {
  id: string;
  label: string;
  isFrontFacing: boolean;
  isBackFacing: boolean;
  isDefault: boolean;
}

/**
 * Check if camera permissions are granted and fix common permission issues
 */
export const ensureCameraPermissions = async (): Promise<boolean> => {
  try {
    // First check if permission is already granted
    const permission = await navigator.permissions?.query({ name: 'camera' as PermissionName });
    
    if (permission?.state === 'granted') {
      return true;
    }
    
    // If not granted or query not supported, try to request access directly
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false 
    });
    
    // Successfully got camera stream, release it
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Camera permission error:', error);
    return false;
  }
};

/**
 * Get all available cameras with enhanced details
 */
export const getAvailableCameras = async (): Promise<EnhancedCameraDevice[]> => {
  try {
    // First ensure we have permission to use the camera
    const hasPermission = await ensureCameraPermissions();
    if (!hasPermission) {
      throw new Error('Camera permission denied');
    }
    
    // Get cameras using the html5-qrcode library
    const devices = await Html5Qrcode.getCameras();
    
    if (!devices || devices.length === 0) {
      throw new Error('No cameras found');
    }
    
    // Check additional information about cameras when possible
    return await Promise.all(devices.map(async (device) => {
      // Default assumptions based on label
      let isFrontFacing = device.label.toLowerCase().includes('front');
      let isBackFacing = device.label.toLowerCase().includes('back') || 
                         device.label.toLowerCase().includes('rear');
      
      // If no clear indication in the label, try to make an educated guess
      if (!isFrontFacing && !isBackFacing) {
        // Most mobile devices prioritize back camera as the first one
        // and front camera as the second one
        isBackFacing = devices.indexOf(device) === 0;
        isFrontFacing = devices.indexOf(device) === 1;
      }
      
      return {
        id: device.id,
        label: device.label || `Camera ${devices.indexOf(device) + 1}`,
        isFrontFacing,
        isBackFacing,
        isDefault: devices.indexOf(device) === 0
      };
    }));
  } catch (error) {
    console.error('Error getting cameras:', error);
    return [];
  }
};

/**
 * Get the best camera for QR scanning (usually back camera)
 */
export const getBestQrScanningCamera = async (): Promise<string | undefined> => {
  try {
    const cameras = await getAvailableCameras();
    
    if (cameras.length === 0) {
      return undefined;
    }
    
    // Prefer back cameras as they are better for QR scanning
    const backCamera = cameras.find(camera => camera.isBackFacing);
    if (backCamera) {
      return backCamera.id;
    }
    
    // If no back camera, use the default one
    return cameras[0].id;
  } catch (error) {
    console.error('Error getting best camera:', error);
    return undefined;
  }
};

/**
 * Test if camera stream can be obtained successfully
 */
export const testCameraStream = async (deviceId?: string): Promise<boolean> => {
  let stream: MediaStream | null = null;
  
  try {
    const constraints: MediaStreamConstraints = {
      video: deviceId 
        ? { deviceId: { exact: deviceId } }
        : { facingMode: 'environment' },
      audio: false
    };
    
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Check if we have video tracks
    return stream.getVideoTracks().length > 0;
  } catch (error) {
    console.error('Camera test failed:', error);
    return false;
  } finally {
    // Make sure to release the camera
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }
};

/**
 * Fix common camera initialization issues
 */
export const fixCameraInitIssues = async (): Promise<boolean> => {
  try {
    // 1. Check if we need to request permission first
    const permissionStatus = await checkCameraAvailability();
    if (!permissionStatus.permissionGranted) {
      // Try to request permission explicitly
      const permissionGranted = await ensureCameraPermissions();
      if (!permissionGranted) {
        console.error('Camera permission denied');
        return false;
      }
    }
    
    // 2. Test camera stream to "wake up" the camera system
    const streamTest = await testCameraStream();
    if (!streamTest) {
      console.error('Camera stream test failed');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error fixing camera issues:', error);
    return false;
  }
};

/**
 * Initialize camera with automatic retries and error recovery
 */
export const initializeCamera = async (
  scannerDivId: string, 
  maxRetries: number = 3
): Promise<Html5Qrcode | null> => {
  let retries = 0;
  let scanner: Html5Qrcode | null = null;
  
  while (retries < maxRetries) {
    try {
      // Fix common camera issues first
      await fixCameraInitIssues();
      
      // Create a fresh scanner instance
      scanner = new Html5Qrcode(scannerDivId);
      
      // Test if scanner is working
      if (scanner) {
        return scanner;
      }
      
      // If we get here, try again
      retries++;
      await new Promise(resolve => setTimeout(resolve, 800 * retries));
    } catch (error) {
      console.error(`Camera initialization attempt ${retries + 1} failed:`, error);
      retries++;
      await new Promise(resolve => setTimeout(resolve, 800 * retries));
    }
  }
  
  return null;
};

/**
 * Start camera with automatic camera selection and error handling
 */
export const startCameraWithErrorHandling = async (
  scanner: Html5Qrcode,
  qrCodeSuccessCallback: (decodedText: string, result: any) => void,
  qrCodeErrorCallback: (errorMessage: string, error: any) => void,
  cameraId?: string
): Promise<boolean> => {
  try {
    // Get best camera if none specified
    if (!cameraId) {
      cameraId = await getBestQrScanningCamera();
      if (!cameraId) {
        throw new Error('No suitable camera found');
      }
    }
    
    // Configure camera with optimal settings
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      disableFlip: false,
      videoConstraints: {
        deviceId: cameraId,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "environment"
      }
    };
    
    // Start the scanner with proper type handling
    await scanner.start(
      cameraId,
      config,
      qrCodeSuccessCallback,
      qrCodeErrorCallback
    );
    
    return true;
  } catch (error) {
    console.error('Error starting camera:', error);
    
    // Try one more time with default camera if previous attempt failed
    if (cameraId) {
      try {
        // Attempt with environment-facing camera instead of specific ID
        // Use the overload that accepts facingMode directly
        const facingModeConfig = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          videoConstraints: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };
        
        await scanner.start(
          { facingMode: "environment" } as any, // Type cast to avoid errors
          facingModeConfig,
          qrCodeSuccessCallback,
          qrCodeErrorCallback
        );
        
        return true;
      } catch (retryError) {
        console.error('Retry with default camera failed:', retryError);
        return false;
      }
    }
    
    return false;
  }
};

/**
 * Auto-reconnect camera in case of disconnection or freezing
 */
export const setupCameraAutoReconnect = (
  scanner: Html5Qrcode,
  qrCodeSuccessCallback: (decodedText: string, result: any) => void,
  qrCodeErrorCallback: (errorMessage: string, error: any) => void,
  cameraId?: string,
  checkIntervalMs: number = 15000
): () => void => {
  let isReconnecting = false;
  
  // Check if video stream is still active and working
  const checkVideoStatus = async () => {
    if (isReconnecting) return;
    
    try {
      // Check if scanner is actively scanning by using a safe method
      // Instead of using private properties like _isScanning, check via DOM
      const scannerElement = document.getElementById('html5-qrcode-scanregion');
      const isActive = !!scannerElement && scannerElement.childElementCount > 0;
      
      if (isActive) {
        // Get the video element that the scanner is using
        const videoElement = document.querySelector('#html5-qrcode-scanregion video');
        
        // Check if video element exists and is playing properly
        if (videoElement instanceof HTMLVideoElement) {
          const isVideoFrozen = videoElement.readyState <= 2 || 
                              videoElement.paused || 
                              videoElement.ended ||
                              !videoElement.srcObject;
                              
          if (isVideoFrozen) {
            console.log('Camera appears to be frozen, attempting reconnection');
            isReconnecting = true;
            
            try {
              // Stop the scanner
              await scanner.stop();
              
              // Wait a moment before reconnecting
              await new Promise(resolve => setTimeout(resolve, 800));
              
              // Restart it
              await startCameraWithErrorHandling(
                scanner,
                qrCodeSuccessCallback,
                qrCodeErrorCallback,
                cameraId
              );
            } catch (reconnectError) {
              console.error('Error during camera auto-reconnect:', reconnectError);
            } finally {
              isReconnecting = false;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking camera status:', error);
    }
  };
  
  // Set up periodic check
  const intervalId = setInterval(checkVideoStatus, checkIntervalMs);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
};

export default {
  ensureCameraPermissions,
  getAvailableCameras,
  getBestQrScanningCamera,
  testCameraStream,
  fixCameraInitIssues,
  initializeCamera,
  startCameraWithErrorHandling,
  setupCameraAutoReconnect
};