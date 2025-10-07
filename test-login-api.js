// Test script to verify login API endpoint
const testLoginAPI = async () => {
  try {
    console.log('Testing login API endpoint...');
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword'
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Response data:', data);
    } else {
      const text = await response.text();
      console.log('Response text:', text);
    }
    
  } catch (error) {
    console.error('Error testing login API:', error);
  }
};

// Run the test
testLoginAPI();
