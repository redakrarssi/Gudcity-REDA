import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create database connection
const sql = postgres(process.env.DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
  max: 10
});

async function testRedemptionNotifications() {
  console.log('Testing redemption notifications...');
  
  try {
    // Test parameters
    const customerId = '27';
    const businessId = '3';
    const programId = '11';
    const points = 50;
    const reward = 'Free Coffee';
    const rewardId = '123';
    
    console.log(`Test parameters: Customer ID ${customerId}, Business ID ${businessId}, Program ID ${programId}, Points ${points}, Reward: ${reward}`);
    
    // Step 1: Verify the customer exists
    console.log('\n1. Verifying customer exists...');
    const customerCheck = await sql`
      SELECT id, name, email FROM users 
      WHERE id = ${customerId} AND user_type = 'customer'
    `;
    
    if (!customerCheck.length) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }
    
    const customerName = customerCheck[0].name || 'Customer';
    console.log(`✅ Customer found: ${customerName} (${customerCheck[0].email})`);
    
    // Step 2: Verify the business exists
    console.log('\n2. Verifying business exists...');
    const businessCheck = await sql`
      SELECT id, name FROM users 
      WHERE id = ${businessId} AND user_type = 'business'
    `;
    
    if (!businessCheck.length) {
      throw new Error(`Business with ID ${businessId} not found`);
    }
    
    const businessName = businessCheck[0].name || 'Business';
    console.log(`✅ Business found: ${businessName}`);
    
    // Step 3: Verify the program exists
    console.log('\n3. Verifying program exists...');
    const programCheck = await sql`
      SELECT id, name, business_id FROM loyalty_programs 
      WHERE id = ${programId}
    `;
    
    if (!programCheck.length) {
      throw new Error(`Program with ID ${programId} not found`);
    }
    
    const programName = programCheck[0].name || 'Loyalty Program';
    console.log(`✅ Program found: ${programName}`);
    
    // Step 4: Create redemption notification table if it doesn't exist
    console.log('\n4. Ensuring redemption_notifications table exists...');
    await sql`
      CREATE TABLE IF NOT EXISTS redemption_notifications (
        id SERIAL PRIMARY KEY,
        customer_id VARCHAR(255) NOT NULL,
        business_id VARCHAR(255) NOT NULL,
        program_id VARCHAR(255) NOT NULL,
        points INTEGER NOT NULL,
        reward TEXT NOT NULL,
        reward_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'PENDING',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Table exists or was created');
    
    // Step 5: Create a redemption notification
    console.log('\n5. Creating redemption notification...');
    const notificationResult = await sql`
      INSERT INTO redemption_notifications (
        customer_id,
        business_id,
        program_id,
        points,
        reward,
        reward_id,
        created_at
      ) VALUES (
        ${customerId},
        ${businessId},
        ${programId},
        ${points},
        ${reward},
        ${rewardId},
        NOW()
      ) RETURNING id
    `;
    
    if (!notificationResult.length) {
      throw new Error('Failed to create redemption notification');
    }
    
    const notificationId = notificationResult[0].id;
    console.log(`✅ Redemption notification created with ID: ${notificationId}`);
    
    // Step 6: Create a notification for the business owner
    console.log('\n6. Creating business notification...');
    await sql`
      INSERT INTO customer_notifications (
        customer_id,
        business_id,
        type,
        title,
        message,
        requires_action,
        is_read,
        created_at,
        data
      ) VALUES (
        ${businessId},
        ${businessId},
        'REDEMPTION_REQUEST',
        'New Redemption Request',
        ${`${customerName} redeemed ${points} points for ${reward}`},
        TRUE,
        FALSE,
        NOW(),
        ${JSON.stringify({
          notificationId,
          customerId,
          programId,
          points,
          reward
        })}
      )
    `;
    
    console.log('✅ Business notification created');
    
    // Step 7: Verify the notification was created
    console.log('\n7. Verifying redemption notification...');
    const verifyNotification = await sql`
      SELECT * FROM redemption_notifications
      WHERE id = ${notificationId}
    `;
    
    if (!verifyNotification.length) {
      throw new Error('Redemption notification not found after creation');
    }
    
    console.log('✅ Redemption notification verified');
    console.log('\nNotification details:');
    console.log(`- Customer: ${customerName} (ID: ${customerId})`);
    console.log(`- Business: ${businessName} (ID: ${businessId})`);
    console.log(`- Program: ${programName} (ID: ${programId})`);
    console.log(`- Points: ${points}`);
    console.log(`- Reward: ${reward}`);
    console.log(`- Status: ${verifyNotification[0].status}`);
    
    console.log('\nTest completed successfully! ✅');
    
    // Return diagnostic information
    return {
      success: true,
      notificationId,
      customerId,
      businessId,
      programId,
      points,
      reward,
      message: 'Redemption notification created successfully'
    };
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    // Return error information
    return {
      success: false,
      error: error.message
    };
  } finally {
    // Close the database connection
    await sql.end();
  }
}

// Run the test
testRedemptionNotifications()
  .then(result => {
    console.log('\nDiagnostic Information:');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }); 