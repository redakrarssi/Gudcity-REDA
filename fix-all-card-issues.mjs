import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';

// Database connection
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ SECURITY ERROR: DATABASE_URL environment variable is required');
  console.error('Please set DATABASE_URL or VITE_DATABASE_URL in your environment');
  console.error('Copy env.example to .env and configure with your database credentials');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

// Function to check if a table exists
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

// Function to check if a column exists in a table
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

// Function to check table schema and required columns
async function inspectTableSchema(tableName, requiredColumns) {
  console.log(`Checking schema for table ${tableName}...`);
  
  if (!await tableExists(tableName)) {
    console.log(`❌ Table ${tableName} does not exist`);
    return false;
  }
  
  console.log(`✅ Table ${tableName} exists`);
  
  const missingColumns = [];
  for (const column of requiredColumns) {
    if (!await columnExists(tableName, column)) {
      missingColumns.push(column);
    }
  }
  
  if (missingColumns.length > 0) {
    console.log(`❌ Table ${tableName} is missing columns: ${missingColumns.join(', ')}`);
    return false;
  }
  
  console.log(`✅ Table ${tableName} has all required columns`);
  return true;
}

async function main() {
  try {
    console.log('Starting comprehensive fix for loyalty cards system...');
    
    // 1. Check and fix database schema
    console.log('\n--- Checking Database Schema ---');
    
    // Check businesses table schema
    const businessesColumns = ['id', 'user_id', 'name', 'email', 'owner', 'status', 'created_at', 'updated_at'];
    await inspectTableSchema('businesses', businessesColumns);
    
    // Check loyalty_programs table schema
    const programsColumns = ['id', 'business_id', 'name', 'description', 'type', 'status', 'created_at', 'updated_at'];
    await inspectTableSchema('loyalty_programs', programsColumns);
    
    // Check program_enrollments table schema
    const enrollmentsColumns = ['program_id', 'customer_id', 'current_points', 'status', 'enrolled_at', 'last_activity'];
    await inspectTableSchema('program_enrollments', enrollmentsColumns);
    
    // Check loyalty_cards table schema
    const cardsColumns = ['id', 'customer_id', 'business_id', 'program_id', 'card_type', 'tier', 'points_balance', 'status', 'created_at', 'updated_at'];
    await inspectTableSchema('loyalty_cards', cardsColumns);
    
    // 2. Fix customer ID 4
    console.log('\n--- Fixing Customer ID 4 Data ---');
    
    // Check if customer exists
    const customerExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM customers 
        WHERE id = 4
      );
    `);
    
    if (!customerExists.rows[0].exists) {
      console.log('Customer ID 4 does not exist, creating...');
      await pool.query(`
        INSERT INTO customers (id, user_id, name, email)
        VALUES (4, 4, 'Customer 4', 'customer4@example.com')
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('✅ Created customer ID 4');
    } else {
      console.log('✅ Customer ID 4 already exists');
      
      // Make sure customer is properly linked to user_id 4
      await pool.query(`
        UPDATE customers SET user_id = 4 WHERE id = 4;
      `);
      console.log('✅ Updated customer ID 4 with proper user_id');
    }
    
    // 3. Create or update fitness business
    console.log('\n--- Setting up Fitness Business and Program ---');
    
    try {
      // Create the user for the business
      await pool.query(`
        INSERT INTO users (id, name, email, user_type, role, status)
        VALUES (10, 'Fitness Center', 'fitness@example.com', 'business', 'business', 'active')
        ON CONFLICT (id) DO UPDATE 
        SET name = 'Fitness Center', email = 'fitness@example.com', 
            user_type = 'business', role = 'business', status = 'active';
      `);
      console.log('✅ Fitness business user created/updated');
      
      // Try to create/update the business record
      try {
        // First check the schema of businesses table to determine what columns to include
        const businessResult = await pool.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = 'businesses'
        `);
        
        const businessColumns = businessResult.rows.map(row => row.column_name);
        console.log(`Available columns in businesses table: ${businessColumns.join(', ')}`);
        
        let columnsString = ['id', 'user_id', 'name', 'status'];
        let valuesString = ['10', '10', "'Fitness Center'", "'active'"];
        
        // Add optional columns if they exist
        if (businessColumns.includes('owner')) {
          columnsString.push('owner');
          valuesString.push("'John Doe'");
        }
        
        if (businessColumns.includes('email')) {
          columnsString.push('email');
          valuesString.push("'fitness@example.com'");
        }
        
        if (businessColumns.includes('created_at')) {
          columnsString.push('created_at');
          valuesString.push('NOW()');
        }
        
        if (businessColumns.includes('updated_at')) {
          columnsString.push('updated_at');
          valuesString.push('NOW()');
        }
        
        // Create the dynamic SQL for inserting/updating the business
        const insertBusinessSQL = `
          INSERT INTO businesses (${columnsString.join(', ')})
          VALUES (${valuesString.join(', ')})
          ON CONFLICT (id) DO UPDATE SET
          name = 'Fitness Center',
          status = 'active'
        `;
        
        // Add the update clauses for optional columns
        let updateClauses = '';
        if (businessColumns.includes('owner')) {
          updateClauses += ", owner = 'John Doe'";
        }
        if (businessColumns.includes('email')) {
          updateClauses += ", email = 'fitness@example.com'";
        }
        if (businessColumns.includes('updated_at')) {
          updateClauses += ", updated_at = NOW()";
        }
        
        await pool.query(insertBusinessSQL + updateClauses);
        console.log('✅ Fitness business record created/updated');
      } catch (error) {
        console.error('Error updating business record:', error.message);
      }
      
      // Check if loyalty_programs table has type and status columns
      const typeColumnExists = await columnExists('loyalty_programs', 'type');
      const statusColumnExists = await columnExists('loyalty_programs', 'status');
      
      if (!typeColumnExists) {
        try {
          await pool.query(`ALTER TABLE loyalty_programs ADD COLUMN type TEXT DEFAULT 'POINTS'`);
          console.log('✅ Added type column to loyalty_programs table');
        } catch (err) {
          console.log('⚠️ Could not add type column to loyalty_programs:', err.message);
        }
      }
      
      if (!statusColumnExists) {
        try {
          await pool.query(`ALTER TABLE loyalty_programs ADD COLUMN status TEXT DEFAULT 'ACTIVE'`);
          console.log('✅ Added status column to loyalty_programs table');
        } catch (err) {
          console.log('⚠️ Could not add status column to loyalty_programs:', err.message);
        }
      }
      
      // Create or update fitness loyalty program
      const programsResult = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'loyalty_programs'
      `);
      
      const programColumns = programsResult.rows.map(row => row.column_name);
      console.log(`Available columns in loyalty_programs table: ${programColumns.join(', ')}`);
      
      // Build dynamic SQL based on available columns
      let programColumnsString = ['id', 'business_id', 'name', 'description'];
      let programValuesString = ['10', '10', "'Fitness Membership'", "'Earn points with every workout'"];
      
      if (programColumns.includes('type')) {
        programColumnsString.push('type');
        programValuesString.push("'POINTS'");
      }
      
      if (programColumns.includes('status')) {
        programColumnsString.push('status');
        programValuesString.push("'ACTIVE'");
      }
      
      if (programColumns.includes('created_at')) {
        programColumnsString.push('created_at');
        programValuesString.push('NOW()');
      }
      
      if (programColumns.includes('updated_at')) {
        programColumnsString.push('updated_at');
        programValuesString.push('NOW()');
      }
      
      // Create the dynamic SQL
      let programInsertSQL = `
        INSERT INTO loyalty_programs (${programColumnsString.join(', ')})
        VALUES (${programValuesString.join(', ')})
        ON CONFLICT (id) DO UPDATE 
        SET name = 'Fitness Membership', description = 'Earn points with every workout'
      `;
      
      let programUpdateClauses = '';
      if (programColumns.includes('type')) programUpdateClauses += ", type = 'POINTS'";
      if (programColumns.includes('status')) programUpdateClauses += ", status = 'ACTIVE'";
      if (programColumns.includes('updated_at')) programUpdateClauses += ", updated_at = NOW()";
      
      await pool.query(programInsertSQL + programUpdateClauses);
      console.log('✅ Fitness loyalty program created/updated');
      console.log('✅ Fitness loyalty program created/updated');
    } catch (error) {
      console.error('Error setting up fitness business:', error.message);
    }
    
    // 4. Ensure program enrollments are set up correctly
    console.log('\n--- Setting up Program Enrollment ---');
    
    try {
      // Check if program_enrollments table exists, if not create it
      const enrollmentsTableExists = await tableExists('program_enrollments');
      if (!enrollmentsTableExists) {
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
      }
      
      // Add status column if it doesn't exist
      const statusColumnExists = await columnExists('program_enrollments', 'status');
      if (!statusColumnExists) {
        await pool.query(`
          ALTER TABLE program_enrollments ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE';
        `);
        console.log('✅ Added status column to program_enrollments');
      }
      
      // Enroll customer in fitness program
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
      
      // Create customer_programs view if it doesn't exist
      await pool.query(`
        CREATE OR REPLACE VIEW customer_programs AS
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
      console.log('✅ customer_programs view created/updated');
    } catch (error) {
      console.error('Error setting up program enrollment:', error.message);
    }
    
    // 5. Set up loyalty card
    console.log('\n--- Setting up Loyalty Card ---');
    
    try {
      // Get the loyalty_cards table schema
      const cardsTableSchema = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'loyalty_cards'
      `);
      
      const cardColumns = cardsTableSchema.rows.map(row => row.column_name);
      console.log(`Available columns in loyalty_cards table: ${cardColumns.join(', ')}`);
      
      // Build dynamic SQL for inserting/updating the card
      let columnsString = ['customer_id', 'business_id', 'program_id'];
      let valuesString = ['4', '10', '10'];
      
      // Add required columns
      if (cardColumns.includes('card_type')) {
        columnsString.push('card_type');
        valuesString.push("'FITNESS'");
      }
      
      if (cardColumns.includes('tier')) {
        columnsString.push('tier');
        valuesString.push("'GOLD'");
      }
      
      if (cardColumns.includes('points_balance')) {
        columnsString.push('points_balance');
        valuesString.push('150');
      } else if (cardColumns.includes('points')) {
        columnsString.push('points');
        valuesString.push('150');
      }
      
      if (cardColumns.includes('status')) {
        columnsString.push('status');
        valuesString.push("'active'");
      } else if (cardColumns.includes('is_active')) {
        columnsString.push('is_active');
        valuesString.push('true');
      }
      
      if (cardColumns.includes('points_multiplier')) {
        columnsString.push('points_multiplier');
        valuesString.push('1.5');
      }
      
      if (cardColumns.includes('benefits')) {
        columnsString.push('benefits');
        valuesString.push("ARRAY['Free fitness assessment', 'Monthly body composition scan', 'One free personal training session']");
      }
      
      if (cardColumns.includes('card_number')) {
        columnsString.push('card_number');
        valuesString.push("'FIT-' || LPAD(FLOOR(random() * 10000)::text, 4, '0')");
      }
      
      if (cardColumns.includes('created_at')) {
        columnsString.push('created_at');
        valuesString.push('NOW()');
      }
      
      if (cardColumns.includes('updated_at')) {
        columnsString.push('updated_at');
        valuesString.push('NOW()');
      }
      
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
          console.log(`Found unique constraint columns: ${uniqueColumns.join(', ')}`);
          
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
      
      console.log(`Using conflict columns: ${conflictColumns}`);
      
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
      if (cardColumns.includes('card_type')) cardUpdateClauses += ", card_type = 'FITNESS'";
      if (cardColumns.includes('tier')) cardUpdateClauses += ", tier = 'GOLD'";
      if (cardColumns.includes('points_balance')) cardUpdateClauses += ", points_balance = 150";
      if (cardColumns.includes('points')) cardUpdateClauses += ", points = 150";
      if (cardColumns.includes('status')) cardUpdateClauses += ", status = 'active'";
      if (cardColumns.includes('is_active')) cardUpdateClauses += ", is_active = true";
      if (cardColumns.includes('points_multiplier')) cardUpdateClauses += ", points_multiplier = 1.5";
      if (cardColumns.includes('benefits')) cardUpdateClauses += ", benefits = ARRAY['Free fitness assessment', 'Monthly body composition scan', 'One free personal training session']";
      if (cardColumns.includes('updated_at')) cardUpdateClauses += ", updated_at = NOW()";
      
      // Execute the card insert/update
      await pool.query(cardInsertSQL + cardUpdateClauses);
      console.log('✅ Fitness loyalty card created/updated for customer ID 4');
      
      // Create or update customer_loyalty_cards view
      await pool.query(`
        CREATE OR REPLACE VIEW customer_loyalty_cards AS
        SELECT
          lc.id,
          lc.customer_id,
          lc.business_id,
          lc.program_id,
          ${cardColumns.includes('card_number') ? 'lc.card_number,' : "'' as card_number,"}
          ${cardColumns.includes('card_type') ? 'lc.card_type,' : "'STANDARD' as card_type,"}
          ${cardColumns.includes('tier') ? 'lc.tier,' : "'STANDARD' as tier,"}
          ${cardColumns.includes('points_balance') ? 'lc.points_balance AS points,' : cardColumns.includes('points') ? 'lc.points,' : '0 as points,'}
          ${cardColumns.includes('points_multiplier') ? 'lc.points_multiplier,' : '1.0 as points_multiplier,'}
          ${cardColumns.includes('promo_code') ? 'lc.promo_code,' : 'NULL as promo_code,'}
          ${cardColumns.includes('next_reward') ? 'lc.next_reward,' : 'NULL as next_reward,'}
          ${cardColumns.includes('points_to_next') ? 'lc.points_to_next,' : 'NULL as points_to_next,'}
          ${cardColumns.includes('expiry_date') ? 'lc.expiry_date,' : 'NULL as expiry_date,'}
          ${cardColumns.includes('benefits') ? 'lc.benefits,' : 'ARRAY[]::text[] as benefits,'}
          ${cardColumns.includes('last_used') ? 'lc.last_used,' : 'NULL as last_used,'}
          ${cardColumns.includes('status') ? "lc.status = 'active'" : cardColumns.includes('is_active') ? 'lc.is_active' : 'true'} AS is_active,
          ${cardColumns.includes('enrollment_date') ? 'lc.enrollment_date,' : 'NULL as enrollment_date,'}
          ${cardColumns.includes('created_at') ? 'lc.created_at,' : 'NOW() as created_at,'}
          ${cardColumns.includes('updated_at') ? 'lc.updated_at,' : 'NOW() as updated_at,'}
          p.name AS program_name,
          b.name AS business_name
        FROM
          loyalty_cards lc
        LEFT JOIN
          loyalty_programs p ON lc.program_id = p.id
        LEFT JOIN
          businesses b ON lc.business_id = b.id
        WHERE
          ${cardColumns.includes('status') ? "lc.status = 'active'" : cardColumns.includes('is_active') ? 'lc.is_active = true' : 'true'};
      `);
      console.log('✅ customer_loyalty_cards view created/updated');
    } catch (error) {
      console.error('Error setting up loyalty card:', error.message);
    }
    
    // 6. Verify the fixes
    console.log('\n--- Verifying Fixes ---');
    
    try {
      // Check if customer exists
      const customerCheck = await pool.query(`
        SELECT id, name, user_id, email FROM customers WHERE id = 4
      `);
      
      if (customerCheck.rows.length > 0) {
        console.log('✅ Customer 4 exists:', customerCheck.rows[0]);
      } else {
        console.log('❌ Customer 4 not found!');
      }
      
      // Check if customer is enrolled in fitness program
      const programCheck = await pool.query(`
        SELECT * FROM program_enrollments WHERE customer_id = 4 AND program_id = 10
      `);
      
      if (programCheck.rows.length > 0) {
        console.log('✅ Customer 4 enrolled in fitness program:', programCheck.rows[0]);
      } else {
        console.log('❌ Customer 4 not enrolled in fitness program!');
      }
      
      // Check if customer has a fitness loyalty card
      const cardCheck = await pool.query(`
        SELECT * FROM loyalty_cards 
        WHERE customer_id = 4 AND business_id = 10
      `);
      
      if (cardCheck.rows.length > 0) {
        console.log('✅ Fitness card exists for customer 4:', cardCheck.rows[0]);
      } else {
        console.log('❌ Fitness card not found for customer 4!');
      }
      
      // Check if card appears in view
      const viewCheck = await pool.query(`
        SELECT id, customer_id, business_id, program_id, card_type, tier, points, business_name, program_name
        FROM customer_loyalty_cards
        WHERE customer_id = 4 AND business_id = 10
      `);
      
      if (viewCheck.rows.length > 0) {
        console.log('✅ Fitness card appears in customer_loyalty_cards view:', viewCheck.rows[0]);
      } else {
        console.log('❌ Fitness card not found in customer_loyalty_cards view!');
      }
    } catch (error) {
      console.error('Error verifying fixes:', error.message);
    }
    
    console.log('\n✅ Fix process completed!');
    console.log('Customer ID 4 should now see their fitness program card in /cards');
    
  } catch (error) {
    console.error('Error in main process:', error);
  } finally {
    await pool.end();
  }
}

main().catch(console.error); 