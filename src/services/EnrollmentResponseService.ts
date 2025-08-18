/**
 * EnrollmentResponseService - Comprehensive enrollment response handling
 * 
 * This service consolidates all enrollment response logic into one reliable service
 * that handles customer acceptance/decline of program invitations with immediate
 * card creation and real-time UI updates.
 */

import sql from '../utils/db';
import { v4 as uuidv4 } from 'uuid';
import { CustomerNotificationService } from './customerNotificationService';
import { createCardSyncEvent, createEnrollmentSyncEvent } from '../utils/realTimeSync';
import { logger } from '../utils/logger';
import type { CustomerNotificationType } from '../types/customerNotification';

export interface EnrollmentResponse {
  success: boolean;
  message: string;
  cardId?: string;
  errorCode?: string;
  errorLocation?: string;
}

export interface EnrollmentRequest {
  id: string;
  customerId: string;
  businessId: string;
  programId: string;
  programName: string;
  businessName: string;
  status: string;
  data?: Record<string, any>;
}

/**
 * Comprehensive service for handling enrollment responses
 */
export class EnrollmentResponseService {
  
  /**
   * Process customer response to enrollment invitation
   */
  static async processEnrollmentResponse(
    requestId: string, 
    approved: boolean
  ): Promise<EnrollmentResponse> {
    try {
      logger.info('Processing enrollment response', { requestId, approved });
      
      // Get enrollment request details
      const request = await this.getEnrollmentRequest(requestId);
      if (!request) {
        return {
          success: false,
          message: 'Enrollment request not found',
          errorCode: 'REQUEST_NOT_FOUND',
          errorLocation: 'getEnrollmentRequest'
        };
      }
      
      // Check if already processed
      if (request.status !== 'PENDING') {
        return {
          success: false,
          message: `Request already ${request.status.toLowerCase()}`,
          errorCode: 'ALREADY_PROCESSED',
          errorLocation: 'statusCheck'
        };
      }
      
      // Update request status
      await this.updateRequestStatus(requestId, approved ? 'APPROVED' : 'REJECTED');
      
      // Mark notifications as actioned
      await this.markNotificationsAsActioned(requestId);
      
      if (approved) {
        return await this.handleApprovedEnrollment(request);
      } else {
        return await this.handleRejectedEnrollment(request);
      }
      
    } catch (error) {
      logger.error('Error processing enrollment response', { error, requestId, approved });
      return {
        success: false,
        message: 'An error occurred while processing the enrollment',
        errorCode: 'PROCESSING_ERROR',
        errorLocation: 'processEnrollmentResponse'
      };
    }
  }
  
  /**
   * Get enrollment request details
   */
  private static async getEnrollmentRequest(requestId: string): Promise<EnrollmentRequest | null> {
    try {
      const result = await sql`
        SELECT ar.*, lp.name as program_name, u.name as business_name
        FROM customer_approval_requests ar
        JOIN loyalty_programs lp ON ar.entity_id = lp.id::text
        JOIN users u ON lp.business_id = u.id
        WHERE ar.id = ${requestId} AND ar.request_type = 'ENROLLMENT'
      `;
      
      if (!result.length) return null;
      
      const request = result[0];
      return {
        id: request.id,
        customerId: request.customer_id?.toString() || '',
        businessId: request.business_id?.toString() || '',
        programId: request.entity_id?.toString() || '',
        programName: request.program_name || 'Loyalty Program',
        businessName: request.business_name || 'Business',
        status: request.status,
        data: request.data
      };
    } catch (error) {
      logger.error('Error getting enrollment request', { error, requestId });
      return null;
    }
  }
  
  /**
   * Update request status
   */
  private static async updateRequestStatus(requestId: string, status: string): Promise<void> {
    await sql`
      UPDATE customer_approval_requests
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${requestId}
    `;
  }
  
  /**
   * Mark notifications as actioned
   */
  private static async markNotificationsAsActioned(requestId: string): Promise<void> {
    await sql`
      UPDATE customer_notifications
      SET action_taken = true, updated_at = NOW()
      WHERE reference_id = ${requestId}
    `;
  }
  
