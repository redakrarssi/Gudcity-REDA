import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import fs from 'fs';
import { Pool } from '@neondatabase/serverless';

// Database connection
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ SECURITY ERROR: DATABASE_URL environment variable is required');
  console.error('Please set DATABASE_URL or VITE_DATABASE_URL in your environment');
  console.error('Copy env.example to .env and configure with your database credentials');
  process.exit(1);
}
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
});

async function main() {
  try {
    console.log('Setting up analytics schema...');

    // Read and execute the schema SQL file
    const schemaSql = fs.readFileSync('./db/analytics_schema.sql', 'utf-8');
    await pool.query(schemaSql);
    
    console.log('Analytics schema created successfully!');
    
    // Get business users to populate analytics data
    const usersResult = await pool.query(`
      SELECT id, name, business_name 
      FROM users
      WHERE user_type = 'business'
    `);
    
    const businessUsers = usersResult.rows;
    console.log(`Found ${businessUsers.length} business users for analytics data`);
    
    if (businessUsers.length === 0) {
      console.log('No business users found. Please create some business users first.');
      return;
    }
    
    // Generate sample analytics data for businesses
    await generateSampleBusinessAnalytics(businessUsers);
    await generateSampleProgramAnalytics(businessUsers);
    await generateSampleCustomerSegments(businessUsers);
    await generateSampleTopProducts(businessUsers);
    
    // Generate platform-wide analytics
    await generatePlatformAnalytics();
    await generateRegionalAnalytics();
    await generateUserEngagement();
    await generateFeatureInteractions();
    await generateRetentionData();
    
    // Display some sample data
    await displaySampleAnalyticsData();
    
    console.log('Analytics setup complete! ✅');
  } catch (error) {
    console.error('Error setting up analytics schema:', error);
  } finally {
    await pool.end();
  }
}

// Generate sample business analytics
async function generateSampleBusinessAnalytics(businesses) {
  console.log('Generating business analytics data...');
  
  // Define period ranges
  const periods = [
    { type: 'day', start: new Date(Date.now() - 86400000), end: new Date() },
    { type: 'week', start: new Date(Date.now() - 7 * 86400000), end: new Date() },
    { type: 'month', start: new Date(Date.now() - 30 * 86400000), end: new Date() },
    { type: 'year', start: new Date(Date.now() - 365 * 86400000), end: new Date() }
  ];
  
  for (const business of businesses) {
    for (const period of periods) {
      // Random values for each business and period
      const activeCustomers = Math.floor(Math.random() * 1000) + 100;
      const churnRate = Math.random() * 0.1;
      const repeatVisitRate = 0.5 + Math.random() * 0.4;
      const avgVisitFrequency = 1 + Math.random() * 4;
      const customerLifetimeValue = 100 + Math.random() * 400;
      const totalRevenue = customerLifetimeValue * activeCustomers * 0.3;
      const revenueGrowth = -0.05 + Math.random() * 0.3;
      const avgOrderValue = 10 + Math.random() * 50;
      const transactions = Math.floor(activeCustomers * avgVisitFrequency);
      const redemptions = Math.floor(transactions * 0.2);
      
      try {
        // Insert or update business analytics
        await pool.query(`
          INSERT INTO business_analytics (
            business_id,
            period_type,
            period_start,
            period_end,
            active_customers,
            churn_rate,
            repeat_visit_rate,
            avg_visit_frequency,
            customer_lifetime_value,
            total_revenue,
            revenue_growth,
            avg_order_value,
            transactions,
            redemptions
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (business_id, period_type, period_start) 
          DO UPDATE SET
            period_end = EXCLUDED.period_end,
            active_customers = EXCLUDED.active_customers,
            churn_rate = EXCLUDED.churn_rate,
            repeat_visit_rate = EXCLUDED.repeat_visit_rate,
            avg_visit_frequency = EXCLUDED.avg_visit_frequency,
            customer_lifetime_value = EXCLUDED.customer_lifetime_value,
            total_revenue = EXCLUDED.total_revenue,
            revenue_growth = EXCLUDED.revenue_growth,
            avg_order_value = EXCLUDED.avg_order_value,
            transactions = EXCLUDED.transactions,
            redemptions = EXCLUDED.redemptions,
            updated_at = CURRENT_TIMESTAMP
        `, [
          business.id,
          period.type,
          period.start,
          period.end,
          activeCustomers,
          churnRate,
          repeatVisitRate,
          avgVisitFrequency,
          customerLifetimeValue,
          totalRevenue,
          revenueGrowth,
          avgOrderValue,
          transactions,
          redemptions
        ]);
      } catch (error) {
        console.error(`Error generating business analytics for business ID ${business.id}:`, error);
      }
    }
  }
  
  console.log(`Generated analytics data for ${businesses.length} businesses`);
}

