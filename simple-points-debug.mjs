/**
 * SIMPLE POINTS DEBUG - Direct SQL Test
 * Based on working patterns from existing .mjs files
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Create database pool with connection string from environment
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function simplePointsDebug() {
  console.log('🔍 SIMPLE POINTS DEBUG');
  console.log('======================\n');
  
  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Database connected successfully\n');
    
    // Test with Customer 4, Program 9 (from user's case)
    const customerId = 4;
    const programId = 9;
    
    console.log(`Testing Customer ${customerId}, Program ${programId}\n`);
    
    // STEP 1: Check if card exists
    console.log('📊 STEP 1: CHECKING CARD EXISTENCE');
    console.log('===================================');
    
    const cardQuery = `
      SELECT id, customer_id, program_id, points, points_balance, total_points_earned
      FROM loyalty_cards 
      WHERE customer_id = $1 AND program_id = $2
    `;
    
    const cardResult = await client.query(cardQuery, [customerId, programId]);
    
    if (cardResult.rows.length > 0) {
      const card = cardResult.rows[0];
      console.log('✅ Card found:');
      console.log(`  Card ID: ${card.id}`);
      console.log(`  Customer ID: ${card.customer_id}`);
      console.log(`  Program ID: ${card.program_id}`);
      console.log(`  Points: ${card.points || 0}`);
      console.log(`  Points Balance: ${card.points_balance || 0}`);
      console.log(`  Total Points Earned: ${card.total_points_earned || 0}`);
    } else {
      console.log('❌ NO CARD FOUND - This is the root problem!');
      
      // Check what cards this customer has
      const allCardsQuery = `
        SELECT id, customer_id, program_id, points 
        FROM loyalty_cards 
        WHERE customer_id = $1
      `;
      const allCardsResult = await client.query(allCardsQuery, [customerId]);
      
      console.log(`\nCustomer ${customerId} has ${allCardsResult.rows.length} cards:`);
      allCardsResult.rows.forEach((card, index) => {
        console.log(`  Card ${index + 1}: ID=${card.id}, Program=${card.program_id}, Points=${card.points || 0}`);
      });
      
      // Check if the program exists
      const programQuery = `SELECT id, name FROM loyalty_programs WHERE id = $1`;
      const programResult = await client.query(programQuery, [programId]);
      
      if (programResult.rows.length > 0) {
        console.log(`\n✅ Program ${programId} exists: ${programResult.rows[0].name}`);
        console.log('🚨 ISSUE: Customer has no card for this program');
      } else {
        console.log(`\n❌ Program ${programId} doesn't exist`);
      }
    }
    
    // STEP 2: Test the customer dashboard query (exact same as LoyaltyCardService)
    console.log('\n🖥️  STEP 2: CUSTOMER DASHBOARD QUERY');
    console.log('====================================');
    
    const dashboardQuery = `
      SELECT 
        lc.*,
        lp.name as program_name,
        u.name as business_name
      FROM loyalty_cards lc
      JOIN loyalty_programs lp ON lc.program_id = lp.id
      JOIN users u ON lp.business_id = u.id
      WHERE lc.customer_id = $1
      ORDER BY lc.created_at DESC
    `;
    
    const dashboardResult = await client.query(dashboardQuery, [customerId]);
    
    console.log(`Dashboard query returned ${dashboardResult.rows.length} cards:`);
    dashboardResult.rows.forEach((card, index) => {
      console.log(`  Card ${index + 1}:`);
      console.log(`    ID: ${card.id}`);
      console.log(`    Program: ${card.program_name} (ID: ${card.program_id})`);
      console.log(`    Points: ${card.points || 0}`);
      console.log(`    Business: ${card.business_name}`);
    });
    
    // Find target program
    const targetCard = dashboardResult.rows.find(card => card.program_id == programId);
    if (targetCard) {
      console.log(`\n✅ Target program card found - Points: ${targetCard.points || 0}`);
    } else {
      console.log(`\n❌ Target program ${programId} not found in dashboard query`);
    }
    
    // STEP 3: Create missing card if needed
    if (cardResult.rows.length === 0) {
      console.log('\n🔧 STEP 3: CREATING MISSING CARD');
      console.log('=================================');
      
      // First check if customer is enrolled in the program
      const enrollmentQuery = `
        SELECT * FROM customer_programs 
        WHERE customer_id = $1 AND program_id = $2
      `;
      const enrollmentResult = await client.query(enrollmentQuery, [customerId.toString(), programId]);
      
      if (enrollmentResult.rows.length > 0) {
        console.log('✅ Customer is enrolled in program');
        
        // Get business ID for this program
        const businessQuery = `SELECT business_id FROM loyalty_programs WHERE id = $1`;
        const businessResult = await client.query(businessQuery, [programId]);
        
        if (businessResult.rows.length > 0) {
          const businessId = businessResult.rows[0].business_id;
          
          // Create the missing card
          const createCardQuery = `
            INSERT INTO loyalty_cards (
              customer_id, 
              business_id, 
              program_id, 
              points, 
              points_balance, 
              total_points_earned,
              card_type,
              is_active,
              created_at, 
              updated_at
            ) VALUES ($1, $2, $3, 0, 0, 0, 'STANDARD', true, NOW(), NOW())
            RETURNING id
          `;
          
          const createResult = await client.query(createCardQuery, [customerId, businessId, programId]);
          
          if (createResult.rows.length > 0) {
            const newCardId = createResult.rows[0].id;
            console.log(`✅ Created new card with ID: ${newCardId}`);
            
            // Now test awarding points to the new card
            const testPoints = 100;
            const updateQuery = `
              UPDATE loyalty_cards 
              SET points = $1, points_balance = $1, total_points_earned = $1, updated_at = NOW()
              WHERE id = $2
              RETURNING *
            `;
            
            const updateResult = await client.query(updateQuery, [testPoints, newCardId]);
            if (updateResult.rows.length > 0) {
              console.log(`✅ Test points added: ${updateResult.rows[0].points}`);
            }
          }
        }
      } else {
        console.log('❌ Customer is not enrolled in this program');
        console.log('   This customer needs to be enrolled first');
      }
    }
    
    console.log('\n=== DIAGNOSIS COMPLETE ===');
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the diagnosis
simplePointsDebug(); 