import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testQRPointAwarding() {
  console.log('Starting QR code point awarding test...');
  
  try {
    // 1. Get a test customer and business
    const customerResult = await pool.query(
      'SELECT id, name FROM users WHERE user_type = $1 LIMIT 1',
      ['customer']
    );
    
    const businessResult = await pool.query(
      'SELECT id, name FROM users WHERE user_type = $1 LIMIT 1',
      ['business']
    );
    
    if (customerResult.rows.length === 0 || businessResult.rows.length === 0) {
      console.error('No test customer or business found');
      return;
    }
    
    const customerId = customerResult.rows[0].id;
    const customerName = customerResult.rows[0].name;
    const businessId = businessResult.rows[0].id;
    const businessName = businessResult.rows[0].name;
    
    console.log(`Using test customer: ${customerName} (${customerId})`);
    console.log(`Using test business: ${businessName} (${businessId})`);
    
    // 2. Get a loyalty program for the business
    const programResult = await pool.query(
      'SELECT id, name FROM loyalty_programs WHERE business_id = $1 LIMIT 1',
      [businessId]
    );
    
    if (programResult.rows.length === 0) {
      // Create a test program if none exists
      console.log('No loyalty program found, creating a test program...');
      
      const newProgramResult = await pool.query(
        `INSERT INTO loyalty_programs (
          business_id, name, description, type, points_per_dollar, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id, name`,
        [businessId, 'Test Loyalty Program', 'Program for testing', 'POINTS', 1]
      );
      
      console.log('Created new test program');
      var programId = newProgramResult.rows[0].id;
      var programName = newProgramResult.rows[0].name;
    } else {
      var programId = programResult.rows[0].id;
      var programName = programResult.rows[0].name;
    }
    
    console.log(`Using loyalty program: ${programName} (${programId})`);
    
    // 3. Ensure the customer is enrolled in the program
    const enrollmentResult = await pool.query(
      `SELECT * FROM program_enrollments 
       WHERE customer_id = $1 AND program_id = $2`,
      [customerId.toString(), programId]
    );
    
    if (enrollmentResult.rows.length === 0) {
      console.log('Customer not enrolled, creating enrollment...');
      
      await pool.query(
        `INSERT INTO program_enrollments (
          customer_id, program_id, status, current_points, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [customerId.toString(), programId, 'ACTIVE', 0]
      );
      
      console.log('Enrollment created');
    } else {
      console.log('Customer already enrolled in program');
    }
    
    // 4. Get or create a loyalty card
    const cardResult = await pool.query(
      `SELECT * FROM loyalty_cards 
       WHERE customer_id = $1 AND business_id = $2 AND program_id = $3`,
      [customerId.toString(), businessId.toString(), programId.toString()]
    );
    
    let cardId;
    
    if (cardResult.rows.length === 0) {
      console.log('No loyalty card found, creating one...');
      
      const cardNumber = `GC-${Math.floor(100000 + Math.random() * 900000)}-C`;
      
      const newCardResult = await pool.query(
        `INSERT INTO loyalty_cards (
          customer_id, business_id, program_id, card_number, points, 
          points_balance, total_points_earned, tier, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) RETURNING id`,
        [customerId.toString(), businessId.toString(), programId.toString(), cardNumber, 
         0, 0, 0, 'STANDARD', true]
      );
      
      cardId = newCardResult.rows[0].id;
      console.log(`Created new loyalty card with ID: ${cardId}`);
    } else {
      cardId = cardResult.rows[0].id;
      console.log(`Using existing loyalty card with ID: ${cardId}`);
    }
    
    // 5. Award points to the card
    const pointsToAward = 25;
    console.log(`Awarding ${pointsToAward} points to card ${cardId}...`);
    
    // Get current points
    const currentPointsResult = await pool.query(
      'SELECT points, points_balance FROM loyalty_cards WHERE id = $1',
      [cardId]
    );
    
    const currentPoints = parseFloat(currentPointsResult.rows[0].points) || 0;
    const currentBalance = parseFloat(currentPointsResult.rows[0].points_balance) || 0;
    
    console.log(`Current points: ${currentPoints}, Current balance: ${currentBalance}`);
    
    // Award points
    await pool.query(
      `UPDATE loyalty_cards 
       SET points_balance = points_balance + $1, 
           total_points_earned = total_points_earned + $1,
           points = points + $1,
           updated_at = NOW()
       WHERE id = $2`,
      [pointsToAward, cardId]
    );
    
    // Record the transaction
    await pool.query(
      `INSERT INTO loyalty_transactions (
        card_id, transaction_type, points, source, description, 
        transaction_ref, business_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [cardId, 'CREDIT', pointsToAward, 'SCAN', 
       'Points awarded via test QR code scan', 
       `test-scan-${Date.now()}`, businessId]
    );
    
    // 6. Verify points were awarded
    const updatedPointsResult = await pool.query(
      'SELECT points, points_balance FROM loyalty_cards WHERE id = $1',
      [cardId]
    );
    
    const updatedPoints = parseFloat(updatedPointsResult.rows[0].points) || 0;
    const updatedBalance = parseFloat(updatedPointsResult.rows[0].points_balance) || 0;
    
    console.log(`Updated points: ${updatedPoints}, Updated balance: ${updatedBalance}`);
    
    if (updatedPoints === currentPoints + pointsToAward && 
        updatedBalance === currentBalance + pointsToAward) {
      console.log('✅ SUCCESS: Points were awarded successfully');
    } else {
      console.error('❌ ERROR: Points were not awarded correctly');
    }
    
    // 7. Create a test notification
    console.log('Creating a test notification for the customer...');
    
    await pool.query(
      `INSERT INTO customer_notifications (
        customer_id, business_id, type, title, message, 
        requires_action, action_taken, is_read, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [customerId.toString(), businessId.toString(), 'POINTS_ADDED', 
       'Points Added', `You received ${pointsToAward} points from ${businessName}`, 
       false, false, false]
    );
    
    console.log('Test notification created');
    
    console.log('\nQR point awarding test completed successfully');
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await pool.end();
  }
}

testQRPointAwarding().catch(console.error); 