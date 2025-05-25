import React, { useState, useCallback, useEffect, useRef } from 'react';
// Use named imports
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle, RefreshCw, SwitchCamera } from 'lucide-react';
import { checkCameraSupport, applyPolyfills, isMobileDevice } from '../utils/browserSupport';

// Define CameraDevice interface locally to avoid import issues
interface CameraDevice {
  id: string;
  label: string;
}

interface QRScannerProps {
  onScan: (data: string) => void;
  onError: (error: Error) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onError }) => {
  const [started, setStarted] = useState(false);
  const [hasPermission, setHasPermission] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(
    isMobileDevice() ? 'environment' : 'user'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isBrowserCompatible, setIsBrowserCompatible] = useState(true);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  // Check browser compatibility on mount and apply polyfills
  useEffect(() => {
    // Apply any needed polyfills
    applyPolyfills();
    
    // Check camera support
    const hasCamera = checkCameraSupport();
    if (!hasCamera) {
      setIsBrowserCompatible(false);
      setError('Your browser does not support camera access. Please try a different browser.');
      onError(new Error('Camera access not supported'));
    }

    // Clean up scanner on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onError]);

  useEffect(() => {
    if (started && isBrowserCompatible && scannerContainerRef.current) {
      setIsLoading(true);
      
      // Initialize scanner
      const qrScanner = new Html5Qrcode('qr-reader');
      scannerRef.current = qrScanner;
      
      // Get available cameras
      Html5Qrcode.getCameras().then((devices: CameraDevice[]) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          
          // Select appropriate camera based on facing mode
          let cameraId = devices[0].id;
          if (facingMode === 'environment') {
            // Try to find back camera
            const backCamera = devices.find((camera: CameraDevice) => 
              camera.label.toLowerCase().includes('back') || 
              camera.label.toLowerCase().includes('environment')
            );
            if (backCamera) {
              cameraId = backCamera.id;
            }
          } else {
            // Try to find front camera
            const frontCamera = devices.find((camera: CameraDevice) => 
              camera.label.toLowerCase().includes('front') || 
              camera.label.toLowerCase().includes('user')
            );
            if (frontCamera) {
              cameraId = frontCamera.id;
            }
          }
          
          setSelectedCameraId(cameraId);
          
          // Start scanner with selected camera
          qrScanner.start(
            cameraId,
            {
              fps: 10,
              qrbox: {width: 250, height: 250}
            },
            (decodedText: string) => {
              onScan(decodedText);
            },
            (errorMessage: string) => {
              console.log('QR Scanner error:', errorMessage);
              // Only set errors that are not related to successful scanning
              if (errorMessage.includes('QR code parse error')) {
                return; // Ignore parsing errors as these occur normally during scanning
              }
              setError(errorMessage);
            }
          ).then(() => {
            setIsLoading(false);
          }).catch((err: Error) => {
            setIsLoading(false);
            
            if (err.toString().includes('permission')) {
        setHasPermission(false);
            } else {
              setError(err.toString());
              onError(err);
            }
          });
        } else {
          setError('No camera found on this device');
          setIsLoading(false);
        }
      }).catch((err: Error) => {
        console.error('Error getting cameras', err);
        setError('Could not access cameras: ' + err.toString());
        setIsLoading(false);
        onError(err);
      });
    }
    
    return () => {
      // Stop scanner when component unmounts or when restarting
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [started, isBrowserCompatible, facingMode, onScan, onError]);

  const toggleCamera = () => {
    if (scannerRef.current) {
    setIsLoading(true);
      scannerRef.current.stop().then(() => {
    setFacingMode(prevMode => prevMode === 'environment' ? 'user' : 'environment');
        // Reset error state
        setError(null);
    
        // Small delay before restarting with new camera
    setTimeout(() => {
          if (started) {
            // This will trigger the useEffect to start the scanner again
            setStarted(false);
            setTimeout(() => setStarted(true), 100);
          }
        }, 300);
      }).catch((err: Error) => {
        console.error('Error stopping camera', err);
        setError('Error switching camera: ' + err.toString());
      setIsLoading(false);
      });
    }
  };

  const restartScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(console.error);
    }
    setStarted(false);
    setError(null);
    setHasPermission(true);
    // Small delay before restarting
    setTimeout(() => {
      setStarted(true);
    }, 300);
  };

  if (!isBrowserCompatible) {
    return (
      <div className="p-4 text-center bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-600 mb-3 font-medium">Browser not compatible</p>
        <p className="text-red-600 mb-4 text-sm">
          Your browser doesn't support camera access. Please try using Chrome, Firefox, or Safari.
        </p>
      </div>
    );
  }

  if (!started) {
    return (
      <button
        onClick={() => {
          setStarted(true);
          setIsLoading(true);
        }}
        className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
      >
        <Camera className="w-5 h-5" />
        Start Scanner
      </button>
    );
  }

  if (!hasPermission) {
    return (
      <div className="p-4 text-center bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-600 mb-3 font-medium">Camera permission denied</p>
        <p className="text-red-600 mb-4 text-sm">Please enable camera access in your browser settings and try again.</p>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            How to enable camera access:
            <ul className="text-left list-disc pl-5 mt-2">
              <li>Click the camera/lock icon in your browser's address bar</li>
              <li>Select "Allow" for camera access</li>
              <li>Reload the page after changing permissions</li>
            </ul>
          </p>
          <button
            onClick={() => {
              setStarted(false);
              setHasPermission(true);
            }}
            className="py-2 px-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Close Scanner
          </button>
          <button
            onClick={restartScanner}
            className="block w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-2"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="qr-scanner-container max-w-[400px] mx-auto sm:max-w-full" ref={scannerContainerRef}>
      <div className="relative bg-white rounded-lg shadow-lg overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <RefreshCw className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
        
        <div id="qr-reader" style={{ width: '100%', height: '300px' }}></div>
        
        <div className="absolute top-0 left-0 right-0 p-2 flex justify-between items-center">
          {cameras.length > 1 && (
          <button
            onClick={toggleCamera}
            className="bg-white/80 p-2 rounded-full hover:bg-white transition-colors"
            title="Switch Camera"
            aria-label="Switch between front and back camera"
          >
            <SwitchCamera className="h-5 w-5 text-gray-700" />
          </button>
          )}
          
          <button
            onClick={() => {
              if (scannerRef.current) {
                scannerRef.current.stop().catch(console.error);
              }
              setStarted(false);
            }}
            className="bg-white/80 p-2 rounded-full hover:bg-white transition-colors ml-auto"
            title="Close Scanner"
            aria-label="Close scanner"
          >
            <X className="h-5 w-5 text-gray-700" />
          </button>
        </div>
        
        {/* Scanner targeting frame */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0 border-[20px] md:border-[40px] border-black/30 box-border rounded-lg">
            <div className="absolute inset-0 border-2 md:border-4 border-white/70 box-border rounded-sm"></div>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-yellow-800 text-sm flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          <div className="flex-1">{error}</div>
          <button 
            onClick={restartScanner} 
            className="ml-2 p-1 rounded-full hover:bg-yellow-100"
            title="Retry"
            aria-label="Retry scanning"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};