import sql from './src/utils/db';

async function checkTables() {
  try {
    console.log('Checking notification tables...');
    
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('customer_notifications', 'customer_approval_requests', 'customer_notification_preferences')
    `;
    
    console.log('Tables found:', result.map(r => r.table_name));
    
    if (result.length < 3) {
      console.log('Missing tables:', [
        'customer_notifications', 
        'customer_approval_requests', 
        'customer_notification_preferences'
      ].filter(table => !result.map(r => r.table_name).includes(table)));
    }
  } catch (err) {
    console.error('Error checking tables:', err);
  }
}

checkTables(); 