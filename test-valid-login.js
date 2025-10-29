/**
 * Test valid login with demo credentials
 */

async function testValidLogin() {
  const endpoint = 'http://localhost:3000/api/auth/login';
  
  console.log('🎯 Testing Valid Login');
  console.log('📍 Endpoint:', endpoint);
  console.log('=====================================\n');

  console.log('🔐 Testing with demo credentials...');
  console.log('📧 Email: demo@gudcity.com');
  console.log('🔑 Password: Demo123!@#');
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000'
      },
      body: JSON.stringify({
        email: 'demo@gudcity.com',
        password: 'Demo123!@#'
      })
    });

    console.log('\n📊 Response Details:');
    console.log('✅ Status:', response.status);
    console.log('✅ Status Text:', response.statusText);
    
    const data = await response.json();
    console.log('\n📥 Response Data:');
    console.log(JSON.stringify(data, null, 2));
    
    if (response.status === 200 && data.success) {
      console.log('\n🎉 LOGIN SUCCESSFUL!');
      console.log('👤 User:', data.data.user.name, `(${data.data.user.email})`);
      console.log('🔑 Access Token:', data.data.accessToken);
      console.log('🔄 Refresh Token:', data.data.refreshToken);
      console.log('⏰ Expires In:', data.data.expiresIn, 'seconds');
      console.log('✅ LOGIN ENDPOINT IS WORKING PERFECTLY!');
    } else {
      console.log('\n❌ Login failed');
      console.log('Status:', response.status);
      console.log('Error:', data.error);
    }

  } catch (error) {
    console.log('\n❌ Request failed:', error.message);
  }
  
  console.log('\n=====================================');
}

testValidLogin().catch(console.error);
