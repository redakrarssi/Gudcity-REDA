/**
 * Mock server implementation for browser environments
 * This file provides mock implementations of server-side functionality
 * that can be safely used in the browser.
 */

// Create mock Express app
const createMockApp = () => {
  const mockApp: any = {
    use: () => mockApp,
    get: () => mockApp,
    post: () => mockApp,
    put: () => mockApp,
    delete: () => mockApp,
    patch: () => mockApp,
    listen: () => mockApp,
    all: () => mockApp,
    options: () => mockApp,
    head: () => mockApp
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
export const emitNotification = (userId: string, notification: any): void => {
  console.log('Mock emitNotification called, no-op in browser environment', { userId, notification });
};

export const emitApprovalRequest = (userId: string, approvalRequest: any): void => {
  console.log('Mock emitApprovalRequest called, no-op in browser environment', { userId, approvalRequest });
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

// Create a serverFunctions object for * as imports
const serverFunctions = {
  emitNotification,
  emitApprovalRequest,
  startServer,
  stopServer,
  app: mockApp,
  io: mockIo,
  httpServer: mockHttpServer
};

// Export everything as default for * as imports
export default serverFunctions; 