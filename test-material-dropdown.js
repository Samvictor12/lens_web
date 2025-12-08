import fetch from 'node-fetch';

// Test the materials dropdown endpoint
async function testMaterialsDropdown() {
  try {
    console.log('Testing materials dropdown endpoint...');
    
    // First, login to get a token
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin@lensbilling.com',
        password: 'demo123'
      })
    });

    const loginData = await loginResponse.json();
    
    if (!loginData.success) {
      console.error('Login failed:', loginData);
      return;
    }

    console.log('Login successful, testing materials dropdown...');
    const token = loginData.data.accessToken;

    // Now test the materials dropdown
    const materialsResponse = await fetch('http://localhost:3001/api/v1/lens-materials/dropdown', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const materialsData = await materialsResponse.json();
    
    console.log('\n=== Materials Dropdown Response ===');
    console.log('Status:', materialsResponse.status);
    console.log('Success:', materialsData.success);
    console.log('Message:', materialsData.message);
    console.log('Data count:', materialsData.data?.length || 0);
    console.log('\nMaterials:');
    console.log(JSON.stringify(materialsData.data, null, 2));
    
  } catch (error) {
    console.error('Error testing endpoint:', error);
  }
}

testMaterialsDropdown();
