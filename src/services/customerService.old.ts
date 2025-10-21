/**
 * Customer Service - API Only
 * 
 * This service handles all customer operations through API calls.
 * No direct database access - all operations go through the backend API.
 */

import { 
  apiGetBusinessCustomers, 
  apiGetCustomerById, 
  apiUpdateCustomer,
  apiGetCustomerPrograms,
  apiEnrollCustomer 
} from './apiClient';
import type { User } from './apiClient';

export interface Customer extends User {
  tier?: string;
  loyalty_points?: number;
  total_spent?: number;
}

export interface CustomerProgram {
  id: string;
  customerId: string;
  programId: string;
  currentPoints: number;
  enrolledAt: string;
  status: string;
  programName?: string;
}

/**
 * Customer Service
 * Manages customer operations through secure API endpoints
 */
export class CustomerService {
  /**
   * Get all customers for a business
   */
  static async getBusinessCustomers(businessId: string): Promise<Customer[]> {
    try {
      const response = await apiGetBusinessCustomers(businessId);
      return response.data || response || [];
    } catch (error) {
      console.error('Error getting business customers:', error);
      return [];
    }
  }

  /**
   * Get customer by ID
   */
  static async getCustomerById(customerId: string): Promise<Customer | null> {
    try {
      const response = await apiGetCustomerById(customerId);
      return response.data || response || null;
    } catch (error) {
      console.error('Error getting customer:', error);
      return null;
    }
  }

  /**
   * Update customer information
   */
  static async updateCustomer(
    customerId: string,
    updates: Partial<Customer>
  ): Promise<{ success: boolean; customer?: Customer; error?: string }> {
    try {
      const response = await apiUpdateCustomer(customerId, updates);
      const customer = response.data || response;
      return { success: true, customer };
    } catch (error: any) {
      console.error('Error updating customer:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to update customer' 
      };
    }
  }

  /**
   * Get customer's enrolled programs
   */
  static async getCustomerPrograms(customerId: string): Promise<CustomerProgram[]> {
    try {
      const response = await apiGetCustomerPrograms(customerId);
      return response.data || response || [];
    } catch (error) {
      console.error('Error getting customer programs:', error);
      return [];
    }
  }

  /**
   * Enroll customer in a program
   */
  static async enrollCustomer(
    customerId: string,
    programId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await apiEnrollCustomer(customerId, programId);
      return { success: true };
    } catch (error: any) {
      console.error('Error enrolling customer:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to enroll customer' 
      };
    }
  }

  /**
   * Get customer's total loyalty points across all programs
   */
  static async getCustomerTotalPoints(customerId: string): Promise<number> {
    try {
      const programs = await this.getCustomerPrograms(customerId);
      return programs.reduce((total, program) => total + (program.currentPoints || 0), 0);
    } catch (error) {
      console.error('Error getting customer total points:', error);
      return 0;
    }
  }
}

export default CustomerService;

