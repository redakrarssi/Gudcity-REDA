import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../env';
import { WEBSOCKET_EVENTS } from './constants';

// Flag to disable socket connections - useful for development or when server is unavailable
const DISABLE_SOCKETS = process.env.NODE_ENV === 'development';

// Create a singleton socket instance if not disabled
let socket: Socket | null = null;

// Only create the socket if not disabled
if (!DISABLE_SOCKETS) {
  socket = io(API_BASE_URL, {
    autoConnect: false, // Don't connect automatically, we'll do it explicitly
    reconnectionAttempts: 5, // Increased from 3 to 5 for more reliability
    reconnectionDelay: 1000, // Reduced from 2000 to 1000 for faster reconnection
    timeout: 10000, // Increased from 5000 to 10000 for better stability
    transports: ['websocket', 'polling'],
    forceNew: true, // Force new connection for better reliability
    upgrade: true, // Allow transport upgrade
    rememberUpgrade: true // Remember transport upgrade
  });
}

// Track connection state
let isConnecting = false;
let connectedUserId: string | null = null;
let connectionFailed = false; // Flag to track if connection has failed
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

// Connection health monitoring
let connectionHealthCheck: NodeJS.Timeout | null = null;
let lastHeartbeat = Date.now();
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 60000; // 60 seconds

/**
 * Enhanced socket connection with better error handling and reconnection logic
 */
export const connectAuthenticatedSocket = (token: string) => {
  if (DISABLE_SOCKETS || !socket) {
    return; // Silently exit if sockets are disabled
  }
  
  if (!token) {
    console.warn('Cannot connect socket: No authentication token provided');
    return;
  }
  
  try {
    // Reset connection failure flag if we have a new token
    connectionFailed = false;
    reconnectAttempts = 0;
    
    // Set the auth token
    socket.auth = { token };
    
    // Connect if not already connected
    if (!socket.connected) {
      socket.connect();
      startConnectionHealthCheck();
    }
  } catch (error) {
    console.error('Error connecting socket:', error);
    connectionFailed = true; // Mark as failed
  }
};

/**
 * Enhanced user socket connection with enrollment-specific event handling
 */
export const connectUserSocket = (userId: string) => {
  if (DISABLE_SOCKETS || !socket) {
    return; // Silently exit if sockets are disabled
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
      
      // Set up enhanced event handlers for connection
      socket.on('connect', () => {
        console.log(`Socket connected for user: ${userId}`);
        isConnecting = false;
        connectionFailed = false;
        reconnectAttempts = 0;
        
        // Join user's room for notifications
        socket.emit('join', { userId });
        
        // Start connection health monitoring
        startConnectionHealthCheck();
        
        // Dispatch connection success event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('socketConnected', { 
            detail: { userId, timestamp: Date.now() } 
          }));
        }
      });
      
      // Enhanced connection error handling
      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        isConnecting = false;
        
        // Increment reconnect attempts
        reconnectAttempts++;
        
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error('Max reconnection attempts reached, marking connection as failed');
          connectionFailed = true;
          
          // Dispatch connection failure event
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('socketConnectionFailed', { 
              detail: { userId, error: error.message, attempts: reconnectAttempts } 
            }));
          }
        } else {
          // Try to reconnect with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`Attempting reconnection in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
          
          setTimeout(() => {
            if (!connectionFailed && socket && !socket.connected) {
              socket.connect();
            }
          }, delay);
        }
      });
      
      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`Socket disconnected: ${reason}`);
        isConnecting = false;
        
        // Stop health check
        stopConnectionHealthCheck();
        
        // Dispatch disconnection event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('socketDisconnected', { 
            detail: { userId, reason, timestamp: Date.now() } 
          }));
        }
        
        // Auto-reconnect for certain disconnect reasons
        if (reason === 'io server disconnect' || reason === 'transport close') {
          console.log('Attempting to reconnect after disconnect...');
          setTimeout(() => {
            if (socket && !socket.connected && !connectionFailed) {
              socket.connect();
            }
          }, 1000);
        }
      });
      
      // Enhanced enrollment-specific event handling
      socket.on('enrollment_request', (data) => {
        console.log('Enrollment request received:', data);
        
        // Dispatch custom event for enrollment handling
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('enrollmentRequestReceived', { 
            detail: { ...data, timestamp: Date.now() } 
          }));
        }
      });
      
      socket.on('enrollment_response', (data) => {
        console.log('Enrollment response received:', data);
        
        // Dispatch custom event for enrollment response
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('enrollmentResponseReceived', { 
            detail: { ...data, timestamp: Date.now() } 
          }));
        }
      });
      
      socket.on('card_created', (data) => {
        console.log('Card created notification received:', data);
        
        // Dispatch custom event for card creation
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('cardCreated', { 
            detail: { ...data, timestamp: Date.now() } 
          }));
        }
      });
      
      socket.on('notification_update', (data) => {
        console.log('Notification update received:', data);
        
        // Dispatch custom event for notification updates
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('notificationUpdate', { 
            detail: { ...data, timestamp: Date.now() } 
          }));
        }
      });
      
      // Handle general message events
      socket.on('message', (data) => {
        console.log('Socket message received:', data);
        
        // Dispatch custom event for general messages
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('socketMessage', { 
            detail: { ...data, timestamp: Date.now() } 
          }));
        }
      });
      
      // Handle errors
      socket.on('error', (error) => {
        console.error('Socket error:', error);
        
        // Dispatch error event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('socketError', { 
            detail: { error, timestamp: Date.now() } 
          }));
        }
      });
    }
  } catch (error) {
    console.error('Error setting up user socket:', error);
    isConnecting = false;
    connectionFailed = true;
  }
};

/**
 * Start connection health monitoring
 */
function startConnectionHealthCheck() {
  if (connectionHealthCheck) {
    clearInterval(connectionHealthCheck);
  }
  
  connectionHealthCheck = setInterval(() => {
    if (socket && socket.connected) {
      // Send heartbeat
      socket.emit('heartbeat', { timestamp: Date.now() });
      lastHeartbeat = Date.now();
      
      // Check if we're still receiving responses
      setTimeout(() => {
        const timeSinceHeartbeat = Date.now() - lastHeartbeat;
        if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT) {
          console.warn('Socket heartbeat timeout, reconnecting...');
          if (socket) {
            socket.disconnect();
            socket.connect();
          }
        }
      }, HEARTBEAT_TIMEOUT);
    }
  }, HEARTBEAT_INTERVAL);
}

/**
 * Stop connection health monitoring
 */
function stopConnectionHealthCheck() {
  if (connectionHealthCheck) {
    clearInterval(connectionHealthCheck);
    connectionHealthCheck = null;
  }
}

/**
 * Enhanced event listening for user-specific events
 */
export const listenForUserEvents = (userId: string, eventTypes: string[] = []) => {
  if (DISABLE_SOCKETS || !socket || !socket.connected) {
    console.warn('Cannot listen for events: Socket not available or connected');
    return () => {}; // Return no-op cleanup function
  }
  
  console.log(`Setting up event listeners for user: ${userId}, events: ${eventTypes.join(', ')}`);
  
  // Join user-specific room
  socket.emit('join_user_room', { userId, eventTypes });
  
  // Return cleanup function
  return () => {
    if (socket && socket.connected) {
      socket.emit('leave_user_room', { userId });
    }
  };
};

/**
 * Send enrollment approval response via socket
 */
export const sendEnrollmentResponse = (requestId: string, approved: boolean, userId: string) => {
  if (DISABLE_SOCKETS || !socket || !socket.connected) {
    console.warn('Cannot send enrollment response: Socket not available or connected');
    return false;
  }
  
  try {
    socket.emit('enrollment_response', {
      requestId,
      approved,
      userId,
      timestamp: Date.now()
    });
    
    console.log('Enrollment response sent via socket:', { requestId, approved, userId });
    return true;
  } catch (error) {
    console.error('Error sending enrollment response via socket:', error);
    return false;
  }
};

/**
 * Send notification acknowledgment via socket
 */
export const sendNotificationAck = (notificationId: string, userId: string, action: string) => {
  if (DISABLE_SOCKETS || !socket || !socket.connected) {
    console.warn('Cannot send notification ack: Socket not available or connected');
    return false;
  }
  
  try {
    socket.emit('notification_ack', {
      notificationId,
      userId,
      action,
      timestamp: Date.now()
    });
    
    console.log('Notification acknowledgment sent via socket:', { notificationId, userId, action });
    return true;
  } catch (error) {
    console.error('Error sending notification acknowledgment via socket:', error);
    return false;
  }
};

/**
 * Get socket connection status
 */
export const getSocketStatus = () => {
  if (!socket) {
    return { connected: false, status: 'DISABLED' };
  }
  
  return {
    connected: socket.connected,
    status: socket.connected ? 'CONNECTED' : connectionFailed ? 'FAILED' : 'DISCONNECTED',
    userId: connectedUserId,
    reconnectAttempts,
    lastHeartbeat: new Date(lastHeartbeat)
  };
};

/**
 * Force socket reconnection
 */
export const forceReconnect = () => {
  if (DISABLE_SOCKETS || !socket) {
    return false;
  }
  
  try {
    console.log('Forcing socket reconnection...');
    connectionFailed = false;
    reconnectAttempts = 0;
    
    if (socket.connected) {
      socket.disconnect();
    }
    
    setTimeout(() => {
      if (socket) {
        socket.connect();
      }
    }, 1000);
    
    return true;
  } catch (error) {
    console.error('Error forcing socket reconnection:', error);
    return false;
  }
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket && socket.connected) {
    console.log('Disconnecting socket...');
    socket.disconnect();
    isConnecting = false;
    connectedUserId = null;
    stopConnectionHealthCheck();
  }
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    disconnectSocket();
  });
} 