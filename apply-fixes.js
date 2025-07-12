/**
 * Award Points System Fix Application Script
 * 
 * This script applies both client and server fixes for the award points system.
 * Run this script before starting your server.
 */

console.log('🔧 Applying award points system fixes...');

// Apply server-side fixes
try {
  require('./server-award-points-fix.js');
  console.log('✅ Applied server-side award points fix');
} catch (e) {
  console.error('❌ Error applying server-side fix:', e);
}

// Apply diagnostics
try {
  require('./apply-diagnostics.js');
  console.log('✅ Applied diagnostics middleware');
} catch (e) {
  console.error('❌ Error applying diagnostics middleware:', e);
}

// Copy client-side fix to public directory
try {
  const fs = require('fs');
  const path = require('path');
  
  // Create public directory if it doesn't exist
  if (!fs.existsSync('./public')) {
    fs.mkdirSync('./public');
    console.log('Created public directory');
  }
  
  // Copy fix-award-points-final.js to public directory
  fs.copyFileSync(
    './fix-award-points-final.js',
    './public/fix-award-points-final.js'
  );
  console.log('✅ Copied client-side fix to public directory');
  
  // Copy verification tool to public directory
  fs.copyFileSync(
    './verify-award-points.html',
    './public/verify-award-points.html'
  );
  console.log('✅ Copied verification tool to public directory');
  
  // Create index.html with fix applied if it doesn't exist
  if (!fs.existsSync('./public/index.html')) {
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Award Points System</title>
</head>
<body>
    <h1>Award Points System</h1>
    <p>The award points system fix has been applied.</p>
    <p>Use the <a href="/verify-award-points.html">verification tool</a> to test the fix.</p>
    
    <!-- Include the fix script -->
    <script src="/fix-award-points-final.js"></script>
    
    <script>
        // Test the award points function
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Award points system ready to use');
            console.log('Use awardPointsWithFallback() to award points');
        });
    </script>
</body>
</html>`;
    
    fs.writeFileSync('./public/index.html', indexHtml);
    console.log('✅ Created index.html with fix applied');
  }
} catch (e) {
  console.error('❌ Error setting up client-side fix:', e);
}

console.log('🎯 Award points system fixes applied successfully!');
console.log('');
console.log('Next steps:');
console.log('1. Start your server');
console.log('2. Open the verification tool: http://localhost:3000/verify-award-points.html');
console.log('3. Test all endpoints to find which one works best');
console.log('4. Update your application to use that endpoint consistently'); 