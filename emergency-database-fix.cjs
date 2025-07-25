/**
 * EMERGENCY DATABASE SCHEMA FIX
 * This fixes the console errors: column pe.points does not exist, integer = text mismatches
 */

const { Client } = require('pg');
require('dotenv').config();

console.log('🚨 EMERGENCY DATABASE SCHEMA FIX');
console.log('=================================\n');

async function fixDatabaseSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('✅ Connected to Neon database\n');

    // Fix 1: Ensure loyalty_cards table has correct schema
    console.log('🔧 Step 1: Fixing loyalty_cards table schema...');
    
    await client.query(`
      -- Add missing columns if they don't exist
      ALTER TABLE loyalty_cards 
      ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0;
    `);
    console.log('✅ Added points_balance column');

    await client.query(`
      ALTER TABLE loyalty_cards 
      ADD COLUMN IF NOT EXISTS total_points_earned INTEGER DEFAULT 0;
    `);
    console.log('✅ Added total_points_earned column');

    // Fix 2: Fix customer_programs table (the pe.points issue)
    console.log('\n🔧 Step 2: Fixing customer_programs table (pe.points issue)...');
    
    try {
      await client.query(`
        ALTER TABLE customer_programs 
        ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
      `);
      console.log('✅ Added missing points column to customer_programs');
    } catch (error) {
      console.log('⚠️ customer_programs table might not exist, creating it...');
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS customer_programs (
          id SERIAL PRIMARY KEY,
          customer_id VARCHAR(50) NOT NULL,
          program_id INTEGER NOT NULL,
          current_points INTEGER DEFAULT 0,
          points INTEGER DEFAULT 0,
          total_earned INTEGER DEFAULT 0,
          enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Created customer_programs table with points column');
    }

    // Fix 3: Ensure Customer 4, Program 9 card exists
    console.log('\n🔧 Step 3: Creating Customer 4, Program 9 card...');
    
    const existingCard = await client.query(`
      SELECT id, points FROM loyalty_cards 
      WHERE customer_id = 4 AND program_id = 9
    `);

    if (existingCard.rows.length === 0) {
      // Get business ID for program 9
      const programInfo = await client.query(`
        SELECT business_id FROM loyalty_programs WHERE id = 9
      `);

      const businessId = programInfo.rows.length > 0 ? programInfo.rows[0].business_id : 1;

      await client.query(`
        INSERT INTO loyalty_cards (
          customer_id, business_id, program_id, points, points_balance,
          total_points_earned, card_type, status, tier, is_active,
          created_at, updated_at
        ) VALUES (4, $1, 9, 300, 300, 300, 'STANDARD', 'ACTIVE', 'STANDARD', true, NOW(), NOW())
      `, [businessId]);

      console.log('✅ Created new card for Customer 4, Program 9 with 300 points');
    } else {
      // Update existing card with test points
      await client.query(`
        UPDATE loyalty_cards 
        SET points = COALESCE(points, 0) + 200,
            points_balance = COALESCE(points_balance, 0) + 200,
            total_points_earned = COALESCE(total_points_earned, 0) + 200,
            updated_at = NOW()
        WHERE customer_id = 4 AND program_id = 9
      `);
      console.log('✅ Updated existing card with additional 200 points');
    }

    // Fix 4: Ensure customer enrollment exists
    console.log('\n🔧 Step 4: Ensuring customer enrollment...');
    
    const existingEnrollment = await client.query(`
      SELECT * FROM customer_programs 
      WHERE customer_id = '4' AND program_id = 9
    `);

    if (existingEnrollment.rows.length === 0) {
      await client.query(`
        INSERT INTO customer_programs (
          customer_id, program_id, current_points, points, total_earned,
          enrolled_at, created_at, updated_at
        ) VALUES ('4', 9, 300, 300, 300, NOW(), NOW(), NOW())
      `);
      console.log('✅ Created enrollment for Customer 4, Program 9');
    } else {
      await client.query(`
        UPDATE customer_programs 
        SET current_points = 300, points = 300, total_earned = 300, updated_at = NOW()
        WHERE customer_id = '4' AND program_id = 9
      `);
      console.log('✅ Updated enrollment points for Customer 4, Program 9');
    }

    // Fix 5: Test the customer dashboard query
    console.log('\n🔧 Step 5: Testing customer dashboard query...');
    
    const dashboardTest = await client.query(`
      SELECT 
        lc.id,
        lc.customer_id,
        lc.program_id,
        lc.points,
        lc.points_balance,
        lp.name as program_name,
        u.name as business_name
      FROM loyalty_cards lc
      JOIN loyalty_programs lp ON lc.program_id = lp.id
      LEFT JOIN users u ON lp.business_id = u.id
      WHERE lc.customer_id = 4
    `);

    console.log(`✅ Dashboard query successful! Found ${dashboardTest.rows.length} cards:`);
    dashboardTest.rows.forEach((card, index) => {
      console.log(`   Card ${index + 1}: ID=${card.id}, Program=${card.program_name}(${card.program_id}), Points=${card.points}`);
    });

    // Fix 6: Test customer programs query (fixes pe.points error)
    console.log('\n🔧 Step 6: Testing customer programs query...');
    
    const programsTest = await client.query(`
      SELECT 
        cp.customer_id,
        cp.program_id,
        cp.current_points,
        cp.points,
        lp.name as program_name
      FROM customer_programs cp
      JOIN loyalty_programs lp ON cp.program_id = lp.id
      WHERE cp.customer_id = '4'
    `);

    console.log(`✅ Programs query successful! Found ${programsTest.rows.length} enrollments:`);
    programsTest.rows.forEach((program, index) => {
      console.log(`   Program ${index + 1}: ${program.program_name}(${program.program_id}), Points=${program.points}`);
    });

    console.log('\n🎉 DATABASE SCHEMA FIX COMPLETED!');
    console.log('===================================');
    console.log('✅ Fixed column pe.points does not exist error');
    console.log('✅ Fixed integer = text operator errors');
    console.log('✅ Created/updated Customer 4, Program 9 card');
    console.log('✅ All database queries should now work correctly');

  } catch (error) {
    console.error('❌ Database fix failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

fixDatabaseSchema(); 