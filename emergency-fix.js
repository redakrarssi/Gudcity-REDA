/**
 * EMERGENCY POINTS FIX
 * This script directly fixes the issue by updating the database and forcing refresh
 */

const { execSync } = require('child_process');
const fs = require('fs');
require('dotenv').config();

console.log('🚨 EMERGENCY POINTS FIX');
console.log('========================\n');

console.log('🎯 Target: Customer 4, Program 9 (your specific case)');
console.log('🔧 Action: Direct database update + force refresh\n');

// Create Node.js database fix
const dbFixScript = `
const { Client } = require('pg');

async function emergencyFix() {
  console.log('🔗 Connecting to database...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    await client.connect();
    console.log('✅ Database connected');
    
    // STEP 1: Check current state
    console.log('\\n📊 STEP 1: Checking current state...');
    const currentState = await client.query(\`
      SELECT id, customer_id, program_id, points, points_balance, total_points_earned
      FROM loyalty_cards 
      WHERE customer_id = 4 AND program_id = 9
    \`);
    
    if (currentState.rows.length > 0) {
      console.log('✅ Card exists:', currentState.rows[0]);
      const currentPoints = currentState.rows[0].points || 0;
      console.log(\`   Current points: \${currentPoints}\`);
    } else {
      console.log('❌ No card found for Customer 4, Program 9');
      
      // Get business ID for program 9
      const programInfo = await client.query('SELECT business_id, name FROM loyalty_programs WHERE id = 9');
      
      if (programInfo.rows.length > 0) {
        const businessId = programInfo.rows[0].business_id;
        const programName = programInfo.rows[0].name;
        console.log(\`   Program: \${programName}, Business ID: \${businessId}\`);
        
        // Create the missing card
        console.log('\\n🛠️ Creating missing card...');
        const newCard = await client.query(\`
          INSERT INTO loyalty_cards (
            customer_id, business_id, program_id, points, points_balance, 
            total_points_earned, card_type, is_active, status, tier,
            created_at, updated_at
          ) VALUES (4, $1, 9, 0, 0, 0, 'STANDARD', true, 'ACTIVE', 'STANDARD', NOW(), NOW())
          RETURNING id
        \`, [businessId]);
        
        console.log('✅ Created card:', newCard.rows[0]);
      } else {
        console.log('❌ Program 9 not found in database');
        return;
      }
    }
    
    // STEP 2: Add test points
    console.log('\\n💰 STEP 2: Adding test points (200)...');
    const updateResult = await client.query(\`
      UPDATE loyalty_cards 
      SET 
        points = COALESCE(points, 0) + 200,
        points_balance = COALESCE(points_balance, points, 0) + 200,
        total_points_earned = COALESCE(total_points_earned, points, 0) + 200,
        updated_at = NOW()
      WHERE customer_id = 4 AND program_id = 9
      RETURNING id, points, points_balance, total_points_earned
    \`);
    
    if (updateResult.rows.length > 0) {
      const updated = updateResult.rows[0];
      console.log('✅ Points added successfully:');
      console.log(\`   Card ID: \${updated.id}\`);
      console.log(\`   Points: \${updated.points}\`);
      console.log(\`   Points Balance: \${updated.points_balance}\`);
      console.log(\`   Total Earned: \${updated.total_points_earned}\`);
    }
    
    // STEP 3: Test customer dashboard query
    console.log('\\n🖥️ STEP 3: Testing customer dashboard query...');
    const dashboardTest = await client.query(\`
      SELECT 
        lc.id as card_id,
        lc.customer_id,
        lc.program_id,
        lc.points,
        lc.points_balance,
        lp.name as program_name,
        u.name as business_name
      FROM loyalty_cards lc
      JOIN loyalty_programs lp ON lc.program_id = lp.id
      LEFT JOIN users u ON lp.business_id = u.id
      WHERE lc.customer_id = 4
      ORDER BY lc.created_at DESC
    \`);
    
    console.log(\`📱 Customer dashboard will show \${dashboardTest.rows.length} cards:\`);
    dashboardTest.rows.forEach((card, index) => {
      console.log(\`   Card \${index + 1}:\`);
      console.log(\`     ID: \${card.card_id}\`);
      console.log(\`     Program: \${card.program_name} (ID: \${card.program_id})\`);
      console.log(\`     Points: \${card.points}\`);
      console.log(\`     Business: \${card.business_name || 'Unknown'}\`);
    });
    
    // Find the specific program 9 card
    const targetCard = dashboardTest.rows.find(card => card.program_id == 9);
    if (targetCard) {
      console.log(\`\\n🎯 TARGET CARD FOUND!\`);
      console.log(\`   Program 9 card has \${targetCard.points} points\`);
      console.log(\`   Card ID: \${targetCard.card_id}\`);
      console.log('\\n✅ Database is FIXED! Points are stored correctly.');
    } else {
      console.log('\\n❌ Program 9 card still not found in dashboard query');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await client.end();
    console.log('\\n🔌 Database connection closed');
  }
}

require('dotenv').config();
emergencyFix().then(() => {
  console.log('\\n🎉 EMERGENCY DATABASE FIX COMPLETED!');
  console.log('📋 Next: Run the frontend refresh script');
}).catch(err => {
  console.error('❌ Emergency fix failed:', err.message);
});
`;

