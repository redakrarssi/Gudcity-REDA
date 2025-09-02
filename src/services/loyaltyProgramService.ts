import sql from '../utils/db';
import type { LoyaltyProgram, RewardTier, ProgramType } from '../types/loyalty';
import { CustomerService } from './customerService';
import { v4 as uuidv4 } from 'uuid';
import { CustomerNotificationService } from './customerNotificationService';
import { NotificationService } from './notificationService';
import * as serverFunctions from '../server';
import { createEnrollmentSyncEvent, createNotificationSyncEvent, createCardSyncEvent } from '../utils/realTimeSync';
import { log as logger } from '../utils/logger';
import type { ApprovalRequest, CustomerNotificationType, ApprovalRequestType } from '../types/customerNotification';

/**
 * Service for managing loyalty programs with database integration
 */
export class LoyaltyProgramService {
  /**
   * Get all loyalty programs for a business
   */
  static async getBusinessPrograms(businessId: string): Promise<LoyaltyProgram[]> {
    try {
      const result = await sql`
        SELECT * FROM loyalty_programs
        WHERE business_id = ${parseInt(businessId)}
        ORDER BY created_at DESC
      `;
      
      // Load reward tiers for each program
      const programsWithRewards = await Promise.all(result.map(async (program: any) => {
        const rewardTiers = await this.getProgramRewardTiers(program.id.toString());
        
        return {
          id: program.id.toString(),
          businessId: program.business_id.toString(),
          name: program.name,
          description: program.description || '',
          type: program.type || 'POINTS',
          pointValue: parseFloat(program.points_per_dollar || 1),
          rewardTiers: rewardTiers,
          expirationDays: program.points_expiry_days,
          status: program.status || 'ACTIVE',
          createdAt: program.created_at,
          updatedAt: program.updated_at
        };
      }));
      
      return programsWithRewards;
    } catch (error) {
      console.error('Error fetching business programs:', error);
      return [];
    }
  }

  /**
   * Get a specific loyalty program by ID
   */
  static async getProgramById(programId: string): Promise<LoyaltyProgram | null> {
    try {
      const programs = await sql`
        SELECT * FROM loyalty_programs
        WHERE id = ${programId}
      `;
      
      if (!programs.length) {
        return null;
      }
      
      const program = programs[0];
      const rewardTiers = await this.getProgramRewardTiers(programId);
      
      return {
        id: program.id,
        businessId: program.business_id,
        name: program.name,
        description: program.description,
        type: program.type as ProgramType || 'POINTS',
        pointValue: program.points_per_dollar || 1,
        expirationDays: program.points_expiry_days,
        status: program.status || 'ACTIVE',
        createdAt: program.created_at,
        updatedAt: program.updated_at,
        rewardTiers
      } as LoyaltyProgram;
    } catch (error) {
      console.error(`Error fetching program ${programId}:`, error);
      return null;
    }
  }

  /**
   * Get reward tiers for a specific program
   */
  static async getProgramRewardTiers(programId: string): Promise<RewardTier[]> {
    try {
      const tiers = await sql`
        SELECT * FROM reward_tiers
        WHERE program_id = ${programId}
        ORDER BY points_required ASC
      `;
      
      return tiers.map((tier: any) => ({
        id: tier.id,
        programId: tier.program_id,
        pointsRequired: tier.points_required,
        reward: tier.reward
      }));
    } catch (error) {
      console.error(`Error fetching reward tiers for program ${programId}:`, error);
      return [];
    }
  }

