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
 * Polyfill for browser compatibility
 * @returns True if polyfills were applied successfully
 */
export function applyPolyfills(): boolean {
  let applied = false;

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

export default {
  checkCameraSupport,
  checkCanvasSupport,
  checkClipboardSupport,
  applyPolyfills,
  initBrowserSupport,
  isMobileDevice
}; 