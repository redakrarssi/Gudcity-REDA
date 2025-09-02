/**
 * Browser API polyfill for cross-browser compatibility
 * This provides a consistent browser API across environments
 */

// TypeScript declaration for Chrome API
declare const chrome: {
  runtime?: {
    sendMessage: (...args: any[]) => any;
    onMessage: {
      addListener: (callback: Function) => void;
      removeListener: (callback: Function) => void;
    };
    getURL: (path: string) => string;
    lastError: any;
  };
  storage?: {
    local: {
      get: (keys: string | string[] | object | null) => Promise<any>;
      set: (items: object) => Promise<void>;
    }
  }
};

// Safe function to check if a property exists and is a function
const safeCall = (obj: any, path: string[], ...args: any[]) => {
  try {
    let current = obj;
    for (const key of path) {
      if (current === undefined || current === null) return null;
      current = current[key];
    }
    
    if (typeof current === 'function') {
      return current.apply(obj, args);
    }
    return null;
  } catch (error) {
    console.warn(`Error accessing ${path.join('.')}:`, error);
    return null;
  }
};

// Define a global browser object for extension compatibility
const browserPolyfill = {
  // Basic extension API structure
  runtime: {
    sendMessage: (...args: any[]) => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          return chrome.runtime.sendMessage(...args);
        } catch (error) {
          console.warn('Error in browser.runtime.sendMessage:', error);
          return Promise.resolve(null);
        }
      }
      console.warn('Browser runtime API not available');
      return Promise.resolve(null);
    },
    onMessage: {
      addListener: (callback: Function) => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
          try {
            chrome.runtime.onMessage.addListener(callback);
          } catch (error) {
            console.warn('Error in browser.runtime.onMessage.addListener:', error);
          }
        }
      },
      removeListener: (callback: Function) => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
          try {
            chrome.runtime.onMessage.removeListener(callback);
          } catch (error) {
            console.warn('Error in browser.runtime.onMessage.removeListener:', error);
          }
        }
      }
    },
    getURL: (path: string) => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          return chrome.runtime.getURL(path);
        } catch (error) {
          console.warn('Error in browser.runtime.getURL:', error);
          return path;
        }
      }
      return path; // Fallback to relative path
    },
    // Add lastError property to prevent "Cannot read properties of undefined" errors
    lastError: null
  },
  
  // Storage API
  storage: {
    local: {
      get: (keys: string | string[] | object | null) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          try {
            return chrome.storage.local.get(keys);
          } catch (error) {
            console.warn('Error in browser.storage.local.get:', error);
            return Promise.resolve({});
          }
        }
        return Promise.resolve({});
      },
      set: (items: object) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          try {
            return chrome.storage.local.set(items);
          } catch (error) {
            console.warn('Error in browser.storage.local.set:', error);
            return Promise.resolve();
          }
        }
        return Promise.resolve();
      }
    }
  }
};

// Export as both a named export and default
export const browser = browserPolyfill;

// Define browser globally if it doesn't exist
if (typeof window !== 'undefined') {
  try {
    if (typeof (window as any).browser === 'undefined') {
      (window as any).browser = browserPolyfill;
      console.log('Browser polyfill applied from TypeScript module');
    } else {
      // Ensure all required properties exist on the existing browser object
      if (!(window as any).browser.runtime) {
        (window as any).browser.runtime = browserPolyfill.runtime;
      }
      if (!(window as any).browser.storage) {
        (window as any).browser.storage = browserPolyfill.storage;
      }
      // Ensure lastError exists to prevent errors
      if (!(window as any).browser.runtime.lastError) {
        (window as any).browser.runtime.lastError = null;
      }
    }
  } catch (error) {
    console.warn('Error setting up browser polyfill in window:', error);
  }
}

export default browserPolyfill; 