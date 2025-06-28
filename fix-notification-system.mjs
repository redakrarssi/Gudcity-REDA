// Fix Notification System
// This script sets up the required tables for the notification system

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get database URL from environment
const DATABASE_URL = process.env.VITE_DATABASE_URL;
console.log("Database URL found:", DATABASE_URL ? "Yes" : "No");

// Create database connection
const sql = neon(DATABASE_URL);

// Function to create the notification tables directly
async function setupNotificationTables() {
  try {
    console.log('Setting up notification tables...');
    
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
    
    // Create indexes for customer_notifications
    console.log('Creating indexes for customer_notifications...');
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer_id ON customer_notifications(customer_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_notifications_business_id ON customer_notifications(business_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_notifications_type ON customer_notifications(type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_notifications_requires_action ON customer_notifications(requires_action) WHERE requires_action = TRUE`;
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_notifications_is_read ON customer_notifications(is_read) WHERE is_read = FALSE`;
    
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
        status VARCHAR(50) DEFAULT 'PENDING',
        data JSONB,
        requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        response_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
      )
    `;
    
    // Create indexes for customer_approval_requests
    console.log('Creating indexes for customer_approval_requests...');
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_approval_requests_customer_id ON customer_approval_requests(customer_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_approval_requests_business_id ON customer_approval_requests(business_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_approval_requests_notification_id ON customer_approval_requests(notification_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_approval_requests_status ON customer_approval_requests(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_customer_approval_requests_expires_at ON customer_approval_requests(expires_at)`;
    
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
    
    // Create view for pending approval requests
    console.log('Creating pending_approval_requests view...');
    try {
      await sql`
        CREATE OR REPLACE VIEW pending_approval_requests AS
        SELECT 
          ar.id,
          ar.customer_id,
          ar.business_id,
          ar.request_type,
          ar.entity_id,
          ar.data,
          ar.requested_at,
          ar.expires_at,
          b.name as business_name,
          c.first_name || ' ' || c.last_name as customer_name
        FROM customer_approval_requests ar
        JOIN users b ON ar.business_id = b.id
        JOIN customers c ON ar.customer_id = c.id
        WHERE ar.status = 'PENDING' AND ar.expires_at > CURRENT_TIMESTAMP
      `;
    } catch (viewError) {
      console.log('Note: Could not create view, might be missing required tables:', viewError.message);
    }
    
    // Verify tables were created
    console.log('Verifying tables were created...');
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('customer_notifications', 'customer_approval_requests', 'customer_notification_preferences')
    `;
    
    console.log('Tables created:', result.map(r => r.table_name));
    
    if (result.length < 3) {
      console.log('Warning: Some tables may not have been created properly.');
      console.log('Missing tables:', [
        'customer_notifications', 
        'customer_approval_requests', 
        'customer_notification_preferences'
      ].filter(table => !result.map(r => r.table_name).includes(table)));
    } else {
      console.log('All notification tables created successfully!');
    }
  } catch (err) {
    console.error('Error setting up notification tables:', err);
  }
}

setupNotificationTables();