  /**
   * Handle approved enrollment with immediate card creation
   */
  private static async handleApprovedEnrollment(request: EnrollmentRequest): Promise<EnrollmentResponse> {
    try {
      logger.info('Handling approved enrollment', { request });
      
      // Create or update enrollment record
      const enrollmentId = await this.ensureEnrollmentExists(request);
      
      // Create loyalty card immediately
      const cardId = await this.createLoyaltyCard(request);
      
      if (!cardId) {
        return {
          success: false,
          message: 'Failed to create loyalty card',
          errorCode: 'CARD_CREATION_FAILED',
          errorLocation: 'createLoyaltyCard'
        };
      }
      
      // Create customer notification
      await this.createCustomerNotification(request, cardId, 'ENROLLMENT_ACCEPTED');
      
      // Create business notification
      await this.createBusinessNotification(request, cardId, 'ENROLLMENT_ACCEPTED');
      
      // Update customer-business relationship
      await this.updateCustomerBusinessRelationship(request);
      
      // Dispatch real-time events for immediate UI updates
      this.dispatchRealTimeEvents(request, cardId, 'APPROVED');
      
      logger.info('Enrollment approved successfully', { cardId, enrollmentId });
      
      return {
        success: true,
        message: 'Enrollment approved and card created successfully',
        cardId
      };
      
    } catch (error) {
      logger.error('Error handling approved enrollment', { error, request });
      return {
        success: false,
        message: 'Failed to process approved enrollment',
        errorCode: 'APPROVAL_PROCESSING_ERROR',
        errorLocation: 'handleApprovedEnrollment'
      };
    }
  }
  
  /**
   * Handle rejected enrollment
   */
  private static async handleRejectedEnrollment(request: EnrollmentRequest): Promise<EnrollmentResponse> {
    try {
      logger.info('Handling rejected enrollment', { request });
      
      // Create customer notification
      await this.createCustomerNotification(request, undefined, 'ENROLLMENT_REJECTED');
      
      // Create business notification
      await this.createBusinessNotification(request, undefined, 'ENROLLMENT_REJECTED');
      
      // Dispatch real-time events
      this.dispatchRealTimeEvents(request, undefined, 'REJECTED');
      
      logger.info('Enrollment rejected successfully');
      
      return {
        success: true,
        message: 'Enrollment request declined successfully'
      };
      
    } catch (error) {
      logger.error('Error handling rejected enrollment', { error, request });
      return {
        success: false,
        message: 'Failed to process declined enrollment',
        errorCode: 'REJECTION_PROCESSING_ERROR',
        errorLocation: 'handleRejectedEnrollment'
      };
    }
  }
  
  /**
   * Ensure enrollment record exists
   */
  private static async ensureEnrollmentExists(request: EnrollmentRequest): Promise<string> {
    // Check if already enrolled
    const existingEnrollment = await sql`
      SELECT id FROM program_enrollments
      WHERE customer_id = ${request.customerId}
      AND program_id = ${request.programId}
    `;
    
    if (existingEnrollment.length > 0) {
      // Update status if needed
      if (existingEnrollment[0].status !== 'ACTIVE') {
        await sql`
          UPDATE program_enrollments
          SET status = 'ACTIVE', updated_at = NOW()
          WHERE id = ${existingEnrollment[0].id}
        `;
      }
      return existingEnrollment[0].id.toString();
    }
    
    // Create new enrollment
    const result = await sql`
      INSERT INTO program_enrollments (
        customer_id,
        program_id,
        business_id,
        status,
        current_points,
        total_points_earned,
        enrolled_at
      ) VALUES (
        ${request.customerId},
        ${request.programId},
        ${request.businessId},
        'ACTIVE',
        0,
        0,
        NOW()
      ) RETURNING id
    `;
    
    return result[0].id.toString();
  }
  
  /**
   * Create loyalty card for enrollment
   */
  private static async createLoyaltyCard(request: EnrollmentRequest): Promise<string | null> {
    try {
      // Generate unique card number
      const cardNumber = this.generateCardNumber();
      
      // Ensure table structure
      await sql`
        ALTER TABLE loyalty_cards 
        ADD COLUMN IF NOT EXISTS card_number VARCHAR(50) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE',
        ADD COLUMN IF NOT EXISTS tier VARCHAR(50) DEFAULT 'STANDARD',
        ADD COLUMN IF NOT EXISTS points_multiplier NUMERIC(10,2) DEFAULT 1.0
      `;
      
      // Create card
      const result = await sql`
        INSERT INTO loyalty_cards (
          customer_id,
          business_id,
          program_id,
          card_number,
          card_type,
          tier,
          points,
          points_multiplier,
          is_active,
          status,
          created_at,
          updated_at
        ) VALUES (
          ${request.customerId},
          ${request.businessId},
          ${request.programId},
          ${cardNumber},
          'STANDARD',
          'STANDARD',
          0,
          1.0,
          true,
          'ACTIVE',
          NOW(),
          NOW()
        ) RETURNING id
      `;
      
      return result[0]?.id?.toString() || null;
      
    } catch (error) {
      logger.error('Error creating loyalty card', { error, request });
      return null;
    }
  }
  
