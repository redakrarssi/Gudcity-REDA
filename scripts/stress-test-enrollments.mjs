#!/usr/bin/env node

/**
 * Stress test script for enrollment flow
 * Tests enrolling multiple customers simultaneously
 */

import sql from '../src/utils/db.js';
import { v4 as uuidv4 } from 'uuid';
import { CustomerNotificationService } from '../src/services/customerNotificationService.js';
import LoyaltyCardService from '../src/services/loyaltyCardService.js';
import { createEnrollmentSyncEvent } from '../src/utils/realTimeSync.js';

// Configuration
const NUM_CUSTOMERS = 10;
const NUM_PROGRAMS = 3;
const BUSINESS_ID = 1; // Change to an existing business ID in your database

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to log with timestamp
const log = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
};

// Create test customers
async function createTestCustomers(count) {
  log(`Creating ${count} test customers...`);
  const customers = [];
  
  for (let i = 0; i < count; i++) {
    const customerId = `test-${uuidv4().substring(0, 8)}`;
    const customerName = `Test Customer ${i + 1}`;
    
    try {
      // Insert customer into database
      await sql`
        INSERT INTO users (id, name, email, role, created_at)
        VALUES (${customerId}, ${customerName}, ${`test${i + 1}@example.com`}, 'CUSTOMER', NOW())
        ON CONFLICT (id) DO NOTHING
      `;
      
      customers.push({
        id: customerId,
        name: customerName
      });
      
      log(`Created customer: ${customerName} (${customerId})`);
    } catch (error) {
      console.error(`Error creating customer ${i + 1}:`, error);
    }
  }
  
  return customers;
}

// Create test loyalty programs
async function createTestPrograms(count, businessId) {
  log(`Creating ${count} test loyalty programs...`);
  const programs = [];
  
  for (let i = 0; i < count; i++) {
    const programId = `test-program-${uuidv4().substring(0, 8)}`;
    const programName = `Test Loyalty Program ${i + 1}`;
    
    try {
      // Insert program into database
      await sql`
        INSERT INTO loyalty_programs (id, business_id, name, description, type, points_per_dollar, created_at)
        VALUES (${programId}, ${businessId}, ${programName}, ${`Test loyalty program ${i + 1}`}, 'POINTS', 10, NOW())
        ON CONFLICT (id) DO NOTHING
      `;
      
      programs.push({
        id: programId,
        name: programName,
        businessId
      });
      
      log(`Created program: ${programName} (${programId})`);
    } catch (error) {
      console.error(`Error creating program ${i + 1}:`, error);
    }
  }
  
  return programs;
}

// Create enrollment requests for customers
async function createEnrollmentRequests(customers, programs, businessId) {
  log('Creating enrollment requests...');
  const requests = [];
  
  for (const customer of customers) {
    for (const program of programs) {
      try {
        // Create enrollment request notification
        const notification = await CustomerNotificationService.createNotification({
          customerId: customer.id,
          businessId: businessId,
          type: 'ENROLLMENT',
          title: 'Program Enrollment Request',
          message: `You've been invited to join ${program.name}`,
          requiresAction: true,
          actionTaken: false,
          isRead: false,
          referenceId: program.id,
          data: {
            programId: program.id,
            programName: program.name,
            businessName: 'Test Business'
          }
        });
        
        if (notification) {
          // Create approval request
          const request = await CustomerNotificationService.createApprovalRequest({
            customerId: customer.id,
            businessId: businessId,
            requestType: 'ENROLLMENT',
            entityId: program.id,
            status: 'PENDING',
            data: {
              programId: program.id,
              programName: program.name,
              businessName: 'Test Business'
            }
          });
          
          requests.push(request);
          log(`Created enrollment request for customer ${customer.id} to program ${program.name}`);
        }
      } catch (error) {
        console.error(`Error creating enrollment request for customer ${customer.id}:`, error);
      }
    }
  }
  
  return requests;
}

// Approve all enrollment requests simultaneously
async function approveEnrollmentRequests(requests) {
  log(`Approving ${requests.length} enrollment requests simultaneously...`);
  
  const approvalPromises = requests.map(async (request) => {
    try {
      // Approve the request
      const success = await CustomerNotificationService.respondToApproval(request.id, true);
      
      if (success) {
        log(`Approved enrollment request ${request.id} for customer ${request.customerId}`);
        return {
          success: true,
          requestId: request.id,
          customerId: request.customerId,
          programId: request.entityId
        };
      } else {
        log(`Failed to approve enrollment request ${request.id}`);
        return {
          success: false,
          requestId: request.id
        };
      }
    } catch (error) {
      console.error(`Error approving request ${request.id}:`, error);
      return {
        success: false,
        requestId: request.id,
        error
      };
    }
  });
  
  // Execute all approvals simultaneously
  return Promise.all(approvalPromises);
}

// Verify cards were created for all enrollments
async function verifyCardCreation(approvals) {
  log('Verifying card creation for all enrollments...');
  
  const successfulApprovals = approvals.filter(approval => approval.success);
  let cardsCreated = 0;
  
  for (const approval of successfulApprovals) {
    try {
      // Sync enrollments to cards
      await LoyaltyCardService.syncEnrollmentsToCards(approval.customerId);
      
      // Check if card was created
      const cards = await LoyaltyCardService.getCustomerCards(approval.customerId);
      
      const programCard = cards.find(card => card.programId === approval.programId);
      
      if (programCard) {
        log(`✓ Card created for customer ${approval.customerId}, program ${approval.programId}`);
        cardsCreated++;
      } else {
        log(`✗ Card NOT created for customer ${approval.customerId}, program ${approval.programId}`);
      }
    } catch (error) {
      console.error(`Error verifying card for customer ${approval.customerId}:`, error);
    }
  }
  
  return {
    totalApprovals: successfulApprovals.length,
    cardsCreated
  };
}

// Main stress test function
async function runStressTest() {
  log('Starting enrollment flow stress test');
  
  try {
    // Create test customers
    const customers = await createTestCustomers(NUM_CUSTOMERS);
    log(`Created ${customers.length} test customers`);
    
    // Create test programs
    const programs = await createTestPrograms(NUM_PROGRAMS, BUSINESS_ID);
    log(`Created ${programs.length} test loyalty programs`);
    
    // Create enrollment requests
    const requests = await createEnrollmentRequests(customers, programs, BUSINESS_ID);
    log(`Created ${requests.length} enrollment requests`);
    
    // Wait a moment to ensure all requests are saved
    await wait(2000);
    
    // Approve all enrollment requests simultaneously
    const approvalResults = await approveEnrollmentRequests(requests);
    
    const successfulApprovals = approvalResults.filter(result => result.success).length;
    log(`Successfully approved ${successfulApprovals} out of ${requests.length} enrollment requests`);
    
    // Wait for enrollments to be processed
    await wait(5000);
    
    // Verify cards were created
    const verificationResults = await verifyCardCreation(approvalResults);
    
    log(`Cards created: ${verificationResults.cardsCreated} out of ${verificationResults.totalApprovals} enrollments`);
    
    // Final results
    log('Stress test completed');
    log(`Success rate: ${(verificationResults.cardsCreated / verificationResults.totalApprovals * 100).toFixed(2)}%`);
    
  } catch (error) {
    console.error('Error running stress test:', error);
  } finally {
    // Close database connection
    await sql.end();
  }
}

// Run the stress test
runStressTest().catch(console.error); 