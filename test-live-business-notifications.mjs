#!/usr/bin/env node

/**
 * Live test of business notification system
 * Tests both creation and retrieval of business notifications
 */

import postgres from 'postgres';

const sql = postgres("process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || """);

async function testBusinessNotificationSystem() {
  console.log('🧪 LIVE TESTING BUSINESS NOTIFICATION SYSTEM...\n');
  
  try {
    // 1. Get business user info
    const businesses = await sql`
      SELECT id, name, email FROM users 
      WHERE role = 'business' 
      ORDER BY id DESC 
      LIMIT 1
    `;
    
    if (businesses.length === 0) {
      console.log('❌ No business user found');
      return;
    }
    
    const business = businesses[0];
    console.log(`📋 Testing with business: ${business.name} (ID: ${business.id})`);
    
    // 2. Check if redemption_notifications table exists
    console.log('\n🔍 Checking redemption_notifications table...');
    
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'redemption_notifications'
      );
    `;
    
    console.log('Table exists:', tableExists[0].exists);
    
    if (!tableExists[0].exists) {
      console.log('❌ redemption_notifications table does not exist! Creating it...');
      
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
      
      console.log('✅ Table created successfully');
    }
    
    // 3. Check existing notifications for this business
    console.log('\n📋 Checking existing notifications...');
    
    const existingNotifications = await sql`
      SELECT 
        rn.id,
        rn.customer_id,
        rn.business_id,
        rn.program_id,
        rn.points,
        rn.reward,
        rn.status,
        rn.created_at
      FROM redemption_notifications rn
      WHERE rn.business_id = ${business.id.toString()}
      ORDER BY rn.created_at DESC
      LIMIT 10
    `;
    
    console.log(`Found ${existingNotifications.length} existing notifications for business ${business.id}`);
    existingNotifications.forEach((notification, index) => {
      console.log(`  ${index + 1}. ${notification.reward} - ${notification.status} - ${notification.created_at}`);
    });
    
    // 4. Create a test notification
    console.log('\n🎯 Creating test business notification...');
    
    const testNotificationData = {
      customerId: '4', // Use existing customer
      customerName: 'Test Customer',
      businessId: business.id.toString(),
      programId: '1', // Use existing program
      programName: 'Test Program',
      points: 50,
      reward: 'Test Redemption Notification',
      rewardId: 'test-reward'
    };
    
    // Create notification using the same logic as the service
    const result = await sql`
      INSERT INTO redemption_notifications (
        customer_id,
        business_id,
        program_id,
        points,
        reward,
        reward_id,
        created_at
      ) VALUES (
        ${testNotificationData.customerId},
        ${testNotificationData.businessId},
        ${testNotificationData.programId},
        ${testNotificationData.points},
        ${testNotificationData.reward},
        ${testNotificationData.rewardId},
        NOW()
      ) RETURNING id
    `;
    
    const notificationId = result[0].id.toString();
    console.log('✅ Test notification created with ID:', notificationId);
    
    // 5. Test fetching business notifications (same logic as getBusinessRedemptionNotifications)
    console.log('\n📱 Testing business notification retrieval...');
    
    const fetchedNotifications = await sql`
      SELECT 
        rn.id,
        rn.customer_id,
        u.name as customer_name,
        rn.business_id,
        rn.program_id,
        lp.name as program_name,
        rn.points,
        rn.reward,
        rn.reward_id,
        rn.created_at as timestamp,
        rn.status,
        rn.is_read
      FROM redemption_notifications rn
      LEFT JOIN users u ON rn.customer_id::INTEGER = u.id
      LEFT JOIN loyalty_programs lp ON rn.program_id::INTEGER = lp.id
      WHERE rn.business_id = ${business.id.toString()}
      ORDER BY rn.created_at DESC
      LIMIT 10
    `;
    
    console.log(`📋 Retrieved ${fetchedNotifications.length} notifications:`);
    
    fetchedNotifications.forEach((notification, index) => {
      console.log(`  ${index + 1}. ID: ${notification.id}`);
      console.log(`     Customer: ${notification.customer_name || 'Unknown'}`);
      console.log(`     Program: ${notification.program_name || 'Unknown'}`);
      console.log(`     Reward: ${notification.reward}`);
      console.log(`     Points: ${notification.points}`);
      console.log(`     Status: ${notification.status}`);
      console.log(`     Created: ${notification.timestamp}`);
      console.log('');
    });
    
    // 6. Test with exact business ID types that UI uses
    console.log('\n🔍 Testing with different business ID formats...');
    
    // Test with number
    const numericTest = await sql`
      SELECT COUNT(*) as count FROM redemption_notifications 
      WHERE business_id = ${business.id}
    `;
    console.log(`With numeric business ID (${business.id}): ${numericTest[0].count} notifications`);
    
    // Test with string
    const stringTest = await sql`
      SELECT COUNT(*) as count FROM redemption_notifications 
      WHERE business_id = ${business.id.toString()}
    `;
    console.log(`With string business ID (${business.id.toString()}): ${stringTest[0].count} notifications`);
    
    // 7. Verify table structure
    console.log('\n🏗️ Checking table structure...');
    
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'redemption_notifications'
      ORDER BY ordinal_position
    `;
    
    console.log('Table structure:');
    tableInfo.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    console.log('\n🎉 BUSINESS NOTIFICATION SYSTEM TEST COMPLETE!');
    console.log('\n📊 SUMMARY:');
    console.log(`✅ Table exists: ${tableExists[0].exists}`);
    console.log(`✅ Test notification created: ${notificationId}`);
    console.log(`✅ Retrieved ${fetchedNotifications.length} notifications`);
    console.log(`✅ Business ID: ${business.id} (${typeof business.id})`);
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Check browser console during redemption');
    console.log('2. Verify business ID matches exactly');
    console.log('3. Test real-time events');
    console.log('4. Check React Context refresh mechanism');

  } catch (error) {
    console.error('🚨 Test failed:', error);
  } finally {
    await sql.end();
  }
}

testBusinessNotificationSystem().catch(console.error);