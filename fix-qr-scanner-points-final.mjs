#!/usr/bin/env node

import postgres from 'postgres';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create database connection
const sql = postgres(process.env.DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
  max: 10
});

async function main() {
  console.log('🔧 Starting award points system fix...');
  
  try {
    // Check that required tables exist
    await checkRequiredTables();
    
    // 1. Fix the award points process
    await fixAwardPointsProcess();
    
    // 2. Fix the notification system
    await fixNotificationSystem();
    
    // 3. Test the award points system
    await testAwardPointsSystem();
    
    console.log('✅ Award points system fix completed successfully!');
  } catch (error) {
    console.error('❌ Error during fix process:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

/**
 * Check that all required tables exist
 */
async function checkRequiredTables() {
  console.log('🔍 Checking required tables...');
  
  const requiredTables = [
    'users',
    'loyalty_cards',
    'loyalty_programs',
    'program_enrollments',
    'customer_notifications',
    'customer_programs'  // This could be a view that maps to program_enrollments
  ];
  
  // Get list of tables in database
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `;
  
  const tableNames = tables.map(t => t.table_name);
  const missingTables = requiredTables.filter(t => !tableNames.includes(t));
  
  if (missingTables.length > 0) {
    console.log('⚠️ Missing tables:', missingTables);
    
    // If customer_programs is missing but program_enrollments exists, we'll create a view
    if (missingTables.includes('customer_programs') && tableNames.includes('program_enrollments')) {
      console.log('Creating customer_programs view to map to program_enrollments...');
      
      await sql`
        CREATE OR REPLACE VIEW customer_programs AS
        SELECT 
          id,
          customer_id,
          program_id,
          current_points,
          enrolled_at,
          updated_at
        FROM program_enrollments
      `;
      
      console.log('✅ Created customer_programs view');
      
      // Remove from missing tables list
      missingTables.splice(missingTables.indexOf('customer_programs'), 1);
    }
    
    // Check if we still have missing tables
    if (missingTables.length > 0) {
      throw new Error(`Required tables are missing: ${missingTables.join(', ')}`);
    }
  }
  
  console.log('✅ All required tables exist or have been created');
}

/**
 * Fix the award points process
 */
async function fixAwardPointsProcess() {
  console.log('🔧 Fixing award points process...');
  
  // Check if table has customer_id as varchar or integer
  const customerProgramsCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'customer_programs'
  `;
  
  const customerIdType = customerProgramsCols.find(c => c.column_name === 'customer_id')?.data_type;
  console.log(`customer_id column type in customer_programs: ${customerIdType}`);
  
  // Create/Replace the award_points procedure to handle both varchar and integer types
  console.log('Creating/replacing award_points stored procedure...');
  
  await sql`
    CREATE OR REPLACE PROCEDURE award_points(
      p_customer_id TEXT,
      p_business_id TEXT,
      p_program_id TEXT,
      p_points INTEGER,
      p_source TEXT DEFAULT 'MANUAL'
    )
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_customer_id_int INTEGER;
      v_business_id_int INTEGER;
      v_program_id_int INTEGER;
      v_card_id TEXT;
      v_enrollment_exists BOOLEAN;
      v_card_exists BOOLEAN;
      v_business_name TEXT;
      v_program_name TEXT;
      v_notification_id UUID;
    BEGIN
      -- Convert IDs to integers
      BEGIN
        v_customer_id_int := p_customer_id::INTEGER;
        v_business_id_int := p_business_id::INTEGER;
        v_program_id_int := p_program_id::INTEGER;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid ID format: %', SQLERRM;
      END;
      
      -- Validate inputs
      IF p_points <= 0 THEN
        RAISE EXCEPTION 'Points must be greater than zero';
      END IF;
      
      -- Get business and program names for notification
      SELECT name INTO v_business_name FROM users WHERE id = v_business_id_int;
      SELECT name INTO v_program_name FROM loyalty_programs WHERE id = v_program_id_int;
      
      IF v_business_name IS NULL THEN
        RAISE EXCEPTION 'Business not found';
      END IF;
      
      IF v_program_name IS NULL THEN
        RAISE EXCEPTION 'Program not found';
      END IF;
      
      -- Check if customer is enrolled in program
      SELECT EXISTS(
        SELECT 1 FROM customer_programs 
        WHERE customer_id = p_customer_id AND program_id = p_program_id
      ) INTO v_enrollment_exists;
      
      -- If not enrolled, enroll them
      IF NOT v_enrollment_exists THEN
        -- Insert into customer_programs (or program_enrollments via view)
        BEGIN
          INSERT INTO customer_programs (
            customer_id, 
            program_id, 
            current_points,
            enrolled_at
          ) VALUES (
            p_customer_id,
            p_program_id,
            p_points,
            NOW()
          );
        EXCEPTION WHEN OTHERS THEN
          RAISE EXCEPTION 'Failed to enroll customer: %', SQLERRM;
        END;
      ELSE
        -- Update existing enrollment
        BEGIN
          UPDATE customer_programs
          SET 
            current_points = current_points + p_points,
            updated_at = NOW()
          WHERE 
            customer_id = p_customer_id 
            AND program_id = p_program_id;
        EXCEPTION WHEN OTHERS THEN
          RAISE EXCEPTION 'Failed to update points: %', SQLERRM;
        END;
      END IF;
      
      -- Check if customer has a loyalty card for this program
      SELECT EXISTS(
        SELECT 1 FROM loyalty_cards
        WHERE customer_id = v_customer_id_int AND program_id = v_program_id_int
      ) INTO v_card_exists;
      
      -- Get or create card ID
      IF v_card_exists THEN
        SELECT id INTO v_card_id FROM loyalty_cards
        WHERE customer_id = v_customer_id_int AND program_id = v_program_id_int
        LIMIT 1;
        
        -- Update card points
        UPDATE loyalty_cards
        SET 
          points = COALESCE(points, 0) + p_points,
          points_balance = COALESCE(points_balance, 0) + p_points,
          total_points_earned = COALESCE(total_points_earned, 0) + p_points,
          updated_at = NOW()
        WHERE id = v_card_id;
      ELSE
        -- Create a new card
        v_card_id := gen_random_uuid();
        
        INSERT INTO loyalty_cards (
          id,
          customer_id,
          business_id,
          program_id,
          points,
          points_balance,
          total_points_earned,
          created_at,
          updated_at
        ) VALUES (
          v_card_id,
          v_customer_id_int,
          v_business_id_int,
          v_program_id_int,
          p_points,
          p_points,
          p_points,
          NOW(),
          NOW()
        );
      END IF;
      
      -- Record transaction
      INSERT INTO point_transactions (
        customer_id,
        business_id,
        program_id,
        points,
        transaction_type,
        source,
        card_id,
        created_at
      ) VALUES (
        v_customer_id_int,
        v_business_id_int,
        v_program_id_int,
        p_points,
        'AWARD',
        p_source,
        v_card_id,
        NOW()
      );
      
      -- Create notification
      v_notification_id := gen_random_uuid();
      
      INSERT INTO customer_notifications (
        id,
        customer_id,
        business_id,
        type,
        title,
        message,
        data,
        reference_id,
        requires_action,
        action_taken,
        is_read,
        created_at
      ) VALUES (
        v_notification_id,
        v_customer_id_int,
        v_business_id_int,
        'POINTS_ADDED',
        'Points Added',
        'You''ve received ' || p_points || ' points from ' || v_business_name || ' in ' || v_program_name,
        jsonb_build_object(
          'points', p_points,
          'cardId', v_card_id,
          'programId', p_program_id,
          'programName', v_program_name,
          'source', p_source,
          'timestamp', NOW()
        ),
        v_card_id,
        FALSE,
        FALSE,
        FALSE,
        NOW()
      );
      
      -- Done
      RAISE NOTICE 'Successfully awarded % points to customer % for program %', p_points, p_customer_id, p_program_id;
    END;
    $$;
  `;
  
  console.log('✅ Created award_points stored procedure');
}

/**
 * Fix the notification system
 */
async function fixNotificationSystem() {
  console.log('🔔 Fixing notification system...');
  
  // Ensure customer_notifications table exists
  const notificationTableExists = await checkTableExists('customer_notifications');
  
  if (!notificationTableExists) {
    console.log('Creating customer_notifications table...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS customer_notifications (
        id UUID PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        business_id INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        reference_id TEXT,
        requires_action BOOLEAN DEFAULT FALSE,
        action_taken BOOLEAN DEFAULT FALSE,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        read_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE
      )
    `;
    
    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer_id 
      ON customer_notifications(customer_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_notifications_is_read 
      ON customer_notifications(is_read)
    `;
    
    console.log('✅ Created customer_notifications table');
  }
  
  // Ensure customer_notification_preferences table exists
  const prefsTableExists = await checkTableExists('customer_notification_preferences');
  
  if (!prefsTableExists) {
    console.log('Creating customer_notification_preferences table...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS customer_notification_preferences (
        customer_id INTEGER PRIMARY KEY,
        email BOOLEAN DEFAULT TRUE,
        push BOOLEAN DEFAULT TRUE,
        in_app BOOLEAN DEFAULT TRUE,
        sms BOOLEAN DEFAULT FALSE,
        enrollment_notifications BOOLEAN DEFAULT TRUE,
        points_earned_notifications BOOLEAN DEFAULT TRUE,
        points_deducted_notifications BOOLEAN DEFAULT TRUE,
        promo_code_notifications BOOLEAN DEFAULT TRUE,
        reward_available_notifications BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    console.log('✅ Created customer_notification_preferences table');
  }
  
  console.log('✅ Notification system fixed');
}

/**
 * Test the award points system
 */
async function testAwardPointsSystem() {
  console.log('🧪 Testing award points system...');
  
  try {
    // Get a test customer
    const customers = await sql`
      SELECT id, name FROM users WHERE user_type = 'customer' LIMIT 1
    `;
    
    if (customers.length === 0) {
      console.log('⚠️ No customers found for testing');
      return;
    }
    
    const testCustomerId = customers[0].id;
    const testCustomerName = customers[0].name;
    
    // Get a test business
    const businesses = await sql`
      SELECT id, name FROM users WHERE user_type = 'business' LIMIT 1
    `;
    
    if (businesses.length === 0) {
      console.log('⚠️ No businesses found for testing');
      return;
    }
    
    const testBusinessId = businesses[0].id;
    const testBusinessName = businesses[0].name;
    
    // Get a test program
    const programs = await sql`
      SELECT id, name FROM loyalty_programs WHERE business_id = ${testBusinessId} LIMIT 1
    `;
    
    if (programs.length === 0) {
      console.log('⚠️ No loyalty programs found for testing');
      return;
    }
    
    const testProgramId = programs[0].id;
    const testProgramName = programs[0].name;
    const testPoints = 10;
    
    console.log(`Testing with Customer: ${testCustomerName} (${testCustomerId})`);
    console.log(`Testing with Business: ${testBusinessName} (${testBusinessId})`);
    console.log(`Testing with Program: ${testProgramName} (${testProgramId})`);
    console.log(`Points to award: ${testPoints}`);
    
    // Call the award_points procedure
    await sql`
      CALL award_points(
        ${testCustomerId.toString()}, 
        ${testBusinessId.toString()}, 
        ${testProgramId.toString()}, 
        ${testPoints}, 
        'TEST'
      )
    `;
    
    // Check if points were awarded
    const enrollment = await sql`
      SELECT current_points FROM customer_programs
      WHERE customer_id = ${testCustomerId.toString()}
      AND program_id = ${testProgramId.toString()}
    `;
    
    if (enrollment.length === 0) {
      throw new Error('Enrollment not found after awarding points');
    }
    
    console.log(`✅ Points awarded successfully. Current points: ${enrollment[0].current_points}`);
    
    // Check if notification was created
    const notification = await sql`
      SELECT * FROM customer_notifications
      WHERE customer_id = ${testCustomerId}
      AND business_id = ${testBusinessId}
      AND type = 'POINTS_ADDED'
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    if (notification.length === 0) {
      throw new Error('Notification not created after awarding points');
    }
    
    console.log(`✅ Notification created successfully: "${notification[0].message}"`);
    console.log('✅ Award points system test completed successfully');
  } catch (error) {
    console.error('❌ Error testing award points system:', error);
    throw error;
  }
}

/**
 * Helper function to check if a table exists
 */
async function checkTableExists(tableName) {
  const result = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = ${tableName}
    );
  `;
  
  return result[0].exists;
}

// Run the main function
main()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });