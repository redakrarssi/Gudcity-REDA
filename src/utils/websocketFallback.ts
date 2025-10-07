/**
 * WebSocket Fallback for Vercel Production
 * Vercel doesn't support WebSocket connections, so we use polling as fallback
 */

const IS_PRODUCTION = !import.meta.env.DEV && import.meta.env.MODE !== 'development';
const IS_VERCEL = typeof window !== 'undefined' && (
  window.location.hostname.includes('.vercel.app') ||
  window.location.hostname.includes('vercel.app')
);

// Use polling in Vercel production, WebSocket in development
const USE_WEBSOCKET = !IS_VERCEL;
const POLLING_INTERVAL = 5000; // 5 seconds

export interface RealtimeMessage {
  type: string;
  data: any;
  timestamp: number;
}

export type MessageHandler = (message: RealtimeMessage) => void;

/**
 * Realtime Connection Manager with WebSocket fallback
 */
export class RealtimeConnection {
  private ws: WebSocket | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private userId: string | number | null = null;

  constructor() {
    console.log('📡 Realtime Connection:', {
      mode: IS_PRODUCTION ? 'production' : 'development',
      isVercel: IS_VERCEL,
      useWebSocket: USE_WEBSOCKET,
      fallback: USE_WEBSOCKET ? 'none' : 'polling'
    });
  }

  /**
   * Connect to realtime updates
   */
  connect(userId: string | number): void {
    this.userId = userId;

    if (USE_WEBSOCKET) {
      this.connectWebSocket();
    } else {
      this.startPolling();
    }
  }

  /**
   * Disconnect from realtime updates
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.isConnected = false;
    console.log('📡 Disconnected from realtime updates');
  }

  /**
   * Add message handler
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Connect via WebSocket (development only)
   */
  private connectWebSocket(): void {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/socket.io/`;
      
      console.log('🔌 Attempting WebSocket connection:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Send authentication
        if (this.userId) {
          this.ws?.send(JSON.stringify({
            type: 'auth',
            userId: this.userId
          }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message: RealtimeMessage = JSON.parse(event.data);
          this.notifyHandlers(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.handleConnectionError();
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.isConnected = false;
        this.attemptReconnect();
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.handleConnectionError();
    }
  }

  /**
   * Start HTTP polling fallback (production)
   */
  private startPolling(): void {
    console.log('📊 Starting HTTP polling fallback (interval:', POLLING_INTERVAL, 'ms)');
    
    this.isConnected = true;

    // Immediate first poll
    this.poll();

    // Set up polling interval
    this.pollingInterval = setInterval(() => {
      this.poll();
    }, POLLING_INTERVAL);
  }

  /**
   * Poll for updates via HTTP
   */
  private async poll(): Promise<void> {
    if (!this.userId) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Poll for new notifications, messages, updates, etc.
      const endpoints = [
        `/api/customers/${this.userId}/notifications?unread=true`,
        `/api/customers/${this.userId}/updates?since=${Date.now() - POLLING_INTERVAL}`
      ];

      // Fetch all endpoints in parallel
      const results = await Promise.allSettled(
        endpoints.map(endpoint =>
          fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }).then(res => res.ok ? res.json() : null)
        )
      );

      // Process results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          const data = result.value;
          if (Array.isArray(data) && data.length > 0) {
            // Notify handlers of new data
            data.forEach((item: any) => {
              this.notifyHandlers({
                type: index === 0 ? 'notification' : 'update',
                data: item,
                timestamp: Date.now()
              });
            });
          }
        }
      });

    } catch (error) {
      console.error('Polling error:', error);
      // Continue polling even on error
    }
  }

  /**
   * Notify all message handlers
   */
  private notifyHandlers(message: RealtimeMessage): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Message handler error:', error);
      }
    });
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(): void {
    this.isConnected = false;
    
    // Fall back to polling if WebSocket fails in production
    if (IS_PRODUCTION && !this.pollingInterval) {
      console.log('⚠️ WebSocket failed, falling back to polling');
      this.startPolling();
    }
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max reconnection attempts reached, falling back to polling');
      this.startPolling();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      if (this.userId) {
        this.connectWebSocket();
      }
    }, delay);
  }
}

// Singleton instance
let realtimeConnection: RealtimeConnection | null = null;

/**
 * Get or create realtime connection
 */
export function getRealtimeConnection(): RealtimeConnection {
  if (!realtimeConnection) {
    realtimeConnection = new RealtimeConnection();
  }
  return realtimeConnection;
}

export default getRealtimeConnection;

