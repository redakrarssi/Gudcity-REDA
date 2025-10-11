/**
 * User Data Backend Connection Service
 * Handles secure connection between frontend and backend for user data operations
 * Following reda.md security guidelines
 */

import { User } from './userService';
import ApiClient from './apiClient';
import { ProductionSafeService } from '../utils/productionApiClient';
import sql from '../utils/db';

/**
 * Connection state for user data operations
 */
export enum UserDataConnectionState {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  ERROR = 'error'
}

/**
 * User data connection service
 * Provides reliable connection to backend for user data operations
 */
export class UserDataConnectionService {
  private static connectionState: UserDataConnectionState = UserDataConnectionState.DISCONNECTED;
  private static retryCount = 0;
  private static maxRetries = 3;

  /**
   * Get current connection state
   */
  static getConnectionState(): UserDataConnectionState {
    return this.connectionState;
  }

  /**
   * Test backend connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      this.connectionState = UserDataConnectionState.CONNECTING;
      
      // Test API connection first
      if (ProductionSafeService.shouldUseApi()) {
        try {
          // Try a simple API call to test connection
          await fetch('/api/health', { method: 'GET' });
          this.connectionState = UserDataConnectionState.CONNECTED;
          this.retryCount = 0;
          return true;
        } catch (apiError) {
          console.warn('API connection test failed:', apiError);
        }
      }
      
      // Test database connection as fallback
      try {
        await sql`SELECT 1 as test`;
        this.connectionState = UserDataConnectionState.CONNECTED;
        this.retryCount = 0;
        return true;
      } catch (dbError) {
        console.warn('Database connection test failed:', dbError);
      }
      
      this.connectionState = UserDataConnectionState.ERROR;
      return false;
    } catch (error) {
      console.error('Connection test failed:', error);
      this.connectionState = UserDataConnectionState.ERROR;
      return false;
    }
  }

  /**
   * Get user by ID with connection retry logic
   */
  static async getUserById(id: number): Promise<User | null> {
    try {
      console.log(`Fetching user with id: ${id}`);
      
      if (!id || isNaN(id)) {
        console.error(`Invalid user ID: ${id}`);
        return null;
      }

      // Try API first if available
      if (ProductionSafeService.shouldUseApi()) {
        try {
          const apiUser = await ProductionSafeService.getUserById(id);
          if (apiUser) {
            this.connectionState = UserDataConnectionState.CONNECTED;
            this.retryCount = 0;
            return apiUser as User;
          }
        } catch (apiError) {
          console.warn('API call failed, trying database:', apiError);
        }
      }

      // Fallback to direct database access
      try {
        const result = await sql`
          SELECT id, name, email, role, user_type, business_name, business_phone, avatar_url, business_owner_id, permissions, created_by, created_at, last_login, status 
          FROM users WHERE id = ${id}
        `;
        
        if (!result || result.length === 0) {
          console.log(`No user found with ID: ${id}`);
          return null;
        }
        
        const user = result[0];
        this.connectionState = UserDataConnectionState.CONNECTED;
        this.retryCount = 0;
        
        console.log(`User found with ID ${id}:`, { 
          id: user.id, 
          name: user.name, 
          email: user.email,
          role: user.role,
          user_type: user.user_type
        });
        
        return user as User;
      } catch (dbError) {
        console.error('Database query failed:', dbError);
        throw dbError;
      }
    } catch (error) {
      console.error(`Error fetching user with id ${id}:`, error);
      
      // Retry logic for connection issues
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retrying user fetch (attempt ${this.retryCount}/${this.maxRetries})`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount));
        
        // Test connection before retry
        const isConnected = await this.testConnection();
        if (isConnected) {
          return this.getUserById(id);
        }
      }
      
      this.connectionState = UserDataConnectionState.ERROR;
      return null;
    }
  }

  /**
   * Get user by email with connection retry logic
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      console.log(`Checking for user with email: ${email}`);
      
      if (!email || typeof email !== 'string') {
        console.error('Invalid email provided');
        return null;
      }

      // Try API first if available
      if (ProductionSafeService.shouldUseApi()) {
        try {
          const apiUser = await ApiClient.getUserByEmail(email);
          if (apiUser) {
            this.connectionState = UserDataConnectionState.CONNECTED;
            this.retryCount = 0;
            return apiUser as User;
          }
        } catch (apiError) {
          console.warn('API call failed, trying database:', apiError);
        }
      }

      // Fallback to direct database access
      try {
        const result = await sql`
          SELECT id, name, email, password, role, user_type, business_name, business_phone, avatar_url, business_owner_id, permissions, created_by, created_at, last_login, status 
          FROM users WHERE LOWER(email) = LOWER(${email})
        `;
        
        if (!result || result.length === 0) {
          console.log(`No user found with email: ${email}`);
          return null;
        }
        
        const user = result[0];
        this.connectionState = UserDataConnectionState.CONNECTED;
        this.retryCount = 0;
        
        console.log(`User found with email ${email}:`, { 
          id: user.id, 
          name: user.name, 
          email: user.email,
          role: user.role,
          user_type: user.user_type,
          status: user.status
        });
        
        return user as User;
      } catch (dbError) {
        console.error('Database query failed:', dbError);
        throw dbError;
      }
    } catch (error) {
      console.error(`Error fetching user with email ${email}:`, error);
      
      // Retry logic for connection issues
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retrying user fetch by email (attempt ${this.retryCount}/${this.maxRetries})`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount));
        