// Generate sample program analytics
async function generateSampleProgramAnalytics(businesses) {
  console.log('Generating program analytics data...');
  
  // Define period ranges
  const periods = [
    { type: 'month', start: new Date(Date.now() - 30 * 86400000), end: new Date() }
  ];
  
  // Sample program names
  const programNames = [
    'Coffee Rewards', 
    'Lunch Specials', 
    'Weekend Deals',
    'Birthday Bonuses',
    'Loyalty Points'
  ];
  
  for (const business of businesses) {
    // Generate 1-3 programs per business
    const numPrograms = 1 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < numPrograms; i++) {
      const programId = `prog_${business.id}_${i + 1}`;
      const programName = programNames[Math.floor(Math.random() * programNames.length)];
      
      for (const period of periods) {
        // Random values for each program and period
        const totalCustomers = Math.floor(Math.random() * 800) + 100;
        const activeCustomers = Math.floor(totalCustomers * (0.5 + Math.random() * 0.4));
        const pointsIssued = Math.floor(activeCustomers * (50 + Math.random() * 150));
        const pointsRedeemed = Math.floor(pointsIssued * (0.2 + Math.random() * 0.3));
        const redemptionRate = pointsRedeemed / pointsIssued;
        const avgTransactionValue = 10 + Math.random() * 40;
        const revenue = activeCustomers * avgTransactionValue * (1 + Math.random() * 2);
        
        try {
          // Insert or update program analytics
          await pool.query(`
            INSERT INTO program_analytics (
              program_id,
              business_id,
              period_type,
              period_start,
              period_end,
              program_name,
              total_customers,
              active_customers,
              points_issued,
              points_redeemed,
              redemption_rate,
              avg_transaction_value,
              revenue
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (program_id, period_type, period_start) 
            DO UPDATE SET
              period_end = EXCLUDED.period_end,
              program_name = EXCLUDED.program_name,
              total_customers = EXCLUDED.total_customers,
              active_customers = EXCLUDED.active_customers,
              points_issued = EXCLUDED.points_issued,
              points_redeemed = EXCLUDED.points_redeemed,
              redemption_rate = EXCLUDED.redemption_rate,
              avg_transaction_value = EXCLUDED.avg_transaction_value,
              revenue = EXCLUDED.revenue,
              updated_at = CURRENT_TIMESTAMP
          `, [
            programId,
            business.id,
            period.type,
            period.start,
            period.end,
            programName,
            totalCustomers,
            activeCustomers,
            pointsIssued,
            pointsRedeemed,
            redemptionRate,
            avgTransactionValue,
            revenue
          ]);
        } catch (error) {
          console.error(`Error generating program analytics for business ID ${business.id}, program ${programId}:`, error);
        }
      }
    }
  }
  
  console.log('Program analytics data generated successfully!');
}

