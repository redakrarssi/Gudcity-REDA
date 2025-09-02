#!/usr/bin/env node

/**
 * Stress test script for QR scanning
 * Tests multiple concurrent QR scans for the same customer
 */

import sql from '../src/utils/db.js';
import { v4 as uuidv4 } from 'uuid';
import { QrCodeService } from '../src/services/qrCodeService.js';
import { CustomerNotificationService } from '../src/services/customerNotificationService.js';
import LoyaltyCardService from '../src/services/loyaltyCardService.js';
import { createNotificationSyncEvent } from '../src/utils/realTimeSync.js';

// Configuration
const CUSTOMER_ID = 4; // Change to an existing customer ID in your database
const NUM_BUSINESSES = 5;
const NUM_CONCURRENT_SCANS = 10;
const POINTS_TO_AWARD = 10;

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to log with timestamp
const log = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
};

// Create test businesses
async function createTestBusinesses(count) {
  log(`Creating ${count} test businesses...`);
  const businesses = [];
  
  for (let i = 0; i < count; i++) {
    const businessId = `test-biz-${uuidv4().substring(0, 8)}`;
    const businessName = `Test Business ${i + 1}`;
    
    try {
      // Insert business into database
      await sql`
        INSERT INTO users (id, name, email, role, created_at)
        VALUES (${businessId}, ${businessName}, ${`business${i + 1}@example.com`}, 'BUSINESS', NOW())
        ON CONFLICT (id) DO NOTHING
      `;
      
      // Create a business profile
      await sql`
        INSERT INTO business_profiles (business_id, name, description, created_at)
        VALUES (${businessId}, ${businessName}, ${`Test business ${i + 1}`}, NOW())
        ON CONFLICT (business_id) DO NOTHING
      `;
      
      businesses.push({
        id: businessId,
        name: businessName
      });
      
      log(`Created business: ${businessName} (${businessId})`);
    } catch (error) {
      console.error(`Error creating business ${i + 1}:`, error);
    }
  }
  
  return businesses;
}

// Create a test loyalty program for each business
async function createTestPrograms(businesses) {
  log(`Creating test loyalty programs for ${businesses.length} businesses...`);
  const programs = [];
  
  for (const business of businesses) {
    const programId = `test-program-${uuidv4().substring(0, 8)}`;
    const programName = `${business.name} Loyalty Program`;
    
    try {
      // Insert program into database
      await sql`
        INSERT INTO loyalty_programs (id, business_id, name, description, type, points_per_dollar, created_at)
        VALUES (${programId}, ${business.id}, ${programName}, ${`Loyalty program for ${business.name}`}, 'POINTS', 10, NOW())
        ON CONFLICT (id) DO NOTHING
      `;
      
      programs.push({
        id: programId,
        name: programName,
        businessId: business.id
      });
      
      log(`Created program: ${programName} (${programId})`);
    } catch (error) {
      console.error(`Error creating program for ${business.name}:`, error);
    }
  }
  
  return programs;
}

// Enroll customer in programs
async function enrollCustomerInPrograms(customerId, programs) {
  log(`Enrolling customer ${customerId} in ${programs.length} programs...`);
  const enrollments = [];
  
  for (const program of programs) {
    try {
      // Enroll customer in program
      const card = await LoyaltyCardService.enrollCustomerInProgram(
        customerId,
        program.businessId,
        program.id
      );
      
      if (card) {
        enrollments.push({
          programId: program.id,
          businessId: program.businessId,
          cardId: card.id
        });
        
        log(`Enrolled customer ${customerId} in program ${program.name}`);
      }
    } catch (error) {
      console.error(`Error enrolling customer in program ${program.id}:`, error);
    }
  }
  
  return enrollments;
}

