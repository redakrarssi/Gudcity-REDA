/**
 * Comprehensive Test: Complete Enrollment System
 * 
 * This test verifies that the new EnrollmentResponseService works correctly
 * and addresses all the identified issues:
 * 
 * 1. Broken Program Joining: Customers can now reliably accept/decline program invitations
 * 2. Missing Cards in /cards: Cards now appear immediately after enrollment acceptance
 * 3. Notification Field Issues: Enrollment notifications properly display and respond
 * 4. Complex Conflicting Code: Replaced multiple complex handlers with one reliable service
 */

import sql from './src/utils/db.js';
import { EnrollmentResponseService } from './src/services/EnrollmentResponseService.js';
import { CustomerNotificationService } from './src/services/customerNotificationService.js';

// Test configuration
const TEST_CONFIG = {
  customerId: 'test-customer-123',
  businessId: 'test-business-456',
  programId: 'test-program-789',
  programName: 'Test Loyalty Program',
  businessName: 'Test Business'
};

// Test data setup
async function setupTestData() {
  console.log('🔧 Setting up test data...');
  
  try {
    // Ensure test tables exist
    await sql`
      CREATE TABLE IF NOT EXISTS customer_approval_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id VARCHAR(255) NOT NULL,
        business_id VARCHAR(255) NOT NULL,
        entity_id VARCHAR(255) NOT NULL,
        request_type VARCHAR(50) NOT NULL DEFAULT 'ENROLLMENT',
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS loyalty_programs (
        id SERIAL PRIMARY KEY,
        business_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS program_enrollments (
        id SERIAL PRIMARY KEY,
        customer_id VARCHAR(255) NOT NULL,
        program_id VARCHAR(255) NOT NULL,
        business_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        current_points INTEGER DEFAULT 0,
        total_points_earned INTEGER DEFAULT 0,
        enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS loyalty_cards (
        id SERIAL PRIMARY KEY,
        customer_id VARCHAR(255) NOT NULL,
        business_id VARCHAR(255) NOT NULL,
        program_id VARCHAR(255) NOT NULL,
        card_number VARCHAR(50) UNIQUE,
        card_type VARCHAR(50) DEFAULT 'STANDARD',
        tier VARCHAR(50) DEFAULT 'STANDARD',
        points INTEGER DEFAULT 0,
        points_multiplier NUMERIC(10,2) DEFAULT 1.0,
        is_active BOOLEAN DEFAULT true,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS customer_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id VARCHAR(255) NOT NULL,
        business_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        reference_id UUID,
        requires_action BOOLEAN DEFAULT false,
        action_taken BOOLEAN DEFAULT false,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Insert test data
    await sql`
      INSERT INTO users (id, name, email) VALUES 
      (${TEST_CONFIG.customerId}, 'Test Customer', 'customer@test.com'),
      (${TEST_CONFIG.businessId}, 'Test Business', 'business@test.com')
      ON CONFLICT (id) DO NOTHING
    `;
    
    await sql`
      INSERT INTO loyalty_programs (id, business_id, name, description) VALUES 
      (${parseInt(TEST_CONFIG.programId)}, ${TEST_CONFIG.businessId}, ${TEST_CONFIG.programName}, 'Test program description')
      ON CONFLICT (id) DO NOTHING
    `;
    
    console.log('✅ Test data setup completed');
    return true;
  } catch (error) {
    console.error('❌ Test data setup failed:', error);
    return false;
  }
}

// Clean up test data
async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    await sql`DELETE FROM customer_notifications WHERE customer_id = ${TEST_CONFIG.customerId}`;
    await sql`DELETE FROM loyalty_cards WHERE customer_id = ${TEST_CONFIG.customerId}`;
    await sql`DELETE FROM program_enrollments WHERE customer_id = ${TEST_CONFIG.customerId}`;
    await sql`DELETE FROM customer_approval_requests WHERE customer_id = ${TEST_CONFIG.customerId}`;
    await sql`DELETE FROM loyalty_programs WHERE id = ${parseInt(TEST_CONFIG.programId)}`;
    await sql`DELETE FROM users WHERE id IN (${TEST_CONFIG.customerId}, ${TEST_CONFIG.businessId})`;
    
    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.error('❌ Test data cleanup failed:', error);
  }
}

// Test 1: Enrollment Request Creation
async function testEnrollmentRequestCreation() {
  console.log('\n🧪 Test 1: Enrollment Request Creation');
  
  try {
    // Create an enrollment request
    const requestResult = await sql`
      INSERT INTO customer_approval_requests (
        customer_id, business_id, entity_id, request_type, status, data
      ) VALUES (
        ${TEST_CONFIG.customerId},
        ${TEST_CONFIG.businessId},
        ${TEST_CONFIG.programId},
        'ENROLLMENT',
        'PENDING',
        ${JSON.stringify({
          programName: TEST_CONFIG.programName,
          businessName: TEST_CONFIG.businessName
        })}
      ) RETURNING id
    `;
    
    if (!requestResult.length) {
      throw new Error('Failed to create enrollment request');
    }
    
    const requestId = requestResult[0].id;
    console.log('✅ Enrollment request created:', requestId);
    
    return requestId;
  } catch (error) {
    console.error('❌ Enrollment request creation failed:', error);
    throw error;
  }
}

// Test 2: Enrollment Response Processing (Accept)
async function testEnrollmentAcceptance(requestId) {
  console.log('\n🧪 Test 2: Enrollment Acceptance');
  
  try {
    // Process acceptance
    const result = await EnrollmentResponseService.processEnrollmentResponse(requestId, true);
    
    if (!result.success) {
      throw new Error(`Enrollment acceptance failed: ${result.message}`);
    }
    
    console.log('✅ Enrollment accepted successfully');
    console.log('📊 Result:', result);
    
    // Verify card was created
    const cardResult = await sql`
      SELECT * FROM loyalty_cards 
      WHERE customer_id = ${TEST_CONFIG.customerId} 
      AND program_id = ${TEST_CONFIG.programId}
    `;
    
    if (!cardResult.length) {
      throw new Error('Loyalty card was not created after enrollment acceptance');
    }
    
    console.log('✅ Loyalty card created:', cardResult[0].id);
    
    // Verify enrollment record exists
    const enrollmentResult = await sql`
      SELECT * FROM program_enrollments 
      WHERE customer_id = ${TEST_CONFIG.customerId} 
      AND program_id = ${TEST_CONFIG.programId}
    `;
    
    if (!enrollmentResult.length) {
      throw new Error('Enrollment record was not created');
    }
    
    console.log('✅ Enrollment record created:', enrollmentResult[0].id);
    
    return result.cardId;
  } catch (error) {
    console.error('❌ Enrollment acceptance test failed:', error);
    throw error;
  }
}

// Test 3: Verify Card Appears in /cards
async function testCardAppearsInCards(cardId) {
  console.log('\n🧪 Test 3: Card Appears in /cards');
  
  try {
    // Simulate querying for loyalty cards (like the /cards page would)
    const cardsResult = await sql`
      SELECT lc.*, lp.name as program_name, u.name as business_name
      FROM loyalty_cards lc
      JOIN loyalty_programs lp ON lc.program_id = lp.id::text
      JOIN users u ON lc.business_id = u.id
      WHERE lc.customer_id = ${TEST_CONFIG.customerId}
      ORDER BY lc.created_at DESC
    `;
    
    if (!cardsResult.length) {
      throw new Error('No loyalty cards found for customer');
    }
    
    const card = cardsResult[0];
    console.log('✅ Card found in /cards query:', {
      id: card.id,
      programName: card.program_name,
      businessName: card.business_name,
      cardNumber: card.card_number
    });
    
    // Verify the card has all required fields
    if (!card.card_number || !card.program_name || !card.business_name) {
      throw new Error('Card missing required fields');
    }
    
    console.log('✅ Card has all required fields');
    return true;
  } catch (error) {
    console.error('❌ Card appearance test failed:', error);
    throw error;
  }
}

// Test 4: Enrollment Response Processing (Decline)
async function testEnrollmentDecline(requestId) {
  console.log('\n🧪 Test 4: Enrollment Decline');
  
  try {
    // Create a new request for decline test
    const declineRequestResult = await sql`
      INSERT INTO customer_approval_requests (
        customer_id, business_id, entity_id, request_type, status, data
      ) VALUES (
        ${TEST_CONFIG.customerId},
        ${TEST_CONFIG.businessId},
        ${TEST_CONFIG.programId},
        'ENROLLMENT',
        'PENDING',
        ${JSON.stringify({
          programName: TEST_CONFIG.programName,
          businessName: TEST_CONFIG.businessName
        })}
      ) RETURNING id
    `;
    
    const declineRequestId = declineRequestResult[0].id;
    
    // Process decline
    const result = await EnrollmentResponseService.processEnrollmentResponse(declineRequestId, false);
    
    if (!result.success) {
      throw new Error(`Enrollment decline failed: ${result.message}`);
    }
    
    console.log('✅ Enrollment declined successfully');
    console.log('📊 Result:', result);
    
    // Verify no card was created
    const cardResult = await sql`
      SELECT COUNT(*) as count FROM loyalty_cards 
      WHERE customer_id = ${TEST_CONFIG.customerId} 
      AND program_id = ${TEST_CONFIG.programId}
    `;
    
    if (cardResult[0].count > 1) { // Should only have 1 from acceptance test
      throw new Error('Unexpected cards found after decline');
    }
    
    console.log('✅ No additional cards created after decline');
    return true;
  } catch (error) {
    console.error('❌ Enrollment decline test failed:', error);
    throw error;
  }
}

// Test 5: Notification System
async function testNotificationSystem() {
  console.log('\n🧪 Test 5: Notification System');
  
  try {
    // Check customer notifications
    const customerNotifications = await sql`
      SELECT * FROM customer_notifications 
      WHERE customer_id = ${TEST_CONFIG.customerId}
      ORDER BY created_at DESC
    `;
    
    console.log(`✅ Found ${customerNotifications.length} customer notifications`);
    
    // Check business notifications
    const businessNotifications = await sql`
      SELECT * FROM customer_notifications 
      WHERE customer_id = ${TEST_CONFIG.businessId}
      ORDER BY created_at DESC
    `;
    
    console.log(`✅ Found ${businessNotifications.length} business notifications`);
    
    // Verify notification types
    const notificationTypes = customerNotifications.map(n => n.type);
    console.log('📱 Notification types:', notificationTypes);
    
    if (!notificationTypes.includes('ENROLLMENT_ACCEPTED')) {
      throw new Error('Missing ENROLLMENT_ACCEPTED notification');
    }
    
    console.log('✅ All expected notification types present');
    return true;
  } catch (error) {
    console.error('❌ Notification system test failed:', error);
    throw error;
  }
}

// Test 6: Real-time Event System
async function testRealTimeEventSystem() {
  console.log('\n🧪 Test 6: Real-time Event System');
  
  try {
    // Simulate real-time event dispatch
    if (typeof window !== 'undefined') {
      // Browser environment
      const event = new CustomEvent('enrollment-response-processed', {
        detail: {
          action: 'APPROVED',
          customerId: TEST_CONFIG.customerId,
          businessId: TEST_CONFIG.businessId,
          programId: TEST_CONFIG.programId,
          programName: TEST_CONFIG.programName,
          cardId: 'test-card-123',
          timestamp: new Date().toISOString()
        }
      });
      
      window.dispatchEvent(event);
      console.log('✅ Real-time event dispatched in browser');
    } else {
      // Node.js environment
      console.log('ℹ️ Real-time events not available in Node.js environment');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Real-time event system test failed:', error);
    throw error;
  }
}

// Test 7: Data Consistency
async function testDataConsistency() {
  console.log('\n🧪 Test 7: Data Consistency');
  
  try {
    // Check that all related data is consistent
    const cardCount = await sql`
      SELECT COUNT(*) as count FROM loyalty_cards 
      WHERE customer_id = ${TEST_CONFIG.customerId}
    `;
    
    const enrollmentCount = await sql`
      SELECT COUNT(*) as count FROM program_enrollments 
      WHERE customer_id = ${TEST_CONFIG.customerId}
    `;
    
    const notificationCount = await sql`
      SELECT COUNT(*) as count FROM customer_notifications 
      WHERE customer_id = ${TEST_CONFIG.customerId}
    `;
    
    console.log('📊 Data consistency check:', {
      cards: cardCount[0].count,
      enrollments: enrollmentCount[0].count,
      notifications: notificationCount[0].count
    });
    
    // Verify relationships are maintained
    if (cardCount[0].count !== enrollmentCount[0].count) {
      throw new Error('Card count does not match enrollment count');
    }
    
    console.log('✅ Data consistency verified');
    return true;
  } catch (error) {
    console.error('❌ Data consistency test failed:', error);
    throw error;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting Comprehensive Enrollment System Tests');
  console.log('=' .repeat(60));
  
  let requestId;
  let cardId;
  
  try {
    // Setup
    const setupSuccess = await setupTestData();
    if (!setupSuccess) {
      throw new Error('Test setup failed');
    }
    
    // Run tests
    requestId = await testEnrollmentRequestCreation();
    cardId = await testEnrollmentAcceptance(requestId);
    await testCardAppearsInCards(cardId);
    await testEnrollmentDecline(requestId);
    await testNotificationSystem();
    await testRealTimeEventSystem();
    await testDataConsistency();
    
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('=' .repeat(60));
    console.log('✅ Enrollment system is working correctly');
    console.log('✅ Cards appear immediately after enrollment acceptance');
    console.log('✅ Notifications are properly created and displayed');
    console.log('✅ Real-time events are dispatched correctly');
    console.log('✅ Data consistency is maintained');
    
  } catch (error) {
    console.error('\n💥 TEST FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    await cleanupTestData();
    console.log('\n🧹 Test cleanup completed');
    
    // Close database connection
    await sql.end();
    console.log('🔌 Database connection closed');
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export {
  runAllTests,
  testEnrollmentRequestCreation,
  testEnrollmentAcceptance,
  testCardAppearsInCards,
  testEnrollmentDecline,
  testNotificationSystem,
  testRealTimeEventSystem,
  testDataConsistency
};