// Generate sample customer segments
async function generateSampleCustomerSegments(businesses) {
  console.log('Generating customer segment data...');
  
  // Define segments
  const segments = [
    { name: 'Frequent', loyaltyMin: 7.0, loyaltyMax: 10.0, spendMin: 50, spendMax: 100, freqMin: 3.0, freqMax: 6.0 },
    { name: 'Regular', loyaltyMin: 5.0, loyaltyMax: 7.0, spendMin: 30, spendMax: 60, freqMin: 1.5, freqMax: 3.0 },
    { name: 'Occasional', loyaltyMin: 3.0, loyaltyMax: 5.0, spendMin: 15, spendMax: 40, freqMin: 0.5, freqMax: 1.5 },
    { name: 'New', loyaltyMin: 1.0, loyaltyMax: 3.0, spendMin: 10, spendMax: 30, freqMin: 0.1, freqMax: 0.8 }
  ];
  
  // Define period
  const period = { 
    type: 'month', 
    start: new Date(Date.now() - 30 * 86400000), 
    end: new Date() 
  };
  
  for (const business of businesses) {
    // Calculate total customer base (roughly 500-2000)
    const totalCustomers = 500 + Math.floor(Math.random() * 1500);
    let remainingCustomers = totalCustomers;
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      // Last segment gets all remaining customers
      let segmentSize;
      if (i === segments.length - 1) {
        segmentSize = remainingCustomers;
      } else {
        // Allocate based on segment (frequent: 10-20%, regular: 20-40%, occasional: 30-50%, new: remainder)
        const portionRanges = [0.15, 0.3, 0.4, 0.15];
        segmentSize = Math.floor(totalCustomers * (portionRanges[i] + (Math.random() * 0.1 - 0.05)));
        if (segmentSize > remainingCustomers) segmentSize = remainingCustomers;
      }
      
      remainingCustomers -= segmentSize;
      
      // Generate random values within segment ranges
      const avgSpend = segment.spendMin + Math.random() * (segment.spendMax - segment.spendMin);
      const visitFrequency = segment.freqMin + Math.random() * (segment.freqMax - segment.freqMin);
      const loyaltyScore = segment.loyaltyMin + Math.random() * (segment.loyaltyMax - segment.loyaltyMin);
      
      try {
        // Insert or update customer segment
        await pool.query(`
          INSERT INTO customer_segments (
            business_id,
            segment_name,
            segment_size,
            avg_spend,
            visit_frequency,
            loyalty_score,
            period_type,
            period_start,
            period_end
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (business_id, segment_name, period_type, period_start) 
          DO UPDATE SET
            period_end = EXCLUDED.period_end,
            segment_size = EXCLUDED.segment_size,
            avg_spend = EXCLUDED.avg_spend,
            visit_frequency = EXCLUDED.visit_frequency,
            loyalty_score = EXCLUDED.loyalty_score,
            updated_at = CURRENT_TIMESTAMP
        `, [
          business.id,
          segment.name,
          segmentSize,
          avgSpend,
          visitFrequency,
          loyaltyScore,
          period.type,
          period.start,
          period.end
        ]);
      } catch (error) {
        console.error(`Error generating customer segment for business ID ${business.id}, segment ${segment.name}:`, error);
      }
    }
  }
  
  console.log('Customer segment data generated successfully!');
}

// Generate sample top products
async function generateSampleTopProducts(businesses) {
  console.log('Generating top products data...');
  
  // Sample product names by business type (assuming names are indicative)
  const coffeeProducts = ['Espresso', 'Cappuccino', 'Latte', 'Cold Brew', 'Mocha', 'Pastry', 'Sandwich'];
  const restaurantProducts = ['Burger', 'Pizza', 'Salad', 'Pasta', 'Steak', 'Dessert', 'Appetizer'];
  const retailProducts = ['T-shirt', 'Jeans', 'Jacket', 'Shoes', 'Accessories', 'Dress', 'Hat'];
  
  // Define period
  const period = { 
    type: 'month', 
    start: new Date(Date.now() - 30 * 86400000), 
    end: new Date() 
  };
  
  for (const business of businesses) {
    // Determine business type based on name for demo purposes
    let productList;
    if (business.business_name && business.business_name.toLowerCase().includes('coffee')) {
      productList = coffeeProducts;
    } else if (business.business_name && 
              (business.business_name.toLowerCase().includes('restaurant') || 
               business.business_name.toLowerCase().includes('food'))) {
      productList = restaurantProducts;
    } else {
      productList = retailProducts;
    }
    
    // Generate 3-5 top products
    const numProducts = 3 + Math.floor(Math.random() * 3);
    const shuffledProducts = [...productList].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < Math.min(numProducts, shuffledProducts.length); i++) {
      const productName = shuffledProducts[i];
      
      // Random values for each product
      const quantity = 50 + Math.floor(Math.random() * 500);
      const revenue = quantity * (5 + Math.random() * 20);
      
      try {
        // Insert or update top product
        await pool.query(`
          INSERT INTO top_products (
            business_id,
            product_name,
            revenue,
            quantity,
            period_type,
            period_start,
            period_end
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (business_id, product_name, period_type, period_start) 
          DO UPDATE SET
            period_end = EXCLUDED.period_end,
            revenue = EXCLUDED.revenue,
            quantity = EXCLUDED.quantity,
            updated_at = CURRENT_TIMESTAMP
        `, [
          business.id,
          productName,
          revenue,
          quantity,
          period.type,
          period.start,
          period.end
        ]);
      } catch (error) {
        console.error(`Error generating top product for business ID ${business.id}, product ${productName}:`, error);
      }
    }
  }
  
  console.log('Top products data generated successfully!');
}

