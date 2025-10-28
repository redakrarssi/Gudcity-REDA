/**
 * Browser-compatible polyfill for Node.js 'net' module
 * This provides stub implementations of commonly used net functions
 */

// Simple IP validation regex patterns
const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const ipv6Regex = /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i;

/**
 * Check if input is a valid IP address (v4 or v6)
 */
export function isIP(input: string): number {
  if (typeof input !== 'string') {
    return 0;
  }
  
  if (isIPv4(input)) {
    return 4;
  }
  
  if (isIPv6(input)) {
    return 6;
  }
  
  return 0;
}

/**
 * Check if input is a valid IPv4 address
 */
export function isIPv4(input: string): boolean {
  return ipv4Regex.test(input);
}

/**
 * Check if input is a valid IPv6 address
 * Note: This is a simplified check
 */
export function isIPv6(input: string): boolean {
  return ipv6Regex.test(input);
}

/**
 * Stub implementation of Socket class
 */
export class Socket {
  constructor() {
    // No-op constructor
  }
  
  connect() {
    return this;
  }
  
  end() {
    return this;
  }
  
  on() {
    return this;
  }
  
  once() {
    return this;
  }
  
  setTimeout() {
    return this;
  }
  
  setNoDelay() {
    return this;
  }
  
  setKeepAlive() {
    return this;
  }
  
  write() {
    return true;
  }
}

/**
 * Create a socket connection (stub)
 */
export function createConnection() {
  return new Socket();
}

/**
 * Create a server (stub)
 */
export function createServer() {
  return {
    listen: () => ({}),
    on: () => ({}),
    close: () => ({})
  };
}

// Export as default for CommonJS compatibility
export default {
  isIP,
  isIPv4,
  isIPv6,
  Socket,
  createConnection,
  createServer
}; 