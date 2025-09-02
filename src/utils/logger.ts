/**
 * Professional Logging Utility
 * 
 * This module provides a centralized logging solution that works
 * in both browser and Node.js environments with appropriate configurations.
 */

// Environment detection
const isBrowser = typeof window !== 'undefined';
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
const isDevelopment = (isNode ? process.env.NODE_ENV : import.meta.env?.MODE) === 'development';
const isProduction = (isNode ? process.env.NODE_ENV : import.meta.env?.MODE) === 'production';
const isTest = (isNode ? process.env.NODE_ENV : import.meta.env?.MODE) === 'test';

// Browser-compatible logging levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Console colors for browser (using CSS styles)
const consoleStyles = {
  error: 'color: #ff0000; font-weight: bold;',
  warn: 'color: #ffa500; font-weight: bold;',
  info: 'color: #008000; font-weight: bold;',
  debug: 'color: #00ffff; font-weight: bold;'
};

// Timestamp formatter
function formatTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 19);
}

// Browser-compatible logger implementation
class BrowserLogger {
  private level: number;

  constructor() {
    this.level = isDevelopment ? logLevels.debug : (isProduction ? logLevels.info : logLevels.error);
  }

  private shouldLog(level: number): boolean {
    return level <= this.level;
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = formatTimestamp();
    let formattedMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (meta && Object.keys(meta).length > 0) {
      formattedMessage += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return formattedMessage;
  }

  debug(message: string, meta?: any): void {
    if (this.shouldLog(logLevels.debug)) {
      if (isDevelopment) {
        console.debug(`%c${this.formatMessage('debug', message, meta)}`, consoleStyles.debug);
      }
    }
  }

  info(message: string, meta?: any): void {
    if (this.shouldLog(logLevels.info)) {
      console.info(`%c${this.formatMessage('info', message, meta)}`, consoleStyles.info);
    }
  }

  warn(message: string, meta?: any): void {
    if (this.shouldLog(logLevels.warn)) {
      console.warn(`%c${this.formatMessage('warn', message, meta)}`, consoleStyles.warn);
    }
  }

  error(message: string, meta?: any): void {
    if (this.shouldLog(logLevels.error)) {
      console.error(`%c${this.formatMessage('error', message, meta)}`, consoleStyles.error);
    }
  }
}

// Node.js Winston logger (only imported when in Node.js environment)
let winstonLogger: any = null;

if (isNode && !isBrowser) {
  try {
    // Dynamic import to avoid browser bundling issues
    import('winston').then(winston => {
      const { createLogger, transports, format } = winston;
      
      // Custom format for better readability
      const customFormat = format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.printf(({ level, message, timestamp, stack, ...meta }) => {
          let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
          
          if (stack) {
            logMessage += `\n${stack}`;
          }
          
          if (Object.keys(meta).length > 0) {
            logMessage += `\n${JSON.stringify(meta, null, 2)}`;
          }
          
          return logMessage;
        })
      );

      // Create transports array based on environment
      const winstonTransports: any[] = [];

      if (isTest) {
        winstonTransports.push(
          new winston.transports.Console({
            level: 'error',
            format: format.simple(),
            silent: true
          })
        );
              } else if (isDevelopment) {
          winstonTransports.push(
            new winston.transports.Console({
            level: 'debug',
            format: format.combine(
              format.colorize({ all: true }),
              format.timestamp({ format: 'HH:mm:ss' }),
              format.errors({ stack: true }),
              format.printf(({ level, message, timestamp, stack, ...meta }) => {
                let logMessage = `${timestamp} ${level}: ${message}`;
                
                if (stack) {
                  logMessage += `\n${stack}`;
                }
                
                if (Object.keys(meta).length > 0) {
                  logMessage += ` ${JSON.stringify(meta)}`;
                }
                
                return logMessage;
              })
            )
          })
        );
              } else {
          winstonTransports.push(
            new winston.transports.Console({
              level: 'info',
              format: customFormat
            })
          );
        }

      // File transports for production
      if (isProduction) {
        const fs = require('fs');
        const path = require('path');
        
        // Ensure logs directory exists
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true });
        }
        
        // Error log file
        winstonTransports.push(
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: customFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5
          })
        );
        
        // Combined log file
        winstonTransports.push(
          new winston.transports.File({
            filename: 'logs/combined.log',
            level: 'info',
            format: customFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5
          })
        );
      }

      winstonLogger = createLogger({
        levels: logLevels,
        level: isDevelopment ? 'debug' : (isProduction ? 'info' : 'error'),
        transports: winstonTransports,
        exitOnError: false,
        
        // Handle uncaught exceptions and rejections
        exceptionHandlers: isProduction ? [
          new winston.transports.File({ filename: 'logs/exceptions.log' })
        ] : [],
        
        rejectionHandlers: isProduction ? [
          new winston.transports.File({ filename: 'logs/rejections.log' })
        ] : []
      });
    }).catch(() => {
      // Fallback to browser logger if Winston fails to load
      winstonLogger = new BrowserLogger();
    });
  } catch {
    // Fallback to browser logger
    winstonLogger = new BrowserLogger();
  }
}