// Generate platform analytics
async function generatePlatformAnalytics() {
  console.log('Generating platform analytics data...');
  
  // Define periods
  const periods = [
    { type: 'day', start: new Date(Date.now() - 86400000), end: new Date() },
    { type: 'week', start: new Date(Date.now() - 7 * 86400000), end: new Date() },
    { type: 'month', start: new Date(Date.now() - 30 * 86400000), end: new Date() },
    { type: 'year', start: new Date(Date.now() - 365 * 86400000), end: new Date() }
  ];
  
  // Get actual user counts
  const userCountResult = await pool.query(`
    SELECT COUNT(*) as total_users, 
           SUM(CASE WHEN last_login > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) as active_users
    FROM users
  `);
  
  const businessCountResult = await pool.query(`
    SELECT COUNT(*) as total_businesses,
           SUM(CASE WHEN last_login > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) as active_businesses
    FROM users
    WHERE user_type = 'business'
  `);
  
  // Use actual counts or fallback to mock data
  const totalUsers = userCountResult.rows[0].total_users || 1000;
  const activeUsers = userCountResult.rows[0].active_users || 750;
  const totalBusinesses = businessCountResult.rows[0].total_businesses || 100;
  const activeBusinesses = businessCountResult.rows[0].active_businesses || 75;
  
  for (const period of periods) {
    // Calculate metrics
    const userGrowth = 0.05 + Math.random() * 0.15;
    const businessGrowth = 0.03 + Math.random() * 0.1;
    const programGrowth = 0.02 + Math.random() * 0.2;
    const totalRevenue = totalBusinesses * (1000 + Math.random() * 5000);
    const revenueGrowth = 0.04 + Math.random() * 0.12;
    const transactionVolume = Math.floor(activeUsers * (1 + Math.random() * 5));
    const avgUserValue = totalRevenue / activeUsers;
    
    try {
      // Insert or update platform analytics
      await pool.query(`
        INSERT INTO platform_analytics (
          period_type,
          period_start,
          period_end,
          total_users,
          active_users,
          user_growth,
          business_growth,
          program_growth,
          total_revenue,
          revenue_growth,
          transaction_volume,
          avg_user_value,
          currency
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (period_type, period_start) 
        DO UPDATE SET
          period_end = EXCLUDED.period_end,
          total_users = EXCLUDED.total_users,
          active_users = EXCLUDED.active_users,
          user_growth = EXCLUDED.user_growth,
          business_growth = EXCLUDED.business_growth,
          program_growth = EXCLUDED.program_growth,
          total_revenue = EXCLUDED.total_revenue,
          revenue_growth = EXCLUDED.revenue_growth,
          transaction_volume = EXCLUDED.transaction_volume,
          avg_user_value = EXCLUDED.avg_user_value,
          updated_at = CURRENT_TIMESTAMP
      `, [
        period.type,
        period.start,
        period.end,
        totalUsers,
        activeUsers,
        userGrowth,
        businessGrowth,
        programGrowth,
        totalRevenue,
        revenueGrowth,
        transactionVolume,
        avgUserValue,
        'USD'
      ]);
    } catch (error) {
      console.error(`Error generating platform analytics for period ${period.type}:`, error);
    }
  }
  
  console.log('Platform analytics data generated successfully!');
}

