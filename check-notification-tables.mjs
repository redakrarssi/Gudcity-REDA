import postgres from 'postgres';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create database connection
const sql = postgres(process.env.DATABASE_URL, {
  ssl: { rejectUnauthorized: false },
  max: 10
});

async function checkNotificationTables() {
  console.log('Checking notification tables...');
  
  try {
    // Check if table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'customer_notifications'
      );
    `;
    
    if (!tableExists[0].exists) {
      console.error('❌ customer_notifications table does not exist!');
      return false;
    }
    
    console.log('✅ customer_notifications table exists');
    
    // Get table schema
    const tableColumns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customer_notifications';
    `;
    
    console.log('Table structure:');
    tableColumns.forEach(col => {
      console.log(`${col.column_name} (${col.data_type})`);
    });
    
    // Check if we can query the table
    const testQuery = await sql`
      SELECT COUNT(*) FROM customer_notifications;
    `;
    
    console.log(`Total notifications in table: ${testQuery[0].count}`);
    
    return true;
  } catch (error) {
    console.error('Error checking notification tables:', error);
    return false;
  } finally {
    await sql.end();
  }
}

// Run the function
checkNotificationTables()
  .then(success => {
    if (success) {
      console.log('Notification tables check completed successfully');
    } else {
      console.error('Notification tables check failed');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  }); 