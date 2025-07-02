import sql from './src/utils/db.js';

// Let's fix the import path
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to find the db.js file
async function findDbModule() {
  console.log('Looking for database module...');
  
  // Check if the file exists at the expected path
  const expectedPath = join(__dirname, 'src', 'utils', 'db.js');
  if (fs.existsSync(expectedPath)) {
    console.log(`Found database module at ${expectedPath}`);
    return import(expectedPath);
  }
  
  // Check for db.ts
  const tsPath = join(__dirname, 'src', 'utils', 'db.ts');
  if (fs.existsSync(tsPath)) {
    console.log(`Found database module at ${tsPath}`);
    return import(tsPath);
  }
  
  // Check for other possible locations
  const altPath = join(__dirname, 'src', 'utils', 'db', 'index.js');
  if (fs.existsSync(altPath)) {
    console.log(`Found database module at ${altPath}`);
    return import(altPath);
  }
  
  throw new Error('Could not find database module');
}

/**
 * Test script to verify that cards are properly created after enrollment
 * This script checks for any enrollments without corresponding cards and fixes them
 */
async function testEnrollmentCardCreation() {
  let sqlModule;
  
  try {
    // Dynamically import the database module
    const dbModule = await findDbModule();
    sqlModule = dbModule.default;
    
    if (!sqlModule) {
      throw new Error('Database module not found or not properly exported');
    }
    
    console.log('Starting enrollment card creation test...');
    
    // 1. Find all active enrollments without cards
    console.log('\n1. Checking for enrollments without cards...');
    const missingCards = await sqlModule`
      SELECT 
        pe.id as enrollment_id,
        pe.customer_id,
        pe.program_id,
        lp.business_id,
        lp.name as program_name,
        u.name as business_name
      FROM program_enrollments pe
      JOIN loyalty_programs lp ON pe.program_id = lp.id
      JOIN users u ON lp.business_id = u.id
      LEFT JOIN loyalty_cards lc ON 
        pe.customer_id = lc.customer_id AND 
        pe.program_id = lc.program_id
      WHERE pe.status = 'ACTIVE'
      AND lc.id IS NULL
    `;
    
    if (missingCards.length === 0) {
      console.log('✅ No missing cards found. All enrollments have corresponding cards.');
      return true;
    }
    
    console.log(`Found ${missingCards.length} enrollments without cards:`);
    missingCards.forEach((item, index) => {
      console.log(`  ${index + 1}. Customer ${item.customer_id} in program "${item.program_name}" (${item.program_id})`);
    });
    
    // 2. Create missing cards
    console.log('\n2. Creating missing cards...');
    const createdCards = [];
    
    for (const enrollment of missingCards) {
      try {
        // Generate a unique card number
        const cardNumber = `GC-${Date.now().toString().substring(5)}-${Math.floor(Math.random() * 10000)}`;
        
        // Create the loyalty card
        const cardResult = await sqlModule`
          INSERT INTO loyalty_cards (
            customer_id,
            business_id,
            program_id,
            card_number,
            card_type,
            tier,
            points,
            points_multiplier,
            status,
            created_at,
            updated_at
          ) VALUES (
            ${enrollment.customer_id},
            ${enrollment.business_id},
            ${enrollment.program_id},
            ${cardNumber},
            'STANDARD',
            'STANDARD',
            0,
            1.0,
            'ACTIVE',
            NOW(),
            NOW()
          ) RETURNING id
        `;
        
        if (cardResult.length > 0) {
          const cardId = cardResult[0].id.toString();
          createdCards.push({
            cardId,
            customerId: enrollment.customer_id,
            programId: enrollment.program_id,
            programName: enrollment.program_name
          });
          
          console.log(`✅ Created card ${cardId} for customer ${enrollment.customer_id} in program "${enrollment.program_name}"`);
        }
      } catch (error) {
        console.error(`❌ Error creating card for enrollment ${enrollment.enrollment_id}:`, error);
      }
    }
    
    // 3. Verify all cards were created
    console.log('\n3. Verifying card creation...');
    const remainingMissingCards = await sqlModule`
      SELECT 
        pe.id as enrollment_id,
        pe.customer_id,
        pe.program_id
      FROM program_enrollments pe
      LEFT JOIN loyalty_cards lc ON 
        pe.customer_id = lc.customer_id AND 
        pe.program_id = lc.program_id
      WHERE pe.status = 'ACTIVE'
      AND lc.id IS NULL
    `;
    
    if (remainingMissingCards.length === 0) {
      console.log('✅ All cards created successfully. No missing cards remain.');
    } else {
      console.log(`⚠️ There are still ${remainingMissingCards.length} enrollments without cards.`);
    }
    
    console.log('\nSummary:');
    console.log(`- Found ${missingCards.length} enrollments without cards`);
    console.log(`- Created ${createdCards.length} new cards`);
    console.log(`- ${remainingMissingCards.length} enrollments still need cards`);
    
    return true;
  } catch (error) {
    console.error('❌ Error testing enrollment card creation:', error);
    return false;
  } finally {
    // Close the database connection if it was initialized
    if (sqlModule && typeof sqlModule.end === 'function') {
      await sqlModule.end();
    }
  }
}

// Run the test
testEnrollmentCardCreation()
  .then(() => {
    console.log('\nTest completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error running test:', error);
    process.exit(1);
  }); 