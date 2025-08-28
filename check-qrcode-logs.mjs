import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';

// Database connection
const DATABASE_URL = "process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || """;
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    console.log('Checking QR code scan logs...');
    
    // Check if the table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'qr_scan_logs'
      ) as exists
    `);
    
    if (!tableExists.rows[0]?.exists) {
      console.log('QR code scan logs table does not exist!');
      return;
    }
    
    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM qr_scan_logs');
    console.log(`Found ${countResult.rows[0].count} QR code scan logs`);
    
    // Get sample logs
    const logsResult = await pool.query(`
      SELECT 
        q.*, 
        u.business_name
      FROM qr_scan_logs q
      LEFT JOIN users u ON q.scanned_by = u.id
      ORDER BY q.created_at DESC
      LIMIT 5
    `);
    
    console.log('\nSample QR code scan logs:');
    logsResult.rows.forEach(log => {
      const scanData = JSON.parse(log.scanned_data);
      console.log(`- ID: ${log.id}, Type: ${log.scan_type}, Scanned by: ${log.business_name || log.scanned_by}`);
      console.log(`  Customer ID: ${log.customer_id || 'N/A'}`);
      console.log(`  Success: ${log.success ? 'Yes' : 'No'}${log.error_message ? `, Error: ${log.error_message}` : ''}`);
      console.log(`  Data: ${JSON.stringify(scanData).substring(0, 100)}${JSON.stringify(scanData).length > 100 ? '...' : ''}`);
      console.log(`  Created: ${new Date(log.created_at).toLocaleString()}`);
      console.log('');
    });
    
    // Get stats by type
    const statsResult = await pool.query(`
      SELECT 
        scan_type,
        COUNT(*) as count,
        SUM(CASE WHEN success = TRUE THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN success = FALSE THEN 1 ELSE 0 END) as failed
      FROM qr_scan_logs
      GROUP BY scan_type
    `);
    
    console.log('Stats by scan type:');
    statsResult.rows.forEach(stat => {
      console.log(`- ${stat.scan_type}: ${stat.count} total (${stat.successful} successful, ${stat.failed} failed)`);
    });
    
  } catch (error) {
    console.error('Error checking QR code scan logs:', error);
  } finally {
    await pool.end();
  }
}

main(); 