  /**
   * Create a new loyalty program
   */
  static async createProgram(program: Omit<LoyaltyProgram, 'id' | 'createdAt' | 'updatedAt'>): Promise<LoyaltyProgram | null> {
    try {
      console.log('Creating program with data:', JSON.stringify(program, null, 2));
      
      // Ensure we have valid data
      if (!program.businessId || !program.name || !program.type) {
        console.error('Missing required program fields:', { 
          businessId: program.businessId, 
          name: program.name, 
          type: program.type 
        });
        return null;
      }
      
      // Parse businessId to ensure it's a number
      const businessId = parseInt(program.businessId);
      
      if (isNaN(businessId)) {
        console.error(`Invalid business ID: ${program.businessId}`);
        return null;
      }
      
      console.log('Parsed business ID:', businessId);
      
      try {
        // Insert the program with explicit type checking
        console.log('Executing program insert query...');
      const result = await sql`
        INSERT INTO loyalty_programs (
          business_id,
          name,
          description,
          type,
            points_per_dollar,
            points_expiry_days,
            status
        )
        VALUES (
            ${businessId},
            ${String(program.name)},
            ${program.description ? String(program.description) : ''},
            ${String(program.type)},
            ${Number(program.pointValue || 1)},
            ${program.expirationDays === null ? null : Number(program.expirationDays || 0)},
            ${program.status ? String(program.status) : 'ACTIVE'}
        )
          RETURNING id
      `;
        
        console.log('Program insert query result:', result);
      
      if (!result.length) {
          console.error('No result returned from program insertion');
        return null;
      }
      
        const programId = result[0].id;
        console.log('Created new program with ID:', programId);
      
      // Insert reward tiers if provided
      if (program.rewardTiers && program.rewardTiers.length > 0) {
          try {
            console.log(`Adding ${program.rewardTiers.length} reward tiers`);
            for (const tier of program.rewardTiers) {
              if (!tier.reward || tier.pointsRequired === undefined) {
                console.warn('Skipping invalid reward tier:', tier);
                continue;
              }
              
              console.log('Adding reward tier:', { 
                programId: programId, 
                pointsRequired: Number(tier.pointsRequired), 
                reward: String(tier.reward)
              });
              
              await sql`
            INSERT INTO reward_tiers (
              program_id,
              points_required,
              reward
            )
            VALUES (
                  ${programId},
                  ${Number(tier.pointsRequired)},
                  ${String(tier.reward)}
            )
              `;
            }
            console.log('All reward tiers created successfully');
          } catch (tierError) {
            console.error('Error inserting reward tiers:', tierError);
            // Continue execution to return the program even if tiers failed
          }
      }
      
      // Return the created program with reward tiers
        console.log('Fetching complete program data...');
        const completeProgram = await this.getProgramById(String(programId));
        console.log('Complete program data:', completeProgram);
        return completeProgram;
      } catch (queryError: any) {
        console.error('Database query error during program creation:', queryError);
        throw new Error(`Database query failed: ${queryError.message || JSON.stringify(queryError)}`);
      }
    } catch (error) {
      console.error('Error creating loyalty program:', error);
      // Log more details about the program data for debugging
      console.error('Program data:', JSON.stringify(program, null, 2));
      throw error; // Re-throw the error to be handled by the caller
    }
  }

  /**
   * Update an existing loyalty program
   */
  static async updateProgram(
    programId: string, 
    programData: Partial<Omit<LoyaltyProgram, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>>
  ): Promise<LoyaltyProgram | null> {
    try {
      // Start building the update query
      const updateFields: any[] = [];
      
      if (programData.name !== undefined) {
        updateFields.push(sql`name = ${programData.name}`);
      }
      
      if (programData.description !== undefined) {
        updateFields.push(sql`description = ${programData.description}`);
      }
      
      if (programData.type !== undefined) {
        updateFields.push(sql`type = ${programData.type}`);
      }
      
      if (programData.pointValue !== undefined) {
        updateFields.push(sql`points_per_dollar = ${programData.pointValue}`);
      }
      
      if (programData.expirationDays !== undefined) {
        updateFields.push(sql`points_expiry_days = ${programData.expirationDays}`);
      }
      
      if (programData.status !== undefined) {
        updateFields.push(sql`status = ${programData.status}`);
      }
      
      // Always update the updated_at timestamp
      updateFields.push(sql`updated_at = NOW()`);
      
      // Only run the update if there are fields to update
      if (updateFields.length > 0) {
        // Handle each field separately since we can't dynamically build the query
        if (programData.name !== undefined) {
          await sql`UPDATE loyalty_programs SET name = ${programData.name} WHERE id = ${programId}`;
        }
        
        if (programData.description !== undefined) {
          await sql`UPDATE loyalty_programs SET description = ${programData.description} WHERE id = ${programId}`;
        }
        
        if (programData.type !== undefined) {
          await sql`UPDATE loyalty_programs SET type = ${programData.type} WHERE id = ${programId}`;
        }
        
        if (programData.pointValue !== undefined) {
          await sql`UPDATE loyalty_programs SET points_per_dollar = ${programData.pointValue} WHERE id = ${programId}`;
        }
        
        if (programData.expirationDays !== undefined) {
          await sql`UPDATE loyalty_programs SET points_expiry_days = ${programData.expirationDays} WHERE id = ${programId}`;
        }
        
        if (programData.status !== undefined) {
          await sql`UPDATE loyalty_programs SET status = ${programData.status} WHERE id = ${programId}`;
        }
        
        // Always update the timestamp
        await sql`UPDATE loyalty_programs SET updated_at = NOW() WHERE id = ${programId}`;
      }
      
      // Update reward tiers if provided
      if (programData.rewardTiers) {
        // First delete existing reward tiers
        await sql`DELETE FROM reward_tiers WHERE program_id = ${programId}`;
        
        // Then insert new ones
        if (programData.rewardTiers.length > 0) {
          await Promise.all(programData.rewardTiers.map((tier: RewardTier) =>
            sql`
              INSERT INTO reward_tiers (
                program_id,
                points_required,
                reward
              )
              VALUES (
                ${programId},
                ${tier.pointsRequired},
                ${tier.reward}
              )
            `
          ));
        }
      }
      
      // Return the updated program
      return await this.getProgramById(programId);
    } catch (error) {
      console.error(`Error updating program ${programId}:`, error);
      return null;
    }
  }