// Generate regional analytics
async function generateRegionalAnalytics() {
  console.log('Generating regional analytics data...');
  
  // Define regions
  const regions = [
    'North America',
    'Europe',
    'Middle East',
    'Asia Pacific',
    'Africa'
  ];
  
  // Define period
  const period = { 
    type: 'month', 
    start: new Date(Date.now() - 30 * 86400000), 
    end: new Date() 
  };
  
  // Get total users and businesses
  const countResult = await pool.query(`
    SELECT COUNT(*) as total_users,
           SUM(CASE WHEN user_type = 'business' THEN 1 ELSE 0 END) as total_businesses
    FROM users
  `);
  
  const totalUsers = countResult.rows[0].total_users || 1000;
  const totalBusinesses = countResult.rows[0].total_businesses || 100;
  
  // Allocate percentages to regions
  const regionPercentages = {
    'North America': 0.35,
    'Europe': 0.25,
    'Middle East': 0.2,
    'Asia Pacific': 0.15,
    'Africa': 0.05
  };
  
  for (const region of regions) {
    // Calculate regional metrics
    const percentage = regionPercentages[region];
    const businesses = Math.floor(totalBusinesses * percentage);
    const customers = Math.floor(totalUsers * percentage);
    const revenue = businesses * (5000 + Math.random() * 15000);
    
    // Growth rates
    const businessGrowth = 0.02 + Math.random() * 0.15;
    const customerGrowth = 0.03 + Math.random() * 0.2;
    const revenueGrowth = 0.01 + Math.random() * 0.25;
    
    try {
      // Insert or update regional analytics
      await pool.query(`
        INSERT INTO regional_analytics (
          region,
          period_type,
          period_start,
          period_end,
          businesses,
          customers,
          revenue,
          business_growth,
          customer_growth,
          revenue_growth,
          currency
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (region, period_type, period_start) 
        DO UPDATE SET
          period_end = EXCLUDED.period_end,
          businesses = EXCLUDED.businesses,
          customers = EXCLUDED.customers,
          revenue = EXCLUDED.revenue,
          business_growth = EXCLUDED.business_growth,
          customer_growth = EXCLUDED.customer_growth,
          revenue_growth = EXCLUDED.revenue_growth,
          updated_at = CURRENT_TIMESTAMP
      `, [
        region,
        period.type,
        period.start,
        period.end,
        businesses,
        customers,
        revenue,
        businessGrowth,
        customerGrowth,
        revenueGrowth,
        'USD'
      ]);
    } catch (error) {
      console.error(`Error generating regional analytics for ${region}:`, error);
    }
  }
  
  console.log('Regional analytics data generated successfully!');
}

// Generate user engagement data
async function generateUserEngagement() {
  console.log('Generating user engagement data...');
  
  // Define period
  const period = { 
    type: 'month', 
    start: new Date(Date.now() - 30 * 86400000), 
    end: new Date() 
  };
  
  // Get actual user counts
  const userCountResult = await pool.query(`
    SELECT COUNT(*) as total_users,
           SUM(CASE WHEN last_login > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END) as monthly_active,
           SUM(CASE WHEN last_login > NOW() - INTERVAL '1 day' THEN 1 ELSE 0 END) as daily_active
    FROM users
  `);
  
  // Use actual counts or fallback to mock data
  const monthlyActiveUsers = userCountResult.rows[0].monthly_active || 750;
  const dailyActiveUsers = userCountResult.rows[0].daily_active || 250;
  
  // Average session duration in seconds (3-10 minutes)
  const avgSessionDuration = 180 + Math.floor(Math.random() * 420);
  
  try {
    // Insert or update user engagement
    await pool.query(`
      INSERT INTO user_engagement (
        period_type,
        period_start,
        period_end,
        daily_active_users,
        monthly_active_users,
        avg_session_duration
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (period_type, period_start) 
      DO UPDATE SET
        period_end = EXCLUDED.period_end,
        daily_active_users = EXCLUDED.daily_active_users,
        monthly_active_users = EXCLUDED.monthly_active_users,
        avg_session_duration = EXCLUDED.avg_session_duration,
        updated_at = CURRENT_TIMESTAMP
    `, [
      period.type,
      period.start,
      period.end,
      dailyActiveUsers,
      monthlyActiveUsers,
      avgSessionDuration
    ]);
    
    console.log('User engagement data generated successfully!');
  } catch (error) {
    console.error('Error generating user engagement data:', error);
  }
}

// Generate feature interactions
async function generateFeatureInteractions() {
  console.log('Generating feature interactions data...');
  
  // Define features
  const features = [
    'loyalty-programs',
    'rewards-redemption',
    'qr-scanning',
    'promo-codes',
    'customer-dashboard',
    'business-analytics',
    'profile-management',
    'payment-processing'
  ];
  
  // Define period
  const period = { 
    type: 'month', 
    start: new Date(Date.now() - 30 * 86400000), 
    end: new Date() 
  };
  
  for (const feature of features) {
    // Generate random interaction count (100-2000)
    const interactionCount = 100 + Math.floor(Math.random() * 1900);
    
    try {
      // Insert or update feature interaction
      await pool.query(`
        INSERT INTO feature_interactions (
          feature_name,
          interaction_count,
          period_type,
          period_start,
          period_end
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (feature_name, period_type, period_start) 
        DO UPDATE SET
          period_end = EXCLUDED.period_end,
          interaction_count = EXCLUDED.interaction_count,
          updated_at = CURRENT_TIMESTAMP
      `, [
        feature,
        interactionCount,
        period.type,
        period.start,
        period.end
      ]);
    } catch (error) {
      console.error(`Error generating feature interaction for ${feature}:`, error);
    }
  }
  
  console.log('Feature interactions data generated successfully!');
}

