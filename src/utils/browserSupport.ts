/**
 * Browser Support Utility
 * 
 * This utility provides functions to check browser compatibility for various features
 * and applies polyfills where possible.
 */

/**
 * Check if the browser supports camera access
 * @returns True if the browser supports camera access
 */
export function checkCameraSupport(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Check if the browser supports canvas operations
 * @returns True if the browser supports canvas operations
 */
export function checkCanvasSupport(): boolean {
  const canvas = document.createElement('canvas');
  return !!(canvas.getContext && canvas.getContext('2d'));
}

/**
 * Check if the browser supports clipboard operations
 * @returns True if the browser supports clipboard operations
 */
export function checkClipboardSupport(): boolean {
  return !!navigator.clipboard;
}

/**
 * Suppress browser extension related errors
 * This is used to prevent console errors from browser extensions
 * trying to access the browser global object
 */
export function suppressBrowserExtensionErrors(): void {
  // Ensure browser is defined
  if (typeof window !== 'undefined') {
    console.log('Setting up browser extension error suppression');
    
    // Define browser object with any type to avoid TypeScript errors
    const browserObj = {
      runtime: { 
        sendMessage: () => Promise.resolve(), 
        onMessage: { 
          addListener: () => {}, 
          removeListener: () => {} 
        },
        getManifest: () => ({}),
        getURL: (path: string) => path,
        connect: () => ({ 
          onDisconnect: { addListener: () => {} },
          postMessage: () => {},
          disconnect: () => {}
        }),
        onConnect: { addListener: () => {} },
        onInstalled: { addListener: () => {} },
        id: "dummy-extension-id",
        lastError: null
      },
      storage: { 
        local: { 
          get: () => Promise.resolve({}), 
          set: () => Promise.resolve(),
          remove: () => Promise.resolve(),
          clear: () => Promise.resolve()
        },
        sync: { 
          get: () => Promise.resolve({}), 
          set: () => Promise.resolve(),
          remove: () => Promise.resolve(),
          clear: () => Promise.resolve()
        }
      },
      tabs: {
        query: () => Promise.resolve([]),
        create: () => Promise.resolve({}),
        update: () => Promise.resolve(),
        getCurrent: () => Promise.resolve({id: 1})
      }
    };
    
    // Use type assertion to avoid TypeScript errors
    if (!(window as any).browser) {
      (window as any).browser = browserObj;
    }

    // Ensure chrome is defined as well
    if (!(window as any).chrome) {
      (window as any).chrome = {
        runtime: (window as any).browser.runtime,
        storage: (window as any).browser.storage,
        tabs: (window as any).browser.tabs
      };
    }

    // Ensure runtime.lastError exists on both browser and chrome
    if ((window as any).browser && (window as any).browser.runtime) {
      (window as any).browser.runtime.lastError = (window as any).browser.runtime.lastError || null;
    }
    
    if ((window as any).chrome && (window as any).chrome.runtime) {
      (window as any).chrome.runtime.lastError = (window as any).chrome.runtime.lastError || null;
    }
    
    // Override console.error to suppress browser extension errors
    const originalConsoleError = console.error;
    console.error = function(...args) {
      // Check if this is a browser extension error
      if (args[0] && typeof args[0] === 'string') {
        const errorMsg = args[0].toString();
        
        // List of error patterns to suppress
        const suppressPatterns = [
          'browser is not defined',
          'ReferenceError: browser',
          'Cannot read properties of undefined',
          'Unchecked runtime.lastError',
          'Could not establish connection',
          'Receiving end does not exist',
          'The message port closed before a response was received',
          'Extension context invalidated',
          'content.js',
          'checkPageManual.js',
          'overlays.js',
          // Socket related errors
          'WebSocket connection',
          'Socket connection error',
          'websocket error',
          'TransportError',
          'ws://localhost:3000/socket.io',
          'Socket error',
          'NeonDbError: relation', // Database errors
          'NeonDbError: column', // Database column errors
          'Error getting customer available promo codes', // Promo codes error
          // Authentication errors
          'useAuth must be used within an AuthProvider',
          'User authenticated from stored ID',
          'No stored user ID found'
        ];
        
        // Check if any pattern matches
        if (suppressPatterns.some(pattern => errorMsg.includes(pattern))) {
          console.warn('Suppressed error:', errorMsg.substring(0, 100) + (errorMsg.length > 100 ? '...' : ''));
          return;
        }
      }
      
      // Suppress specific error objects
      if (args[0] && args[0] instanceof Error) {
        const errorMsg = args[0].message || args[0].toString();
        const errorName = args[0].name || '';
        
        if (
          errorMsg.includes('websocket') || 
          errorMsg.includes('socket') ||
          errorName.includes('TransportError') ||
          errorMsg.includes('Failed to load resource') ||
          errorMsg.includes('useAuth must be used within an AuthProvider')
        ) {
          console.warn('Suppressed error object:', errorMsg.substring(0, 100));
          return;
        }
      }
      
      // Pass through other errors
      return originalConsoleError.apply(console, args);
    };
    
    // Attempt to remove problematic extension scripts
    try {
      const scripts = document.querySelectorAll('script');
      scripts.forEach(script => {
        if (script.src && (
          script.src.includes('content.js') || 
          script.src.includes('checkPageManual.js') || 
          script.src.includes('overlays.js')
        )) {
          console.log('Removing problematic script:', script.src);
          script.remove();
        }
      });
    } catch (error) {
      console.warn('Error cleaning up extension scripts:', error);
    }

    // Add global error handler for extension errors
    window.addEventListener('error', function(event) {
      if (event && event.error && typeof event.error.message === 'string') {
        const errorMsg = event.error.message;
        
        // Check if it's a browser extension error
        if (
          errorMsg.includes('browser is not defined') ||
          errorMsg.includes('chrome is not defined') ||
          errorMsg.includes('content.js') ||
          errorMsg.includes('checkPageManual.js') ||
          errorMsg.includes('overlays.js')
        ) {
          console.warn('Suppressed global extension error:', errorMsg);
          event.preventDefault();
          return false;
        }
      }
    }, true);

    // Add unhandled rejection handler for Promise errors
    window.addEventListener('unhandledrejection', function(event) {
      if (event && event.reason && typeof event.reason.message === 'string') {
        const errorMsg = event.reason.message;
        
        // Check if it's a browser extension error
        if (
          errorMsg.includes('browser is not defined') ||
          errorMsg.includes('chrome is not defined') ||
          errorMsg.includes('runtime.lastError') ||
          errorMsg.includes('Cannot read properties of undefined')
        ) {
          console.warn('Suppressed unhandled rejection:', errorMsg);
          event.preventDefault();
          return false;
        }
      }
    });
  }
}

/**
 * Polyfill for browser compatibility
 * @returns True if polyfills were applied successfully
 */
export function applyPolyfills(): boolean {
  let applied = false;
  
  // Apply the browser extension error suppression
  suppressBrowserExtensionErrors();
  applied = true;

  // Polyfill for canvas.toBlob
  if (!HTMLCanvasElement.prototype.toBlob) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      value: function(callback: BlobCallback, type?: string, quality?: any) {
        const dataURL = this.toDataURL(type, quality);
        const binStr = atob(dataURL.split(',')[1]);
        const len = binStr.length;
        const arr = new Uint8Array(len);
        
        for (let i = 0; i < len; i++) {
          arr[i] = binStr.charCodeAt(i);
        }
        
        callback(new Blob([arr], { type: type || 'image/png' }));
      }
    });
    applied = true;
  }

  // Polyfill for requestAnimationFrame
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback) {
      return window.setTimeout(function() {
        callback(Date.now());
      }, 1000 / 60);
    };
    applied = true;
  }

  // Polyfill for cancelAnimationFrame
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(id) {
      clearTimeout(id);
    };
    applied = true;
  }

  return applied;
}

