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
      args[0].includes('createRoot() on a container')
    )) {
      console.warn('Early polyfill: Suppressed error:', args[0].substring(0, 50) + '...');
      return;
    }
    return originalConsoleError.apply(console, args);
  };
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
initDb();
startAppInitialization();

// Log app version and initialization
console.log(`Gudcity App v${import.meta.env.VITE_APP_VERSION || '1.0.0'}`);
console.log('App initialization started...');

// Temporarily enable console logging in production for debugging
// if (import.meta.env.PROD) {
//   console.log = () => {};
//   console.info = () => {};
//   console.debug = () => {};
// }

// Create our application root
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

// Create and render the app with performance optimizations
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

// Monitor web vitals for performance tracking
reportWebVitals(console.log);

// Enable fast navigation with prefetching
if ('connection' in navigator) {
  if ((navigator as any).connection.saveData === false) {
    import('./utils/prefetch').then(module => {
      const prefetch = module.default;
      prefetch();
    });
  }
}

// Add service worker for caching in production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.error('Service worker registration failed:', error);
    });
  });
}