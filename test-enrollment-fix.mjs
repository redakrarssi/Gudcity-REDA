#!/usr/bin/env node
/**
 * Test script to verify the enrollment foreign key fix
 * This script tests the enrollment flow for customer_id=32
 */

import { neon } from '@neondatabase/serverless';

function getDbUrl() {
  const url = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL || '';
  if (!url) throw new Error('Database URL not found. Set VITE_DATABASE_URL or DATABASE_URL.');
  return url;
}

async function main() {
  const sql = neon(getDbUrl());
  
  console.log('🔍 Testing enrollment foreign key constraint fix...\n');
  
  try {
    // Step 1: Check if stored procedure exists and update it
    console.log('1️⃣ Ensuring enrollment procedure exists...');
    // Skip importing TypeScript module directly since Node.js can't handle it
    console.log('Creating enrollment procedure directly...');
    
    // Create the procedure directly with SQL
    await sql`
      CREATE OR REPLACE FUNCTION process_enrollment_approval(
        p_customer_id INTEGER,
        p_program_id INTEGER,
        p_request_id UUID
      )
      RETURNS INTEGER AS $$
      DECLARE
        customer_id_val INTEGER := p_customer_id;
        program_id_int INTEGER := p_program_id;
        business_id_val INTEGER;
        program_name_val TEXT;
        business_name_val TEXT;
        notification_id_val UUID;
        enrollment_id_val INTEGER;
        card_id_val INTEGER;
        enrollment_exists BOOLEAN;
        card_exists BOOLEAN;
        notif_exists BOOLEAN;
        customer_exists BOOLEAN;
        user_id_val INTEGER;
        user_name_val TEXT;
        user_email_val TEXT;
        gen_uuid UUID;
      BEGIN
        -- Update approval request
        UPDATE customer_approval_requests
        SET status = 'APPROVED',
            response_at = NOW()
        WHERE id = p_request_id
        RETURNING notification_id INTO notification_id_val;

        -- Resolve business/program info
        SELECT lp.business_id, lp.name
        INTO business_id_val, program_name_val
        FROM loyalty_programs lp
        WHERE lp.id = program_id_int;
        IF business_id_val IS NULL THEN
          RAISE EXCEPTION 'Program not found: %', program_id_int;
        END IF;
        
        SELECT name INTO business_name_val FROM users WHERE id = business_id_val;

        -- CRITICAL FIX: Ensure customer record exists before creating loyalty card
        SELECT EXISTS (
          SELECT 1 FROM customers WHERE id = customer_id_val
        ) INTO customer_exists;
        
        IF NOT customer_exists THEN
          -- Customer doesn't exist, we need to create it
          -- First, find the user record that corresponds to this customer_id
          SELECT id, name, email
          INTO user_id_val, user_name_val, user_email_val
          FROM users 
          WHERE id = customer_id_val;
          
          IF user_id_val IS NULL THEN
            RAISE EXCEPTION 'User not found for customer_id: %. Cannot create customer record.', customer_id_val;
          END IF;
          
          -- Create the customer record
          INSERT INTO customers (
            id,
            user_id, 
            name, 
            email,
            notification_preferences,
            regional_settings,
            joined_at,
            created_at,
            updated_at
          ) VALUES (
            customer_id_val,
            user_id_val,
            COALESCE(
              NULLIF(user_name_val, ''),
              CASE 
                WHEN user_email_val LIKE '%@%' THEN 
                  INITCAP(REPLACE(SPLIT_PART(user_email_val, '@', 1), '.', ' '))
                ELSE 
                  'Customer ' || customer_id_val::TEXT
              END
            ),
            user_email_val,
            '{"email": true, "push": true, "sms": false, "promotions": true, "rewards": true, "system": true}'::jsonb,
            '{"language": "en", "country": "United States", "currency": "USD", "timezone": "UTC"}'::jsonb,
            NOW(),
            NOW(),
            NOW()
          )
          ON CONFLICT (id) DO NOTHING;
          
          RAISE NOTICE 'Created customer record for customer_id: %', customer_id_val;
        END IF;

        -- Ensure enrollment exists and is ACTIVE
        SELECT EXISTS (
          SELECT 1 FROM program_enrollments 
          WHERE customer_id = customer_id_val AND program_id = program_id_int
        ) INTO enrollment_exists;
        
        IF enrollment_exists THEN
          UPDATE program_enrollments
          SET status = 'ACTIVE', 
              last_activity = NOW()
          WHERE customer_id = customer_id_val AND program_id = program_id_int;
        ELSE
          INSERT INTO program_enrollments (
            customer_id, program_id, status, current_points, enrolled_at
          ) VALUES (
            customer_id_val, program_id_int, 'ACTIVE', 0, NOW()
          ) RETURNING id INTO enrollment_id_val;
        END IF;
        
        -- Ensure loyalty card exists
        SELECT EXISTS (
          SELECT 1 FROM loyalty_cards
          WHERE customer_id = customer_id_val AND program_id = program_id_int
        ) INTO card_exists;
        
        IF NOT card_exists THEN
          INSERT INTO loyalty_cards (
            customer_id, business_id, program_id, card_number,
            status, card_type, points, tier, points_multiplier, is_active, created_at, updated_at
          ) VALUES (
            customer_id_val, business_id_val, program_id_int,
            'GC-' || to_char(NOW(), 'YYMMDD-HH24MISS') || '-' || floor(random() * 10000)::TEXT,
            'ACTIVE', 'STANDARD', 0, 'STANDARD', 1.0, TRUE, NOW(), NOW()
          ) RETURNING id INTO card_id_val;
        ELSE
          SELECT id INTO card_id_val FROM loyalty_cards
          WHERE customer_id = customer_id_val AND program_id = program_id_int
          ORDER BY created_at DESC LIMIT 1;
        END IF;

        RETURN card_id_val;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error in process_enrollment_approval: %', SQLERRM;
        RAISE;
      END;
      $$ LANGUAGE plpgsql;
    `;
    console.log('✅ Enrollment procedure ready\n');
    
    // Step 2: Check current state for customer_id=32
    const customerId = 32;
    const programId = 18;
    
    console.log(`2️⃣ Checking current state for customer_id=${customerId}...`);
    
    // Check if customer exists
    const customerExists = await sql`SELECT id FROM customers WHERE id = ${customerId}`;
    console.log(`   Customer exists: ${customerExists.length > 0 ? '✅ Yes' : '❌ No'}`);
    
    // Check if user exists (should exist if enrollment was attempted)
    const userExists = await sql`SELECT id, name, email FROM users WHERE id = ${customerId}`;
    console.log(`   User exists: ${userExists.length > 0 ? '✅ Yes' : '❌ No'}`);
    if (userExists.length > 0) {
      console.log(`   User details: ${JSON.stringify(userExists[0])}`);
    }
    
    // Check if program exists
    const programExists = await sql`SELECT id, name, business_id FROM loyalty_programs WHERE id = ${programId}`;
    console.log(`   Program exists: ${programExists.length > 0 ? '✅ Yes' : '❌ No'}`);
    if (programExists.length > 0) {
      console.log(`   Program details: ${JSON.stringify(programExists[0])}`);
    }
    
    // Check existing enrollment
    const enrollmentExists = await sql`
      SELECT * FROM program_enrollments 
      WHERE customer_id = ${customerId} AND program_id = ${programId}
    `;
    console.log(`   Enrollment exists: ${enrollmentExists.length > 0 ? '✅ Yes' : '❌ No'}`);
    
    // Check existing card
    const cardExists = await sql`
      SELECT * FROM loyalty_cards 
      WHERE customer_id = ${customerId} AND program_id = ${programId}
    `;
    console.log(`   Loyalty card exists: ${cardExists.length > 0 ? '✅ Yes' : '❌ No'}\n`);
    
    // Step 3: Create a test approval request if needed
    console.log('3️⃣ Creating test approval request...');
    
    const requestId = '12345678-1234-1234-1234-123456789012'; // Test UUID
    
    // Clean up any existing test request
    await sql`DELETE FROM customer_approval_requests WHERE id = ${requestId}`;
    
    // Create test approval request
    await sql`
      INSERT INTO customer_approval_requests (
        id, customer_id, business_id, entity_id, request_type, status, 
        data, requested_at, expires_at
      ) VALUES (
        ${requestId}::uuid,
        ${customerId},
        ${programExists[0]?.business_id || 1},
        ${programId},
        'ENROLLMENT',
        'PENDING',
        '{"test": true}'::jsonb,
        NOW(),
        NOW() + INTERVAL '7 days'
      )
    `;
    console.log('✅ Test approval request created\n');
    
    // Step 4: Test the fixed enrollment procedure
    console.log('4️⃣ Testing enrollment procedure with customer auto-creation...');
    
    try {
      const result = await sql`
        SELECT process_enrollment_approval(${customerId}, ${programId}, ${requestId}::uuid) as card_id
      `;
      
      if (result && result.length > 0 && result[0].card_id) {
        console.log(`✅ SUCCESS! Card created with ID: ${result[0].card_id}`);
        
        // Verify customer was created
        const customerCheck = await sql`SELECT id, name FROM customers WHERE id = ${customerId}`;
        console.log(`✅ Customer record: ${JSON.stringify(customerCheck[0])}`);
        
        // Verify enrollment was created
        const enrollmentCheck = await sql`
          SELECT * FROM program_enrollments 
          WHERE customer_id = ${customerId} AND program_id = ${programId}
        `;
        console.log(`✅ Enrollment record: ${JSON.stringify(enrollmentCheck[0])}`);
        
        // Verify card was created
        const cardCheck = await sql`
          SELECT id, card_number, status FROM loyalty_cards 
          WHERE customer_id = ${customerId} AND program_id = ${programId}
        `;
        console.log(`✅ Loyalty card: ${JSON.stringify(cardCheck[0])}`);
        
      } else {
        console.log('❌ FAILED: No card ID returned');
      }
      
    } catch (error) {
      console.error('❌ FAILED: Enrollment procedure error:', error.message);
      
      // Try to diagnose the issue
      console.log('\n🔍 Diagnosing the issue...');
      
      const customerAfter = await sql`SELECT id FROM customers WHERE id = ${customerId}`;
      console.log(`Customer after procedure: ${customerAfter.length > 0 ? 'Exists' : 'Missing'}`);
      
      const userAfter = await sql`SELECT id FROM users WHERE id = ${customerId}`;
      console.log(`User after procedure: ${userAfter.length > 0 ? 'Exists' : 'Missing'}`);
    }
    
    // Step 5: Clean up test data
    console.log('\n5️⃣ Cleaning up test data...');
    await sql`DELETE FROM customer_approval_requests WHERE id = ${requestId}`;
    console.log('✅ Test approval request cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

main().catch(console.error);
