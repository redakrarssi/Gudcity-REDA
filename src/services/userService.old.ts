/**
 * User Service - API Only
 * 
 * This service handles all user operations through API calls.
 * No direct database access - all operations go through the backend API.
 */

import { 
  apiGetUserById, 
  apiGetUserByEmail, 
  apiUpdateUser, 
  apiSearchUsers, 
  apiGetUsersByType,
  apiDeleteUser
} from './apiClient';
import type { User } from './apiClient';

/**
 * User Service
 * Manages user operations through secure API endpoints
 */
export class UserService {
  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    try {
      const response = await apiGetUserById(userId);
      return response.data || response || null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    try {
      const response = await apiGetUserByEmail(email);
      return response.data || response || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  /**
   * Update user information
   */
  static async updateUser(
    userId: string,
    updates: Partial<User>
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const response = await apiUpdateUser(userId, updates);
      const user = response.data || response;
      return { success: true, user };
    } catch (error: any) {
      console.error('Error updating user:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to update user' 
      };
    }
  }

  /**
   * Search users
   */
  static async searchUsers(query: string, filters?: Record<string, any>): Promise<User[]> {
    try {
      const response = await apiSearchUsers(query, filters);
      return response.data || response || [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  /**
   * Get users by type (customer, business, admin)
   */
  static async getUsersByType(userType: string): Promise<User[]> {
    try {
      const response = await apiGetUsersByType(userType);
      return response.data || response || [];
    } catch (error) {
      console.error('Error getting users by type:', error);
      return [];
    }
  }

  /**
   * Delete user
   */
  static async deleteUser(
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await apiDeleteUser(userId);
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting user:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to delete user' 
      };
    }
  }

  /**
   * Get all customers
   */
  static async getAllCustomers(): Promise<User[]> {
    return this.getUsersByType('customer');
  }

  /**
   * Get all businesses
   */
  static async getAllBusinesses(): Promise<User[]> {
    return this.getUsersByType('business');
  }

  /**
   * Get all admins
   */
  static async getAllAdmins(): Promise<User[]> {
    return this.getUsersByType('admin');
  }
}

export default UserService;

