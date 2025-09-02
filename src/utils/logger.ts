/**
 * Professional Logging Utility
 * 
 * This module provides a centralized logging solution using Winston
 * with appropriate configurations for development and production environments.
 */

import winston from 'winston';

// Define log levels with colors for console output
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'cyan'
};

// Add colors to winston
winston.addColors(logColors);

// Determine environment
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// Custom format for better readability
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    // Format the message with timestamp and level
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Add stack trace for errors
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// Custom format for console output in development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let logMessage = `${timestamp} ${level}: ${message}`;
    
    if (stack && isDevelopment) {
      logMessage += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0 && isDevelopment) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    
    return logMessage;
  })
);

// Create transports array based on environment
const transports: winston.transport[] = [];

// Console transport (always present)
if (isTest) {
  // Minimal logging for tests
  transports.push(
    new winston.transports.Console({
      level: 'error',
      format: winston.format.simple(),
      silent: true // Silent during tests unless explicitly needed
    })
  );
} else if (isDevelopment) {
  // Development: colorized console output with debug level
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: consoleFormat
    })
  );
} else {
  // Production: structured console output, info level and above
  transports.push(
    new winston.transports.Console({
      level: 'info',
      format: customFormat
    })
  );
}

// File transports for production
if (isProduction) {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: customFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
  
  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: 'logs/combined.log',
      level: 'info',
      format: customFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// Create the logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: isDevelopment ? 'debug' : (isProduction ? 'info' : 'error'),
  transports,
  exitOnError: false,
  
  // Handle uncaught exceptions and rejections
  exceptionHandlers: isProduction ? [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ] : [],
  
  rejectionHandlers: isProduction ? [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ] : []
});

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

// Export the raw winston logger for advanced use cases
export { logger as rawLogger };

// Export environment checks
export const env = {
  isDevelopment,
  isProduction,
  isTest,
  logLevel: logger.level
};

// Default export for convenience
export default log;