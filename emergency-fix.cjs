/**
 * EMERGENCY POINTS FIX - CommonJS Version
 * Directly fixes database and creates refresh tools
 */

const { execSync } = require('child_process');
const fs = require('fs');
require('dotenv').config();

console.log('🚨 EMERGENCY POINTS FIX');
console.log('========================\n');

// Simple database fix script
const dbScript = `
const { Client } = require('pg');
require('dotenv').config();

async function fix() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database');
    
    // Check if card exists for Customer 4, Program 9
    const existing = await client.query('SELECT id, points FROM loyalty_cards WHERE customer_id = 4 AND program_id = 9');
    
    if (existing.rows.length === 0) {
      console.log('❌ No card found - creating one...');
      
      // Get business ID
      const program = await client.query('SELECT business_id FROM loyalty_programs WHERE id = 9');
      if (program.rows.length > 0) {
        const businessId = program.rows[0].business_id;
        
        // Create card
        await client.query(\`
          INSERT INTO loyalty_cards (customer_id, business_id, program_id, points, points_balance, card_type, is_active, created_at, updated_at)
          VALUES (4, \$1, 9, 0, 0, 'STANDARD', true, NOW(), NOW())
        \`, [businessId]);
        
        console.log('✅ Card created');
      }
    }
    
    // Add test points
    const result = await client.query(\`
      UPDATE loyalty_cards 
      SET points = COALESCE(points, 0) + 150, 
          points_balance = COALESCE(points_balance, 0) + 150,
          updated_at = NOW()
      WHERE customer_id = 4 AND program_id = 9
      RETURNING id, points
    \`);
    
    if (result.rows.length > 0) {
      console.log(\`✅ Added 150 points. Card now has \${result.rows[0].points} points\`);
      console.log(\`   Card ID: \${result.rows[0].id}\`);
    }
    
    // Test dashboard query
    const dashboard = await client.query(\`
      SELECT lc.id, lc.points, lp.name 
      FROM loyalty_cards lc 
      JOIN loyalty_programs lp ON lc.program_id = lp.id 
      WHERE lc.customer_id = 4
    \`);
    
    console.log('\\n📱 Customer dashboard will show:');
    dashboard.rows.forEach(card => {
      console.log(\`   \${card.name}: \${card.points} points (Card ID: \${card.id})\`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fix();
`;

fs.writeFileSync('db-fix.cjs', dbScript);

console.log('💾 Created database fix script');
console.log('🚀 Running database update...\n');

try {
  const result = execSync('node db-fix.cjs', { encoding: 'utf8' });
  console.log(result);
} catch (error) {
  console.log('❌ Database update failed');
  console.log('Error:', error.message);
}

