import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Get the database URL from environment variables or use fallback
const DATABASE_URL = process.env.VITE_DATABASE_URL || "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
  // Create a database connection pool
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: true
  });
  
  try {
    // Check if qr_scan_logs table exists
    const tableExists = await checkTableExists(pool, 'qr_scan_logs');
    console.log(`QR scan logs table exists: ${tableExists}`);
    
    if (tableExists) {
      // Get columns from qr_scan_logs table
      const columnsResult = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'qr_scan_logs'
        ORDER BY ordinal_position
      `);
      
      if (columnsResult.rows.length > 0) {
        console.log('Columns in qr_scan_logs table:');
        columnsResult.rows.forEach(row => {
          console.log(`- ${row.column_name} (${row.data_type})`);
        });
      } else {
        console.log('No columns found for qr_scan_logs table.');
      }
    } else {
      // Get all tables in the database to help debug
      const tablesResult = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      console.log('All tables in database:');
      tablesResult.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
      
      // Check if there's any similar table for qr codes or scanning
      const qrRelatedTables = tablesResult.rows
        .filter(row => row.table_name.includes('qr') || row.table_name.includes('scan'))
        .map(row => row.table_name);
        
      if (qrRelatedTables.length > 0) {
        console.log('QR-related tables found:');
        qrRelatedTables.forEach(table => {
          console.log(`- ${table}`);
        });
      }
    }
  } catch (error) {
    console.error('Error checking qr_scan_logs schema:', error);
  } finally {
    await pool.end();
  }
}

// Helper function to check if a table exists
async function checkTableExists(pool, tableName) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name = $1
    )
  `, [tableName]);
  
  return result.rows[0].exists;
}

// Run the script
main(); 