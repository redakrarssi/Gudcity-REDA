import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../env';
import { WEBSOCKET_EVENTS } from './constants';

// Flag to disable socket connections - useful for development or when server is unavailable
const DISABLE_SOCKETS = process.env.NODE_ENV === 'development';

// Detect if we're in production (Vercel deployment)
const IS_PRODUCTION = !import.meta.env.DEV && import.meta.env.MODE !== 'development';

// Create a singleton socket instance if not disabled
let socket: Socket | null = null;

// Only create the socket if not disabled
if (!DISABLE_SOCKETS) {
  // In production, prefer polling over WebSocket since Vercel serverless doesn't support persistent WebSockets
  const transports = IS_PRODUCTION ? ['polling', 'websocket'] : ['websocket', 'polling'];

  socket = io(API_BASE_URL, {
    autoConnect: false, // Don't connect automatically, we'll do it explicitly
    reconnectionAttempts: 3, // Reduced number of attempts
    reconnectionDelay: 2000,
    timeout: 5000, // Shorter timeout
    transports
  });
}

// Track connection state
let isConnecting = false;
let connectedUserId: string | null = null;
let connectionFailed = false; // Flag to track if connection has failed

/**
 * Connect socket with authentication token
 * @param token JWT authentication token
 */
export const connectAuthenticatedSocket = (token: string) => {
  if (DISABLE_SOCKETS || connectionFailed || !socket) {
    return; // Silently exit if sockets are disabled or previous connection failed
  }
  
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
    connectionFailed = true; // Mark as failed
  }
};

/**
 * Connect socket for a specific user ID
 * @param userId User ID to connect for notifications
 */
export const connectUserSocket = (userId: string) => {
  if (DISABLE_SOCKETS || connectionFailed || !socket) {
    return; // Silently exit if sockets are disabled or previous connection failed
  }
  
  if (!userId) {
    console.warn('Cannot connect socket: No user ID provided');
    return;
  }
  
  // Don't reconnect if already connecting for the same user
  if (isConnecting && connectedUserId === userId) {
    return;
  }
  
  try {
    isConnecting = true;
    connectedUserId = userId;
    
    // Set user ID in auth
    socket.auth = { userId };
    
    // Connect if not already connected
    if (!socket.connected) {
      console.log(`Connecting socket for user: ${userId}`);
      socket.connect();
      
      // Set up event handlers for connection
      socket.on('connect', () => {
        console.log(`Socket connected for user: ${userId}`);
        isConnecting = false;
        
        // Join user's room for notifications
        socket.emit('join', { userId });
      });
      
      // Handle connection errors more gracefully
      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        isConnecting = false;

        // In production, if WebSocket fails, we might want to log this but not fail completely
        if (IS_PRODUCTION) {
          console.warn('WebSocket connection failed in production, continuing with polling fallback');
          connectionFailed = false; // Allow fallback to polling
        } else {
          // After multiple failed attempts in development, mark as failed to prevent further attempts
          if (socket) {
            console.warn('Socket connection failed, disabling reconnection');
            connectionFailed = true;
            socket.disconnect(); // Disconnect to prevent further attempts
          }
        }
      });
    } else {
      // If already connected but for a different user, join new room
      socket.emit('join', { userId });
    }
  } catch (error) {
    console.error('Error connecting socket:', error);
    isConnecting = false;
  }
};

/**
 * Disconnect the socket
 */
export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
    connectedUserId = null;
  }
};

/**
 * Listen for events on a specific topic for a user
 * @param userId User ID
 * @param topic Topic to listen for (e.g., 'notification', 'approval')
 * @param callback Callback function when event is received
 */
export const listenForUserEvents = (userId: string, topic: string, callback: (data: any) => void) => {
  if (DISABLE_SOCKETS || connectionFailed || !socket) {
    return () => {}; // Return empty cleanup function
  }
  
  const eventName = `${topic}:${userId}`;
  
  // Remove any existing listeners to prevent duplicates
  socket.off(eventName);
  
  // Add new listener
  socket.on(eventName, callback);
  
  // Ensure socket is connected
  if (!socket.connected) {
    connectUserSocket(userId);
  }
  
  // Return cleanup function
  return () => {
    socket?.off(eventName);
  };
};

// Setup global error handler if socket exists
if (socket) {
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  // Setup reconnection logic
  socket.io.on('reconnect', (attempt) => {
    console.log(`Socket reconnected after ${attempt} attempts`);
    
    // Re-join user room if needed
    if (connectedUserId) {
      socket.emit('join', { userId: connectedUserId });
    }
  });

  // Debug event listeners (for development)
  if (process.env.NODE_ENV === 'development') {
    socket.onAny((event, ...args) => {
      console.log(`[Socket Event]: ${event}`, args);
    });
  }
} 