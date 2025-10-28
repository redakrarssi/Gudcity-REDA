/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATABASE_URL: string;
  // add more env variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Declare browser global for WebExtension compatibility
interface Window {
  browser?: {
    runtime?: {
      sendMessage?: (...args: any[]) => Promise<any>;
      onMessage?: { 
        addListener?: (callback: (...args: any[]) => void) => void;
        removeListener?: (callback: (...args: any[]) => void) => void;
      };
      getManifest?: () => Record<string, any>;
      getURL?: (path: string) => string;
      connect?: (...args: any[]) => any;
      onConnect?: { addListener?: (callback: (...args: any[]) => void) => void };
      onInstalled?: { addListener?: (callback: (...args: any[]) => void) => void };
      id?: string;
      lastError?: any;
    };
    storage?: {
      local?: {
        get?: (keys?: string | string[] | Record<string, any> | null) => Promise<Record<string, any>>;
        set?: (items: Record<string, any>) => Promise<void>;
        remove?: (keys: string | string[]) => Promise<void>;
        clear?: () => Promise<void>;
      };
      sync?: {
        get?: (keys?: string | string[] | Record<string, any> | null) => Promise<Record<string, any>>;
        set?: (items: Record<string, any>) => Promise<void>;
        remove?: (keys: string | string[]) => Promise<void>;
        clear?: () => Promise<void>;
      };
      session?: {
        get?: (keys?: string | string[] | Record<string, any> | null) => Promise<Record<string, any>>;
        set?: (items: Record<string, any>) => Promise<void>;
        remove?: (keys: string | string[]) => Promise<void>;
      };
      onChanged?: { addListener?: (callback: (...args: any[]) => void) => void };
    };
    tabs?: {
      query?: (queryInfo: Record<string, any>) => Promise<any[]>;
      create?: (createProperties: Record<string, any>) => Promise<any>;
      update?: (tabId: number, updateProperties: Record<string, any>) => Promise<any>;
      getCurrent?: () => Promise<any>;
      sendMessage?: (tabId: number, message: any) => Promise<any>;
      executeScript?: (tabId: number, details: Record<string, any>) => Promise<any[]>;
      insertCSS?: (tabId: number, details: Record<string, any>) => Promise<void>;
      onUpdated?: { addListener?: (callback: (...args: any[]) => void) => void };
      onActivated?: { addListener?: (callback: (...args: any[]) => void) => void };
      onCreated?: { addListener?: (callback: (...args: any[]) => void) => void };
      onRemoved?: { addListener?: (callback: (...args: any[]) => void) => void };
    };
    webRequest?: {
      onBeforeRequest?: {
        addListener?: (callback: (...args: any[]) => void, filter: Record<string, any>, extraInfoSpec?: string[]) => void;
        removeListener?: (callback: (...args: any[]) => void) => void;
      };
      onCompleted?: {
        addListener?: (callback: (...args: any[]) => void, filter: Record<string, any>, extraInfoSpec?: string[]) => void;
        removeListener?: (callback: (...args: any[]) => void) => void;
      };
      onErrorOccurred?: {
        addListener?: (callback: (...args: any[]) => void, filter: Record<string, any>) => void;
        removeListener?: (callback: (...args: any[]) => void) => void;
      };
      onHeadersReceived?: {
        addListener?: (callback: (...args: any[]) => void, filter: Record<string, any>, extraInfoSpec?: string[]) => void;
        removeListener?: (callback: (...args: any[]) => void) => void;
      };
    };
    contextMenus?: {
      create?: (createProperties: Record<string, any>) => number | string;
      update?: (id: number | string, updateProperties: Record<string, any>) => Promise<void>;
      remove?: (menuItemId: number | string) => Promise<void>;
      removeAll?: () => Promise<void>;
      onClicked?: { addListener?: (callback: (...args: any[]) => void) => void };
    };
    extension?: {
      getURL?: (path: string) => string;
      getViews?: (fetchProperties?: Record<string, any>) => Window[];
      getBackgroundPage?: () => Window | null;
      isAllowedIncognitoAccess?: () => Promise<boolean>;
    };
    i18n?: {
      getMessage?: (messageName: string, substitutions?: string | string[]) => string;
      getUILanguage?: () => string;
      detectLanguage?: (text: string) => Promise<{ languages: Array<{ language: string, percentage: number }> }>;
    };
    notifications?: {
      create?: (notificationId: string | null, options: Record<string, any>) => Promise<string>;
    };
    cookies?: {
      get?: (details: Record<string, any>) => Promise<any>;
      getAll?: (details: Record<string, any>) => Promise<any[]>;
      set?: (details: Record<string, any>) => Promise<any>;
      remove?: (details: Record<string, any>) => Promise<void>;
    };
  };
  chrome?: any;
  server?: any; // Mock server object for browser environment
}

// Add any other ambient declarations here
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    VITE_APP_VERSION?: string;
    VITE_API_URL?: string;
    VITE_SOCKET_URL?: string;
    VITE_DEFAULT_LANGUAGE?: string;
    VITE_MAPBOX_ACCESS_TOKEN?: string;
    VITE_API_RATE_LIMIT_MAX?: string;
    VITE_API_RATE_LIMIT_WINDOW?: string;
    VITE_JWT_EXPIRY?: string;
    VITE_JWT_REFRESH?: string;
    VITE_ENABLE_FEEDBACK?: string;
    VITE_ENABLE_ANIMATIONS?: string;
    VITE_ENABLE_ANALYTICS?: string;
  }
}