  /**
   * Get all customers enrolled in a specific program
   */
  static async getEnrolledCustomers(programId: string): Promise<{customerId: string, customerName: string}[]> {
    try {
      const result = await sql`
        SELECT DISTINCT 
          cp.customer_id,
          c.name as customer_name
        FROM customer_programs cp
        LEFT JOIN customers c ON cp.customer_id = c.id
        WHERE cp.program_id = ${parseInt(programId)}
      `;
      
      return result.map((row: any) => ({
        customerId: row.customer_id.toString(),
        customerName: row.customer_name || 'Customer'
      }));
    } catch (error) {
      console.error(`Error getting enrolled customers for program ${programId}:`, error);
      return [];
    }
  }

  /**
   * Delete a loyalty program and notify enrolled customers
   */
  static async deleteProgram(programId: string): Promise<boolean> {
    try {
      // First get program info and enrolled customers before deletion
      const programInfo = await this.getProgramById(programId);
      if (!programInfo) {
        console.warn(`Program ${programId} not found for deletion`);
        return false;
      }

      const enrolledCustomers = await this.getEnrolledCustomers(programId);
      
      // Delete associated reward tiers first (due to foreign key constraints)
      await sql`DELETE FROM reward_tiers WHERE program_id = ${programId}`;
      
      // Delete customer enrollments
      await sql`DELETE FROM customer_programs WHERE program_id = ${programId}`;
      
      // Then delete the program
      const result = await sql`
        DELETE FROM loyalty_programs
        WHERE id = ${programId}
        RETURNING id
      `;
      
      const deletionSuccess = result.length > 0;
      
      // If deletion was successful, notify all enrolled customers
      if (deletionSuccess && enrolledCustomers.length > 0) {
        console.log(`Program deleted successfully. Notifying ${enrolledCustomers.length} enrolled customers`);
        
        // Get business name for the notification
        let businessName = 'the business';
        try {
          const businessResult = await sql`
            SELECT name FROM users WHERE id = ${parseInt(programInfo.businessId)}
          `;
          if (businessResult.length > 0 && businessResult[0].name) {
            businessName = businessResult[0].name;
          }
        } catch (error) {
          console.error('Error fetching business name for notification:', error);
          // Continue with default business name
        }
        
        // Create notifications for all enrolled customers
        const notificationPromises = enrolledCustomers.map(async (customer) => {
          try {
            return await CustomerNotificationService.createNotification({
              customerId: customer.customerId,
              businessId: programInfo.businessId,
              type: 'PROGRAM_DELETED',
              title: 'Program Discontinued',
              message: `The loyalty program "${programInfo.name}" has been discontinued by ${businessName}. Your points and rewards from this program are no longer available.`,
              data: {
                programId: programId,
                programName: programInfo.name,
                businessName: businessName,
                deletedAt: new Date().toISOString(),
                customerName: customer.customerName
              },
              referenceId: programId,
              requiresAction: false,
              actionTaken: false,
              isRead: false,
              priority: 'HIGH',
              style: 'error'
            });
          } catch (error) {
            console.error(`Error creating deletion notification for customer ${customer.customerId}:`, error);
            return null;
          }
        });
        
        // Wait for all notifications to be created
        const notifications = await Promise.all(notificationPromises);
        const successfulNotifications = notifications.filter(n => n !== null);
        
        console.log(`Successfully created ${successfulNotifications.length} deletion notifications`);
      }
      
      return deletionSuccess;
    } catch (error) {
      console.error(`Error deleting program ${programId}:`, error);
      return false;
    }
  }

