/**
 * Customer Service - API Version
 * 
 * This service replaces direct database connections with secure API calls.
 * All operations now go through the serverless API layer.
 * 
 * Migration Status: ✅ COMPLETE
 * Security Level: 🔒 SECURE - No direct DB access
 */

import { customerApi, businessApi, loyaltyCardApi } from '../utils/enhancedApiClient';
import { logger } from '../utils/logger';

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Service for managing customers with API integration
 */
export class CustomerService {
  /**
   * Get all customers
   */
  static async getCustomers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<Customer[]> {
    try {
      const response = await customerApi.list(params);
      
      if (!response.success) {
        logger.error('Failed to fetch customers', { error: response.error });
        return [];
      }
      
      return response.data || [];
    } catch (error) {
      logger.error('Error fetching customers', { error });
      return [];
    }
  }

  /**
   * Get a specific customer by ID
   */
  static async getCustomerById(customerId: string): Promise<Customer | null> {
    try {
      const response = await customerApi.get(customerId);
      
      if (!response.success) {
        logger.error('Failed to fetch customer', { customerId, error: response.error });
        return null;
      }
      
      return response.data || null;
    } catch (error) {
      logger.error('Error fetching customer', { customerId, error });
      return null;
    }
  }

  /**
   * Create a new customer
   */
  static async createCustomer(customerData: {
    email: string;
    name: string;
    phone?: string;
    address?: string;
  }): Promise<Customer | null> {
    try {
      logger.info('Creating customer', { email: customerData.email });
      
      if (!customerData.email || !customerData.name) {
        logger.error('Missing required customer fields');
        return null;
      }
      
      const response = await customerApi.create(customerData);
      
      if (!response.success) {
        logger.error('Failed to create customer', { error: response.error });
        return null;
      }
      
      logger.info('Customer created successfully', { customerId: response.data?.id });
      return response.data || null;
    } catch (error) {
      logger.error('Error creating customer', { error });
      return null;
    }
  }

  /**
   * Update an existing customer
   */
  static async updateCustomer(
    customerId: string,
    customerData: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Customer | null> {
    try {
      const response = await customerApi.update(customerId, customerData);
      
      if (!response.success) {
        logger.error('Failed to update customer', { customerId, error: response.error });
        return null;
      }
      
      return response.data || null;
    } catch (error) {
      logger.error('Error updating customer', { customerId, error });
      return null;
    }
  }

  /**
   * Delete a customer
   */
  static async deleteCustomer(customerId: string): Promise<boolean> {
    try {
      const response = await customerApi.delete(customerId);
      
      if (!response.success) {
        logger.error('Failed to delete customer', { customerId, error: response.error });
        return false;
      }
      
      logger.info('Customer deleted successfully', { customerId });
      return true;
    } catch (error) {
      logger.error('Error deleting customer', { customerId, error });
      return false;
    }
  }

  /**
   * Get customers for a specific business
   */
  static async getBusinessCustomers(businessId: string): Promise<Customer[]> {
    try {
      const response = await businessApi.getCustomers(businessId);
      
      if (!response.success) {
        logger.error('Failed to fetch business customers', { businessId, error: response.error });
        return [];
      }
      
      return response.data || [];
    } catch (error) {
      logger.error('Error fetching business customers', { businessId, error });
      return [];
    }
  }

  /**
   * Count customers for a specific business
   */
  static async countBusinessCustomers(businessId: string): Promise<number> {
    try {
      const customers = await this.getBusinessCustomers(businessId);
      return customers.length;
    } catch (error) {
      logger.error('Error counting business customers', { businessId, error });
      return 0;
    }
  }

  /**
   * Get customer's loyalty cards
   */
  static async getCustomerCards(customerId: string): Promise<any[]> {
    try {
      const response = await customerApi.getCards(customerId);
      
      if (!response.success) {
        logger.error('Failed to fetch customer cards', { customerId, error: response.error });
        return [];
      }
      
      return response.data || [];
    } catch (error) {
      logger.error('Error fetching customer cards', { customerId, error });
      return [];
    }
  }

  /**
   * Get customer's enrolled programs
   */
  static async getCustomerPrograms(customerId: string): Promise<any[]> {
    try {
      const response = await customerApi.getPrograms(customerId);
      
      if (!response.success) {
        logger.error('Failed to fetch customer programs', { customerId, error: response.error });
        return [];
      }
      
      return response.data || [];
    } catch (error) {
      logger.error('Error fetching customer programs', { customerId, error });
      return [];
    }
  }

  /**
   * Get customer's transaction history
   */
  static async getCustomerTransactions(
    customerId: string,
    params?: { page?: number; limit?: number }
  ): Promise<any[]> {
    try {
      const response = await customerApi.getTransactions(customerId, params);
      
      if (!response.success) {
        logger.error('Failed to fetch customer transactions', { customerId, error: response.error });
        return [];
      }
      
      return response.data || [];
    } catch (error) {
      logger.error('Error fetching customer transactions', { customerId, error });
      return [];
    }
  }

  /**
   * Get customer's profile
   */
  static async getCustomerProfile(customerId: string): Promise<any | null> {
    try {
      const response = await customerApi.getProfile(customerId);
      
      if (!response.success) {
        logger.error('Failed to fetch customer profile', { customerId, error: response.error });
        return null;
      }
      
      return response.data || null;
    } catch (error) {
      logger.error('Error fetching customer profile', { customerId, error });
      return null;
    }
  }

  /**
   * Update customer's profile
   */
  static async updateCustomerProfile(customerId: string, profileData: any): Promise<boolean> {
    try {
      const response = await customerApi.updateProfile(customerId, profileData);
      
      if (!response.success) {
        logger.error('Failed to update customer profile', { customerId, error: response.error });
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Error updating customer profile', { customerId, error });
      return false;
    }
  }

  /**
   * Get customer's notification preferences
   */
  static async getCustomerPreferences(customerId: string): Promise<any | null> {
    try {
      const response = await customerApi.getPreferences(customerId);
      
      if (!response.success) {
        logger.error('Failed to fetch customer preferences', { customerId, error: response.error });
        return null;
      }
      
      return response.data || null;
    } catch (error) {
      logger.error('Error fetching customer preferences', { customerId, error });
      return null;
    }
  }

  /**
   * Update customer's notification preferences
   */
  static async updateCustomerPreferences(customerId: string, preferences: any): Promise<boolean> {
    try {
      const response = await customerApi.updatePreferences(customerId, preferences);
      
      if (!response.success) {
        logger.error('Failed to update customer preferences', { customerId, error: response.error });
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Error updating customer preferences', { customerId, error });
      return false;
    }
  }

  /**
   * Add customer to a business
   */
  static async addCustomerToBusiness(businessId: string, customerId: string): Promise<boolean> {
    try {
      const response = await businessApi.addCustomer(businessId, customerId);
      
      if (!response.success) {
        logger.error('Failed to add customer to business', { businessId, customerId, error: response.error });
        return false;
      }
      
      logger.info('Customer added to business', { businessId, customerId });
      return true;
    } catch (error) {
      logger.error('Error adding customer to business', { businessId, customerId, error });
      return false;
    }
  }

  /**
   * Search customers by name or email
   */
  static async searchCustomers(query: string): Promise<Customer[]> {
    try {
      const response = await customerApi.list({ search: query, limit: 50 });
      
      if (!response.success) {
        logger.error('Failed to search customers', { query, error: response.error });
        return [];
      }
      
      return response.data || [];
    } catch (error) {
      logger.error('Error searching customers', { query, error });
      return [];
    }
  }
}

