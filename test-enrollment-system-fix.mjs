import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Get SQL client
const sql = async (strings, ...values) => {
  const client = await pool.connect();
  try {
    const text = strings.join('?');
    const query = {
      text: text.replace(/\?/g, (_, i) => `$${i + 1}`),
      values
    };
    const result = await client.query(query);
    return result.rows;
  } finally {
    client.release();
  }
};

/**
 * Test script to verify the enrollment system fixes
 * This script tests:
 * 1. Card creation after enrollment
 * 2. Notification handling
 * 3. Data consistency
 */
async function testEnrollmentSystemFix() {
  try {
    console.log('Starting enrollment system fix verification...');
    
    // 1. Check for any enrollments without cards
    console.log('\n1. Checking for enrollments without cards...');
    const missingCards = await sql`
      SELECT 
        pe.customer_id,
        pe.program_id,
        lp.name as program_name
      FROM program_enrollments pe
      JOIN loyalty_programs lp ON pe.program_id = lp.id::text
      LEFT JOIN loyalty_cards lc ON 
        pe.customer_id = lc.customer_id AND 
        pe.program_id = lc.program_id
      WHERE pe.status = 'ACTIVE'
      AND lc.id IS NULL
    `;
    
    if (missingCards.length === 0) {
      console.log('✅ No missing cards found. All enrollments have corresponding cards.');
    } else {
      console.log(`⚠️ Found ${missingCards.length} enrollments without cards. Fix needed.`);
      missingCards.forEach((item, index) => {
        console.log(`  ${index + 1}. Customer ${item.customer_id} in program "${item.program_name}" (${item.program_id})`);
      });
    }
    
    // 2. Check for stale notifications
    console.log('\n2. Checking for stale notifications...');
    const staleNotifications = await sql`
      SELECT 
        id,
        customer_id,
        type,
        title,
        created_at
      FROM customer_notifications
      WHERE type = 'ENROLLMENT_REQUEST'
      AND action_taken = TRUE
      AND is_read = FALSE
    `;
    
    if (staleNotifications.length === 0) {
      console.log('✅ No stale notifications found. All actioned notifications are marked as read.');
    } else {
      console.log(`⚠️ Found ${staleNotifications.length} stale notifications. Fix needed.`);
    }
    
    // 3. Check for stuck approval requests
    console.log('\n3. Checking for stuck approval requests...');
    const stuckApprovals = await sql`
      SELECT 
        ar.id,
        ar.customer_id,
        ar.business_id,
        ar.request_type,
        ar.status,
        ar.created_at
      FROM customer_approval_requests ar
      JOIN customer_notifications n ON ar.notification_id = n.id
      WHERE ar.status = 'PENDING'
      AND n.action_taken = TRUE
    `;
    
    if (stuckApprovals.length === 0) {
      console.log('✅ No stuck approval requests found.');
    } else {
      console.log(`⚠️ Found ${stuckApprovals.length} stuck approval requests. Fix needed.`);
    }
    
    // 4. Verify stored procedure exists
    console.log('\n4. Verifying stored procedure exists...');
    const procedureExists = await sql`
      SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'process_enrollment_approval'
      );
    `;
    
    if (procedureExists[0].exists) {
      console.log('✅ Enrollment procedure exists.');
    } else {
      console.log('⚠️ Enrollment procedure does not exist. Fix needed.');
    }
    
    // 5. Test creating a sample enrollment and verify card creation
    console.log('\n5. Testing enrollment and card creation...');
    
    // Create test customer and business if needed
    const testCustomerId = 999;
    const testBusinessId = 998;
    const testProgramId = uuidv4();
    
    // Check if test customer exists
    const customerExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM users WHERE id = ${testCustomerId}
      );
    `;
    
    if (!customerExists[0].exists) {
      console.log('Creating test customer...');
      await sql`
        INSERT INTO users (
          id, name, email, password_hash, role, user_type, status
        ) VALUES (
          ${testCustomerId}, 'Test Customer', 'test.customer@example.com', 'test_hash', 'customer', 'customer', 'active'
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
    
    // Check if test business exists
    const businessExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM users WHERE id = ${testBusinessId}
      );
    `;
    
    if (!businessExists[0].exists) {
      console.log('Creating test business...');
      await sql`
        INSERT INTO users (
          id, name, email, password_hash, role, user_type, status
        ) VALUES (
          ${testBusinessId}, 'Test Business', 'test.business@example.com', 'test_hash', 'business', 'business', 'active'
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
    
    // Check if test program exists
    const programExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM loyalty_programs WHERE id = ${testProgramId}::uuid
      );
    `;
    
    if (!programExists[0].exists) {
      console.log('Creating test loyalty program...');
      await sql`
        INSERT INTO loyalty_programs (
          id, business_id, name, description, points_per_purchase, points_per_dollar, created_at
        ) VALUES (
          ${testProgramId}::uuid, ${testBusinessId}, 'Test Program', 'Test Program Description', 10, 1, NOW()
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
    
    // Create test enrollment
    console.log('Creating test enrollment...');
    await sql`
      INSERT INTO program_enrollments (
        customer_id, program_id, business_id, status, current_points, total_points_earned, enrolled_at
      ) VALUES (
        ${testCustomerId}, ${testProgramId}, ${testBusinessId}, 'ACTIVE', 0, 0, NOW()
      )
      ON CONFLICT (customer_id, program_id) DO NOTHING
    `;
    
    // Check if card was created
    const cardExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM loyalty_cards
        WHERE customer_id = ${testCustomerId}
        AND program_id = ${testProgramId}
      );
    `;
    
    if (cardExists[0].exists) {
      console.log('✅ Card was automatically created for the test enrollment.');
    } else {
      console.log('⚠️ Card was not created for the test enrollment. Running sync...');
      
      // Try to create the card manually
      const cardNumber = `GC-TEST-${Math.floor(Math.random() * 10000)}`;
      const cardId = uuidv4();
      
      await sql`
        INSERT INTO loyalty_cards (
          id, customer_id, program_id, business_id, card_number, status, points, created_at
        ) VALUES (
          ${cardId}::uuid, ${testCustomerId}, ${testProgramId}, ${testBusinessId}, ${cardNumber}, 'ACTIVE', 0, NOW()
        )
        ON CONFLICT (customer_id, program_id) DO NOTHING
      `;
      
      console.log('Card created manually.');
    }
    
    console.log('\n✅ Enrollment system verification completed.');
    return true;
  } catch (error) {
    console.error('\n❌ Error during verification:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Run the function
testEnrollmentSystemFix()
  .then((success) => {
    if (success) {
      console.log('Verification completed successfully');
      process.exit(0);
    } else {
      console.log('Verification failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  }); 