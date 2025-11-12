const BASE_URL = 'http://localhost:3001';

// Test functions
async function testAPI() {
  console.log('🚀 Starting API Tests...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health Check:', healthData);
    console.log('');

    // Test 2: Get Customer Masters (should require auth, but let's see the error)
    console.log('2️⃣ Testing Customer Masters List (no auth)...');
    const customerResponse = await fetch(`${BASE_URL}/api/customer-master`);
    console.log('Status:', customerResponse.status);
    const customerData = await customerResponse.json();
    console.log('Response:', customerData);
    console.log('');

    // Test 3: Get Vendor Masters (should require auth, but let's see the error)  
    console.log('3️⃣ Testing Vendor Masters List (no auth)...');
    const vendorResponse = await fetch(`${BASE_URL}/api/vendor-master`);
    console.log('Status:', vendorResponse.status);
    const vendorData = await vendorResponse.json();
    console.log('Response:', vendorData);
    console.log('');

    // Test 4: Test invalid endpoint
    console.log('4️⃣ Testing Invalid Endpoint...');
    const invalidResponse = await fetch(`${BASE_URL}/api/invalid-endpoint`);
    console.log('Status:', invalidResponse.status);
    const invalidData = await invalidResponse.json();
    console.log('Response:', invalidData);
    console.log('');

    // Test 5: Test Customer Email Check (no auth required for this endpoint)
    console.log('5️⃣ Testing Customer Email Check...');
    const emailCheckResponse = await fetch(`${BASE_URL}/api/customer-master/check-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'rahul@gmail.com'
      })
    });
    console.log('Status:', emailCheckResponse.status);
    const emailCheckData = await emailCheckResponse.json();
    console.log('Response:', emailCheckData);
    console.log('');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

// Run the tests
testAPI().then(() => {
  console.log('🏁 API Tests Completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test Suite Failed:', error);
  process.exit(1);
});