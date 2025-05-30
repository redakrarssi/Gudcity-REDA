import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { Pool } from '@neondatabase/serverless';

// Database connection
const DATABASE_URL = "postgres://neondb_owner:npg_rpc6Nh5oKGzt@ep-rough-violet-a22uoev9-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    console.log('Checking if business dashboard data is retrievable from database...');

    // Get business users 
    const usersResult = await pool.query(`
      SELECT id, name, business_name 
      FROM users
      WHERE user_type = 'business'
      LIMIT 1
    `);
    
    if (usersResult.rows.length === 0) {
      console.error('No business users found in the database.');
      return;
    }

    const businessUser = usersResult.rows[0];
    console.log(`Testing with business: ${businessUser.business_name} (ID: ${businessUser.id})`);

    // Check if business_analytics table has data for this user
    const analyticsResult = await pool.query(`
      SELECT * FROM business_analytics 
      WHERE business_id = $1
      LIMIT 1
    `, [businessUser.id]);

    if (analyticsResult.rows.length === 0) {
      console.error(`No analytics data found for business ID ${businessUser.id}`);
      console.log('Running setup-analytics-schema.mjs might help generate sample data.');
      return;
    }

    console.log('✅ Found business analytics data');

    // Check if program_analytics table has data for this user
    const programResult = await pool.query(`
      SELECT * FROM program_analytics 
      WHERE business_id = $1
      LIMIT 1
    `, [businessUser.id]);

    if (programResult.rows.length === 0) {
      console.log(`⚠️ No program analytics data found for business ID ${businessUser.id}`);
    } else {
      console.log('✅ Found program analytics data');
    }

    // Check if customer_segments table has data for this user
    const segmentResult = await pool.query(`
      SELECT * FROM customer_segments 
      WHERE business_id = $1
      LIMIT 1
    `, [businessUser.id]);

    if (segmentResult.rows.length === 0) {
      console.log(`⚠️ No customer segment data found for business ID ${businessUser.id}`);
    } else {
      console.log('✅ Found customer segment data');
    }

    // Check if top_products table has data for this user
    const productsResult = await pool.query(`
      SELECT * FROM top_products 
      WHERE business_id = $1
      LIMIT 1
    `, [businessUser.id]);

    if (productsResult.rows.length === 0) {
      console.log(`⚠️ No top products data found for business ID ${businessUser.id}`);
    } else {
      console.log('✅ Found top products data');
    }

    // Print some sample data that would be used in dashboard
    console.log('\n📊 Sample Dashboard Data');
    
    if (analyticsResult.rows.length > 0) {
      const analytics = analyticsResult.rows[0];
      console.log(`Active Customers: ${analytics.active_customers}`);
      console.log(`Churn Rate: ${(analytics.churn_rate * 100).toFixed(1)}%`);
      console.log(`Repeat Visit Rate: ${(analytics.repeat_visit_rate * 100).toFixed(1)}%`);
      console.log(`Revenue: $${analytics.total_revenue.toLocaleString()}`);
      console.log(`Revenue Growth: ${(analytics.revenue_growth * 100).toFixed(1)}%`);
    }

    if (programResult.rows.length > 0) {
      const program = programResult.rows[0];
      console.log(`\nTop Program: ${program.program_name}`);
      console.log(`Active Customers: ${program.active_customers}`);
      console.log(`Redemption Rate: ${(program.redemption_rate * 100).toFixed(1)}%`);
    }

    console.log('\n✅ Verification complete! The dashboard should be able to fetch this data.');

  } catch (error) {
    console.error('Error checking dashboard data:', error);
  } finally {
    await pool.end();
  }
}

main(); 