// Create the appropriate logger instance
const logger = isNode && winstonLogger ? winstonLogger : new BrowserLogger();

// Create logging functions with additional context support
export const log = {
  /**
   * Debug level logging - only shown in development
   */
  debug: (message: string, meta?: object) => {
    logger.debug(message, meta);
  },

  /**
   * Info level logging - general information
   */
  info: (message: string, meta?: object) => {
    logger.info(message, meta);
  },

  /**
   * Warning level logging - potential issues
   */
  warn: (message: string, meta?: object) => {
    logger.warn(message, meta);
  },

  /**
   * Error level logging - errors and exceptions
   */
  error: (message: string, error?: Error | object, meta?: object) => {
    if (error instanceof Error) {
      logger.error(message, { error: error.message, stack: error.stack, ...meta });
    } else if (error && typeof error === 'object') {
      logger.error(message, { ...error, ...meta });
    } else {
      logger.error(message, meta);
    }
  },

  /**
   * Security-related logging with special formatting
   */
  security: (message: string, meta?: object) => {
    logger.warn(`🔒 SECURITY: ${message}`, { security: true, ...meta });
  },

  /**
   * Server startup and lifecycle logging
   */
  server: (message: string, meta?: object) => {
    logger.info(`🚀 SERVER: ${message}`, { server: true, ...meta });
  },

  /**
   * API request logging
   */
  api: (message: string, meta?: object) => {
    logger.info(`📡 API: ${message}`, { api: true, ...meta });
  },

  /**
   * Database-related logging
   */
  database: (message: string, meta?: object) => {
    logger.info(`💾 DB: ${message}`, { database: true, ...meta });
  }
};

// Utility functions for conditional logging
export const logUtils = {
  /**
   * Log only in development environment
   */
  devOnly: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: object) => {
    if (isDevelopment) {
      log[level](message, meta);
    }
  },

  /**
   * Log only in production environment
   */
  prodOnly: (level: 'info' | 'warn' | 'error', message: string, meta?: object) => {
    if (isProduction) {
      log[level](message, meta);
    }
  },

  /**
   * Create a child logger with context
   */
  withContext: (context: object) => ({
    debug: (message: string, meta?: object) => log.debug(message, { ...context, ...meta }),
    info: (message: string, meta?: object) => log.info(message, { ...context, ...meta }),
    warn: (message: string, meta?: object) => log.warn(message, { ...context, ...meta }),
    error: (message: string, error?: Error | object, meta?: object) => {
      const contextMeta = { ...context, ...meta };
      log.error(message, error, contextMeta);
    }
  })
};

// Migration helpers for console.* replacement
export const consoleReplacement = {
  /**
   * Replace console.log with appropriate logger calls
   */
  log: (message: any, ...args: any[]) => {
    if (typeof message === 'string') {
      const additionalArgs = args.length > 0 ? { args } : undefined;
      log.info(message, additionalArgs);
    } else {
      log.info('Console log message', { message, args });
    }
  },

  /**
   * Replace console.warn with logger warn
   */
  warn: (message: any, ...args: any[]) => {
    if (typeof message === 'string') {
      const additionalArgs = args.length > 0 ? { args } : undefined;
      log.warn(message, additionalArgs);
    } else {
      log.warn('Console warn message', { message, args });
    }
  },

  /**
   * Replace console.error with logger error
   */
  error: (message: any, ...args: any[]) => {
    if (message instanceof Error) {
      log.error(message.message, message, args.length > 0 ? { args } : undefined);
    } else if (typeof message === 'string') {
      const additionalArgs = args.length > 0 ? { args } : undefined;
      log.error(message, additionalArgs);
    } else {
      log.error('Console error message', { message, args });
    }
  }
};

// Export the raw logger for advanced use cases
export { logger as rawLogger };

// Export environment checks
export const env = {
  isDevelopment,
  isProduction,
  isTest,
  isBrowser,
  isNode,
  logLevel: logger.level || 'info'
};

// Default export for convenience
export default log;