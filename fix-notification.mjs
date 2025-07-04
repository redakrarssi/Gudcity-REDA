//
Fix
Enrollment
Notification
Script

import sql from './src/utils/db.js';

async function main() {
  try {
    console.log('Fixing enrollment notification system...');
    
    // Create customer_notifications table
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
        reference_id VARCHAR(255),
        requires_action BOOLEAN DEFAULT FALSE,
        action_taken BOOLEAN DEFAULT FALSE,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        read_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE
      )
    `;
    
    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer_id 
      ON customer_notifications(customer_id)
    `;
    
    // Create customer_approval_requests table
    console.log('Creating customer_approval_requests table...');
    await sql`
      CREATE TABLE IF NOT EXISTS customer_approval_requests (
        id UUID PRIMARY KEY,
        notification_id UUID REFERENCES customer_notifications(id) ON DELETE CASCADE,
        customer_id INTEGER NOT NULL,
        business_id INTEGER NOT NULL,
        request_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING',
        data JSONB,
        requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        response_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE
      )
    `;
    
    // Create customer_notification_preferences table
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
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    console.log('✅ Enrollment notification system fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing enrollment notification system:', error);
  }
}

// Run the main function
main();
