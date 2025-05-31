import sql from './db';
import { ensureUserTableExists, ensureDemoUsers } from '../services/userService';
import { ensureBusinessTablesExist } from '../services/businessService';
import { ensureApprovalTableExists } from '../services/approvalService';
import { ensureSystemLogsTableExists } from '../services/dashboardService';
import { ensurePagesTableExists } from '../services/pageService';

// Initialize the database and ensure all tables and seed data exist
export async function initializeDatabase(): Promise<void> {
  console.log('🔧 Initializing database...');
  
  try {
    // Test database connection
    const result = await sql`SELECT NOW() as time`;
    console.log('✅ Database connection successful:', result[0].time);
    
    try {
      // Ensure users table exists
      console.log('Creating users table...');
      await ensureUserTableExists();
      console.log('✅ Users table initialized');
    } catch (err) {
      console.error('❌ Error creating users table:', err);
    }
    
    try {
      // Ensure business tables exist
      console.log('Creating business tables...');
      await ensureBusinessTablesExist();
      console.log('✅ Business tables initialized');
    } catch (err) {
      console.error('❌ Error creating business tables:', err);
    }
    
    try {
      // Ensure demo users exist
      console.log('Creating demo users...');
      await ensureDemoUsers();
      console.log('✅ Demo users initialized');
    } catch (err) {
      console.error('❌ Error creating demo users:', err);
    }
    
    try {
      // Ensure approval table exists
      console.log('Creating approval tables...');
      await ensureApprovalTableExists();
      console.log('✅ Approval tables initialized');
    } catch (err) {
      console.error('❌ Error creating approval tables:', err);
    }
    
    try {
      // Ensure system logs table exists
      console.log('Creating system logs table...');
      await ensureSystemLogsTableExists();
      console.log('✅ System logs table initialized');
    } catch (err) {
      console.error('❌ Error creating system logs table:', err);
    }
    
    try {
      // Ensure pages table exists
      console.log('Creating pages table...');
      await ensurePagesTableExists();
      console.log('✅ Pages table initialized');
    } catch (err) {
      console.error('❌ Error creating pages table:', err);
    }
    
    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Unknown error type:', error);
    }
  }
}

// Export a function to call on app startup
export default function initDb(): void {
  // Call the async function without waiting for it
  initializeDatabase().catch(err => {
    console.error('Failed to initialize database:', err);
  });
} 