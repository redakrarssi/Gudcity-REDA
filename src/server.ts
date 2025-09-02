/**
 * Server implementation for browser environments
 * This file provides mock implementations of server-side functionality
 * that can be safely used in the browser.
 */

// Re-export all server mock functions
export * from './utils/serverMock';

// Also export the default for * as imports
export { default } from './utils/serverMock'; 