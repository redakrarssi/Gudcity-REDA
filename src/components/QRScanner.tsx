import React, { useState, useCallback, useEffect } from 'react';
import { QrReader } from 'react-qr-reader';
import { Camera, X, AlertCircle, RefreshCw, SwitchCamera } from 'lucide-react';
import { checkCameraSupport, applyPolyfills, isMobileDevice } from '../utils/browserSupport';

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
  }, [onError]);

  const handleScan = useCallback((result: any, error: any) => {
    if (result) {
      try {
        const text = result.getText();
        onScan(text);
      } catch (err) {
        setError('Failed to process QR code data');
        onError(new Error('Failed to process QR code data'));
      }
    }
    
    if (error) {
      console.log('QR Scanner error:', error);
      
      // Handle various error types
      if (error.name === 'NotAllowedError' || (error.message && error.message.includes('permission'))) {
        setHasPermission(false);
      } else if (error.name === 'NotFoundError') {
        setError('No camera detected. Please make sure your camera is connected.');
        onError(new Error('No camera detected'));
      } else if (error.name === 'NotReadableError') {
        setError('Camera is in use by another application. Please close other apps using your camera.');
        onError(new Error('Camera is in use by another application'));
      } else if (error.name !== 'OverconstrainedError') {
        // OverconstrainedError happens when switching cameras, so we don't need to show it
        setError(error.message || 'Scanner error');
        onError(error);
      }
    }
  }, [onScan, onError]);

  const toggleCamera = () => {
    setIsLoading(true);
    setFacingMode(prevMode => prevMode === 'environment' ? 'user' : 'environment');
    
    // Reset loading state after a delay to allow camera to switch
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const restartScanner = () => {
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
          // Reset loading after a short delay to allow camera initialization
          setTimeout(() => setIsLoading(false), 2000);
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
    <div className="qr-scanner-container max-w-[400px] mx-auto sm:max-w-full">
      <div className="relative bg-white rounded-lg shadow-lg overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <RefreshCw className="w-8 h-8 text-white animate-spin" />
          </div>
        )}
        
        <div className={error ? "opacity-50" : ""}>
          <QrReader
            constraints={{ 
              facingMode: facingMode,
              aspectRatio: 1
            }}
            onResult={handleScan}
            className="w-full"
            videoStyle={{ 
              width: '100%',
              height: 'auto',
              objectFit: 'cover'
            }}
            scanDelay={500}
            videoId="qr-video"
          />
        </div>
        
        <div className="absolute top-0 left-0 right-0 p-2 flex justify-between items-center">
          <button
            onClick={toggleCamera}
            className="bg-white/80 p-2 rounded-full hover:bg-white transition-colors"
            title="Switch Camera"
            aria-label="Switch between front and back camera"
          >
            <SwitchCamera className="h-5 w-5 text-gray-700" />
          </button>
          
          <button
            onClick={() => setStarted(false)}
            className="bg-white/80 p-2 rounded-full hover:bg-white transition-colors"
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