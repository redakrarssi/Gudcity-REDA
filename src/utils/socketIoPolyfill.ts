/**
 * Browser-compatible polyfill for Socket.IO server
 * This provides stub implementations for Socket.IO server in browser environments
 */

import { EventEmitter } from 'events';
import { io as ioClient } from 'socket.io-client';

// Socket interface
export interface Socket extends EventEmitter {
  id: string;
  handshake: {
    auth: Record<string, any>;
    query: Record<string, any>;
  };
  join(room: string): void;
  leave(room: string): void;
  to(room: string): Socket;
  emit(event: string, ...args: any[]): boolean;
  disconnect(close?: boolean): Socket;
}

// Server interface
export class Server extends EventEmitter {
  private sockets: Map<string, Socket> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  
  constructor(httpServer?: any, options?: any) {
    super();
    console.log('Socket.IO Server polyfill initialized', options);
  }
  
  // Handle new connections
  on(event: 'connection', listener: (socket: Socket) => void): this;
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
  
  // Create a socket
  private createSocket(id: string): Socket {
    const socket = new EventEmitter() as Socket;
    socket.id = id;
    socket.handshake = {
      auth: {},
      query: {}
    };
    
    socket.join = (room: string) => {
      if (!this.rooms.has(room)) {
        this.rooms.set(room, new Set());
      }
      this.rooms.get(room)!.add(socket.id);
      console.log(`Socket ${socket.id} joined room ${room}`);
    };
    
    socket.leave = (room: string) => {
      if (this.rooms.has(room)) {
        this.rooms.get(room)!.delete(socket.id);
        console.log(`Socket ${socket.id} left room ${room}`);
      }
    };
    
    socket.to = (room: string) => {
      // Return a proxy that will emit to all sockets in the room except this one
      const proxy = {
        emit: (event: string, ...args: any[]) => {
          if (this.rooms.has(room)) {
            const socketIds = this.rooms.get(room)!;
            socketIds.forEach(id => {
              if (id !== socket.id) {
                const targetSocket = this.sockets.get(id);
                if (targetSocket) {
                  targetSocket.emit(event, ...args);
                }
              }
            });
          }
          return true;
        }
      } as Socket;
      return proxy;
    };
    
    socket.disconnect = (close?: boolean) => {
      console.log(`Socket ${socket.id} disconnected`);
      this.sockets.delete(socket.id);
      // Remove from all rooms
      this.rooms.forEach((socketIds, room) => {
        socketIds.delete(socket.id);
      });
      socket.emit('disconnect');
      return socket;
    };
    
    this.sockets.set(id, socket);
    return socket;
  }
  
  // Emit to a room
  to(room: string): {
    emit: (event: string, ...args: any[]) => void;
  } {
    return {
      emit: (event: string, ...args: any[]) => {
        if (this.rooms.has(room)) {
          const socketIds = this.rooms.get(room)!;
          socketIds.forEach(id => {
            const socket = this.sockets.get(id);
            if (socket) {
              socket.emit(event, ...args);
            }
          });
        }
      }
    };
  }
  
  // Simulate a client connection
  simulateConnection(auth: Record<string, any> = {}): Socket {
    const id = `socket_${Math.random().toString(36).substr(2, 9)}`;
    const socket = this.createSocket(id);
    socket.handshake.auth = auth;
    
    // Emit connection event
    this.emit('connection', socket);
    
    return socket;
  }
}

// Create a server
export function createServer(httpServer?: any, options?: any): Server {
  return new Server(httpServer, options);
}

// Export the module
export default {
  Server,
  createServer
}; 