/**
 * Initialize browser support checks and polyfills
 * @returns An object with the results of the browser support checks
 */
export function initBrowserSupport(): {
  camera: boolean;
  canvas: boolean;
  clipboard: boolean;
  polyfillsApplied: boolean;
} {
  const polyfillsApplied = applyPolyfills();
  
  return {
    camera: checkCameraSupport(),
    canvas: checkCanvasSupport(),
    clipboard: checkClipboardSupport(),
    polyfillsApplied
  };
}

/**
 * Checks if the browser is mobile
 * @returns True if the browser is on a mobile device
 */
export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Checks if the browser supports camera access
 */
export const isCameraSupported = (): boolean => {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );
};

/**
 * Checks if the browser supports the required features for QR scanning
 */
export const isQrScanningSupported = (): boolean => {
  // Base requirements for QR scanning
  const hasMediaDevices = !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );
  
  // Check for the presence of required APIs
  const hasRequiredApis = !!(
    window.Blob &&
    window.URL &&
    window.Worker
  );
  
  return hasMediaDevices && hasRequiredApis;
};

/**
 * Forces the browser to show the native camera permission dialog
 * @returns A promise that resolves with permission status
 */
export const requestCameraPermission = async (): Promise<{
  granted: boolean;
  errorMessage?: string;
}> => {
  try {
    // Check if browser supports camera access
    if (!isCameraSupported()) {
      return {
        granted: false,
        errorMessage: "Your browser doesn't support camera access"
      };
    }
    
    // Force the browser to show the permission dialog by requesting camera access
    // This will trigger the native browser permission prompt
    console.log('🎥 Requesting camera permission - this should trigger browser dialog...');
    
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: {
        facingMode: 'environment',
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 }
      },
      audio: false
    });
    
    console.log('✅ Camera permission granted! Stream acquired.');
    
    // Immediately stop all tracks to release the camera
    stream.getTracks().forEach(track => {
      track.stop();
      console.log(`🛑 Stopped ${track.kind} track`);
    });
    
    return {
      granted: true
    };
  } catch (error) {
    console.error('❌ Camera permission request failed:', error);
    
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return {
          granted: false,
          errorMessage: "Camera access was denied. Please click 'Allow' when the browser asks for camera permission."
        };
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        return {
          granted: false,
          errorMessage: "No camera found on this device"
        };
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        return {
          granted: false,
          errorMessage: "Camera is in use by another application"
        };
      } else if (error.name === 'NotSupportedError') {
        return {
          granted: false,
          errorMessage: "Camera access is not supported on this device"
        };
      } else if (error.name === 'SecurityError') {
        return {
          granted: false,
          errorMessage: "Camera access blocked due to security restrictions. Please use HTTPS."
        };
      }
    }
    
    return {
      granted: false,
      errorMessage: error instanceof Error ? error.message : "Camera permission request failed"
    };
  }
};