  /**
   * Generate unique card number
   */
  private static generateCardNumber(): string {
    const prefix = 'GC';
    const timestamp = Date.now().toString().slice(-6);
    const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${timestamp}-${randomPart}`;
  }
  
  /**
   * Create customer notification
   */
  private static async createCustomerNotification(
    request: EnrollmentRequest, 
    cardId?: string, 
    type: CustomerNotificationType = 'ENROLLMENT'
  ): Promise<void> {
    const title = type === 'ENROLLMENT_ACCEPTED' ? 'Program Joined' : 'Program Declined';
    const message = type === 'ENROLLMENT_ACCEPTED' 
      ? `You've joined ${request.businessName}'s ${request.programName} program`
      : `You've declined to join ${request.businessName}'s ${request.programName} program`;
    
    await CustomerNotificationService.createNotification({
      customerId: request.customerId,
      businessId: request.businessId,
      type,
      title,
      message,
      data: {
        programId: request.programId,
        programName: request.programName,
        cardId
      },
      requiresAction: false,
      actionTaken: false,
      isRead: false
    });
  }
  
  /**
   * Create business notification
   */
  private static async createBusinessNotification(
    request: EnrollmentRequest, 
    cardId?: string, 
    type: CustomerNotificationType = 'ENROLLMENT'
  ): Promise<void> {
    const title = type === 'ENROLLMENT_ACCEPTED' ? 'Customer Joined Program' : 'Enrollment Declined';
    const message = type === 'ENROLLMENT_ACCEPTED'
      ? `A customer has joined your ${request.programName} program`
      : `A customer has declined to join your ${request.programName} program`;
    
    await CustomerNotificationService.createNotification({
      customerId: request.businessId,
      businessId: request.businessId,
      type,
      title,
      message,
      data: {
        programId: request.programId,
        programName: request.programName,
        customerId: request.customerId,
        cardId
      },
      requiresAction: false,
      actionTaken: false,
      isRead: false
    });
  }
  
  /**
   * Update customer-business relationship
   */
  private static async updateCustomerBusinessRelationship(request: EnrollmentRequest): Promise<void> {
    try {
      // Ensure table exists
      await sql`
        CREATE TABLE IF NOT EXISTS customer_business_relationships (
          id SERIAL PRIMARY KEY,
          customer_id VARCHAR(255) NOT NULL,
          business_id VARCHAR(255) NOT NULL,
          status VARCHAR(50) DEFAULT 'ACTIVE',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(customer_id, business_id)
        )
      `;
      
      // Insert or update relationship
      await sql`
        INSERT INTO customer_business_relationships (
          customer_id,
          business_id,
          status,
          created_at,
          updated_at
        ) VALUES (
          ${request.customerId},
          ${request.businessId},
          'ACTIVE',
          NOW(),
          NOW()
        )
        ON CONFLICT (customer_id, business_id) 
        DO UPDATE SET status = 'ACTIVE', updated_at = NOW()
      `;
    } catch (error) {
      logger.error('Error updating customer-business relationship', { error, request });
      // Non-critical error, continue execution
    }
  }
  
  /**
   * Dispatch real-time events for immediate UI updates
   */
  private static dispatchRealTimeEvents(
    request: EnrollmentRequest, 
    cardId?: string, 
    action: 'APPROVED' | 'REJECTED' = 'APPROVED'
  ): void {
    try {
      if (typeof window === 'undefined') return;
      
      if (action === 'APPROVED' && cardId) {
        // Create card sync event
        createCardSyncEvent(
          cardId,
          request.customerId,
          request.businessId,
          'INSERT',
          {
            programId: request.programId,
            programName: request.programName
          }
        );
        
        // Create enrollment sync event
        createEnrollmentSyncEvent(
          request.customerId,
          request.businessId,
          request.programId,
          'UPDATE'
        );
      }
      
      // Dispatch custom event for real-time updates
      const event = new CustomEvent('enrollment-response-processed', {
        detail: {
          action,
          customerId: request.customerId,
          businessId: request.businessId,
          programId: request.programId,
          programName: request.programName,
          cardId,
          timestamp: new Date().toISOString()
        }
      });
      
      window.dispatchEvent(event);
      
    } catch (error) {
      logger.error('Error dispatching real-time events', { error, request, action });
    }
  }
}