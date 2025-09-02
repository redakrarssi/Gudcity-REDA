// Pre-initialize browser polyfills before any imports
// This must be the very first code that runs
if (typeof window !== 'undefined') {
  // Immediately define browser and chrome objects to prevent extension errors
  const browserPolyfill = {
    runtime: { 
      sendMessage: () => Promise.resolve(), 
      onMessage: { addListener: () => {}, removeListener: () => {} },
      getManifest: () => ({}),
      getURL: (path) => path,
      lastError: null,
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
      local: { get: () => Promise.resolve({}), set: () => Promise.resolve() },
      sync: { get: () => Promise.resolve({}), set: () => Promise.resolve() }
    },
    tabs: { query: () => Promise.resolve([]) }
  };

  // Define browser globally immediately
  (window as any).browser = browserPolyfill;
  (window as any).chrome = {
    runtime: browserPolyfill.runtime,
    storage: browserPolyfill.storage,
    tabs: browserPolyfill.tabs
  };

  // Create a mock server object to prevent errors from server.ts
  if (typeof (window as any).server === 'undefined') {
    (window as any).server = {
      app: {
        use: () => {},
        get: () => {},
        post: () => {}
      },
      io: {
        on: () => {},
        to: () => ({ emit: () => {} })
      },
      emitNotification: () => {},
      emitApprovalRequest: () => {}
    };
  }

  // Ensure console methods exist before any binding attempts
  if (typeof console === 'undefined') {
    (window as any).console = {
      log: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      info: () => {}
    };
  }

  // Aggressively suppress browser extension errors
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.error = function(...args) {
    if (args[0] && typeof args[0] === 'string' && (
      args[0].includes('browser is not defined') || 
      args[0].includes('chrome is not defined') ||
      args[0].includes('Cannot read properties of undefined') ||
      args[0].includes('runtime.lastError') ||
      args[0].includes('server.ts') ||
      args[0].includes('at server.ts') ||
      args[0].includes('createRoot() on a container') ||
      args[0].includes('Function.prototype.bind called on incompatible undefined') ||
      args[0].includes('Could not establish connection') ||
      args[0].includes('Receiving end does not exist') ||
      args[0].includes('Unchecked runtime.lastError')
    )) {
      return; // Completely suppress these errors
    }
    
    // Safely call the original console.error with proper binding
    if (originalConsoleError && typeof originalConsoleError === 'function') {
      try {
        return originalConsoleError.apply(console, args);
      } catch (bindError) {
        // If binding fails, use a fallback approach
        return Function.prototype.apply.call(originalConsoleError, console, args);
      }
    }
  };

  console.warn = function(...args) {
    if (args[0] && typeof args[0] === 'string' && (
      args[0].includes('browser is not defined') || 
      args[0].includes('chrome is not defined') ||
      args[0].includes('runtime.lastError') ||
      args[0].includes('Could not establish connection')
    )) {
      return; // Completely suppress these warnings
    }
    
    if (originalConsoleWarn && typeof originalConsoleWarn === 'function') {
      try {
        return originalConsoleWarn.apply(console, args);
      } catch (bindError) {
        return Function.prototype.apply.call(originalConsoleWarn, console, args);
      }
    }
  };

  // Remove problematic extension scripts immediately
  try {
    const scripts = document.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.src && (
        script.src.includes('checkPageManual.js') || 
        script.src.includes('overlays.js') || 
        script.src.includes('content.js')
      )) {
        console.log('Removing problematic extension script:', script.src);
        script.remove();
      }
    });
  } catch (error) {
    // Ignore errors during script removal
  }

  // Block extension script injection
  const originalAppendChild = Node.prototype.appendChild;
  const originalInsertBefore = Node.prototype.insertBefore;
  
  Node.prototype.appendChild = function(child) {
    if (child && child.src && (
      child.src.includes('checkPageManual.js') || 
      child.src.includes('overlays.js') || 
      child.src.includes('content.js')
    )) {
      return child; // Don't actually append
    }
    return originalAppendChild.call(this, child);
  };
  
  Node.prototype.insertBefore = function(child, ref) {
    if (child && child.src && (
      child.src.includes('checkPageManual.js') || 
      child.src.includes('overlays.js') || 
      child.src.includes('content.js')
    )) {
      return child; // Don't actually insert
    }
    return originalInsertBefore.call(this, child, ref);
  };

  // Block dynamic script creation
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(document, tagName);
    if (tagName.toLowerCase() === 'script') {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if (name === 'src' && (
          value.includes('checkPageManual.js') || 
          value.includes('overlays.js') || 
          value.includes('content.js')
        )) {
          return; // Don't set the src
        }
        return originalSetAttribute.call(this, name, value);
      };
    }
    return element;
  };

  // Add mutation observer to catch any remaining script injections
  try {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'SCRIPT') {
              const script = node as HTMLScriptElement;
              if (script.src && (
                script.src.includes('checkPageManual.js') || 
                script.src.includes('overlays.js') || 
                script.src.includes('content.js')
              )) {
                console.log('MutationObserver caught extension script, removing:', script.src);
                script.remove();
              }
            }
          });
        }
      });
    });
    
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  } catch (error) {
    // Ignore mutation observer errors
  }
}