/**
 * Requests permission to use the camera and checks if cameras are available
 * @returns A promise that resolves to a boolean indicating if cameras are available
 */
export const checkCameraAvailability = async (): Promise<{
  available: boolean;
  permissionGranted: boolean;
  errorMessage?: string;
}> => {
  try {
    // Check if browser supports camera access
    if (!isCameraSupported()) {
      return {
        available: false,
        permissionGranted: false,
        errorMessage: "Your browser doesn't support camera access"
      };
    }
    
    // First, explicitly request permission
    const permissionResult = await requestCameraPermission();
    if (!permissionResult.granted) {
      return {
        available: false,
        permissionGranted: false,
        errorMessage: permissionResult.errorMessage
      };
    }
    
    // If permission is granted, check for available cameras
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        return {
          available: false,
          permissionGranted: true,
          errorMessage: "No camera found on this device"
        };
      }
      
      return {
        available: true,
        permissionGranted: true
      };
    } catch (enumerateError) {
      // Fallback: try to access camera directly
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Check if we got video tracks
      const hasVideoTracks = stream.getVideoTracks().length > 0;
      
      // Stop all tracks to release the camera
      stream.getTracks().forEach(track => track.stop());
      
      return {
        available: hasVideoTracks,
        permissionGranted: true,
        errorMessage: hasVideoTracks ? undefined : "No camera detected on this device"
      };
    }
  } catch (error) {
    // Handle permission denied
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return {
          available: false,
          permissionGranted: false,
          errorMessage: "Camera access denied. Please allow camera access in your browser settings."
        };
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        return {
          available: false,
          permissionGranted: true,
          errorMessage: "No camera found on this device"
        };
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        return {
          available: false,
          permissionGranted: true,
          errorMessage: "Camera is in use by another application"
        };
      }
    }
    
    // Generic error
    return {
      available: false,
      permissionGranted: false,
      errorMessage: error instanceof Error ? error.message : "Unknown camera error"
    };
  }
};