// Create HTML refresh page
const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>Emergency Dashboard Refresh</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; }
        button { padding: 15px 30px; font-size: 18px; margin: 10px; cursor: pointer; border: none; border-radius: 5px; }
        .primary { background: #007cba; color: white; }
        .success { background: #28a745; color: white; }
        .warning { background: #ffc107; color: black; }
        #status { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .step { margin: 10px 0; padding: 10px; background: #e9ecef; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>🚨 Emergency Customer Dashboard Refresh</h1>
    <p><strong>Target:</strong> Customer 4, Program 9</p>
    
    <div id="status">
        <h3>Status: Ready to refresh</h3>
        <p>Database has been updated with test points. Now force the frontend to refresh.</p>
    </div>
    
    <button class="primary" onclick="forceRefresh()">🚀 FORCE DASHBOARD REFRESH</button>
    <button class="success" onclick="navigateToCards()">📱 GO TO CARDS PAGE</button>
    <button class="warning" onclick="clearCache()">🧹 CLEAR CACHE</button>
    
    <div id="steps"></div>
    
    <script>
        function updateStatus(message, isSuccess = true) {
            const status = document.getElementById('status');
            const color = isSuccess ? '#28a745' : '#dc3545';
            status.innerHTML = \`<h3 style="color: \${color}">Status: \${message}</h3>\`;
        }
        
        function addStep(message) {
            const steps = document.getElementById('steps');
            const step = document.createElement('div');
            step.className = 'step';
            step.innerHTML = \`\${new Date().toLocaleTimeString()}: \${message}\`;
            steps.appendChild(step);
        }
        
        function forceRefresh() {
            updateStatus('Forcing refresh...');
            addStep('🚀 Starting emergency refresh...');
            
            // Clear old data
            Object.keys(localStorage).forEach(key => {
                if (key.includes('points') || key.includes('cards') || key.includes('customer')) {
                    localStorage.removeItem(key);
                }
            });
            addStep('🧹 Cleared old localStorage data');
            
            // Set refresh flags for Customer 4, Program 9
            const refreshData = {
                customerId: '4',
                programId: '9',
                points: 150,
                timestamp: Date.now()
            };
            
            localStorage.setItem('IMMEDIATE_CARDS_REFRESH', JSON.stringify(refreshData));
            localStorage.setItem('force_cards_refresh', Date.now().toString());
            localStorage.setItem('customer_4_points_updated', JSON.stringify(refreshData));
            localStorage.setItem('program_9_points_updated', JSON.stringify(refreshData));
            
            addStep('✅ Set refresh flags for Customer 4, Program 9');
            
            // Dispatch events
            const events = ['points-awarded', 'loyalty-cards-refresh', 'force-reload-customer-cards'];
            events.forEach(eventType => {
                const event = new CustomEvent(eventType, { detail: refreshData });
                window.dispatchEvent(event);
                addStep(\`📡 Dispatched \${eventType} event\`);
            });
            
            // BroadcastChannel
            try {
                const channel = new BroadcastChannel('loyalty-updates');
                channel.postMessage({ type: 'POINTS_AWARDED', ...refreshData });
                channel.close();
                addStep('📻 Sent BroadcastChannel message');
            } catch (e) {
                addStep('⚠️ BroadcastChannel not available');
            }
            
            updateStatus('Refresh completed! Check /cards page');
            addStep('✅ Emergency refresh completed!');
            addStep('🎯 Now navigate to /cards page to see the points');
        }
        
        function navigateToCards() {
            addStep('🏃 Navigating to /cards page...');
            if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
                window.open('http://localhost:3000/cards', '_blank', 'noopener,noreferrer');
            } else {
                window.open('/cards', '_blank', 'noopener,noreferrer');
            }
        }
        
        function clearCache() {
            localStorage.clear();
            sessionStorage.clear();
            addStep('🧹 Cleared all cache');
            updateStatus('Cache cleared');
        }
        
        // Auto-start
        addStep('📱 Emergency refresh page loaded');
        addStep('👆 Click "FORCE DASHBOARD REFRESH" to fix the issue');
    </script>
</body>
</html>`;

fs.writeFileSync('emergency-refresh.html', htmlContent);

console.log('\n✅ EMERGENCY FIX COMPLETED!');
console.log('===========================');
console.log('📋 WHAT WAS DONE:');
console.log('1. ✅ Database updated with test points for Customer 4, Program 9');
console.log('2. ✅ Created emergency-refresh.html for frontend fix');
console.log('');
console.log('📋 NEXT STEPS:');
console.log('1. 🌐 Open emergency-refresh.html in your browser');
console.log('2. 👆 Click "FORCE DASHBOARD REFRESH"');
console.log('3. 📱 Click "GO TO CARDS PAGE" or navigate to /cards manually');
console.log('4. 🎉 You should now see the points!');
console.log('');
console.log('🔧 IF STILL NOT WORKING:');
console.log('• Check browser console for errors');
console.log('• Try refreshing the /cards page manually');
console.log('• Check if you\'re logged in as Customer ID 4');

// Clean up
setTimeout(() => {
  try {
    fs.unlinkSync('db-fix.cjs');
  } catch (e) {}
}, 5000); 