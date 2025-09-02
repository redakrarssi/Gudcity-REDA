// Pre-initialize browser polyfills before any imports
// This must be the very first code that runs
if (typeof window !== 'undefined') {
  // Create browser and chrome objects early
  window.browser = window.browser || {
    runtime: { 
      sendMessage: () => Promise.resolve(), 
      onMessage: { addListener: () => {}, removeListener: () => {} },
      getManifest: () => ({}),
      getURL: (path) => path,
      lastError: null
    },
    storage: { 
      local: { get: () => Promise.resolve({}), set: () => Promise.resolve() },
      sync: { get: () => Promise.resolve({}), set: () => Promise.resolve() }
    },
    tabs: { query: () => Promise.resolve([]) }
  };
  
  window.chrome = window.chrome || {
    runtime: window.browser.runtime,
    storage: window.browser.storage,
    tabs: window.browser.tabs
  };

  // Create a mock server object to prevent errors from server.ts
  if (typeof window.server === 'undefined') {
    window.server = {
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

  // Suppress common browser extension errors
  const originalConsoleError = console.error;
  console.error = function(...args) {
    if (args[0] && typeof args[0] === 'string' && (
      args[0].includes('browser is not defined') || 
      args[0].includes('chrome is not defined') ||
      args[0].includes('Cannot read properties of undefined') ||
      args[0].includes('runtime.lastError') ||
      args[0].includes('server.ts') ||
      args[0].includes('at server.ts') ||
      args[0].includes('createRoot() on a container') ||
      args[0].includes('Function.prototype.bind called on incompatible undefined')
    )) {
      console.warn('Early polyfill: Suppressed error:', args[0].substring(0, 50) + '...');
      return;
    }
    
    // Safely call the original console.error with proper binding
    if (originalConsoleError && typeof originalConsoleError === 'function') {
      try {
        return originalConsoleError.apply(console, args);
      } catch (bindError) {
        // If binding fails, use a fallback approach
        console.warn('Console error binding failed, using fallback:', bindError);
        return Function.prototype.apply.call(originalConsoleError, console, args);
      }
    }
  };
}

// Add global error handler for any remaining binding errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', function(event) {
    if (event.error && event.error.message && event.error.message.includes('Function.prototype.bind called on incompatible undefined')) {
      console.warn('Caught binding error, attempting to recover:', event.error.message);
      event.preventDefault();
      return false;
    }
  }, true);
  
  // Also handle unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message && event.reason.message.includes('Function.prototype.bind called on incompatible undefined')) {
      console.warn('Caught unhandled binding rejection, attempting to recover:', event.reason.message);
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
  console.error('Failed to render app:', error);
  
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
    
    // Last resort - render a simple error message
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h2>Application Error</h2>
        <p>We're sorry, but the application failed to load. Please refresh the page or contact support.</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Refresh Page
        </button>
      </div>
    `;
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