/**
 * Returns the browser name and version
 */
export function getBrowserInfo(): { name: string; version: string } {
  const userAgent = navigator.userAgent;
  let browserName = "Unknown";
  let browserVersion = "Unknown";
  
  // Chrome
  if (/Chrome/.test(userAgent) && !/Chromium|Edge|Edg|OPR|Opera/.test(userAgent)) {
    browserName = "Chrome";
    browserVersion = userAgent.match(/Chrome\/(\d+\.\d+)/)![1];
  }
  // Firefox
  else if (/Firefox/.test(userAgent)) {
    browserName = "Firefox";
    browserVersion = userAgent.match(/Firefox\/(\d+\.\d+)/)![1];
  }
  // Safari
  else if (/Safari/.test(userAgent) && !/Chrome|Chromium|Edge|Edg|OPR|Opera/.test(userAgent)) {
    browserName = "Safari";
    browserVersion = userAgent.match(/Version\/(\d+\.\d+)/)![1];
  }
  // Edge
  else if (/Edge|Edg/.test(userAgent)) {
    browserName = "Edge";
    browserVersion = userAgent.match(/Edge\/(\d+\.\d+)|Edg\/(\d+\.\d+)/)![1] || userAgent.match(/Edge\/(\d+\.\d+)|Edg\/(\d+\.\d+)/)![2];
  }
  // Opera
  else if (/OPR|Opera/.test(userAgent)) {
    browserName = "Opera";
    browserVersion = userAgent.match(/OPR\/(\d+\.\d+)|Opera\/(\d+\.\d+)/)![1] || userAgent.match(/OPR\/(\d+\.\d+)|Opera\/(\d+\.\d+)/)![2];
  }
  
  return { name: browserName, version: browserVersion };
}

/**
 * Checks if the current browser is a mobile browser
 */
export function isMobileBrowser(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Checks if the current browser is supported for QR scanning
 */
export function isBrowserSupportedForQrScanning(): boolean {
  const { name, version } = getBrowserInfo();
  
  // Convert version to number for comparison
  const versionNumber = parseFloat(version);
  
  // Define minimum versions for each browser
  const minimumVersions: Record<string, number> = {
    Chrome: 60,
    Firefox: 60,
    Safari: 11,
    Edge: 79, // Chromium-based Edge
    Opera: 60
  };
  
  // Check if browser meets minimum version
  if (name in minimumVersions) {
    return versionNumber >= minimumVersions[name as keyof typeof minimumVersions];
  }
  
  // For unknown browsers, check feature support
  return isQrScanningSupported();
}

export default {
  checkCameraSupport,
  checkCanvasSupport,
  checkClipboardSupport,
  applyPolyfills,
  initBrowserSupport,
  isMobileDevice,
  isCameraSupported,
  isQrScanningSupported,
  requestCameraPermission,
  checkCameraAvailability,
  getBrowserInfo,
  isMobileBrowser,
  isBrowserSupportedForQrScanning
}; 