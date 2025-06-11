import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClientProvider } from '@tanstack/react-query';
import './i18n';
import './index.css';
import initDb from './utils/initDb';
import { ThemeProvider } from './contexts/ThemeContext';
import { reportWebVitals } from './utils/performance';
import { queryClient } from './utils/queryClient';

// Lazy-load the App component
const App = lazy(() => import('./App.tsx'));

// Loading component for suspense fallback
const AppLoading = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="mt-4 text-gray-600 dark:text-gray-300">Loading Gudcity...</p>
    </div>
  </div>
);

// Initialize the database when the app starts
initDb();

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