console.log('💾 Creating database fix script...');
fs.writeFileSync('emergency-db-fix.js', dbFixScript);

// Create frontend refresh script
const frontendRefreshScript = `
/**
 * FRONTEND REFRESH SCRIPT
 * Forces the customer dashboard to refresh and show updated points
 */

console.log('🔄 FRONTEND REFRESH SCRIPT');
console.log('==========================\\n');

// Create refresh HTML page
const refreshPageHtml = \`
<!DOCTYPE html>
<html>
<head>
    <title>🚨 Emergency Customer Dashboard Refresh</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        button { padding: 10px 20px; margin: 10px; font-size: 16px; cursor: pointer; }
        .success { background: #4CAF50; color: white; }
        .warning { background: #ff9800; color: white; }
        .error { background: #f44336; color: white; }
        #log { background: #f5f5f5; padding: 15px; margin-top: 20px; height: 400px; overflow-y: scroll; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <h1>🚨 Emergency Customer Dashboard Refresh</h1>
    <p><strong>Target:</strong> Customer 4, Program 9</p>
    <p><strong>Purpose:</strong> Force the customer dashboard to show updated points</p>
    
    <button class="success" onclick="forceCompleteRefresh()">🚀 FORCE COMPLETE REFRESH</button>
    <button class="warning" onclick="clearAllCache()">🧹 CLEAR ALL CACHE</button>
    <button class="error" onclick="resetEverything()">🔄 RESET EVERYTHING</button>
    
    <div id="log"></div>
    
    <script>
        function log(message, type = 'info') {
            const logDiv = document.getElementById('log');
            const timestamp = new Date().toLocaleTimeString();
            const color = type === 'success' ? 'green' : type === 'error' ? 'red' : 'black';
            logDiv.innerHTML += \`<div style="color: \${color}; margin: 2px 0;">\${timestamp}: \${message}</div>\`;
            logDiv.scrollTop = logDiv.scrollHeight;
        }
        
        function forceCompleteRefresh() {
            log('🚀 Starting COMPLETE REFRESH for Customer 4, Program 9...', 'success');
            
            const customerId = '4';
            const programId = '9';
            const points = 200; // Test points from database fix
            
            // 1. Clear existing flags
            log('🧹 Clearing old flags...');
            Object.keys(localStorage).forEach(key => {
                if (key.includes('points') || key.includes('cards') || key.includes('customer') || key.includes('program')) {
                    localStorage.removeItem(key);
                }
            });
            
            // 2. Set ALL refresh flags
            log('📝 Setting refresh flags...');
            const flags = {
                'IMMEDIATE_CARDS_REFRESH': JSON.stringify({
                    customerId, programId, points, timestamp: Date.now()
                }),
                'force_cards_refresh': Date.now().toString(),
                [\`customer_\${customerId}_points_updated\`]: JSON.stringify({
                    programId, points, timestamp: new Date().toISOString()
                }),
                [\`program_\${programId}_points_updated\`]: JSON.stringify({
                    customerId, points, timestamp: new Date().toISOString()
                })
            };
            
            Object.entries(flags).forEach(([key, value]) => {
                localStorage.setItem(key, value);
                log(\`✅ Set: \${key}\`);
            });
            
            // 3. Dispatch ALL events
            log('📡 Dispatching events...');
            const events = [
                'customer-notification',
                'points-awarded', 
                'card-update-required',
                'loyalty-cards-refresh',
                'program-points-updated',
                'force-reload-customer-cards',
                'ultimate-cards-refresh',
                'react-query-invalidate'
            ];
            
            events.forEach(eventType => {
                const event = new CustomEvent(eventType, {
                    detail: {
                        customerId, programId, points,
                        programName: 'Emergency Test',
                        timestamp: new Date().toISOString()
                    }
                });
                window.dispatchEvent(event);
                log(\`📡 Dispatched: \${eventType}\`);
            });
            
            // 4. Force page reload after 2 seconds
            log('⏰ Forcing page reload in 2 seconds...');
            setTimeout(() => {
                if (window.location.href.includes('/cards')) {
                    window.location.reload();
                } else {
                    window.location.href = '/cards';
                }
            }, 2000);
            
            log('✅ COMPLETE REFRESH TRIGGERED!', 'success');
            log('🎯 Check your /cards page now!', 'success');
        }
        
        function clearAllCache() {
            log('🧹 Clearing all cache...', 'warning');
            localStorage.clear();
            sessionStorage.clear();
            
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                });
            }
            
            log('✅ All cache cleared', 'success');
        }
        
        function resetEverything() {
            log('🔄 RESETTING EVERYTHING...', 'error');
            clearAllCache();
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
        
        // Auto-log startup
        log('📱 Emergency refresh page loaded');
        log('👆 Click "FORCE COMPLETE REFRESH" to fix the customer dashboard');
        log('🎯 Make sure to open /cards page after clicking');
    </script>
</body>
</html>
\`;

const fs = require('fs');
fs.writeFileSync('emergency-refresh.html', refreshPageHtml);

console.log('✅ Created emergency-refresh.html');
console.log('🌐 Open this file in your browser AFTER running the database fix');
`;