  /**
   * Enroll a customer in a loyalty program
   */
  static async enrollCustomer(
    customerId: string,
    programId: string,
    requireApproval: boolean = true
  ): Promise<{ success: boolean; message?: string; error?: string; cardId?: string }> {
    try {
      // Validate inputs
      if (!customerId || !programId) {
        logger.error('Missing required parameters for enrollment', { customerId, programId });
        return { success: false, error: 'Missing required parameters' };
      }

      logger.info('Processing enrollment request', { customerId, programId, requireApproval });

      // Get program details to check business ID
      const program = await this.getProgramById(programId);
      if (!program) {
        logger.error('Program not found', { programId });
        return { success: false, error: 'Program not found' };
      }

      const businessId = program.businessId;

      // Get business name for notifications
      const businessResult = await sql`SELECT name FROM users WHERE id = ${businessId}`;
      const businessName = businessResult.length > 0 ? businessResult[0].name : 'Business';

      // Check if already enrolled
      const enrollment = await sql`
        SELECT * FROM program_enrollments
        WHERE customer_id = ${customerId}
        AND program_id = ${programId}
      `;

      if (enrollment.length > 0) {
        // Already enrolled
        const status = enrollment[0].status;
        
        if (status === 'ACTIVE') {
          logger.info('Customer already enrolled in program', { customerId, programId });
          return { success: false, error: 'Customer already enrolled in this program' };
        } else if (status === 'PENDING') {
          logger.info('Enrollment already pending', { customerId, programId });
          return { success: false, error: 'Enrollment request already pending' };
        } else if (status === 'INACTIVE') {
          // Reactivate enrollment
          await sql`
            UPDATE program_enrollments
            SET status = 'ACTIVE', updated_at = NOW()
            WHERE customer_id = ${customerId} AND program_id = ${programId}
          `;
          
          logger.info('Reactivated enrollment', { customerId, programId });
          return { success: true, message: 'Enrollment reactivated' };
        }
      }
      
      // Always require approval when a business owner initiates the enrollment
      // Only skip approval when the customer initiates the enrollment themselves
      if (requireApproval) {
        logger.info('Creating approval request for enrollment', { customerId, programId });
        
        // Create approval request
        try {
          // First create a notification
          const notification = await CustomerNotificationService.createNotification({
            customerId,
            businessId,
            type: 'ENROLLMENT_REQUEST' as CustomerNotificationType,
            title: 'Program Enrollment Request',
            message: `${businessName} would like to enroll you in their ${program.name} loyalty program. Would you like to join?`,
            requiresAction: true,
            actionTaken: false,
            isRead: false,
            referenceId: programId,
            data: {
              programId,
              programName: program.name,
              businessId,
              businessName
            }
          });
          
          if (!notification) {
            logger.error('Failed to create notification for enrollment request');
            return { success: false, error: 'Failed to create enrollment notification' };
          }
          
          // Create an expiration date 7 days from now
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);
          
          // Then create the approval request with better error handling
          try {
            const approvalRequest = await CustomerNotificationService.createApprovalRequest({
              customerId,
              businessId,
              requestType: 'ENROLLMENT',
              entityId: programId,
              notificationId: notification.id,
              status: 'PENDING',
              expiresAt: expiresAt.toISOString(),
              data: {
                programId,
                programName: program.name,
                businessId,
                businessName,
                message: `${businessName} would like to enroll you in their ${program.name} loyalty program. Would you like to join?`
              }
            });
            
            // Emit real-time notification via socket
            try {
              // Use a safer way to call server functions that avoids type errors
              const server = serverFunctions as any;
              if (server && typeof server.emitApprovalRequest === 'function') {
                server.emitApprovalRequest(customerId, approvalRequest);
              }
              
              // Create notification sync event for real-time UI updates
              createEnrollmentSyncEvent(customerId, businessId, programId, 'INSERT');
              
              // Create notification sync event
              const notificationData = {
                type: 'ENROLLMENT_REQUEST',
                programName: program.name,
                businessId,
                customerId
              };
              createNotificationSyncEvent(approvalRequest.id, customerId, businessId, 'INSERT', notificationData);
              
              logger.info('Enrollment approval request created and notification sent', { 
                customerId, programId, approvalId: approvalRequest.id 
              });
            } catch (emitError) {
              logger.error('Error emitting approval notification', { error: emitError });
              // Continue execution even if emit fails
            }
            
            return { 
              success: true, 
              message: 'Enrollment request sent to customer for approval' 
            };
          } catch (approvalError) {
            logger.error('Error creating approval request', { error: approvalError });
            return { success: false, error: 'Failed to create approval request. Please try again.' };
          }
        } catch (notificationError) {
          logger.error('Error creating notification for enrollment', { error: notificationError });
          return { success: false, error: 'Failed to send enrollment notification. Please try again.' };
        }
      }

      // Direct enrollment without approval (customer initiated)
      logger.info('Directly enrolling customer without approval', { customerId, programId });
      
      // Create enrollment record
      await sql`
        INSERT INTO program_enrollments (
          customer_id,
          program_id,
          business_id,
          status,
          current_points,
          total_points_earned,
          enrolled_at
        ) VALUES (
          ${customerId},
          ${programId},
          ${businessId},
          'ACTIVE',
          0,
          0,
          NOW()
        )
      `;
      
      // Create card for the enrollment
      // Generate a unique card number
      const prefix = 'GC';
      const timestamp = Date.now().toString().slice(-6);
      const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const cardNumber = `${prefix}-${timestamp}-${randomPart}`;
      
      try {
        // Ensure the loyalty_cards table has the card_number column
        await sql`
          ALTER TABLE loyalty_cards 
          ADD COLUMN IF NOT EXISTS card_number VARCHAR(50) DEFAULT NULL,
          ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE',
          ADD COLUMN IF NOT EXISTS tier VARCHAR(50) DEFAULT 'STANDARD',
          ADD COLUMN IF NOT EXISTS points_multiplier NUMERIC(10,2) DEFAULT 1.0
        `;
        
        const cardResult = await sql`
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
            ${customerId},
            ${businessId},
            ${programId},
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
        
        if (!cardResult.length) {
          return { success: false, message: 'Failed to create loyalty card' };
        }
        
        const cardId = cardResult[0].id.toString();
        
        // Send GREEN notification to business owner about new enrollment
        try {
          console.log('🔔 Creating business notification for successful enrollment:', {
            customerId: customerId,
            businessId: businessId,
            programName: program.name
          });

          const businessEnrollmentNotification = await NotificationService.createRedemptionNotification({
            customerId: customerId,
            customerName: 'New Customer', // Will be updated by JOIN in business dashboard
            businessId: businessId,
            programId: programId,
            programName: program.name,
            points: 0, // Enrollment, not redemption
            reward: `New enrollment in ${program.name}`,
            rewardId: 'enrollment'
          });

          if (businessEnrollmentNotification.success) {
            console.log('✅ Business enrollment notification created:', {
              notificationId: businessEnrollmentNotification.notificationId,
              businessId: businessId,
              programName: program.name
            });
            
            // Dispatch real-time event for business dashboard
            if (typeof window !== 'undefined') {
              const businessEvent = new CustomEvent('redemption-notification', {
                detail: {
                  type: 'NEW_ENROLLMENT',
                  businessId: businessId,
                  customerId: customerId,
                  customerName: 'New Customer',
                  programName: program.name,
                  reward: `New enrollment in ${program.name}`,
                  points: 0,
                  notificationId: businessEnrollmentNotification.notificationId,
                  timestamp: new Date().toISOString()
                }
              });
              window.dispatchEvent(businessEvent);
              console.log('📡 Real-time business enrollment event dispatched');
            }
          } else {
            console.error('❌ Failed to create business enrollment notification:', {
              error: businessEnrollmentNotification.error,
              businessId: businessId
            });
          }
        } catch (businessEnrollmentError) {
          console.error('🚨 Error sending business enrollment notification:', {
            error: businessEnrollmentError.message || businessEnrollmentError,
            businessId: businessId,
            programName: program.name
          });
        }
        
        // Create enrollment notification
        try {
          const notification = await CustomerNotificationService.createNotification({
            customerId,
            businessId,
            type: 'ENROLLMENT' as CustomerNotificationType,
            title: 'Welcome to New Program',
            message: `You have been enrolled in ${program.name}`,
            requiresAction: false,
            actionTaken: false,
            isRead: false,
            referenceId: programId,
            data: {
              programId,
              programName: program.name,
              cardId
            }
          });
          
          // Emit real-time notification
          try {
            if (serverFunctions.emitNotification && typeof serverFunctions.emitNotification === 'function') {
              serverFunctions.emitNotification(customerId, notification);
            }
            
            // Create notification sync event for real-time UI updates
            createEnrollmentSyncEvent(customerId, businessId, programId, 'INSERT');
            
            // Create card sync event to update UI
            createCardSyncEvent(
              cardId, 
              customerId, 
              businessId, 
              'INSERT', 
              { programId, programName: program.name }
            );
            
            logger.info('Enrollment completed and notification sent', { 
              customerId, programId, cardId 
            });
          } catch (emitError) {
            logger.error('Error emitting notification', { error: emitError });
            // Continue execution even if emit fails
          }
        } catch (notificationError) {
          logger.error('Error creating notification', { error: notificationError });
          // Continue execution even if notification fails
        }
        
        return { 
          success: true, 
          message: 'Customer successfully enrolled', 
          cardId: cardId.toString() 
        };
      } catch (error) {
        console.error('Error creating loyalty card:', error);
        return { success: false, error: 'An error occurred while creating loyalty card' };
      }
    } catch (error) {
      logger.error('Error enrolling customer', { error });
      return { success: false, error: 'An error occurred while enrolling customer' };
    }
  }
  
  /**
   * Handle approval response for enrollment request
   */
  static async handleEnrollmentApproval(
    requestId: string,
    approved: boolean
  ): Promise<{ success: boolean; message?: string; cardId?: string }> {
    try {
      // Get the request details
      const requestResult = await sql`
        SELECT ar.*, lp.name as program_name, u.name as business_name
        FROM customer_approval_requests ar
        JOIN loyalty_programs lp ON ar.entity_id = lp.id::text
        JOIN users u ON lp.business_id = u.id
        WHERE ar.id = ${requestId} AND ar.request_type = 'ENROLLMENT'
      `;
      
      if (!requestResult.length) {
        return { success: false, message: 'Enrollment request not found' };
      }
      
      const request = requestResult[0];
      
      // Check if already processed
      if (request.status !== 'PENDING') {
        const status = typeof request.status === 'string' ? request.status.toLowerCase() : 'processed';
        return { success: false, message: `Request already ${status}` };
      }
      
      // Update request status (use response_at; table may not have updated_at)
      await sql`
        UPDATE customer_approval_requests
        SET status = ${approved ? 'APPROVED' : 'REJECTED'}, response_at = NOW()
        WHERE id = ${requestId}
      `;
      
      // Update notification to mark action taken (by notification_id)
      if (request.notification_id) {
        await sql`
          UPDATE customer_notifications
          SET action_taken = true, is_read = TRUE, read_at = NOW()
          WHERE id = ${request.notification_id}
        `;
      }
      
      // Ensure we have integer-safe IDs for DB writes
      const customerId = request.customer_id ? request.customer_id.toString() : '';
      const businessId = request.business_id ? request.business_id.toString() : '';
      const programId = request.entity_id ? request.entity_id.toString() : '';
      const customerIdInt = customerId ? parseInt(customerId) : NaN;
      const businessIdInt = businessId ? parseInt(businessId) : NaN;
      const programIdInt = programId ? parseInt(programId) : NaN;
      
      // If rejected, notify business and return
      if (!approved) {
        // Notify business that customer rejected the enrollment
        const businessNotification = await CustomerNotificationService.createNotification({
          customerId: businessIdInt,
          businessId: businessIdInt,
          type: 'ENROLLMENT_REJECTED' as CustomerNotificationType,
          title: 'Enrollment Request Rejected',
          message: `A customer has declined enrollment in ${request.program_name}`,
          requiresAction: false,
          actionTaken: false,
          isRead: false,
          data: {
            programId: programIdInt,
            programName: request.program_name,
            customerId: customerIdInt
          }
        });
        
        if (businessNotification && typeof serverFunctions !== 'undefined' && 
            serverFunctions.emitNotification && typeof serverFunctions.emitNotification === 'function') {
          serverFunctions.emitNotification(businessIdInt, businessNotification);
        }
        
        return { success: true, message: 'Enrollment request rejected' };
      }
      
      // If approved, continue with enrollment
      
      // Check if already enrolled
      const enrollment = await sql`
        SELECT * FROM program_enrollments
        WHERE customer_id = ${customerIdInt}
        AND program_id = ${programIdInt}
      `;
      
      if (enrollment.length > 0) {
        // Already enrolled, just update status if needed
        if (enrollment[0].status !== 'ACTIVE') {
          await sql`
            UPDATE program_enrollments
            SET status = 'ACTIVE', last_activity = NOW()
            WHERE customer_id = ${customerIdInt} AND program_id = ${programIdInt}
          `;
        }
        
        // Check if card exists
        const cardResult = await sql`
          SELECT id FROM loyalty_cards
          WHERE customer_id = ${customerIdInt}
          AND program_id = ${programIdInt}
        `;
        
        if (cardResult.length > 0) {
          // Card already exists
          return { 
            success: true, 
            message: 'Enrollment approved, card already exists', 
            cardId: cardResult[0].id.toString() 
          };
        }
      } else {
        // Create enrollment record
        await sql`
          INSERT INTO program_enrollments (
            customer_id,
            program_id,
            status,
            current_points,
            enrolled_at
          ) VALUES (
            ${customerIdInt},
            ${programIdInt},
            'ACTIVE',
            0,
            NOW()
          )
        `;
      }
      
      // Create card for the enrollment
      // Generate a unique card number
      const prefix = 'GC';
      const timestamp = Date.now().toString().slice(-6);
      const randomPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const cardNumber = `${prefix}-${timestamp}-${randomPart}`;
      
      try {
        // Ensure the loyalty_cards table has the card_number column
        await sql`
          ALTER TABLE loyalty_cards 
          ADD COLUMN IF NOT EXISTS card_number VARCHAR(50) DEFAULT NULL,
          ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE',
          ADD COLUMN IF NOT EXISTS tier VARCHAR(50) DEFAULT 'STANDARD',
          ADD COLUMN IF NOT EXISTS points_multiplier NUMERIC(10,2) DEFAULT 1.0
        `;
        
        const cardResult = await sql`
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
            ${customerIdInt},
            ${businessIdInt},
            ${programIdInt},
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
        
        if (!cardResult.length) {
          return { success: false, message: 'Failed to create loyalty card' };
        }
        
        const cardId = cardResult[0].id.toString();
        
        // Send enrollment confirmation notification
        const notification = await CustomerNotificationService.createNotification({
          customerId: customerIdInt,
          businessId: businessIdInt,
          type: 'ENROLLMENT' as CustomerNotificationType,
          title: 'Welcome to New Program',
          message: `You've been enrolled in ${request.business_name}'s ${request.program_name} program`,
          data: {
            programId: programIdInt,
            programName: request.program_name,
            cardId
          },
          requiresAction: false,
          actionTaken: false,
          isRead: false
        });
        
        if (notification && typeof serverFunctions !== 'undefined' && 
            serverFunctions.emitNotification && typeof serverFunctions.emitNotification === 'function') {
          // Emit real-time notification
          serverFunctions.emitNotification(customerIdInt, notification);
          
          // Create card sync event to trigger UI updates
          createCardSyncEvent(
            cardId, 
            customerIdInt, 
            businessIdInt, 
            'INSERT', 
            { 
              programId: programIdInt, 
              programName: request.program_name
            }
          );
          
          // Create enrollment sync event to update enrollment status
          createEnrollmentSyncEvent(
            customerIdInt, 
            businessIdInt, 
            programIdInt, 
            'UPDATE'
          );
        }
        
        // Send GREEN notification to business owner about successful enrollment approval
        try {
          console.log('🔔 Creating business notification for approved enrollment:', {
            customerId: customerIdInt,
            businessId: businessIdInt,
            programName: request.program_name
          });

          const businessEnrollmentNotification = await NotificationService.createRedemptionNotification({
            customerId: customerIdInt,
            customerName: 'New Customer', // Will be updated by JOIN in business dashboard
            businessId: businessIdInt,
            programId: programIdInt,
            programName: request.program_name || 'Loyalty Program',
            points: 0, // Enrollment, not redemption
            reward: `New enrollment in ${request.program_name || 'loyalty program'}`,
            rewardId: 'enrollment-approved'
          });

          if (businessEnrollmentNotification.success) {
            console.log('✅ Business enrollment notification created for approval:', {
              notificationId: businessEnrollmentNotification.notificationId,
              businessId: businessIdInt,
              programName: request.program_name
            });
            
            // Dispatch real-time event for business dashboard
            if (typeof window !== 'undefined') {
              const businessEvent = new CustomEvent('redemption-notification', {
                detail: {
                  type: 'NEW_ENROLLMENT',
                  businessId: businessIdInt,
                  customerId: customerIdInt,
                  customerName: 'New Customer',
                  programName: request.program_name || 'Loyalty Program',
                  reward: `New enrollment in ${request.program_name || 'loyalty program'}`,
                  points: 0,
                  notificationId: businessEnrollmentNotification.notificationId,
                  timestamp: new Date().toISOString()
                }
              });
              window.dispatchEvent(businessEvent);
              console.log('📡 Real-time business enrollment event dispatched for approval');
            }
          } else {
            console.error('❌ Failed to create business enrollment notification for approval:', {
              error: businessEnrollmentNotification.error,
              businessId: businessIdInt
            });
          }
        } catch (businessEnrollmentError) {
          console.error('🚨 Error sending business enrollment notification for approval:', {
            error: businessEnrollmentError.message || businessEnrollmentError,
            businessId: businessIdInt,
            programName: request.program_name
          });
        }
        
        // Notify business that customer accepted (legacy notification)
        const businessNotification = await CustomerNotificationService.createNotification({
          customerId: businessIdInt,
          businessId: businessIdInt,
          type: 'ENROLLMENT_ACCEPTED' as CustomerNotificationType,
          title: 'Customer Joined Program',
          message: `A customer has accepted enrollment in ${request.program_name}`,
          requiresAction: false,
          actionTaken: false,
          isRead: false,
          data: {
            programId: programIdInt,
            programName: request.program_name,
            customerId: customerIdInt,
            cardId
          }
        });
        
        if (businessNotification && typeof serverFunctions !== 'undefined' && 
            serverFunctions.emitNotification && typeof serverFunctions.emitNotification === 'function') {
          serverFunctions.emitNotification(businessIdInt, businessNotification);
        }
        
        // Add customer to business customers list if not already there
        try {
          // First ensure the table exists
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
          
          // Then insert or update the relationship
          await sql`
            INSERT INTO customer_business_relationships (
              customer_id,
              business_id,
              status,
              created_at,
              updated_at
            ) VALUES (
              ${customerIdInt},
              ${businessIdInt},
              'ACTIVE',
              NOW(),
              NOW()
            )
            ON CONFLICT (customer_id, business_id) 
            DO UPDATE SET status = 'ACTIVE', updated_at = NOW()
          `;
        } catch (relationError) {
          // Non-critical error, continue execution
          console.error('Error updating customer-business relationship:', relationError);
        }
        
        return { 
          success: true, 
          message: 'Enrollment approved and card created', 
          cardId 
        };
      } catch (error) {
        console.error('Error creating loyalty card:', error);
        return { success: false, error: 'An error occurred while creating loyalty card' };
      }
    } catch (error) {
      console.error('Error handling enrollment approval:', error);
      return { success: false, message: 'An error occurred while processing the enrollment' };
    }
  }

  /**
   * Get a default loyalty program for a business to use for auto-enrollment
   * @param businessId ID of the business
   * @returns The first active loyalty program or null if none exists
   */
  static async getDefaultBusinessProgram(businessId: string): Promise<LoyaltyProgram | null> {
    try {
      const result = await sql`
        SELECT * FROM loyalty_programs
        WHERE business_id = ${businessId}
        AND status = 'ACTIVE'
        ORDER BY created_at ASC
        LIMIT 1
      `;
      
      if (!result.length) {
        return null;
      }
      
      const program = result[0];
      const rewardTiers = await this.getProgramRewardTiers(program.id);
      
      return {
        id: program.id.toString(),
        businessId: program.business_id.toString(),
        name: program.name,
        description: program.description || '',
        type: program.type,
        pointValue: parseFloat(program.point_value || 0),
        rewardTiers: rewardTiers,
        expirationDays: program.expiration_days,
        status: program.status,
        createdAt: program.created_at,
        updatedAt: program.updated_at
      };
    } catch (error) {
      console.error('Error fetching default business program:', error);
      return null;
    }
  }

  /**
   * Check if a customer is enrolled in a specific loyalty program
   * @param customerId ID of the customer
   * @param programId ID of the program
   * @returns Object indicating enrollment status
   */
  static async checkEnrollment(
    customerId: string, 
    programId: string
  ): Promise<{ isEnrolled: boolean; points?: number }> {
    try {
      const result = await sql`
        SELECT current_points FROM customer_programs
        WHERE customer_id = ${parseInt(customerId)}
        AND program_id = ${parseInt(programId)}
        AND status = 'ACTIVE'
      `;

      if (result.length > 0) {
        return { 
          isEnrolled: true, 
          points: result[0].current_points || 0
        };
      }
      
      return { isEnrolled: false };
    } catch (error) {
      console.error('Error checking enrollment:', error);
      return { isEnrolled: false };
    }
  }
  
  /**
   * Check if a customer is enrolled in any loyalty program for a business
   * @param customerId ID of the customer
   * @param businessId ID of the business
   * @returns Object indicating enrollment status
   */
  static async checkCustomerEnrollment(
    customerId: string,
    businessId: string
  ): Promise<{ isEnrolled: boolean; programIds?: string[] }> {
    try {
      // Get all programs for this business
      const programs = await this.getBusinessPrograms(businessId);
      
      if (!programs || programs.length === 0) {
        return { isEnrolled: false };
      }
      
      // Check if customer is enrolled in any of these programs
      const enrolledPrograms = [];
      
      for (const program of programs) {
        const enrollment = await this.checkEnrollment(customerId, program.id);
        if (enrollment.isEnrolled) {
          enrolledPrograms.push(program.id);
        }
      }
      
      return {
        isEnrolled: enrolledPrograms.length > 0,
        programIds: enrolledPrograms.length > 0 ? enrolledPrograms : undefined
      };
    } catch (error) {
      console.error('Error checking customer enrollment:', error);
      return { isEnrolled: false };
    }
  }

  /**
   * Get all programs a customer is enrolled in for a specific business
   * @param customerId ID of the customer
   * @param businessId ID of the business
   * @returns Array of loyalty programs the customer is enrolled in
   */
  static async getCustomerEnrolledProgramsForBusiness(
    customerId: string,
    businessId: string
  ): Promise<LoyaltyProgram[]> {
    try {
      // First get all enrollments for this customer
      const enrollments = await sql`
        SELECT cp.program_id
        FROM program_enrollments cp
        JOIN loyalty_programs lp ON cp.program_id = lp.id
        WHERE cp.customer_id = ${customerId}
        AND lp.business_id = ${businessId}
        AND cp.status = 'ACTIVE'
      `;
      
      if (!enrollments.length) {
        return [];
      }
      
      // Get full program details for each enrolled program
      const programs: LoyaltyProgram[] = [];
      
      for (const enrollment of enrollments) {
        const programId = enrollment.program_id;
        const program = await this.getProgramById(programId);
        
        if (program) {
          programs.push(program);
        }
      }
      
      return programs;
    } catch (error) {
      console.error('Error fetching customer enrolled programs:', error);
      return [];
    }
  }
} 