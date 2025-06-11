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
    console.log('Checking customer loyalty points...\n');
    
    // Get all customers with their points
    const customerPointsResult = await pool.query(`
      SELECT 
        c.id AS customer_id,
        c.name AS customer_name,
        c.email AS customer_email,
        cp.program_id,
        lp.name AS program_name,
        u.business_name,
        cp.current_points,
        cp.updated_at
      FROM 
        customers c
      JOIN 
        customer_programs cp ON c.id = cp.customer_id
      JOIN 
        loyalty_programs lp ON cp.program_id = lp.id
      JOIN 
        users u ON lp.business_id = u.id
      ORDER BY 
        c.id, cp.current_points DESC
    `);
    
    if (customerPointsResult.rows.length > 0) {
      console.log('Customer loyalty points summary:');
      console.log('===============================\n');
      
      let currentCustomerId = null;
      let totalPoints = 0;
      
      customerPointsResult.rows.forEach((row, index) => {
        if (currentCustomerId !== row.customer_id) {
          // Print total for previous customer
          if (currentCustomerId !== null) {
            console.log(`Total points for customer ${currentCustomerId}: ${totalPoints}\n`);
          }
          
          // Reset for new customer
          currentCustomerId = row.customer_id;
          totalPoints = 0;
          
          console.log(`Customer ${row.customer_id}: ${row.customer_name} (${row.customer_email})`);
        }
        
        totalPoints += row.current_points;
        
        // Print program details
        console.log(`  - ${row.program_name} (${row.business_name}): ${row.current_points} points`);
        console.log(`    Last updated: ${formatDate(row.updated_at)}`);
      });
      
      // Print total for last customer
      console.log(`Total points for customer ${currentCustomerId}: ${totalPoints}\n`);
      
      // Check recent QR scans
      console.log('\nRecent QR Code Scans:');
      console.log('===================\n');
      
      const scanLogsResult = await pool.query(`
        SELECT 
          s.id AS scan_id,
          s.created_at AS scan_date,
          c.name AS customer_name,
          u.business_name,
          s.scan_type,
          s.points_awarded,
          s.success,
          s.error_message
        FROM 
          qr_scan_logs s
        JOIN 
          customers c ON s.customer_id = c.id
        JOIN 
          users u ON s.scanned_by = u.id
        ORDER BY 
          s.created_at DESC
        LIMIT 10
      `);
      
      if (scanLogsResult.rows.length > 0) {
        scanLogsResult.rows.forEach((scan) => {
          console.log(`Scan #${scan.scan_id} - ${formatDate(scan.scan_date)}`);
          console.log(`Customer: ${scan.customer_name}`);
          console.log(`Business: ${scan.business_name}`);
          console.log(`Type: ${scan.scan_type}`);
          console.log(`Points awarded: ${scan.points_awarded}`);
          console.log(`Success: ${scan.success ? 'Yes' : 'No'}`);
          if (scan.error_message) {
            console.log(`Error: ${scan.error_message}`);
          }
          console.log('------------------------');
        });
      } else {
        console.log('No recent QR code scans found.');
      }
    } else {
      console.log('No customer loyalty points found.');
    }
  } catch (error) {
    console.error('Error checking customer points:', error);
  } finally {
    await pool.end();
  }
}

// Helper function to format dates
function formatDate(date) {
  if (!date) return 'N/A';
  
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Run the script
main();