/**
 * Utility for prefetching routes for faster navigation
 * This will preload JavaScript chunks and other assets for popular routes
 */

// Define common routes that should be prefetched
const ROUTES_TO_PREFETCH = [
  '/dashboard',
  '/profile',
  '/qr-scanner',
  '/loyalty-program',
  '/settings',
];

/**
 * Prefetches JavaScript chunks and other assets for common routes
 * Only runs if the user has good network conditions
 */
export default function prefetch(): void {
  // Don't prefetch if the browser doesn't support it or if the user is on a slow connection
  if (!('connection' in navigator) || !document.createElement('link').relList.supports('prefetch')) {
    return;
  }

  // Check connection type to avoid wasting bandwidth on slow connections
  const connection = (navigator as any).connection;
  if (connection && (connection.saveData || /2g/.test(connection.effectiveType))) {
    console.log('Prefetching disabled to save data');
    return;
  }

  // Queue prefetching to happen after the page has loaded
  setTimeout(() => {
    ROUTES_TO_PREFETCH.forEach(route => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = route;
      link.as = 'document';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      
      if (import.meta.env.DEV) {
        console.log(`Prefetched: ${route}`);
      }
    });
  }, 2000); // Delay prefetching to prioritize initial page load
}

/**
 * Prefetches a specific asset (script, style, image)
 * 
 * @param url URL of the asset to prefetch
 * @param type Asset type (script, style, image)
 */
export function prefetchAsset(url: string, type: 'script' | 'style' | 'image'): void {
  if (!document.createElement('link').relList.supports('prefetch')) {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  link.as = type;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
  
  if (import.meta.env.DEV) {
    console.log(`Prefetched asset: ${url}`);
  }
}

/**
 * Preconnect to external domains to speed up future requests
 * 
 * @param domain Domain to preconnect to
 * @param crossOrigin Whether to include credentials
 */
export function preconnect(domain: string, crossOrigin: boolean = true): void {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = domain;
  if (crossOrigin) {
    link.crossOrigin = 'anonymous';
  }
  document.head.appendChild(link);
} 