// Simulate concurrent QR code scans
async function simulateConcurrentScans(customerId, businesses, numScans) {
  log(`Simulating ${numScans} concurrent QR code scans for customer ${customerId}...`);
  
  // Create customer QR code data
  const qrCodeData = {
    type: 'customer',
    customerId: customerId,
    customerName: 'Test Customer',
    timestamp: Date.now()
  };
  
  // Convert to JSON string for QR code
  const qrCodeText = JSON.stringify(qrCodeData);
  
  // Create scan promises
  const scanPromises = [];
  
  for (let i = 0; i < numScans; i++) {
    // Select a random business
    const businessIndex = i % businesses.length;
    const business = businesses[businessIndex];
    
    // Create scan promise
    const scanPromise = (async () => {
      try {
        // Log scan in monitoring system
        await QrCodeService.logScan(
          'CUSTOMER_CARD',
          business.id,
          qrCodeData,
          true,
          { customerId, businessId: business.id }
        );
        
        // Create notification for the customer
        const notification = await CustomerNotificationService.createNotification({
          customerId: String(customerId),
          businessId: String(business.id),
          type: 'QR_SCAN',
          title: 'QR Code Scanned',
          message: `${business.name} is scanning your QR code`,
          requiresAction: false,
          actionTaken: false,
          isRead: false,
          data: {
            businessName: business.name,
            businessId: business.id,
            timestamp: new Date().toISOString()
          }
        });
        
        if (notification) {
          // Create notification sync event
          createNotificationSyncEvent(
            notification.id,
            String(customerId),
            String(business.id),
            'INSERT',
            {
              type: 'QR_SCAN',
              businessName: business.name,
              timestamp: new Date().toISOString()
            }
          );
          
          // Award points to customer (if they have a card)
          try {
            const cards = await LoyaltyCardService.getCustomerCards(String(customerId));
            const card = cards.find(c => c.businessId === String(business.id));
            
            if (card) {
              await LoyaltyCardService.addPoints(
                card.id,
                POINTS_TO_AWARD,
                `Points from QR scan at ${business.name}`
              );
              
              log(`Awarded ${POINTS_TO_AWARD} points to customer ${customerId} for card ${card.id}`);
            }
          } catch (pointsError) {
            console.error(`Error awarding points to customer ${customerId}:`, pointsError);
          }
        }
        
        return {
          success: true,
          businessId: business.id,
          businessName: business.name,
          notificationId: notification?.id
        };
      } catch (error) {
        console.error(`Error simulating scan for business ${business.name}:`, error);
        return {
          success: false,
          businessId: business.id,
          businessName: business.name,
          error
        };
      }
    })();
    
    scanPromises.push(scanPromise);
  }
  
  // Execute all scans simultaneously
  return Promise.all(scanPromises);
}

// Verify notifications were created
async function verifyNotifications(customerId, scanResults) {
  log(`Verifying notifications for customer ${customerId}...`);
  
  try {
    // Get all notifications for the customer
    const notifications = await CustomerNotificationService.getCustomerNotifications(String(customerId));
    
    // Filter for QR scan notifications
    const scanNotifications = notifications.filter(n => n.type === 'QR_SCAN');
    
    // Count successful scans
    const successfulScans = scanResults.filter(result => result.success).length;
    
    log(`Found ${scanNotifications.length} QR scan notifications out of ${successfulScans} successful scans`);
    
    return {
      totalScans: scanResults.length,
      successfulScans,
      notificationsCreated: scanNotifications.length
    };
  } catch (error) {
    console.error(`Error verifying notifications for customer ${customerId}:`, error);
    return {
      totalScans: scanResults.length,
      successfulScans: scanResults.filter(result => result.success).length,
      notificationsCreated: 0,
      error
    };
  }
}

// Main stress test function
async function runStressTest() {
  log('Starting QR scanning stress test');
  
  try {
    // Create test businesses
    const businesses = await createTestBusinesses(NUM_BUSINESSES);
    log(`Created ${businesses.length} test businesses`);
    
    // Create test programs
    const programs = await createTestPrograms(businesses);
    log(`Created ${programs.length} test loyalty programs`);
    
    // Enroll customer in programs
    const enrollments = await enrollCustomerInPrograms(CUSTOMER_ID, programs);
    log(`Enrolled customer ${CUSTOMER_ID} in ${enrollments.length} programs`);
    
    // Wait a moment to ensure all enrollments are saved
    await wait(2000);
    
    // Simulate concurrent QR code scans
    const scanResults = await simulateConcurrentScans(
      CUSTOMER_ID,
      businesses,
      NUM_CONCURRENT_SCANS
    );
    
    const successfulScans = scanResults.filter(result => result.success).length;
    log(`Successfully simulated ${successfulScans} out of ${NUM_CONCURRENT_SCANS} QR code scans`);
    
    // Wait for notifications to be processed
    await wait(5000);
    
    // Verify notifications were created
    const verificationResults = await verifyNotifications(CUSTOMER_ID, scanResults);
    
    // Final results
    log('Stress test completed');
    log(`Success rate: ${(verificationResults.notificationsCreated / verificationResults.successfulScans * 100).toFixed(2)}%`);
    
  } catch (error) {
    console.error('Error running stress test:', error);
  } finally {
    // Close database connection
    await sql.end();
  }
}

// Run the stress test
runStressTest().catch(console.error); 