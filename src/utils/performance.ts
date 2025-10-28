// Fallback implementation of web-vitals
// This provides a basic implementation when the real package is not available

// Types to match web-vitals API
export interface Metric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

// Custom type definitions for PerformanceEntry types
interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}

interface FirstInputEntry extends PerformanceEntry {
  processingStart: number;
  startTime: number;
}

// Helper to create a basic metric object
const createMetric = (name: string, value: number): Metric => ({
  name,
  value,
  rating: value < 100 ? 'good' : value < 300 ? 'needs-improvement' : 'poor',
  delta: 0,
  id: Math.random().toString(36).slice(2)
});

// Basic implementation of core web vitals metrics
export const getCLS = (onReport: (metric: Metric) => void): void => {
  // Simplified Layout Shift detection
  let cls = 0;
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Cast to custom type with hadRecentInput property
        const layoutShift = entry as unknown as LayoutShiftEntry;
        if (!layoutShift.hadRecentInput) {
          cls += layoutShift.value;
        }
      }
      onReport(createMetric('CLS', cls * 1000));
    });
    
    if (PerformanceObserver.supportedEntryTypes.includes('layout-shift')) {
      observer.observe({ type: 'layout-shift', buffered: true });
    }
  } catch (e) {
    // Fallback for browsers without support
    setTimeout(() => onReport(createMetric('CLS', 0)), 2000);
  }
};

export const getFID = (onReport: (metric: Metric) => void): void => {
  // First Input Delay
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        // Cast to custom type with processingStart property
        const firstInput = entries[0] as unknown as FirstInputEntry;
        const delay = firstInput.processingStart ? 
          firstInput.processingStart - firstInput.startTime : 0;
        onReport(createMetric('FID', delay));
      }
    });
    
    if (PerformanceObserver.supportedEntryTypes.includes('first-input')) {
      observer.observe({ type: 'first-input', buffered: true });
    }
  } catch (e) {
    // Fallback for browsers without support
    setTimeout(() => onReport(createMetric('FID', 0)), 2000);
  }
};

export const getLCP = (onReport: (metric: Metric) => void): void => {
  // Largest Contentful Paint
  try {
    let lcp = 0;
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      lcp = lastEntry.startTime;
      onReport(createMetric('LCP', lcp));
    });
    
    if (PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) {
      observer.observe({ type: 'largest-contentful-paint', buffered: true });
    }
  } catch (e) {
    // Fallback for browsers without support
    setTimeout(() => onReport(createMetric('LCP', 0)), 2000);
  }
};

export const getFCP = (onReport: (metric: Metric) => void): void => {
  // First Contentful Paint
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        const fcp = entries[0].startTime;
        onReport(createMetric('FCP', fcp));
      }
    });
    
    if (PerformanceObserver.supportedEntryTypes.includes('paint')) {
      observer.observe({ type: 'paint', buffered: true });
    }
  } catch (e) {
    // Fallback for browsers without support
    setTimeout(() => onReport(createMetric('FCP', 0)), 2000);
  }
};

export const getTTFB = (onReport: (metric: Metric) => void): void => {
  // Time to First Byte - using Navigation Timing API
  try {
    if (performance && performance.getEntriesByType) {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navEntry) {
        const ttfb = navEntry.responseStart;
        onReport(createMetric('TTFB', ttfb));
      }
    }
  } catch (e) {
    // Fallback for browsers without support
    setTimeout(() => onReport(createMetric('TTFB', 0)), 2000);
  }
};

/**
 * Reports Web Vitals metrics to the provided callback
 * @param onReport Callback to handle the reported metrics
 */
export function reportWebVitals(onReport: (metric: Metric) => void): void {
  // Core Web Vitals
  getCLS(onReport);  // Cumulative Layout Shift
  getFID(onReport);  // First Input Delay
  getLCP(onReport);  // Largest Contentful Paint
  
  // Additional metrics
  getFCP(onReport);  // First Contentful Paint
  getTTFB(onReport); // Time to First Byte
}

/**
 * Logs Web Vitals metrics to console in a formatted way
 * (Only used in development)
 */
export function logWebVitals(): void {
  if (import.meta.env.DEV) {
    reportWebVitals(metric => {
      const { name, value, rating } = metric;
      const emoji = 
        rating === 'good' ? '✅' : 
        rating === 'needs-improvement' ? '⚠️' : 
        '❌';
        
      console.log(`${emoji} ${name}: ${value.toFixed(2)}`);
    });
  }
}

/**
 * Observer for monitoring long tasks
 * Used to detect JS execution that blocks the main thread
 */
export function observeLongTasks(): void {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }

  try {
    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        // Log long tasks (over 50ms) in development
        if (import.meta.env.DEV && entry.duration > 50) {
          console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`);
        }
      });
    });
    
    if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      observer.observe({ entryTypes: ['longtask'] });
    }
  } catch (e) {
    console.error('Long task observation not supported');
  }
}

/**
 * Measures a custom performance metric
 * 
 * @param name Name of the metric
 * @param callback Function to measure
 * @returns The result of the callback
 */
export function measure<T>(name: string, callback: () => T): T {
  if (typeof performance === 'undefined' || typeof performance.mark !== 'function') {
    return callback();
  }

  const startMark = `${name}_start`;
  const endMark = `${name}_end`;
  
  performance.mark(startMark);
  const result = callback();
  performance.mark(endMark);
  
  try {
    performance.measure(name, startMark, endMark);
    if (import.meta.env.DEV) {
      const entries = performance.getEntriesByName(name);
      if (entries.length > 0) {
        console.log(`⏱️ ${name}: ${entries[0].duration.toFixed(2)}ms`);
      }
    }
  } catch (e) {
    console.error(`Error measuring ${name}:`, e);
  }
  
  return result;
}

export default {
  reportWebVitals,
  logWebVitals,
  observeLongTasks,
  measure
}; 