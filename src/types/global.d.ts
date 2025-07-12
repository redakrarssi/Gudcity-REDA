/**
 * Global TypeScript declarations
 */

interface Window {
  awardPointsDirectly: (
    customerId: string | number, 
    programId: string | number, 
    points: number, 
    description?: string
  ) => Promise<{
    success: boolean;
    data?: any;
    error?: string;
    attempts?: number;
  }>;

  diagnosePossibleFixes: () => Promise<{
    authToken: {
      found: boolean;
      tokenStart: string | null;
    };
    endpoint: {
      standardPost: boolean;
      fallbackPost: boolean;
      alternateEndpoint: boolean;
      serverResponse: any;
      optionsStatus?: number;
      optionsOk?: boolean;
      allowedMethods?: string;
      corsHeaders?: Record<string, string | null>;
    };
    browserDetails: {
      userAgent: string;
      cookiesEnabled: boolean;
    };
  }>;

  gudcityHelpers: {
    awardPoints: (
      customerId: string | number, 
      programId: string | number, 
      points: number, 
      description?: string
    ) => Promise<{
      success: boolean;
      data?: any;
      error?: string;
    }>;
  };

  // Browser polyfill declarations
  browser?: {
    runtime?: { 
      sendMessage?: (...args: any[]) => Promise<any>;
      onMessage?: { 
        addListener?: (callback: (...args: any[]) => void) => void; 
        removeListener?: (callback: (...args: any[]) => void) => void;
      };
    };
    tabs?: { query?: (...args: any[]) => Promise<any> };
    storage?: { 
      local?: { get?: (...args: any[]) => Promise<any>; set?: (...args: any[]) => Promise<any> };
      sync?: { get?: (...args: any[]) => Promise<any>; set?: (...args: any[]) => Promise<any> };
    };
    lastError?: any;
  };
  
  chrome?: any;
  __CONTENT_SCRIPT_HOST__?: boolean;
  __BROWSER_POLYFILL__?: boolean;
  __POLYFILL_LOADER_EXECUTED__?: boolean;
} 