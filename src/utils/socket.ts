import { io, Socket } from 'socket.io-client';

// Create a singleton socket instance with better error handling
const createSafeSocket = () => {
  try {
    const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
    
    // Only create socket connection if we're running in browser environment
    if (typeof window !== 'undefined') {
      return io(socketUrl, {
        autoConnect: false,
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        timeout: 5000
      });
    }
    
    // Return a mock socket for SSR environments
    return {
      on: () => {},
      emit: () => {},
      connect: () => {},
      disconnect: () => {},
      connected: false,
      auth: {}
    } as unknown as Socket;
  } catch (error) {
    console.error('Failed to initialize socket:', error);
    
    // Return a dummy socket that won't throw errors
    return {
      on: () => {},
      emit: () => {},
      connect: () => {},
      disconnect: () => {},
      connected: false,
      auth: {}
    } as unknown as Socket;
  }
};

export const socket: Socket = createSafeSocket();

// Add connection event handlers for debugging
socket.on('connect', () => {
  console.log('Socket connected');
});

socket.on('disconnect', (reason: string) => {
  console.log(`Socket disconnected: ${reason}`);
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error.message);
});

socket.on('error', (error: Error) => {
  console.error('Socket error:', error);
});

/**
 * Connect socket with authentication token
 * @param token JWT authentication token
 */
export const connectAuthenticatedSocket = (token: string) => {
  if (!token) {
    console.warn('Cannot connect socket: No authentication token provided');
    return;
  }
  
  try {
    // Set the auth token
    socket.auth = { token };
    
    // Connect if not already connected
    if (!socket.connected) {
      socket.connect();
    }
  } catch (error) {
    console.error('Error connecting socket:', error);
  }
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  try {
    if (socket.connected) {
      socket.disconnect();
    }
  } catch (error) {
    console.error('Error disconnecting socket:', error);
  }
}; 