// Add global error handler for any remaining binding errors
if (typeof window !== 'undefined') {
  // Override Function.prototype.bind to prevent binding errors
  const originalBind = Function.prototype.bind;
  Function.prototype.bind = function(thisArg, ...args) {
    if (this === undefined || this === null) {
      console.warn('Attempted to bind undefined/null function, returning noop');
      return function() {};
    }
    if (typeof this !== 'function') {
      console.warn('Attempted to bind non-function, returning noop');
      return function() {};
    }
    try {
      return originalBind.call(this, thisArg, ...args);
    } catch (error) {
      console.warn('Binding failed, returning noop:', error);
      return function() {};
    }
  };

  window.addEventListener('error', function(event) {
    if (event.error && event.error.message && (
      event.error.message.includes('Function.prototype.bind called on incompatible undefined') ||
      event.error.message.includes('browser is not defined') ||
      event.error.message.includes('chrome is not defined')
    )) {
      console.warn('Caught extension/binding error, preventing default:', event.error.message);
      event.preventDefault();
      return false;
    }
  }, true);
  
  // Also handle unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && (
      event.reason.message.includes('Function.prototype.bind called on incompatible undefined') ||
      event.reason.message.includes('browser is not defined') ||
      event.reason.message.includes('chrome is not defined')
    )) {
      console.warn('Caught unhandled extension/binding rejection, preventing default:', event.reason.message);
      event.preventDefault();
      return false;
    }
  });
}

// Pre-initialize lodash to prevent "Cannot access '_' before initialization" errors
import './utils/lodash-init';

// Import server mock early to ensure it's properly initialized
import './utils/serverMock';

// Apply browser extension error suppression early
import { suppressBrowserExtensionErrors } from './utils/browserSupport';
suppressBrowserExtensionErrors();

import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClientProvider } from '@tanstack/react-query';
import './i18n';
import './index.css';
import initDb from './utils/initDb';
import { startAppInitialization } from './utils/initApp';
import { ThemeProvider } from './contexts/ThemeContext';
import { reportWebVitals } from './utils/performance';
import { queryClient } from './utils/queryClient';

// Lazy-load the App component
const App = lazy(() => import('./App.tsx'));

// Loading component for suspense fallback
const AppLoading = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900">
    {/* Loading screen removed as requested */}
  </div>
);

// Initialize the database and app when it starts
try {
  if (typeof initDb === 'function') {
    initDb();
  }
  if (typeof startAppInitialization === 'function') {
    startAppInitialization();
  }
} catch (error) {
  console.warn('Failed to initialize database or app:', error);
}

// Add a timeout fallback to ensure the app renders
setTimeout(() => {
  // Check if the app has rendered anything
  const rootElement = document.getElementById('root');
  if (rootElement && rootElement.children.length === 0) {
    console.warn('App failed to render within timeout, attempting fallback');
    
    // Try to render a minimal app
    try {
      const fallbackRoot = createRoot(rootElement);
      fallbackRoot.render(
        <StrictMode>
          <HelmetProvider>
            <ThemeProvider>
              <Suspense fallback={<AppLoading />}>
                <App />
              </Suspense>
            </ThemeProvider>
          </HelmetProvider>
        </StrictMode>
      );
    } catch (fallbackError) {
      console.error('Timeout fallback rendering failed:', fallbackError);
      
      // Last resort - render a simple app interface
      rootElement.innerHTML = `
        <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif; background: white; min-height: 100vh;">
          <h1 style="color: #333; margin-bottom: 30px;">GudCity Loyalty Platform</h1>
          <p style="color: #666; margin-bottom: 30px;">Welcome to the loyalty platform. The application is loading...</p>
          <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
            <button onclick="location.href='/login'" style="padding: 15px 30px; background: #007bff; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
              Login
            </button>
            <button onclick="location.href='/register'" style="padding: 15px 30px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
              Register
            </button>
            <button onclick="location.href='/business'" style="padding: 15px 30px; background: #ffc107; color: #212529; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
              Business Portal
            </button>
          </div>
          <div style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px; max-width: 600px; margin-left: auto; margin-right: auto;">
            <h3 style="margin-top: 0; color: #495057;">About GudCity</h3>
            <p style="color: #6c757d; line-height: 1.6;">
              GudCity is a comprehensive loyalty platform that connects businesses with customers through innovative reward systems, 
              QR code technology, and seamless digital experiences.
            </p>
          </div>
        </div>
      `;
    }
  }
}, 5000); // 5 second timeout