// Generate retention data
async function generateRetentionData() {
  console.log('Generating retention data...');
  
  // Define period
  const period = { 
    type: 'month', 
    start: new Date(Date.now() - 30 * 86400000), 
    end: new Date() 
  };
  
  // Generate retention curve over 7 days
  // Day 0 is 100%, then it drops
  for (let day = 0; day <= 7; day++) {
    // Realistic retention curve (day 0: 100%, day 7: ~40%)
    let retentionRate;
    if (day === 0) {
      retentionRate = 1.0;
    } else {
      // Exponential decay with randomness
      retentionRate = 1.0 * Math.exp(-0.12 * day) + (Math.random() * 0.05 - 0.025);
      // Ensure it's between 0 and 1
      retentionRate = Math.max(0, Math.min(1, retentionRate));
    }
    
    try {
      // Insert or update retention data
      await pool.query(`
        INSERT INTO retention_data (
          period_type,
          period_start,
          day_number,
          retention_rate
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (period_type, period_start, day_number) 
        DO UPDATE SET
          retention_rate = EXCLUDED.retention_rate,
          updated_at = CURRENT_TIMESTAMP
      `, [
        period.type,
        period.start,
        day,
        retentionRate
      ]);
    } catch (error) {
      console.error(`Error generating retention data for day ${day}:`, error);
    }
  }
  
  console.log('Retention data generated successfully!');
}

// Display sample analytics data
async function displaySampleAnalyticsData() {
  console.log('\n========== SAMPLE ANALYTICS DATA ==========');
  
  // Display business analytics
  try {
    const businessResult = await pool.query(`
      SELECT ba.*, u.business_name 
      FROM business_analytics ba
      JOIN users u ON ba.business_id = u.id
      WHERE ba.period_type = 'month'
      ORDER BY ba.active_customers DESC
      LIMIT 3
    `);
    
    console.log('\nTOP BUSINESS ANALYTICS:');
    for (const row of businessResult.rows) {
      console.log(`- ${row.business_name || 'Business ' + row.business_id}`);
      console.log(`  Active Customers: ${row.active_customers}`);
      console.log(`  Revenue: $${Math.round(row.total_revenue).toLocaleString()}`);
      console.log(`  Growth: ${(row.revenue_growth * 100).toFixed(1)}%`);
      console.log(`  Avg Order: $${row.avg_order_value.toFixed(2)}`);
      console.log('');
    }
  } catch (error) {
    console.error('Error displaying business analytics:', error);
  }
  
  // Display program analytics
  try {
    const programResult = await pool.query(`
      SELECT pa.*
      FROM program_analytics pa
      WHERE pa.period_type = 'month'
      ORDER BY pa.active_customers DESC
      LIMIT 3
    `);
    
    console.log('\nTOP PROGRAM ANALYTICS:');
    for (const row of programResult.rows) {
      console.log(`- ${row.program_name} (Business ID: ${row.business_id})`);
      console.log(`  Active Customers: ${row.active_customers}`);
      console.log(`  Points Issued: ${row.points_issued.toLocaleString()}`);
      console.log(`  Redemption Rate: ${(row.redemption_rate * 100).toFixed(1)}%`);
      console.log(`  Revenue: $${Math.round(row.revenue).toLocaleString()}`);
      console.log('');
    }
  } catch (error) {
    console.error('Error displaying program analytics:', error);
  }
  
  // Display platform analytics
  try {
    const platformResult = await pool.query(`
      SELECT *
      FROM platform_analytics
      WHERE period_type = 'month'
    `);
    
    if (platformResult.rows.length > 0) {
      const data = platformResult.rows[0];
      console.log('\nPLATFORM ANALYTICS:');
      console.log(`- Total Users: ${data.total_users.toLocaleString()}`);
      console.log(`- Active Users: ${data.active_users.toLocaleString()}`);
      console.log(`- User Growth: ${(data.user_growth * 100).toFixed(1)}%`);
      console.log(`- Total Revenue: $${Math.round(data.total_revenue).toLocaleString()}`);
      console.log(`- Revenue Growth: ${(data.revenue_growth * 100).toFixed(1)}%`);
      console.log('');
    }
  } catch (error) {
    console.error('Error displaying platform analytics:', error);
  }
  
  console.log('===========================================\n');
}

main(); 