/**
 * Centralized logging utility for the application
 */

// Log levels for different environments
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

// Default to INFO level in dev, ERROR in production
const DEFAULT_LOG_LEVEL = process.env.NODE_ENV === 'production' 
  ? LogLevel.ERROR 
  : LogLevel.INFO;

// Current log level
let currentLogLevel = DEFAULT_LOG_LEVEL;

/**
 * Configure the logger
 */
export function configure(level: LogLevel) {
  currentLogLevel = level;
}

/**
 * Log an error message
 */
export function error(...args: any[]): void {
  if (LogLevel.ERROR <= currentLogLevel) {
    console.error('[ERROR]', ...args);
  }
}

/**
 * Log a warning message
 */
export function warn(...args: any[]): void {
  if (LogLevel.WARN <= currentLogLevel) {
    console.warn('[WARN]', ...args);
  }
}

/**
 * Log an info message
 */
export function info(...args: any[]): void {
  if (LogLevel.INFO <= currentLogLevel) {
    console.info('[INFO]', ...args);
  }
}

/**
 * Log a debug message
 */
export function debug(...args: any[]): void {
  if (LogLevel.DEBUG <= currentLogLevel) {
    console.debug('[DEBUG]', ...args);
  }
}

/**
 * Log a trace message
 */
export function trace(...args: any[]): void {
  if (LogLevel.TRACE <= currentLogLevel) {
    console.log('[TRACE]', ...args);
  }
}

// Create and export the default logger object
const logger = {
  error,
  warn,
  info,
  debug,
  trace,
  configure,
  LogLevel
};

export default logger; 