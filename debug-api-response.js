/**
 * Debug what the API is actually returning
 */

async function debugApiResponse() {
  const endpoint = 'http://localhost:5173/api/auth/login';
  
  console.log('🔍 Debugging API Response');
  console.log('📍 Endpoint:', endpoint);
  console.log('=====================================\n');

  // Test POST request and see what we actually get back
  console.log('📤 Making POST request...');
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password'
      })
    });

    console.log('✅ Response Status:', response.status);
    console.log('✅ Response Headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`   ${key}: ${value}`);
    }

    console.log('\n📥 Response Body:');
    const text = await response.text();
    console.log('Raw text length:', text.length);
    console.log('First 500 characters:');
    console.log(text.substring(0, 500));
    
    if (text.startsWith('{')) {
      try {
        const json = JSON.parse(text);
        console.log('\n✅ Parsed JSON:');
        console.log(JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('\n❌ Failed to parse as JSON:', e.message);
      }
    } else if (text.startsWith('<!DOCTYPE')) {
      console.log('\n❌ Received HTML instead of JSON (likely 404 page)');
    }

  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  console.log('\n=====================================');
  
  // Also test if the API directory exists
  console.log('📁 Checking API directory structure...');
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const apiDir = path.resolve('./api');
    const authDir = path.resolve('./api/auth');
    
    console.log('API directory exists:', fs.existsSync(apiDir));
    console.log('Auth directory exists:', fs.existsSync(authDir));
    
    if (fs.existsSync(authDir)) {
      const files = fs.readdirSync(authDir);
      console.log('Auth directory files:', files);
    }
    
  } catch (error) {
    console.log('❌ Error checking directories:', error.message);
  }
}

debugApiResponse().catch(console.error);
