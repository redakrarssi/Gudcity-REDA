// Test script for enrollment notification system
import sql from './src/utils/db.mjs';
import { CustomerService } from './src/services/customerService.mjs';
import { LoyaltyProgramService } from './src/services/loyaltyProgramService.mjs';
import { CustomerNotificationService } from './src/services/customerNotificationService.mjs';

// Test configuration
const TEST_BUSINESS_ID = '1'; // Change to a valid business ID in your system
const TEST_CUSTOMER_ID = '2'; // Change to a valid customer ID in your system
const TEST_PROGRAM_ID = '1'; // Change to a valid program ID in your system

async function main() {
  try {
    console.log('Starting enrollment notification test...');
    
    // Step 1: Check if the customer and business exist
    console.log(`Checking if customer ${TEST_CUSTOMER_ID} and business ${TEST_BUSINESS_ID} exist...`);
    
    const customer = await sql`SELECT * FROM customers WHERE id = ${TEST_CUSTOMER_ID}`;
    if (!customer.length) {
      console.error(`Customer with ID ${TEST_CUSTOMER_ID} not found`);
      process.exit(1);
    }
    
    const business = await sql`SELECT * FROM users WHERE id = ${TEST_BUSINESS_ID}`;
    if (!business.length) {
      console.error(`Business with ID ${TEST_BUSINESS_ID} not found`);
      process.exit(1);
    }
    
    const program = await sql`SELECT * FROM loyalty_programs WHERE id = ${TEST_PROGRAM_ID}`;
    if (!program.length) {
      console.error(`Program with ID ${TEST_PROGRAM_ID} not found`);
      process.exit(1);
    }
    
    console.log('Customer, business, and program found. Continuing with test...');
    
    // Step 2: Check if customer is already enrolled in the program
    console.log('Checking if customer is already enrolled in the program...');
    
    const enrollment = await sql`
      SELECT * FROM program_enrollments 
      WHERE customer_id = ${TEST_CUSTOMER_ID} 
      AND program_id = ${TEST_PROGRAM_ID}
    `;
    
    if (enrollment.length > 0) {
      console.log('Customer is already enrolled in this program. Removing enrollment for testing...');
      
      await sql`
        DELETE FROM program_enrollments 
        WHERE customer_id = ${TEST_CUSTOMER_ID} 
        AND program_id = ${TEST_PROGRAM_ID}
      `;
      
      await sql`
        DELETE FROM loyalty_cards 
        WHERE customer_id = ${TEST_CUSTOMER_ID} 
        AND program_id = ${TEST_PROGRAM_ID}
      `;
      
      console.log('Existing enrollment and cards removed.');
    }
    
    // Step 3: Enroll customer with approval required
    console.log('Enrolling customer with approval required...');
    
    const enrollmentResult = await LoyaltyProgramService.enrollCustomer(
      TEST_CUSTOMER_ID,
      TEST_PROGRAM_ID,
      true // Require approval
    );
    
    console.log('Enrollment result:', enrollmentResult);
    
    if (!enrollmentResult.success) {
      console.error('Failed to create enrollment request:', enrollmentResult.error);
      process.exit(1);
    }
    
    // Step 4: Get pending approval requests for the customer
    console.log('Getting pending approval requests for the customer...');
    
    const pendingApprovals = await CustomerNotificationService.getPendingApprovals(TEST_CUSTOMER_ID);
    
    if (!pendingApprovals.length) {
      console.error('No pending approval requests found for customer');
      process.exit(1);
    }
    
    console.log(`Found ${pendingApprovals.length} pending approval requests:`, pendingApprovals);
    
    // Step 5: Approve the enrollment request
    const approvalRequest = pendingApprovals.find(
      req => req.requestType === 'ENROLLMENT' && req.entityId === TEST_PROGRAM_ID
    );
    
    if (!approvalRequest) {
      console.error('No matching enrollment request found');
      process.exit(1);
    }
    
    console.log('Approving enrollment request...');
    
    const approvalResult = await CustomerNotificationService.respondToApproval(
      approvalRequest.id,
      true // Approve
    );
    
    console.log('Approval result:', approvalResult);
    
    // Step 6: Verify customer is now enrolled and has a loyalty card
    console.log('Verifying customer enrollment and loyalty card...');
    
    const updatedEnrollment = await sql`
      SELECT * FROM program_enrollments 
      WHERE customer_id = ${TEST_CUSTOMER_ID} 
      AND program_id = ${TEST_PROGRAM_ID}
    `;
    
    if (!updatedEnrollment.length) {
      console.error('Customer enrollment record not found after approval');
    } else {
      console.log('Customer enrollment record found:', updatedEnrollment[0]);
    }
    
    const loyaltyCard = await sql`
      SELECT * FROM loyalty_cards 
      WHERE customer_id = ${TEST_CUSTOMER_ID} 
      AND program_id = ${TEST_PROGRAM_ID}
    `;
    
    if (!loyaltyCard.length) {
      console.error('Loyalty card not found after approval');
    } else {
      console.log('Loyalty card found:', loyaltyCard[0]);
    }
    
    // Step 7: Check notifications
    console.log('Checking notifications...');
    
    const customerNotifications = await CustomerNotificationService.getCustomerNotifications(TEST_CUSTOMER_ID);
    console.log(`Found ${customerNotifications.length} notifications for customer:`, 
      customerNotifications.map(n => ({ id: n.id, type: n.type, title: n.title }))
    );
    
    const businessNotifications = await CustomerNotificationService.getCustomerNotifications(TEST_BUSINESS_ID);
    console.log(`Found ${businessNotifications.length} notifications for business:`, 
      businessNotifications.map(n => ({ id: n.id, type: n.type, title: n.title }))
    );
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    // Close database connection
    process.exit(0);
  }
}

main(); 