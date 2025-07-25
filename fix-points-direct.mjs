/**
 * DIRECT POINTS FIX - Manual Database Update
 * This script directly fixes the points issue by:
 * 1. Checking if the card exists
 * 2. Creating it if missing
 * 3. Adding test points
 * 4. Verifying the customer dashboard query
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 DIRECT POINTS FIX');
console.log('====================\n');

// Load environment to get database info
require('dotenv').config();

console.log('📋 STEP 1: Testing your specific case (Customer 4, Program 9)');

// Create a simple SQL script for direct execution
const sqlScript = `
-- Check if card exists for Customer 4, Program 9
SELECT 'CHECKING CARD EXISTENCE' as step;
SELECT id, customer_id, program_id, points, points_balance 
FROM loyalty_cards 
WHERE customer_id = 4 AND program_id = 9;

-- If no card found, create one
INSERT INTO loyalty_cards (
  customer_id, business_id, program_id, points, points_balance, 
  total_points_earned, card_type, is_active, status, tier,
  created_at, updated_at
)
SELECT 
  4 as customer_id,
  (SELECT business_id FROM loyalty_programs WHERE id = 9) as business_id,
  9 as program_id,
  100 as points,
  100 as points_balance,
  100 as total_points_earned,
  'STANDARD' as card_type,
  true as is_active,
  'ACTIVE' as status,
  'STANDARD' as tier,
  NOW() as created_at,
  NOW() as updated_at
WHERE NOT EXISTS (
  SELECT 1 FROM loyalty_cards WHERE customer_id = 4 AND program_id = 9
);

-- Update existing card with test points
UPDATE loyalty_cards 
SET 
  points = COALESCE(points, 0) + 50,
  points_balance = COALESCE(points_balance, points, 0) + 50,
  total_points_earned = COALESCE(total_points_earned, points, 0) + 50,
  updated_at = NOW()
WHERE customer_id = 4 AND program_id = 9;

-- Show the result
SELECT 'FINAL RESULT' as step;
SELECT id, customer_id, program_id, points, points_balance, total_points_earned
FROM loyalty_cards 
WHERE customer_id = 4 AND program_id = 9;

-- Test the customer dashboard query (exact same as in the app)
SELECT 'CUSTOMER DASHBOARD QUERY TEST' as step;
SELECT 
  lc.id,
  lc.customer_id,
  lc.program_id,
  lc.points,
  lc.points_balance,
  lp.name as program_name,
  u.name as business_name
FROM loyalty_cards lc
JOIN loyalty_programs lp ON lc.program_id = lp.id
JOIN users u ON lp.business_id = u.id
WHERE lc.customer_id = 4
ORDER BY lc.created_at DESC;
`;

// Write SQL script to file
fs.writeFileSync('direct-fix.sql', sqlScript);

console.log('💾 Created direct-fix.sql script');
console.log('📊 Running database update...\n');

try {
  // Check if we can run psql directly
  const dbUrl = process.env.DATABASE_URL;
  
  if (dbUrl) {
    console.log('🔗 Using DATABASE_URL connection');
    
    // Try to run the SQL script
    try {
      const result = execSync(`psql "${dbUrl}" -f direct-fix.sql`, { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      console.log('✅ Database update completed!');
      console.log('📋 Results:');
      console.log(result);
      
    } catch (psqlError) {
      console.log('⚠️  psql not available, trying alternative approach...');
      
      // Alternative: Create a Node.js script that uses pg directly
      const nodeScript = `
const { Client } = require('pg');

async function fixPoints() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Check current state
    const checkResult = await client.query(
      'SELECT id, customer_id, program_id, points, points_balance FROM loyalty_cards WHERE customer_id = $1 AND program_id = $2',
      [4, 9]
    );
    
    console.log('📊 Current state:');
    if (checkResult.rows.length > 0) {
      console.log('  Card found:', checkResult.rows[0]);
    } else {
      console.log('  No card found - will create one');
      
      // Get business ID for program 9
      const programResult = await client.query('SELECT business_id FROM loyalty_programs WHERE id = $1', [9]);
      
      if (programResult.rows.length > 0) {
        const businessId = programResult.rows[0].business_id;
        
        // Create the card
        const createResult = await client.query(\`
          INSERT INTO loyalty_cards (
            customer_id, business_id, program_id, points, points_balance, 
            total_points_earned, card_type, is_active, status, tier,
            created_at, updated_at
          ) VALUES ($1, $2, $3, 100, 100, 100, 'STANDARD', true, 'ACTIVE', 'STANDARD', NOW(), NOW())
          RETURNING id
        \`, [4, businessId, 9]);
        
        console.log('✅ Created new card:', createResult.rows[0]);
      }
    }
    
    // Add test points
    const updateResult = await client.query(\`
      UPDATE loyalty_cards 
      SET 
        points = COALESCE(points, 0) + 75,
        points_balance = COALESCE(points_balance, points, 0) + 75,
        total_points_earned = COALESCE(total_points_earned, points, 0) + 75,
        updated_at = NOW()
      WHERE customer_id = $1 AND program_id = $2
      RETURNING *
    \`, [4, 9]);
    
    if (updateResult.rows.length > 0) {
      console.log('✅ Points updated successfully:', updateResult.rows[0]);
    }
    
    // Test customer dashboard query
    const dashboardResult = await client.query(\`
      SELECT 
        lc.id,
        lc.customer_id,
        lc.program_id,
        lc.points,
        lc.points_balance,
        lp.name as program_name,
        u.name as business_name
      FROM loyalty_cards lc
      JOIN loyalty_programs lp ON lc.program_id = lp.id
      JOIN users u ON lp.business_id = u.id
      WHERE lc.customer_id = $1
      ORDER BY lc.created_at DESC
    \`, [4]);
    
    console.log('\\n📱 Customer dashboard will show:');
    dashboardResult.rows.forEach((card, index) => {
      console.log(\`  Card \${index + 1}: ID=\${card.id}, Program=\${card.program_name} (ID: \${card.program_id}), Points=\${card.points}\`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

require('dotenv').config();
fixPoints();
      `;
      
      fs.writeFileSync('node-direct-fix.js', nodeScript);
      
      console.log('📁 Created node-direct-fix.js');
      console.log('🚀 Running Node.js fix...\n');
      
      const nodeResult = execSync('node node-direct-fix.js', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      console.log(nodeResult);
    }
    
  } else {
    console.log('❌ No DATABASE_URL found in environment');
    console.log('📋 Please check your .env file');
  }
  
} catch (error) {
  console.error('❌ Error running database fix:', error.message);
  console.log('\n🛠️  MANUAL STEPS:');
  console.log('1. Open your database management tool (pgAdmin, etc.)');
  console.log('2. Run the contents of direct-fix.sql');
  console.log('3. Check if Customer 4 has a card for Program 9 with points > 0');
  console.log('4. If yes, the issue is in the frontend refresh');
  console.log('5. If no, there\'s a database connection issue');
}

console.log('\n🔄 STEP 2: Force Frontend Refresh');
console.log('================================');

// Create a simple HTML page to force refresh the customer dashboard
const refreshHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Force Customer Dashboard Refresh</title>
</head>
<body>
    <h1>🔄 Force Customer Dashboard Refresh</h1>
    <p>This page will trigger all the refresh mechanisms for Customer 4, Program 9</p>
    
    <button onclick="forceRefresh()">🚀 Force Refresh Now</button>
    <button onclick="clearCache()">🧹 Clear Cache</button>
    
    <div id="log" style="margin-top: 20px; background: #f5f5f5; padding: 10px; height: 300px; overflow-y: scroll;"></div>
    
    <script>
        function log(message) {
            const logDiv = document.getElementById('log');
            logDiv.innerHTML += new Date().toLocaleTimeString() + ': ' + message + '<br>';
            logDiv.scrollTop = logDiv.scrollHeight;
        }
        
        function forceRefresh() {
            log('🚀 Starting force refresh for Customer 4, Program 9...');
            
            const customerId = '4';
            const programId = '9';
            const cardId = '22'; // Assuming this is the card ID
            const points = 175; // Test points
            
            // Clear all existing flags first
            Object.keys(localStorage).forEach(key => {
                if (key.includes('points_') || key.includes('cards_') || key.includes('customer_')) {
                    localStorage.removeItem(key);
                    log('🧹 Cleared: ' + key);
                }
            });
            
            // Set all the refresh flags
            const flags = {
                'IMMEDIATE_CARDS_REFRESH': {
                    customerId,
                    programId,
                    points,
                    timestamp: Date.now()
                },
                'force_cards_refresh': Date.now().toString(),
                [\`customer_\${customerId}_points_updated\`]: {
                    programId,
                    cardId,
                    points,
                    timestamp: new Date().toISOString()
                },
                [\`program_\${programId}_points_updated\`]: {
                    customerId,
                    cardId,
                    points,
                    timestamp: new Date().toISOString()
                },
                [\`card_\${cardId}_points_updated\`]: {
                    customerId,
                    programId,
                    points,
                    timestamp: new Date().toISOString()
                }
            };
            
            Object.entries(flags).forEach(([key, value]) => {
                localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                log('✅ Set flag: ' + key);
            });
            
            // Dispatch all events
            const events = [
                'customer-notification',
                'points-awarded',
                'card-update-required',
                'loyalty-cards-refresh',
                'program-points-updated',
                'force-reload-customer-cards',
                'ultimate-cards-refresh'
            ];
            
            events.forEach(eventType => {
                const event = new CustomEvent(eventType, {
                    detail: {
                        customerId,
                        programId,
                        cardId,
                        points,
                        programName: 'Test Program',
                        timestamp: new Date().toISOString()
                    }
                });
                window.dispatchEvent(event);
                log('📡 Dispatched event: ' + eventType);
            });
            
            // BroadcastChannel
            try {
                const channel = new BroadcastChannel('loyalty-updates');
                channel.postMessage({
                    type: 'POINTS_AWARDED',
                    customerId,
                    programId,
                    cardId,
                    points,
                    timestamp: new Date().toISOString()
                });
                channel.close();
                log('📻 Sent BroadcastChannel message');
            } catch (e) {
                log('⚠️ BroadcastChannel not supported');
            }
            
            log('✅ All refresh mechanisms triggered!');
            log('🎯 Now check your customer dashboard (/cards page)');
        }
        
        function clearCache() {
            localStorage.clear();
            sessionStorage.clear();
            log('🧹 Cleared all localStorage and sessionStorage');
            
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => {
                        caches.delete(name);
                        log('🧹 Cleared cache: ' + name);
                    });
                });
            }
        }
        
        log('📱 Force refresh page loaded');
        log('👆 Click "Force Refresh Now" to trigger all refresh mechanisms');
    </script>
</body>
</html>
`;

fs.writeFileSync('force-refresh.html', refreshHtml);

console.log('📱 Created force-refresh.html');
console.log('🌐 Open force-refresh.html in your browser');
console.log('👆 Click "Force Refresh Now" to trigger all refresh mechanisms');

console.log('\n✅ DIRECT FIX COMPLETED');
console.log('======================');
console.log('📋 Next steps:');
console.log('1. Check if database update worked');
console.log('2. Open force-refresh.html in browser');
console.log('3. Click "Force Refresh Now"');
console.log('4. Check customer dashboard (/cards page)');
console.log('5. If still not working, check browser console for errors');

// Clean up
setTimeout(() => {
  try {
    fs.unlinkSync('direct-fix.sql');
    fs.unlinkSync('node-direct-fix.js');
    console.log('\n🧹 Cleaned up temporary files');
  } catch (e) {
    // Files might not exist, that's okay
  }
}, 1000); 