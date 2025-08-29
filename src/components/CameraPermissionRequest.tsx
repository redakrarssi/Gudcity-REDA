import React, { useState } from 'react';
import { Camera, AlertCircle, CheckCircle, RefreshCw, Shield, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { requestCameraPermission } from '../utils/browserSupport';

interface CameraPermissionRequestProps {
  onPermissionGranted: () => void;
  onPermissionDenied: (error: string) => void;
  isVisible: boolean;
}

export const CameraPermissionRequest: React.FC<CameraPermissionRequestProps> = ({
  onPermissionGranted,
  onPermissionDenied,
  isVisible
}) => {
  const { t } = useTranslation();
  const [isRequesting, setIsRequesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    setErrorMessage(null);

    try {
      console.log('🚀 User clicked "Allow Camera Access" - triggering native permission dialog...');
      
      // This WILL trigger the browser's native camera permission dialog
      const result = await requestCameraPermission();
      
      if (result.granted) {
        console.log('✅ Permission granted by user!');
        onPermissionGranted();
      } else {
        console.log('❌ Permission denied by user:', result.errorMessage);
        setErrorMessage(result.errorMessage || 'Camera permission was denied');
        onPermissionDenied(result.errorMessage || 'Camera permission was denied');
      }
    } catch (error) {
      console.error('💥 Error during permission request:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to request camera permission';
      setErrorMessage(errorMsg);
      onPermissionDenied(errorMsg);
    } finally {
      setIsRequesting(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Camera className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {t('Camera Permission Required')}
          </h2>
          <p className="text-gray-600 text-sm">
            {t('To scan QR codes, we need access to your camera. Click the button below and your browser will ask for camera permission.')}
          </p>
        </div>

        {/* Information Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-900 mb-1">
                {t('Your Privacy is Protected')}
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• {t('Camera access is only used for QR scanning')}</li>
                <li>• {t('No images or videos are stored or transmitted')}</li>
                <li>• {t('You can revoke permission at any time in browser settings')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-sm text-red-800">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleRequestPermission}
            disabled={isRequesting}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isRequesting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                {t('Requesting Permission...')}
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                {t('Allow Camera Access')}
              </>
            )}
          </button>

          {/* Help Text */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-start">
              <Info className="w-4 h-4 text-gray-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-xs text-gray-600">
                <p className="font-medium mb-1">{t('What happens when you click "Allow Camera Access"')}:</p>
                <ul className="space-y-1">
                  <li>• {t('Your browser will show a permission dialog')}</li>
                  <li>• {t('Click "Allow" or "Allow camera access" in the browser popup')}</li>
                  <li>• {t('If no dialog appears, check for a camera icon in your address bar')}</li>
                  <li>• {t('Make sure you\'re using HTTPS (secure connection)')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraPermissionRequest;
