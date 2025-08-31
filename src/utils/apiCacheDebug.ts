// API Cache Debugging Utility
// Following reda.md rules - utility file for debugging API cache issues

export interface CacheDebugInfo {
  hasCachedData: boolean;
  cacheTimestamp: string | null;
  cacheDataSize: number;
  apiUrl: string;
  lastError: string | null;
  requestCount: number;
}

export class ApiCacheDebugger {
  private static instance: ApiCacheDebugger;
  private requestLog: Array<{
    timestamp: string;
    url: string;
    status: number;
    method: string;
    cached: boolean;
  }> = [];

  static getInstance(): ApiCacheDebugger {
    if (!ApiCacheDebugger.instance) {
      ApiCacheDebugger.instance = new ApiCacheDebugger();
    }
    return ApiCacheDebugger.instance;
  }

  logRequest(url: string, status: number, method: string = 'GET', cached: boolean = false) {
    this.requestLog.push({
      timestamp: new Date().toISOString(),
      url,
      status,
      method,
      cached
    });
    
    // Keep only last 20 requests
    if (this.requestLog.length > 20) {
      this.requestLog = this.requestLog.slice(-20);
    }
    
    console.log(`🔍 API Debug: ${method} ${url} → ${status} ${cached ? '(cached)' : '(fresh)'}`);
  }

  getCacheInfo(cacheKey: string): CacheDebugInfo {
    const cachedData = localStorage.getItem(cacheKey);
    const lastError = localStorage.getItem(`${cacheKey}_error`);
    
    let cacheTimestamp = null;
    let cacheDataSize = 0;
    
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        cacheTimestamp = parsed.timestamp || 'Unknown';
        cacheDataSize = new Blob([cachedData]).size;
      } catch (e) {
        console.error('Error parsing cache data:', e);
      }
    }

    return {
      hasCachedData: !!cachedData,
      cacheTimestamp,
      cacheDataSize,
      apiUrl: window.location.origin,
      lastError,
      requestCount: this.requestLog.length
    };
  }

  getRequestHistory() {
    return [...this.requestLog];
  }

  clearCache(cacheKey: string) {
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(`${cacheKey}_error`);
    console.log(`🗑️ Cleared cache for: ${cacheKey}`);
  }

  logError(error: string, cacheKey?: string) {
    console.error(`❌ API Error: ${error}`);
    if (cacheKey) {
      localStorage.setItem(`${cacheKey}_error`, error);
    }
  }

  exportDebugInfo(): string {
    const info = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      requestHistory: this.requestLog,
      localStorage: {
        length: localStorage.length,
        keys: Object.keys(localStorage).filter(key => key.includes('admin_businesses'))
      }
    };
    
    return JSON.stringify(info, null, 2);
  }
}

// Singleton instance
export const apiCacheDebugger = ApiCacheDebugger.getInstance();

// Helper function for React components
export const useApiDebugInfo = (cacheKey: string) => {
  return {
    getCacheInfo: () => apiCacheDebugger.getCacheInfo(cacheKey),
    clearCache: () => apiCacheDebugger.clearCache(cacheKey),
    exportDebugInfo: () => apiCacheDebugger.exportDebugInfo(),
    getRequestHistory: () => apiCacheDebugger.getRequestHistory()
  };
};
