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
  if (typeof window !== 'undefined' && !window.browser) {
    console.log('Setting up browser extension error suppression');
    
    // Create a minimal browser object with common APIs
    window.browser = {
      runtime: { 
        sendMessage: () => Promise.resolve(), 
        onMessage: { 
          addListener: () => {}, 
          removeListener: () => {} 
        },
        getManifest: () => ({}),
        getURL: (path) => path,
        connect: () => ({ 
          onDisconnect: { addListener: () => {} },
          postMessage: () => {},
          disconnect: () => {}
        }),
        onConnect: { addListener: () => {} },
        onInstalled: { addListener: () => {} },
        id: "dummy-extension-id"
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
      console.error('Error cleaning up extension scripts:', error);
    }
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
    
    // Request camera permission
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
  } catch (error) {
    // Handle permission denied
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return {
          available: false,
          permissionGranted: false,
          errorMessage: "Camera access denied"
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
  checkCameraAvailability,
  getBrowserInfo,
  isMobileBrowser,
  isBrowserSupportedForQrScanning
}; 