        // Test connection before retry
        const isConnected = await this.testConnection();
        if (isConnected) {
          return this.getUserByEmail(email);
        }
      }
      
      this.connectionState = UserDataConnectionState.ERROR;
      return null;
    }
  }

  /**
   * Update user with connection retry logic
   */
  static async updateUser(id: number, userData: Partial<User>): Promise<User | null> {
    try {
      console.log(`Updating user with id: ${id}`);
      
      if (!id || isNaN(id)) {
        console.error(`Invalid user ID: ${id}`);
        return null;
      }

      // Try API first if available
      if (ProductionSafeService.shouldUseApi()) {
        try {
          const apiUser = await ApiClient.updateUser(id, userData);
          if (apiUser) {
            this.connectionState = UserDataConnectionState.CONNECTED;
            this.retryCount = 0;
            return apiUser as User;
          }
        } catch (apiError) {
          console.warn('API call failed, trying database:', apiError);
        }
      }

      // Fallback to direct database access
      try {
        // Handle specific fields separately for type safety
        if (userData.name) {
          await sql`UPDATE users SET name = ${userData.name} WHERE id = ${id}`;
        }
        
        if (userData.email) {
          await sql`UPDATE users SET email = ${userData.email} WHERE id = ${id}`;
        }
        
        if (userData.role) {
          await sql`UPDATE users SET role = ${userData.role} WHERE id = ${id}`;
        }
        
        if (userData.user_type) {
          await sql`UPDATE users SET user_type = ${userData.user_type} WHERE id = ${id}`;
        }
        
        if (userData.business_name !== undefined) {
          await sql`UPDATE users SET business_name = ${userData.business_name} WHERE id = ${id}`;
        }
        
        if (userData.business_phone !== undefined) {
          await sql`UPDATE users SET business_phone = ${userData.business_phone} WHERE id = ${id}`;
        }
        
        if (userData.avatar_url !== undefined) {
          await sql`UPDATE users SET avatar_url = ${userData.avatar_url} WHERE id = ${id}`;
        }
        
        // Get the updated user
        const updatedUser = await this.getUserById(id);
        this.connectionState = UserDataConnectionState.CONNECTED;
        this.retryCount = 0;
        
        return updatedUser;
      } catch (dbError) {
        console.error('Database update failed:', dbError);
        throw dbError;
      }
    } catch (error) {
      console.error(`Error updating user with id ${id}:`, error);
      
      // Retry logic for connection issues
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retrying user update (attempt ${this.retryCount}/${this.maxRetries})`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount));
        
        // Test connection before retry
        const isConnected = await this.testConnection();
        if (isConnected) {
          return this.updateUser(id, userData);
        }
      }
      
      this.connectionState = UserDataConnectionState.ERROR;
      return null;
    }
  }

  /**
   * Force reconnection
   */
  static async forceReconnect(): Promise<boolean> {
    console.log('Forcing user data connection reconnection...');
    this.connectionState = UserDataConnectionState.CONNECTING;
    this.retryCount = 0;
    
    const isConnected = await this.testConnection();
    if (isConnected) {
      console.log('User data connection reconnected successfully');
      return true;
    } else {
      console.error('Failed to reconnect user data connection');
      return false;
    }
  }

  /**
   * Get connection health status
   */
  static getConnectionHealth(): {
    state: UserDataConnectionState;
    retryCount: number;
    maxRetries: number;
    isHealthy: boolean;
  } {
    return {
      state: this.connectionState,
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      isHealthy: this.connectionState === UserDataConnectionState.CONNECTED
    };
  }
}

export default UserDataConnectionService;