/**
 * Check if development server is running and accessible
 */

async function checkServerStatus() {
  const ports = [3000, 5173, 4173]; // Common development ports
  
  console.log('🔍 Checking development server status...');
  console.log('=====================================\n');

  for (const port of ports) {
    console.log(`📡 Checking port ${port}...`);
    
    try {
      // Check if port is accessible
      const response = await fetch(`http://localhost:${port}`, { 
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });
      
      console.log(`✅ Port ${port}: Server responding (${response.status})`);
      
      // Check API health endpoint
      try {
        const healthResponse = await fetch(`http://localhost:${port}/api/health`, {
          signal: AbortSignal.timeout(2000)
        });
        
        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          console.log(`🏥 Health endpoint: ✅ OK`);
          console.log(`📊 Response:`, JSON.stringify(healthData, null, 2));
        } else {
          console.log(`🏥 Health endpoint: ❌ Status ${healthResponse.status}`);
        }
      } catch (apiError) {
        console.log(`🏥 Health endpoint: ❌ Not available`);
      }
      
      // Try auth endpoint
      try {
        const authResponse = await fetch(`http://localhost:${port}/api/auth/login`, {
          method: 'OPTIONS',
          signal: AbortSignal.timeout(2000)
        });
        
        console.log(`🔐 Auth endpoint: ✅ Available (${authResponse.status})`);
        return { port, available: true, baseUrl: `http://localhost:${port}` };
      } catch (authError) {
        console.log(`🔐 Auth endpoint: ❌ Not available`);
      }
      
    } catch (error) {
      console.log(`❌ Port ${port}: No server running`);
    }
    
    console.log('');
  }
  
  console.log('=====================================');
  console.log('❌ No development server found running!');
  console.log('');
  console.log('💡 To start the development server, run:');
  console.log('   npm run dev        # Vite development server');
  console.log('   npm run preview     # Preview production build');
  console.log('   npm run api:server  # API-only server');
  console.log('');
  console.log('🔧 Available commands:');
  console.log('   npm run dev         # Start frontend + API');
  console.log('   npm run build       # Build for production');
  console.log('   npm run preview     # Preview build locally');
  
  return { available: false };
}

// Check for fetch support
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ with built-in fetch');
  process.exit(1);
}

checkServerStatus().catch(console.error);
