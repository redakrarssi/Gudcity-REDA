/**
 * Mock server implementation for browser environments
 * This file provides mock implementations of server-side functionality
 * that can be safely used in the browser.
 */

// Create mock Express app
const createMockApp = () => {
  const mockApp: any = {
    use: function(this: any, ...args: any[]) { 
      try { return this || mockApp; } catch (e) { return mockApp; }
    },
    get: function(this: any, ...args: any[]) { 
      try { return this || mockApp; } catch (e) { return mockApp; }
    },
    post: function(this: any, ...args: any[]) { 
      try { return this || mockApp; } catch (e) { return mockApp; }
    },
    put: function(this: any, ...args: any[]) { 
      try { return this || mockApp; } catch (e) { return mockApp; }
    },
    delete: function(this: any, ...args: any[]) { 
      try { return this || mockApp; } catch (e) { return mockApp; }
    },
    patch: function(this: any, ...args: any[]) { 
      try { return this || mockApp; } catch (e) { return mockApp; }
    },
    listen: function(this: any, ...args: any[]) { 
      try { return this || mockApp; } catch (e) { return mockApp; }
    },
    all: function(this: any, ...args: any[]) { 
      try { return this || mockApp; } catch (e) { return mockApp; }
    },
    options: function(this: any, ...args: any[]) { 
      try { return this || mockApp; } catch (e) { return mockApp; }
    },
    head: function(this: any, ...args: any[]) { 
      try { return this || mockApp; } catch (e) { return mockApp; }
    }
  };
  return mockApp;
};

// Create mock Socket.IO instance
const createMockIo = () => {
  return {
    on: () => {},
    to: () => ({ 
      emit: () => {} 
    }),
    emit: () => {},
    of: () => ({
      on: () => {},
      to: () => ({ emit: () => {} }),
      emit: () => {}
    })
  };
};

// Create mock HTTP server
const createMockHttpServer = () => {
  return {
    listen: (port: number, callback?: () => void) => {
      if (callback) callback();
      return mockHttpServer;
    },
    close: (callback?: () => void) => {
      if (callback) callback();
      return mockHttpServer;
    }
  };
};

// Create instances
const mockApp = createMockApp();
const mockIo = createMockIo();
const mockHttpServer = createMockHttpServer();

// Mock notification functions
export const emitNotification = function(this: any, userId: string, notification: any): void {
  try {
    console.log('Mock emitNotification called, no-op in browser environment', { userId, notification });
  } catch (error) {
    console.warn('Mock emitNotification error:', error);
  }
};

export const emitApprovalRequest = function(this: any, userId: string, approvalRequest: any): void {
  try {
    console.log('Mock emitApprovalRequest called, no-op in browser environment', { userId, approvalRequest });
  } catch (error) {
    console.warn('Mock emitApprovalRequest error:', error);
  }
};

// Additional server function mocks
export const startServer = () => {
  console.log('Mock startServer called, no-op in browser environment');
};

export const stopServer = () => {
  console.log('Mock stopServer called, no-op in browser environment');
};

// Export mock server objects
export const app = mockApp;
export const io = mockIo;
export const httpServer = mockHttpServer;

// Export additional server functions that might be imported
export const createServer = () => mockHttpServer;
export const Server = class MockServer {
  constructor() {}
  on() { return this; }
  emit() { return this; }
  to() { return { emit: () => this }; }
};
export const Socket = class MockSocket {
  constructor() {}
  on() { return this; }
  emit() { return this; }
};

// Add more comprehensive server function mocks
export const http = {
  createServer: () => mockHttpServer
};

export const https = {
  createServer: () => mockHttpServer
};

export const express = () => mockApp;

export const cors = () => (req: any, res: any, next: any) => next();

export const helmet = () => (req: any, res: any, next: any) => next();

export const morgan = () => (req: any, res: any, next: any) => next();

export const rateLimit = () => (req: any, res: any, next: any) => next();

// Create a serverFunctions object for * as imports
const serverFunctions = {
  emitNotification,
  emitApprovalRequest,
  startServer,
  stopServer,
  app: mockApp,
  io: mockIo,
  httpServer: mockHttpServer,
  createServer,
  Server,
  Socket,
  http,
  https,
  express,
  cors,
  helmet,
  morgan,
  rateLimit
};

// Export everything as default for * as imports
export default serverFunctions; 