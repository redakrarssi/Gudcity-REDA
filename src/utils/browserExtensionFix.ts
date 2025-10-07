/**
 * Browser Extension Error Suppressor
 * Suppresses harmless errors caused by browser extensions trying to communicate with the page
 */

/**
 * Initialize browser extension error suppression
 * Call this early in your app initialization
 */
export function suppressBrowserExtensionErrors(): void {
  if (typeof window === 'undefined') return;

  // Suppress runtime.lastError from browser extensions
  window.addEventListener('error', (event) => {
    const message = event.message || '';
    
    // Check for browser extension errors
    const isExtensionError = 
      message.includes('runtime.lastError') ||
      message.includes('Could not establish connection') ||
      message.includes('Receiving end does not exist') ||
      message.includes('Extension context invalidated') ||
      message.includes('chrome.runtime') ||
      message.includes('browser.runtime');

    if (isExtensionError) {
      // Prevent the error from being logged
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      
      // Optional: Log suppressed errors in development
      if (import.meta.env.DEV) {
        console.debug('[Suppressed] Browser extension error:', message);
      }
      
      return false;
    }
  }, true); // Use capture phase

  // Suppress unhandled promise rejections from extensions
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || event.reason || '';
    const reasonStr = String(reason);
    
    const isExtensionError =
      reasonStr.includes('runtime.lastError') ||
      reasonStr.includes('Extension context') ||
      reasonStr.includes('chrome.runtime') ||
      reasonStr.includes('browser.runtime');

    if (isExtensionError) {
      event.preventDefault();
      event.stopPropagation();
      
      if (import.meta.env.DEV) {
        console.debug('[Suppressed] Browser extension rejection:', reasonStr);
      }
      
      return false;
    }
  });

  // Suppress console errors from extensions (optional - be careful with this)
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    
    const isExtensionError =
      message.includes('runtime.lastError') ||
      message.includes('Extension context') ||
      message.includes('chrome.runtime') ||
      message.includes('browser.runtime');

    if (!isExtensionError) {
      originalConsoleError.apply(console, args);
    } else if (import.meta.env.DEV) {
      console.debug('[Suppressed Error]', ...args);
    }
  };

  console.log('✅ Browser extension error suppression initialized');
}

/**
 * Check if an error is from a browser extension
 */
export function isBrowserExtensionError(error: Error | string): boolean {
  const message = typeof error === 'string' ? error : error.message;
  
  return (
    message.includes('runtime.lastError') ||
    message.includes('Could not establish connection') ||
    message.includes('Receiving end does not exist') ||
    message.includes('Extension context invalidated') ||
    message.includes('chrome.runtime') ||
    message.includes('browser.runtime')
  );
}

export default suppressBrowserExtensionErrors;

