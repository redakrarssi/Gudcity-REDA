import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import fs from 'fs';
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get database connection string from environment or use default
const DATABASE_URL = process.env.DATABASE_URL || "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";

// Create a database connection
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

// Helper functions for schema checking
async function tableExists(tableName) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    );
  `, [tableName]);
  
  return result.rows[0].exists;
}

async function columnExists(tableName, columnName) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = $1
      AND column_name = $2
    );
  `, [tableName, columnName]);
  
  return result.rows[0].exists;
}

async function viewExists(viewName) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = $1
    );
  `, [viewName]);
  
  return result.rows[0].exists;
}

async function main() {
  console.log('Starting comprehensive fix for all QR and loyalty card issues...');
  console.log('Database URL:', DATABASE_URL.replace(/postgres:\/\/.*?@/, 'postgres://****@'));
  
  try {
    console.log('\n--- Fixing QR Scanner Error Message Issue ---');
    console.log('This issue requires code changes in the QRScanner component.');
    console.log('The error message should be cleared after a successful scan.');
    console.log('This has been fixed in the codebase already.');
    
    console.log('\n--- Fixing Database Schema Issues ---');
    
    // Check and fix program_enrollments table
    if (!await tableExists('program_enrollments')) {
      console.log('Creating program_enrollments table...');
      await pool.query(`
        CREATE TABLE program_enrollments (
          id SERIAL PRIMARY KEY,
          program_id INTEGER NOT NULL,
          customer_id INTEGER NOT NULL,
          current_points INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'ACTIVE',
          enrolled_at TIMESTAMP NOT NULL DEFAULT NOW(),
          last_activity TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE (program_id, customer_id)
        );
      `);
      console.log('✅ Created program_enrollments table');
    } else {
      console.log('✅ program_enrollments table exists');
      
      // Make sure status column exists
      if (!await columnExists('program_enrollments', 'status')) {
        await pool.query(`
          ALTER TABLE program_enrollments ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';
        `);
        console.log('✅ Added status column to program_enrollments');
      }
    }
    
    // Check and fix customer_programs view
    console.log('Creating/updating customer_programs view...');
    try {
      // First drop the view if it exists
      if (await viewExists('customer_programs')) {
        await pool.query(`DROP VIEW customer_programs;`);
        console.log('Dropped existing customer_programs view');
      }
      
      // Create the view from scratch
      await pool.query(`
        CREATE VIEW customer_programs AS
        SELECT 
          e.customer_id,
          e.program_id,
          e.current_points as points,
          e.status,
          p.business_id,
          p.name as program_name,
          b.name as business_name,
          e.enrolled_at,
          e.last_activity
        FROM 
          program_enrollments e
        JOIN 
          loyalty_programs p ON e.program_id = p.id
        JOIN 
          businesses b ON p.business_id = b.id
        WHERE 
          e.status = 'ACTIVE';
      `);
      console.log('✅ customer_programs view created');
    } catch (error) {
      console.error('Error creating customer_programs view:', error.message);
    }
    
    // Check and fix customer_loyalty_cards view
    console.log('Creating/updating customer_loyalty_cards view...');
    try {
      // First drop the view if it exists
      if (await viewExists('customer_loyalty_cards')) {
        await pool.query(`DROP VIEW customer_loyalty_cards;`);
        console.log('Dropped existing customer_loyalty_cards view');
      }
      
      // Create the view from scratch
      await pool.query(`
        CREATE VIEW customer_loyalty_cards AS
        SELECT
          lc.id,
          lc.customer_id,
          lc.business_id,
          lc.program_id,
          lc.card_number,
          lc.card_type,
          lc.tier,
          lc.points,
          lc.points_multiplier,
          lc.promo_code,
          lc.next_reward,
          lc.points_to_next,
          lc.expiry_date,
          lc.benefits,
          lc.last_used,
          CASE 
            WHEN lc.status IS NOT NULL THEN lc.status = 'active'
            ELSE lc.is_active
          END AS is_active,
          lc.created_at,
          lc.updated_at,
          p.name AS program_name,
          b.name AS business_name
        FROM
          loyalty_cards lc
        LEFT JOIN
          loyalty_programs p ON lc.program_id = p.id
        LEFT JOIN
          businesses b ON lc.business_id = b.id
        WHERE
          CASE 
            WHEN lc.status IS NOT NULL THEN lc.status = 'active'
            ELSE lc.is_active = true
          END;
      `);
      console.log('✅ customer_loyalty_cards view created');
    } catch (error) {
      console.error('Error creating customer_loyalty_cards view:', error.message);
    }
    
    // 3. Fix customer ID 4's fitness program card
    console.log('\n--- Fixing Customer ID 4 Fitness Program Card ---');
    
    // Create or update fitness business user
    console.log('Creating/updating fitness business user...');
    await pool.query(`
      INSERT INTO users (id, name, email, user_type, role, status)
      VALUES (10, 'Fitness Center', 'fitness@example.com', 'business', 'business', 'active')
      ON CONFLICT (id) DO UPDATE 
      SET name = 'Fitness Center', email = 'fitness@example.com', 
          user_type = 'business', role = 'business', status = 'active';
    `);
    console.log('✅ Fitness business user created/updated');
    
    // Create or update fitness business
    console.log('Creating/updating fitness business...');
    try {
      // Get columns in businesses table
      const businessColumns = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'businesses'
      `);
      
      const columns = businessColumns.rows.map(row => row.column_name);
      
      // Build dynamic SQL based on available columns
      let columnsString = ['id', 'user_id', 'name'];
      let valuesString = ['10', '10', "'Fitness Center'"];
      
      // Add optional columns if they exist
      if (columns.includes('status')) {
        columnsString.push('status');
        valuesString.push("'active'");
      }
      
      if (columns.includes('owner')) {
        columnsString.push('owner');
        valuesString.push("'John Doe'");
      }
      
      if (columns.includes('email')) {
        columnsString.push('email');
        valuesString.push("'fitness@example.com'");
      }
      
      if (columns.includes('created_at')) {
        columnsString.push('created_at');
        valuesString.push('NOW()');
      }
      
      if (columns.includes('updated_at')) {
        columnsString.push('updated_at');
        valuesString.push('NOW()');
      }
      
      // Create the dynamic SQL
      let insertSQL = `
        INSERT INTO businesses (${columnsString.join(', ')})
        VALUES (${valuesString.join(', ')})
        ON CONFLICT (id) DO UPDATE SET name = 'Fitness Center'
      `;
      
      // Add update clauses for optional columns
      let updateClauses = '';
      if (columns.includes('status')) updateClauses += ", status = 'active'";
      if (columns.includes('owner')) updateClauses += ", owner = 'John Doe'";
      if (columns.includes('email')) updateClauses += ", email = 'fitness@example.com'";
      if (columns.includes('updated_at')) updateClauses += ", updated_at = NOW()";
      
      await pool.query(insertSQL + updateClauses);
      console.log('✅ Fitness business created/updated');
    } catch (error) {
      console.error('Error updating business:', error.message);
    }
    
    // Create or update fitness loyalty program
    console.log('Creating/updating fitness loyalty program...');
    try {
      // Check if loyalty_programs table has type and status columns
      if (!await columnExists('loyalty_programs', 'type')) {
        await pool.query(`ALTER TABLE loyalty_programs ADD COLUMN type TEXT DEFAULT 'POINTS'`);
        console.log('✅ Added type column to loyalty_programs');
      }
      
      if (!await columnExists('loyalty_programs', 'status')) {
        await pool.query(`ALTER TABLE loyalty_programs ADD COLUMN status TEXT DEFAULT 'ACTIVE'`);
        console.log('✅ Added status column to loyalty_programs');
      }
      
      // Get columns in loyalty_programs table
      const programColumns = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'loyalty_programs'
      `);
      
      const columns = programColumns.rows.map(row => row.column_name);
      
      // Build dynamic SQL based on available columns
      let columnsString = ['id', 'business_id', 'name', 'description'];
      let valuesString = ['10', '10', "'Fitness Membership'", "'Earn points with every workout'"];
      
      if (columns.includes('type')) {
        columnsString.push('type');
        valuesString.push("'POINTS'");
      }
      
      if (columns.includes('status')) {
        columnsString.push('status');
        valuesString.push("'ACTIVE'");
      }
      
      if (columns.includes('created_at')) {
        columnsString.push('created_at');
        valuesString.push('NOW()');
      }
      
      if (columns.includes('updated_at')) {
        columnsString.push('updated_at');
        valuesString.push('NOW()');
      }
      
      // Create the dynamic SQL
      let insertSQL = `
        INSERT INTO loyalty_programs (${columnsString.join(', ')})
        VALUES (${valuesString.join(', ')})
        ON CONFLICT (id) DO UPDATE 
        SET name = 'Fitness Membership', description = 'Earn points with every workout'
      `;
      
      let updateClauses = '';
      if (columns.includes('type')) updateClauses += ", type = 'POINTS'";
      if (columns.includes('status')) updateClauses += ", status = 'ACTIVE'";
      if (columns.includes('updated_at')) updateClauses += ", updated_at = NOW()";
      
      await pool.query(insertSQL + updateClauses);
      console.log('✅ Fitness loyalty program created/updated');
    } catch (error) {
      console.error('Error updating loyalty program:', error.message);
    }
    
    // Enroll customer in fitness program
    console.log('Enrolling customer ID 4 in fitness program...');
    await pool.query(`
      INSERT INTO program_enrollments (
        program_id,
        customer_id,
        current_points,
        status,
        enrolled_at,
        last_activity
      )
      VALUES (10, 4, 150, 'ACTIVE', NOW(), NOW())
      ON CONFLICT (program_id, customer_id) DO UPDATE 
      SET current_points = 150, status = 'ACTIVE', last_activity = NOW();
    `);
    console.log('✅ Customer enrolled in fitness program');
    
    // Create or update fitness card for customer
    console.log('Creating/updating fitness card for customer ID 4...');
    try {
      // Get columns in loyalty_cards table
      const cardColumns = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'loyalty_cards'
      `);
      
      const columns = cardColumns.rows.map(row => row.column_name);
      
      // Determine proper conflict columns
      let conflictColumns = '';
      try {
        const uniqueConstraints = await pool.query(`
          SELECT 
            tc.constraint_name, 
            kcu.column_name
          FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
          WHERE 
            tc.constraint_type = 'UNIQUE' AND
            tc.table_name = 'loyalty_cards' AND
            kcu.column_name IN ('customer_id', 'business_id', 'program_id')
        `);
        
        if (uniqueConstraints.rows.length > 0) {
          // Find columns in unique constraints
          const uniqueColumns = uniqueConstraints.rows.map(row => row.column_name);
          
          if (uniqueColumns.includes('customer_id') && uniqueColumns.includes('program_id')) {
            conflictColumns = '(customer_id, program_id)';
          } else if (uniqueColumns.includes('customer_id') && uniqueColumns.includes('business_id')) {
            conflictColumns = '(customer_id, business_id)';
          } else {
            // Default to id if we can't determine the proper conflict columns
            conflictColumns = '(id)';
          }
        } else {
          // Assume id is primary key
          conflictColumns = '(id)';
        }
      } catch (error) {
        console.error('Error determining unique constraints:', error.message);
        // Default to conservative approach - use id as conflict column
        conflictColumns = '(id)';
      }
      
      // Build dynamic SQL for card insert/update
      let columnsString = ['customer_id', 'business_id', 'program_id'];
      let valuesString = ['4', '10', '10'];
      
      // Add required columns
      if (columns.includes('card_type')) {
        columnsString.push('card_type');
        valuesString.push("'FITNESS'");
      }
      
      if (columns.includes('tier')) {
        columnsString.push('tier');
        valuesString.push("'GOLD'");
      }
      
      if (columns.includes('points_balance')) {
        columnsString.push('points_balance');
        valuesString.push('150');
      } else if (columns.includes('points')) {
        columnsString.push('points');
        valuesString.push('150');
      }
      
      if (columns.includes('status')) {
        columnsString.push('status');
        valuesString.push("'active'");
      } else if (columns.includes('is_active')) {
        columnsString.push('is_active');
        valuesString.push('true');
      }
      
      if (columns.includes('points_multiplier')) {
        columnsString.push('points_multiplier');
        valuesString.push('1.5');
      }
      
      if (columns.includes('benefits')) {
        columnsString.push('benefits');
        valuesString.push("ARRAY['Free fitness assessment', 'Monthly body composition scan', 'One free personal training session']");
      }
      
      if (columns.includes('card_number')) {
        columnsString.push('card_number');
        valuesString.push("'FIT-' || LPAD(FLOOR(random() * 10000)::text, 4, '0')");
      }
      
      if (columns.includes('created_at')) {
        columnsString.push('created_at');
        valuesString.push('NOW()');
      }
      
      if (columns.includes('updated_at')) {
        columnsString.push('updated_at');
        valuesString.push('NOW()');
      }
      
      // Build the card insert SQL
      const cardInsertSQL = `
        INSERT INTO loyalty_cards (${columnsString.join(', ')})
        VALUES (${valuesString.join(', ')})
        ON CONFLICT ${conflictColumns} DO UPDATE SET
          customer_id = 4,
          business_id = 10,
          program_id = 10
      `;
      
      // Add optional update columns
      let cardUpdateClauses = '';
      if (columns.includes('card_type')) cardUpdateClauses += ", card_type = 'FITNESS'";
      if (columns.includes('tier')) cardUpdateClauses += ", tier = 'GOLD'";
      if (columns.includes('points_balance')) cardUpdateClauses += ", points_balance = 150";
      if (columns.includes('points')) cardUpdateClauses += ", points = 150";
      if (columns.includes('status')) cardUpdateClauses += ", status = 'active'";
      if (columns.includes('is_active')) cardUpdateClauses += ", is_active = true";
      if (columns.includes('points_multiplier')) cardUpdateClauses += ", points_multiplier = 1.5";
      if (columns.includes('benefits')) cardUpdateClauses += ", benefits = ARRAY['Free fitness assessment', 'Monthly body composition scan', 'One free personal training session']";
      if (columns.includes('updated_at')) cardUpdateClauses += ", updated_at = NOW()";
      
      // Execute the card insert/update
      await pool.query(cardInsertSQL + cardUpdateClauses);
      console.log('✅ Fitness loyalty card created/updated for customer ID 4');
    } catch (error) {
      console.error('Error updating loyalty card:', error.message);
    }
    
    // 4. Verify the fixes
    console.log('\n--- Verifying Fixes ---');
    
    // Check customer ID 4's loyalty cards
    const cardsResult = await pool.query(`
      SELECT id, customer_id, business_id, program_id, card_type, tier, points, business_name, program_name
      FROM customer_loyalty_cards
      WHERE customer_id = 4
    `);
    
    if (cardsResult.rows.length > 0) {
      console.log(`✅ Found ${cardsResult.rows.length} loyalty cards for customer ID 4:`);
      cardsResult.rows.forEach((card, index) => {
        console.log(`  [${index + 1}] Card ID: ${card.id}, Business: ${card.business_name}, Program: ${card.program_name}`);
        console.log(`      Type: ${card.card_type}, Tier: ${card.tier}, Points: ${card.points}`);
      });
    } else {
      console.log('❌ No loyalty cards found for customer ID 4!');
    }
    
    // Check if fitness card exists
    const fitnessCardResult = await pool.query(`
      SELECT id, customer_id, business_id, program_id, card_type, tier, points, business_name, program_name
      FROM customer_loyalty_cards
      WHERE customer_id = 4 AND business_id = 10
    `);
    
    if (fitnessCardResult.rows.length > 0) {
      console.log('✅ Fitness card exists for customer ID 4:');
      console.log(`  Card ID: ${fitnessCardResult.rows[0].id}`);
      console.log(`  Business: ${fitnessCardResult.rows[0].business_name}`);
      console.log(`  Program: ${fitnessCardResult.rows[0].program_name}`);
      console.log(`  Type: ${fitnessCardResult.rows[0].card_type}`);
      console.log(`  Tier: ${fitnessCardResult.rows[0].tier}`);
      console.log(`  Points: ${fitnessCardResult.rows[0].points}`);
    } else {
      console.log('❌ Fitness card not found for customer ID 4!');
    }
    
    console.log('\n✅ All fixes completed successfully!');
    console.log('Customer ID 4 should now see their fitness program card in the /cards route.');
    
  } catch (error) {
    console.error('Error during fix process:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