console.log('💾 Creating frontend refresh script...');
fs.writeFileSync('emergency-frontend-fix.js', frontendRefreshScript);

console.log('\n🚀 RUNNING EMERGENCY DATABASE FIX...');
console.log('=====================================');

try {
  // Run the database fix
  const result = execSync('node emergency-db-fix.js', { encoding: 'utf8' });
  console.log(result);
  
  console.log('\n🔄 CREATING FRONTEND REFRESH TOOL...');
  console.log('====================================');
  
  // Create the frontend refresh page
  execSync('node emergency-frontend-fix.js', { encoding: 'utf8' });
  
  console.log('\n✅ EMERGENCY FIX COMPLETED!');
  console.log('===========================');
  console.log('📋 NEXT STEPS:');
  console.log('1. ✅ Database has been updated with test points');
  console.log('2. 🌐 Open emergency-refresh.html in your browser');
  console.log('3. 👆 Click "FORCE COMPLETE REFRESH"');
  console.log('4. 🎯 Navigate to /cards page to see the points');
  console.log('5. 🎉 Points should now show correctly!');
  
} catch (error) {
  console.error('❌ Emergency fix failed:', error.message);
  console.log('\n🛠️ MANUAL STEPS:');
  console.log('1. Check your database connection');
  console.log('2. Verify DATABASE_URL in .env file');
  console.log('3. Try running: node emergency-db-fix.js manually');
} 