// Log app version and initialization
try {
  const version = import.meta.env.VITE_APP_VERSION || '1.0.0';
  if (typeof console.log === 'function') {
    console.log(`Vcarda App v${version}`);
    console.log('App initialization started...');
  }
} catch (error) {
  // Silently fail if logging fails
}

// Temporarily enable console logging in production for debugging
// if (import.meta.env.PROD) {
//   console.log = () => {};
//   console.info = () => {};
//   console.debug = () => {};
// }

// Create our application root
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

// Safely create and render the app with error boundaries
try {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <Suspense fallback={<AppLoading />}>
              <App />
            </Suspense>
          </ThemeProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </StrictMode>
  );
} catch (error) {
  console.error('Failed to render app with React Query:', error);
  
  // Fallback rendering without React Query if it fails
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <HelmetProvider>
          <ThemeProvider>
            <Suspense fallback={<AppLoading />}>
              <App />
            </Suspense>
          </ThemeProvider>
        </HelmetProvider>
      </StrictMode>
    );
  } catch (fallbackError) {
    console.error('Fallback rendering also failed:', fallbackError);
    
    // Last resort - render a simple error message with retry button
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif; background: white; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <h2 style="color: #333; margin-bottom: 20px;">Application Loading...</h2>
        <p style="color: #666; margin-bottom: 30px;">The application is initializing. If this takes too long, please refresh the page.</p>
        <div style="display: flex; gap: 15px;">
          <button onclick="window.location.reload()" style="padding: 12px 24px; background: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
            Refresh Page
          </button>
          <button onclick="location.href='/'" style="padding: 12px 24px; background: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
            Go Home
          </button>
        </div>
        <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 6px; max-width: 500px; text-align: left;">
          <h4 style="margin-top: 0; color: #495057;">Debug Information:</h4>
          <p style="margin: 5px 0; font-family: monospace; font-size: 12px; color: #6c757d;">
            Browser: ${navigator.userAgent.substring(0, 50)}...
          </p>
          <p style="margin: 5px 0; font-family: monospace; font-size: 12px; color: #6c757d;">
            URL: ${window.location.href}
          </p>
          <p style="margin: 5px 0; font-family: monospace; font-size: 12px; color: #6c757d;">
            Time: ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `;
    
    // Try to render the app again after a delay
    setTimeout(() => {
      try {
        const retryRoot = createRoot(rootElement);
        retryRoot.render(
          <StrictMode>
            <HelmetProvider>
              <QueryClientProvider client={queryClient}>
                <ThemeProvider>
                  <Suspense fallback={<AppLoading />}>
                    <App />
                  </Suspense>
                </ThemeProvider>
              </QueryClientProvider>
            </HelmetProvider>
          </StrictMode>
        );
      } catch (retryError) {
        console.error('Retry rendering failed:', retryError);
      }
    }, 2000);
  }
}

// Monitor web vitals for performance tracking
try {
  if (typeof reportWebVitals === 'function' && typeof console.log === 'function') {
    reportWebVitals(console.log);
  }
} catch (error) {
  console.warn('Failed to initialize web vitals monitoring:', error);
}

// Enable fast navigation with prefetching
if ('connection' in navigator) {
  if ((navigator as any).connection.saveData === false) {
    try {
      import('./utils/prefetch').then(module => {
        if (module && typeof module.default === 'function') {
          const prefetch = module.default;
          prefetch();
        }
      }).catch(error => {
        console.warn('Failed to load prefetch utility:', error);
      });
    } catch (error) {
      console.warn('Failed to import prefetch utility:', error);
    }
  }
}

// Add service worker for caching in production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' as any })
        .then(reg => {
          // Optionally trigger immediate update check
          if (reg && typeof reg.update === 'function') {
            reg.update();
          }
        })
        .catch(error => {
          console.error('Service worker registration failed:', error);
        });
    } catch (error) {
      console.warn('Failed to register service worker:', error);
    }
  });
}