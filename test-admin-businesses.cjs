// Test script for admin businesses API endpoint
// Run with: node test-admin-businesses.cjs

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000'; // Adjust if your server runs on a different port

async function testAdminBusinessesEndpoint() {
  console.log('🧪 Testing Admin Businesses API Endpoint');
  console.log('==========================================');

  try {
    // Test the businesses endpoint
    console.log('📡 Testing GET /api/admin/businesses...');

    const response = await axios.get(`${API_BASE_URL}/api/admin/businesses`, {
      headers: {
        // Note: In a real test, you'd need to include authentication headers
        // For now, we'll test the endpoint structure
      }
    });

    if (response.status === 200) {
      console.log('✅ API endpoint responded successfully');

      if (response.data && response.data.businesses) {
        console.log(`📊 Found ${response.data.businesses.length} businesses`);

        // Check data structure
        if (response.data.businesses.length > 0) {
          const firstBusiness = response.data.businesses[0];
          console.log('🔍 Checking data structure...');

          // Check required fields
          const requiredFields = ['id', 'name', 'owner', 'email', 'programCount', 'programs'];
          const missingFields = requiredFields.filter(field => !(field in firstBusiness));

          if (missingFields.length === 0) {
            console.log('✅ All required fields present');

            // Check programs data
            if (firstBusiness.programs && Array.isArray(firstBusiness.programs)) {
              console.log(`📋 Business "${firstBusiness.name}" has ${firstBusiness.programs.length} programs`);

              if (firstBusiness.programs.length > 0) {
                const firstProgram = firstBusiness.programs[0];
                console.log('🔍 Sample program data:');
                console.log('   - Name:', firstProgram.name);
                console.log('   - Status:', firstProgram.status);
                console.log('   - Created:', firstProgram.created_at);
              }
            } else {
              console.log('⚠️  Programs data is missing or not an array');
            }
          } else {
            console.log('❌ Missing fields:', missingFields.join(', '));
          }
        } else {
          console.log('ℹ️  No businesses found in database');
        }
      } else {
        console.log('❌ Response does not contain businesses array');
      }
    } else {
      console.log('❌ API returned status:', response.status);
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running or not accessible');
      console.log('💡 Make sure to start the server first with: npm run dev');
    } else if (error.response) {
      console.log('❌ API returned error:', error.response.status, error.response.statusText);
      if (error.response.data) {
        console.log('Error details:', error.response.data);
      }
    } else {
      console.log('❌ Network error:', error.message);
    }
  }

  console.log('\n📋 Expected API Response Structure:');
  console.log('   businesses: [');
  console.log('     {');
  console.log('       id: string|number,');
  console.log('       name: string,');
  console.log('       programs: [{id, name, status, created_at}],');
  console.log('       programCount: number,');
  console.log('       ...other business fields');
  console.log('     }');
  console.log('   ]');
}

// Run the test
testAdminBusinessesEndpoint().then(() => {
  console.log('\n✨ Test completed');
}).catch(error => {
  console.error('💥 Test failed:', error.message);
});
