/**
 * A simple logger utility for consistent logging across the application
 */
export const logger = {
  /**
   * Log an informational message
   * @param message The message to log
   * @param data Additional data to log
   */
  info(message: string, data?: any): void {
    console.log(`[INFO] ${message}`, data !== undefined ? data : '');
  },
  
  /**
   * Log a warning message
   * @param message The message to log
   * @param data Additional data to log
   */
  warn(message: string, data?: any): void {
    console.warn(`[WARN] ${message}`, data !== undefined ? data : '');
  },
  
  /**
   * Log an error message
   * @param message The message to log
   * @param error The error object or additional data
   */
  error(message: string, error?: any): void {
    console.error(`[ERROR] ${message}`, error !== undefined ? error : '');
  },
  
  /**
   * Log a debug message (only in development)
   * @param message The message to log
   * @param data Additional data to log
   */
  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${message}`, data !== undefined ? data : '');
    }
  },
  
  /**
   * Create a child logger with a specific context
   * @param context The context to add to log messages
   */
  withContext(context: string) {
    return {
      info: (message: string, data?: any) => 
        this.info(`[${context}] ${message}`, data),
      warn: (message: string, data?: any) => 
        this.warn(`[${context}] ${message}`, data),
      error: (message: string, data?: any) => 
        this.error(`[${context}] ${message}`, data),
      debug: (message: string, data?: any) => 
        this.debug(`[${context}] ${message}`, data)
    };
  }
}; 